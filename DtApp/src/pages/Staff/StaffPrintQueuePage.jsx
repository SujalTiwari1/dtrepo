import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase/config'; // Import storage
import { collection, query, where, getDocs, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore'; // Import deleteDoc
import { ref, deleteObject } from 'firebase/storage'; // Import deleteObject
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import styles from './StaffPrintQueuePage.module.css';
import toast, { Toaster } from 'react-hot-toast';

function StaffPrintQueuePage() {
  const { currentUser } = useAuth(); // Use AuthContext to check role
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch jobs that are 'In Progress' or 'Ready'
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'print_jobs'),
        orderBy('submittedAt', 'asc')
      );
      const querySnapshot = await getDocs(q);

      let allJobs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Client-side filter to only show active jobs for staff view (and admin)
      // This includes the new slot and stapling data fields
      const activeJobs = allJobs.filter(job => job.status === 'In Progress' || job.status === 'Ready');

      setJobs(activeJobs);
      toast.success(`Fetched ${activeJobs.length} active print jobs.`, { duration: 1500 });

    } catch (error) {
      console.error('Error fetching print jobs: ', error);
      toast.error('Failed to fetch print queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [currentUser]);

  const updateJobStatus = async (jobId, newStatus) => {
    const jobRef = doc(db, 'print_jobs', jobId);
    const action = newStatus === 'Ready' ? 'marking as ready' : 'marking as collected';
    const successMsg = newStatus === 'Ready'
      ? `Job ${jobId} marked as READY for pickup!`
      : `Job ${jobId} marked as COLLECTED and slot emptied.`;

    try {
      await updateDoc(jobRef, { status: newStatus });
      toast.success(successMsg);
      // Refresh the list after update
      fetchJobs();
    } catch (error) {
      console.error(`Error ${action}: `, error);
      toast.error(`Failed to update job status: ${jobId}`);
    }
  };

  const deleteJob = async (job) => {
    if (!window.confirm(`Are you sure you want to permanently delete job ${job.slotId} (${job.id})? This action cannot be undone and slot will be cleared.`)) {
      return;
    }

    const toastId = toast.loading(`Deleting job ${job.slotId}...`);

    try {
      // 1. Delete file from Firebase Storage
      // Uses the fileUrl saved in the job document
      const storagePath = job.fileUrl.split('/o/')[1].split('?alt=media')[0];
      const decodedPath = decodeURIComponent(storagePath);

      const fileRef = ref(storage, decodedPath);
      await deleteObject(fileRef);

      // 2. Delete document from Firestore
      await deleteDoc(doc(db, 'print_jobs', job.id));

      toast.success(`Job ${job.slotId} and file deleted successfully!`, { id: toastId });
      fetchJobs();

    } catch (error) {
      console.error('Error deleting print job: ', error);
      toast.error(`Failed to delete job ${job.slotId}. Check console for details.`, { id: toastId });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress': return '#ffc107'; // Yellow
      case 'Ready': return '#28a745'; // Green
      case 'Collected': return '#6c757d'; // Gray
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <p>Loading Print Queue...</p>;
  }

  return (
    <div className={styles.queueContainer}>
      <Toaster position="top-center" />
      <h1>Staff Print Queue</h1>
      <p>Slot Code is the unique ID for job collection.</p>

      {jobs.length === 0 && <p className={styles.noJobs}>The print queue is empty! Great job!</p>}

      <div className={styles.jobList}>
        {jobs.map((job) => (
          <div key={job.id} className={styles.jobCard}>
            <div className={styles.jobDetails}>
              <h3>Slot ID: <span className={styles.jobId}>{job.slotId}</span></h3>
              <p><strong>Submitted By:</strong> {job.submittedByEmail} ({job.submittedByRole})</p>
              <p><strong>File:</strong> <a href={job.fileUrl} target="_blank" rel="noopener noreferrer">{job.fileName}</a></p>
              <p>
                <strong>Preferences:</strong>
                {job.preferences.copies} copies, {job.preferences.color}, {job.preferences.sided}
                {job.preferences.isStapled ? ', Stapled' : ', Not Stapled'} 
              </p>
              <small>Submitted At: {job.submittedAt.toDate().toLocaleString()}</small>
            </div>

            <div className={styles.jobActions}>
              <span
                className={styles.statusBadge}
                style={{ backgroundColor: getStatusColor(job.status) }}
              >
                {job.status}
              </span>

              {/* Action: Mark as Ready (Only if in progress) */}
              {job.status === 'In Progress' && (
                <button
                  className={styles.readyButton}
                  onClick={() => updateJobStatus(job.id, 'Ready')}
                >
                  Mark Printed (Ready)
                </button>
              )}

              {/* Action: Mark as Collected (Empty Slot) (Only if Ready) */}
              {job.status === 'Ready' && ( 
                 <button
                  className={styles.collectedButton}
                  onClick={() => updateJobStatus(job.id, 'Collected')}
                >
                  Mark Collected (Empty Slot)
                </button>
              )}
              
              {/* Delete Job Button (Visible to Staff and Admin) */}
              {currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin') && (
                <button
                  className={styles.deleteButton}
                  onClick={() => deleteJob(job)}
                >
                  Delete Job
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button onClick={fetchJobs} className={styles.refreshButton}>Refresh Queue</button>
    </div>
  );
}

export default StaffPrintQueuePage;