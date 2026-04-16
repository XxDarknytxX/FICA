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
          <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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

// Compact panel card — matches the dashboard's PanelCard visual language.
function PanelCard({ panel, toggling, showMembers, onToggleDiscussion, onManageMembers, onPresent }) {
  const enabled = !!panel.discussion_enabled;
  const qCount = Number(panel.question_count || 0);
  return (
    <div
      className={`
        bg-white border rounded-[10px] p-3.5 flex flex-col gap-2.5
        transition-colors
        ${enabled ? "border-emerald-500/40" : "border-slate-200"}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-slate-900 leading-[1.3] tracking-[-0.005em]">
            {panel.title}
          </div>
          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11.5px] text-slate-500 mt-1">
            {panel.session_date && <span>{panel.session_date}</span>}
            {panel.start_time && (
              <span className="inline-flex items-center gap-1">
                <Clock size={10} /> {panel.start_time}{panel.end_time ? `–${panel.end_time}` : ""}
              </span>
            )}
            {panel.room && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={10} /> {panel.room}
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

      {(panel.speaker_name || panel.moderator) && (
        <div className="text-[11.5px] text-slate-500 leading-[1.5] flex flex-col gap-0.5">
          {panel.speaker_name && (
            <div className="text-[#0F2D5E] font-medium inline-flex items-center gap-1.5">
              <Mic2 size={11} /> {panel.speaker_name}
            </div>
          )}
          {panel.moderator && (
            <div className="inline-flex items-center gap-1.5">
              <UserIcon size={11} /> {panel.moderator}
            </div>
          )}
        </div>
      )}

      {panel.description && (
        <div className="text-[11.5px] text-slate-400 leading-[1.5] line-clamp-2">
          {panel.description}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <LiveChip icon={MessageSquare}>
          <SmoothCount value={qCount} /> {qCount === 1 ? "question" : "questions"}
        </LiveChip>
        <LiveChip tone="navy" icon={Users}>
          {panel.member_count || 0} members
        </LiveChip>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onPresent}
          className="
            flex-1 inline-flex items-center justify-center gap-1.5
            h-9 px-3 rounded-md
            border border-slate-200 text-slate-900 text-[12.5px] font-semibold
            hover:bg-slate-50 hover:border-slate-300 transition-colors
          "
        >
          Open presenter <ChevronRight size={13} />
        </button>
        {showMembers && (
          <button
            onClick={onManageMembers}
            title="Manage panel members"
            className="
              shrink-0 w-9 h-9 rounded-md
              border border-slate-200 text-slate-600
              hover:bg-slate-50 hover:border-slate-300 transition-colors
              inline-flex items-center justify-center
            "
          >
            <UsersRound size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

