import React, { useState } from 'react';
import { useAuth } from './../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Signup.module.css'; // We can reuse the student signup styles
import toast, { Toaster } from 'react-hot-toast';

// This is the small, reusable form for adding one assignment
const AssignmentForm = ({ onAdd }) => {
  const [assignment, setAssignment] = useState({
    year: '1',
    branch: 'IT',
    division: 'A',
    subject: '',
    batches: [],
  });

  const handleBatchChange = (e) => {
    const { value, checked } = e.target;
    let newBatches = [...assignment.batches];

    if (value === 'All') {
      newBatches = checked ? ['All'] : [];
    } else {
      newBatches = newBatches.filter(b => b !== 'All'); // Remove 'All' if a specific batch is chosen
      if (checked) {
        newBatches.push(value);
      } else {
        newBatches = newBatches.filter((b) => b !== value);
      }
    }
    setAssignment({ ...assignment, batches: newBatches });
  };

  const handleAddClick = () => {
    if (!assignment.subject) {
      toast.error('Please enter a subject name.');
      return;
    }
    if (assignment.batches.length === 0) {
      toast.error('Please select at least one batch or "All".');
      return;
    }
    onAdd(assignment);
    setAssignment({ year: '1', branch: 'IT', division: 'A', subject: '', batches: [] });
  };

  return (
    <div style={{ border: '1px solid #555', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <select className={styles.formGroup} value={assignment.year} onChange={e => setAssignment({...assignment, year: e.target.value})}>
            {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}{y===1?'st':y===2?'nd':y===3?'rd':'th'} Year</option>)}
        </select>
        <select className={styles.formGroup} value={assignment.branch} onChange={e => setAssignment({...assignment, branch: e.target.value})}>
            {['IT', 'CMPN', 'EXTC', 'EXCS'].map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className={styles.formGroup} value={assignment.division} onChange={e => setAssignment({...assignment, division: e.target.value})}>
            {['A', 'B', 'C'].map(d => <option key={d} value={d}>Division {d}</option>)}
        </select>
        <input className={styles.formGroup} type="text" placeholder="Subject Name" value={assignment.subject} onChange={e => setAssignment({...assignment, subject: e.target.value})} />
      </div>
      <div style={{ textAlign: 'left', marginTop: '1rem' }}>
        <strong>Batches:</strong>
        {['1', '2', '3', 'All'].map(batch => (
          <label key={batch} style={{ marginRight: '1rem', marginLeft: '0.5rem' }}>
            <input type="checkbox" value={batch} checked={assignment.batches.includes(batch)} onChange={handleBatchChange} />
            {batch === 'All' ? 'Theory (All)' : `Batch ${batch}`}
          </label>
        ))}
      </div>
      <button type="button" onClick={handleAddClick} style={{width: '100%', marginTop: '1rem', padding: '0.5rem'}}>Add This Assignment</button>
    </div>
  );
};


// This is the main Teacher Signup component
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
      // The 4th argument 'teacher' sets the role
      await signup(email, password, { teachingAssignments: assignments }, 'teacher'); 
      toast.success('Teacher account created successfully!');
      navigate('/teacher');
    } catch (error) {
      toast.error(error.message || 'Failed to create account.');
    }
  };

  return (
    <div className={styles.signupContainer}>
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

          {showAssignmentForm && <AssignmentForm onAdd={handleAddAssignment} />}
          
          <button type="button" onClick={() => setShowAssignmentForm(!showAssignmentForm)} style={{width: '100%', marginTop: '0.5rem', padding: '0.5rem'}}>
            {showAssignmentForm ? 'Cancel' : '+ Add New Assignment'}
          </button>
        </div>
        
        <button type="submit" className={styles.submitButton}>Create Account</button>
      </form>
       <p className={styles.loginLink}>Already have an account? <Link to="/login">Log In</Link></p>
    </div>
  );
}

export default TeacherSignup;