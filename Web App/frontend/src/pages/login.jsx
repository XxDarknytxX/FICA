import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { token } = await api("/login", { method: "POST", body: { email, password }, auth: false });
      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #091f42 0%, #0F2D5E 50%, #1a4080 100%)"
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px 64px",
        maxWidth: 560
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "10px 16px"
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: "linear-gradient(135deg, #C8A951, #e2c87a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 800, color: "#091f42"
            }}>F</div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                Fiji Institute of Chartered Accountants
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Congress 2026</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ color: "white", fontSize: 36, fontWeight: 800, lineHeight: 1.2, margin: "0 0 12px" }}>
            Welcome to the<br />
            <span style={{ color: "#C8A951" }}>Congress Admin</span> Panel
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Manage speakers, agenda, sponsors, attendees, and<br />
            send announcements to mobile app delegates.
          </p>
        </div>

        {/* Event details */}
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Date", value: "8–9 May 2026" },
            { label: "Venue", value: "Crowne Plaza Fiji, Nadi" },
            { label: "Capacity", value: "500 Delegates" },
          ].map(item => (
            <div key={item.label} style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "12px 16px",
              flex: 1
            }}>
              <div style={{ color: "#C8A951", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – login form */}
      <div style={{
        width: 460,
        background: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px 48px"
      }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a202c", margin: "0 0 6px" }}>Sign in</h2>
          <p style={{ fontSize: 14, color: "#718096", margin: 0 }}>Access the FICA Congress admin dashboard</p>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Email address</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@fica.org.fj"
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {err && (
            <div style={{
              background: "#fff5f5",
              border: "1px solid #fed7d7",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#c53030"
            }}>
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "11px 16px", fontSize: 15 }}
          >
            {loading ? "Signing in..." : "Sign in to Dashboard"}
          </button>
        </form>

        <div style={{ marginTop: 32, padding: "16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, color: "#718096", fontWeight: 600, marginBottom: 6 }}>Demo credentials</div>
          <div style={{ fontSize: 13, color: "#4a5568" }}>
            <div>admin@fica.org.fj</div>
            <div style={{ color: "#a0aec0" }}>abcd1234</div>
          </div>
        </div>

        <div style={{ marginTop: 40, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: 12, color: "#a0aec0", textAlign: "center", margin: 0 }}>
            © 2026 Fiji Institute of Chartered Accountants. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
