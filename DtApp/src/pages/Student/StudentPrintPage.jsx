import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, runTransaction, doc,updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import styles from './StudentPrintPage.module.css';
import toast, { Toaster } from 'react-hot-toast';

// --- Slot System Configuration ---
const MAX_SLOTS = 50;
const SLOTS_PER_GROUP = 10;
// We need this document to safely track the next available slot index across users
const CONFIG_DOC_REF = doc(db, 'config', 'print_slots'); 

// Helper function to convert the 0-49 index into a human-readable ID (e.g., 'A-01')
const generateSlotId = (index) => {
  const groupIndex = Math.floor(index / SLOTS_PER_GROUP);
  const slotNumber = (index % SLOTS_PER_GROUP) + 1;
  const groupLetter = String.fromCharCode(65 + groupIndex);
  
  // Pad the number to ensure "A-01" instead of "A-1"
  const slotNumberPadded = String(slotNumber).padStart(2, '0');
  
  return `${groupLetter}-${slotNumberPadded}`;
};

function PrintServicePage() { // Renamed internally for clarity, export remains the same
  const { currentUser } = useAuth();

  // Form State
  const [file, setFile] = useState(null);
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState('B&W');
  const [sided, setSided] = useState('Single-Sided');
  const [isStapled, setIsStapled] = useState(false); // New stapling state

  // UI State
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);

  // Fetch jobs for the current user
  const fetchJobs = async () => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'print_jobs'),
      where('submittedById', '==', currentUser.uid),
      orderBy('submittedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const userJobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setJobs(userJobs);
  };

  useEffect(() => {
    fetchJobs();
  }, [currentUser]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const markJobCollected = async (jobId) => {
    const jobRef = doc(db, 'print_jobs', jobId);
    try {
      await updateDoc(jobRef, { status: 'Collected' });
      toast.success(`Job marked as Collected!`);
      fetchJobs();
    } catch (error) {
      console.error('Error marking job as collected: ', error);
      toast.error('Failed to mark job as collected.');
    }
  };

  const assignNewSlot = async () => {
    let newSlotId = null;
    
    // Use a transaction to safely read and update the slot counter
    try {
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(CONFIG_DOC_REF);
        
        // Initialize if document does not exist
        let currentSlotIndex = 0;
        if (slotDoc.exists()) {
          currentSlotIndex = slotDoc.data().currentSlotIndex || 0;
        }
        
        // Calculate the next index and wrap around (0 to 49)
        const nextSlotIndex = (currentSlotIndex + 1) % MAX_SLOTS;
        
        // Generate the human-readable ID
        newSlotId = generateSlotId(currentSlotIndex);
        
        // Update the config document with the next index
        transaction.set(CONFIG_DOC_REF, { currentSlotIndex: nextSlotIndex });
      });
      return newSlotId;
    } catch (error) {
      console.error("Transaction failed: ", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    
    // --- OVERFLOW CHECK LOGIC ---
    // Count jobs that are NOT collected (In Progress or Ready)
    const activeJobsQuery = query(
      collection(db, 'print_jobs'),
      where('status', 'in', ['In Progress', 'Ready'])
    );
    const activeSnapshot = await getDocs(activeJobsQuery);

    if (activeSnapshot.size >= MAX_SLOTS) {
        toast.error(`All ${MAX_SLOTS} slots are currently active. Please ask staff to clear a slot.`);
        setUploading(false);
        return;
    }
    // --- END OVERFLOW CHECK LOGIC ---

    setUploading(true);
    let toastId = toast.loading('Uploading file and assigning slot...');

    try {
      // 1. Assign Unique Slot ID (Atomic Operation)
      const slotId = await assignNewSlot();
      if (!slotId) throw new Error("Failed to assign a unique slot.");
      
      toast.loading('Uploading file...', { id: toastId });

      // 2. Upload file to Firebase Storage
      const storageRef = ref(storage, `print-jobs/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 3. Create document in Firestore
      const jobData = {
        submittedById: currentUser.uid, 
        submittedByEmail: currentUser.email,
        submittedByRole: currentUser.role,
        fileName: file.name,
        fileUrl: downloadURL,
        slotId: slotId, 
        preferences: { copies: Number(copies), color, sided, isStapled }, 
        status: 'In Progress',
        submittedAt: Timestamp.now(),
      };
      toast.loading(`Submitting print job for slot ${slotId}...`, { id: toastId });

      await addDoc(collection(db, 'print_jobs'), jobData);
      toast.success(`Job submitted! Your Slot ID is ${slotId}`, { id: toastId });

      // Reset form and refresh job list
      setFile(null);
      e.target.value = null; // Clear the file input directly
      setCopies(1);
      setColor('B&W');
      setSided('Single-Sided');
      setIsStapled(false);
      
      fetchJobs();

    } catch (error) {
      console.error("Error submitting print job: ", error);
      toast.error(`An error occurred. Please try again.`, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress': return '#ffc107';
      case 'Ready': return '#28a745';
      case 'Collected': return '#6c757d';
      default: return '#6c757d';
    }
  };

  return (
    <div className={styles.printContainer}>
      <Toaster position="top-center" />
      <h2>Submit a Print Job ({currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)})</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="file-upload">Document (PDF, Word, Image)</label>
          <input id="file-upload" type="file" onChange={handleFileChange} required />
        </div>       
        <div className={styles.formGroup}>
          <label htmlFor="copies">Number of Copies</label>
          <input id="copies" type="number" min="1" value={copies} onChange={(e) => setCopies(e.target.value)} required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="color">Color</label>
          <select id="color" value={color} onChange={(e) => setColor(e.target.value)}>
            <option>B&W</option>
            <option>Color</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="sided">Sided</label>
          <select id="sided" value={sided} onChange={(e) => setSided(e.target.value)}>
            <option>Single-Sided</option>
            <option>Double-Sided</option>
          </select>
        </div>
        {/* NEW STAPLING OPTION */}
        <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <label htmlFor="stapled" style={{ marginBottom: 0 }}>Do you want your document stapled?</label>
          <input 
            id="stapled" 
            type="checkbox" 
            checked={isStapled} 
            onChange={(e) => setIsStapled(e.target.checked)} 
            style={{ width: 'auto', margin: '0 0 0 10px' }} // Adjusted inline style for better alignment
          />
        </div>
        <button type="submit" className={styles.submitButton} disabled={uploading}>
          {uploading ? 'Submitting...' : 'Submit Print Job'}
        </button>
      </form>

      <hr />

      <div className={styles.jobList}>
        <h2>Your Print Jobs</h2>
        {jobs.length > 0 ? (
          jobs.map(job => (
            <div key={job.id} className={styles.jobCard}>
              <div>
                <strong>Slot: {job.slotId} - {job.fileName}</strong> 
                <p style={{margin: '4px 0', fontSize: '0.9rem', color: '#aaa'}}>
                  {job.preferences.copies} copies, {job.preferences.color}, {job.preferences.sided}
                  {job.preferences.isStapled ? ', Stapled' : ''}
                </p>
                <small>Submitted as {job.submittedByRole} on {job.submittedAt.toDate().toLocaleString()}</small>
              </div>
              
              <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(job.status) }}>
                {job.status}
              </span>

              {/* STUDENT COLLECTION BUTTON */}
              {job.status === 'Ready' && (
                <button 
                  className={styles.collectedButton}
                  onClick={() => markJobCollected(job.id)}
                  style={{ marginLeft: '1rem', backgroundColor: '#90EE90', color: '#111' }}
                >
                  Confirm Collection
                </button>
              )}
            </div>
          ))
        ) : <p>You have not submitted any print jobs yet.</p>}
      </div>
    </div>
  );
}

export default PrintServicePage;