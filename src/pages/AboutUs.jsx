import React from 'react';
import { Helmet } from 'react-helmet-async';
import './Policies.css';

const AboutUs = () => {
  return (
    <div className="policy-page">
      <Helmet>
        <title>About Us | Astro Dilip Sharma - Experienced Vedic Astrologer</title>
        <meta name="description" content="Learn more about Astro Dilip Sharma, offering authentic Vedic wisdom, astrology, Vastu shastra, and numerology services for over 22 years in India." />
        <link rel="canonical" href="https://astrodilipsharma.com/about" />
      </Helmet>
      <div className="policy-header">
        <h1>About Us</h1>
        <p className="last-updated">Last updated: May 2026</p>
      </div>
      <div className="policy-content">
        <h2 style={{ textAlign: 'left', marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>
          About Astrologer Dilip Sharma
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <img 
            src="/admin-photo.png" 
            alt="Astro Dilip Sharma" 
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid var(--primary)',
              boxShadow: '4px 4px 0px rgba(26, 20, 0, 1)'
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <p>Myself Mr. Dilip Sharma, I have been practicing on Astrology and Vastu from over 22 years in the field of Vedic Astrology. I gained my knowledge in astrology from some best professors’ of Rastriya Sanskrit Sansthan. I started my astrological career in the year 2008 and later I also learned the greatest provenance of astrology under the guidance of some great astrologers of Delhi. From 2011 I started practicing in Vastu shastra & Numerology from 2013 so after that continuing working in all way of astrology and it’s uses as required.</p>
        <p>“Any Astrologer can tell to someone about his past events & the problems of his life by just see his birth chart” but it is very difficult to provide them accurate remedies. A person will satisfy only if an astrologer provides them accurate remedies for their problems. If he got the best solution for his problems he does not want more about his prediction only. I have studied and practiced since 22yrs on best remedies of Janm kundalies Grah & Dosh also Provided solutions to more then 50-lakhs clients with chart planet’s positions & Vastu remedies which gives instant & good result to clients.</p>
        <p>Therefore, I give the most preference to Karmic Remedies which give fast & accurate results. First, I check the chart & ask some questions before giving remedies. I check all prospectus by Chart, Vaastu and Numerology related issues, then only give best and easy solutions. My aim is to help you achieve balance, peace, and success in life through these ancient and proven Vedic sciences. Astrology is not just about prediction, but a spiritual and scientific roadmap to better oneself.</p>
        <p>Since the last 12 years, I have very good work in many astrology apps also like 6 years in Astrotalk. Before that, 4 years in astroyogi, Monkvyasa & now recently in Astrosage also. But as they are serving only business-oriented astrology, so here I focused more on solutions first & can take challenges for solve issues. Through my dedicated platform, I strive to provide personalized attention and remedies that truly impact my clients' lives positively.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '2.5rem' }}>
          <div style={{ background: 'rgba(26, 20, 0, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '10px' }}>Vision</h3>
            <p style={{ marginBottom: 0 }}>To empower everyone with authentic Vedic wisdom for achieving their life’s true potential and solving real-life challenges.</p>
          </div>
          
          <div style={{ background: 'rgba(26, 20, 0, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '10px' }}>Mission</h3>
            <p style={{ marginBottom: 0 }}>To solve problems and enable growth with accurate, practical, ethical, and reliable astrology all way and with easy solutions.</p>
          </div>
          
          <div style={{ background: 'rgba(26, 20, 0, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '10px' }}>Challenges</h3>
            <p style={{ marginBottom: 0 }}>To learning never end so for improve more Knowledge I always accept challenges if someone facing issue long-time &amp; not get resolved by many astrologers I definitely give solutions any way by deeply study in all aspect I have many experiences like theses in my astrology career.</p>
          </div>
        </div>
        
        <h2 style={{ marginTop: '3rem' }}>Contact Information</h2>
        <div style={{ marginTop: '1.5rem', background: 'rgba(26, 20, 0, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <p style={{ marginBottom: '0.5rem' }}><strong>Phone:</strong> +91 7414858885</p>
          <p style={{ marginBottom: '0.5rem' }}><strong>Email:</strong> info@astrodilipsharma.com</p>
          <p><strong>Address:</strong> Jaipur, Rajasthan, India</p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
