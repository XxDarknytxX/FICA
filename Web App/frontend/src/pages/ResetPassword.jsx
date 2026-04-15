import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { api } from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!token) { setError("Invalid reset link. No token provided."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await api("/reset-password", {
        method: "POST",
        body: { token, password },
        auth: false,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, maxWidth: 420, textAlign: "center" }}>
          <div style={{ ...styles.iconCircle, background: "#fff5f5", color: "#c53030" }}>
            <AlertCircle size={28} />
          </div>
          <h1 style={styles.title}>Invalid Reset Link</h1>
          <p style={styles.subtitle}>
            This password reset link is missing a token. Please request a new one from your administrator.
          </p>
          <button onClick={() => navigate("/login")} style={styles.primaryBtn}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Brand header */}
        <div style={styles.brandHeader}>
          <div style={styles.logoBox}>
            <img
              src="/fica-logo.svg"
              alt="FICA"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
          <div>
            <div style={styles.brandEyebrow}>FICA ANNUAL CONGRESS</div>
            <div style={styles.brandTitle}>2026</div>
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0 12px" }}>
            <div style={{ ...styles.iconCircle, background: "#f0fff4", color: "#276749" }}>
              <CheckCircle size={28} />
            </div>
            <h2 style={styles.title}>Password Updated</h2>
            <p style={styles.subtitle}>
              Your password has been successfully reset. Redirecting you to login…
            </p>
            <button onClick={() => navigate("/login")} style={styles.primaryBtn}>
              Go to Login <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={styles.title}>Set a new password</h2>
            <p style={styles.subtitle}>
              Choose a strong password (at least 6 characters). You'll use this to sign in going forward.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={styles.label}>New Password</label>
              <div style={styles.inputWrap}>
                <Lock size={15} style={styles.inputIcon} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrap}>
                <Lock size={15} style={styles.inputIcon} />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  minLength={6}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#fff5f5", border: "1px solid #fed7d7",
                borderRadius: 10, padding: "10px 12px", marginBottom: 14,
                fontSize: 13, color: "#c53030",
              }}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={styles.primaryBtn}>
              {loading
                ? <><div style={styles.spinner} /> Resetting…</>
                : <>Reset Password <ArrowRight size={15} /></>}
            </button>

            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{ background: "none", border: "none", color: "#0F2D5E", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)",
    padding: 24,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "#fff",
    borderRadius: 20,
    padding: 36,
    boxShadow: "0 20px 40px -12px rgba(15,45,94,0.15), 0 0 0 1px rgba(15,45,94,0.04)",
  },
  brandHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: "1px solid #eef2f7",
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#fff",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    flexShrink: 0,
  },
  brandEyebrow: {
    fontSize: 10,
    fontWeight: 700,
    color: "#C8A951",
    letterSpacing: "0.12em",
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0F2D5E",
    letterSpacing: "-0.01em",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 8px",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontSize: 13.5,
    color: "#64748b",
    margin: "0 0 22px",
    lineHeight: 1.55,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
  },
  inputWrap: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
  },
  input: {
    width: "100%",
    padding: "11px 14px 11px 40px",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 13.5,
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    transition: "border 0.15s, box-shadow 0.15s",
    boxSizing: "border-box",
  },
  primaryBtn: {
    width: "100%",
    padding: "12px 20px",
    borderRadius: 999,
    background: "#0F2D5E",
    color: "#fff",
    border: "none",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.15s",
  },
  spinner: {
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.35)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
