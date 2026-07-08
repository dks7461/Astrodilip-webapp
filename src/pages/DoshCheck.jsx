import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Loader, AlertCircle, Check, X } from 'lucide-react';
import BirthDetailsForm from '../components/BirthDetailsForm';
import { jyotishamGet, buildBirthParams } from '../lib/jyotishamApi';
import './Reports.css';

const DOSH_LIST = [
  { path: 'dosha/mangal_dosh', label: 'Mangal Dosh' },
  { path: 'dosha/kaalsarp-dosh', label: 'Kaalsarp Dosh' },
  { path: 'dosha/manglik-dosh', label: 'Manglik Dosh' },
  { path: 'dosha/pitra-dosh', label: 'Pitra Dosh' },
];

const DoshCheck = () => {
  const [form, setForm] = useState({ name: '', dob: '', tob: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const onChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const params = await buildBirthParams(form, 'DMY');
      const data = await Promise.all(DOSH_LIST.map((d) => jyotishamGet(d.path, params)));
      setResults(DOSH_LIST.map((d, i) => ({ ...d, ...data[i] })));
    } catch (err) {
      setError(err.message || 'Could not run your dosh check.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <Helmet>
        <title>Free Dosh Check | Mangal, Kaalsarp, Manglik &amp; Pitra Dosh | Astro Dilip Sharma</title>
        <meta name="description" content="Check your birth chart for Mangal Dosh, Kaalsarp Dosh, Manglik Dosh, and Pitra Dosh for free." />
        <link rel="canonical" href="https://astrodilipsharma.com/dosh-check" />
      </Helmet>
      <div className="container">
        <h1 className="section-title">Dosh Check</h1>
        <p className="reports-subtitle">
          Screen your Janam Kundli for four of the most consulted doshas — Mangal, Kaalsarp, Manglik, and Pitra.
        </p>

        <div className="reports-container">
          <div className="glass-card form-card">
            <form onSubmit={submit} className="kundli-form">
              <BirthDetailsForm form={form} onChange={onChange} />
              <button type="submit" className="btn-primary submit-btn" disabled={loading}>
                {loading ? <Loader className="spin" size={20} /> : <Search size={20} />}
                {loading ? 'Checking...' : 'Run Dosh Check'}
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

            {!results && !error && !loading && (
              <div className="empty-state">
                <div className="glow-circle-small"></div>
                <h3>Screen Your Chart</h3>
                <p style={{ color: '#1A1400', fontWeight: '500' }}>Fill out the form to check for common doshas.</p>
              </div>
            )}

            {results && (
              <div className="glass-card result-card fade-in">
                <h2 className="result-title">Dosh Report for {form.name || 'You'}</h2>
                <div className="planets-list">
                  {results.map((d) => (
                    <div key={d.path} className="planet-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span className="planet-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {d.is_dosha_present ? <X size={16} color="#dc3545" /> : <Check size={16} color="#28a745" />}
                        {d.label}
                      </span>
                      <span className="planet-sign">{d.bot_response}</span>
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

export default DoshCheck;
