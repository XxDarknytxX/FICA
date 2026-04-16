import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Circle, Trash2, RefreshCw,
  MessageSquare, MessageSquareOff, Wifi, WifiOff, User as UserIcon,
} from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../services/api";

/**
 * Presenter view for a single panel's incoming questions.
 *
 * The moderator runs this on a tablet during the panel. Every delegate
 * question lands here as a big card they can read aloud, tap to mark as
 * spoken, or tap to dismiss (removes it from the public delegate feed).
 *
 * Live updates arrive over the authenticated WebSocket from the existing
 * backend broadcasts:
 *   • `panel_question_posted`       — new question submitted
 *   • `panel_question_dismissed`    — mod/admin dismissed one elsewhere
 *   • `panel_discussion_changed`    — open/close flip (keeps the header
 *                                     in sync if another admin toggles)
 */
export default function PanelPresenter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [panel, setPanel] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toggling, setToggling] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  // `panels` endpoint gives us the discussion_enabled flag for the
  // single panel we're viewing — keep it in state so the header toggle
  // stays in sync with WS broadcasts.
  const [enabled, setEnabled] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api(`/event/panels/${id}/questions`);
      setPanel(d.panel);
      setQuestions(d.questions || []);
      // Fetch the panel list to pick out the current panel's enabled
      // flag — the questions endpoint doesn't include it since a panel
      // with closed discussion still has old questions to present.
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

  // ── WebSocket live updates ──────────────────────────────────────────
  const wsRef = useRef(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    // Nginx proxies /ws to the backend, and the server requires
    // ?token=<jwt> on the upgrade URL (introduced in the security pass).
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`;
    let closed = false;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => { if (!closed) setWsConnected(false); };
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (!msg?.event) return;

      if (msg.event === "panel_question_posted" && msg.data?.question) {
        const q = msg.data.question;
        if (String(q.session_id) !== String(id)) return;
        setQuestions((prev) =>
          prev.some((x) => x.id === q.id) ? prev : [...prev, { ...q, dismissed: false }]
        );
      }
      if (msg.event === "panel_question_dismissed" && msg.data?.id) {
        if (String(msg.data.session_id) !== String(id)) return;
        setQuestions((prev) => prev.map((x) => x.id === msg.data.id ? { ...x, dismissed: true } : x));
      }
      if (msg.event === "panel_discussion_changed" && msg.data) {
        if (String(msg.data.session_id) !== String(id)) return;
        setEnabled(!!msg.data.discussion_enabled);
      }
    };

    return () => {
      closed = true;
      try { ws.close(); } catch { /* noop */ }
    };
  }, [id]);

  async function toggleDiscussion() {
    const next = !enabled;
    setToggling(true);
    setEnabled(next); // optimistic
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
    // Optimistic — server will echo back the same thing.
    setQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, moderated_at: read ? new Date().toISOString() : null } : x));
    try {
      await api(`/event/panels/questions/${q.id}/read`, {
        method: "PUT",
        body: { read },
      });
    } catch (e) {
      setErr(e.message);
      load(); // resync on failure
    }
  }

  async function dismiss(q) {
    if (!window.confirm(`Dismiss this question? It will disappear from every delegate's feed.`)) return;
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
        <div style={{ color: "var(--text-muted)", display: "inline-flex", gap: 8, alignItems: "center" }}>
          <RefreshCw size={16} className="spin" /> Loading panel...
        </div>
      </Layout>
    );
  }

  const active = questions.filter((q) => !q.dismissed);
  const unreadCount = active.filter((q) => !q.moderated_at).length;

  return (
    <Layout>
      {/* ─── Top bar ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <button
            className="btn-ghost"
            onClick={() => navigate(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px" }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              {panel?.title || "Panel"}
            </h1>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span>{active.length} {active.length === 1 ? "question" : "questions"}</span>
              {unreadCount > 0 && (
                <span style={{ color: "#8a6d1d", fontWeight: 600 }}>
                  {unreadCount} unread
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: wsConnected ? "var(--success)" : "var(--text-subtle)" }}>
                {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {wsConnected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={toggleDiscussion}
          disabled={toggling}
          style={{
            background: enabled ? "var(--success)" : "var(--danger)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            minHeight: 44,
          }}
        >
          {enabled ? <MessageSquare size={16} /> : <MessageSquareOff size={16} />}
          {enabled ? "Discussion open" : "Discussion closed"}
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

      {/* ─── Question stream ─────────────────────────────────────────── */}
      {active.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
            background: "var(--surface)",
          }}
        >
          <MessageSquare size={32} style={{ opacity: 0.4, margin: "0 auto 10px" }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            No questions yet
          </div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {enabled
              ? "Questions from delegates will appear here in real time."
              : "Open the discussion for delegates to start asking."}
          </div>
        </div>
      ) : (
        <div>
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
    </Layout>
  );
}

function PresenterCard({ q, onToggleRead, onDismiss }) {
  const read = !!q.moderated_at;
  return (
    <div className="presenter-question" data-read={read}>
      <div className="presenter-question-text">
        {q.question}
      </div>
      <div className="presenter-question-meta">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <UserIcon size={13} />
          <strong>{q.attendee_name || "Anonymous"}</strong>
          {q.attendee_org && <span>· {q.attendee_org}</span>}
        </span>
        <span>· {relTime(q.created_at)}</span>
      </div>
      <div className="presenter-question-actions">
        <button
          className="presenter-action"
          data-variant={read ? "default" : "primary"}
          onClick={onToggleRead}
          aria-pressed={read}
        >
          {read ? <Circle size={16} /> : <CheckCircle2 size={16} />}
          {read ? "Mark unread" : "Mark read"}
        </button>
        <button
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

// Lightweight relative time ("2m ago", "just now"). Intentionally not
// pulling in date-fns for three lines of formatting.
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
