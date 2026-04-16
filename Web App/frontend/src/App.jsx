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
import Moderators from "./pages/Moderators";
import Projects from "./pages/Projects";
import Panels from "./pages/Panels";
import PanelPresenter from "./pages/PanelPresenter";
import ModeratorDashboard from "./pages/ModeratorDashboard";
import ResetPassword from "./pages/ResetPassword";
import { getAuthRole } from "./services/api";

// ─── Route guards ─────────────────────────────────────────────────────
// Three flavours:
//   • Protected — any authenticated role (admin, moderator)
//   • AdminOnly — admins only; moderators bounce to /moderator
//   • ModeratorCapable — admin OR moderator; anyone else → /login

function Protected({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  // Fall through to the admin page if the role claim is missing —
  // prior-version sessions. The backend still enforces role at the
  // endpoint level, so a moderator can't actually do anything here
  // even if their client-side guard is permissive.
  const role = getAuthRole();
  if (role === "moderator") return <Navigate to="/moderator" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin-only pages. Moderators hitting these redirect to their dashboard. */}
        <Route path="/dashboard" element={<AdminOnly><Dashboard /></AdminOnly>} />
        <Route path="/speakers" element={<AdminOnly><Speakers /></AdminOnly>} />
        <Route path="/agenda" element={<AdminOnly><Agenda /></AdminOnly>} />
        <Route path="/sponsors" element={<AdminOnly><Sponsors /></AdminOnly>} />
        <Route path="/networking" element={<AdminOnly><Networking /></AdminOnly>} />
        <Route path="/attendees" element={<AdminOnly><Attendees /></AdminOnly>} />
        <Route path="/settings" element={<AdminOnly><Settings /></AdminOnly>} />
        <Route path="/users" element={<AdminOnly><UserManagement /></AdminOnly>} />
        <Route path="/moderators" element={<AdminOnly><Moderators /></AdminOnly>} />

        {/* Moderator-accessible pages (admins also land here via their
            sidebar). Backend enforces role on the endpoints they call. */}
        <Route path="/moderator" element={<Protected><ModeratorDashboard /></Protected>} />
        <Route path="/announcements" element={<Protected><Announcements /></Protected>} />
        <Route path="/projects" element={<Protected><Projects /></Protected>} />
        <Route path="/panels" element={<Protected><Panels /></Protected>} />
        <Route path="/panels/:id/present" element={<Protected><PanelPresenter /></Protected>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
