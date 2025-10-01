import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, runTransaction, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import styles from './StudentPrintPage.module.css';
import toast, { Toaster } from 'react-hot-toast';

// --- Slot System Configuration (Remains unchanged) ---
const MAX_SLOTS = 50;
const SLOTS_PER_GROUP = 10;
const CONFIG_DOC_REF = doc(db, 'config', 'print_slots'); 

const ALLOWED_FILE_TYPES = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'image/jpeg', 'image/png', 'image/jpg', 'image/gif'
];
const ACCEPT_FILE_STRING = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif';

// Helper function to convert the 0-49 index into a human-readable ID (e.g., 'A-01')
const generateSlotId = (index) => {
  const groupIndex = Math.floor(index / SLOTS_PER_GROUP);
  const slotNumber = (index % SLOTS_PER_GROUP) + 1;
  const groupLetter = String.fromCharCode(65 + groupIndex);
  
  const slotNumberPadded = String(slotNumber).padStart(2, '0');
  
  return `${groupLetter}-${slotNumberPadded}`;
};

function PrintServicePage() { 
  const { currentUser } = useAuth();

  // Form State
  const [file, setFile] = useState(null);
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState('B&W'); // Default to B&W
  const [sided, setSided] = useState('Single-Sided');
  const [isStapled, setIsStapled] = useState(false); // Default to No Stapling
  const [instructions, setInstructions] = useState(''); // New instructions field
  
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
    const selectedFile = e.target.files[0];
    if (selectedFile) {
        if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
            toast.error("Invalid file type. Please use PDF, DOC, or common image formats.");
            setFile(null);
            e.target.value = null;
            return;
        }
      setFile(selectedFile);
    }
  };

  // Student/Teacher Collection function (removed from JSX as per request, but kept for full file context)
  const markJobCollected = async (jobId, slotId) => {
    if (!window.confirm(`Are you sure you have collected your print for Slot ${slotId}?`)) {
      return;
    }
    const jobRef = doc(db, 'print_jobs', jobId);
    try {
      await updateDoc(jobRef, { status: 'Collected' });
      toast.success(`Slot ${slotId} is now marked as Collected!`);
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
        
        let currentSlotIndex = 0;
        if (slotDoc.exists()) {
          currentSlotIndex = slotDoc.data().currentSlotIndex || 0;
        }
        
        const nextSlotIndex = (currentSlotIndex + 1) % MAX_SLOTS;
        newSlotId = generateSlotId(currentSlotIndex);
        
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
      const slotId = await assignNewSlot();
      if (!slotId) throw new Error("Failed to assign a unique slot.");
      
      toast.loading('Uploading file...', { id: toastId });

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
        preferences: { 
            copies: Number(copies), 
            color, 
            sided, 
            isStapled,
            instructions // NEW FIELD
        }, 
        status: 'In Progress',
        submittedAt: Timestamp.now(),
      };
      toast.loading(`Submitting print job for slot ${slotId}...`, { id: toastId });

      await addDoc(collection(db, 'print_jobs'), jobData);
      toast.success(`Job submitted! Your Slot ID is ${slotId}`, { id: toastId });

      // Reset form and UI state
      setFile(null);
      document.getElementById('file-upload').value = null; // Clear the file input explicitly
      setCopies(1);
      setColor('B&W');
      setSided('Single-Sided');
      setIsStapled(false);
      setInstructions(''); // Reset instructions
      
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
        
        {/* File Upload with Validation */}
        <div className={styles.formGroup}>
          <label htmlFor="file-upload">Document (PDF, DOC/X, Image)</label>
          <input 
            id="file-upload" 
            type="file" 
            onChange={handleFileChange} 
            required 
            accept={ACCEPT_FILE_STRING} // Client-side file type hint
          />
          {file && <small style={{ color: '#aaa', marginTop: '5px' }}>File selected: {file.name}</small>}
        </div>       

        <div className={styles.formGroup}>
          <label htmlFor="copies">Number of Copies</label>
          <input 
            id="copies" 
            type="number" 
            min="1" 
            value={copies} 
            onChange={(e) => setCopies(e.target.value)} 
            required 
          />
        </div>
        
        {/* Toggle Switches */}
        <div className={styles.formGroup} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #555', padding: '1rem', borderRadius: '4px' }}>
            <label style={{ marginBottom: 0 }}>Color Preference</label>
            <div className={styles.toggleGroup}>
                <button 
                    type="button" 
                    onClick={() => setColor('B&W')}
                    className={color === 'B&W' ? styles.toggleActive : styles.toggleInactive}
                >
                    B&W
                </button>
                <button 
                    type="button" 
                    onClick={() => setColor('Color')}
                    className={color === 'Color' ? styles.toggleActive : styles.toggleInactive}
                >
                    Color
                </button>
            </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="sided">Sided</label>
          <select id="sided" value={sided} onChange={(e) => setSided(e.target.value)}>
            <option>Single-Sided</option>
            <option>Double-Sided</option>
          </select>
        </div>

        <div className={styles.formGroup} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #555', padding: '1rem', borderRadius: '4px' }}>
            <label style={{ marginBottom: 0 }}>Stapling</label>
            <div className={styles.toggleGroup}>
                <button 
                    type="button" 
                    onClick={() => setIsStapled(false)}
                    className={!isStapled ? styles.toggleActive : styles.toggleInactive}
                >
                    No Stapling
                </button>
                <button 
                    type="button" 
                    onClick={() => setIsStapled(true)}
                    className={isStapled ? styles.toggleActive : styles.toggleInactive}
                >
                    Staple
                </button>
            </div>
        </div>
        
        {/* New Instructions Field */}
        <div className={styles.formGroup}>
            <label htmlFor="instructions">More Print Instructions (Optional)</label>
            <textarea 
                id="instructions"
                rows="3"
                value={instructions} 
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., 'Print pages 1-5 only', 'Bind spiral', 'High quality paper.'"
            ></textarea>
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
                  {job.preferences.isStapled ? ', Stapled' : ', No Stapling'}
                  {job.preferences.instructions && <span style={{display: 'block', fontStyle: 'italic', color: '#87CEEB'}}>Instructions: {job.preferences.instructions}</span>}
                </p>
                <small>Submitted as {job.submittedByRole} on {job.submittedAt.toDate().toLocaleString()}</small>
              </div>
              
              <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(job.status) }}>
                {job.status}
              </span>

              {job.status === 'Ready' && (
                <small style={{ color: '#90EE90', fontWeight: 'bold' }}>
                  Ready for Staff Collection
                </small>
              )}
            </div>
          ))
        ) : <p>You have not submitted any print jobs yet.</p>}
      </div>
    </div>
  );
}

export default PrintServicePage;