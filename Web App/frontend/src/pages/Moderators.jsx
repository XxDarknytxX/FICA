import { useEffect, useState } from "react";
import {
  UserPlus, Trash2, Key, UserCog, Mail, X, AlertCircle, RefreshCw,
} from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../services/api";

/**
 * Admin-only page for managing moderator accounts.
 *
 * Moderators are stored in the same `users` table as admins, just with
 * role='moderator'. This page lets an admin:
 *   • List existing moderators
 *   • Create a new one (email + password)
 *   • Reset a moderator's password
 *   • Delete a moderator
 *
 * The backend routes (/api/moderators/*) are all requireAdmin-gated so
 * a moderator can't reach this page and escalate privileges.
 */
export default function Moderators() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(null);
  const [modal, setModal] = useState(null); // { type: "create" | "password", row? }

  async function load() {
    try {
      setErr("");
      const d = await api("/moderators");
      setRows(d.moderators || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function del(row) {
    if (!window.confirm(`Delete moderator ${row.email}? They'll be signed out immediately on next request.`)) return;
    setBusy(row.id);
    try {
      await api(`/moderators/${row.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Layout>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
            Moderators
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13.5 }}>
            Moderator accounts see only Announcements, Projects & Voting, Panel Discussions, and the control dashboard.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setModal({ type: "create" })}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44 }}
        >
          <UserPlus size={15} />
          Add moderator
        </button>
      </div>

      {err && (
        <div
          className="animate-in"
          style={{
            background: "var(--danger-soft)",
            border: "1px solid #fecaca",
            color: "var(--danger)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: 13,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <AlertCircle size={16} /> {err}
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24, color: "var(--text-muted)", display: "inline-flex", gap: 8, alignItems: "center" }}>
            <RefreshCw size={16} className="spin" /> Loading moderators...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            <UserCog size={32} style={{ opacity: 0.4, margin: "0 auto 10px" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>No moderators yet</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Click "Add moderator" to create an account that can run the live dashboard on event day.
            </div>
          </div>
        ) : (
          <div>
            {rows.map((row, i) => (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border-soft)",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(200,169,81,0.15)",
                    color: "#8a6d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <UserCog size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                    {row.email}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    Moderator · created {formatDate(row.created_at)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn-ghost"
                    onClick={() => setModal({ type: "password", row })}
                    title="Reset password"
                    style={{ padding: "8px 12px", minHeight: 40, display: "inline-flex", gap: 6 }}
                  >
                    <Key size={14} /> Password
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => del(row)}
                    disabled={busy === row.id}
                    style={{ padding: "8px 12px", minHeight: 40, color: "var(--danger)", display: "inline-flex", gap: 6 }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal?.type === "create" && (
        <CreateModeratorModal
          onClose={() => setModal(null)}
          onCreated={() => { setModal(null); load(); }}
        />
      )}
      {modal?.type === "password" && (
        <PasswordModal
          row={modal.row}
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      )}
    </Layout>
  );
}

// ─── Modals ─────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card animate-scale-in"
        style={{ width: "100%", maxWidth: 440, padding: 0, background: "var(--surface)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border-soft)" }}>
          <h2 style={{ fontSize: 15.5, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

function CreateModeratorModal({ onClose, onCreated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email || password.length < 6) {
      setErr("Email and a 6+ character password are required.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api("/moderators", { method: "POST", body: { email, password } });
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="New moderator" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="label">Email address</label>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }} />
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="moderator@fica.org.fj"
            required
            style={{ paddingLeft: 36 }}
          />
        </div>
        <label className="label">Temporary password</label>
        <input
          type="text"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
          style={{ marginBottom: 12 }}
        />
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" }}>
          Share this password with the moderator via a secure channel. They should change it after first login — for now, use the Reset password button on their row.
        </p>
        {err && (
          <div style={{ background: "var(--danger-soft)", color: "var(--danger)", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
            {err}
          </div>
        )}
        <button type="submit" disabled={busy} className="btn-primary" style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
          {busy ? "Creating..." : "Create moderator"}
        </button>
      </form>
    </ModalShell>
  );
}

function PasswordModal({ row, onClose, onSaved }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api(`/moderators/${row.id}/password`, { method: "POST", body: { password } });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title={`Reset password — ${row.email}`} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="label">New password</label>
        <input
          type="text"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
          style={{ marginBottom: 12 }}
        />
        {err && (
          <div style={{ background: "var(--danger-soft)", color: "var(--danger)", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
            {err}
          </div>
        )}
        <button type="submit" disabled={busy} className="btn-primary" style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
          {busy ? "Saving..." : "Save new password"}
        </button>
      </form>
    </ModalShell>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}
