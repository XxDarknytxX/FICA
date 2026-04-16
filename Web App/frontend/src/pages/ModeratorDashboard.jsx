import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Vote, Eye, EyeOff, MessageSquare, Bell, Sliders,
  ChevronRight, RefreshCw, Megaphone, Trophy, Zap,
} from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../services/api";

/**
 * Moderator Control Center.
 *
 * A single-screen tablet-first dashboard with every live toggle the
 * moderator runs the event with:
 *
 *   • Voting open / closed
 *   • Voting results visibility
 *   • Per-panel "discussion open" toggles
 *   • A quick link into each panel's presenter view
 *   • A link into Announcements for blast-outs
 *
 * Hits `/api/event/mod-dashboard` for a single round-trip and auto-
 * refreshes every 20s. Toggles POST back individually and then re-fetch
 * so the UI is always the source of truth from the server.
 *
 * Admins can also access this page (requireAdminOrModerator on the
 * backend), so it doubles as a quick-access panel for them.
 */
export default function ModeratorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(null); // key of the row currently being toggled
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const d = await api("/event/mod-dashboard");
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
    // Poll as a cheap fallback — the WebSocket already pushes flips, but
    // if the socket drops the user shouldn't see stale toggles.
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function toggleVoting(nextOpen) {
    setBusy("voting");
    try {
      await api("/event/votes/toggle", { method: "POST", body: { open: nextOpen } });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(null); }
  }

  async function toggleResults(nextVisible) {
    setBusy("results");
    try {
      await api("/event/votes/toggle-results", { method: "POST", body: { visible: nextVisible } });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(null); }
  }

  async function togglePanel(id, nextEnabled) {
    setBusy(`panel-${id}`);
    try {
      await api(`/event/panels/${id}/discussion`, { method: "PUT", body: { enabled: nextEnabled } });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(null); }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)" }}>
          <RefreshCw size={16} className="spin" /> Loading control center...
        </div>
      </Layout>
    );
  }

  const panels = data?.panels || [];
  const pendingTotal = panels.reduce((sum, p) => sum + Number(p.pending_count || 0), 0);

  return (
    <Layout>
      {/* ─── Header row ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
            Moderator Control Center
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13.5 }}>
            Every live toggle in one place. Flip a switch to push the change to every delegate instantly.
          </p>
        </div>
        <button
          className="btn-ghost"
          onClick={load}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {err && (
        <div
          className="animate-in"
          style={{
            background: "var(--danger-soft)",
            border: "1px solid #fecaca",
            color: "var(--danger)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}

      {/* ─── Headline stats ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <StatCard icon={Trophy} label="Projects" value={data?.stats?.projects ?? 0} />
        <StatCard icon={Vote} label="Votes cast" value={data?.stats?.votes ?? 0} />
        <StatCard icon={Bell} label="Live announcements" value={data?.stats?.published_announcements ?? 0} />
        <StatCard icon={MessageSquare} label="Unread questions" value={pendingTotal} highlight={pendingTotal > 0} />
      </div>

      {/* ─── Global toggles ─────────────────────────────────────────── */}
      <SectionHeading>Global</SectionHeading>
      <div className="mod-grid" style={{ marginBottom: 26 }}>
        <ToggleCard
          icon={Vote}
          title="Voting"
          subtitle={data?.voting_open ? "Delegates can cast votes right now." : "Ballot is closed — delegates can see projects but can't vote."}
          checked={!!data?.voting_open}
          busy={busy === "voting"}
          onToggle={(v) => toggleVoting(v)}
        />
        <ToggleCard
          icon={data?.voting_results_visible ? Eye : EyeOff}
          title="Show results to delegates"
          subtitle={data?.voting_results_visible ? "Tallies and leaderboard are visible to everyone." : "Results stay hidden — admins still see the leaderboard."}
          checked={!!data?.voting_results_visible}
          busy={busy === "results"}
          onToggle={(v) => toggleResults(v)}
        />
        <QuickLinkCard
          icon={Megaphone}
          title="Post an announcement"
          subtitle="Push a message to every delegate's home screen."
          onClick={() => navigate("/announcements")}
        />
        <QuickLinkCard
          icon={Trophy}
          title="Manage projects"
          subtitle="Add, edit, or reorder the voting slate."
          onClick={() => navigate("/projects")}
        />
      </div>

      {/* ─── Per-panel controls ─────────────────────────────────────── */}
      <SectionHeading>
        Panel Discussions
        {pendingTotal > 0 && (
          <span
            style={{
              marginLeft: 10,
              padding: "2px 10px",
              background: "var(--gold)",
              color: "var(--navy-dark)",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {pendingTotal} unread
          </span>
        )}
      </SectionHeading>

      {panels.length === 0 ? (
        <div className="card" style={{ padding: 20, color: "var(--text-muted)" }}>
          No panel sessions scheduled yet.
        </div>
      ) : (
        <div className="mod-grid">
          {panels.map((p) => (
            <PanelToggleCard
              key={p.id}
              panel={p}
              busy={busy === `panel-${p.id}`}
              onToggle={(v) => togglePanel(p.id, v)}
              onOpen={() => navigate(`/panels/${p.id}/present`)}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <h2 style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "8px 0 12px", display: "flex", alignItems: "center" }}>
      {children}
    </h2>
  );
}

function StatCard({ icon: Icon, label, value, highlight = false }) {
  return (
    <div
      className="card"
      style={{
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderColor: highlight ? "rgba(200,169,81,0.5)" : undefined,
        background: highlight ? "rgba(200,169,81,0.06)" : undefined,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: highlight ? "var(--gold)" : "var(--surface-soft)",
          color: highlight ? "var(--navy-dark)" : "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.1, marginTop: 2 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function ToggleCard({ icon: Icon, title, subtitle, checked, busy, onToggle }) {
  return (
    <div className="mod-toggle-card" data-active={checked}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: checked ? "var(--gold)" : "var(--surface-soft)",
              color: checked ? "var(--navy-dark)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={17} />
          </div>
          <div className="mod-toggle-title">{title}</div>
        </div>
        <button
          className="mod-switch"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          disabled={busy}
          onClick={() => onToggle(!checked)}
        />
      </div>
      <div className="mod-toggle-sub">{subtitle}</div>
    </div>
  );
}

function QuickLinkCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      className="mod-toggle-card"
      onClick={onClick}
      style={{
        textAlign: "left",
        cursor: "pointer",
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "var(--surface-soft)",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={17} />
          </div>
          <div className="mod-toggle-title">{title}</div>
        </div>
        <ChevronRight size={18} color="var(--text-subtle)" />
      </div>
      <div className="mod-toggle-sub">{subtitle}</div>
    </button>
  );
}

function PanelToggleCard({ panel, busy, onToggle, onOpen }) {
  const enabled = !!panel.discussion_enabled;
  const pending = Number(panel.pending_count || 0);
  const total = Number(panel.question_count || 0);
  return (
    <div className="mod-toggle-card" data-active={enabled}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mod-toggle-title" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {panel.title || "Panel discussion"}
          </div>
          <div className="mod-toggle-sub" style={{ marginTop: 4 }}>
            {formatPanelTime(panel)}
          </div>
        </div>
        <button
          className="mod-switch"
          role="switch"
          aria-checked={enabled}
          aria-label={`${panel.title} discussion`}
          disabled={busy}
          onClick={() => onToggle(!enabled)}
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Pill>
          <MessageSquare size={12} /> {total} {total === 1 ? "question" : "questions"}
        </Pill>
        {pending > 0 && (
          <Pill tone="gold">
            <Zap size={12} /> {pending} unread
          </Pill>
        )}
      </div>
      <button
        className="btn-primary"
        onClick={onOpen}
        style={{ width: "100%", justifyContent: "center", marginTop: 2 }}
      >
        Open Presenter
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function Pill({ tone = "neutral", children }) {
  const bg = tone === "gold" ? "rgba(200,169,81,0.18)" : "var(--surface-soft)";
  const fg = tone === "gold" ? "#8a6d1d" : "var(--text-muted)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: bg,
        color: fg,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function formatPanelTime(p) {
  const date = p.session_date ? new Date(p.session_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : null;
  if (!date && !p.start_time) return p.room || "Scheduled";
  const time = p.start_time && p.end_time ? `${p.start_time}–${p.end_time}` : p.start_time;
  return [date, time, p.room].filter(Boolean).join(" · ");
}
