import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { decodeRollNumber } from '../../utils/profileUtils';
import toast, { Toaster } from 'react-hot-toast';
import styles from './StudentSchedulePage.module.css';
import { Link } from 'react-router-dom';

const getColorForUpdate = (updateType) => {
  switch (updateType) {
    case 'Cancelled':
      return '#dc3545'; // Red
    case 'Venue Change':
      return '#ffc107'; // Yellow
    case 'Delayed':
      return '#fd7e14'; // Orange
    case 'Substitute':
      return '#17a2b8'; // Teal
    default:
      return '#007bff'; // Blue (Default event color)
  }
};

function StudentSchedulePage() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAndProcessSchedules = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) throw new Error("Could not find user profile.");
      
      const studentDetails = decodeRollNumber(userDoc.data().rollNumber, userDoc.data().email);
      
      // --- DEBUG LOG 1 ---
      console.log('Querying for student with these details:', {
          year: studentDetails.currentAcademicYear.toString(),
          branch: studentDetails.branchShortName,
          division: studentDetails.division
      });

      if (studentDetails.error) throw new Error(studentDetails.error);

      const schedulesQuery = query(
        collection(db, 'schedules'),
        where('classInfo.year', '==', studentDetails.currentAcademicYear.toString()),
        where('classInfo.branch', '==', studentDetails.branchShortName),
        where('classInfo.division', '==', studentDetails.division)
      );
      const updatesQuery = query(
        collection(db, 'lecture_updates'),
        where('classInfo.year', '==', studentDetails.currentAcademicYear.toString()),
        where('classInfo.branch', '==', studentDetails.branchShortName),
        where('classInfo.division', '==', studentDetails.division)
      );

      const [schedulesSnapshot, updatesSnapshot] = await Promise.all([
        getDocs(schedulesQuery),
        getDocs(updatesQuery),
      ]);
      
      const scheduleRules = schedulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const singleUpdates = updatesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // --- DEBUG LOG 2 ---
      console.log('Found matching schedule rules from DB:', scheduleRules);

      const finalEvents = generateAndMergeSchedules(scheduleRules, singleUpdates);
      setEvents(finalEvents);

    } catch (error) {
      console.error("Error fetching schedule: ", error);
      toast.error(error.message || "Could not fetch schedule.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAndProcessSchedules();
  }, [fetchAndProcessSchedules]);
  
  // Fully implemented handleEventClick function
  const handleEventClick = (clickInfo) => {
    const { title, extendedProps } = clickInfo.event;
    const message = `
      <div style="text-align: left;">
        <strong>Type:</strong> ${extendedProps.type}<br/>
        <strong>Message:</strong> ${extendedProps.message}
      </div>
    `;

    toast.custom((t) => (
      <div
        style={{
          background: '#333', color: '#fff', padding: '16px',
          borderRadius: '8px', border: '1px solid #555',
          opacity: t.visible ? 1 : 0, transition: 'opacity 300ms',
        }}
      >
        <h3 style={{ marginTop: 0, borderBottom: '1px solid #555', paddingBottom: '8px' }}>{title}</h3>
        <div dangerouslySetInnerHTML={{ __html: message }} />
      </div>
    ));
  };

  const generateAndMergeSchedules = (rules, updates) => {
    // ... (rest of the function is the same)
    const generatedEvents = [];
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 60);

    const updatesMap = new Map();
    updates.forEach(upd => {
        const eventDateStr = upd.eventDate.toDate().toISOString().split('T')[0];
        const key = `${eventDateStr}_${upd.classInfo.subject}`;
        updatesMap.set(key, upd);
    });

    for (let day = new Date(today); day <= endDate; day.setDate(day.getDate() + 1)) {
        const dayOfWeek = day.getDay();
        rules.forEach(rule => {
            if (rule.dayOfWeek === dayOfWeek) {
                const [startHour, startMinute] = rule.startTime.split(':');
                const [endHour, endMinute] = rule.endTime.split(':');
                
                const startDate = new Date(day);
                startDate.setHours(startHour, startMinute, 0, 0);

                const endDate = new Date(day);
                endDate.setHours(endHour, endMinute, 0, 0);

                const eventDateStr = day.toISOString().split('T')[0];
                const key = `${eventDateStr}_${rule.classInfo.subject}`;
                
                const overrideUpdate = updatesMap.get(key);

                if (overrideUpdate) {
                    generatedEvents.push({
                        id: `update-${overrideUpdate.id}`,
                        title: `${rule.classInfo.subject} - ${overrideUpdate.updateType.toUpperCase()}`,
                        start: overrideUpdate.eventDate.toDate(),
                        end: endDate,
                        backgroundColor: getColorForUpdate(overrideUpdate.updateType),
                        borderColor: getColorForUpdate(overrideUpdate.updateType),
                        extendedProps: {
                            type: overrideUpdate.updateType,
                            message: overrideUpdate.message,
                            venue: overrideUpdate.updateType === 'Venue Change' ? overrideUpdate.message : rule.venue,
                        }
                    });
                    updatesMap.delete(key);
                } else {
                    generatedEvents.push({
                        id: `schedule-${rule.id}-${eventDateStr}`,
                        title: `${rule.classInfo.subject} (${rule.venue})`,
                        start: startDate,
                        end: endDate,
                        backgroundColor: '#3788d8',
                        borderColor: '#3788d8',
                        extendedProps: { type: 'Scheduled', message: `Regularly scheduled class in ${rule.venue}`, venue: rule.venue }
                    });
                }
            }
        });
    }

    updatesMap.forEach(upd => {
        generatedEvents.push({
            id: `update-${upd.id}`,
            title: `${upd.classInfo.subject} - ${upd.updateType.toUpperCase()}`,
            start: upd.eventDate.toDate(),
            backgroundColor: getColorForUpdate(upd.updateType),
            borderColor: getColorForUpdate(upd.updateType),
            extendedProps: {
                type: upd.updateType,
                message: upd.message,
            }
        });
    });

    return generatedEvents;
  };
  
  if (loading) {
    return <p>Loading Your Personalized Schedule...</p>;
  }

  return (
    <div className={styles.scheduleContainer}>
      <div>
       <Link to="/student/print" style={{ color: '#90EE90', fontSize: '1.2rem' }}>
        Go to Printing Service
      </Link>
    </div>
      <Toaster position="bottom-center" />
      <h1>Your Schedule & Updates</h1>
      <FullCalendar
        plugins={[listPlugin, interactionPlugin]}
        initialView="listWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'listDay,listWeek,listMonth'
        }}
        buttonText={{ listDay: 'Day', listWeek: 'Week', listMonth: 'Month' }}
        events={events}
        eventClick={handleEventClick}
        noEventsText="No lectures or updates scheduled for your class."
        height="auto"
      />

    </div>
    
  );
}

export default StudentSchedulePage;