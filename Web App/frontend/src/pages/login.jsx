import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Calendar, MapPin, Users } from "lucide-react";
import { api } from "../services/api";

/**
 * Admin / moderator sign-in page.
 *
 * Layout:
 *   • ≥ lg (1024+)  — two columns: decorative navy panel on the left,
 *                     white form on the right (fixed 480px).
 *   • < lg          — single column. Slim compact brand bar at the top
 *                     (logo + "FICA Congress 2026"), form fills the rest
 *                     of the viewport. Decorative SVG is dropped entirely;
 *                     the event chips move under the headline as a
 *                     secondary row above the form.
 */
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
      const { token, role } = await api("/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      localStorage.setItem("token", token);
      if (role) localStorage.setItem("role", role);
      navigate(role === "moderator" ? "/moderator" : "/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-[var(--bg)]">
      {/* ─── Mobile brand bar (visible < lg) ────────────────────────── */}
      <div className="lg:hidden bg-gradient-to-br from-[#091f42] via-[#0F2D5E] to-[#1a4080] text-white px-5 py-5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-[10px] bg-white flex items-center justify-center p-1.5 shrink-0">
          <img src="/fica-logo.svg" alt="FICA" className="w-full h-full object-contain" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-white font-bold text-[13.5px] truncate">Fiji Institute of Chartered Accountants</div>
          <div className="text-white/60 text-[11px] mt-0.5">Annual Congress 2026</div>
        </div>
      </div>

      {/* ─── Desktop decorative panel (visible ≥ lg) ────────────────── */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-[#091f42] via-[#0F2D5E] to-[#1a4080] flex-col justify-between p-14 overflow-hidden">
        {/* Decorative SVG layer */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full opacity-65 pointer-events-none"
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
          <rect width="800" height="1000" fill="url(#grid)" />
          <circle cx="650" cy="180" r="220" fill="url(#goldGlow)" />
          <circle cx="120" cy="780" r="280" fill="url(#navyGlow)" />
          <g stroke="rgba(200,169,81,0.08)" strokeWidth="1" fill="none">
            <circle cx="700" cy="220" r="120" />
            <circle cx="700" cy="220" r="180" />
            <circle cx="700" cy="220" r="240" />
            <circle cx="700" cy="220" r="300" />
          </g>
          <line x1="0" y1="500" x2="800" y2="380" stroke="url(#lineFade)" strokeWidth="0.8" />
          <line x1="0" y1="600" x2="800" y2="520" stroke="url(#lineFade)" strokeWidth="0.5" />
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
        <div className="relative z-10">
          <div className="inline-flex items-center gap-4">
            <div className="w-16 h-16 rounded-[14px] bg-white flex items-center justify-center p-2 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.25)]">
              <img src="/fica-logo.svg" alt="FICA Logo" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-white font-bold text-base">Fiji Institute of Chartered Accountants</div>
              <div className="text-white/55 text-xs mt-0.5">Annual Congress 2026</div>
            </div>
          </div>
        </div>

        {/* Middle: Headline + chips */}
        <div className="relative z-10 max-w-[540px]">
          <h1 className="text-white text-[44px] font-extrabold leading-[1.1] m-0 mb-[18px] tracking-[-0.02em]">
            Welcome to the<br />
            <span className="bg-gradient-to-br from-[#C8A951] to-[#e2c87a] bg-clip-text text-transparent">
              Congress Admin
            </span>
          </h1>
          <p className="text-white/65 text-[15px] leading-[1.65] m-0 mb-9 max-w-[460px]">
            Manage delegates, sessions, sponsors, and announcements for the Annual Congress at the Crowne Plaza Fiji Nadi Bay Resort &amp; Spa.
          </p>

          <div className="flex gap-2.5 flex-wrap">
            {[
              { Icon: Calendar, label: "Date", value: "8–9 May 2026" },
              { Icon: MapPin, label: "Venue", value: "Crowne Plaza Fiji" },
              { Icon: Users, label: "Capacity", value: "500 Delegates" },
            ].map(({ Icon, label, value }) => (
              <div
                key={label}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2.5 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-[#C8A951]/15 flex items-center justify-center shrink-0">
                  <Icon size={15} color="#C8A951" />
                </div>
                <div className="leading-tight">
                  <div className="text-[#C8A951]/85 text-[10px] font-bold tracking-[0.06em] uppercase">
                    {label}
                  </div>
                  <div className="text-white text-[13px] font-semibold mt-0.5">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/40 text-xs">
          © 2026 Fiji Institute of Chartered Accountants
        </div>
      </div>

      {/* ─── Form panel ────────────────────────────────────────────── */}
      <div
        className="
          flex-1 lg:flex-none lg:w-[480px]
          bg-white flex flex-col justify-center
          px-5 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-14
          relative
        "
      >
        {/* Subtle dotted SVG accent — desktop only */}
        <svg
          aria-hidden="true"
          width="120"
          height="120"
          className="hidden lg:block absolute top-6 right-6 opacity-15"
          viewBox="0 0 120 120"
        >
          <pattern id="dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#0F2D5E" />
          </pattern>
          <rect width="120" height="120" fill="url(#dots)" />
        </svg>

        <div className="relative z-10 w-full max-w-[400px] mx-auto">
          {/* Logo — larger on desktop, smaller on mobile */}
          <div className="flex justify-center -mt-6 -mb-6 lg:-mt-10 lg:-mb-10">
            <img
              src="/fica-logo.svg"
              alt="FICA Logo"
              className="w-36 h-36 lg:w-[220px] lg:h-[220px] object-contain block"
            />
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-[22px] lg:text-[26px] font-bold text-[var(--text)] m-0 mb-1.5 tracking-[-0.01em]">
              Sign in
            </h2>
            <p className="text-[13px] lg:text-sm text-[var(--text-muted)] m-0">
              Use your admin or moderator credentials to continue
            </p>
          </div>

          <form onSubmit={onSubmit}>
            {/* Email */}
            <div className="mb-4">
              <label className="label">Email address</label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none"
                />
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fica.org.fj"
                  autoComplete="email"
                  inputMode="email"
                  required
                  style={{ paddingLeft: 40, minHeight: 44 }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-5">
              <label className="label">Password</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none"
                />
                <input
                  type={showPw ? "text" : "password"}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  style={{ paddingLeft: 40, paddingRight: 42, minHeight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="
                    absolute right-2 top-1/2 -translate-y-1/2
                    w-[30px] h-[30px] bg-transparent border-0 rounded-lg cursor-pointer
                    text-[var(--text-subtle)] flex items-center justify-center
                    hover:bg-[var(--surface-soft)] transition-colors
                  "
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error banner */}
            {err && (
              <div
                className="animate-in bg-[var(--danger-soft)] border border-[#fecaca] rounded-[10px] px-3.5 py-2.5 mb-4 text-[13px] text-[var(--danger)] flex items-center gap-2"
              >
                <AlertCircle size={16} className="shrink-0" />
                <span>{err}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
              style={{ padding: "12px 18px", fontSize: 14.5, fontWeight: 600, minHeight: 46 }}
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-[11.5px] text-[var(--text-subtle)] text-center">
            Need access? Contact your event administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
