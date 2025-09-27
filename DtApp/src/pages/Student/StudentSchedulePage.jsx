import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import listPlugin from "@fullcalendar/list"; // Import the list plugin
import interactionPlugin from "@fullcalendar/interaction"; // For q
// event clicking
import { db } from "../../firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import styles from "./StudentSchedulePage.module.css";

function StudentSchedulePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const updatesCollection = collection(db, "lecture_updates");
        const q = query(updatesCollection, orderBy("eventDate", "asc"));
        const querySnapshot = await getDocs(q);

        const formattedEvents = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.subject,
            start: data.eventDate.toDate(),
            extendedProps: {
              type: data.updateType,
              message: data.message,
            },
          };
        });

        setEvents(formattedEvents);
      } catch (error) {
        console.error("Error fetching events: ", error);
        toast.error("Could not fetch schedule updates.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

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
          background: "#333",
          color: "#fff",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #555",
          opacity: t.visible ? 1 : 0,
          transition: "opacity 300ms",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            borderBottom: "1px solid #555",
            paddingBottom: "8px",
          }}
        >
          {title}
        </h3>
        <div dangerouslySetInnerHTML={{ __html: message }} />
      </div>
    ));
  };

  if (loading) {
    return <p>Loading Schedule...</p>;
  }

  return (
    <div className={styles.scheduleContainer}>
      <Toaster position="bottom-center" />
      <h1>Schedule & Updates</h1>
      <FullCalendar
        plugins={[listPlugin, interactionPlugin]} // Use listPlugin
        initialView="listWeek" // Set the initial view to a list
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "listDay,listWeek,listMonth", // Add list view options
        }}
        buttonText={{
          listDay: "Day",
          listWeek: "Week",
          listMonth: "Month",
        }}
        events={events}
        eventClick={handleEventClick}
        noEventsText="No lectures scheduled for this period." // Message for no events
        height="auto"
      />
    </div>
  );
}

export default StudentSchedulePage;
