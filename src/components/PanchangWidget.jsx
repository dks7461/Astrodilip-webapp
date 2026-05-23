import React, { useState, useEffect } from 'react';
import { Sun, Moon, Clock, Calendar as CalendarIcon } from 'lucide-react';
import './PanchangWidget.css';

const PanchangWidget = () => {
  const [currentDate, setCurrentDate] = useState('');
  
  useEffect(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('en-IN', options));
  }, []);

  return (
    <div className="panchang-widget glass-card">
      <div className="panchang-header">
        <div className="panchang-title-group">
          <h2 className="panchang-title">Today's Panchang</h2>
          <span className="panchang-date"><CalendarIcon size={18} /> {currentDate}</span>
        </div>
        <p className="panchang-subtitle">Daily planetary positioning and auspicious timings for New Delhi, India</p>
      </div>

      <div className="panchang-grid">
        <div className="panchang-item">
          <div className="panchang-icon-wrapper">
            <Sun size={28} />
          </div>
          <div className="panchang-details">
            <span className="panchang-label">Sunrise</span>
            <span className="panchang-value">05:42 AM</span>
          </div>
        </div>
        
        <div className="panchang-item">
          <div className="panchang-icon-wrapper">
            <Moon size={28} />
          </div>
          <div className="panchang-details">
            <span className="panchang-label">Sunset</span>
            <span className="panchang-value">07:11 PM</span>
          </div>
        </div>
        
        <div className="panchang-item">
          <div className="panchang-icon-wrapper">
            <Clock size={28} />
          </div>
          <div className="panchang-details">
            <span className="panchang-label">Tithi</span>
            <span className="panchang-value">Shukla Paksha Dashami</span>
          </div>
        </div>
        
        <div className="panchang-item">
          <div className="panchang-icon-wrapper">
            <Clock size={28} />
          </div>
          <div className="panchang-details">
            <span className="panchang-label">Nakshatra</span>
            <span className="panchang-value">Magha</span>
          </div>
        </div>
      </div>

      <div className="muhurat-container">
        <div className="muhurat-box auspicious">
          <div className="muhurat-header">
            <h3>Abhijit Muhurat</h3>
            <span className="muhurat-badge">Auspicious</span>
          </div>
          <p className="muhurat-time">11:50 AM - 12:45 PM</p>
          <p className="muhurat-desc">The most powerful and auspicious time of the day to start any new or important work.</p>
        </div>

        <div className="muhurat-box inauspicious">
          <div className="muhurat-header">
            <h3>Rahu Kaal</h3>
            <span className="muhurat-badge danger">Inauspicious</span>
          </div>
          <p className="muhurat-time">04:30 PM - 06:00 PM</p>
          <p className="muhurat-desc">Avoid starting new ventures, signing documents, or doing important tasks during this period.</p>
        </div>
      </div>
      
      <div className="panchang-footer">
        <button className="btn-primary" style={{ width: '100%', padding: '1rem' }}>View Detailed Panchang</button>
      </div>
    </div>
  );
};

export default PanchangWidget;

