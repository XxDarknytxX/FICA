import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

/**
 * Shared "live" UI primitives used by every moderator-facing page.
 *
 * The goal is one set of controls with one visual language — the same
 * chunky pill switch on the dashboard, the panels list, and the
 * presenter view; the same stat tile shape on the dashboard and the
 * projects/voting page; the same connection indicator everywhere a WS
 * feed is in play.
 *
 * Everything in this file is plain CSS-in-style — no external deps — so
 * the components drop cleanly into any of the moderator pages without
 * pulling the existing ticket-system ui.jsx along for the ride.
 */

// ─── LiveSwitch ─────────────────────────────────────────────────────────
// The canonical moderator toggle. One source of truth so the dashboard
// and the presenter view behave the same way. Optimistically flips; the
// parent is responsible for reverting on API failure.
export function LiveSwitch({
  checked,
  onChange,
  disabled = false,
  labelOn = "Open",
  labelOff = "Closed",
  size = "md",    // "sm" | "md" | "lg"
  ariaLabel,
}) {
  const metrics = {
    sm: { w: 48, h: 28, font: 10 },
    md: { w: 64, h: 36, font: 11 },
    lg: { w: 80, h: 46, font: 12 },
  }[size] || { w: 64, h: 36, font: 11 };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="live-switch"
      data-checked={checked}
      style={{
        "--w": `${metrics.w}px`,
        "--h": `${metrics.h}px`,
      }}
    >
      <span
        className="live-switch-label"
        style={{ fontSize: metrics.font }}
        aria-hidden="true"
      >
        {checked ? labelOn : labelOff}
      </span>
    </button>
  );
}

// ─── LiveDot ────────────────────────────────────────────────────────────
// Connection status pill used on any page subscribing to /ws.
export function LiveDot({ connected, label }) {
  return (
    <span
      className="live-dot"
      data-on={connected}
      title={connected ? "Live — receiving updates" : "Offline — reconnecting"}
    >
      <span className="live-dot-bulb" aria-hidden="true" />
      {label ?? (connected ? "Live" : "Offline")}
    </span>
  );
}

// ─── LiveBadge ──────────────────────────────────────────────────────────
// Rounded count chip — optional pulse animation when count > 0.
export function LiveBadge({ count, tone = "gold", pulse = true }) {
  if (!count) return null;
  return (
    <span className="live-badge" data-tone={tone} data-pulse={pulse || undefined}>
      {count}
    </span>
  );
}

// ─── StatTile ───────────────────────────────────────────────────────────
// Flat stat card used on dashboards. Accepts an icon + label + number.
export function StatTile({ icon: Icon, label, value, tone = "neutral", hint }) {
  return (
    <div className="stat-tile" data-tone={tone}>
      <div className="stat-tile-icon">
        {Icon && <Icon size={18} strokeWidth={2} />}
      </div>
      <div className="stat-tile-body">
        <div className="stat-tile-label">{label}</div>
        <div className="stat-tile-value">{value}</div>
        {hint && <div className="stat-tile-hint">{hint}</div>}
      </div>
    </div>
  );
}

// ─── ToggleCard ─────────────────────────────────────────────────────────
// The chunky toggle card used for voting / panel discussion switches on
// the moderator dashboard. `action` lets you stack a button below.
export function ToggleCard({
  icon: Icon,
  title,
  subtitle,
  checked,
  onToggle,
  disabled = false,
  labelOn = "Open",
  labelOff = "Closed",
  children,                     // optional action area below the subtitle
}) {
  return (
    <div className="live-card" data-active={checked || undefined}>
      <div className="live-card-head">
        <div className="live-card-head-left">
          {Icon && (
            <div className="live-card-icon">
              <Icon size={18} strokeWidth={2} />
            </div>
          )}
          <div className="live-card-title">{title}</div>
        </div>
        <LiveSwitch
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          labelOn={labelOn}
          labelOff={labelOff}
          ariaLabel={title}
        />
      </div>
      {subtitle && <div className="live-card-sub">{subtitle}</div>}
      {children}
    </div>
  );
}

// ─── ActionCard ─────────────────────────────────────────────────────────
// Card that behaves like a button (quick link).
export function ActionCard({ icon: Icon, title, subtitle, onClick, badge }) {
  return (
    <button type="button" className="live-card live-card-action" onClick={onClick}>
      <div className="live-card-head">
        <div className="live-card-head-left">
          {Icon && (
            <div className="live-card-icon">
              <Icon size={18} strokeWidth={2} />
            </div>
          )}
          <div className="live-card-title">{title}</div>
        </div>
        <ChevronRightIcon />
      </div>
      {subtitle && <div className="live-card-sub">{subtitle}</div>}
      {badge && <div className="live-card-badge-row">{badge}</div>}
    </button>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Chip ───────────────────────────────────────────────────────────────
// Small label chip (e.g. "12 questions", "3 unread", "Day 1").
export function Chip({ children, tone = "neutral", icon: Icon, compact = false }) {
  return (
    <span className="live-chip" data-tone={tone} data-compact={compact || undefined}>
      {Icon && <Icon size={compact ? 11 : 12} strokeWidth={2.2} />}
      {children}
    </span>
  );
}

// ─── PageTitle ──────────────────────────────────────────────────────────
// Standard page header used on every moderator + admin page. Accepts a
// live dot + right-aligned action slot.
export function PageTitle({ title, subtitle, right, connected }) {
  return (
    <div className="page-title">
      <div className="page-title-left">
        <h1 className="page-title-h1">
          {title}
          {typeof connected === "boolean" && (
            <LiveDot connected={connected} />
          )}
        </h1>
        {subtitle && <p className="page-title-sub">{subtitle}</p>}
      </div>
      {right && <div className="page-title-right">{right}</div>}
    </div>
  );
}

// ─── Spinner + inline loader ────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return (
    <RefreshCw
      size={size}
      strokeWidth={2}
      style={{ animation: "spin 0.8s linear infinite" }}
      aria-hidden="true"
    />
  );
}

// ─── Smooth-count ──────────────────────────────────────────────────────
// Animates a number change with a brief pulse. Feels more "live" than a
// hard swap when a toggle flips or a question count bumps.
export function SmoothCount({ value }) {
  const [display, setDisplay] = useState(value);
  const [bumped, setBumped] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setDisplay(value);
    setBumped(true);
    const t = setTimeout(() => setBumped(false), 380);
    return () => clearTimeout(t);
  }, [value]);
  return <span className="smooth-count" data-bumped={bumped || undefined}>{display}</span>;
}

export { Wifi, WifiOff };
