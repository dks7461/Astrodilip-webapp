import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Loader, AlertCircle } from 'lucide-react';
import BirthDetailsForm from '../components/BirthDetailsForm';
import { jyotishamGetSvg, buildBirthParams } from '../lib/jyotishamApi';
import './Reports.css';
import './Charts.css';

const CHART_TYPES = [
  { id: 'd1', label: 'D1 — Rasi (Main)' },
  { id: 'd9', label: 'D9 — Navamsa' },
  { id: 'd10', label: 'D10 — Career' },
  { id: 'd7', label: 'D7 — Children' },
  { id: 'd12', label: 'D12 — Parents' },
  { id: 'sun', label: 'Sun Chart' },
  { id: 'moon', label: 'Moon Chart' },
  { id: 'bhav_chalit', label: 'Bhav Chalit' },
];

const Charts = () => {
  const [form, setForm] = useState({ name: '', dob: '', tob: '', city: '' });
  const [chartType, setChartType] = useState('d1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [svg, setSvg] = useState(null);

  const onChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSvg(null);
    try {
      const params = await buildBirthParams(form, 'DMY');
      const data = await jyotishamGetSvg(`chart_image/${chartType}`, { ...params, colored_planets: true });
      setSvg(data);
    } catch (err) {
      setError(err.message || 'Could not generate this chart.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <Helmet>
        <title>Free Kundli Chart Generator | D1–D12, Sun &amp; Moon Charts | Astro Dilip Sharma</title>
        <meta name="description" content="Generate your divisional birth charts (D1, D9, D10 and more) for free based on your birth details." />
        <link rel="canonical" href="https://astrodilipsharma.com/charts" />
      </Helmet>
      <div className="container">
        <h1 className="section-title">Birth Chart Generator</h1>
        <p className="reports-subtitle">
          Visualize your Vedic birth chart in the traditional North Indian style — Rasi, Navamsa, and other divisional charts.
        </p>

        <div className="reports-container">
          <div className="glass-card form-card">
            <form onSubmit={submit} className="kundli-form">
              <BirthDetailsForm form={form} onChange={onChange} showName={false} />
              <div className="form-group">
                <label style={{ color: '#1A1400' }}>Chart Type</label>
                <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="chart-select">
                  {CHART_TYPES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary submit-btn" disabled={loading}>
                {loading ? <Loader className="spin" size={20} /> : <Search size={20} />}
                {loading ? 'Drawing Chart...' : 'Generate Chart'}
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

            {!svg && !error && !loading && (
              <div className="empty-state">
                <div className="glow-circle-small"></div>
                <h3>Your Chart Awaits</h3>
                <p style={{ color: '#1A1400', fontWeight: '500' }}>Fill out the form to draw your birth chart.</p>
              </div>
            )}

            {svg && (
              <div className="glass-card result-card fade-in chart-result" dangerouslySetInnerHTML={{ __html: svg }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Charts;
