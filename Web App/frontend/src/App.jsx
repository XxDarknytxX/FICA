import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Speakers from "./pages/Speakers";
import Agenda from "./pages/Agenda";
import Sponsors from "./pages/Sponsors";
import Networking from "./pages/Networking";
import Attendees from "./pages/Attendees";
import Announcements from "./pages/Announcements";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import Projects from "./pages/Projects";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/speakers" element={<Protected><Speakers /></Protected>} />
        <Route path="/agenda" element={<Protected><Agenda /></Protected>} />
        <Route path="/sponsors" element={<Protected><Sponsors /></Protected>} />
        <Route path="/networking" element={<Protected><Networking /></Protected>} />
        <Route path="/attendees" element={<Protected><Attendees /></Protected>} />
        <Route path="/announcements" element={<Protected><Announcements /></Protected>} />
        <Route path="/projects" element={<Protected><Projects /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/users" element={<Protected><UserManagement /></Protected>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
