import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { api } from "../services/api";
import { ActionModal, GhostBtn, GoldBtn } from "./ui";

/**
 * Modal for assigning delegate attendees to a panel session. Opens from the
 * Agenda page's per-row "panel members" icon button. Fetches the full
 * attendee list + the current member set in parallel on mount, checkboxes
 * reflect current membership, "Save" does a single PUT that replaces the
 * set atomically on the backend.
 */
export default function PanelMembersModal({ session, onClose, onSaved }) {
  const [attendees, setAttendees] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [attData, memData] = await Promise.all([
          api("/event/attendees"),
          api(`/event/panel-members/${session.id}`),
        ]);
        setAttendees(attData.attendees || []);
        setSelected(new Set(memData.member_ids || []));
      } catch (e) {
        setErr(e.message || "Failed to load panel members");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session.id]);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true); setErr("");
    try {
      await api(`/event/panel-members/${session.id}`, {
        method: "PUT",
        body: { attendee_ids: Array.from(selected) },
      });
      onSaved?.(selected.size);
      onClose?.();
    } catch (e) {
      setErr(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const filtered = attendees.filter(a => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (a.name || "").toLowerCase().includes(q) ||
           (a.email || "").toLowerCase().includes(q) ||
           (a.organization || "").toLowerCase().includes(q);
  });

  return (
    <ActionModal
      title="Panel Members"
      subtitle={session.title}
      size="lg"
      saving={saving}
      onClose={onClose}
      footer={
        <>
          <div style={{ flex: 1, fontSize: 12, color: "#64748b" }}>
            {selected.size} selected
          </div>
          <GhostBtn onClick={onClose} disabled={saving}>Cancel</GhostBtn>
          <GoldBtn onClick={save} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </GoldBtn>
        </>
      }
    >
      {err && (
        <div style={{
          background: "#fff5f5", border: "1px solid #fecaca",
          color: "#c53030", padding: 10, borderRadius: 10,
          fontSize: 13, marginBottom: 12,
        }}>
          {err}
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: 10, padding: "8px 12px", marginBottom: 12,
      }}>
        <Search size={14} color="#94a3b8" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search attendees by name, email, or organization"
          style={{
            flex: 1, border: "none", background: "transparent",
            outline: "none", fontSize: 13, color: "#0f172a",
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          Loading attendees…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: 32, textAlign: "center", color: "#94a3b8",
          border: "1px dashed #e2e8f0", borderRadius: 12,
        }}>
          <Users size={28} style={{ opacity: 0.5 }} />
          <div style={{ marginTop: 8, fontSize: 13 }}>
            {query ? "No matches" : "No attendees registered yet"}
          </div>
        </div>
      ) : (
        <div style={{
          maxHeight: 380, overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 6,
          paddingRight: 4,
        }}>
          {filtered.map(a => {
            const checked = selected.has(a.id);
            return (
              <label
                key={a.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", cursor: "pointer",
                  background: checked ? "#f0fff4" : "#f8fafc",
                  border: `1px solid ${checked ? "#9ae6b4" : "#e2e8f0"}`,
                  borderRadius: 10,
                  transition: "background 0.12s",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(a.id)}
                  style={{ accentColor: "#48bb78", width: 16, height: 16 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                    {[a.organization, a.email].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </ActionModal>
  );
}
