import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  UserPlus, Search, Monitor, Smartphone, UserCog,
  Mail, KeyRound, Pencil, Shield, ShieldOff, Trash2,
  Eye, EyeOff, Copy, RefreshCw, X, AlertTriangle, Check,
  CheckCircle2, XCircle,
} from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";

/* ─── Password Generator ─── */
function generatePassword(length = 12) {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/* ═════════════════════════════════════════════════════════════════════════════
   Main Component
   ═════════════════════════════════════════════════════════════════════════════ */
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); // { kind: 'success'|'error', text }
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");   // all | admin | delegate
  const [filterStatus, setFilterStatus] = useState("all");   // all | active | no-account | disabled
  const [userModal, setUserModal] = useState(null);          // null | { mode: 'create'|'edit', user?, scope }
  const [confirmModal, setConfirmModal] = useState(null);    // { title, message, tone, action }
  const [actionLoading, setActionLoading] = useState(null);  // `${action}-${id}` while a row action is pending

  const showMsg = (kind, text) => {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 4000);
  };

  async function load() {
    try {
      setLoading(true);
      const data = await api("/event/users");
      setUsers(data.users || []);
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  /* ─── Row actions ─────────────────────────────────────────────────────── */

  async function sendOnboarding(user) {
    setActionLoading(`onboard-${user.user_type}-${user.id}`);
    try {
      const { message } = await api(`/event/users/${user.id}/send-onboarding`, {
        method: "POST",
        body: { scope: user.user_type },
      });
      showMsg("success", message || `Onboarding email sent to ${user.email}`);
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setActionLoading(null);
    }
  }

  function askReset(user) {
    const name = user.name || user.email;
    setConfirmModal({
      title: "Send password reset",
      message: `Send a password reset email to ${name} (${user.email})?`,
      tone: "info",
      confirmLabel: "Send Reset Email",
      action: async () => {
        setActionLoading(`reset-${user.user_type}-${user.id}`);
        try {
          const { message } = await api(`/event/users/${user.id}/send-reset`, {
            method: "POST",
            body: { scope: user.user_type },
          });
          showMsg("success", message || `Reset email sent to ${user.email}`);
        } catch (e) {
          showMsg("error", e.message);
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  async function toggleActive(user) {
    if (user.user_type === "admin") return;
    setActionLoading(`toggle-${user.user_type}-${user.id}`);
    try {
      await api(`/event/users/${user.id}/toggle`, { method: "POST" });
      showMsg("success", user.account_active ? `${user.name} deactivated` : `${user.name} reactivated`);
      await load();
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setActionLoading(null);
    }
  }

  function askDelete(user) {
    const label = user.user_type === "admin" ? "admin" : "delegate";
    const name = user.name || user.email;
    setConfirmModal({
      title: `Delete ${label}`,
      message: `Permanently delete ${name} (${user.email})? ${
        user.user_type === "admin"
          ? "They'll lose access to the admin dashboard immediately."
          : "All their profile data, messages, connections and votes will also be removed."
      } This cannot be undone.`,
      tone: "danger",
      confirmLabel: "Delete Account",
      action: async () => {
        setActionLoading(`delete-${user.user_type}-${user.id}`);
        try {
          await api(`/event/users/${user.id}`, {
            method: "DELETE",
            body: { scope: user.user_type },
          });
          showMsg("success", `${name} deleted`);
          await load();
        } catch (e) {
          showMsg("error", e.message);
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  /* ─── Derived data ────────────────────────────────────────────────────── */

  const filtered = users.filter(u => {
    if (filterSource === "admin" && u.user_type !== "admin") return false;
    if (filterSource === "delegate" && u.user_type !== "delegate") return false;

    const q = search.toLowerCase();
    const matchSearch =
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.organization || "").toLowerCase().includes(q) ||
      (u.registration_code || "").toLowerCase().includes(q);

    if (filterStatus === "active") return matchSearch && u.has_password && u.account_active;
    if (filterStatus === "no-account") return matchSearch && !u.has_password;
    if (filterStatus === "disabled") return matchSearch && !u.account_active;
    return matchSearch;
  });

  const delegates = users.filter(u => u.user_type === "delegate");
  const adminsCount = users.filter(u => u.user_type === "admin").length;
  const active = delegates.filter(u => u.has_password && u.account_active).length;
  const withAccount = delegates.filter(u => u.has_password).length;
  const noAccount = delegates.filter(u => !u.has_password).length;

  return (
    <Layout>
      <div style={{ padding: "8px 0 28px" }} className="animate-in">
        <PageHeader
          title="User Management"
          subtitle="Manage admin and delegate accounts across the web dashboard and mobile app"
          action={
            <button
              onClick={() => setUserModal({ mode: "create", scope: "delegate" })}
              className="btn-primary"
              style={{ borderRadius: 999 }}
            >
              <UserPlus size={15} /> Create Account
            </button>
          }
        />

        {/* ─── Toast ──────────────────────────────────────────────────────── */}
        {message && (
          <div
            className="animate-in"
            style={{
              background: message.kind === "success" ? "#f0fff4" : "#fff5f5",
              border: `1px solid ${message.kind === "success" ? "#c6f6d5" : "#fed7d7"}`,
              borderRadius: 12, padding: "12px 16px", marginBottom: 16,
              fontSize: 13, fontWeight: 500,
              color: message.kind === "success" ? "#276749" : "#c53030",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: message.kind === "success" ? "#48bb78" : "#f56565",
                flexShrink: 0,
              }}
            />
            {message.text}
          </div>
        )}

        {/* ─── Overview stats ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {[
            { label: "Total Delegates", value: delegates.length, color: "#0F2D5E" },
            { label: "Active Accounts", value: active, color: "#276749" },
            { label: "Account Set", value: withAccount, color: "#2c5282" },
            { label: "No Account Yet", value: noAccount, color: "#c53030" },
            { label: "Admin Users", value: adminsCount, color: "#7c3aed" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginTop: 6, lineHeight: 1.1 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Filter bar ────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 220 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Search name, email, organisation, or registration code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Source tabs */}
            <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
              {[
                { value: "all", label: "All", icon: UserCog, count: users.length },
                { value: "admin", label: "Admin", icon: Monitor, count: adminsCount },
                { value: "delegate", label: "Mobile", icon: Smartphone, count: delegates.length },
              ].map(f => {
                const Icon = f.icon;
                const isActive = filterSource === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilterSource(f.value)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, border: "none",
                      cursor: "pointer", fontWeight: 600, fontSize: 12.5,
                      background: isActive ? "white" : "transparent",
                      color: isActive ? "#0F2D5E" : "#64748b",
                      boxShadow: isActive ? "0 1px 3px rgba(15,45,94,0.1)" : "none",
                      display: "flex", alignItems: "center", gap: 6,
                      transition: "all 0.12s",
                    }}
                  >
                    <Icon size={13} />
                    {f.label}
                    <span style={{
                      fontSize: 10.5, padding: "1px 6px", borderRadius: 10, fontWeight: 700,
                      background: isActive ? "#0F2D5E" : "#e2e8f0",
                      color: isActive ? "#C8A951" : "#64748b",
                    }}>{f.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Status pill select */}
            <select
              className="input"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ minWidth: 140, maxWidth: 180 }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="no-account">No account</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* ─── User list (ticket-system style) ────────────────────────────── */}
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filtered.map((user, idx) => (
                <UserRow
                  key={`${user.user_type}-${user.id}`}
                  user={user}
                  isLast={idx === filtered.length - 1}
                  actionLoading={actionLoading}
                  onEdit={() => setUserModal({ mode: "edit", user, scope: user.user_type })}
                  onOnboard={() => sendOnboarding(user)}
                  onReset={() => askReset(user)}
                  onToggle={() => toggleActive(user)}
                  onDelete={() => askDelete(user)}
                />
              ))}
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
            Showing {filtered.length} of {users.length} accounts
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}
      {userModal && (
        <UserModal
          modal={userModal}
          onClose={() => setUserModal(null)}
          onSaved={(msg) => { showMsg("success", msg); setUserModal(null); load(); }}
          onError={(msg) => showMsg("error", msg)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          modal={confirmModal}
          onCancel={() => setConfirmModal(null)}
          onConfirm={() => { confirmModal.action(); setConfirmModal(null); }}
        />
      )}
    </Layout>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   User Row
   ═════════════════════════════════════════════════════════════════════════════ */
function UserRow({ user, isLast, actionLoading, onEdit, onOnboard, onReset, onToggle, onDelete }) {
  const isAdmin = user.user_type === "admin";
  const isInactive = user.has_password && !user.account_active;
  const hasNoAccount = !user.has_password;
  const displayName = user.name || user.email.split("@")[0];
  const initial = (displayName || "?").charAt(0).toUpperCase();
  const k = (action) => `${action}-${user.user_type}-${user.id}`;

  return (
    <div
      className="um-row"
      style={{
        padding: "14px 18px",
        borderBottom: isLast ? "none" : "1px solid #f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        transition: "background 0.12s",
        opacity: isInactive ? 0.65 : 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Left: avatar + name/email + badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: isInactive
              ? "#94a3b8"
              : isAdmin
                ? "linear-gradient(135deg, #7c3aed, #9333ea)"
                : "linear-gradient(135deg, #0F2D5E, #1a4080)",
            color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
            flexShrink: 0,
            boxShadow: "0 1px 2px rgba(15,45,94,0.15)",
          }}
        >
          {user.photo_url ? (
            <img src={user.photo_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 12, objectFit: "cover" }} />
          ) : initial}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                fontSize: 14, fontWeight: 700,
                color: isInactive ? "#64748b" : "#0f172a",
                textDecoration: isInactive ? "line-through" : "none",
              }}
            >
              {displayName}
            </div>

            {/* Type badge */}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5,
              padding: "2px 8px", borderRadius: 999, fontWeight: 700,
              background: isAdmin ? "#f5f3ff" : "#eef2ff",
              color: isAdmin ? "#7c3aed" : "#0F2D5E",
              border: `1px solid ${isAdmin ? "#ddd6fe" : "#c7d2fe"}`,
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {isAdmin ? <Monitor size={10} /> : <Smartphone size={10} />}
              {isAdmin ? "Admin" : "Mobile"}
            </span>

            {/* Ticket type */}
            {user.ticket_type && (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 700,
                background: "#f0f4f8", color: "#0F2D5E",
                textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                {user.ticket_type}
              </span>
            )}

            {/* Reg code */}
            {user.registration_code && (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 700,
                background: "#f0f4f8", color: "#64748b",
                fontFamily: "ui-monospace, monospace",
              }}>
                {user.registration_code}
              </span>
            )}

            {/* Status chips */}
            {hasNoAccount ? (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 700,
                background: "#fff5f5", color: "#c53030",
              }}>NO ACCOUNT</span>
            ) : isInactive && (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 700,
                background: "#fff5f5", color: "#c53030",
              }}>DEACTIVATED</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span>{user.email}</span>
            {user.organization && (
              <span style={{ color: "#cbd5e1" }}>· <span style={{ color: "#94a3b8" }}>{user.organization}</span></span>
            )}
            {user.job_title && (
              <span style={{ color: "#cbd5e1" }}>· <span style={{ color: "#94a3b8" }}>{user.job_title}</span></span>
            )}
          </div>
        </div>
      </div>

      {/* Right: action icons */}
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <IconBtn
          onClick={onOnboard}
          loading={actionLoading === k("onboard")}
          color="#2563eb"
          bg="#eff6ff"
          title="Send onboarding email"
          Icon={Mail}
        />
        <IconBtn
          onClick={onReset}
          loading={actionLoading === k("reset")}
          color="#d97706"
          bg="#fffbeb"
          title="Send password reset email"
          Icon={KeyRound}
        />
        <IconBtn
          onClick={onEdit}
          color="#7c3aed"
          bg="#f5f3ff"
          title="Edit account"
          Icon={Pencil}
        />
        {!isAdmin && Boolean(user.has_password) && (
          <IconBtn
            onClick={onToggle}
            loading={actionLoading === k("toggle")}
            color={isInactive ? "#059669" : "#d97706"}
            bg={isInactive ? "#ecfdf5" : "#fffbeb"}
            title={isInactive ? "Reactivate account" : "Deactivate account"}
            Icon={isInactive ? Shield : ShieldOff}
          />
        )}
        <IconBtn
          onClick={onDelete}
          loading={actionLoading === k("delete")}
          color="#dc2626"
          bg="#fff5f5"
          title="Delete account"
          Icon={Trash2}
        />
      </div>
    </div>
  );
}

/* Small reusable icon button (ticket-system pattern) */
function IconBtn({ onClick, loading, color, bg, title, Icon }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32, height: 32, borderRadius: 8,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: loading ? "wait" : "pointer",
        border: "1px solid transparent",
        background: hover ? bg : "transparent",
        color: hover ? color : "#94a3b8",
        transition: "all 0.12s",
        opacity: loading ? 0.55 : 1,
      }}
    >
      {loading ? (
        <div
          style={{
            width: 14, height: 14, borderRadius: "50%",
            border: `2px solid ${color}33`,
            borderTopColor: color,
            animation: "spin 0.7s linear infinite",
          }}
        />
      ) : (
        <Icon size={15} strokeWidth={2} />
      )}
    </button>
  );
}

/* ─── Loading + empty states ─────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div className="card" style={{ padding: 60, textAlign: "center" }}>
      <div
        style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid #eef2ff",
          borderTopColor: "#0F2D5E",
          margin: "0 auto 14px",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Loading users…</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card" style={{ padding: 60, textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "#f8fafc", display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        marginBottom: 12,
      }}>
        <UserCog size={24} color="#cbd5e1" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>No users match these filters</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
        Try clearing the search or switching to "All".
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   User Modal (unified create/edit for admin + delegate)
   ═════════════════════════════════════════════════════════════════════════════ */
function UserModal({ modal, onClose, onSaved, onError }) {
  const isEdit = modal.mode === "edit";
  const editingUser = modal.user || null;
  const [scope, setScope] = useState(modal.scope || "delegate");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Shared form state
  const [form, setForm] = useState(() => {
    if (isEdit && editingUser) {
      return {
        email: editingUser.email || "",
        name: editingUser.name || "",
        organization: editingUser.organization || "",
        job_title: editingUser.job_title || "",
        phone: editingUser.phone || "",
        ticket_type: editingUser.ticket_type || "full",
        dietary_requirements: editingUser.dietary_requirements || "",
        password: "",
      };
    }
    return {
      email: "",
      name: "",
      organization: "",
      job_title: "",
      phone: "",
      ticket_type: "full",
      dietary_requirements: "",
      password: generatePassword(),
    };
  });

  // When toggling scope during CREATE, keep email/password, reset rest
  function switchScope(next) {
    if (isEdit) return;
    setScope(next);
  }

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function copyPassword() {
    if (!form.password) return;
    navigator.clipboard.writeText(form.password).catch(() => {});
    onError && null; // silent
  }
  function regenerate() {
    setField("password", generatePassword());
    setShowPassword(true);
  }

  async function submit() {
    try {
      if (!form.email.trim()) return onError("Email is required");
      if (scope === "delegate" && !form.name.trim()) return onError("Name is required for delegates");
      if (!isEdit && (!form.password || form.password.length < 6))
        return onError("Password is required (min 6 characters)");
      if (form.password && form.password.length < 6)
        return onError("Password must be at least 6 characters");

      setSaving(true);

      if (isEdit) {
        await api(`/event/users/${editingUser.id}`, {
          method: "PUT",
          body: {
            scope,
            email: form.email,
            ...(scope === "delegate" ? {
              name: form.name,
              organization: form.organization || null,
              job_title: form.job_title || null,
              phone: form.phone || null,
              ticket_type: form.ticket_type || "full",
              dietary_requirements: form.dietary_requirements || null,
            } : {}),
            ...(form.password ? { password: form.password } : {}),
          },
        });
        onSaved("Account updated");
        return;
      }

      // Create
      if (scope === "admin") {
        await api("/register", {
          method: "POST",
          auth: false,
          body: { email: form.email, password: form.password },
        });
        onSaved(`Admin account created for ${form.email}`);
        return;
      }

      // Create delegate
      const { attendee } = await api("/event/attendees", {
        method: "POST",
        body: {
          name: form.name,
          email: form.email,
          organization: form.organization || null,
          job_title: form.job_title || null,
          phone: form.phone || null,
          ticket_type: form.ticket_type,
          dietary_requirements: form.dietary_requirements || null,
        },
      });
      if (form.password && attendee?.id) {
        await api(`/event/users/${attendee.id}/password`, {
          method: "POST",
          body: { password: form.password, scope: "delegate" },
        });
      }
      onSaved(`Delegate account created for ${form.email}`);
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={() => !saving && onClose()}
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
      />
      <div
        className="animate-scale-in"
        style={{
          position: "relative",
          background: "white",
          borderRadius: 20,
          width: "100%",
          maxWidth: 540,
          maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 40px -10px rgba(15,45,94,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 22px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
              {isEdit ? "Edit Account" : "Create New Account"}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#94a3b8" }}>
              {isEdit
                ? scope === "admin" ? "Update admin account details" : "Update delegate account details"
                : "Add a new admin or mobile delegate"}
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            style={{
              width: 34, height: 34, borderRadius: 10, border: "none",
              background: "#f1f5f9", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#64748b",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 22, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Account type picker — CREATE only */}
          {!isEdit && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <TypeCard
                Icon={Monitor}
                label="Web Admin"
                desc="Signs into the admin dashboard"
                active={scope === "admin"}
                color="#7c3aed"
                bg="#f5f3ff"
                onClick={() => switchScope("admin")}
              />
              <TypeCard
                Icon={Smartphone}
                label="Mobile Delegate"
                desc="Signs into the FICA mobile app"
                active={scope === "delegate"}
                color="#0F2D5E"
                bg="#eef2ff"
                onClick={() => switchScope("delegate")}
              />
            </div>
          )}

          {/* Delegate fields (name + org + job_title + phone + ticket) */}
          {scope === "delegate" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Full Name *">
                  <input
                    className="input"
                    value={form.name}
                    onChange={e => setField("name", e.target.value)}
                    placeholder="John Smith"
                  />
                </Field>
                <Field label="Email *">
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={e => setField("email", e.target.value)}
                    placeholder="john@company.com"
                  />
                </Field>
                <Field label="Organisation">
                  <input
                    className="input"
                    value={form.organization}
                    onChange={e => setField("organization", e.target.value)}
                    placeholder="KPMG Fiji"
                  />
                </Field>
                <Field label="Job Title">
                  <input
                    className="input"
                    value={form.job_title}
                    onChange={e => setField("job_title", e.target.value)}
                    placeholder="Audit Manager"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className="input"
                    value={form.phone}
                    onChange={e => setField("phone", e.target.value)}
                    placeholder="+679 9234567"
                  />
                </Field>
                <Field label="Ticket Type">
                  <select
                    className="input"
                    value={form.ticket_type}
                    onChange={e => setField("ticket_type", e.target.value)}
                  >
                    <option value="full">Full Access</option>
                    <option value="vip">VIP</option>
                    <option value="day1">Day 1</option>
                    <option value="day2">Day 2</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </Field>
              </div>
              <Field label="Dietary Requirements">
                <input
                  className="input"
                  value={form.dietary_requirements}
                  onChange={e => setField("dietary_requirements", e.target.value)}
                  placeholder="Vegetarian, Halal, Gluten-Free…"
                />
              </Field>
            </>
          )}

          {/* Admin (just email) */}
          {scope === "admin" && (
            <Field label="Email *">
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={e => setField("email", e.target.value)}
                placeholder="admin@fica.org.fj"
              />
            </Field>
          )}

          {/* Password with generator */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                Password {isEdit ? "(leave blank to keep current)" : "*"}
              </label>
              <button
                type="button"
                onClick={regenerate}
                style={{
                  fontSize: 11, fontWeight: 600, color: "#7c3aed",
                  background: "none", border: "none", cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                <RefreshCw size={11} /> Generate
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="input"
                value={form.password}
                onChange={e => setField("password", e.target.value)}
                placeholder={isEdit ? "Enter new password (optional)" : "Enter password"}
                minLength={6}
                autoComplete="new-password"
                style={{ paddingRight: 72, fontFamily: showPassword ? "ui-monospace, monospace" : "inherit" }}
              />
              <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2 }}>
                {form.password && (
                  <button
                    type="button"
                    onClick={copyPassword}
                    title="Copy password"
                    style={{ width: 28, height: 28, background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Copy size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{ width: 28, height: 28, background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            {!isEdit && (
              <p style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 6 }}>
                Tip: after creating, click the mail icon on the row to send an onboarding email — the user can then set their own password.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 22px",
          borderTop: "1px solid #f1f5f9",
          background: "#f8fafc",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            style={{
              padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: "#e2e8f0", color: "#475569", border: "none", cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="btn-primary"
            style={{ borderRadius: 999, opacity: saving ? 0.7 : 1 }}
          >
            {saving
              ? <><span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", animation: "spin 0.7s linear infinite", display: "inline-block", marginRight: 6 }} /> Saving…</>
              : <>{isEdit ? <Check size={14} /> : <UserPlus size={14} />} {isEdit ? "Update Account" : "Create Account"}</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TypeCard({ Icon, label, desc, active, color, bg, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 14,
        background: active ? bg : "white",
        border: `1.5px solid ${active ? color : "#e2e8f0"}`,
        borderRadius: 12,
        cursor: "pointer",
        transition: "all 0.12s",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: active ? "white" : bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={17} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   Confirm Modal
   ═════════════════════════════════════════════════════════════════════════════ */
function ConfirmModal({ modal, onCancel, onConfirm }) {
  const tone = modal.tone || "info";
  const toneMap = {
    danger:  { bg: "#fff5f5", border: "#fecaca", iconColor: "#dc2626", btnBg: "#dc2626", Icon: Trash2 },
    warning: { bg: "#fffbeb", border: "#fde68a", iconColor: "#d97706", btnBg: "#0f172a", Icon: AlertTriangle },
    info:    { bg: "#eff6ff", border: "#bfdbfe", iconColor: "#2563eb", btnBg: "#0f172a", Icon: Mail },
  };
  const t = toneMap[tone] || toneMap.info;

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div
        onClick={onCancel}
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
      />
      <div
        className="animate-scale-in"
        style={{
          position: "relative",
          background: "white",
          borderRadius: 20,
          width: "100%",
          maxWidth: 360,
          textAlign: "center",
          padding: "28px 24px 22px",
          boxShadow: "0 20px 40px -10px rgba(15,45,94,0.25)",
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: t.bg, border: `1px solid ${t.border}`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}>
          <t.Icon size={22} color={t.iconColor} />
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
          {modal.title}
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>
          {modal.message}
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: "#f1f5f9", color: "#475569", border: "none", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: t.btnBg, color: "white", border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {modal.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
