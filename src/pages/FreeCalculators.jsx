import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Heart, Hash, Sun, CalendarDays, Sparkles, Loader, AlertCircle, Clock, ShieldAlert, PieChart, BookOpen, Compass, Wand2 } from 'lucide-react';
import { geocodeCity, DEFAULT_TZ } from '../lib/geocode';
import { jyotishamGet, toApiDateDMY, toApiDateYMD, toApiTime, ZODIAC_SIGNS } from '../lib/jyotishamApi';
import PanchangWidget from '../components/PanchangWidget';
import './Reports.css';
import './FreeCalculators.css';

const inputStyle = { background: 'transparent', color: '#1A1400', border: '1px solid #1A1400' };
const labelStyle = { color: '#1A1400' };

const TABS = [
  { id: 'kundli', label: 'Janam Kundli', icon: Sparkles },
  { id: 'love', label: 'Love Match', icon: Heart },
  { id: 'numerology', label: 'Numerology', icon: Hash },
  { id: 'horoscope', label: 'Daily Horoscope', icon: Sun },
  { id: 'panchang', label: 'Daily Panchang', icon: CalendarDays },
];

const MORE_TOOLS = [
  { to: '/charts', label: 'Birth Charts', desc: 'D1, D9, Sun & Moon charts', icon: PieChart },
  { to: '/dasha', label: 'Dasha Calculator', desc: 'Current Mahadasha & Yogini Dasha', icon: Clock },
  { to: '/dosh-check', label: 'Dosh Check', desc: 'Mangal, Kaalsarp, Manglik, Pitra', icon: ShieldAlert },
  { to: '/lal-kitab', label: 'Lal Kitab', desc: 'Houses, debts & remedies', icon: BookOpen },
  { to: '/kp-astrology', label: 'KP Astrology', desc: 'Sub lords & cuspal details', icon: Compass },
  { to: '/tarot', label: 'Tarot Reading', desc: 'Free yes/no card reading', icon: Wand2 },
];

const KundliTab = () => (
  <div className="glass-card calc-card" style={{ textAlign: 'center' }}>
    <Sparkles size={40} color="var(--accent)" />
    <h3 className="sub-title" style={{ border: 'none', marginTop: '1rem' }}>Generate Your Full Janam Kundli</h3>
    <p style={{ color: '#1A1400', fontWeight: 500, marginBottom: '1.5rem' }}>
      Enter your birth details to get your ascendant, moon &amp; sun sign, nakshatra, current dasha, and planetary positions.
    </p>
    <Link to="/reports" className="btn-primary">Generate Kundli</Link>
  </div>
);

const MATCH_TYPES = [
  { id: 'ashtakoot-astro', label: 'Ashtakoot (36-point)' },
  { id: 'dashakoot-astro', label: 'Dashakoot (10-point)' },
];

const WesternMatchWidget = () => {
  const [boySign, setBoySign] = useState('Aries');
  const [girlSign, setGirlSign] = useState('Aries');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const check = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await jyotishamGet('matching/western-match', {
        boy_sign: ZODIAC_SIGNS.indexOf(boySign) + 1,
        girl_sign: ZODIAC_SIGNS.indexOf(girlSign) + 1,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not check sign compatibility.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card form-card" style={{ marginTop: '2rem' }}>
      <h3 className="sub-title" style={{ border: 'none' }}>Quick Western Zodiac Match</h3>
      <form onSubmit={check} className="calc-two-col" style={{ alignItems: 'end', gap: '1rem' }}>
        <div className="form-group">
          <label style={labelStyle}>His Sign</label>
          <select value={boySign} onChange={(e) => setBoySign(e.target.value)} className="chart-select">
            {ZODIAC_SIGNS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label style={labelStyle}>Her Sign</label>
          <select value={girlSign} onChange={(e) => setGirlSign(e.target.value)} className="chart-select">
            {ZODIAC_SIGNS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary submit-btn" disabled={loading} style={{ gridColumn: '1 / -1' }}>
          {loading ? <Loader className="spin" size={20} /> : <Heart size={20} />}
          {loading ? 'Checking...' : 'Check Sign Match'}
        </button>
      </form>

      {error && (
        <div className="error-message" style={{ marginTop: '1.5rem' }}>
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <h2 className="result-title" style={{ marginBottom: '0.5rem' }}>{result.score}%</h2>
          <p style={{ color: '#1A1400', fontWeight: 500 }}>{result.bot_response}</p>
        </div>
      )}
    </div>
  );
};

const LoveMatchTab = () => {
  const [boy, setBoy] = useState({ name: '', dob: '', tob: '', city: '' });
  const [girl, setGirl] = useState({ name: '', dob: '', tob: '', city: '' });
  const [matchType, setMatchType] = useState('ashtakoot-astro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const personFields = (person, setPerson, label) => (
    <div className="glass-card form-card">
      <h3 className="sub-title" style={{ border: 'none' }}>{label}</h3>
      <div className="kundli-form">
        <div className="form-group">
          <label style={labelStyle}>Name</label>
          <input type="text" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} required placeholder="Full name" style={inputStyle} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label style={labelStyle}>Date of Birth</label>
            <input type="date" value={person.dob} onChange={(e) => setPerson({ ...person, dob: e.target.value })} required style={inputStyle} />
          </div>
          <div className="form-group">
            <label style={labelStyle}>Time of Birth</label>
            <input type="time" value={person.tob} onChange={(e) => setPerson({ ...person, tob: e.target.value })} required style={inputStyle} />
          </div>
        </div>
        <div className="form-group">
          <label style={labelStyle}>Birth City</label>
          <input type="text" value={person.city} onChange={(e) => setPerson({ ...person, city: e.target.value })} required placeholder="e.g. Jaipur, India" style={inputStyle} />
        </div>
      </div>
    </div>
  );

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const [boyGeo, girlGeo] = await Promise.all([geocodeCity(boy.city), geocodeCity(girl.city)]);
      const data = await jyotishamGet(`matching/${matchType}`, {
        boy_dob: toApiDateYMD(boy.dob),
        boy_tob: toApiTime(boy.tob),
        boy_lat: boyGeo.lat,
        boy_lon: boyGeo.lon,
        boy_tz: DEFAULT_TZ,
        girl_dob: toApiDateYMD(girl.dob),
        girl_tob: toApiTime(girl.tob),
        girl_lat: girlGeo.lat,
        girl_lon: girlGeo.lon,
        girl_tz: DEFAULT_TZ,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not calculate compatibility.');
    } finally {
      setLoading(false);
    }
  };

  // Ashtakoot and Dashakoot return different koota category keys, so pick out
  // any response field that looks like a koota entry rather than a fixed list.
  const koota = result && Object.values(result).filter(
    (v) => v && typeof v === 'object' && !Array.isArray(v) && 'full_score' in v && 'name' in v
  ).map((k) => ({ ...k, score: k[Object.keys(k).find((f) => typeof k[f] === 'number' && f !== 'full_score')] }));

  return (
    <div>
      <div className="calc-day-toggle" style={{ marginBottom: '1.5rem' }}>
        {MATCH_TYPES.map((t) => (
          <button type="button" key={t.id} className={`calc-day-btn${t.id === matchType ? ' active' : ''}`} onClick={() => setMatchType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <div className="calc-two-col">
          {personFields(boy, setBoy, `Groom${boy.name ? ` — ${boy.name}` : ''}`)}
          {personFields(girl, setGirl, `Bride${girl.name ? ` — ${girl.name}` : ''}`)}
        </div>

        <button type="submit" className="btn-primary submit-btn" disabled={loading} style={{ maxWidth: '320px', margin: '1.5rem auto 0', display: 'flex' }}>
          {loading ? <Loader className="spin" size={20} /> : <Heart size={20} />}
          {loading ? 'Matching...' : 'Check Compatibility'}
        </button>

        {error && (
          <div className="error-message" style={{ marginTop: '2rem' }}>
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="glass-card result-card fade-in" style={{ marginTop: '2rem' }}>
            <div className="calc-score-headline">
              <h2 className="result-title" style={{ marginBottom: 0 }}>{result.score}</h2>
              <p style={{ color: '#1A1400', fontWeight: 500 }}>{result.bot_response}</p>
            </div>
            <h3 className="sub-title">Guna Milan Breakdown</h3>
            <div className="planets-list">
              {koota.map((k, i) => (
                <div key={i} className="planet-item">
                  <span className="planet-name">{k.name}</span>
                  <span className="planet-house">{k.score} / {k.full_score}</span>
                  <span className="planet-sign">{k.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>

      <WesternMatchWidget />
    </div>
  );
};

const NumerologyTab = () => {
  const [form, setForm] = useState({ name: '', dob: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const params = { name: form.name, date: toApiDateDMY(form.dob) };
      if (form.phone) params.phone = form.phone;
      const data = await jyotishamGet('numerology/number-analysis', params);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not calculate your numerology numbers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-container">
      <div className="glass-card form-card">
        <form onSubmit={submit} className="kundli-form">
          <div className="form-group">
            <label style={labelStyle}>Full Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Rahul Sharma" style={inputStyle} />
          </div>
          <div className="form-group">
            <label style={labelStyle}>Date of Birth</label>
            <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required style={inputStyle} />
          </div>
          <div className="form-group">
            <label style={labelStyle}>Mobile Number (optional)</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 9876543210" style={inputStyle} />
          </div>
          <button type="submit" className="btn-primary submit-btn" disabled={loading}>
            {loading ? <Loader className="spin" size={20} /> : <Hash size={20} />}
            {loading ? 'Calculating...' : 'Calculate My Numbers'}
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
            <h3>Discover Your Numbers</h3>
            <p style={{ color: '#1A1400', fontWeight: '500' }}>Fill out the form to reveal your numerology profile.</p>
          </div>
        )}

        {result && (
          <div className="glass-card result-card fade-in">
            <h2 className="result-title">Numerology Profile for {form.name}</h2>
            <div className="stats-grid-small">
              <div className="stat-box"><span>Radical Number</span><h4>{result.radicalNumber}</h4></div>
              <div className="stat-box"><span>Destiny Number</span><h4>{result.destinyNumber}</h4></div>
              <div className="stat-box"><span>Name Number</span><h4>{result.nameNumber}</h4></div>
              <div className="stat-box"><span>Name Compound No.</span><h4>{result.nameCompoundNumber}</h4></div>
              <div className="stat-box"><span>Western Zodiac</span><h4>{result.westernZodiacSign}</h4></div>
              {result.mobileNumber != null && <div className="stat-box"><span>Mobile Number</span><h4>{result.mobileNumber}</h4></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];
const CURRENT_YEAR = new Date().getFullYear();

const HoroscopeTab = ({ initialSign }) => {
  const [sign, setSign] = useState(initialSign);
  const [period, setPeriod] = useState('daily');
  const [day, setDay] = useState('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const zodiac = ZODIAC_SIGNS.indexOf(sign) + 1;
    const request = period === 'daily' ? jyotishamGet('prediction/daily', { zodiac, day })
      : period === 'weekly' ? jyotishamGet('prediction/weekly', { zodiac })
      : period === 'monthly' ? jyotishamGet('prediction/monthly', { zodiac })
      : jyotishamGet('prediction/yearly', { zodiac, year: CURRENT_YEAR });

    request
      .then((data) => { if (!cancelled) setResult(data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load horoscope.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sign, period, day]);

  return (
    <div>
      <div className="calc-sign-grid">
        {ZODIAC_SIGNS.map((s) => (
          <button type="button" key={s} className={`calc-sign-btn${s === sign ? ' active' : ''}`} onClick={() => setSign(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="calc-day-toggle" style={{ marginBottom: '0.8rem' }}>
        {PERIODS.map((p) => (
          <button type="button" key={p} className={`calc-day-btn${p === period ? ' active' : ''}`} onClick={() => setPeriod(p)}>
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {period === 'daily' && (
        <div className="calc-day-toggle">
          {['yesterday', 'today', 'tomorrow'].map((d) => (
            <button type="button" key={d} className={`calc-day-btn${d === day ? ' active' : ''}`} onClick={() => setDay(d)}>
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="error-message" style={{ marginTop: '1.5rem' }}>
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="empty-state" style={{ marginTop: '1.5rem', minHeight: '150px' }}>
          <Loader className="spin" size={28} />
        </div>
      )}

      {result && !loading && !error && period !== 'yearly' && (
        <div className="glass-card result-card fade-in" style={{ marginTop: '1.5rem' }}>
          <h2 className="result-title">{sign}{result.date ? ` — ${result.date}` : ` — ${period[0].toUpperCase()}${period.slice(1)}`}</h2>
          <p className="prediction-text">{result.horoscope_data}</p>
          {result.challenging_days && (
            <p style={{ color: '#1A1400', fontWeight: 600, marginTop: '1rem' }}>Challenging days: {result.challenging_days}</p>
          )}
        </div>
      )}

      {result && !loading && !error && period === 'yearly' && (
        <div className="planets-list" style={{ marginTop: '1.5rem' }}>
          {['phase_1', 'phase_2', 'phase_3', 'phase_4'].map((key) => {
            const phase = result[key];
            if (!phase) return null;
            return (
              <div key={key} className="glass-card result-card" style={{ textAlign: 'left' }}>
                <h3 className="sub-title" style={{ border: 'none' }}>{phase.period} — {phase.score}</h3>
                <p className="prediction-text">{phase.prediction}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FreeCalculators = () => {
  const [searchParams] = useSearchParams();
  const signParam = searchParams.get('sign');
  const matchedSign = signParam && ZODIAC_SIGNS.find((s) => s.toLowerCase() === signParam.toLowerCase());
  const tabParam = searchParams.get('tab');
  const matchedTab = tabParam && TABS.find((t) => t.id === tabParam);
  const [activeTab, setActiveTab] = useState(matchedTab ? matchedTab.id : matchedSign ? 'horoscope' : 'kundli');

  return (
    <div className="reports-page">
      <Helmet>
        <title>Free Astrology Calculators | Kundli, Matchmaking | Astro Dilip Sharma</title>
        <meta name="description" content="Calculate your Kundli, Love Match, Numerology Number, and view Daily Panchang for free with Astro Dilip Sharma's free astrological tools." />
        <link rel="canonical" href="https://astrodilipsharma.com/calculators" />
      </Helmet>

      <div className="container">
        <h1 className="section-title">Free Calculators</h1>
        <p className="reports-subtitle">
          Explore our wide range of free calculators including Janam Kundli, Love Match, Numerology Number, and Daily Panchang.
        </p>

        <div className="calc-tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} className={`calc-tab-btn${id === activeTab ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        <div className="calc-tab-content">
          {activeTab === 'kundli' && <KundliTab />}
          {activeTab === 'love' && <LoveMatchTab />}
          {activeTab === 'numerology' && <NumerologyTab />}
          {activeTab === 'horoscope' && <HoroscopeTab initialSign={matchedSign || 'Aries'} />}
          {activeTab === 'panchang' && <PanchangWidget />}
        </div>

        <h2 className="sub-title" style={{ marginTop: '4rem', textAlign: 'center', border: 'none' }}>More Free Tools</h2>
        <div className="calc-more-tools-grid">
          {MORE_TOOLS.map(({ to, label, desc, icon: Icon }) => (
            <Link to={to} key={to} className="glass-card calc-more-tool-card">
              <Icon size={28} color="var(--accent)" />
              <h4>{label}</h4>
              <p>{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FreeCalculators;
