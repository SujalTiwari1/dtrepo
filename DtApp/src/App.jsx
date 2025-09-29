import StudentPrintPage from './pages/Student/StudentPrintPage';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";

import Layout from "./components/common/Layout";
import ProtectedRoute from "./components/common/ProtectedRoute";

import StudentDashboard from "./pages/Student/StudentDashboard";
import TeacherDashboard from "./pages/Teacher/TeacherDashboard";
import StaffDashboard from "./pages/Staff/StaffDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";

import PostUpdatePage from "./pages/Teacher/PostUpdatePage";
import StudentSchedulePage from "./pages/Student/StudentSchedulePage";
// New Import
import StaffPrintQueuePage from "./pages/Staff/StaffPrintQueuePage";


function App() {
  return (
    <Router>
      <Routes>
        {/* Routes with Navbar */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/schedule"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route // NEW STUDENT PRINT ROUTE
            path="/student/print"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentPrintPage />
              </ProtectedRoute>
            }
          />

          {/* NOTE: You still need to add the /student/print route here if you haven't already */}

          {/* Teacher Routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/updates"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <PostUpdatePage />
              </ProtectedRoute>
            }
          />

          {/* Staff Routes */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={["staff"]}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route // NEW ROUTE ADDED HERE
            path="/staff/queue"
            element={
              <ProtectedRoute allowedRoles={["staff", "admin"]}> {/* Admin also needs access */}
                <StaffPrintQueuePage />
              </ProtectedRoute>
            }
          />


          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Route without Navbar */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;