import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import styles from './PostUpdatePage.module.css';
import toast, { Toaster } from 'react-hot-toast';

function PostUpdatePage() {
  const { currentUser } = useAuth();

  // Form state
  const [subject, setSubject] = useState('');
  const [updateType, setUpdateType] = useState('Cancelled');
  const [message, setMessage] = useState('');
  const [eventDate, setEventDate] = useState('');

  // Data state
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch updates for the current teacher
  const fetchUpdates = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const updatesCollection = collection(db, 'lecture_updates');
      const q = query(
        updatesCollection, 
        where('teacherId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const updatesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUpdates(updatesData);
    } catch (error) {
      console.error("Error fetching updates: ", error);
      toast.error("Failed to fetch updates.");
    }
    setLoading(false);
  };

  // Fetch updates on component mount
  useEffect(() => {
    fetchUpdates();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message || !eventDate) {
      toast.error("Please fill out all fields.");
      return;
    }

    const newUpdate = {
      teacherId: currentUser.uid,
      subject,
      updateType,
      message,
      eventDate: new Date(eventDate),
      createdAt: Timestamp.now(),
    };

    try {
      const updatesCollection = collection(db, 'lecture_updates');
      await addDoc(updatesCollection, newUpdate);
      toast.success("Update posted successfully!");

      // Reset form
      setSubject('');
      setUpdateType('Cancelled');
      setMessage('');
      setEventDate('');

      // Refresh the list of updates
      fetchUpdates();
    } catch (error) {
      console.error("Error adding document: ", error);
      toast.error("Failed to post update.");
    }
  };

  return (
    <div className={styles.updateContainer}>
      <Toaster position="top-center" />
      <h2>Post a New Lecture Update</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="subject">Subject</label>
          <input 
            id="subject"
            type="text" 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)} 
          />
        </div>
         <div className={styles.formGroup}>
          <label htmlFor="eventDate">Date and Time</label>
          <input 
            id="eventDate"
            type="datetime-local" 
            value={eventDate} 
            onChange={(e) => setEventDate(e.target.value)} 
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="updateType">Update Type</label>
          <select id="updateType" value={updateType} onChange={(e) => setUpdateType(e.target.value)}>
            <option value="Cancelled">Cancelled</option>
            <option value="Venue Change">Venue Change</option>
            <option value="Delayed">Delayed</option>
            <option value="Substitute">Substitute</option>
            <option value="Info">Info</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="message">Message</label>
          <textarea 
            id="message"
            rows="4"
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
        </div>
        <button type="submit" className={styles.submitButton}>Post Update</button>
      </form>

      <hr />

      <div className={styles.updateList}>
        <h2>Your Posted Updates</h2>
        {loading ? <p>Loading...</p> : (
          updates.map(update => (
            <div key={update.id} className={styles.updateCard}>
              <h3>{update.subject} - <span style={{fontSize: '1rem', fontWeight: 'normal'}}>{update.updateType}</span></h3>
              <p>{update.message}</p>
              <small>
                For: {update.eventDate.toDate().toLocaleString()} | Posted on: {update.createdAt.toDate().toLocaleString()}
              </small>
            </div>
          ))
        )}
         {updates.length === 0 && !loading && <p>You haven't posted any updates yet.</p>}
      </div>
    </div>
  );
}

export default PostUpdatePage;