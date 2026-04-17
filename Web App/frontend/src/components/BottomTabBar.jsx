import { useRef, useLayoutEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";

/**
 * Floating glass-pill bottom nav — modelled on the Android app's
 * FloatingGlassTabBar. A rounded-full white pill sits above the system
 * nav bar with a sliding gold indicator that animates across as the
 * user taps between tabs.
 *
 * Only rendered under `lg` (1024px) — desktop uses the sidebar.
 */
export default function BottomTabBar({ tabs, onMore, role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });

  // All renderable tabs (primary + optional More button).
  const items = [
    ...(tabs || []).map((t) => ({ kind: "tab", ...t })),
    ...(role === "admin" && onMore
      ? [{ kind: "more", icon: MoreHorizontal, label: "More", onClick: onMore, to: null }]
      : []),
  ];

  // Position the sliding indicator behind whichever tab matches the
  // current route. Re-runs on every pathname change and on window
  // resize so the indicator stays put through rotation / dev-tools.
  useLayoutEffect(() => {
    const activeIdx = items.findIndex((it) => it.kind === "tab" && isActive(location.pathname, it.to));
    if (activeIdx < 0) {
      setIndicator((p) => ({ ...p, visible: false }));
      return;
    }
    const el = itemRefs.current[activeIdx];
    const container = containerRef.current;
    if (!el || !container) return;
    const elBox = el.getBoundingClientRect();
    const contBox = container.getBoundingClientRect();
    setIndicator({
      left: elBox.left - contBox.left,
      width: elBox.width,
      visible: true,
    });
  }, [location.pathname, items.length]);

  if (!items.length) return null;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="px-3 pb-3 pt-2 flex justify-center pointer-events-none">
        <nav
          ref={containerRef}
          aria-label="Mobile navigation"
          className="
            relative pointer-events-auto
            bg-white/90 backdrop-blur-xl
            border border-slate-200/80
            rounded-full
            shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18),0_2px_6px_-1px_rgba(15,23,42,0.08)]
            flex items-center
            p-1.5
          "
        >
          {/* Sliding active-tab indicator — inset to match the 6dp nav
              padding so the pill sits nicely around each circular icon. */}
          {indicator.visible && (
            <div
              aria-hidden="true"
              className="absolute top-1.5 bottom-1.5 rounded-full bg-gradient-to-b from-[#0F2D5E] to-[#1a4080] shadow-[0_2px_8px_rgba(15,45,94,0.35)] transition-[left,width] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}

          {items.map((it, i) => {
            const Icon = it.icon;
            const active = it.kind === "tab" && isActive(location.pathname, it.to);
            // Icons-only bar: each item is a compact square tap target.
            // Tooltip + aria-label carry the name for accessibility even
            // though the visible label is gone.
            const base = `
              relative z-10 flex items-center justify-center
              w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full
              transition-colors duration-200 select-none
              ${active ? "text-[#C8A951]" : "text-slate-500 active:text-slate-700"}
            `;
            const handleClick = (e) => {
              if (it.kind === "more") {
                e.preventDefault();
                it.onClick?.();
              }
            };
            if (it.kind === "more") {
              return (
                <button
                  key="__more"
                  ref={(el) => (itemRefs.current[i] = el)}
                  type="button"
                  onClick={handleClick}
                  className={base + " bg-transparent border-0 cursor-pointer"}
                  aria-label="Open full menu"
                  title="More"
                >
                  <Icon size={21} strokeWidth={2} />
                </button>
              );
            }
            return (
              <NavLink
                key={it.to}
                ref={(el) => (itemRefs.current[i] = el)}
                to={it.to}
                end={it.end}
                className={base}
                aria-label={it.label}
                title={it.label}
              >
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function isActive(pathname, to) {
  if (!to) return false;
  if (pathname === to) return true;
  if (to === "/") return false;
  return pathname.startsWith(to + "/");
}
