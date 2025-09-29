import React from 'react';
import { Link } from 'react-router-dom';

function StaffDashboard() {
  return (
    <div>
      <h1>Staff Dashboard</h1>
      <p>Welcome to your personal dashboard.</p>
      <Link to="/staff/queue" style={{ color: '#90EE90', fontSize: '1.2rem' }}>
        Manage Print Queue (V-Print)
      </Link>
    </div>
  );
}

export default StaffDashboard;