import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.brand}>College Portal</Link>
      <div className={styles.navLinks}>
        {currentUser ? (
          <>
            {/* THIS IS THE NEW PART - START */}
            {currentUser.role === 'student' && (
              <Link to="/student/profile" style={{ color: 'white', textDecoration: 'none' }}>
                Profile
              </Link>
            )}
            {/* THIS IS THE NEW PART - END */}

            <span>Welcome, {currentUser.email}</span>
            <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;