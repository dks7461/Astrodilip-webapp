import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Loader, AlertCircle } from 'lucide-react';
import BirthDetailsForm from '../components/BirthDetailsForm';
import { jyotishamGet, buildBirthParams } from '../lib/jyotishamApi';
import './Reports.css';

const LalKitab = () => {
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
      const [houses, debts, remedies] = await Promise.all([
        jyotishamGet('lalKitab/horoscope', params),
        jyotishamGet('lalKitab/debts', params),
        jyotishamGet('lalKitab/remedies', params),
      ]);
      setResult({ houses, debts, remedies });
    } catch (err) {
      setError(err.message || 'Could not generate your Lal Kitab report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <Helmet>
        <title>Free Lal Kitab Report | Houses, Rin (Debts) &amp; Remedies | Astro Dilip Sharma</title>
        <meta name="description" content="Get your free Lal Kitab horoscope with planetary houses, karmic debts (rin), and remedies based on your birth details." />
        <link rel="canonical" href="https://astrodilipsharma.com/lal-kitab" />
      </Helmet>
      <div className="container">
        <h1 className="section-title">Lal Kitab Report</h1>
        <p className="reports-subtitle">
          Discover your Lal Kitab house placements, karmic debts (rin), and the simple remedies this system is famous for.
        </p>

        <div className="reports-container">
          <div className="glass-card form-card">
            <form onSubmit={submit} className="kundli-form">
              <BirthDetailsForm form={form} onChange={onChange} />
              <button type="submit" className="btn-primary submit-btn" disabled={loading}>
                {loading ? <Loader className="spin" size={20} /> : <Search size={20} />}
                {loading ? 'Generating...' : 'Generate Report'}
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
                <h3>Your Lal Kitab Awaits</h3>
                <p style={{ color: '#1A1400', fontWeight: '500' }}>Fill out the form to generate your report.</p>
              </div>
            )}

            {result && (
              <div className="glass-card result-card fade-in">
                <h2 className="result-title">Lal Kitab Report for {form.name || 'You'}</h2>

                <h3 className="sub-title">House Placements</h3>
                <div className="planets-list">
                  {result.houses.filter((h) => h.planet?.length).map((h) => (
                    <div key={h.sign} className="planet-item">
                      <span className="planet-name">House {h.sign} — {h.sign_name}</span>
                      <span className="planet-sign">{h.planet.join(', ')}</span>
                    </div>
                  ))}
                </div>

                {result.debts?.length > 0 && (
                  <>
                    <h3 className="sub-title">Karmic Debts (Rin)</h3>
                    <div className="planets-list">
                      {result.debts.map((d, i) => (
                        <div key={i} className="planet-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <span className="planet-name">{d.debt_name}</span>
                          <span className="planet-sign">{d.planetory}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <h3 className="sub-title">Remedies</h3>
                <div className="planets-list">
                  {Object.values(result.remedies).map((r, i) => (
                    <div key={i} className="planet-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <span className="planet-name">{r.planet} — House {r.house}</span>
                      <span className="planet-sign">{r.effects}</span>
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

export default LalKitab;
