import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Loader, AlertCircle } from 'lucide-react';
import { jyotishamGet } from '../lib/jyotishamApi';
import './Reports.css';
import './Tarot.css';

const MAJOR_ARCANA_COUNT = 22;

const Tarot = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [card, setCard] = useState(null);

  const draw = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCard(null);
    try {
      const tarotNo = Math.floor(Math.random() * MAJOR_ARCANA_COUNT) + 1;
      const data = await jyotishamGet('tarot_readings/yes_or_no', { tarot_no: tarotNo });
      setCard(data);
    } catch (err) {
      setError(err.message || 'Could not draw a card right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <Helmet>
        <title>Free Yes/No Tarot Reading | Astro Dilip Sharma</title>
        <meta name="description" content="Ask a yes-or-no question and draw a free tarot card for instant guidance." />
        <link rel="canonical" href="https://astrodilipsharma.com/tarot" />
      </Helmet>
      <div className="container" style={{ textAlign: 'center', maxWidth: '700px' }}>
        <h1 className="section-title">Yes / No Tarot Reading</h1>
        <p className="reports-subtitle">
          Think of a yes-or-no question, then draw a card for an instant answer.
        </p>

        <form onSubmit={draw} className="glass-card form-card" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label style={{ color: '#1A1400' }}>Your Question (optional, just for focus)</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Will this be a good year for my career?"
              style={{ background: 'transparent', color: '#1A1400', border: '1px solid #1A1400' }}
            />
          </div>
          <button type="submit" className="btn-primary submit-btn" disabled={loading}>
            {loading ? <Loader className="spin" size={20} /> : <Sparkles size={20} />}
            {loading ? 'Drawing...' : 'Draw a Card'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        )}

        {card && (
          <div className="glass-card result-card fade-in tarot-card-result">
            <span className={`tarot-answer-badge ${card.value === 'Yes' ? 'yes' : 'no'}`}>{card.value}</span>
            <h2 className="result-title" style={{ marginTop: '1rem' }}>{card.name}</h2>
            <p className="prediction-text">{card.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tarot;
