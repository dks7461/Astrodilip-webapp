import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowLeft, User, Paperclip, Smile, CheckCheck, X, FileText, CalendarX, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import './Chat.css';

const STICKERS = [
  'https://cdn-icons-png.flaticon.com/128/3306/3306619.png',
  'https://cdn-icons-png.flaticon.com/128/4156/4156821.png',
  'https://cdn-icons-png.flaticon.com/128/3306/3306560.png',
  'https://cdn-icons-png.flaticon.com/128/3306/3306528.png',
];
const EMOJIS = ['😊', '😂', '🥺', '🙏', '❤️', '👍', '✨', '🔥', '🙌', '💯', '🔮', '🕉️'];

const BUCKET = 'chat-files';

const Chat = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji');
  const [hasBooking, setHasBooking] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [fileUrls, setFileUrls] = useState({}); // message id -> signed/display url

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pickerRef = useRef(null);

  const userId = user?.id;
  const userName = profile?.name || user?.user_metadata?.name || user?.email || 'Client';

  // Resolve a display URL for a message's attachment (signed for private files).
  const resolveFileUrl = useCallback(async (msg) => {
    if (!msg.file_path) return;
    if (msg.file_type === 'sticker') {
      setFileUrls((prev) => ({ ...prev, [msg.id]: msg.file_path }));
      return;
    }
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(msg.file_path, 3600);
    if (data?.signedUrl) {
      setFileUrls((prev) => ({ ...prev, [msg.id]: data.signedUrl }));
    }
  }, []);

  // Auth gate + booking gate + realtime subscription + presence.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }

    let active = true;

    const init = async () => {
      // Chat unlocks for clients who have a confirmed chat booking.
      const { data: bookingRows } = await supabase
        .from('bookings')
        .select('id,event_type,status')
        .eq('event_type', 'chat');
      const unlocked = (bookingRows || []).some(
        (b) => b.status === 'confirmed' || b.status === 'pending'
      );
      if (!active) return;
      setHasBooking(unlocked);
      setLoadingBooking(false);
      if (!unlocked) return;

      // Load history for this client's conversation.
      const { data: history } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation', userId)
        .order('created_at', { ascending: true });
      if (!active) return;
      setMessages(history || []);
      (history || []).forEach(resolveFileUrl);
    };
    init();

    // Realtime: new messages in this conversation.
    const msgChannel = supabase
      .channel(`msgs:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation=eq.${userId}`,
        },
        ({ new: row }) => {
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          resolveFileUrl(row);
        }
      )
      .subscribe();

    // Presence: let the admin see this client online.
    const presence = supabase.channel('presence:consultations', {
      config: { presence: { key: userId } },
    });
    presence.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presence.track({ userId, name: userName, consultationType: 'chat' });
      }
    });

    return () => {
      active = false;
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presence);
    };
  }, [authLoading, user, userId, userName, navigate, resolveFileUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const insertMessage = async (fields) => {
    const { error } = await supabase.from('messages').insert({
      conversation: userId,
      sender_id: userId,
      sender_name: userName,
      sender_role: 'client',
      ...fields,
    });
    if (error) console.error('send failed', error);
  };

  const handleRemindAdmin = async () => {
    await insertMessage({
      text: `⏰ REMINDER: ${userName} is reminding you of their scheduled consultation. Please join when ready.`,
      is_reminder: true,
    });
    alert('Reminder sent to Astro Dilip Sharma!');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
    e.target.value = '';
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputMsg.trim() && !selectedFile) return;

    let fileFields = {};
    if (selectedFile) {
      const path = `${userId}/${crypto.randomUUID()}-${selectedFile.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, selectedFile);
      if (upErr) {
        console.error('upload failed', upErr);
        alert('File upload failed.');
        return;
      }
      fileFields = {
        file_path: path,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
      };
    }

    await insertMessage({ text: inputMsg, ...fileFields });
    setInputMsg('');
    setSelectedFile(null);
  };

  const sendSticker = async (url) => {
    await insertMessage({ text: '', file_path: url, file_name: 'Sticker', file_type: 'sticker' });
    setShowPicker(false);
  };

  const formatSize = (b) =>
    !b ? '' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

  if (authLoading || loadingBooking) {
    return (
      <div className="chat-container">
        <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-main)' }}>Loading...</p>
        </div>
      </div>
    );
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
            Please book a chat consultation before chatting with Astro Dilip Sharma.
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

  return (
    <div className="chat-page-wrapper custom-chat-bg" style={{ position: 'relative' }}>
      <div className="chat-interface custom-chat-panel">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/my-bookings" className="back-btn"><ArrowLeft size={20} /></Link>
            <div className="header-info">
              <div className="avatar-wrapper">
                <div className="avatar"><User size={24} /></div>
                <div className="online-dot-pulse"></div>
              </div>
              <div>
                <h3>Astro Dilip Sharma</h3>
                <p className="subtitle">Vedic Astrologer · Typically replies instantly</p>
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
            messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              const url = fileUrls[msg.id];
              const isImage = msg.file_type && msg.file_type.startsWith('image/');
              return (
                <div key={msg.id} className={`message-wrapper slide-in ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && <div className="msg-avatar"><User size={16} /></div>}
                  <div className="message-content">
                    <div className="message-bubble">
                      {msg.file_type === 'sticker' && url && <img src={url} alt="Sticker" style={{ width: 100 }} />}
                      {msg.file_type && msg.file_type !== 'sticker' && isImage && url && (
                        <a href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="attachment" style={{ maxWidth: '100%', borderRadius: 8 }} />
                        </a>
                      )}
                      {msg.file_type && msg.file_type !== 'sticker' && !isImage && (
                        <a href={url} target="_blank" rel="noreferrer" className="file-attachment-bubble" style={{ textDecoration: 'none' }}>
                          <FileText size={24} />
                          <div className="file-meta">
                            <span className="file-name">{msg.file_name}</span>
                            <span className="file-size">{formatSize(msg.file_size)}</span>
                          </div>
                        </a>
                      )}
                      {msg.text && (
                        <div style={msg.is_reminder ? { background: 'rgba(245,158,11,0.1)', borderLeft: '3px solid #F59E0B', padding: '8px 12px', borderRadius: '4px' } : {}}>
                          {msg.is_reminder && <div style={{ color: '#F59E0B', marginBottom: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Reminder</div>}
                          <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                        </div>
                      )}
                    </div>
                    <div className="msg-meta">
                      <span className="timestamp">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
