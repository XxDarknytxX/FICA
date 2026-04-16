import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Vote, Eye, EyeOff, MessageSquare, Bell, Sliders,
  ChevronRight, RefreshCw, Megaphone, Trophy, Zap, Radio, Calendar,
} from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import { useLiveSocket } from "../hooks/useLiveSocket";
import {
  LiveSwitch, LiveDot, LiveBadge, StatTile, ToggleCard, ActionCard,
  Chip, PageTitle, Spinner, SmoothCount,
} from "../components/live";

/**
 * Moderator Control Center — tablet-first single-screen dashboard.
 *
 * Renders with a single GET to /event/mod-dashboard?year=2026, then keeps
 * state live via the shared /ws subscription (voting toggles, panel
 * discussion flips, new/dismissed panel questions).
 *
 * Layout (widest first):
 *   ┌─ Hero card: event status + primary WS indicator + quick nav ──┐
 *   ├─ Stat tiles: projects / votes / announcements / unread Qs    ┤
 *   ├─ Global toggles: voting open · results visibility            ┤
 *   ├─ Per-panel cards: switch + question count + presenter link   ┤
 *   └─ Quick actions: announcements · projects                     ┘
 *
 * On ≤640px the grid collapses to one column, the hero stacks, and the
 * switches grow to full-width cards for thumb use.
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
    const t = setInterval(load, 30_000); // fallback poll — WS is primary
    return () => clearInterval(t);
  }, [load]);

  // Live sync — every server broadcast that changes dashboard state is
  // handled here. No lag between admin flips and the dashboard updating.
  const { connected } = useLiveSocket({
    voting_open_changed: (d) =>
      setData((prev) => prev ? { ...prev, voting_open: !!d.voting_open } : prev),
    voting_results_visibility_changed: (d) =>
      setData((prev) => prev ? { ...prev, voting_results_visible: !!d.voting_results_visible } : prev),
    panel_discussion_changed: (d) =>
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          panels: prev.panels.map((p) =>
            String(p.id) === String(d.session_id)
              ? { ...p, discussion_enabled: !!d.discussion_enabled }
              : p
          ),
        };
      }),
    panel_question_posted: (d) =>
      setData((prev) => {
        if (!prev || !d?.question) return prev;
        return {
          ...prev,
          panels: prev.panels.map((p) =>
            String(p.id) === String(d.question.session_id)
              ? {
                  ...p,
                  question_count: Number(p.question_count || 0) + 1,
                  pending_count: Number(p.pending_count || 0) + 1,
                }
              : p
          ),
        };
      }),
    panel_question_dismissed: (d) =>
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          panels: prev.panels.map((p) =>
            String(p.id) === String(d.session_id)
              ? {
                  ...p,
                  question_count: Math.max(0, Number(p.question_count || 0) - 1),
                }
              : p
          ),
        };
      }),
  });

  async function toggleVoting(next) {
    setBusy("voting");
    // Optimistic
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
    setData((prev) => prev ? {
      ...prev,
      panels: prev.panels.map((p) => p.id === panel.id ? { ...p, discussion_enabled: next } : p),
    } : prev);
    try {
      await api(`/event/panels/${panel.id}/discussion`, {
        method: "PUT",
        body: { enabled: next },
      });
    } catch (e) {
      setErr(e.message);
      setData((prev) => prev ? {
        ...prev,
        panels: prev.panels.map((p) => p.id === panel.id ? { ...p, discussion_enabled: !next } : p),
      } : prev);
    } finally { setBusy(null); }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", padding: 24 }}>
          <Spinner /> Loading control center...
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
        subtitle="Flip a switch to push it to every delegate instantly."
        connected={connected}
        right={
          <button
            className="btn-ghost"
            onClick={load}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {err && (
        <div
          className="animate-in"
          style={{
            background: "var(--danger-soft)",
            border: "1px solid #fecaca",
            color: "var(--danger)",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}

      {/* ─── Hero: event pulse ─────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 60%, #1a4080 100%)",
          color: "white",
          borderRadius: 18,
          padding: "24px 26px",
          marginBottom: 18,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 20,
          alignItems: "center",
          boxShadow: "var(--shadow-md)",
        }}
        className="animate-in hero-card"
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Radio size={14} color="var(--gold)" />
            <span style={{
              color: "var(--gold)", fontSize: 11, fontWeight: 800,
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              FICA Congress · Live
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.015em", lineHeight: 1.2 }}>
            {data?.voting_open ? "Voting is open" : "Voting is closed"}
            <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
              {" · "}
              {openPanelCount} of {panels.length} panels taking questions
            </span>
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <Chip icon={Trophy} tone="gold">
              {data?.stats?.projects ?? 0} projects
            </Chip>
            <Chip icon={Vote} tone="gold">
              <SmoothCount value={data?.stats?.votes ?? 0} /> votes
            </Chip>
            <Chip icon={Bell} tone="gold">
              {data?.stats?.published_announcements ?? 0} live announcements
            </Chip>
            {pendingTotal > 0 && (
              <Chip icon={Zap} tone="gold">
                <SmoothCount value={pendingTotal} /> unread questions
              </Chip>
            )}
          </div>
        </div>
        <div style={{ alignSelf: "center" }}>
          <LiveDot connected={connected} label={connected ? "LIVE" : "RECONNECTING"} />
        </div>
      </div>

      {/* ─── Stat tiles ────────────────────────────────────────────── */}
      <div className="fluid-grid tight" style={{ marginBottom: 22 }}>
        <StatTile icon={Trophy} label="Projects" value={data?.stats?.projects ?? 0} tone="navy" />
        <StatTile icon={Vote} label="Votes cast" value={<SmoothCount value={data?.stats?.votes ?? 0} />} tone="navy" />
        <StatTile icon={Bell} label="Live announcements" value={data?.stats?.published_announcements ?? 0} />
        <StatTile
          icon={MessageSquare}
          label="Unread questions"
          value={<SmoothCount value={pendingTotal} />}
          tone={pendingTotal > 0 ? "gold" : "neutral"}
          hint={pendingTotal > 0 ? "Tap a panel below to read aloud" : undefined}
        />
      </div>

      {/* ─── Global toggles ────────────────────────────────────────── */}
      <SectionHeading title="Global" />
      <div className="fluid-grid" style={{ marginBottom: 26 }}>
        <ToggleCard
          icon={Vote}
          title="Voting"
          subtitle={
            data?.voting_open
              ? "Delegates can cast votes right now."
              : "Ballot is closed — projects are visible but no one can vote."
          }
          checked={!!data?.voting_open}
          onToggle={toggleVoting}
          disabled={busy === "voting"}
          labelOn="Open"
          labelOff="Closed"
        />
        <ToggleCard
          icon={data?.voting_results_visible ? Eye : EyeOff}
          title="Show results to delegates"
          subtitle={
            data?.voting_results_visible
              ? "Tallies and leaderboard are visible to everyone."
              : "Results stay hidden — admins still see the leaderboard."
          }
          checked={!!data?.voting_results_visible}
          onToggle={toggleResults}
          disabled={busy === "results"}
          labelOn="Shown"
          labelOff="Hidden"
        />
        <ActionCard
          icon={Megaphone}
          title="Post an announcement"
          subtitle="Push a message to every delegate's home screen."
          onClick={() => navigate("/announcements")}
        />
        <ActionCard
          icon={Trophy}
          title="Manage projects"
          subtitle="Add, edit, or reorder the voting slate."
          onClick={() => navigate("/projects")}
        />
      </div>

      {/* ─── Per-panel controls ────────────────────────────────────── */}
      <SectionHeading
        title="Panel Discussions"
        right={pendingTotal > 0 && <LiveBadge count={pendingTotal} pulse />}
      />
      {panels.length === 0 ? (
        <div className="presenter-empty">
          <Calendar size={28} style={{ opacity: 0.5, margin: "0 auto 8px" }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            No panel sessions scheduled
          </div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>
            Panels with type="panel" for 2026 will appear here.
          </div>
        </div>
      ) : (
        <div className="fluid-grid wide">
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

// ─── sub-components ─────────────────────────────────────────────────────

function SectionHeading({ title, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        margin: "4px 0 12px",
        gap: 10,
      }}
    >
      <h2 style={{
        fontSize: 12,
        fontWeight: 800,
        color: "var(--text-muted)",
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        margin: 0,
      }}>
        {title}
      </h2>
      {right}
    </div>
  );
}

function PanelCard({ panel, busy, onToggle, onOpen }) {
  const enabled = !!panel.discussion_enabled;
  const total = Number(panel.question_count || 0);
  const pending = Number(panel.pending_count || 0);
  return (
    <div className="live-card" data-active={enabled || undefined}>
      <div className="live-card-head">
        <div className="live-card-head-left" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <div className="live-card-title" style={{ whiteSpace: "normal", fontSize: 15 }}>
            {panel.title || "Panel discussion"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            {formatPanelTime(panel)}
          </div>
        </div>
        <LiveSwitch
          checked={enabled}
          onChange={onToggle}
          disabled={busy}
          ariaLabel={`${panel.title} discussion`}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Chip icon={MessageSquare} compact>
          <SmoothCount value={total} /> {total === 1 ? "question" : "questions"}
        </Chip>
        {pending > 0 && (
          <Chip icon={Zap} tone="gold" compact>
            <SmoothCount value={pending} /> unread
          </Chip>
        )}
        {!enabled && (
          <Chip tone="danger" compact>Discussion closed</Chip>
        )}
      </div>

      <button
        className="btn-primary"
        onClick={onOpen}
        style={{
          width: "100%",
          justifyContent: "center",
          marginTop: 4,
          minHeight: 44,
        }}
      >
        Open Presenter <ChevronRight size={15} />
      </button>
    </div>
  );
}

function formatPanelTime(p) {
  const date = p.session_date
    ? new Date(p.session_date).toLocaleDateString(undefined, {
        weekday: "short", month: "short", day: "numeric",
      })
    : null;
  const time = p.start_time && p.end_time
    ? `${p.start_time}–${p.end_time}`
    : p.start_time;
  return [date, time, p.room].filter(Boolean).join(" · ") || "Scheduled";
}
