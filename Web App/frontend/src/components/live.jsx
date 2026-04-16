import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Shared primitives for the moderator + admin surface.
 *
 * Tailwind-only (v4). Restrained, data-first: no drop-shadows, 1px
 * borders, small type, compact spacing. The iOS-style LiveSwitch has
 * no text inside — the pill colour + thumb position communicate state.
 */

// ─── LiveSwitch — classic iOS pill ────────────────────────────────────
export function LiveSwitch({
  checked,
  onChange,
  disabled = false,
  size = "md",   // "sm" | "md"
  ariaLabel,
}) {
  const sm = size === "sm";
  const track = sm ? "w-8 h-[18px]" : "w-10 h-[22px]";
  const thumb = sm
    ? "w-[14px] h-[14px] data-[on]:translate-x-[14px]"
    : "w-[18px] h-[18px] data-[on]:translate-x-[18px]";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      data-on={checked || undefined}
      className={`
        relative inline-flex shrink-0 items-center rounded-full p-[2px]
        ${track}
        bg-slate-300 data-[on]:bg-emerald-500
        transition-colors duration-200
        disabled:opacity-45 disabled:cursor-not-allowed
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500
      `}
    >
      <span
        data-on={checked || undefined}
        className={`
          block rounded-full bg-white shadow-[0_1px_2px_rgb(15_23_42/0.2)]
          transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${thumb}
        `}
      />
    </button>
  );
}

// ─── LiveDot — connection indicator ────────────────────────────────────
export function LiveDot({ connected, label }) {
  return (
    <span
      title={connected ? "Receiving live updates" : "Reconnecting..."}
      className={`
        inline-flex items-center gap-1.5 px-2 py-[2px] rounded-full
        text-[11px] font-semibold align-middle
        ${connected
          ? "bg-emerald-500/12 text-emerald-700"
          : "bg-slate-500/10 text-slate-500"}
      `}
    >
      <span className="relative w-1.5 h-1.5 rounded-full bg-current shrink-0">
        {connected && (
          <span className="absolute -inset-[3px] rounded-full bg-current opacity-50 animate-live-pulse" />
        )}
      </span>
      {label ?? (connected ? "Live" : "Offline")}
    </span>
  );
}

// ─── LiveBadge ─────────────────────────────────────────────────────────
export function LiveBadge({ count, tone = "accent", pulse = false }) {
  if (!count) return null;
  const toneCls = {
    accent: "bg-[#C8A951] text-[#091f42]",
    navy:   "bg-[#0F2D5E] text-white",
    danger: "bg-red-500 text-white",
  }[tone];
  return (
    <span
      className={`
        inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5
        rounded-full text-[10.5px] font-bold leading-none
        ${toneCls}
        ${pulse ? "shadow-[0_0_0_0_rgb(200_169_81/0.55)] animate-pulse" : ""}
      `}
    >
      {count}
    </span>
  );
}

// ─── Chip — small muted label ──────────────────────────────────────────
export function Chip({ children, tone = "neutral", icon: Icon }) {
  const toneCls = {
    neutral: "bg-slate-100 text-slate-600",
    accent:  "bg-[#C8A951]/15 text-[#8a6d1d]",
    navy:    "bg-[#0F2D5E]/8 text-[#0F2D5E]",
    success: "bg-emerald-500/12 text-emerald-700",
    danger:  "bg-red-500/12 text-red-700",
    muted:   "bg-transparent text-slate-400 px-0",
  }[tone] || "bg-slate-100 text-slate-600";
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-[2px] rounded-md
        text-[11.5px] font-medium leading-[1.5] whitespace-nowrap
        ${toneCls}
      `}
    >
      {Icon && <Icon size={11} strokeWidth={2.2} />}
      {children}
    </span>
  );
}

// ─── StatTile ──────────────────────────────────────────────────────────
export function StatTile({ label, value, hint, accent = false }) {
  return (
    <div
      className={`
        bg-white border rounded-[10px] p-[12px_14px]
        ${accent
          ? "border-[#C8A951]/50 bg-gradient-to-b from-[#C8A951]/5 to-transparent"
          : "border-slate-200"}
      `}
    >
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="text-[22px] font-bold text-slate-900 leading-[1.15] mt-[2px] tracking-[-0.02em]">
        {value}
      </div>
      {hint && <div className="text-[11px] text-slate-400 mt-[3px] leading-[1.4]">{hint}</div>}
    </div>
  );
}

// ─── PageTitle ─────────────────────────────────────────────────────────
export function PageTitle({ title, subtitle, right, connected }) {
  return (
    <div className="flex items-start justify-between gap-[14px] mb-[18px] flex-wrap">
      <div className="min-w-0 flex-1">
        <h1 className="m-0 text-[19px] font-bold tracking-[-0.018em] text-slate-900 leading-[1.25] flex items-center gap-[10px] flex-wrap">
          {title}
          {typeof connected === "boolean" && <LiveDot connected={connected} />}
        </h1>
        {subtitle && (
          <p className="mt-[4px] text-slate-500 text-[13px] leading-[1.5]">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  );
}

// ─── SmoothCount — subtle bump on value change ────────────────────────
export function SmoothCount({ value }) {
  const [display, setDisplay] = useState(value);
  const [key, setKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setDisplay(value);
    setKey((k) => k + 1);
  }, [value]);
  return (
    <span key={key} className="inline-block animate-count-bump">
      {display}
    </span>
  );
}

export function Spinner({ size = 14 }) {
  return (
    <RefreshCw
      size={size}
      strokeWidth={2}
      style={{ animation: "spin 0.8s linear infinite" }}
      aria-hidden="true"
    />
  );
}
