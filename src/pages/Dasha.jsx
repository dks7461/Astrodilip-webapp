import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Loader, AlertCircle } from 'lucide-react';
import BirthDetailsForm from '../components/BirthDetailsForm';
import { jyotishamGet, buildBirthParams } from '../lib/jyotishamApi';
import './Reports.css';

const DASHA_LEVELS = [
  ['mahadasha', 'Mahadasha'],
  ['antardasha', 'Antardasha'],
  ['paryantardasha', 'Paryantardasha'],
  ['Shookshamadasha', 'Sookshma Dasha'],
  ['Pranadasha', 'Prana Dasha'],
];

const Dasha = () => {
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
      const [mahadasha, yogini] = await Promise.all([
        jyotishamGet('dasha/current-mahadasha', params),
        jyotishamGet('dasha/yogini-dasha-main', params),
      ]);
      setResult({ mahadasha, yoginiName: yogini.dasha_list?.[0], yoginiEnd: yogini.dasha_end_dates?.[0] });
    } catch (err) {
      setError(err.message || 'Could not calculate your dasha periods.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <Helmet>
        <title>Free Dasha Calculator | Current Mahadasha &amp; Yogini Dasha | Astro Dilip Sharma</title>
        <meta name="description" content="Find your current Vimshottari Mahadasha, Antardasha, and Yogini Dasha for free based on your birth details." />
        <link rel="canonical" href="https://astrodilipsharma.com/dasha" />
      </Helmet>
      <div className="container">
        <h1 className="section-title">Dasha Calculator</h1>
        <p className="reports-subtitle">
          Find out which planetary period (Dasha) is currently running in your life — the key to timing events in Vedic astrology.
        </p>

        <div className="reports-container">
          <div className="glass-card form-card">
            <form onSubmit={submit} className="kundli-form">
              <BirthDetailsForm form={form} onChange={onChange} />
              <button type="submit" className="btn-primary submit-btn" disabled={loading}>
                {loading ? <Loader className="spin" size={20} /> : <Search size={20} />}
                {loading ? 'Calculating...' : 'Find My Dasha'}
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
                <h3>Your Timeline Awaits</h3>
                <p style={{ color: '#1A1400', fontWeight: '500' }}>Fill out the form to see your current planetary periods.</p>
              </div>
            )}

            {result && (
              <div className="glass-card result-card fade-in">
                <h2 className="result-title">Current Dasha for {form.name || 'You'}</h2>

                <h3 className="sub-title">Vimshottari Mahadasha</h3>
                <div className="planets-list">
                  {DASHA_LEVELS.map(([key, label]) => {
                    const d = result.mahadasha[key];
                    if (!d) return null;
                    return (
                      <div key={key} className="planet-item">
                        <span className="planet-name">{label}</span>
                        <span className="planet-house">{d.name}</span>
                        <span className="planet-sign">{d.start} – {d.end}</span>
                      </div>
                    );
                  })}
                </div>

                {result.yoginiName && (
                  <>
                    <h3 className="sub-title">Yogini Dasha (Current)</h3>
                    <div className="planets-list">
                      <div className="planet-item">
                        <span className="planet-name">{result.yoginiName}</span>
                        <span className="planet-sign">Ends {result.yoginiEnd}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dasha;
