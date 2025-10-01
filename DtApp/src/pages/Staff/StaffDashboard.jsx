import React from 'react';
import { Link } from 'react-router-dom';

function StaffDashboard() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
      <h1>Staff Dashboard</h1>
      <p>Welcome to your personal dashboard.</p>
      {/* Link 1: The Queue Management */}
      <Link to="/staff/queue" style={{ color: '#90EE90', fontSize: '1.2rem' }}>
        Manage Print Queue (V-Print Jobs)
      </Link>
      {/* Link 2: The Slot Status Dashboard */}
      <Link to="/staff/slots" style={{ color: '#87CEEB', fontSize: '1.2rem' }}>
        View Print Slot Status
      </Link>
    </div>
  );
}

export default StaffDashboard;