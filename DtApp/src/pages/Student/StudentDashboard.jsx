import React from 'react';
import { Link } from 'react-router-dom';

function StudentDashboard() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
      <h1>Student Dashboard</h1>
      <p>Welcome to your personal dashboard.</p>
      <Link to="/student/schedule" style={{ color: '#87CEEB', fontSize: '1.2rem' }}>
        View My Schedule
      </Link>
      {/* ADDED PRINTING SERVICE LINK */}
      <Link to="/student/print" style={{ color: '#90EE90', fontSize: '1.2rem' }}>
        Go to Printing Service
      </Link>
    </div>
  );
}

export default StudentDashboard;