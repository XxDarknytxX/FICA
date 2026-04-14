import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, size = "" }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size === "lg" ? "modal-lg" : ""}`}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #e2e8f0"
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#718096", padding: 4, borderRadius: 6, display: "flex",
            alignItems: "center", justifyContent: "center"
          }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
