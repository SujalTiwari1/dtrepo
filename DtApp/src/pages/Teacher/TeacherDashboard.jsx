import React from 'react';
import { Link } from 'react-router-dom';

function TeacherDashboard() {
  return (
    <div>
      <h1>Teacher Dashboard</h1>
      <p>Welcome to your personal dashboard.</p>
      <Link to="/teacher/updates" style={{ color: '#87CEEB', fontSize: '1.2rem' }}>
        Post and View Lecture Updates
      </Link>
    </div>
  );
}

export default TeacherDashboard;