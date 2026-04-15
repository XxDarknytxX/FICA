import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic2, Calendar, Award, Users, Bell, Coffee, UserCheck, ChevronRight, Trophy } from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import { StatCard, LoadingState } from "../components/ui";

const SESSION_TYPE_COLORS = {
  keynote: "#92620c", panel: "#234e52", workshop: "#2c5282",
  break: "#718096", lunch: "#276749", ceremony: "#0F2D5E",
  registration: "#c53030", awards: "#92620c", networking: "#6b21a8",
};

function SessionRow({ session }) {
  const color = SESSION_TYPE_COLORS[session.type] || "#718096";
  return (
    <div style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: "1px solid #f0f4f8", alignItems: "flex-start" }}>
      <div style={{ minWidth: 76, fontSize: 11, color: "#a0aec0", fontWeight: 600, paddingTop: 2, textAlign: "right" }}>
        {session.start_time}
      </div>
      <div style={{ width: 3, borderRadius: 2, alignSelf: "stretch", background: color, minHeight: 36, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a202c" }}>{session.title}</div>
        {session.speaker_name && <div style={{ fontSize: 11, color: "#718096", marginTop: 1 }}>{session.speaker_name}</div>}
        <span style={{
          fontSize: 10, color: color, fontWeight: 700, background: `${color}15`,
          padding: "1px 7px", borderRadius: 20, display: "inline-block", marginTop: 3,
          textTransform: "capitalize"
        }}>{session.type}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [statsData, sessData, annData] = await Promise.all([
          api("/event/stats"),
          api("/event/sessions"),
          api("/event/announcements"),
        ]);
        setStats(statsData);
        setSessions(sessData.sessions || []);
        setAnnouncements((annData.announcements || []).slice(0, 5));
      } catch (e) {
        if (e.message?.includes("401") || e.message?.includes("Unauthorized")) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  const day1 = sessions.filter(s => String(s.session_date).startsWith("2026-05-08")).slice(0, 7);
  const day2 = sessions.filter(s => String(s.session_date).startsWith("2026-05-09")).slice(0, 7);

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        {/* Hero banner */}
        <div style={{
          background: "linear-gradient(135deg, #091f42 0%, #0F2D5E 60%, #1a4080 100%)",
          borderRadius: 16, padding: "28px 32px", marginBottom: 24, position: "relative", overflow: "hidden"
        }}>
          <div style={{ position: "absolute", right: -30, top: -30, width: 220, height: 220, borderRadius: "50%", background: "rgba(200,169,81,0.07)" }} />
          <div style={{ position: "absolute", right: 60, bottom: -50, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ color: "#C8A951", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              FICA Congress · Admin Dashboard
            </div>
            <h1 style={{ color: "white", fontSize: 26, fontWeight: 800, margin: "0 0 6px", lineHeight: 1.2 }}>
              Shaping Fiji
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, margin: "0 0 18px" }}>
              Shaping Fiji for Tomorrow's Challenges and Opportunities · 8–9 May 2026 · Crowne Plaza Fiji Nadi Bay Resort & Spa
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["8–9 May 2026", "Nadi Bay", "Baravi Ballroom", "500 Capacity"].map(t => (
                <span key={t} style={{
                  background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.13)",
                  color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "3px 11px", borderRadius: 20, fontWeight: 500
                }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <LoadingState label="Loading dashboard…" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12, marginBottom: 24 }}>
            <StatCard icon={Mic2} label="Speakers" value={stats?.speakers} color="#0F2D5E" />
            <StatCard icon={Calendar} label="Sessions" value={stats?.sessions} sub="Across 2 days" color="#2c5282" />
            <StatCard icon={Award} label="Sponsors" value={stats?.sponsors} sub="Platinum to Media" color="#92620c" />
            <StatCard icon={Users} label="Attendees" value={stats?.attendees} color="#276749" />
            <StatCard icon={UserCheck} label="Checked In" value={stats?.checkedIn} sub={`of ${stats?.attendees ?? 0}`} color="#553c9a" />
            <StatCard icon={Coffee} label="Networking" value={stats?.networking} sub="Events" color="#6b21a8" />
            <StatCard icon={Bell} label="Published" value={stats?.announcements} sub="Announcements" color="#c53030" />
            <StatCard icon={Trophy} label="Projects" value={stats?.projects} sub={`${stats?.totalVotes ?? 0} votes cast`} color="#7c3aed" />
          </div>
        )}

        {/* Schedule + Announcements */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: 18 }}>
          {/* Day 1 */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a202c" }}>Day 1</div>
                <div style={{ fontSize: 11, color: "#a0aec0" }}>Friday, 8 May 2026</div>
              </div>
              <button onClick={() => navigate("/agenda")} className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>
                Full agenda <ChevronRight size={12} />
              </button>
            </div>
            <div style={{ padding: "0 18px 14px" }}>
              {day1.map(s => <SessionRow key={s.id} session={s} />)}
            </div>
          </div>

          {/* Day 2 */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a202c" }}>Day 2</div>
                <div style={{ fontSize: 11, color: "#a0aec0" }}>Saturday, 9 May 2026</div>
              </div>
              <button onClick={() => navigate("/agenda")} className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>
                Full agenda <ChevronRight size={12} />
              </button>
            </div>
            <div style={{ padding: "0 18px 14px" }}>
              {day2.map(s => <SessionRow key={s.id} session={s} />)}
            </div>
          </div>

          {/* Announcements */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a202c" }}>Announcements</div>
              <button onClick={() => navigate("/announcements")} className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>
                Manage <ChevronRight size={12} />
              </button>
            </div>
            <div>
              {announcements.map(ann => (
                <div key={ann.id} style={{ padding: "11px 18px", borderBottom: "1px solid #f0f4f8", display: "flex", gap: 10 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                    background: ann.published ? "#48bb78" : "#e2e8f0"
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a202c" }}>{ann.title}</div>
                    <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 2 }}>
                      {ann.published ? "Published" : "Draft"} · {ann.target}
                    </div>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <div style={{ padding: "20px 18px", color: "#a0aec0", fontSize: 13 }}>No announcements yet</div>
              )}
            </div>

            {/* Quick actions */}
            <div style={{ padding: "14px 18px", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Quick Actions</div>
              {[
                { label: "Add Speaker", path: "/speakers" },
                { label: "Add Session", path: "/agenda" },
                { label: "Register Attendee", path: "/attendees" },
              ].map(a => (
                <button
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  style={{
                    display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between",
                    background: "none", border: "none", cursor: "pointer", padding: "6px 0",
                    fontSize: 13, color: "#0F2D5E", fontWeight: 500, borderBottom: "1px solid #f0f4f8"
                  }}
                >
                  {a.label} <ChevronRight size={13} color="#a0aec0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
