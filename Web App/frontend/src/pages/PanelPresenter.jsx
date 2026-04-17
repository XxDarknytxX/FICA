import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Circle, Trash2, Eye,
  MessageSquare, User as UserIcon, Clock,
} from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import { useLiveSocket } from "../hooks/useLiveSocket";
import { LiveSwitch, LiveDot, Spinner, SmoothCount } from "../components/live";

/**
 * Panel Presenter — the moderator reads questions aloud from this view.
 *
 * Restrained hero (white card, 1px border) so the question list is the
 * focus. The discussion toggle on the hero is the same `LiveSwitch` used
 * on the dashboard and the Panels list — one component, one WS feed.
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
      x.id === q.id ? { ...x, moderated_at: read ? new Date().toISOString() : null } : x
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
        <div className="inline-flex items-center gap-2 text-slate-500">
          <Spinner /> Loading panel...
        </div>
      </Layout>
    );
  }

  const active = questions.filter((q) => !q.dismissed);
  const unreadCount = active.filter((q) => !q.moderated_at).length;

  return (
    <Layout>
      <div className="flex flex-col gap-2.5">
        {/* Back — icon-only on mobile to save vertical space. */}
        <div className="flex items-center gap-2 -mt-1">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex items-center justify-center gap-1.5 w-8 h-8 sm:w-auto sm:px-2.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-[12.5px] font-medium"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>

        {/* ─── Compact hero — two lines on mobile ────────────────────
            Row 1: Title + LiveSwitch (right).
            Row 2: LiveDot · question count · unread count (all chips).
            The old hero had a full text block on the left + a stacked
            text+switch column on the right which wrapped awkwardly on
            narrow widths. This one stays on 2 lines at any viewport. */}
        <div className="bg-white border border-slate-200 rounded-xl px-3.5 sm:px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="m-0 text-[15px] sm:text-[17px] font-bold text-slate-900 tracking-[-0.018em] leading-[1.3] min-w-0 flex-1">
              {panel?.title || "Panel"}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-[11px] font-semibold text-slate-500">
                {enabled ? "Open" : "Closed"}
              </span>
              <LiveSwitch
                checked={enabled}
                onChange={toggleDiscussion}
                disabled={toggling}
                ariaLabel="Panel discussion"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
            <LiveDot connected={connected} />
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-[11.5px] font-medium text-slate-500 inline-flex items-center gap-1">
              <MessageSquare size={11} />
              <SmoothCount value={active.length} /> {active.length === 1 ? "question" : "questions"}
            </span>
            {unreadCount > 0 && (
              <>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-[11.5px] font-semibold text-[#8a6d1d] inline-flex items-center gap-1">
                  <Eye size={11} />
                  <SmoothCount value={unreadCount} /> unread
                </span>
              </>
            )}
          </div>
        </div>

        {err && (
          <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
            {err}
          </div>
        )}

        {/* Stream */}
        {active.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-[10px] py-10 px-5 text-center text-slate-500">
            <MessageSquare size={24} className="opacity-40 mx-auto mb-2" />
            <div className="text-[13.5px] font-semibold text-slate-900">No questions yet</div>
            <div className="text-[12px] mt-1">
              {enabled ? "Questions appear here in real time." : "Open the discussion to accept questions."}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((q) => (
              <QuestionCard
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

function QuestionCard({ q, onToggleRead, onDismiss }) {
  const read = !!q.moderated_at;
  return (
    <div
      className={`
        rounded-[10px] border px-3.5 sm:px-4 py-3 transition-colors
        ${read
          ? "bg-slate-50/60 border-slate-200 opacity-70"
          : "bg-white border-[#C8A951]/55"}
      `}
    >
      {/* Meta row — compact attribution + timestamp */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1.5">
        <UserIcon size={11} className="shrink-0" />
        <span className="text-slate-900 font-semibold truncate">
          {q.attendee_name || "Anonymous"}
        </span>
        {q.attendee_org && (
          <span className="text-slate-400 truncate">· {q.attendee_org}</span>
        )}
        <span className="ml-auto shrink-0 text-slate-400 inline-flex items-center gap-0.5">
          <Clock size={10} /> {relTime(q.created_at)}
        </span>
      </div>

      {/* The question itself — responsive size so it's comfortable on a
          phone but big enough to read aloud from a tablet. `break-words`
          handles long URLs / jargon without blowing up the layout. */}
      <p
        className={`
          m-0 text-[14.5px] sm:text-[15.5px] leading-[1.5] font-medium tracking-[-0.005em] break-words
          ${read ? "text-slate-500 line-through decoration-slate-400 decoration-1" : "text-slate-900"}
        `}
      >
        {q.question}
      </p>

      {/* Actions — compact, icon-forward, equal-width on mobile so the
          two buttons split the row cleanly instead of wrapping. */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onToggleRead}
          className={`
            flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5
            h-9 px-3 rounded-md text-[12.5px] font-semibold
            transition-colors
            ${read
              ? "border border-slate-200 bg-white text-slate-700 active:bg-slate-50"
              : "bg-[#C8A951] border border-[#a88a38] text-[#091f42] active:bg-[#a88a38] active:text-white"}
          `}
        >
          {read ? <Circle size={14} /> : <CheckCircle2 size={14} />}
          {read ? "Unread" : "Mark read"}
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="
            w-9 h-9 sm:w-auto sm:px-3 inline-flex items-center justify-center gap-1.5
            rounded-md border border-slate-200 bg-white text-red-600 text-[12.5px] font-semibold
            active:bg-red-50 active:border-red-200 transition-colors
          "
          title="Dismiss"
        >
          <Trash2 size={14} />
          <span className="hidden sm:inline">Dismiss</span>
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
