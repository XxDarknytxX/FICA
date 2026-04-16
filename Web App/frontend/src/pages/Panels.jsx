import { useEffect, useState } from "react";
import {
  MessageSquare, MessageSquareOff, Users, Clock, MapPin,
  Mic2, User as UserIcon, UsersRound,
} from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import PanelMembersModal from "../components/PanelMembersModal";
import { api } from "../services/api";
import {
  Toast, useToast, IconBtn, Chip, LoadingState, EmptyState,
} from "../components/ui";

/**
 * Admin page listing every panel session with:
 *   - per-panel "Discussion Open" toggle (flips POST to PUT /event/panels/:id/discussion)
 *   - live question count
 *   - "Manage Members" button (reuses the existing PanelMembersModal)
 *
 * Mirrors the Agenda row visual language (time column + color bar +
 * content block) so the admin can scan a schedule-ordered list.
 */
export default function Panels() {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [panelMembersFor, setPanelMembersFor] = useState(null);
  const { message, show } = useToast();

  async function load() {
    try {
      const data = await api("/event/panels?year=2026");
      setPanels(data.panels || []);
    } catch (e) {
      show("error", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleDiscussion(panel) {
    const next = !panel.discussion_enabled;
    setTogglingId(panel.id);
    // Optimistic flip — if the API fails we restore from a re-fetch.
    setPanels(ps => ps.map(p => p.id === panel.id ? { ...p, discussion_enabled: next } : p));
    try {
      await api(`/event/panels/${panel.id}/discussion`, {
        method: "PUT",
        body: { enabled: next },
      });
      show("success", next ? `"${panel.title}" is now open for questions` : `"${panel.title}" is now closed`);
    } catch (e) {
      show("error", e.message);
      // Restore accurate state from server on failure.
      load();
    } finally {
      setTogglingId(null);
    }
  }

  const openCount = panels.filter(p => p.discussion_enabled).length;

  return (
    <Layout>
      <Toast message={message} />

      <PageHeader
        title="Panel Discussions"
        subtitle={`${panels.length} panel${panels.length === 1 ? "" : "s"} · ${openCount} open for questions`}
      />

      <div style={{ padding: "0 0 32px" }}>
        {loading ? (
          <LoadingState label="Loading panels..." />
        ) : panels.length === 0 ? (
          <EmptyState
            Icon={MessageSquare}
            title="No panel sessions yet"
            subtitle="Panels appear here automatically when an Agenda session has type 'panel'."
          />
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {panels.map((panel, idx) => (
              <PanelRow
                key={panel.id}
                panel={panel}
                isLast={idx === panels.length - 1}
                toggling={togglingId === panel.id}
                onToggleDiscussion={() => toggleDiscussion(panel)}
                onManageMembers={() => setPanelMembersFor(panel)}
              />
            ))}
          </div>
        )}
      </div>

      {panelMembersFor && (
        <PanelMembersModal
          session={panelMembersFor}
          onClose={() => setPanelMembersFor(null)}
          onSaved={(count) => {
            show("success", `Saved ${count} panel member${count === 1 ? "" : "s"}`);
            load();
          }}
        />
      )}
    </Layout>
  );
}

function PanelRow({ panel, isLast, toggling, onToggleDiscussion, onManageMembers }) {
  const enabled = !!panel.discussion_enabled;
  return (
    <div
      style={{
        display: "flex", gap: 14, padding: "14px 18px",
        borderBottom: isLast ? "none" : "1px solid #f1f5f9",
        alignItems: "flex-start",
        transition: "background 0.12s",
        background: enabled ? "transparent" : "#fafbfc",
      }}
    >
      {/* Date/time column */}
      <div style={{ minWidth: 88, textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
          {panel.start_time || "—"}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
          {panel.session_date || ""}
        </div>
      </div>

      {/* Color bar (teal = panel) */}
      <div style={{
        width: 3, alignSelf: "stretch", minHeight: 40,
        background: "#234e52", borderRadius: 2, flexShrink: 0,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {panel.title}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              {panel.room && (
                <span style={{ fontSize: 11, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <MapPin size={11} /> {panel.room}
                </span>
              )}
              {panel.end_time && (
                <span style={{ fontSize: 11, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <Clock size={11} /> ends {panel.end_time}
                </span>
              )}
              <Chip
                label={`${panel.question_count || 0} Q`}
                color="#0F2D5E"
                bg="#eef2ff"
                border="#c7d2fe"
                small
                uppercase={false}
              />
              <Chip
                label={`${panel.member_count || 0} Members`}
                color="#6b21a8"
                bg="#f5f3ff"
                border="#ddd6fe"
                small
                uppercase={false}
              />
            </div>
            {(panel.speaker_name || panel.moderator) && (
              <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                {panel.speaker_name && (
                  <div style={{ fontSize: 12, color: "#0F2D5E", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                    <Mic2 size={11} /> {panel.speaker_name}
                  </div>
                )}
                {panel.moderator && (
                  <div style={{ fontSize: 12, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <UserIcon size={11} /> {panel.moderator}
                  </div>
                )}
              </div>
            )}
            {panel.description && (
              <div style={{
                fontSize: 12, color: "#94a3b8", marginTop: 6, lineHeight: 1.5,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {panel.description}
              </div>
            )}
          </div>

          {/* Right-side: toggle + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <DiscussionToggle
              enabled={enabled}
              onChange={onToggleDiscussion}
              disabled={toggling}
            />
            <IconBtn
              Icon={UsersRound}
              color="#0F2D5E"
              bg="#eef2ff"
              title="Manage panel members"
              onClick={onManageMembers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * iOS-style toggle + status label pair. Click the label or the switch to
 * flip the panel open/closed.
 */
function DiscussionToggle({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      title={enabled ? "Close discussion" : "Open discussion"}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px",
        background: enabled ? "#f0fff4" : "#fff5f5",
        border: `1px solid ${enabled ? "#9ae6b4" : "#fecaca"}`,
        borderRadius: 999,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 34, height: 20, borderRadius: 999,
          background: enabled ? "#48bb78" : "#cbd5e1",
          position: "relative",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2, left: enabled ? 16 : 2,
            width: 16, height: 16, borderRadius: "50%",
            background: "white",
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            transition: "left 0.15s",
          }}
        />
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: enabled ? "#276749" : "#9b2c2c",
        textTransform: "uppercase", letterSpacing: 0.3,
      }}>
        {enabled ? "Open" : "Closed"}
      </span>
    </button>
  );
}
