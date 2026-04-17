import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { X, LogOut } from "lucide-react";

/**
 * Mobile-only bottom sheet for admin nav overflow. Tapped by the "More"
 * button on BottomTabBar, slides up from the bottom with a backdrop.
 *
 * Replaces the old side-drawer sidebar on mobile, which felt like a
 * half-working desktop pattern shoehorned onto phones. A bottom sheet is
 * the native mobile idiom for secondary navigation.
 */
export default function MoreSheet({ open, onClose, sections, onLogout, role }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Close on route change — tapping a link inside should navigate AND
  // dismiss the sheet.
  useEffect(() => { onClose?.(); }, [location.pathname]); // eslint-disable-line

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`
        lg:hidden fixed inset-0 z-50 pointer-events-none
        transition-opacity duration-200
        ${open ? "pointer-events-auto" : ""}
      `}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`
          absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]
          transition-opacity duration-200
          ${open ? "opacity-100" : "opacity-0"}
        `}
      />

      {/* Sheet */}
      <div
        className={`
          absolute left-0 right-0 bottom-0
          bg-white rounded-t-[20px]
          shadow-[0_-8px_32px_-8px_rgba(15,23,42,0.3)]
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${open ? "translate-y-0" : "translate-y-full"}
        `}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
      >
        {/* Grip handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center">
              <img src="/fica-logo.svg" alt="FICA" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-slate-900">FICA Congress</div>
              <div className="text-[11px] text-slate-500">
                {role === "moderator" ? "Moderator" : "Admin"} menu
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center active:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav list — sections rendered vertically with clear headings. */}
        <div className="px-3 pb-2 max-h-[min(60vh,520px)] overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label} className="pb-1.5">
              <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em]">
                {section.label}
              </div>
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    text-[14px] font-medium
                    ${isActive
                      ? "bg-[#0F2D5E]/8 text-[#0F2D5E] font-semibold"
                      : "text-slate-700 active:bg-slate-100"}
                  `}
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Footer — sign out */}
        <div className="px-3 pt-2 pb-3 border-t border-slate-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-red-600 active:bg-red-50"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
