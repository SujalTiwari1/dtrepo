import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import styles from './StudentPrintPage.module.css'; // NOTE: You need this CSS file as well
import toast, { Toaster } from 'react-hot-toast';

function StudentPrintPage() {
  const { currentUser } = useAuth();

  // Form State
  const [file, setFile] = useState(null);
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState('B&W');
  const [sided, setSided] = useState('Single-Sided');

  // UI State
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);

  const fetchJobs = async () => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'print_jobs'),
      where('studentId', '==', currentUser.uid),
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    setUploading(true);
    const toastId = toast.loading('Uploading file...');

    try {
      // 1. Upload file to Firebase Storage
      const storageRef = ref(storage, `print-jobs/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      toast.loading('Getting file URL...', { id: toastId });
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Create document in Firestore
      const jobData = {
        studentId: currentUser.uid,
        studentEmail: currentUser.email,
        fileName: file.name,
        fileUrl: downloadURL,
        preferences: { copies, color, sided },
        status: 'In Progress',
        submittedAt: Timestamp.now(),
      };
      toast.loading('Submitting print job...', { id: toastId });

      const docRef = await addDoc(collection(db, 'print_jobs'), jobData);
      toast.success(`Job submitted! Your slot code is ${docRef.id}`, { id: toastId });

      // Reset form and refresh job list
      setFile(null);
      e.target.reset(); // Resets the file input
      fetchJobs();

    } catch (error) {
      console.error("Error submitting print job: ", error);
      toast.error("An error occurred. Please try again.", { id: toastId });
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
      <h2>Submit a Print Job</h2>
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
                <strong>{job.fileName}</strong>
                <p style={{margin: '4px 0', fontSize: '0.9rem', color: '#aaa'}}>
                  {job.preferences.copies} copies, {job.preferences.color}, {job.preferences.sided}
                </p>
              </div>
              <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(job.status) }}>
                {job.status}
              </span>
            </div>
          ))
        ) : <p>You have not submitted any print jobs yet.</p>}
      </div>
    </div>
  );
}

export default StudentPrintPage;