// Shared UI kit — consistent components used across every admin page.
// Matches the User Management / ticket-system visual language:
// rounded cards, portalled modals, tone-coded icon buttons, soft status chips.

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Mail, Trash2, Check, CheckCircle2, AlertCircle } from "lucide-react";

/* ═══════════════════════════ Toast ═══════════════════════════ */
export function Toast({ message }) {
  if (!message) return null;
  const { kind = "success", text } = message;
  const colors = kind === "success"
    ? { bg: "#f0fff4", border: "#c6f6d5", fg: "#276749", dot: "#48bb78", Icon: CheckCircle2 }
    : { bg: "#fff5f5", border: "#fed7d7", fg: "#c53030", dot: "#f56565", Icon: AlertCircle };
  return (
    <div
      className="animate-in"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.fg,
        borderRadius: 12,
        padding: "11px 16px",
        marginBottom: 14,
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <colors.Icon size={15} style={{ flexShrink: 0 }} />
      {text}
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState(null);
  function show(kind, text) {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 4000);
  }
  return { message, show, clear: () => setMessage(null) };
}

/* ═══════════════════════════ Stat Card ═══════════════════════════ */
export function StatCard({ label, value, color = "#0F2D5E", icon: Icon, sub }) {
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      {Icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}15`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginBottom: 10,
        }}>
          <Icon size={18} color={color} />
        </div>
      )}
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#718096",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 6, lineHeight: 1.1 }}>
        {value ?? "—"}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════ Icon Button (hover-colored) ═══════════════════════════ */
export function IconBtn({ onClick, loading = false, color, bg, title, Icon, size = 15 }) {
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
        <div style={{
          width: 14, height: 14, borderRadius: "50%",
          border: `2px solid ${color}33`, borderTopColor: color,
          animation: "spin 0.7s linear infinite",
        }} />
      ) : (
        <Icon size={size} strokeWidth={2} />
      )}
    </button>
  );
}

/* ═══════════════════════════ Status Chip ═══════════════════════════ */
export function Chip({ label, color = "#64748b", bg = "#f1f5f9", border, uppercase = false, small = false, icon: Icon }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: small ? 10 : 11,
      padding: small ? "2px 7px" : "3px 9px",
      borderRadius: 999,
      fontWeight: 700,
      background: bg,
      color,
      border: border ? `1px solid ${border}` : "none",
      textTransform: uppercase ? "uppercase" : "none",
      letterSpacing: uppercase ? "0.04em" : "normal",
      whiteSpace: "nowrap",
    }}>
      {Icon && <Icon size={small ? 10 : 11} />}
      {label}
    </span>
  );
}

/* ═══════════════════════════ Page states ═══════════════════════════ */
export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="card" style={{ padding: 60, textAlign: "center" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "3px solid #eef2ff", borderTopColor: "#0F2D5E",
        margin: "0 auto 14px",
        animation: "spin 0.7s linear infinite",
      }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{label}</div>
    </div>
  );
}

export function EmptyState({ Icon, title, subtitle, action }) {
  return (
    <div className="card" style={{ padding: 60, textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "#f8fafc", display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        marginBottom: 12,
      }}>
        {Icon && <Icon size={24} color="#cbd5e1" />}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ═══════════════════════════ Filter Bar ═══════════════════════════ */
// Generic wrapper — pass search input, tabs, and extras via children-like props.
export function FilterBar({ children }) {
  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════ Segmented Tab ═══════════════════════════ */
export function SegmentedTabs({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
      {options.map(o => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 12.5,
              background: active ? "white" : "transparent",
              color: active ? "#0F2D5E" : "#64748b",
              boxShadow: active ? "0 1px 3px rgba(15,45,94,0.1)" : "none",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.12s",
            }}
          >
            {Icon && <Icon size={13} />}
            {o.label}
            {o.count !== undefined && (
              <span style={{
                fontSize: 10.5, padding: "1px 6px", borderRadius: 10, fontWeight: 700,
                background: active ? "#0F2D5E" : "#e2e8f0",
                color: active ? "#C8A951" : "#64748b",
              }}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════ Modal shell ═══════════════════════════ */
export function ActionModal({ title, subtitle, onClose, size = "md", saving = false, footer, children }) {
  const maxWidth = size === "lg" ? 680 : size === "sm" ? 400 : 540;
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div
        onClick={() => !saving && onClose && onClose()}
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
      />
      <div
        className="animate-scale-in"
        style={{
          position: "relative",
          background: "white", borderRadius: 20,
          width: "100%", maxWidth,
          maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 40px -10px rgba(15,45,94,0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{
          padding: "18px 22px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{title}</h3>
            {subtitle && (
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#94a3b8" }}>{subtitle}</p>
            )}
          </div>
          {onClose && (
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
          )}
        </div>

        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>
          {children}
        </div>

        {footer && (
          <div style={{
            padding: "14px 22px",
            borderTop: "1px solid #f1f5f9",
            background: "#f8fafc",
            display: "flex", justifyContent: "flex-end", gap: 10,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════ Confirm Modal ═══════════════════════════ */
export function ConfirmModal({ open, title, message, tone = "info", confirmLabel = "Confirm", onCancel, onConfirm, loading = false }) {
  if (!open) return null;
  const toneMap = {
    danger:  { bg: "#fff5f5", border: "#fecaca", iconColor: "#dc2626", btnBg: "#dc2626", Icon: Trash2 },
    warning: { bg: "#fffbeb", border: "#fde68a", iconColor: "#d97706", btnBg: "#0f172a", Icon: AlertTriangle },
    info:    { bg: "#eff6ff", border: "#bfdbfe", iconColor: "#2563eb", btnBg: "#0f172a", Icon: Mail },
    success: { bg: "#ecfdf5", border: "#a7f3d0", iconColor: "#059669", btnBg: "#059669", Icon: Check },
  };
  const t = toneMap[tone] || toneMap.info;
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div
        onClick={() => !loading && onCancel()}
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
      />
      <div
        className="animate-scale-in"
        style={{
          position: "relative",
          background: "white", borderRadius: 20,
          width: "100%", maxWidth: 360,
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
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: "#f1f5f9", color: "#475569", border: "none", cursor: loading ? "wait" : "pointer",
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: t.btnBg, color: "white", border: "none", cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════ Field ═══════════════════════════ */
export function Field({ label, required, children, full = false, hint }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{
        display: "block", fontSize: 12, fontWeight: 600,
        color: "#475569", marginBottom: 6,
      }}>
        {label}{required && " *"}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>{hint}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════ Form buttons ═══════════════════════════ */
export function PrimaryBtn({ onClick, disabled, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-primary"
      style={{ borderRadius: 999, opacity: disabled ? 0.7 : 1, ...style }}
    >{children}</button>
  );
}

export function GoldBtn({ onClick, disabled, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-gold"
      style={{ borderRadius: 999, opacity: disabled ? 0.7 : 1, ...style }}
    >{children}</button>
  );
}

export function GhostBtn({ onClick, disabled, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
        background: "#e2e8f0", color: "#475569", border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        display: "inline-flex", alignItems: "center", gap: 6,
        ...style,
      }}
    >{children}</button>
  );
}
