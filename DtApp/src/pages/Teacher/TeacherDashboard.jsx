import React from 'react';
import { Link } from 'react-router-dom';

function TeacherDashboard() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
      <h1>Teacher Dashboard</h1>
      <p>Welcome to your personal dashboard.</p>
      <Link to="/teacher/updates" style={{ color: '#87CEEB', fontSize: '1.2rem' }}>
        Post and View Lecture Updates
      </Link>
      <Link to="/student/print" style={{ color: '#90EE90', fontSize: '1.2rem' }}>
        Submit a Print Job
      </Link>
    </div>
  );
}

export default TeacherDashboard;