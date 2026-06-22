import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Phone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './Auth.css';

const Login = () => {
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Phone login resolves the phone to its account email (email stays the
      // auth credential), then signs in with email + password.
      let loginEmail = email;
      if (method === 'phone') {
        const { data: resolved, error: rpcError } = await supabase.rpc('email_for_phone', {
          p_phone: phone.trim(),
        });
        if (rpcError) throw new Error(rpcError.message);
        if (!resolved) throw new Error('No account found for that phone number.');
        loginEmail = resolved;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (signInError) throw new Error(signInError.message);

      // Resolve role to decide where to land (admins → dashboard).
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const redirectUrl = localStorage.getItem('redirect_after_login');
      if (redirectUrl) {
        localStorage.removeItem('redirect_after_login');
        navigate(redirectUrl);
      } else if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/booking');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (active) => ({
    flex: 1,
    padding: '0.6rem',
    cursor: 'pointer',
    fontWeight: 600,
    border: '2px solid var(--border)',
    background: active ? 'var(--primary)' : 'transparent',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  });

  return (
    <div className="auth-container">
      <div className="auth-card glass-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Login to continue your consultation.</p>

        {error && <div className="auth-error">{error}</div>}

        {/* Login method toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderRadius: '10px', overflow: 'hidden' }}>
          <button type="button" onClick={() => setMethod('email')} style={{ ...tabStyle(method === 'email'), borderRadius: '10px 0 0 10px' }}>
            <Mail size={16} /> Email
          </button>
          <button type="button" onClick={() => setMethod('phone')} style={{ ...tabStyle(method === 'phone'), borderRadius: '0 10px 10px 0', borderLeft: 'none' }}>
            <Phone size={16} /> Phone
          </button>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          {method === 'email' ? (
            <div className="input-group">
              <Mail size={20} className="input-icon" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="input-group">
              <Phone size={20} className="input-icon" />
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          )}
          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup" className="auth-link">Sign up here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
