import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import './VideoCall.css';

// TURN servers — required for production. STUN-only fails across real networks.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ]
};

const VideoCall = ({
  socket,
  callType,
  remoteSocketId,      // for CALLER: the accepter's real socket ID (passed from Chat.jsx after call_accepted)
  remoteUserName,
  isIncoming,          // true = we are the callee
  onEndCall,
  callerSocketId,      // for CALLEE: who called us
}) => {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);

  // Always-current target socket ID
  const liveTargetRef  = useRef(remoteSocketId || callerSocketId || null);

  // ICE candidate queue — candidates can arrive before remoteDescription is set
  const iceQueueRef       = useRef([]);
  const remoteDescReadyRef = useRef(false);

  const [isMuted,     setIsMuted]     = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callStatus,  setCallStatus]  = useState('connecting');
  const [callDuration, setCallDuration] = useState(0);

  const timerRef      = useRef(null);
  const disconnTimerRef = useRef(null);
  const callStartedRef  = useRef(false); // prevent double startCall

  // ── Local stream ──
  const startLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current; // already started
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('getUserMedia error:', err);
      alert('Could not access camera/microphone. Please allow permissions.');
      onEndCall();
      return null;
    }
  };

  // ── Safe ICE candidate ──
  const safeAddIce = async (candidate) => {
    if (!pcRef.current) return;
    if (remoteDescReadyRef.current) {
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn('ICE add error:', e); }
    } else {
      iceQueueRef.current.push(candidate);
    }
  };

  const flushIceQueue = async () => {
    remoteDescReadyRef.current = true;
    for (const c of iceQueueRef.current) {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.warn('Queued ICE error:', e); }
    }
    iceQueueRef.current = [];
  };

  // ── Create peer connection ──
  const createPC = (stream, targetId) => {
    if (pcRef.current) return pcRef.current; // don't create twice
    const pc = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const target = targetId || liveTargetRef.current;
        if (target) socket.emit('ice_candidate', { targetSocketId: target, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log('WebRTC state:', s);
      if (s === 'connected') {
        clearTimeout(disconnTimerRef.current);
        setCallStatus('active');
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
        }
      }
      if (s === 'disconnected') {
        // Give 5s to recover before ending
        disconnTimerRef.current = setTimeout(() => {
          if (pcRef.current?.connectionState !== 'connected') handleEndCall();
        }, 5000);
      }
      if (s === 'failed') {
        clearTimeout(disconnTimerRef.current);
        handleEndCall();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // ── CALLER: create & send offer ──
  const doStartCall = async (targetId) => {
    if (callStartedRef.current) return; // prevent double call
    callStartedRef.current = true;

    if (targetId) liveTargetRef.current = targetId;

    const stream = await startLocalStream();
    if (!stream) return;

    const pc = createPC(stream, targetId || liveTargetRef.current);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('webrtc_offer', {
      targetSocketId: targetId || liveTargetRef.current,
      offer,
    });
    console.log('Sent webrtc_offer to', targetId || liveTargetRef.current);
  };

  // ── CALLEE: handle offer → send answer ──
  const handleOffer = async (offer, callerSockId) => {
    if (callerSockId) liveTargetRef.current = callerSockId;

    const stream = await startLocalStream();
    if (!stream) return;

    const pc = createPC(stream, callerSockId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await flushIceQueue();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('webrtc_answer', { targetSocketId: callerSockId, answer });
    console.log('Sent webrtc_answer to', callerSockId);
  };

  // ── End call ──
  const handleEndCall = () => {
    clearInterval(timerRef.current);
    clearTimeout(disconnTimerRef.current);
    timerRef.current = null;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;

    const target = liveTargetRef.current;
    if (target) socket.emit('end_call', { targetSocketId: target });

    setCallStatus('ended');
    setTimeout(() => onEndCall(), 800);
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(p => !p);
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  // ── Main effect ──
  useEffect(() => {
    // Always start local stream immediately on mount
    startLocalStream();

    if (!isIncoming) {
      // CALLER side
      // If remoteSocketId was already passed as prop (Chat.jsx caught call_accepted
      // before VideoCall mounted), fire the offer immediately.
      if (remoteSocketId) {
        console.log('Caller: remoteSocketId available on mount, starting call immediately:', remoteSocketId);
        setTimeout(() => doStartCall(remoteSocketId), 150);
      }

      // Also keep this listener as a fallback for slow networks where
      // call_accepted might arrive slightly after mount
      socket.on('call_accepted', ({ accepterSocketId }) => {
        console.log('Caller: call_accepted received, accepterSocketId:', accepterSocketId);
        doStartCall(accepterSocketId);
      });

    } else {
      // CALLEE side — wait for the offer from the caller
      console.log('Callee: waiting for webrtc_offer, callerSocketId:', callerSocketId);
    }

    socket.on('webrtc_offer', ({ offer, callerSocketId: callerSockId }) => {
      console.log('Received webrtc_offer from', callerSockId);
      handleOffer(offer, callerSockId);
    });

    socket.on('webrtc_answer', async ({ answer }) => {
      console.log('Received webrtc_answer');
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIceQueue();
      }
    });

    socket.on('ice_candidate', ({ candidate }) => {
      if (candidate) safeAddIce(candidate);
    });

    socket.on('call_ended', () => {
      clearInterval(timerRef.current);
      clearTimeout(disconnTimerRef.current);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      setCallStatus('ended');
      setTimeout(() => onEndCall(), 800);
    });

    return () => {
      socket.off('call_accepted');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('ice_candidate');
      socket.off('call_ended');
      clearInterval(timerRef.current);
      clearTimeout(disconnTimerRef.current);
    };
  }, []);

  return (
    <div className={`vc-overlay ${callType === 'audio' ? 'vc-audio-mode' : ''}`}>
      <div className="vc-container">

        <div className="vc-header">
          <div className="vc-caller-info">
            <div className="vc-avatar">{remoteUserName?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div>
              <div className="vc-caller-name">{remoteUserName || 'User'}</div>
              <div className="vc-status">
                {callStatus === 'connecting' && '⏳ Connecting...'}
                {callStatus === 'active'     && `🟢 ${formatDuration(callDuration)}`}
                {callStatus === 'ended'      && '📴 Call Ended'}
              </div>
            </div>
          </div>
          <div className="vc-call-type-badge">
            {callType === 'video' ? '📹 Video Call' : '🎙️ Voice Call'}
          </div>
        </div>

        {callType === 'video' && (
          <div className="vc-video-area">
            <video ref={remoteVideoRef} autoPlay playsInline className="vc-remote-video" />
            <video ref={localVideoRef}  autoPlay playsInline muted className="vc-local-video" />
          </div>
        )}

        {callType === 'audio' && (
          <div className="vc-audio-area">
            <div className="vc-audio-avatar">{remoteUserName?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="vc-audio-waves">
              <span /><span /><span /><span /><span />
            </div>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ display: 'none' }} />
            <video ref={localVideoRef}  autoPlay playsInline muted style={{ display: 'none' }} />
          </div>
        )}

        <div className="vc-controls">
          <button className={`vc-btn ${isMuted ? 'vc-btn-active' : ''}`} onClick={toggleMute}>
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {callType === 'video' && (
            <button className={`vc-btn ${isCameraOff ? 'vc-btn-active' : ''}`} onClick={toggleCamera}>
              {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              <span>{isCameraOff ? 'Cam On' : 'Cam Off'}</span>
            </button>
          )}

          <button className="vc-btn vc-btn-end" onClick={handleEndCall}>
            <PhoneOff size={22} />
            <span>End</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default VideoCall;
