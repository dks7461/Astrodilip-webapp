import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Phone, MessageSquare, Calendar, Clock, Sparkles, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import './MyBookings.css';

const CAL_ORIGIN = import.meta.env.VITE_CALCOM_URL;

const MyBookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date().getTime());

  // Tick every 30s so the "joinable" window updates without a refresh.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date().getTime()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      localStorage.setItem('redirect_after_login', '/my-bookings');
      navigate('/login');
      return;
    }

    let active = true;

    const fetchBookings = async () => {
      // RLS lets a client read bookings matched by user_id OR their email.
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('start_time', { ascending: false });
      if (active && !error) setBookings(data || []);
      if (active) setLoading(false);
    };
    fetchBookings();

    // Live updates: new/changed bookings appear without refresh.
    const channel = supabase
      .channel('my-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [authLoading, user, navigate]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'video') return <Video size={16} />;
    if (type === 'audio') return <Phone size={16} />;
    return <MessageSquare size={16} />;
  };

  // Joinable from 10 minutes before start until the end time.
  const isJoinable = (booking) => {
    if (booking.status !== 'confirmed' || !booking.start_time) return false;
    const start = new Date(booking.start_time).getTime();
    const end = booking.end_time ? new Date(booking.end_time).getTime() : start + 30 * 60000;
    return now >= start - 10 * 60000 && now <= end;
  };

  const handleJoin = (booking) => {
    if ((booking.event_type === 'video' || booking.event_type === 'audio') && booking.meeting_url) {
      window.open(booking.meeting_url, '_blank', 'noopener');
    } else {
      navigate('/chat');
    }
  };

  const manageOnCal = (booking) => {
    // Cal.com hosts cancel/reschedule on its booking page.
    if (CAL_ORIGIN && booking.cal_booking_uid) {
      window.open(`${CAL_ORIGIN}/booking/${booking.cal_booking_uid}`, '_blank', 'noopener');
    }
  };

  return (
    <div className="my-bookings-page">
      <div className="my-bookings-container">
        <h1 className="page-title">
          <Sparkles className="sparkle-icon" />
          My Consultations
        </h1>

        {loading ? (
          <div className="loading-state">Loading your bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} className="empty-icon" />
            <h2>No bookings found</h2>
            <p>You haven't scheduled any consultations yet.</p>
            <button className="book-now-btn" onClick={() => navigate('/booking')}>Book a Consultation</button>
          </div>
        ) : (
          <div className="bookings-grid">
            {bookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-card-header">
                  <div className="booking-type">
                    {getTypeIcon(booking.event_type)}
                    <span className="type-text">{booking.event_type} Consultation</span>
                  </div>
                  <span className={`status-badge ${getStatusClass(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="booking-details">
                  <div className="detail-item">
                    <Calendar size={16} className="detail-icon" />
                    <span>
                      {booking.start_time
                        ? new Date(booking.start_time).toLocaleDateString('en-GB')
                        : '—'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} className="detail-icon" />
                    <span>
                      {booking.start_time
                        ? new Date(booking.start_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="booking-actions">
                  {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <button className="btn-cancel" onClick={() => manageOnCal(booking)}>
                      <ExternalLink size={14} /> Manage
                    </button>
                  )}
                  {isJoinable(booking) && (
                    <button className="btn-join" onClick={() => handleJoin(booking)}>
                      {booking.event_type === 'chat' ? 'Open Chat' : 'Join on Google Meet'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
