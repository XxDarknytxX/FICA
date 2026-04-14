import { useEffect, useState } from "react";
import {
  UserCog, KeyRound, Shield, ShieldOff, Search,
  CheckCircle2, XCircle, Pencil, Eye, EyeOff, Copy, RefreshCw
} from "lucide-react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import { api } from "../services/api";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function PasswordModal({ user, onClose, onSaved }) {
  const [password, setPassword] = useState(generatePassword());
  const [showPw, setShowPw] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  async function save() {
    if (password.length < 6) { setErr("Password must be at least 6 characters"); return; }
    setSaving(true); setErr("");
    try {
      await api(`/event/users/${user.id}/password`, { method: "POST", body: { password } });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal title={`Set Password — ${user.name}`} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ background: "#f0f4f8", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#718096", marginBottom: 4 }}>Delegate account</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: 13, color: "#4a5568" }}>{user.email}</div>
          {user.registration_code && (
            <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 4 }}>
              Code: <span style={{ fontFamily: "monospace", color: "#0F2D5E", fontWeight: 700 }}>{user.registration_code}</span>
            </div>
          )}
        </div>

        <label className="label">New Password</label>
        <div style={{ position: "relative", display: "flex", gap: 6 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              className="input"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: 36 }}
            />
            <button
              onClick={() => setShowPw(v => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#a0aec0" }}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button onClick={() => setPassword(generatePassword())} className="btn-ghost" title="Generate new password">
            <RefreshCw size={14} />
          </button>
          <button onClick={copy} className="btn-ghost" title="Copy to clipboard">
            <Copy size={14} />
            {copied && <span style={{ fontSize: 11, color: "#48bb78" }}>Copied!</span>}
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 6 }}>
          Share this password with the delegate. They will use their email + this password to log into the mobile app.
        </div>

        {err && <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "8px 12px", marginTop: 10, fontSize: 13, color: "#c53030" }}>{err}</div>}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={save} className="btn-gold" disabled={saving}>
          <KeyRound size={14} /> {saving ? "Setting..." : "Set Password & Activate"}
        </button>
      </div>
    </Modal>
  );
}

function ProfileModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    bio: user.bio || "", photo_url: user.photo_url || "",
    linkedin: user.linkedin || "", twitter: user.twitter || "", website: user.website || ""
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save() {
    setSaving(true); setErr("");
    try {
      await api(`/event/users/${user.id}/profile`, { method: "PUT", body: form });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit Profile — ${user.name}`} onClose={onClose} size="lg">
      {err && <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13, color: "#c53030" }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Photo URL</label>
          <input className="input" value={form.photo_url} onChange={set("photo_url")} placeholder="https://..." />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Bio / About</label>
          <textarea className="input" value={form.bio} onChange={set("bio")} rows={4} placeholder="Brief professional bio visible in the networking directory..." />
        </div>
        <div>
          <label className="label">LinkedIn URL</label>
          <input className="input" value={form.linkedin} onChange={set("linkedin")} placeholder="https://linkedin.com/in/..." />
        </div>
        <div>
          <label className="label">Twitter / X</label>
          <input className="input" value={form.twitter} onChange={set("twitter")} placeholder="@handle" />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Website</label>
          <input className="input" value={form.website} onChange={set("website")} placeholder="https://..." />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={save} className="btn-gold" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
      </div>
    </Modal>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [pwModal, setPwModal] = useState(null);
  const [profileModal, setProfileModal] = useState(null);

  async function load() {
    const data = await api("/event/users");
    setUsers(data.users || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(user) {
    try {
      await api(`/event/users/${user.id}/toggle`, { method: "POST" });
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.organization || "").toLowerCase().includes(q) ||
      (u.registration_code || "").toLowerCase().includes(q);
    if (filterStatus === "active") return matchSearch && u.has_password && u.account_active;
    if (filterStatus === "no-account") return matchSearch && !u.has_password;
    if (filterStatus === "disabled") return matchSearch && !u.account_active;
    return matchSearch;
  });

  const withAccount = users.filter(u => u.has_password).length;
  const active = users.filter(u => u.has_password && u.account_active).length;
  const noAccount = users.filter(u => !u.has_password).length;

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="User Management"
          subtitle="Manage delegate login accounts for the FICA Congress mobile app"
        />

        {/* Info banner */}
        <div style={{
          background: "linear-gradient(135deg, #0F2D5E, #1a4080)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 20,
          display: "flex", gap: 16, alignItems: "center"
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(200,169,81,0.2)", border: "1px solid rgba(200,169,81,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <UserCog size={20} color="#C8A951" />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Delegate Mobile App Accounts</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 2 }}>
              Each attendee needs a password set by admin before they can log into the FICA Congress mobile app.
              They use their registered email + password to sign in. Delegates login at{" "}
              <code style={{ color: "#C8A951", fontSize: 12 }}>POST /api/delegate/login</code>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Attendees", value: users.length, color: "#0F2D5E" },
            { label: "Active Accounts", value: active, color: "#276749" },
            { label: "Account Set", value: withAccount, color: "#2c5282" },
            { label: "No Account Yet", value: noAccount, color: "#c53030" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "12px 18px", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#718096" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a0aec0" }} />
            <input
              className="search-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search name, email, org, code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "no-account", label: "No Account" },
            { value: "disabled", label: "Disabled" },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              style={{
                padding: "7px 14px", borderRadius: 8, border: "1px solid",
                cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                background: filterStatus === f.value ? "#0F2D5E" : "white",
                color: filterStatus === f.value ? "white" : "#4a5568",
                borderColor: filterStatus === f.value ? "#0F2D5E" : "#e2e8f0",
              }}
            >{f.label}</button>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Delegate</th>
                <th>Organisation</th>
                <th>Reg. Code</th>
                <th>Ticket</th>
                <th>Account Status</th>
                <th>Profile</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>No users found</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <img
                        src={u.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0F2D5E&color=C8A951&size=40`}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0F2D5E&color=C8A951&size=40`; }}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: "#a0aec0" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: "#4a5568" }}>{u.organization || "—"}<br /><span style={{ fontSize: 11, color: "#a0aec0" }}>{u.job_title || ""}</span></td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 12, background: "#f0f4f8", padding: "2px 8px", borderRadius: 4, color: "#0F2D5E", fontWeight: 700 }}>
                      {u.registration_code}
                    </span>
                  </td>
                  <td><Badge value={u.ticket_type} /></td>
                  <td>
                    {!u.has_password ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#c53030", background: "#fff5f5", padding: "3px 10px", borderRadius: 20, border: "1px solid #fed7d7" }}>
                        <XCircle size={13} /> No account
                      </span>
                    ) : u.account_active ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#276749", background: "#f0fff4", padding: "3px 10px", borderRadius: 20, border: "1px solid #c6f6d5" }}>
                        <CheckCircle2 size={13} /> Active
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#718096", background: "#f8fafc", padding: "3px 10px", borderRadius: 20, border: "1px solid #e2e8f0" }}>
                        <ShieldOff size={13} /> Disabled
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: u.bio ? "#276749" : "#a0aec0" }}>
                      {u.bio ? "Complete" : "Empty"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => setPwModal(u)}
                        className="btn-primary"
                        style={{ padding: "5px 10px", fontSize: 12, gap: 4 }}
                        title={u.has_password ? "Reset password" : "Set password"}
                      >
                        <KeyRound size={13} />
                        {u.has_password ? "Reset" : "Set PW"}
                      </button>
                      {u.has_password && (
                        <button
                          onClick={() => toggleActive(u)}
                          className="btn-ghost"
                          style={{ padding: "5px 8px" }}
                          title={u.account_active ? "Disable account" : "Enable account"}
                        >
                          {u.account_active ? <ShieldOff size={14} /> : <Shield size={14} />}
                        </button>
                      )}
                      <button
                        onClick={() => setProfileModal(u)}
                        className="btn-ghost"
                        style={{ padding: "5px 8px" }}
                        title="Edit profile"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#a0aec0", textAlign: "right" }}>
            Showing {filtered.length} of {users.length} delegates
          </div>
        )}

        {pwModal && (
          <PasswordModal user={pwModal} onClose={() => setPwModal(null)} onSaved={load} />
        )}
        {profileModal && (
          <ProfileModal user={profileModal} onClose={() => setProfileModal(null)} onSaved={load} />
        )}
      </div>
    </Layout>
  );
}
