import React from 'react';
import { Link } from 'react-router-dom';

function StudentDashboard() {
  return (
    <div>
      <h1>Student Dashboard</h1>
      <p>Welcome to your personal dashboard.</p>
      <Link to="/student/schedule" style={{ color: '#87CEEB', fontSize: '1.2rem' }}>
        View My Schedule
      </Link>
    </div>
  );
}

export default StudentDashboard;