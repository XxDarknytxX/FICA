import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Circle, Trash2, RefreshCw,
  MessageSquare, MessageSquareOff, User as UserIcon,
  Clock, Radio, Eye,
} from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import { useLiveSocket } from "../hooks/useLiveSocket";
import {
  LiveSwitch, LiveDot, LiveBadge, Chip, Spinner, SmoothCount,
} from "../components/live";

/**
 * Panel Presenter view — the moderator runs this on a tablet during a
 * panel session. Questions stream in from delegates, moderator reads
 * them aloud, taps Mark Read (strike-through) or Dismiss (soft delete
 * from every feed).
 *
 * Redesigned to:
 *   • Share the same LiveSwitch used on the dashboard + Panels list, so
 *     "the toggle inside vs outside the presenter" finally behaves the
 *     same way and pushes flips over WS to every viewer.
 *   • Use a navy hero banner with a big connected LiveDot — makes the
 *     "are we actually live?" answer obvious from across the stage.
 *   • Sort oldest-first so reading flows chronologically; unread ones
 *     get a gold border + highlight.
 *   • Full-width action buttons at mobile widths.
 */
export default function PanelPresenter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [panel, setPanel] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toggling, setToggling] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api(`/event/panels/${id}/questions`);
      setPanel(d.panel);
      setQuestions(d.questions || []);
      const pl = await api("/event/panels");
      const me = (pl.panels || []).find((p) => String(p.id) === String(id));
      if (me) setEnabled(!!me.discussion_enabled);
      setErr("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const { connected } = useLiveSocket({
    panel_question_posted: (d) => {
      if (!d?.question || String(d.question.session_id) !== String(id)) return;
      setQuestions((prev) =>
        prev.some((x) => x.id === d.question.id)
          ? prev
          : [...prev, { ...d.question, dismissed: false }]
      );
    },
    panel_question_dismissed: (d) => {
      if (String(d.session_id) !== String(id)) return;
      setQuestions((prev) => prev.map((x) => x.id === d.id ? { ...x, dismissed: true } : x));
    },
    panel_discussion_changed: (d) => {
      if (String(d.session_id) !== String(id)) return;
      setEnabled(!!d.discussion_enabled);
    },
  });

  async function toggleDiscussion(next) {
    setToggling(true);
    setEnabled(next);
    try {
      await api(`/event/panels/${id}/discussion`, {
        method: "PUT",
        body: { enabled: next },
      });
    } catch (e) {
      setErr(e.message);
      setEnabled(!next);
    } finally {
      setToggling(false);
    }
  }

  async function markRead(q, read) {
    setQuestions((prev) => prev.map((x) =>
      x.id === q.id
        ? { ...x, moderated_at: read ? new Date().toISOString() : null }
        : x
    ));
    try {
      await api(`/event/panels/questions/${q.id}/read`, {
        method: "PUT",
        body: { read },
      });
    } catch (e) {
      setErr(e.message);
      load();
    }
  }

  async function dismiss(q) {
    if (!window.confirm("Dismiss this question? It will disappear from every delegate's feed.")) return;
    setQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, dismissed: true } : x));
    try {
      await api(`/event/panels/questions/${q.id}`, { method: "DELETE" });
    } catch (e) {
      setErr(e.message);
      load();
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "var(--text-muted)" }}>
          <Spinner /> Loading panel...
        </div>
      </Layout>
    );
  }

  const active = questions.filter((q) => !q.dismissed);
  const unreadCount = active.filter((q) => !q.moderated_at).length;

  return (
    <Layout>
      <div className="presenter-shell">
        {/* ─── Back button row ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px" }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ color: "var(--text-subtle)", fontSize: 12.5 }}>
            Panel presenter mode
          </div>
        </div>

        {/* ─── Hero banner ─────────────────────────────────────────── */}
        <div className="presenter-hero">
          <div>
            <div className="presenter-hero-eyebrow">
              <Radio size={13} color="var(--gold)" />
              Live stream · Panel Q&amp;A
            </div>
            <h1 className="presenter-hero-title">
              {panel?.title || "Panel"}
            </h1>
            <div className="presenter-hero-meta">
              <LiveDot connected={connected} label={connected ? "LIVE" : "RECONNECTING"} />
              <Chip icon={MessageSquare} tone="gold">
                <SmoothCount value={active.length} />{" "}
                {active.length === 1 ? "question" : "questions"}
              </Chip>
              {unreadCount > 0 && (
                <Chip icon={Eye} tone="gold">
                  <SmoothCount value={unreadCount} /> unread
                </Chip>
              )}
            </div>
          </div>
          <div className="presenter-hero-toggle">
            <span className="presenter-hero-toggle-label">Discussion</span>
            <LiveSwitch
              checked={enabled}
              onChange={toggleDiscussion}
              disabled={toggling}
              size="lg"
              labelOn="Open"
              labelOff="Closed"
              ariaLabel="Panel discussion"
            />
          </div>
        </div>

        {err && (
          <div
            className="animate-in"
            style={{
              background: "var(--danger-soft)",
              border: "1px solid #fecaca",
              color: "var(--danger)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        {/* ─── Question stream ─────────────────────────────────────── */}
        {active.length === 0 ? (
          <div className="presenter-empty">
            <MessageSquare size={32} style={{ opacity: 0.4, margin: "0 auto 8px" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              No questions yet
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {enabled
                ? "Questions from delegates appear here in real time."
                : "Open the discussion for delegates to start asking."}
            </div>
          </div>
        ) : (
          <div className="presenter-stream">
            {active.map((q) => (
              <PresenterCard
                key={q.id}
                q={q}
                onToggleRead={() => markRead(q, !q.moderated_at)}
                onDismiss={() => dismiss(q)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function PresenterCard({ q, onToggleRead, onDismiss }) {
  const read = !!q.moderated_at;
  return (
    <div className="presenter-question" data-read={read || undefined} data-unread={!read || undefined}>
      <div className="presenter-question-text">“{q.question}”</div>
      <div className="presenter-question-meta">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <UserIcon size={13} />
          <strong style={{ color: "var(--text)" }}>{q.attendee_name || "Anonymous"}</strong>
          {q.attendee_org && <span>· {q.attendee_org}</span>}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Clock size={12} /> {relTime(q.created_at)}
        </span>
        {read && <Chip tone="success" compact>Marked read</Chip>}
      </div>
      <div className="presenter-question-actions">
        <button
          type="button"
          className="presenter-action"
          data-variant={read ? "ghost" : "primary"}
          onClick={onToggleRead}
          aria-pressed={read}
        >
          {read ? <Circle size={16} /> : <CheckCircle2 size={16} />}
          {read ? "Mark unread" : "Mark read"}
        </button>
        <button
          type="button"
          className="presenter-action"
          data-variant="danger"
          onClick={onDismiss}
          title="Remove this question from every delegate's feed"
        >
          <Trash2 size={16} />
          Dismiss
        </button>
      </div>
    </div>
  );
}

function relTime(iso) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 90) return "1m ago";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 5400) return "1h ago";
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleString();
}
