import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Login.module.css'; // Reusing login page styles
import toast, { Toaster } from 'react-hot-toast';
import AssignmentForm from '../components/teacher/AssignmentForm'; // Import the new component

function TeacherSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleAddAssignment = (newAssignment) => {
    setAssignments([...assignments, newAssignment]);
    setShowAssignmentForm(false);
  };

  const handleRemoveAssignment = (indexToRemove) => {
    setAssignments(assignments.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (assignments.length === 0) {
        toast.error("Please add at least one teaching assignment.");
        return;
    }
    try {
      await signup(email, password, { teachingAssignments: assignments }, 'teacher'); 
      toast.success('Teacher account created successfully!');
      navigate('/teacher');
    } catch (error) {
      toast.error(error.message || 'Failed to create account.');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <Toaster position="top-center" />
      <h2>Create Teacher Account</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className={styles.formGroup}><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        
        <div style={{ textAlign: 'left', border: '1px solid #444', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
          <h4>Teaching Assignments</h4>
          {assignments.length > 0 ? assignments.map((a, i) => (
            <div key={i} style={{ background: '#444', padding: '0.5rem', borderRadius: '5px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{a.year}yr {a.branch} {a.division} - {a.subject} ({a.batches.join(', ')})</span>
              <button type="button" onClick={() => handleRemoveAssignment(i)} style={{background: '#c82333', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: '24px', height: '24px'}}>X</button>
            </div>
          )) : <p>No assignments added yet.</p>}

          {showAssignmentForm && <AssignmentForm onAdd={handleAddAssignment} onCancel={() => setShowAssignmentForm(false)} />}
          
          {!showAssignmentForm && (
            <button type="button" onClick={() => setShowAssignmentForm(true)} style={{width: '100%', marginTop: '0.5rem', padding: '0.5rem'}}>
              + Add New Assignment
            </button>
          )}
        </div>
        
        <button type="submit" className={styles.submitButton}>Create Account</button>
      </form>
       <p style={{marginTop: '1rem'}}>Already have an account? <Link to="/login">Log In</Link></p>
    </div>
  );
}

export default TeacherSignup;