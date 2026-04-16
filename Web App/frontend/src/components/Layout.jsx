import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Mic2, Award, Users, Bell,
  Settings, LogOut, Coffee, ChevronsLeft, ChevronsRight,
  UserCog, Trophy, Bell as BellIcon, Search, MessageSquare,
} from "lucide-react";

// ─── Sidebar nav structure ───────────────────────────────────────────────
const navSections = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Event",
    items: [
      { to: "/agenda", icon: Calendar, label: "Agenda" },
      { to: "/speakers", icon: Mic2, label: "Speakers" },
      { to: "/sponsors", icon: Award, label: "Sponsors" },
      { to: "/networking", icon: Coffee, label: "Networking" },
      { to: "/announcements", icon: Bell, label: "Announcements" },
      { to: "/panels", icon: MessageSquare, label: "Panel Discussions" },
    ],
  },
  {
    label: "Delegates",
    items: [
      { to: "/attendees", icon: Users, label: "Attendees" },
      { to: "/projects", icon: Trophy, label: "Projects & Voting" },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/users", icon: UserCog, label: "User Management" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

// Flat lookup for breadcrumb
const allItems = navSections.flatMap((s) => s.items);

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile menu on outside click
  useEffect(() => {
    function onClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  const currentItem = allItems.find((i) => location.pathname.startsWith(i.to));
  const sidebarWidth = collapsed ? 64 : 232;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      {/* ─── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.18s ease",
        }}
      >
        {/* Logo / brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? "18px 12px" : "18px 18px 16px",
            borderBottom: "1px solid var(--border-soft)",
            minHeight: 64,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "white",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
                flexShrink: 0,
              }}
            >
              <img
                src="/fica-logo.svg"
                alt="FICA"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            {!collapsed && (
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ color: "var(--text)", fontSize: 14, fontWeight: 700 }}>FICA Congress</div>
                <div style={{ color: "var(--text-subtle)", fontSize: 11, fontWeight: 500, marginTop: 2 }}>
                  Admin Panel
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              className="btn-icon"
              onClick={() => setCollapsed(true)}
              style={{ width: 30, height: 30 }}
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft size={16} />
            </button>
          )}
        </div>

        {/* Collapsed expand button (appears below logo when collapsed) */}
        {collapsed && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
            <button
              className="btn-icon"
              onClick={() => setCollapsed(false)}
              style={{ width: 32, height: 32 }}
              aria-label="Expand sidebar"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation sections */}
        <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "8px 6px 8px" : "6px 10px 8px" }}>
          {navSections.map((section) => (
            <div key={section.label} style={{ marginBottom: 6 }}>
              {!collapsed && <div className="sidebar-section-label">{section.label}</div>}
              {collapsed && <div style={{ height: 8 }} />}
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `sidebar-item${isActive ? " active" : ""}${collapsed ? " collapsed" : ""}`
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom: event chip + sign out */}
        <div style={{ padding: collapsed ? "10px 8px" : "12px 12px", borderTop: "1px solid var(--border-soft)" }}>
          {!collapsed && (
            <div
              style={{
                background: "linear-gradient(135deg, var(--navy-dark), var(--navy))",
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 10,
              }}
            >
              <div style={{ color: "var(--gold)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Congress 2026
              </div>
              <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 11, marginTop: 3, fontWeight: 500 }}>
                8–9 May · Crowne Plaza Fiji
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={`sidebar-item${collapsed ? " collapsed" : ""}`}
            style={{ width: "100%", border: "none", background: "none", color: "var(--danger)" }}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={17} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main column ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Sticky top header */}
        <header
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          {/* Left: page title (acts as breadcrumb) */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {currentItem?.icon && (
              <currentItem.icon size={16} color="var(--text-subtle)" />
            )}
            <div className="crumb-current">
              {currentItem?.label ?? "FICA Admin"}
            </div>
          </div>

          {/* Right: search, notif, profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="btn-icon" aria-label="Search">
              <Search size={17} />
            </button>
            <button className="btn-icon" aria-label="Notifications" style={{ position: "relative" }}>
              <BellIcon size={17} />
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 9,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--gold)",
                  border: "1.5px solid var(--surface)",
                }}
              />
            </button>
            <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 6px" }} />

            {/* Profile button + dropdown */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => setProfileOpen((v) => !v)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--navy-dark), var(--navy-light))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--gold)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                A
              </button>

              {profileOpen && (
                <div
                  className="animate-scale-in"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 240,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    boxShadow: "var(--shadow-lg)",
                    overflow: "hidden",
                    zIndex: 1100,
                  }}
                >
                  <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border-soft)" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>Admin User</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>admin@fica.org.fj</div>
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: 8,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "rgba(15,45,94,0.08)",
                        color: "var(--navy)",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Administrator
                    </div>
                  </div>
                  <div style={{ padding: 6 }}>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/settings");
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "9px 12px",
                        background: "transparent",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                        color: "var(--text)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-soft)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Settings size={15} color="var(--text-muted)" />
                      Event Settings
                    </button>
                    <button
                      onClick={logout}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "9px 12px",
                        background: "transparent",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                        color: "var(--danger)",
                        fontWeight: 600,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--danger-soft)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
          <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
