import { NavLink, useLocation } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";

/**
 * Mobile-only bottom tab bar — like the floating pill on Android/iOS.
 *
 * Appears at every viewport < `lg` (1024px). Hidden on desktop where the
 * sidebar provides navigation. Tabs are role-aware (passed in from the
 * parent); admins get a trailing "More" button that opens the drawer
 * for the tabs that don't fit.
 */
export default function BottomTabBar({ tabs, onMore, role }) {
  const location = useLocation();
  if (!tabs?.length) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="
        lg:hidden fixed bottom-0 left-0 right-0 z-40
        bg-white/95 backdrop-blur-md border-t border-slate-200
      "
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1 max-w-[640px] mx-auto">
        {tabs.map((tab) => {
          const active = isActive(location.pathname, tab.to);
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-1.5 px-1 rounded-lg
                transition-colors select-none
                ${active ? "text-[#0F2D5E]" : "text-slate-400 hover:text-slate-600 active:text-slate-700"}
              `}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span
                className={`
                  text-[10px] leading-none tracking-[0.01em]
                  ${active ? "font-bold" : "font-medium"}
                `}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}

        {role === "admin" && onMore && (
          <button
            type="button"
            onClick={onMore}
            className="
              flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-1.5 px-1 rounded-lg
              transition-colors select-none
              text-slate-400 hover:text-slate-600 active:text-slate-700
              bg-transparent border-0 cursor-pointer
            "
            aria-label="Open full menu"
          >
            <MoreHorizontal size={20} strokeWidth={2} />
            <span className="text-[10px] leading-none font-medium tracking-[0.01em]">
              More
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}

/** Treat partial-path matches as active (e.g. /panels/5/present still lights Panels). */
function isActive(pathname, to) {
  if (pathname === to) return true;
  if (to === "/") return false;
  return pathname.startsWith(to + "/");
}
