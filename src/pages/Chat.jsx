import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, ArrowLeft, User, Phone, Video, Paperclip, Smile, CheckCheck, X, FileText, CalendarX, Clock, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import './Chat.css';

const socket = io('https://astrodilip-webapp.onrender.com');

const STICKERS = [
  'https://cdn-icons-png.flaticon.com/128/3306/3306619.png',
  'https://cdn-icons-png.flaticon.com/128/4156/4156821.png',
  'https://cdn-icons-png.flaticon.com/128/3306/3306560.png',
  'https://cdn-icons-png.flaticon.com/128/3306/3306528.png',
];
const EMOJIS = ['ðŸ˜Š', 'ðŸ˜‚', 'ðŸ¥º', 'ðŸ™', 'â¤ï¸', 'ðŸ‘', 'âœ¨', 'ðŸ”¥', 'ðŸ™Œ', 'ðŸ’¯', 'ðŸ”®', 'ðŸ•‰ï¸'];

const Chat = () => {
  const navigate = useNavigate();
  const [messages,    setMessages]    = useState([]);
  const [inputMsg,    setInputMsg]    = useState('');
  const [user,        setUser]        = useState(null);
  const [isJoined,    setIsJoined]    = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPicker,  setShowPicker]  = useState(false);
  const [pickerTab,   setPickerTab]   = useState('emoji');
  const [hasBooking, setHasBooking] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [sessionReminder, setSessionReminder] = useState(null);

  const messagesEndRef   = useRef(null);
  const fileInputRef     = useRef(null);
  const pickerRef        = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('astrology_user');
    if (!saved) { navigate('/login'); return; }
    const parsedUser = JSON.parse(saved);
    setUser(parsedUser);

    fetch(`https://astrodilip-webapp.onrender.com/api/bookings/user/${parsedUser.id || parsedUser._id}`)
      .then(res => res.json())
      .then(data => {
        const hasConfirmed = data.some(b => b.status === 'confirmed');
        setHasBooking(hasConfirmed);
        setLoadingBooking(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingBooking(false);
      });

    socket.on('client_init', (data) => setMessages(data.messages));
    socket.on('receive_message', (msg) => setMessages(prev => [...prev, msg]));

    return () => {
      socket.off('client_init');
      socket.off('receive_message');
      socket.off('session_reminder');
    };
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (sessionReminder) {
      const timer = setTimeout(() => {
        setSessionReminder(null);
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [sessionReminder]);

  const handleRemindAdmin = async () => {
    try {
      const res = await fetch(`https://astrodilip-webapp.onrender.com/api/bookings/user/${user.id || user._id}`);
      const data = await res.json();
      const confirmedBookings = data.filter(b => b.status === 'confirmed');
      if (confirmedBookings.length > 0) {
        const booking = confirmedBookings[0];
        socket.emit('send_message', {
          text: `â° REMINDER: ${user.name} is reminding you of their scheduled consultation.\nBooking: ${booking.consultationType} on ${new Date(booking.date).toLocaleDateString('en-GB')} at ${booking.timeSlot}.\nPlease join when ready.`,
          to: 'admin',
          isReminder: true
        });
        alert('Reminder sent to Astro Dilip Sharma!');
      } else {
        alert("You don't have any confirmed bookings yet.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!user) return;
    localStorage.setItem('astrology_user_id', user.id || user._id);
    socket.emit('join', { role: 'client', name: user.name, userId: user.id || user._id, consultationType: 'chat' });
    setIsJoined(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
    e.target.value = '';
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputMsg.trim() && !selectedFile) return;

    let fileData = null;
    if (selectedFile) {
      fileData = { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type };
      const buffer = await selectedFile.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ''));
      fileData.dataUrl = `data:${selectedFile.type};base64,${base64}`;
    }

    socket.emit('send_message', { text: inputMsg, to: 'admin', file: fileData });
    setInputMsg('');
    setSelectedFile(null);
  };

  const sendSticker = (url) => {
    socket.emit('send_message', { text: '', to: 'admin', file: { type: 'sticker', dataUrl: url, name: 'Sticker' } });
    setShowPicker(false);
  };

  const formatSize = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';

  if (loadingBooking) {
    return <div className="chat-container"><div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}><p style={{ color: 'var(--text-main)' }}>Loading...</p></div></div>;
  }

  if (!hasBooking) {
    return (
      <div className="chat-container">
        <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '500px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
            <CalendarX size={64} />
          </div>
          <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Appointment Required</h2>
          <p style={{ color: 'var(--text-main)', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Please book a consultation session before chatting with Astro Dilip Sharma.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link to="/booking" className="btn-primary" style={{ display: 'flex', justifyContent: 'center', padding: '1rem', color: 'var(--text-main)' }}>
              Book a Consultation
            </Link>
            <Link to="/my-bookings" className="btn-outline" style={{ display: 'flex', justifyContent: 'center', padding: '1rem', color: 'var(--text-main)', border: '2px solid var(--text-main)', textDecoration: 'none', borderRadius: '30px' }}>
              View My Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="chat-container">
        <div className="join-chat-card glass-card" style={{ padding: '3rem 2rem' }}>
          <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Ready for Consultation?</h2>
          <p style={{ color: 'var(--text-main)', marginBottom: '2rem' }}>
            Click below to connect with Astro Dilip Sharma in real-time.
          </p>
          <form onSubmit={handleJoin} className="join-form">
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem', color: 'var(--text-main)' }}>
              Start Chat Session
            </button>
          </form>
          <button onClick={() => navigate('/booking')} className="btn-outline" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', color: 'var(--text-main)' }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page-wrapper custom-chat-bg" style={{ position: 'relative' }}>
      {sessionReminder && (
        <div style={{
          position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #F59E0B',
          borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          animation: 'slideDown 0.3s ease-out, pulseBorder 2s infinite'
        }}>
          <Bell color="#F59E0B" size={24} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ color: '#F59E0B', margin: '0 0 4px 0' }}>Your session is starting now!</h4>
            <p style={{ color: '#1A1400', margin: 0, fontSize: '0.9rem' }}>{sessionReminder.message}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
            {['video', 'audio'].includes(sessionReminder.consultationType) && (
              <Link to={`/call?type=${sessionReminder.consultationType}`} onClick={() => setSessionReminder(null)} className="btn-primary" style={{ padding: '8px 16px', background: '#F59E0B', color: '#000', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                {sessionReminder.consultationType === 'video' ? <Video size={16} style={{marginRight: '6px'}} /> : <Phone size={16} style={{marginRight: '6px'}} />}
                Join Now
              </Link>
            )}
            <button onClick={() => setSessionReminder(null)} className="btn-outline" style={{ padding: '8px 16px', border: '1px solid rgba(26, 20, 0, 0.1)', color: '#1A1400' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}



      <div className="chat-interface custom-chat-panel">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/booking" className="back-btn"><ArrowLeft size={20} /></Link>
            <div className="header-info">
              <div className="avatar-wrapper">
                <div className="avatar"><User size={24} /></div>
                <div className="online-dot-pulse"></div>
              </div>
              <div>
                <h3>Astro Dilip Sharma</h3>
                <p className="subtitle">Vedic Astrologer Â· Typically replies instantly</p>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="action-btn" title="Remind Admin" onClick={handleRemindAdmin} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <Clock size={16} /> Remind Admin
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat"><p>Send a message to start your consultation.</p></div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.from === localStorage.getItem('astrology_user_id');
              return (
                <div key={i} className={`message-wrapper slide-in ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && <div className="msg-avatar"><User size={16} /></div>}
                  <div className="message-content">
                    <div className="message-bubble">
                      {msg.file?.type === 'sticker' && <img src={msg.file.dataUrl} alt="Sticker" style={{ width: 100 }} />}
                      {msg.file && msg.file.type !== 'sticker' && msg.file.type.startsWith('image/') && (
                        <a href={msg.file.dataUrl} target="_blank" rel="noreferrer">
                          <img src={msg.file.dataUrl} alt="attachment" style={{ maxWidth: '100%', borderRadius: 8 }} />
                        </a>
                      )}
                      {msg.file && msg.file.type !== 'sticker' && !msg.file.type.startsWith('image/') && (
                        <div className="file-attachment-bubble">
                          <FileText size={24} />
                          <div className="file-meta">
                            <span className="file-name">{msg.file.name}</span>
                            <span className="file-size">{formatSize(msg.file.size)}</span>
                          </div>
                        </div>
                      )}
                      {msg.text && (
                        <div style={msg.isReminder ? { background: 'rgba(245,158,11,0.1)', borderLeft: '3px solid #F59E0B', padding: '8px 12px', borderRadius: '4px' } : {}}>
                          {msg.isReminder && <div style={{ color: '#F59E0B', marginBottom: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Reminder</div>}
                          <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                        </div>
                      )}
                    </div>
                    <div className="msg-meta">
                      <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && <CheckCheck size={14} className="seen-tick" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="admin-input-container">
          {selectedFile && (
            <div className="file-preview-chip">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedFile.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(selectedFile)} alt="preview" className="file-thumb" />
                ) : <FileText size={16} color="#F59E0B" />}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="preview-name">{selectedFile.name}</span>
                  <span className="preview-size">{formatSize(selectedFile.size)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedFile(null)} className="remove-file-btn"><X size={14} /></button>
            </div>
          )}
          <form onSubmit={handleSend} className="chat-input-area" style={{ borderTop: 'none', padding: '0 1.5rem 1rem' }}>
            <div className="input-bar" style={{ borderRadius: 28 }}>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx" hidden />
              <button type="button" className="icon-btn" onClick={() => fileInputRef.current.click()}><Paperclip size={20} /></button>
              <input type="text" placeholder="Type a message..." value={inputMsg} onChange={e => setInputMsg(e.target.value)} className="chat-input-field" />
              <div className="picker-container" ref={pickerRef}>
                <button type="button" className="icon-btn" onClick={() => setShowPicker(!showPicker)}><Smile size={20} /></button>
                {showPicker && (
                  <div className="emoji-picker-panel">
                    <div className="picker-tabs">
                      <button type="button" className={pickerTab === 'emoji' ? 'active' : ''} onClick={() => setPickerTab('emoji')}>Emoji</button>
                      <button type="button" className={pickerTab === 'sticker' ? 'active' : ''} onClick={() => setPickerTab('sticker')}>Stickers</button>
                    </div>
                    <div className="picker-content">
                      {pickerTab === 'emoji' ? (
                        <div className="emoji-grid">
                          {EMOJIS.map((e, i) => <span key={i} onClick={() => { setInputMsg(p => p + e); setShowPicker(false); }}>{e}</span>)}
                        </div>
                      ) : (
                        <div className="sticker-grid">
                          {STICKERS.map((s, i) => <img key={i} src={s} alt="sticker" onClick={() => sendSticker(s)} />)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button type="submit" className="send-btn" disabled={!inputMsg.trim() && !selectedFile}><Send size={18} /></button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;




