import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Calendar, Clock, MapPin, Users,
  User as UserIcon, Mic2, UsersRound,
} from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import PanelMembersModal from "../components/PanelMembersModal";
import { api } from "../services/api";
import {
  Toast, useToast, StatCard, IconBtn, Chip, SegmentedTabs,
  LoadingState, EmptyState, ActionModal, ConfirmModal,
  Field, GhostBtn, GoldBtn,
} from "../components/ui";

const SESSION_TYPES = [
  "keynote", "panel", "workshop", "break",
  "networking", "registration", "lunch", "ceremony", "awards",
];

const TYPE_STYLES = {
  keynote:       { color: "#92620c", bg: "#fef9e7", border: "#f6d860" },
  panel:         { color: "#234e52", bg: "#e6fffa", border: "#9ae6b4" },
  workshop:      { color: "#2c5282", bg: "#ebf8ff", border: "#bee3f8" },
  break:         { color: "#64748b", bg: "#f8fafc", border: "#cbd5e1" },
  networking:    { color: "#6b21a8", bg: "#f5f3ff", border: "#ddd6fe" },
  registration:  { color: "#c53030", bg: "#fff5f5", border: "#fecaca" },
  lunch:         { color: "#276749", bg: "#f0fff4", border: "#9ae6b4" },
  ceremony:      { color: "#0F2D5E", bg: "#eef2ff", border: "#c7d2fe" },
  awards:        { color: "#C8A951", bg: "#fef9e7", border: "#f6d860" },
};

const EMPTY = {
  title: "", description: "", start_time: "", end_time: "",
  session_date: "2026-05-08", room: "", type: "keynote",
  speaker_id: "", moderator: "", capacity: "", display_order: 0,
};

export default function Agenda() {
  const [sessions, setSessions] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState("2026-05-08");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // Session whose panel members are being edited. null = modal closed.
  const [panelMembersFor, setPanelMembersFor] = useState(null);
  const { message, show } = useToast();

  async function load() {
    try {
      const [sessData, spkData] = await Promise.all([
        api("/event/sessions"),
        api("/event/speakers"),
      ]);
      setSessions(sessData.sessions || []);
      setSpeakers(spkData.speakers || []);
    } catch (e) {
      show("error", e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openAdd() {
    setModal({ form: { ...EMPTY, session_date: activeDay }, editId: null });
  }
  function openEdit(s) {
    setModal({
      form: {
        title: s.title || "", description: s.description || "",
        start_time: s.start_time || "", end_time: s.end_time || "",
        session_date: String(s.session_date).split("T")[0],
        room: s.room || "", type: s.type || "keynote",
        speaker_id: s.speaker_id || "", moderator: s.moderator || "",
        capacity: s.capacity || "", display_order: s.display_order || 0,
      },
      editId: s.id,
    });
  }
  function closeModal() { if (!saving) setModal(null); }
  function setField(k, v) { setModal(m => ({ ...m, form: { ...m.form, [k]: v } })); }

  async function save() {
    if (!modal.form.title.trim()) return show("error", "Title is required");
    if (!modal.form.start_time || !modal.form.end_time) return show("error", "Start and end times are required");
    setSaving(true);
    try {
      const payload = {
        ...modal.form,
        speaker_id: modal.form.speaker_id || null,
        capacity: modal.form.capacity ? parseInt(modal.form.capacity) : null,
      };
      if (modal.editId) {
        await api(`/event/sessions/${modal.editId}`, { method: "PUT", body: payload });
        show("success", `${modal.form.title} updated`);
      } else {
        await api("/event/sessions", { method: "POST", body: payload });
        show("success", `${modal.form.title} added`);
      }
      setModal(null);
      await load();
    } catch (e) {
      show("error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api(`/event/sessions/${deleteConfirm.id}`, { method: "DELETE" });
      show("success", `"${deleteConfirm.title}" deleted`);
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      show("error", e.message);
    } finally {
      setDeleting(false);
    }
  }

  const daySessions = sessions
    .filter(s => String(s.session_date).startsWith(activeDay))
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  const day1Count = sessions.filter(s => String(s.session_date).startsWith("2026-05-08")).length;
  const day2Count = sessions.filter(s => String(s.session_date).startsWith("2026-05-09")).length;
  const keynotes = sessions.filter(s => s.type === "keynote").length;

  return (
    <Layout>
      <div style={{ padding: "8px 0 28px" }} className="animate-in">
        <PageHeader
          title="Agenda"
          subtitle="Schedule and sessions for FICA Congress 2026"
          action={
            <GoldBtn onClick={openAdd}>
              <Plus size={15} /> Add Session
            </GoldBtn>
          }
        />

        <Toast message={message} />

        {/* Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12, marginBottom: 16,
        }}>
          <StatCard label="Total Sessions" value={sessions.length} icon={Calendar} color="#0F2D5E" />
          <StatCard label="Day 1" value={day1Count} icon={Clock} color="#2c5282" sub="Friday 8 May" />
          <StatCard label="Day 2" value={day2Count} icon={Clock} color="#276749" sub="Saturday 9 May" />
          <StatCard label="Keynotes" value={keynotes} icon={Mic2} color="#C8A951" />
        </div>

        {/* Day tabs */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <SegmentedTabs
            value={activeDay}
            onChange={setActiveDay}
            options={[
              { value: "2026-05-08", label: "Day 1 · Fri 8 May", count: day1Count },
              { value: "2026-05-09", label: "Day 2 · Sat 9 May", count: day2Count },
            ]}
          />
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
            {daySessions.length} session{daySessions.length !== 1 ? "s" : ""} on this day
          </div>
        </div>

        {/* Sessions list */}
        {loading ? (
          <LoadingState label="Loading agenda…" />
        ) : daySessions.length === 0 ? (
          <EmptyState
            Icon={Clock}
            title="No sessions scheduled for this day"
            subtitle="Add a session to get started."
          />
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {daySessions.map((s, idx) => (
              <SessionRow
                key={s.id}
                session={s}
                isFirst={idx === 0}
                isLast={idx === daySessions.length - 1}
                onEdit={() => openEdit(s)}
                onDelete={() => setDeleteConfirm(s)}
                onManagePanel={() => setPanelMembersFor(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ActionModal
          title={modal.editId ? "Edit Session" : "Add Session"}
          subtitle={modal.editId ? "Update session details" : "Add a new session to the agenda"}
          size="lg"
          saving={saving}
          onClose={closeModal}
          footer={
            <>
              <GhostBtn onClick={closeModal} disabled={saving}>Cancel</GhostBtn>
              <GoldBtn onClick={save} disabled={saving}>
                {saving ? "Saving…" : modal.editId ? "Update Session" : "Add Session"}
              </GoldBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Session title" required full>
              <input
                className="input"
                value={modal.form.title}
                onChange={e => setField("title", e.target.value)}
                placeholder="Keynote: Future of Accounting"
              />
            </Field>
            <Field label="Day" required>
              <select
                className="input"
                value={modal.form.session_date}
                onChange={e => setField("session_date", e.target.value)}
              >
                <option value="2026-05-08">Day 1 – Friday, 8 May 2026</option>
                <option value="2026-05-09">Day 2 – Saturday, 9 May 2026</option>
              </select>
            </Field>
            <Field label="Session type" required>
              <select
                className="input"
                value={modal.form.type}
                onChange={e => setField("type", e.target.value)}
              >
                {SESSION_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Start time" required>
              <input
                type="time"
                className="input"
                value={modal.form.start_time}
                onChange={e => setField("start_time", e.target.value)}
              />
            </Field>
            <Field label="End time" required>
              <input
                type="time"
                className="input"
                value={modal.form.end_time}
                onChange={e => setField("end_time", e.target.value)}
              />
            </Field>
            <Field label="Room / Location">
              <input
                className="input"
                value={modal.form.room}
                onChange={e => setField("room", e.target.value)}
                placeholder="Grand Ballroom"
              />
            </Field>
            <Field label="Capacity">
              <input
                type="number"
                className="input"
                value={modal.form.capacity}
                onChange={e => setField("capacity", e.target.value)}
                placeholder="500"
                min={1}
              />
            </Field>
            <Field label="Speaker">
              <select
                className="input"
                value={modal.form.speaker_id}
                onChange={e => setField("speaker_id", e.target.value)}
              >
                <option value="">— No speaker —</option>
                {speakers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.organization ? ` — ${s.organization}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Moderator">
              <input
                className="input"
                value={modal.form.moderator}
                onChange={e => setField("moderator", e.target.value)}
                placeholder="Litia Masi"
              />
            </Field>
            <Field label="Display order">
              <input
                type="number"
                className="input"
                value={modal.form.display_order}
                onChange={e => setField("display_order", Number(e.target.value) || 0)}
                min={0}
              />
            </Field>
            <Field label="Description" full>
              <textarea
                className="input"
                value={modal.form.description}
                onChange={e => setField("description", e.target.value)}
                placeholder="Session description…"
                rows={3}
              />
            </Field>
          </div>
        </ActionModal>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        tone="danger"
        title="Delete session"
        message={deleteConfirm ? `Delete "${deleteConfirm.title}" from the agenda? This cannot be undone.` : ""}
        confirmLabel="Delete Session"
        loading={deleting}
        onCancel={() => !deleting && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />

      {panelMembersFor && (
        <PanelMembersModal
          session={panelMembersFor}
          onClose={() => setPanelMembersFor(null)}
          onSaved={(count) => show("success", `Saved ${count} panel member${count === 1 ? "" : "s"}`)}
        />
      )}
    </Layout>
  );
}

/* ───────── Session row ───────── */
function SessionRow({ session, isFirst, isLast, onEdit, onDelete, onManagePanel }) {
  const style = TYPE_STYLES[session.type] || TYPE_STYLES.break;
  return (
    <div
      style={{
        display: "flex", gap: 14, padding: "14px 18px",
        borderBottom: isLast ? "none" : "1px solid #f1f5f9",
        alignItems: "flex-start",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Time column */}
      <div style={{ minWidth: 78, textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
          {session.start_time || "—"}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
          {session.end_time || ""}
        </div>
      </div>

      {/* Color bar */}
      <div style={{
        width: 3, alignSelf: "stretch", minHeight: 40,
        background: style.color, borderRadius: 2, flexShrink: 0,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {session.title}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Chip
                label={session.type}
                color={style.color}
                bg={style.bg}
                border={style.border}
                small
                uppercase
              />
              {session.room && (
                <span style={{ fontSize: 11, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <MapPin size={11} /> {session.room}
                </span>
              )}
              {session.capacity && (
                <span style={{ fontSize: 11, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <Users size={11} /> {session.capacity}
                </span>
              )}
            </div>
            {(session.speaker_name || session.moderator) && (
              <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                {session.speaker_name && (
                  <div style={{ fontSize: 12, color: "#0F2D5E", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                    <Mic2 size={11} /> {session.speaker_name}
                  </div>
                )}
                {session.moderator && (
                  <div style={{ fontSize: 12, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <UserIcon size={11} /> {session.moderator}
                  </div>
                )}
              </div>
            )}
            {session.description && (
              <div style={{
                fontSize: 12, color: "#94a3b8", marginTop: 6, lineHeight: 1.5,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {session.description}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {session.type === "panel" && onManagePanel && (
              <IconBtn
                Icon={UsersRound}
                color="#0F2D5E"
                bg="#eef2ff"
                title="Manage panel members"
                onClick={onManagePanel}
              />
            )}
            <IconBtn Icon={Pencil} color="#7c3aed" bg="#f5f3ff" title="Edit" onClick={onEdit} />
            <IconBtn Icon={Trash2} color="#dc2626" bg="#fff5f5" title="Delete" onClick={onDelete} />
          </div>
        </div>
      </div>
    </div>
  );
}
