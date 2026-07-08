import React, { useState, useEffect } from 'react';
import { Sun, Moon, Clock, Calendar as CalendarIcon } from 'lucide-react';
import './PanchangWidget.css';

// New Delhi, India (matches the widget's displayed location)
const LOCATION = { lat: 28.6139, lon: 77.209, tz: 5.5 };

const pad2 = (n) => String(n).padStart(2, '0');
const toApiDate = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const toApiTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const PanchangWidget = () => {
  const [currentDate, setCurrentDate] = useState('');
  const [panchang, setPanchang] = useState(null);

  useEffect(() => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(now.toLocaleDateString('en-IN', options));

    const apiKey = import.meta.env.VITE_JYOTISHAM_API_KEY;
    if (!apiKey) return;

    const url = `https://api.jyotishamastroapi.com/api/panchang/panchang?date=${toApiDate(now)}&time=${toApiTime(now)}&latitude=${LOCATION.lat}&longitude=${LOCATION.lon}&tz=${LOCATION.tz}&lang=en`;

    fetch(url, { headers: { key: apiKey } })
      .then((res) => res.json())
      .then((data) => {
        if (data?.status === 200) setPanchang(data.response);
      })
      .catch(() => {
        // Keep static fallback values on failure
      });
  }, []);

  const sunrise = panchang?.advanced_details?.sun_rise ?? '05:42 AM';
  const sunset = panchang?.advanced_details?.sun_set ?? '07:11 PM';
  const tithi = panchang ? `${panchang.tithi.type} Paksha ${panchang.tithi.name}` : 'Shukla Paksha Dashami';
  const nakshatra = panchang?.nakshatra?.name ?? 'Magha';
  const abhijit = panchang?.advanced_details?.abhijitMuhurta;
  const abhijitTime = abhijit ? `${abhijit.start} - ${abhijit.end}` : '11:50 AM - 12:45 PM';
  const rahuKaal = panchang?.rahukaal ? panchang.rahukaal.replace(' to ', ' - ') : '04:30 PM - 06:00 PM';

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
            <span className="panchang-value">{sunrise}</span>
          </div>
        </div>
        
        <div className="panchang-item">
          <div className="panchang-icon-wrapper">
            <Moon size={28} />
          </div>
          <div className="panchang-details">
            <span className="panchang-label">Sunset</span>
            <span className="panchang-value">{sunset}</span>
          </div>
        </div>
        
        <div className="panchang-item">
          <div className="panchang-icon-wrapper">
            <Clock size={28} />
          </div>
          <div className="panchang-details">
            <span className="panchang-label">Tithi</span>
            <span className="panchang-value">{tithi}</span>
          </div>
        </div>
        
        <div className="panchang-item">
          <div className="panchang-icon-wrapper">
            <Clock size={28} />
          </div>
          <div className="panchang-details">
            <span className="panchang-label">Nakshatra</span>
            <span className="panchang-value">{nakshatra}</span>
          </div>
        </div>
      </div>

      <div className="muhurat-container">
        <div className="muhurat-box auspicious">
          <div className="muhurat-header">
            <h3>Abhijit Muhurat</h3>
            <span className="muhurat-badge">Auspicious</span>
          </div>
          <p className="muhurat-time">{abhijitTime}</p>
          <p className="muhurat-desc">The most powerful and auspicious time of the day to start any new or important work.</p>
        </div>

        <div className="muhurat-box inauspicious">
          <div className="muhurat-header">
            <h3>Rahu Kaal</h3>
            <span className="muhurat-badge danger">Inauspicious</span>
          </div>
          <p className="muhurat-time">{rahuKaal}</p>
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

