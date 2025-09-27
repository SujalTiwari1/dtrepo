import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h1>Welcome to the College Portal</h1>
      <p>Please log in to continue.</p>
      <Link to="/login">Go to Login</Link>
    </div>
  );
}

export default Home;