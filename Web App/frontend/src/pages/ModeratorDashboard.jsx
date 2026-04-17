import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Vote, Eye, EyeOff, MessageSquare, Bell, Trophy,
  RefreshCw, Megaphone, Zap, ChevronRight, Calendar,
} from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import { useLiveSocket } from "../hooks/useLiveSocket";
import {
  LiveSwitch, LiveDot, LiveBadge, StatTile, Chip, PageTitle, Spinner, SmoothCount,
} from "../components/live";

/**
 * Moderator Control Center.
 *
 * Restrained, data-first layout:
 *   • Compact hero row with the current event state (no navy banner).
 *   • 4-tile stat row, clean numbers, no icon noise.
 *   • Global toggles: one row, each an `.mcard` with an iOS switch.
 *   • Per-panel cards: dense grid, small switch on the right, muted
 *     time/room meta, outline "Present" button.
 */
export default function ModeratorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const d = await api("/event/mod-dashboard?year=2026");
      setData(d);
      setErr("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const { connected } = useLiveSocket({
    voting_open_changed: (d) =>
      setData((p) => p ? { ...p, voting_open: !!d.voting_open } : p),
    voting_results_visibility_changed: (d) =>
      setData((p) => p ? { ...p, voting_results_visible: !!d.voting_results_visible } : p),
    panel_discussion_changed: (d) =>
      setData((p) => p ? {
        ...p,
        panels: p.panels.map((x) =>
          String(x.id) === String(d.session_id)
            ? { ...x, discussion_enabled: !!d.discussion_enabled }
            : x
        ),
      } : p),
    panel_question_posted: (d) =>
      setData((p) => {
        if (!p || !d?.question) return p;
        return {
          ...p,
          panels: p.panels.map((x) =>
            String(x.id) === String(d.question.session_id)
              ? {
                  ...x,
                  question_count: Number(x.question_count || 0) + 1,
                  pending_count: Number(x.pending_count || 0) + 1,
                }
              : x
          ),
        };
      }),
    panel_question_dismissed: (d) =>
      setData((p) => p ? {
        ...p,
        panels: p.panels.map((x) =>
          String(x.id) === String(d.session_id)
            ? { ...x, question_count: Math.max(0, Number(x.question_count || 0) - 1) }
            : x
        ),
      } : p),
  });

  async function toggleVoting(next) {
    setBusy("voting");
    setData((p) => p ? { ...p, voting_open: next } : p);
    try {
      await api("/event/votes/toggle", { method: "POST", body: { open: next } });
    } catch (e) {
      setErr(e.message);
      setData((p) => p ? { ...p, voting_open: !next } : p);
    } finally { setBusy(null); }
  }

  async function toggleResults(next) {
    setBusy("results");
    setData((p) => p ? { ...p, voting_results_visible: next } : p);
    try {
      await api("/event/votes/toggle-results", { method: "POST", body: { visible: next } });
    } catch (e) {
      setErr(e.message);
      setData((p) => p ? { ...p, voting_results_visible: !next } : p);
    } finally { setBusy(null); }
  }

  async function togglePanel(panel, next) {
    setBusy(`panel-${panel.id}`);
    setData((p) => p ? {
      ...p,
      panels: p.panels.map((x) => x.id === panel.id ? { ...x, discussion_enabled: next } : x),
    } : p);
    try {
      await api(`/event/panels/${panel.id}/discussion`, {
        method: "PUT",
        body: { enabled: next },
      });
    } catch (e) {
      setErr(e.message);
      setData((p) => p ? {
        ...p,
        panels: p.panels.map((x) => x.id === panel.id ? { ...x, discussion_enabled: !next } : x),
      } : p);
    } finally { setBusy(null); }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center gap-2.5 text-slate-500 py-6">
          <Spinner /> Loading...
        </div>
      </Layout>
    );
  }

  const panels = data?.panels || [];
  const pendingTotal = panels.reduce((sum, p) => sum + Number(p.pending_count || 0), 0);
  const openPanelCount = panels.filter((p) => p.discussion_enabled).length;

  return (
    <Layout>
      <PageTitle
        title="Control Center"
        subtitle="Live toggles push to every delegate instantly."
        connected={connected}
        right={
          <button
            onClick={load}
            aria-label="Refresh"
            className="inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3 text-[12.5px] font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        }
      />

      {err && (
        <div className="mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          {err}
        </div>
      )}

      {/* Event state hero — tight, readable at 360px */}
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 sm:px-4 sm:py-3.5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${data?.voting_open ? "bg-emerald-500" : "bg-slate-300"}`} />
              {data?.voting_open ? "Event live" : "Event idle"}
            </div>
            <h2 className="m-0 text-[15px] sm:text-[16px] font-semibold text-slate-900 tracking-[-0.018em] leading-[1.3]">
              {data?.voting_open ? "Voting is open" : "Voting is closed"}
            </h2>
            <div className="text-[12.5px] text-slate-500 mt-1 leading-[1.4]">
              {openPanelCount} of {panels.length} panel{panels.length === 1 ? "" : "s"} taking questions
            </div>
          </div>
          {pendingTotal > 0 && (
            <div className="shrink-0">
              <Chip tone="accent" icon={Zap}>
                <SmoothCount value={pendingTotal} /> unread
              </Chip>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-2.5 grid-cols-2 md:grid-cols-4 mb-6">
        <StatTile label="Projects" value={data?.stats?.projects ?? 0} />
        <StatTile label="Votes cast" value={<SmoothCount value={data?.stats?.votes ?? 0} />} />
        <StatTile label="Announcements" value={data?.stats?.published_announcements ?? 0} hint="published" />
        <StatTile
          label="Unread questions"
          value={<SmoothCount value={pendingTotal} />}
          accent={pendingTotal > 0}
          hint={pendingTotal > 0 ? "Across all panels" : undefined}
        />
      </div>

      {/* Global toggles */}
      <SectionHeading title="Global" />
      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <ToggleRow
          icon={Vote}
          title="Voting"
          hint={data?.voting_open ? "Delegates can cast votes" : "Ballot is closed"}
          checked={!!data?.voting_open}
          onToggle={toggleVoting}
          disabled={busy === "voting"}
        />
        <ToggleRow
          icon={data?.voting_results_visible ? Eye : EyeOff}
          title="Show results"
          hint={data?.voting_results_visible ? "Tally visible to delegates" : "Hidden from delegates"}
          checked={!!data?.voting_results_visible}
          onToggle={toggleResults}
          disabled={busy === "results"}
        />
        <QuickLink
          icon={Megaphone}
          title="Announcements"
          hint="Compose & publish"
          onClick={() => navigate("/announcements")}
        />
        <QuickLink
          icon={Trophy}
          title="Projects"
          hint="Manage voting slate"
          onClick={() => navigate("/projects")}
        />
      </div>

      {/* Per-panel */}
      <div className="flex items-center justify-between mb-3">
        <SectionHeading title="Panel Discussions" inline />
        {pendingTotal > 0 && (
          <LiveBadge count={pendingTotal} tone="accent" pulse />
        )}
      </div>

      {panels.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-[10px] py-9 px-5 text-center text-slate-500">
          <Calendar size={22} className="opacity-40 mx-auto mb-2" />
          <div className="text-[13.5px] font-semibold text-slate-900">No panel sessions</div>
          <div className="text-[12px] mt-1">Panels tagged congress_year=2026 appear here.</div>
        </div>
      ) : (
        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {panels.map((p) => (
            <PanelCard
              key={p.id}
              panel={p}
              busy={busy === `panel-${p.id}`}
              onToggle={(next) => togglePanel(p, next)}
              onOpen={() => navigate(`/panels/${p.id}/present`)}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function SectionHeading({ title, inline = false }) {
  return (
    <h2 className={`
      text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] m-0
      ${inline ? "" : "mb-3"}
    `}>
      {title}
    </h2>
  );
}

function ToggleRow({ icon: Icon, title, hint, checked, onToggle, disabled }) {
  return (
    <div
      className={`
        bg-white border rounded-[10px] px-3.5 py-3 flex items-center justify-between gap-3
        transition-colors
        ${checked ? "border-emerald-500/40" : "border-slate-200"}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center shrink-0
          ${checked ? "bg-emerald-500/12 text-emerald-700" : "bg-slate-100 text-slate-500"}
        `}>
          <Icon size={15} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-900 leading-tight">{title}</div>
          <div className="text-[11.5px] text-slate-500 leading-[1.4] mt-0.5 truncate">{hint}</div>
        </div>
      </div>
      <LiveSwitch checked={checked} onChange={onToggle} disabled={disabled} ariaLabel={title} />
    </div>
  );
}

function QuickLink({ icon: Icon, title, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        bg-white border border-slate-200 rounded-[10px] px-3.5 py-3
        flex items-center justify-between gap-3 text-left
        hover:border-slate-300 hover:bg-slate-50 transition-colors
      "
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <Icon size={15} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-900 leading-tight">{title}</div>
          <div className="text-[11.5px] text-slate-500 leading-[1.4] mt-0.5 truncate">{hint}</div>
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-400 shrink-0" />
    </button>
  );
}

function PanelCard({ panel, busy, onToggle, onOpen }) {
  const enabled = !!panel.discussion_enabled;
  const total = Number(panel.question_count || 0);
  const pending = Number(panel.pending_count || 0);
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
            {panel.title || "Panel"}
          </div>
          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11.5px] text-slate-500 mt-1">
            {formatPanelMeta(panel).map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
        <LiveSwitch
          checked={enabled}
          onChange={onToggle}
          disabled={busy}
          ariaLabel={`${panel.title} discussion`}
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Chip icon={MessageSquare}>
          <SmoothCount value={total} /> {total === 1 ? "question" : "questions"}
        </Chip>
        {pending > 0 && (
          <Chip tone="accent" icon={Zap}>
            <SmoothCount value={pending} /> unread
          </Chip>
        )}
      </div>

      <button
        onClick={onOpen}
        className="
          inline-flex items-center justify-center gap-1.5
          h-9 px-3 rounded-md
          border border-slate-200 text-slate-900 text-[12.5px] font-semibold
          hover:bg-slate-50 hover:border-slate-300 transition-colors
        "
      >
        Open presenter <ChevronRight size={13} />
      </button>
    </div>
  );
}

function formatPanelMeta(p) {
  const parts = [];
  if (p.session_date) {
    parts.push(new Date(p.session_date).toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric",
    }));
  }
  if (p.start_time && p.end_time) parts.push(`${p.start_time}–${p.end_time}`);
  else if (p.start_time) parts.push(p.start_time);
  if (p.room) parts.push(p.room);
  return parts.length ? parts : ["Scheduled"];
}
