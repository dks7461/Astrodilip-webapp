import React from 'react';
import { Helmet } from 'react-helmet-async';

const FreeCalculators = () => {
  return (
    <div className="container" style={{ padding: '8rem 2rem 5rem', minHeight: '80vh', textAlign: 'center' }}>
      <Helmet>
        <title>Free Astrology Calculators | Kundli, Matchmaking | Astro Dilip Sharma</title>
        <meta name="description" content="Calculate your Kundli, Love Match, Numerology Number, and view Daily Panchang for free with Astro Dilip Sharma's free astrological tools." />
        <link rel="canonical" href="https://astrodilipsharma.com/calculators" />
      </Helmet>
      <h1 className="section-title">Free Calculators</h1>
      <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
        Explore our wide range of free calculators including Janam Kundli, Love Match, Numerology Number, and Daily Panchang.
      </p>
    </div>
  );
};

export default FreeCalculators;

