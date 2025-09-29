import React from 'react';
import { Link } from 'react-router-dom';

function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to your personal dashboard.</p>
      {/* ADDED LINK TO THE SHARED PRINT QUEUE PAGE */}
      <Link to="/staff/queue" style={{ color: '#90EE90', fontSize: '1.2rem' }}>
        Manage Print Queue & Admin Tools
      </Link>
    </div>
  );
}

export default AdminDashboard;