import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import styles from './SlotStatusDashboard.module.css';

// Slot System Configuration (Must match PrintServicePage)
const MAX_SLOTS = 50;
const SLOTS_PER_GROUP = 10;
const generateSlotId = (index) => {
  const groupIndex = Math.floor(index / SLOTS_PER_GROUP);
  const slotNumber = (index % SLOTS_PER_GROUP) + 1;
  const groupLetter = String.fromCharCode(65 + groupIndex);
  return `${groupLetter}-${String(slotNumber).padStart(2, '0')}`;
};

function SlotStatusDashboard() {
  const [slotMap, setSlotMap] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSlotStatus = async () => {
    setLoading(true);
    try {
      // 1. Fetch all currently active (In Progress or Ready) print jobs
      const q = query(
        collection(db, 'print_jobs'),
        where('status', 'in', ['In Progress', 'Ready'])
      );
      const querySnapshot = await getDocs(q);

      // Create a dictionary of active slots for quick lookup
      const activeSlots = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        activeSlots[data.slotId] = data;
      });

      // 2. Map all 50 possible slots and check their status
      const fullSlotMap = Array.from({ length: MAX_SLOTS }, (_, index) => {
        const slotId = generateSlotId(index);
        const isActive = !!activeSlots[slotId];
        
        return {
          id: slotId,
          isActive: isActive,
          status: isActive ? activeSlots[slotId].status : 'Empty',
          job: isActive ? activeSlots[slotId] : null
        };
      });

      setSlotMap(fullSlotMap);

    } catch (error) {
      console.error('Error fetching slot status: ', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlotStatus();
  }, []);

  // Function to determine the CSS class based on slot status
  const getSlotClass = (status) => {
    switch (status) {
      case 'Empty': return styles.slotEmpty;
      case 'In Progress': return styles.slotInProgress;
      case 'Ready': return styles.slotReady;
      default: return styles.slotEmpty;
    }
  };

  if (loading) return <p>Loading Slot Status...</p>;

  // Function to group slots by letter (A, B, C, D, E)
  const groupedSlots = slotMap.reduce((acc, slot) => {
    const group = slot.id.charAt(0);
    if (!acc[group]) acc[group] = [];
    acc[group].push(slot);
    return acc;
  }, {});


  return (
    <div className={styles.dashboardContainer}>
      <h1>Print Slot Status Dashboard</h1>
      <p>Total Slots: {MAX_SLOTS}. Active: {slotMap.filter(s => s.isActive).length}. Empty: {slotMap.filter(s => !s.isActive).length}.</p>
      
      <button onClick={fetchSlotStatus} className={styles.refreshButton}>Refresh Status</button>

      <div className={styles.statusLegend}>
        <div className={`${styles.slotCard} ${styles.slotEmpty}`}>Empty</div>
        <div className={`${styles.slotCard} ${styles.slotInProgress}`}>In Progress</div>
        <div className={`${styles.slotCard} ${styles.slotReady}`}>Ready for Pickup</div>
      </div>

      <div className={styles.slotGridContainer}>
        {Object.entries(groupedSlots).map(([group, slots]) => (
          <div key={group} className={styles.slotGroup}>
            <h2>Group {group}</h2>
            <div className={styles.slotGroupGrid}>
              {slots.map(slot => (
                <div 
                  key={slot.id} 
                  className={`${styles.slotCard} ${getSlotClass(slot.status)}`}
                  // Show tooltip with job details
                  title={slot.job ? `Job: ${slot.job.fileName} by ${slot.job.submittedByEmail}` : 'Empty'}
                >
                  {slot.id}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SlotStatusDashboard;