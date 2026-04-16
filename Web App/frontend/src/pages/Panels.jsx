import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, MessageSquareOff, Users, Clock, MapPin,
  Mic2, User as UserIcon, UsersRound, Presentation, ChevronRight,
} from "lucide-react";
import Layout from "../components/Layout";
import PanelMembersModal from "../components/PanelMembersModal";
import { api, isModerator } from "../services/api";
import { useLiveSocket } from "../hooks/useLiveSocket";
import {
  Toast, useToast, IconBtn, LoadingState, EmptyState,
} from "../components/ui";
import {
  LiveSwitch, Chip as LiveChip, PageTitle, SmoothCount,
} from "../components/live";

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
  const navigate = useNavigate();
  // Moderators don't own panel member assignment — admins do. Hide the
  // "Manage members" icon for them so they can't open a modal that
  // would just 403.
  const showMembers = !isModerator();

  // Live sync — if an admin or another moderator flips a panel open/closed
  // (or a new question arrives), reflect it without a refresh.
  const { connected } = useLiveSocket({
    panel_discussion_changed: (d) => {
      setPanels((ps) => ps.map((p) =>
        String(p.id) === String(d.session_id)
          ? { ...p, discussion_enabled: !!d.discussion_enabled }
          : p
      ));
    },
    panel_question_posted: (d) => {
      if (!d?.question) return;
      setPanels((ps) => ps.map((p) =>
        String(p.id) === String(d.question.session_id)
          ? { ...p, question_count: Number(p.question_count || 0) + 1 }
          : p
      ));
    },
    panel_question_dismissed: (d) => {
      setPanels((ps) => ps.map((p) =>
        String(p.id) === String(d.session_id)
          ? { ...p, question_count: Math.max(0, Number(p.question_count || 0) - 1) }
          : p
      ));
    },
  });

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

      <PageTitle
        title="Panel Discussions"
        subtitle={`${panels.length} panel${panels.length === 1 ? "" : "s"} · ${openCount} open for questions`}
        connected={connected}
      />

      <div style={{ paddingBottom: 32 }}>
        {loading ? (
          <LoadingState label="Loading panels..." />
        ) : panels.length === 0 ? (
          <EmptyState
            Icon={MessageSquare}
            title="No panel sessions yet"
            subtitle="Panels appear here automatically when an Agenda session has type 'panel'."
          />
        ) : (
          <div className="fluid-grid wide">
            {panels.map((panel) => (
              <PanelCard
                key={panel.id}
                panel={panel}
                toggling={togglingId === panel.id}
                showMembers={showMembers}
                onToggleDiscussion={() => toggleDiscussion(panel)}
                onManageMembers={() => setPanelMembersFor(panel)}
                onPresent={() => navigate(`/panels/${panel.id}/present`)}
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

// Card-based panel row — replaces the old list row that didn't reflow
// well on narrow screens. Uses the shared LiveSwitch so the toggle style
// matches the dashboard + presenter view exactly.
function PanelCard({ panel, toggling, showMembers, onToggleDiscussion, onManageMembers, onPresent }) {
  const enabled = !!panel.discussion_enabled;
  const qCount = Number(panel.question_count || 0);
  return (
    <div className="live-card" data-active={enabled || undefined}>
      <div className="live-card-head">
        <div className="live-card-head-left" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <div className="live-card-title" style={{ whiteSpace: "normal", fontSize: 15 }}>
            {panel.title}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {panel.session_date && <span>{panel.session_date}</span>}
            {panel.start_time && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Clock size={11} /> {panel.start_time}{panel.end_time ? `–${panel.end_time}` : ""}
              </span>
            )}
            {panel.room && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <MapPin size={11} /> {panel.room}
              </span>
            )}
          </div>
        </div>
        <LiveSwitch
          checked={enabled}
          onChange={(next) => !toggling && onToggleDiscussion(next)}
          disabled={toggling}
          ariaLabel={`${panel.title} discussion`}
        />
      </div>

      {(panel.speaker_name || panel.moderator || panel.description) && (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 4 }}>
          {panel.speaker_name && (
            <div style={{ color: "var(--navy)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Mic2 size={12} /> {panel.speaker_name}
            </div>
          )}
          {panel.moderator && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <UserIcon size={12} /> {panel.moderator}
            </div>
          )}
          {panel.description && (
            <div style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              color: "var(--text-subtle)",
            }}>
              {panel.description}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <LiveChip icon={MessageSquare} compact>
          <SmoothCount value={qCount} /> {qCount === 1 ? "question" : "questions"}
        </LiveChip>
        <LiveChip icon={Users} compact tone="navy">
          {panel.member_count || 0} members
        </LiveChip>
        {!enabled && <LiveChip tone="danger" compact>Closed</LiveChip>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button
          className="btn-primary"
          onClick={onPresent}
          style={{ flex: 1, justifyContent: "center", minHeight: 44 }}
        >
          Open Presenter <ChevronRight size={14} />
        </button>
        {showMembers && (
          <IconBtn
            Icon={UsersRound}
            color="#0F2D5E"
            bg="#eef2ff"
            title="Manage panel members"
            onClick={onManageMembers}
          />
        )}
      </div>
    </div>
  );
}

