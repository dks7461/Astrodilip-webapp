import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MessageSquare, Phone, Video, Sparkles } from 'lucide-react';
import Cal, { getCalApi } from '@calcom/embed-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import './Booking.css';

const CAL_ORIGIN = import.meta.env.VITE_CALCOM_URL;
const CAL_USERNAME = import.meta.env.VITE_CALCOM_USERNAME || 'astrodilip';

// Fallback icons keyed by consultation type id.
const TYPE_ICONS = { chat: MessageSquare, audio: Phone, video: Video };

const Booking = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [paidTypeIds, setPaidTypeIds] = useState(new Set());
  const [payingType, setPayingType] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Require login before booking.
  useEffect(() => {
    if (!authLoading && !user) {
      localStorage.setItem('redirect_after_login', '/booking');
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Load consultation types (config) from Supabase.
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('consultation_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (data) {
        setTypes(data);
        if (data.length) setSelectedType(data[0]);
      }
    };
    load();
  }, []);

  // Theme the Cal.com embed to match the site (orange brand, light theme).
  useEffect(() => {
    (async () => {
      try {
        const cal = await getCalApi(CAL_ORIGIN ? { origin: CAL_ORIGIN } : undefined);
        cal('ui', {
          theme: 'light',
          cssVarsPerTheme: { light: { 'cal-brand': '#FF6B00' } },
          hideEventTypeDetails: false,
          layout: 'month_view',
        });
      } catch (err) {
        console.error('Cal.com embed init failed', err);
      }
    })();
  }, [selectedType]);

  const displayName = profile?.name || user?.user_metadata?.name || '';
  const email = profile?.email || user?.email || '';
  const calLink = selectedType ? `${CAL_USERNAME}/${selectedType.cal_event_slug || selectedType.id}` : null;
  const needsPayment = selectedType && Number(selectedType.price) > 0 && !paidTypeIds.has(selectedType.id);

  // Creates a Razorpay order server-side, opens the checkout modal, then has
  // the server verify the signature before unlocking the calendar — the
  // client's word that "payment succeeded" is never trusted on its own.
  const handlePay = async () => {
    if (!selectedType || !window.Razorpay) return;
    setPayingType(true);
    setPaymentError('');
    try {
      const { data: order, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { consultationTypeId: selectedType.id },
      });
      if (orderError) throw new Error(orderError.message);

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: 'Astro Dilip Sharma',
          description: `${selectedType.title} Consultation`,
          prefill: { name: displayName, email },
          theme: { color: '#FF6B00' },
          handler: async (response) => {
            const { data: verified, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            if (verifyError || !verified?.verified) {
              reject(new Error(verifyError?.message || 'Payment could not be verified. Please contact support.'));
              return;
            }
            setPaidTypeIds((prev) => new Set(prev).add(selectedType.id));
            resolve();
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
        });
        rzp.open();
      });
    } catch (err) {
      setPaymentError(err.message || 'Payment failed. Please try again.');
    } finally {
      setPayingType(false);
    }
  };

  return (
    <div className="booking-page">
      <Helmet>
        <title>Book Astrologer Consultation | Astro Dilip Sharma</title>
        <meta name="description" content="Book a personalized chat, audio, or video consultation with expert Vedic astrologer Dilip Sharma. Get accurate predictions and remedies." />
        <link rel="canonical" href="https://astrodilipsharma.com/booking" />
      </Helmet>
      <div className="booking-container">
        <h1 className="booking-title">
          <Sparkles className="sparkle-icon" />
          Book a Consultation
        </h1>

        <div className="booking-form-area">
          {/* Section 1: Type */}
          <div className="booking-section">
            <h2>1. Select Consultation Type</h2>
            <div className="type-cards">
              {types.map((type) => {
                const Icon = TYPE_ICONS[type.id] || MessageSquare;
                return (
                  <div
                    key={type.id}
                    className={`type-card ${selectedType?.id === type.id ? 'selected' : ''}`}
                    onClick={() => setSelectedType(type)}
                  >
                    <Icon size={32} className="type-icon" />
                    <h3>{type.title}</h3>
                    {Number(type.price) > 0 && <p className="price">₹{type.price}</p>}
                    <p className="duration">{type.duration} mins</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Schedule via Cal.com */}
          <div className="booking-section">
            <h2>2. Pick a Date &amp; Time</h2>
            {!CAL_ORIGIN ? (
              <p className="hint-text">
                Booking is being configured. Please check back shortly.
              </p>
            ) : !selectedType ? (
              <p className="hint-text">Select a consultation type to see availability.</p>
            ) : needsPayment ? (
              <div className="payment-gate">
                <p className="hint-text">
                  This consultation costs ₹{selectedType.price}. Complete payment to pick a date &amp; time.
                </p>
                {paymentError && <p className="hint-text" style={{ color: '#DC2626' }}>{paymentError}</p>}
                <button type="button" className="btn-primary" onClick={handlePay} disabled={payingType}>
                  {payingType ? 'Processing...' : `Pay ₹${selectedType.price} to Continue`}
                </button>
              </div>
            ) : (
              <div className="cal-embed-wrapper" style={{ minHeight: 600 }}>
                <Cal
                  key={selectedType.id}
                  calLink={calLink}
                  calOrigin={CAL_ORIGIN}
                  style={{ width: '100%', height: '100%', overflow: 'scroll' }}
                  config={{
                    theme: 'light',
                    layout: 'month_view',
                    name: displayName,
                    email,
                  }}
                />
              </div>
            )}
            <p className="hint-text" style={{ marginTop: '1rem' }}>
              You'll receive a confirmation email with the meeting details. Audio and video
              consultations include a Google Meet link; chat sessions happen right here on the website.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
