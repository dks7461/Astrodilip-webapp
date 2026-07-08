import React from 'react';

const inputStyle = { background: 'transparent', color: '#1A1400', border: '1px solid #1A1400' };
const labelStyle = { color: '#1A1400' };

const BirthDetailsForm = ({ form, onChange, showName = true }) => (
  <div className="kundli-form">
    {showName && (
      <div className="form-group">
        <label style={labelStyle}>Full Name</label>
        <input type="text" value={form.name} onChange={(e) => onChange('name', e.target.value)} required placeholder="e.g. Rahul Sharma" style={inputStyle} />
      </div>
    )}
    <div className="form-row">
      <div className="form-group">
        <label style={labelStyle}>Date of Birth</label>
        <input type="date" value={form.dob} onChange={(e) => onChange('dob', e.target.value)} required style={inputStyle} />
      </div>
      <div className="form-group">
        <label style={labelStyle}>Time of Birth</label>
        <input type="time" value={form.tob} onChange={(e) => onChange('tob', e.target.value)} required style={inputStyle} />
      </div>
    </div>
    <div className="form-group">
      <label style={labelStyle}>Birth City</label>
      <input type="text" value={form.city} onChange={(e) => onChange('city', e.target.value)} required placeholder="e.g. New Delhi, India" style={inputStyle} />
    </div>
  </div>
);

export default BirthDetailsForm;
