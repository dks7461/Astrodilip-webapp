import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Video, Phone, ArrowLeft, User } from 'lucide-react';
import VideoCall from '../components/VideoCall';
import CallNotification from '../components/CallNotification';

const socket = io('https://astrodilip-webapp.onrender.com');

const CallSession = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const callType = queryParams.get('type') || 'video'; // 'video' or 'audio'
  
  const [user, setUser] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const adminSocketIdRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('astrology_user');
    if (!saved) { navigate('/login'); return; }
    const parsedUser = JSON.parse(saved);
    setUser(parsedUser);
    localStorage.setItem('astrology_user_id', parsedUser.id || parsedUser._id);

    // Auto-join socket room for this user
    socket.emit('join', { role: 'client', name: parsedUser.name, userId: parsedUser.id || parsedUser._id, consultationType: callType });
    setIsJoined(true);

    socket.on('admin_socket_id', ({ socketId }) => {
      adminSocketIdRef.current = socketId;
    });

    socket.on('incoming_call', ({ callerSocketId, callerName, callType }) => {
      setIncomingCall({ callerSocketId, callerName, callType });
    });

    socket.on('call_accepted', ({ accepterSocketId, accepterName, callType }) => {
      setActiveCall(prev => {
        if (!prev) return null;
        return {
          ...prev,
          remoteSocketId: accepterSocketId,
          remoteUserName: accepterName || prev.remoteUserName,
        };
      });
    });

    socket.on('call_rejected', () => {
      setActiveCall(null);
      setIncomingCall(null);
      alert('Call was declined by Astro Dilip Sharma.');
    });

    socket.on('call_ended', () => setActiveCall(null));

    return () => {
      socket.off('admin_socket_id');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
    };
  }, [navigate]);

  const startCall = () => {
    const adminId = adminSocketIdRef.current;
    if (!adminId) { 
      alert('Astro Dilip Sharma is currently offline or unavailable. Please try again in a moment or wait for him to call you.'); 
      return; 
    }

    socket.emit('call_user', {
      targetSocketId: adminId,
      callerName: user?.name || 'Client',
      callType,
    });

    setActiveCall({
      callType,
      remoteSocketId: null,
      remoteUserName: 'Astro Dilip Sharma',
      isIncoming: false,
      callerSocketId: null,
    });
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    socket.emit('accept_call', {
      callerSocketId: incomingCall.callerSocketId,
      callType: incomingCall.callType,
    });
    setActiveCall({
      callType: incomingCall.callType,
      remoteSocketId: null,
      remoteUserName: incomingCall.callerName,
      isIncoming: true,
      callerSocketId: incomingCall.callerSocketId,
    });
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (incomingCall) socket.emit('reject_call', { callerSocketId: incomingCall.callerSocketId });
    setIncomingCall(null);
  };

  // 1. Render Active Call UI
  if (activeCall && (activeCall.isIncoming || activeCall.remoteSocketId)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', position: 'relative' }}>
        <VideoCall
          socket={socket}
          callType={activeCall.callType}
          remoteSocketId={activeCall.remoteSocketId}
          remoteUserName={activeCall.remoteUserName}
          isIncoming={activeCall.isIncoming}
          callerSocketId={activeCall.callerSocketId}
          onEndCall={() => setActiveCall(null)}
        />
        {incomingCall && (
          <CallNotification
            callerName={incomingCall.callerName}
            callType={incomingCall.callType}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )}
      </div>
    );
  }

  // 2. Render Outgoing Call Waiting Screen
  if (activeCall && !activeCall.isIncoming && !activeCall.remoteSocketId) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        paddingTop: '8rem',
        paddingBottom: '4rem',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 24,
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48, color: '#1A1400',
          boxShadow: '0 0 0 16px rgba(255, 107, 0, 0.15), 0 0 0 32px rgba(255, 107, 0, 0.05)',
          border: '2px solid var(--text-main)'
        }}>
          {activeCall.callType === 'video' ? <Video size={48} /> : <Phone size={48} />}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-main)', fontSize: 18, margin: '0 0 8px', fontWeight: 'bold' }}>
            {activeCall.callType === 'video' ? 'Starting Video Consultation' : 'Starting Voice Consultation'}
          </p>
          <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: 32 }}>Astro Dilip Sharma</h2>
          <p style={{ color: 'var(--text-main)', fontSize: 16, marginTop: 12 }}>Ringing...</p>
        </div>
        <button
          onClick={() => { socket.emit('end_call', { targetSocketId: adminSocketIdRef.current }); setActiveCall(null); }}
          style={{
            background: 'transparent',
            border: '2px solid var(--text-main)', borderRadius: '50%',
            width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-main)', cursor: 'pointer', fontSize: 24, marginTop: 40,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--text-main)'; e.currentTarget.style.color = '#FFF'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-main)'; }}
        >
          <Phone size={32} style={{ transform: 'rotate(135deg)' }} />
        </button>
      </div>
    );
  }

  // 3. Main Session Start Screen (Before clicking "Start Call")
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingTop: '8rem', paddingBottom: '4rem' }}>
      {incomingCall && (
        <CallNotification callerName={incomingCall.callerName} callType={incomingCall.callType} onAccept={acceptCall} onReject={rejectCall} />
      )}
      
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px' }}>
        <Link to="/my-bookings" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-main)', textDecoration: 'none', fontWeight: 'bold', marginBottom: 30 }}>
          <ArrowLeft size={20} /> Back to My Bookings
        </Link>
        
        <div style={{ background: 'transparent', border: '2px solid var(--text-main)', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '8px 8px 0 var(--text-main)' }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 24px', border: '2px solid var(--text-main)' 
          }}>
            {callType === 'video' ? <Video size={36} color="var(--text-main)" /> : <Phone size={36} color="var(--text-main)" />}
          </div>
          
          <h1 style={{ color: 'var(--text-main)', fontSize: 28, marginBottom: 12 }}>
            {callType === 'video' ? 'Video Consultation' : 'Voice Consultation'}
          </h1>
          <p style={{ color: 'var(--text-main)', fontSize: 16, marginBottom: 40 }}>
            You are about to start a live {callType} session with Astro Dilip Sharma. Ensure you are in a quiet place with a stable internet connection.
          </p>
          
          <button 
            onClick={startCall}
            style={{ 
              width: '100%', background: 'var(--primary)', color: 'var(--text-main)', 
              border: '2px solid var(--text-main)', borderRadius: 12, padding: '16px', 
              fontSize: 18, fontWeight: 'bold', cursor: 'pointer', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.boxShadow = '4px 4px 0 var(--text-main)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {callType === 'video' ? <Video size={24} /> : <Phone size={24} />}
            Start {callType === 'video' ? 'Video' : 'Voice'} Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallSession;
