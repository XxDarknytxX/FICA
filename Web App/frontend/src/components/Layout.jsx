import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Mic2, Award, Users, Bell,
  Settings, LogOut, Wifi, Coffee, ChevronRight, UserCog, Trophy
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/speakers", icon: Mic2, label: "Speakers" },
  { to: "/sponsors", icon: Award, label: "Sponsors" },
  { to: "/networking", icon: Coffee, label: "Networking" },
  { to: "/attendees", icon: Users, label: "Attendees" },
  { to: "/users", icon: UserCog, label: "User Management" },
  { to: "/announcements", icon: Bell, label: "Announcements" },
  { to: "/projects", icon: Trophy, label: "Projects & Voting" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout({ children }) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside className="sidebar" style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "linear-gradient(135deg, #C8A951, #e2c87a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: "#091f42", flexShrink: 0
            }}>F</div>
            <div>
              <div style={{ color: "white", fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>FICA Congress</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 500 }}>Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Event Info */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", margin: "0 8px" }}>
          <div style={{ background: "rgba(200,169,81,0.12)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ color: "#C8A951", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Congress 2026</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 }}>8–9 May · Crowne Plaza Fiji</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 8px 8px" }}>
            Management
          </div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={logout}
            className="sidebar-item"
            style={{ width: "100%", border: "none", background: "none" }}
          >
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{
          background: "white",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#a0aec0" }}>FICA Congress 2026</span>
            <ChevronRight size={12} color="#a0aec0" />
            <span style={{ fontSize: 13, color: "#4a5568", fontWeight: 500 }}>
              Navigating Tomorrow: Accountancy in the Age of Change
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Wifi size={14} color="#48bb78" />
              <span style={{ fontSize: 12, color: "#48bb78", fontWeight: 600 }}>Live</span>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #0F2D5E, #1a4080)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer"
            }}>A</div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
