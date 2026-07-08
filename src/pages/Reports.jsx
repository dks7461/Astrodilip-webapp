import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Loader, AlertCircle } from 'lucide-react';
import { geocodeCity, DEFAULT_TZ } from '../lib/geocode';
import { jyotishamGet, toApiDateYMD, toApiTime } from '../lib/jyotishamApi';
import './Reports.css';

const Reports = () => {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    tob: '',
    location: ''
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fetchKundliData = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { lat, lon } = await geocodeCity(formData.location);
      const params = {
        date: toApiDateYMD(formData.dob),
        time: toApiTime(formData.tob),
        latitude: lat,
        longitude: lon,
        tz: DEFAULT_TZ,
      };

      const [planetDetails, characteristics] = await Promise.all([
        jyotishamGet('horoscope/planet-details', params),
        jyotishamGet('horoscope/personal-characteristics', params),
      ]);

      const planets = Array.from({ length: 10 }, (_, i) => planetDetails[String(i)]).filter(Boolean);
      const moon = planets.find((p) => p.full_name === 'Moon');
      const sun = planets.find((p) => p.full_name === 'Sun');

      setResult({
        ascendant: planetDetails['0']?.zodiac,
        moonSign: moon?.zodiac,
        sunSign: sun?.zodiac,
        rasi: planetDetails.rasi,
        nakshatra: planetDetails.nakshatra,
        currentDasha: planetDetails.current_dasa,
        luckyGem: planetDetails.lucky_gem,
        luckyNum: planetDetails.lucky_num,
        luckyColors: planetDetails.lucky_colors,
        planets: planets.map((p) => ({ name: p.full_name, house: p.house, sign: p.zodiac, degree: p.local_degree })),
        prediction: characteristics['0']?.personalised_prediction,
      });
    } catch (err) {
      setError(err.message || 'An error occurred while fetching the report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <Helmet>
        <title>Generate Free Janam Kundli | Astrological Reports | Astro Dilip Sharma</title>
        <meta name="description" content="Generate your personalized Janam Kundli and planetary positions report based on your birth details. Unlock your cosmic blueprint with Astro Dilip Sharma." />
        <link rel="canonical" href="https://astrodilipsharma.com/reports" />
      </Helmet>
      <div className="container">
        <h1 className="section-title">Generate Basic Kundli</h1>
        <p className="reports-subtitle" style={{ color: '#1A1400', fontWeight: '500' }}>
          Enter your birth details below to generate your personalized Janam Kundli and planetary positions report.
        </p>

        <div className="reports-container">
          <div className="glass-card form-card">
            <form onSubmit={fetchKundliData} className="kundli-form">
              <div className="form-group">
                <label style={{ color: '#1A1400' }}>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Rahul Sharma" style={{ background: 'transparent', color: '#1A1400', border: '1px solid #1A1400' }} />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label style={{ color: '#1A1400' }}>Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} required style={{ background: 'transparent', color: '#1A1400', border: '1px solid #1A1400' }} />
                </div>
                <div className="form-group">
                  <label style={{ color: '#1A1400' }}>Time of Birth</label>
                  <input type="time" name="tob" value={formData.tob} onChange={handleInputChange} required style={{ background: 'transparent', color: '#1A1400', border: '1px solid #1A1400' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: '#1A1400' }}>Birth City</label>
                <input type="text" name="location" value={formData.location} onChange={handleInputChange} required placeholder="e.g. New Delhi, India" style={{ background: 'transparent', color: '#1A1400', border: '1px solid #1A1400' }} />
              </div>

              <button type="submit" className="btn-primary submit-btn" disabled={loading}>
                {loading ? <Loader className="spin" size={20} /> : <Search size={20} />}
                {loading ? 'Analyzing...' : 'Generate Report'}
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
                <h3>Your Destiny Awaits</h3>
                <p style={{ color: '#1A1400', fontWeight: '500' }}>Fill out the form to unlock your cosmic blueprint.</p>
              </div>
            )}

            {result && (
              <div className="glass-card result-card fade-in">
                <h2 className="result-title">Kundli Overview for {formData.name || 'You'}</h2>

                <div className="stats-grid-small">
                  <div className="stat-box">
                    <span>Ascendant (Lagna)</span>
                    <h4>{result.ascendant}</h4>
                  </div>
                  <div className="stat-box">
                    <span>Moon Sign (Rasi)</span>
                    <h4>{result.moonSign}</h4>
                  </div>
                  <div className="stat-box">
                    <span>Sun Sign</span>
                    <h4>{result.sunSign}</h4>
                  </div>
                  <div className="stat-box">
                    <span>Nakshatra</span>
                    <h4>{result.nakshatra}</h4>
                  </div>
                  <div className="stat-box">
                    <span>Current Dasha</span>
                    <h4>{result.currentDasha}</h4>
                  </div>
                  <div className="stat-box">
                    <span>Lucky Number</span>
                    <h4>{result.luckyNum}</h4>
                  </div>
                </div>

                {(result.luckyGem || result.luckyColors) && (
                  <p className="reports-subtitle" style={{ margin: '0 0 2rem', color: '#1A1400' }}>
                    {result.luckyGem && <>Lucky Gem: <strong>{result.luckyGem}</strong>. </>}
                    {result.luckyColors && <>Lucky Colors: <strong>{result.luckyColors}</strong>.</>}
                  </p>
                )}

                <h3 className="sub-title">Planetary Positions</h3>
                <div className="planets-list">
                  {result.planets.map((p, i) => (
                    <div key={i} className="planet-item">
                      <span className="planet-name">{p.name}</span>
                      <span className="planet-house">House {p.house}</span>
                      <span className="planet-sign">{p.sign}</span>
                    </div>
                  ))}
                </div>

                {result.prediction && (
                  <>
                    <h3 className="sub-title">Basic Prediction</h3>
                    <p className="prediction-text">{result.prediction}</p>
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

export default Reports;

