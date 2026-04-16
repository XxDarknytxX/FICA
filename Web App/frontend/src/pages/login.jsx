import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Calendar, MapPin, Users } from "lucide-react";
import { api } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      // Backend returns { token, role } — stash both so the sidebar and
      // page guards can read `localStorage.getItem("role")` without
      // decoding the JWT on every render.
      const { token, role } = await api("/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      localStorage.setItem("token", token);
      if (role) localStorage.setItem("role", role);
      // Moderators land on their dedicated control dashboard; admins get
      // the full overview dashboard. Both are protected routes so an
      // intruder with just a URL still hits the login screen.
      navigate(role === "moderator" ? "/moderator" : "/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)", overflow: "hidden" }}>
      {/* ─── LEFT PANEL: Brand + decorative SVG ─────────────────────────── */}
      <div
        style={{
          flex: 1,
          position: "relative",
          background: "linear-gradient(135deg, #091f42 0%, #0F2D5E 45%, #1a4080 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          overflow: "hidden",
        }}
      >
        {/* Decorative SVG layer */}
        <svg
          aria-hidden="true"
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, opacity: 0.65, pointerEvents: "none" }}
          viewBox="0 0 800 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#C8A951" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#C8A951" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#C8A951" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="navyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="lineFade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#C8A951" stopOpacity="0" />
              <stop offset="50%" stopColor="#C8A951" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#C8A951" stopOpacity="0" />
            </linearGradient>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Subtle grid */}
          <rect width="800" height="1000" fill="url(#grid)" />

          {/* Glowing orbs */}
          <circle cx="650" cy="180" r="220" fill="url(#goldGlow)" />
          <circle cx="120" cy="780" r="280" fill="url(#navyGlow)" />

          {/* Concentric rings (subtle) */}
          <g stroke="rgba(200,169,81,0.08)" strokeWidth="1" fill="none">
            <circle cx="700" cy="220" r="120" />
            <circle cx="700" cy="220" r="180" />
            <circle cx="700" cy="220" r="240" />
            <circle cx="700" cy="220" r="300" />
          </g>

          {/* Diagonal accent lines */}
          <line x1="0" y1="500" x2="800" y2="380" stroke="url(#lineFade)" strokeWidth="0.8" />
          <line x1="0" y1="600" x2="800" y2="520" stroke="url(#lineFade)" strokeWidth="0.5" />

          {/* Floating dots */}
          <g fill="#C8A951">
            <circle cx="180" cy="200" r="2" opacity="0.7" />
            <circle cx="260" cy="320" r="1.5" opacity="0.5" />
            <circle cx="400" cy="180" r="2" opacity="0.6" />
            <circle cx="540" cy="420" r="1.5" opacity="0.4" />
            <circle cx="680" cy="540" r="2" opacity="0.7" />
            <circle cx="350" cy="640" r="1.5" opacity="0.5" />
          </g>
        </svg>

        {/* Top: Brand */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 8,
                boxShadow: "0 8px 24px -4px rgba(0,0,0,0.25)",
              }}
            >
              <img
                src="/fica-logo.svg"
                alt="FICA Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Fiji Institute of Chartered Accountants</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>Annual Congress 2026</div>
            </div>
          </div>
        </div>

        {/* Middle: Headline + chips */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 540 }}>
          <h1 style={{ color: "white", fontSize: 44, fontWeight: 800, lineHeight: 1.1, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Welcome to the<br />
            <span style={{ background: "linear-gradient(135deg, #C8A951, #e2c87a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Congress Admin
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 1.65, margin: "0 0 36px", maxWidth: 460 }}>
            Manage delegates, sessions, sponsors, and announcements for the Annual Congress at the Crowne Plaza Fiji Nadi Bay Resort &amp; Spa.
          </p>

          {/* Event chips */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { Icon: Calendar, label: "Date", value: "8–9 May 2026" },
              { Icon: MapPin, label: "Venue", value: "Crowne Plaza Fiji" },
              { Icon: Users, label: "Capacity", value: "500 Delegates" },
            ].map(({ Icon, label, value }) => (
              <div
                key={label}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  backdropFilter: "blur(6px)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(200,169,81,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} color="#C8A951" />
                </div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ color: "rgba(200,169,81,0.85)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {label}
                  </div>
                  <div style={{ color: "white", fontSize: 13, fontWeight: 600, marginTop: 2 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Footer caption */}
        <div style={{ position: "relative", zIndex: 1, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          © 2026 Fiji Institute of Chartered Accountants
        </div>
      </div>

      {/* ─── RIGHT PANEL: Login form ────────────────────────────────────── */}
      <div
        style={{
          width: 480,
          background: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "56px 56px",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* Subtle dotted SVG accent at top-right */}
        <svg
          aria-hidden="true"
          width="120"
          height="120"
          style={{ position: "absolute", top: 24, right: 24, opacity: 0.15 }}
          viewBox="0 0 120 120"
        >
          <pattern id="dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#0F2D5E" />
          </pattern>
          <rect width="120" height="120" fill="url(#dots)" />
        </svg>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Centered FICA logo above the sign-in heading.
              SVG has inherent whitespace padding inside the viewBox, so we
              use negative margins to crop the visible gap above + below it. */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: -40,
              marginBottom: -40,
            }}
          >
            <img
              src="/fica-logo.svg"
              alt="FICA Logo"
              style={{
                width: 220,
                height: 220,
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
              Sign in
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
              Use your admin credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={onSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label className="label">Email address</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-subtle)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fica.org.fj"
                  required
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 22 }}>
              <label className="label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-subtle)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type={showPw ? "text" : "password"}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ paddingLeft: 40, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 30,
                    height: 30,
                    background: "transparent",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "var(--text-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-soft)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error banner */}
            {err && (
              <div
                className="animate-in"
                style={{
                  background: "var(--danger-soft)",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 18,
                  fontSize: 13,
                  color: "var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{err}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px 18px",
                fontSize: 14.5,
                fontWeight: 600,
              }}
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in to Dashboard
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 11.5, color: "var(--text-subtle)", textAlign: "center" }}>
            Need access? Contact your event administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
