import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Loader, AlertCircle } from 'lucide-react';
import BirthDetailsForm from '../components/BirthDetailsForm';
import { jyotishamGet, buildBirthParams } from '../lib/jyotishamApi';
import './Reports.css';

const KPAstrology = () => {
  const [form, setForm] = useState({ name: '', dob: '', tob: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const onChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const params = await buildBirthParams(form, 'DMY');
      const data = await jyotishamGet('kp/planet_details', params);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not generate your KP chart.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <Helmet>
        <title>Free KP Astrology Report | Sub Lords &amp; Cuspal Details | Astro Dilip Sharma</title>
        <meta name="description" content="Get your free Krishnamurti Paddhati (KP) planet details, sign, nakshatra, and sub lords based on your birth details." />
        <link rel="canonical" href="https://astrodilipsharma.com/kp-astrology" />
      </Helmet>
      <div className="container">
        <h1 className="section-title">KP Astrology Report</h1>
        <p className="reports-subtitle">
          Get your planets' sign, nakshatra, and — the heart of Krishnamurti Paddhati — their sub and sub-sub lords.
        </p>

        <div className="reports-container">
          <div className="glass-card form-card">
            <form onSubmit={submit} className="kundli-form">
              <BirthDetailsForm form={form} onChange={onChange} showName={false} />
              <button type="submit" className="btn-primary submit-btn" disabled={loading}>
                {loading ? <Loader className="spin" size={20} /> : <Search size={20} />}
                {loading ? 'Calculating...' : 'Generate Report'}
              </button>
            </form>
          </div>

          <div className="results-container">
            {error && (
              <div className="error-message">
                <AlertCircle size={24} />
                <p>{error}</p>
              </div>
            )}

            {!result && !error && !loading && (
              <div className="empty-state">
                <div className="glow-circle-small"></div>
                <h3>Your Sub Lords Await</h3>
                <p style={{ color: '#1A1400', fontWeight: '500' }}>Fill out the form to see your KP planet details.</p>
              </div>
            )}

            {result && (
              <div className="glass-card result-card fade-in">
                <h2 className="result-title">KP Planet Details</h2>
                {result.ascendant && (
                  <div className="stats-grid-small" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="stat-box">
                      <span>Ascendant</span>
                      <h4>{result.ascendant.sign} — Sub Lord {result.ascendant.subLord}</h4>
                    </div>
                  </div>
                )}
                <div className="planets-list">
                  {result.planets?.map((p) => (
                    <div key={p.id} className="planet-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                      <span className="planet-name">{p.name} — {p.sign} ({p.nakshatra})</span>
                      <span className="planet-sign">Sub Lord: {p.subLord} · Sub-Sub Lord: {p.subSubLord}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPAstrology;
