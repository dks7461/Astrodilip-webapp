import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MoreVertical, Paperclip, Smile, X, FileText, CheckCheck, Users, Calendar, BarChart3, Search, Trash2, Video, Phone, MessageSquare, BookOpen, Settings, Plus } from 'lucide-react';
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

const CHAT_BUCKET = 'chat-files';
const IMG_BUCKET = 'public-images';

const TAB_STYLE = (active) => ({
  padding: '16px 8px', background: 'transparent', border: 'none',
  borderBottom: active ? '3px solid #FF6B00' : '3px solid transparent',
  color: active ? '#FF6B00' : '#1A1400', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', outline: 'none',
});
const inputStyle = { padding: '12px', borderRadius: '8px', border: '2px solid #1A1400', outline: 'none', width: '100%', boxSizing: 'border-box' };
const btnPrimary = { background: '#FF6B00', color: '#1A1400', padding: '10px 16px', borderRadius: '8px', border: '2px solid #1A1400', fontWeight: 'bold', cursor: 'pointer' };
const btnGhost = { background: 'transparent', color: '#1A1400', padding: '8px 14px', borderRadius: '8px', border: '2px solid #1A1400', cursor: 'pointer', fontWeight: 'bold' };

const Admin = () => {
  const { user, profile } = useAuth();
  const adminId = user?.id;
  const adminName = profile?.name || 'Astro Dilip Sharma';

  const [activeTab, setActiveTab] = useState('chat');

  // ── Chat state ──
  const [messages, setMessages] = useState([]);
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [activeClient, setActiveClient] = useState(null);
  const [inputMsg, setInputMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji');
  const [fileUrls, setFileUrls] = useState({});

  // ── Other tabs ──
  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState('All');
  const [profiles, setProfiles] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [newBlog, setNewBlog] = useState({ title: '', excerpt: '', display_date: '', author: '', image: '' });
  const [editBlog, setEditBlog] = useState(null);
  const [courses, setCourses] = useState([]);
  const [editCourse, setEditCourse] = useState(null);
  const [consultTypes, setConsultTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [content, setContent] = useState({});
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pickerRef = useRef(null);

  const resolveFileUrl = useCallback(async (msg) => {
    if (!msg.file_path || fileUrls[msg.id]) return;
    if (msg.file_type === 'sticker') {
      setFileUrls((p) => ({ ...p, [msg.id]: msg.file_path }));
      return;
    }
    const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(msg.file_path, 3600);
    if (data?.signedUrl) setFileUrls((p) => ({ ...p, [msg.id]: data.signedUrl }));
  }, [fileUrls]);

  // ── Chat: load history, subscribe to inserts, presence ──
  useEffect(() => {
    if (!adminId) return;
    let active = true;

    const loadHistory = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (!active) return;
      setMessages(data || []);
      (data || []).forEach(resolveFileUrl);
    };
    loadHistory();

    const msgChannel = supabase
      .channel('msgs:admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: row }) => {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        resolveFileUrl(row);
      })
      .subscribe();

    const presence = supabase.channel('presence:consultations', { config: { presence: { key: adminId } } });
    presence
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState();
        const ids = new Set();
        Object.values(state).forEach((arr) => arr.forEach((p) => p.userId && ids.add(p.userId)));
        setOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presence.track({ userId: adminId, name: adminName, role: 'admin' });
      });

    return () => {
      active = false;
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presence);
    };
  }, [adminId, adminName, resolveFileUrl]);

  // ── Bookings: load + realtime (for Meetings tab + stats) ──
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('bookings').select('*').order('start_time', { ascending: false });
      setBookings(data || []);
    };
    load();
    const ch = supabase
      .channel('admin-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeClient, activeTab]);

  useEffect(() => {
    const h = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Lazy loaders per tab ──
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  }, []);
  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
    setBlogs(data || []);
    setLoading(false);
  }, []);
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('courses').select('*').order('sort_order');
    setCourses(data || []);
    setLoading(false);
  }, []);
  const fetchConsultTypes = useCallback(async () => {
    const { data } = await supabase.from('consultation_types').select('*').order('sort_order');
    setConsultTypes(data || []);
  }, []);
  const fetchStats = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_stats');
    setStats(data || null);
    setLoading(false);
  }, []);
  const fetchContent = useCallback(async () => {
    const { data } = await supabase.from('site_content').select('*');
    const map = {};
    (data || []).forEach((r) => { map[r.key] = r.value; });
    setContent(map);
    const { data: tm } = await supabase.from('testimonials').select('*').order('sort_order');
    setTestimonials(tm || []);
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchProfiles();
    if (activeTab === 'blogs') fetchBlogs();
    if (activeTab === 'courses') fetchCourses();
    if (activeTab === 'content') { fetchConsultTypes(); fetchContent(); }
    if (activeTab === 'stats') fetchStats();
  }, [activeTab, fetchProfiles, fetchBlogs, fetchCourses, fetchConsultTypes, fetchContent, fetchStats]);

  // ── Image upload helper (public-images bucket) ──
  const uploadImage = async (file) => {
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from(IMG_BUCKET).upload(path, file);
    if (error) { alert('Image upload failed: ' + error.message); return null; }
    return supabase.storage.from(IMG_BUCKET).getPublicUrl(path).data.publicUrl;
  };

  // ── Chat helpers ──
  const conversations = (() => {
    const map = new Map();
    messages.forEach((m) => {
      if (!m.conversation) return;
      const existing = map.get(m.conversation);
      const name = m.sender_role === 'client' ? m.sender_name : existing?.name;
      map.set(m.conversation, { userId: m.conversation, name: name || existing?.name || 'Client', last: m });
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at));
  })();

  const activeMessages = messages.filter((m) => m.conversation === activeClient?.userId);

  const sendMessage = async (fields) => {
    if (!activeClient) return;
    const { error } = await supabase.from('messages').insert({
      conversation: activeClient.userId,
      sender_id: adminId,
      sender_name: adminName,
      sender_role: 'admin',
      ...fields,
    });
    if (error) console.error('send failed', error);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if ((!inputMsg.trim() && !selectedFile) || !activeClient) return;
    let fileFields = {};
    if (selectedFile) {
      const path = `${activeClient.userId}/${crypto.randomUUID()}-${selectedFile.name}`;
      const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, selectedFile);
      if (error) { alert('Upload failed'); return; }
      fileFields = { file_path: path, file_name: selectedFile.name, file_size: selectedFile.size, file_type: selectedFile.type };
    }
    await sendMessage({ text: inputMsg, ...fileFields });
    setInputMsg('');
    setSelectedFile(null);
  };

  const sendSticker = async (url) => {
    await sendMessage({ text: '', file_path: url, file_name: 'Sticker', file_type: 'sticker' });
    setShowPicker(false);
  };

  // ── Mutations ──
  const updateBookingStatus = async (id, status) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
  };
  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user and all their data?')) return;
    const { error } = await supabase.functions.invoke('delete-user', { body: { userId: id } });
    if (error) alert('Delete failed: ' + error.message);
    else fetchProfiles();
  };
  const createBlog = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('blogs').insert({ ...newBlog, status: 'published' });
    if (error) return alert('Failed: ' + error.message);
    setNewBlog({ title: '', excerpt: '', display_date: '', author: '', image: '' });
    fetchBlogs();
  };
  const publishBlog = async (id) => {
    await supabase.from('blogs').update({ status: 'published' }).eq('id', id);
    fetchBlogs();
  };
  const deleteBlog = async (id) => {
    if (!window.confirm('Delete this blog?')) return;
    await supabase.from('blogs').delete().eq('id', id);
    fetchBlogs();
  };
  const saveBlogEdit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = editBlog;
    await supabase.from('blogs').update(rest).eq('id', id);
    setEditBlog(null);
    fetchBlogs();
  };
  const saveCourse = async (e) => {
    e.preventDefault();
    const { id, ...rest } = editCourse;
    if (id) await supabase.from('courses').update(rest).eq('id', id);
    else await supabase.from('courses').insert(rest);
    setEditCourse(null);
    fetchCourses();
  };
  const deleteCourse = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    await supabase.from('courses').delete().eq('id', id);
    fetchCourses();
  };
  const saveConsultType = async (ct) => {
    await supabase.from('consultation_types').update({
      title: ct.title, description: ct.description, price: ct.price, duration: ct.duration, cal_event_slug: ct.cal_event_slug, is_active: ct.is_active,
    }).eq('id', ct.id);
    fetchConsultTypes();
    alert('Saved.');
  };
  const saveContentKey = async (key, value) => {
    await supabase.from('site_content').upsert({ key, value, updated_at: new Date().toISOString() });
    alert('Saved.');
  };
  const saveTestimonial = async (t) => {
    const { id, ...rest } = t;
    if (id) await supabase.from('testimonials').update(rest).eq('id', id);
    else await supabase.from('testimonials').insert(rest);
    fetchContent();
  };
  const deleteTestimonial = async (id) => {
    if (!window.confirm('Delete testimonial?')) return;
    await supabase.from('testimonials').delete().eq('id', id);
    fetchContent();
  };

  const getInitials = (name = '') => name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  const formatSize = (b) => (!b ? '' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : 'N/A');

  const filteredUsers = profiles.filter((u) =>
    (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredBookings = bookingFilter === 'All' ? bookings : bookings.filter((b) => b.status === bookingFilter.toLowerCase());

  return (
    <div className="admin-dashboard-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingTop: '80px', background: 'transparent' }}>
      <div className="admin-tab-bar" style={{ display: 'flex', gap: '18px', padding: '0 24px', borderBottom: '2px solid #1A1400', flexWrap: 'wrap' }}>
        <button onClick={() => { setActiveTab('chat'); }} style={TAB_STYLE(activeTab === 'chat')}><MessageSquare size={18} /> Live Chat</button>
        <button onClick={() => setActiveTab('meetings')} style={TAB_STYLE(activeTab === 'meetings')}><Calendar size={18} /> Meetings</button>
        <button onClick={() => setActiveTab('users')} style={TAB_STYLE(activeTab === 'users')}><Users size={18} /> Users</button>
        <button onClick={() => setActiveTab('blogs')} style={TAB_STYLE(activeTab === 'blogs')}><FileText size={18} /> Blogs</button>
        <button onClick={() => setActiveTab('courses')} style={TAB_STYLE(activeTab === 'courses')}><BookOpen size={18} /> Courses</button>
        <button onClick={() => setActiveTab('content')} style={TAB_STYLE(activeTab === 'content')}><Settings size={18} /> Content</button>
        <button onClick={() => setActiveTab('stats')} style={TAB_STYLE(activeTab === 'stats')}><BarChart3 size={18} /> Stats</button>
      </div>

      <div className="admin-content-area" style={{ flex: 1, overflow: 'hidden' }}>

        {/* ===== CHAT ===== */}
        {activeTab === 'chat' && (
          <div className="admin-dashboard" style={{ height: '100%', margin: 0, padding: 0 }}>
            <div className="admin-sidebar">
              <div className="sidebar-header">
                <h3>Conversations</h3>
                <span className="live-count">{onlineIds.size} online</span>
              </div>
              <div className="client-list">
                {conversations.length === 0 ? (
                  <p className="no-clients">No conversations yet</p>
                ) : conversations.map((c) => (
                  <div key={c.userId} className={`admin-client-card ${activeClient?.userId === c.userId ? 'active' : ''}`} onClick={() => setActiveClient(c)}>
                    <div className="admin-avatar-wrapper">
                      <div className="admin-avatar">{getInitials(c.name)}</div>
                      {onlineIds.has(c.userId) && <div className="online-dot-pulse" style={{ width: '10px', height: '10px', right: '-2px', bottom: '-2px' }}></div>}
                    </div>
                    <div className="client-card-info">
                      <div className="client-card-header"><h4>{c.name}</h4></div>
                      <p className="last-message">{c.last.file_type ? (c.last.file_type === 'sticker' ? 'Sent a sticker' : 'Sent a file') : c.last.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-chat-area custom-chat-bg">
              {activeClient ? (
                <>
                  <div className="admin-chat-header">
                    <div className="header-info">
                      <div className="avatar-wrapper">
                        <div className="admin-avatar" style={{ width: '40px', height: '40px' }}>{getInitials(activeClient.name)}</div>
                        {onlineIds.has(activeClient.userId) && <div className="online-dot-pulse" style={{ width: '10px', height: '10px' }}></div>}
                      </div>
                      <div>
                        <h3 style={{ color: '#1A1400', margin: 0, fontSize: '16px' }}>{activeClient.name}</h3>
                        <p className="subtitle">{onlineIds.has(activeClient.userId) ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="chat-messages">
                    {activeMessages.length === 0 ? (
                      <div className="empty-chat"><p>No messages yet.</p></div>
                    ) : activeMessages.map((msg) => {
                      const isMine = msg.sender_role === 'admin';
                      const url = fileUrls[msg.id];
                      const isImage = msg.file_type && msg.file_type.startsWith('image/');
                      return (
                        <div key={msg.id} className={`message-wrapper slide-in ${isMine ? 'mine' : 'theirs'}`}>
                          {!isMine && <div className="msg-avatar"><div className="admin-avatar" style={{ width: '24px', height: '24px', fontSize: '10px', borderWidth: '1px' }}>{getInitials(activeClient.name)}</div></div>}
                          <div className="message-content">
                            <div className="message-bubble">
                              {msg.file_type === 'sticker' && url && <img src={url} alt="Sticker" style={{ width: '100px', background: 'transparent', border: 'none' }} />}
                              {msg.file_type && msg.file_type !== 'sticker' && isImage && url && (
                                <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px' }} /></a>
                              )}
                              {msg.file_type && msg.file_type !== 'sticker' && !isImage && (
                                <a href={url} target="_blank" rel="noreferrer" className="file-attachment-bubble" style={{ textDecoration: 'none' }}>
                                  <FileText size={24} />
                                  <div className="file-meta"><span className="file-name">{msg.file_name}</span><span className="file-size">{formatSize(msg.file_size)}</span></div>
                                </a>
                              )}
                              {msg.text && <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>}
                            </div>
                            <div className="msg-meta">
                              <span className="timestamp">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMine && <CheckCheck size={14} className="seen-tick" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="admin-input-container">
                    {selectedFile && (
                      <div className="file-preview-chip">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {selectedFile.type.startsWith('image/') ? <img src={URL.createObjectURL(selectedFile)} alt="preview" className="file-thumb" /> : <FileText size={16} color="#F59E0B" />}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="preview-name">{selectedFile.name}</span>
                            <span className="preview-size">{formatSize(selectedFile.size)}</span>
                          </div>
                        </div>
                        <button onClick={() => setSelectedFile(null)} className="remove-file-btn"><X size={14} /></button>
                      </div>
                    )}
                    <form onSubmit={handleSend} className="chat-input-area" style={{ borderTop: 'none', padding: '0 1.5rem 1rem' }}>
                      <div className="input-bar" style={{ borderRadius: '28px' }}>
                        <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); e.target.value = ''; }} accept="image/*,.pdf,.doc,.docx" hidden />
                        <button type="button" className="icon-btn" onClick={() => fileInputRef.current.click()}><Paperclip size={20} /></button>
                        <input type="text" placeholder={`Reply to ${activeClient.name}...`} value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} className="chat-input-field" autoFocus />
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
                                  <div className="emoji-grid">{EMOJIS.map((e, i) => <span key={i} onClick={() => { setInputMsg((p) => p + e); setShowPicker(false); }}>{e}</span>)}</div>
                                ) : (
                                  <div className="sticker-grid">{STICKERS.map((s, i) => <img key={i} src={s} alt="sticker" onClick={() => sendSticker(s)} />)}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button type="submit" className="send-btn" disabled={!inputMsg.trim() && !selectedFile}><Send size={18} /></button>
                      </div>
                    </form>
                  </div>
                </>
              ) : (
                <div className="empty-state"><h2>Select a conversation</h2><p>Client chats appear on the left.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ===== MEETINGS ===== */}
        {activeTab === 'meetings' && (
          <div className="admin-panel-content" style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h2 style={{ margin: 0, color: '#1A1400' }}>Scheduled Meetings <span style={{ background: 'rgba(26,20,0,0.1)', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', marginLeft: '12px' }}>{filteredBookings.length}</span></h2>
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(26,20,0,0.1)', padding: '4px', borderRadius: '8px' }}>
                {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((f) => (
                  <button key={f} onClick={() => setBookingFilter(f)} style={{ background: bookingFilter === f ? '#1A1400' : 'transparent', color: bookingFilter === f ? '#FFE999' : '#1A1400', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: bookingFilter === f ? 'bold' : 'normal' }}>{f}</button>
                ))}
              </div>
            </div>
            {filteredBookings.length === 0 ? <div style={{ color: '#1A1400', textAlign: 'center', padding: '40px' }}>No meetings found.</div> : (
              <div style={{ overflowX: 'auto', background: 'rgba(26,20,0,0.05)', border: '2px solid #1A1400', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#1A1400', textAlign: 'left', minWidth: '800px' }}>
                  <thead><tr style={{ background: '#FF6B00', borderBottom: '2px solid #1A1400' }}>
                    <th style={{ padding: '14px' }}>#</th><th style={{ padding: '14px' }}>Client</th><th style={{ padding: '14px' }}>When</th><th style={{ padding: '14px' }}>Type</th><th style={{ padding: '14px' }}>Status</th><th style={{ padding: '14px' }}>Meet</th><th style={{ padding: '14px' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredBookings.map((b, i) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid rgba(26,20,0,0.2)' }}>
                        <td style={{ padding: '14px' }}>{i + 1}</td>
                        <td style={{ padding: '14px', fontWeight: 'bold' }}>{b.attendee_name || 'Unknown'}<div style={{ fontSize: 12, fontWeight: 'normal' }}>{b.attendee_email}</div></td>
                        <td style={{ padding: '14px' }}>{b.start_time ? new Date(b.start_time).toLocaleString('en-GB') : 'N/A'}</td>
                        <td style={{ padding: '14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(26,20,0,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                            {b.event_type === 'video' ? <Video size={12} /> : b.event_type === 'audio' ? <Phone size={12} /> : <MessageSquare size={12} />}{(b.event_type || 'chat').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', background: b.status === 'pending' ? 'rgba(245,158,11,0.2)' : b.status === 'confirmed' ? 'rgba(16,185,129,0.2)' : b.status === 'completed' ? 'rgba(124,58,237,0.2)' : 'rgba(220,38,38,0.2)', color: b.status === 'pending' ? '#B45309' : b.status === 'confirmed' ? '#047857' : b.status === 'completed' ? '#6D28D9' : '#B91C1C' }}>{(b.status || 'pending').toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '14px' }}>{b.meeting_url ? <a href={b.meeting_url} target="_blank" rel="noreferrer" style={{ color: '#FF6B00', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Video size={14} /> Join</a> : '—'}</td>
                        <td style={{ padding: '14px', display: 'flex', gap: '8px' }}>
                          {b.status === 'confirmed' && <button onClick={() => updateBookingStatus(b.id, 'completed')} style={btnPrimary}>Complete</button>}
                          {b.status !== 'cancelled' && b.status !== 'completed' && <button onClick={() => updateBookingStatus(b.id, 'cancelled')} style={btnGhost}>Cancel</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== USERS ===== */}
        {activeTab === 'users' && (
          <div className="admin-panel-content" style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, color: '#1A1400' }}>Registered Users <span style={{ background: 'rgba(26,20,0,0.1)', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', marginLeft: '12px' }}>{profiles.length}</span></h2>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#1A1400' }} />
                <input type="text" placeholder="Search name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '36px', width: 'auto' }} />
              </div>
            </div>
            {loading ? <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div> : filteredUsers.length === 0 ? <div style={{ textAlign: 'center', padding: 40 }}>No users found.</div> : (
              <div style={{ overflowX: 'auto', background: 'rgba(26,20,0,0.05)', border: '2px solid #1A1400', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#1A1400', textAlign: 'left', minWidth: '600px' }}>
                  <thead><tr style={{ background: '#FF6B00', borderBottom: '2px solid #1A1400' }}>
                    <th style={{ padding: '14px' }}>#</th><th style={{ padding: '14px' }}>Name</th><th style={{ padding: '14px' }}>Email</th><th style={{ padding: '14px' }}>Phone</th><th style={{ padding: '14px' }}>Joined</th><th style={{ padding: '14px' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(26,20,0,0.2)' }}>
                        <td style={{ padding: '14px' }}>{i + 1}</td>
                        <td style={{ padding: '14px', fontWeight: 'bold' }}>{u.name}</td>
                        <td style={{ padding: '14px' }}>{u.email}</td>
                        <td style={{ padding: '14px' }}>{u.phone || '—'}</td>
                        <td style={{ padding: '14px' }}>{fmtDate(u.created_at)}</td>
                        <td style={{ padding: '14px', display: 'flex', gap: '8px', position: 'relative' }}>
                          <button onClick={() => setSelectedUser(u)} style={btnPrimary}>View</button>
                          <button onClick={() => setMenuId(menuId === u.id ? null : u.id)} style={{ ...btnGhost, borderRadius: '50%', padding: '6px' }}><MoreVertical size={16} /></button>
                          {menuId === u.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10, background: '#FFF', border: '2px solid #1A1400', borderRadius: '8px', padding: '8px', minWidth: '120px', boxShadow: '4px 4px 0 #1A1400' }}>
                              <button onClick={() => { setMenuId(null); deleteUser(u.id); }} style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C' }}><Trash2 size={14} /> Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== BLOGS ===== */}
        {activeTab === 'blogs' && (
          <div className="admin-panel-content" style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
            <h2 style={{ margin: '0 0 24px 0', color: '#1A1400' }}>Manage Blogs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
              <div style={{ background: 'rgba(26,20,0,0.05)', padding: '24px', borderRadius: '16px', border: '2px solid #1A1400', height: 'fit-content' }}>
                <h3 style={{ marginTop: 0 }}>Add New Blog</h3>
                <form onSubmit={createBlog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <input type="text" placeholder="Title" value={newBlog.title} onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })} required style={inputStyle} />
                  <textarea placeholder="Excerpt / description" value={newBlog.excerpt} onChange={(e) => setNewBlog({ ...newBlog, excerpt: e.target.value })} required rows="4" style={inputStyle} />
                  <input type="text" placeholder="Display date e.g. May 15, 2026" value={newBlog.display_date} onChange={(e) => setNewBlog({ ...newBlog, display_date: e.target.value })} required style={inputStyle} />
                  <input type="text" placeholder="Author" value={newBlog.author} onChange={(e) => setNewBlog({ ...newBlog, author: e.target.value })} required style={inputStyle} />
                  <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files[0]; if (f) { const url = await uploadImage(f); if (url) setNewBlog((p) => ({ ...p, image: url })); } }} />
                  {newBlog.image && <img src={newBlog.image} alt="preview" style={{ height: 60, objectFit: 'contain' }} />}
                  <button type="submit" style={btnPrimary}>Publish Blog</button>
                </form>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div>
                  <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ background: '#F59E0B', color: '#FFF', padding: '2px 8px', borderRadius: '12px', fontSize: '14px' }}>New</span> Requested Experiences</h3>
                  {blogs.filter((b) => b.status === 'pending').length === 0 ? <p style={{ fontStyle: 'italic' }}>No pending requests.</p> : blogs.filter((b) => b.status === 'pending').map((b) => (
                    <div key={b.id} style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '2px solid #F59E0B', display: 'flex', gap: '16px', alignItems: 'center', marginBottom: 12 }}>
                      {b.image && <img src={b.image} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />}
                      <div style={{ flex: 1 }}><h4 style={{ margin: '0 0 8px' }}>{b.title}</h4><p style={{ margin: '0 0 8px', color: '#666', fontSize: 14 }}>{b.display_date} • By {b.author}</p><p style={{ margin: 0, fontSize: 13 }}>{b.excerpt}</p></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button onClick={() => publishBlog(b.id)} style={{ ...btnPrimary, background: '#10B981', color: '#FFF', border: 'none' }}>Approve</button>
                        <button onClick={() => deleteBlog(b.id)} style={{ ...btnGhost, color: '#B91C1C', borderColor: '#B91C1C' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 style={{ marginTop: 0 }}>Published Blogs</h3>
                  {blogs.filter((b) => b.status === 'published').map((b) => (
                    <div key={b.id} style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '2px solid #1A1400', display: 'flex', gap: '16px', alignItems: 'center', marginBottom: 12 }}>
                      {b.image && <img src={b.image} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />}
                      <div style={{ flex: 1 }}><h4 style={{ margin: '0 0 8px' }}>{b.title}</h4><p style={{ margin: '0 0 8px', color: '#666', fontSize: 14 }}>{b.display_date} • By {b.author}</p></div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditBlog(b)} style={btnGhost}>Edit</button>
                        <button onClick={() => deleteBlog(b.id)} style={{ ...btnGhost, color: '#B91C1C', borderColor: '#B91C1C' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== COURSES ===== */}
        {activeTab === 'courses' && (
          <div className="admin-panel-content" style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0 }}>Manage Courses</h2>
              <button onClick={() => setEditCourse({ title: '', price: 0, description: '', image: '', sort_order: courses.length + 1, is_active: true })} style={btnPrimary}><Plus size={16} /> Add Course</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {courses.map((c) => (
                <div key={c.id} style={{ background: '#FFF', border: '2px solid #1A1400', borderRadius: 12, padding: 16, boxShadow: '4px 4px 0 #1A1400' }}>
                  {c.image && <img src={c.image} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                  <h4 style={{ margin: '0 0 4px' }}>{c.title}</h4>
                  <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#FF6B00' }}>₹{c.price}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditCourse(c)} style={btnGhost}>Edit</button>
                    <button onClick={() => deleteCourse(c.id)} style={{ ...btnGhost, color: '#B91C1C', borderColor: '#B91C1C' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== CONTENT (consultation types, homepage, testimonials) ===== */}
        {activeTab === 'content' && (
          <div className="admin-panel-content" style={{ padding: '24px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
            <section>
              <h2 style={{ marginTop: 0 }}>Consultation Types</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16 }}>
                {consultTypes.map((ct, idx) => (
                  <div key={ct.id} style={{ background: '#FFF', border: '2px solid #1A1400', borderRadius: 12, padding: 16 }}>
                    <h4 style={{ marginTop: 0, textTransform: 'capitalize' }}>{ct.id}</h4>
                    <label style={{ fontSize: 12 }}>Title</label>
                    <input style={inputStyle} value={ct.title || ''} onChange={(e) => setConsultTypes((p) => p.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))} />
                    <label style={{ fontSize: 12 }}>Price (display)</label>
                    <input style={inputStyle} type="number" value={ct.price ?? 0} onChange={(e) => setConsultTypes((p) => p.map((x, i) => i === idx ? { ...x, price: Number(e.target.value) } : x))} />
                    <label style={{ fontSize: 12 }}>Duration (min)</label>
                    <input style={inputStyle} type="number" value={ct.duration ?? 30} onChange={(e) => setConsultTypes((p) => p.map((x, i) => i === idx ? { ...x, duration: Number(e.target.value) } : x))} />
                    <label style={{ fontSize: 12 }}>Cal.com event slug</label>
                    <input style={inputStyle} value={ct.cal_event_slug || ''} onChange={(e) => setConsultTypes((p) => p.map((x, i) => i === idx ? { ...x, cal_event_slug: e.target.value } : x))} />
                    <button onClick={() => saveConsultType(ct)} style={{ ...btnPrimary, marginTop: 8 }}>Save</button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2>Homepage Stats</h2>
              {(content.home_stats || []).map((s, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input style={inputStyle} value={s.value} placeholder="22+" onChange={(e) => setContent((p) => ({ ...p, home_stats: p.home_stats.map((x, i) => i === idx ? { ...x, value: e.target.value } : x) }))} />
                  <input style={inputStyle} value={s.label} placeholder="Years Experience" onChange={(e) => setContent((p) => ({ ...p, home_stats: p.home_stats.map((x, i) => i === idx ? { ...x, label: e.target.value } : x) }))} />
                </div>
              ))}
              <button onClick={() => saveContentKey('home_stats', content.home_stats || [])} style={btnPrimary}>Save Stats</button>
            </section>

            <section>
              <h2>Testimonials</h2>
              <button onClick={() => saveTestimonial({ name: 'New Client', text: 'Great experience!', rating: 5, sort_order: testimonials.length + 1, is_active: true })} style={{ ...btnGhost, marginBottom: 12 }}><Plus size={14} /> Add</button>
              {testimonials.map((t) => (
                <div key={t.id} style={{ background: '#FFF', border: '2px solid #1A1400', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <input style={inputStyle} value={t.name} onChange={(e) => setTestimonials((p) => p.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x))} />
                  <textarea style={inputStyle} rows="2" value={t.text} onChange={(e) => setTestimonials((p) => p.map((x) => x.id === t.id ? { ...x, text: e.target.value } : x))} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveTestimonial(t)} style={btnPrimary}>Save</button>
                    <button onClick={() => deleteTestimonial(t.id)} style={{ ...btnGhost, color: '#B91C1C', borderColor: '#B91C1C' }}>Delete</button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* ===== STATS ===== */}
        {activeTab === 'stats' && (
          <div className="admin-panel-content" style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>Dashboard Overview</h2>
            {loading || !stats ? <div style={{ textAlign: 'center', padding: 40 }}>Loading stats...</div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                {[['Total Users', stats.totalUsers, Users], ['Total Bookings', stats.totalBookings, Calendar], ['Completed Sessions', stats.completedSessions, CheckCheck], ['Course Revenue', `₹${stats.totalRevenue}`, BarChart3]].map(([label, val, Icon]) => (
                  <div key={label} style={{ background: '#FFF', border: '2px solid #1A1400', padding: 24, borderRadius: 16, boxShadow: '4px 4px 0 #1A1400' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#FF6B00' }}><Icon size={24} /> <span style={{ fontWeight: 'bold' }}>{label}</span></div>
                    <div style={{ fontSize: 36, fontWeight: 'bold', marginTop: 12 }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Modals ===== */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#FFE999', border: '2px solid #1A1400', borderRadius: 16, width: '90%', maxWidth: 400, padding: 24, position: 'relative' }}>
            <button onClick={() => setSelectedUser(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ marginTop: 0 }}>User Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><strong>Name:</strong> {selectedUser.name}</div>
              <div><strong>Email:</strong> {selectedUser.email}</div>
              <div><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</div>
              <div><strong>DOB:</strong> {selectedUser.birth_date || 'N/A'}</div>
              <div><strong>TOB:</strong> {selectedUser.birth_time || 'N/A'}</div>
              <div><strong>POB:</strong> {selectedUser.birth_place || 'N/A'}</div>
              <div><strong>Joined:</strong> {fmtDate(selectedUser.created_at)}</div>
            </div>
          </div>
        </div>
      )}

      {editBlog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFF', padding: 32, borderRadius: 16, width: '90%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}><h2 style={{ margin: 0 }}>Edit Blog</h2><button onClick={() => setEditBlog(null)} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer' }}>&times;</button></div>
            <form onSubmit={saveBlogEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input style={inputStyle} value={editBlog.title} onChange={(e) => setEditBlog({ ...editBlog, title: e.target.value })} required />
              <textarea style={inputStyle} rows="4" value={editBlog.excerpt} onChange={(e) => setEditBlog({ ...editBlog, excerpt: e.target.value })} required />
              <input style={inputStyle} value={editBlog.display_date || ''} onChange={(e) => setEditBlog({ ...editBlog, display_date: e.target.value })} />
              <input style={inputStyle} value={editBlog.author} onChange={(e) => setEditBlog({ ...editBlog, author: e.target.value })} required />
              <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files[0]; if (f) { const url = await uploadImage(f); if (url) setEditBlog((p) => ({ ...p, image: url })); } }} />
              {editBlog.image && <img src={editBlog.image} alt="" style={{ height: 60, objectFit: 'contain' }} />}
              <button type="submit" style={btnPrimary}>Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {editCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFF', padding: 32, borderRadius: 16, width: '90%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}><h2 style={{ margin: 0 }}>{editCourse.id ? 'Edit' : 'Add'} Course</h2><button onClick={() => setEditCourse(null)} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer' }}>&times;</button></div>
            <form onSubmit={saveCourse} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input style={inputStyle} placeholder="Title" value={editCourse.title} onChange={(e) => setEditCourse({ ...editCourse, title: e.target.value })} required />
              <input style={inputStyle} type="number" placeholder="Price" value={editCourse.price} onChange={(e) => setEditCourse({ ...editCourse, price: Number(e.target.value) })} required />
              <textarea style={inputStyle} rows="5" placeholder="Description" value={editCourse.description || ''} onChange={(e) => setEditCourse({ ...editCourse, description: e.target.value })} />
              <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files[0]; if (f) { const url = await uploadImage(f); if (url) setEditCourse((p) => ({ ...p, image: url })); } }} />
              {editCourse.image && <img src={editCourse.image} alt="" style={{ height: 60, objectFit: 'contain' }} />}
              <button type="submit" style={btnPrimary}>Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
