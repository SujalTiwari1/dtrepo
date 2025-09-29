import React, { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import styles from "./PostUpdatePage.module.css";
import toast, { Toaster } from "react-hot-toast";

function PostUpdatePage() {
  const { currentUser } = useAuth();

  // State for the teacher's profile data
  const [teachingAssignments, setTeachingAssignments] = useState([]);

  // Form state
  const [selectedAssignmentIndex, setSelectedAssignmentIndex] = useState("");
  const [updateType, setUpdateType] = useState("Cancelled");
  const [message, setMessage] = useState("");
  const [eventDate, setEventDate] = useState("");

  // Data state
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch teacher's assignments and their past updates
  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Teacher's Profile to get their assignments
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().teachingAssignments) {
          setTeachingAssignments(userDoc.data().teachingAssignments);
        }

        // 2. Fetch past updates posted by this teacher
        const updatesCollection = collection(db, "lecture_updates");
        const q = query(
          updatesCollection,
          where("teacherId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const updatesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUpdates(updatesData);
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast.error("Failed to fetch your data.");
      }
      setLoading(false);
    };

    fetchData();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedAssignmentIndex === "" || !message || !eventDate) {
      toast.error("Please select a class and fill out all fields.");
      return;
    }

    // Get all the details from the selected assignment object
    const selectedAssignment = teachingAssignments[selectedAssignmentIndex];

    const newUpdate = {
      teacherId: currentUser.uid,
      // Store structured data about the class for future filtering
      classInfo: {
        year: selectedAssignment.year,
        branch: selectedAssignment.branch,
        division: selectedAssignment.division,
        subject: selectedAssignment.subject,
        batches: selectedAssignment.batches,
      },
      updateType,
      message,
      eventDate: new Date(eventDate),
      createdAt: Timestamp.now(),
    };

    try {
      const updatesCollection = collection(db, "lecture_updates");
      await addDoc(updatesCollection, newUpdate);
      toast.success("Update posted successfully!");

      // Reset form
      setSelectedAssignmentIndex("");
      setUpdateType("Cancelled");
      setMessage("");
      setEventDate("");

      // Refresh the list of updates by re-fetching
      // For simplicity, we can just prepend the new update to the list
      setUpdates([{ id: new Date().getTime(), ...newUpdate }, ...updates]);
    } catch (error) {
      console.error("Error adding document: ", error);
      toast.error("Failed to post update.");
    }
  };

  const selectedSubject =
    selectedAssignmentIndex !== ""
      ? teachingAssignments[selectedAssignmentIndex].subject
      : "N/A";

  return (
    <div className={styles.updateContainer}>
      <Toaster position="top-center" />
      <h2>Post a New Lecture Update</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="class-select">Select Class</label>
          <select
            id="class-select"
            value={selectedAssignmentIndex}
            onChange={(e) => setSelectedAssignmentIndex(e.target.value)}
          >
            <option value="" disabled>
              -- Select the class you are updating --
            </option>
            {teachingAssignments.map((a, index) => (
              <option key={index} value={index}>
                {a.year} Year {a.branch} (Div {a.division}) - Batches:{" "}
                {a.batches.join(", ")}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Subject</label>
          {/* Subject is now automatically determined by the class selection */}
          <input type="text" value={selectedSubject} readOnly disabled />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="eventDate">Date and Time of Lecture</label>
          <input
            id="eventDate"
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="updateType">Update Type</label>
          <select
            id="updateType"
            value={updateType}
            onChange={(e) => setUpdateType(e.target.value)}
          >
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
        <button type="submit" className={styles.submitButton}>
          Post Update
        </button>
      </form>

      <hr />

      <div className={styles.updateList}>
        <h2>Your Posted Updates</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          updates.map((update) => {
            // First, figure out where the subject is stored
            const subject = update.classInfo
              ? update.classInfo.subject
              : update.subject;

            return (
              <div key={update.id} className={styles.updateCard}>
                <h3>
                  {subject} -{" "}
                  <span style={{ fontSize: "1rem", fontWeight: "normal" }}>
                    {update.updateType}
                  </span>
                </h3>
                <p>{update.message}</p>
                <small>
                  For: {update.eventDate.toDate().toLocaleString()} | Posted on:{" "}
                  {update.createdAt.toDate().toLocaleString()}
                </small>
              </div>
            );
          })
        )}
        {updates.length === 0 && !loading && (
          <p>You haven't posted any updates yet.</p>
        )}
      </div>
    </div>
  );
}

export default PostUpdatePage;
