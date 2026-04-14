import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Calendar, Clock } from "lucide-react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import { api } from "../services/api";

const SESSION_TYPES = ["keynote", "panel", "workshop", "break", "networking", "registration", "lunch", "ceremony", "awards"];

const EMPTY = {
  title: "", description: "", start_time: "", end_time: "",
  session_date: "2026-05-08", room: "", type: "keynote",
  speaker_id: "", moderator: "", capacity: "", display_order: 0
};

const TYPE_COLORS = {
  keynote: "#92620c", panel: "#234e52", workshop: "#2c5282",
  break: "#a0aec0", networking: "#6b21a8", registration: "#c53030",
  lunch: "#276749", ceremony: "#0F2D5E", awards: "#92620c"
};

function SessionForm({ form, setForm, onSave, onCancel, saving, err, speakers }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div>
      {err && <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#c53030" }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Session Title *</label>
          <input className="input" value={form.title} onChange={set("title")} placeholder="e.g. Keynote: Future of Accounting" required />
        </div>
        <div>
          <label className="label">Session Date *</label>
          <select className="input" value={form.session_date} onChange={set("session_date")}>
            <option value="2026-05-08">Day 1 – Friday, 8 May 2026</option>
            <option value="2026-05-09">Day 2 – Saturday, 9 May 2026</option>
          </select>
        </div>
        <div>
          <label className="label">Type *</label>
          <select className="input" value={form.type} onChange={set("type")}>
            {SESSION_TYPES.map(t => <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Start Time *</label>
          <input className="input" type="time" value={form.start_time} onChange={set("start_time")} required />
        </div>
        <div>
          <label className="label">End Time *</label>
          <input className="input" type="time" value={form.end_time} onChange={set("end_time")} required />
        </div>
        <div>
          <label className="label">Room / Location</label>
          <input className="input" value={form.room} onChange={set("room")} placeholder="e.g. Grand Ballroom" />
        </div>
        <div>
          <label className="label">Capacity</label>
          <input className="input" type="number" value={form.capacity} onChange={set("capacity")} placeholder="e.g. 500" min={1} />
        </div>
        <div>
          <label className="label">Speaker</label>
          <select className="input" value={form.speaker_id} onChange={set("speaker_id")}>
            <option value="">— No speaker —</option>
            {speakers.map(s => <option key={s.id} value={s.id}>{s.name} – {s.organization}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Moderator</label>
          <input className="input" value={form.moderator} onChange={set("moderator")} placeholder="e.g. Ms. Litia Masi" />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Description</label>
          <textarea className="input" value={form.description} onChange={set("description")} rows={3} placeholder="Session description..." />
        </div>
        <div>
          <label className="label">Display Order</label>
          <input className="input" type="number" value={form.display_order} onChange={set("display_order")} min={0} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={onSave} className="btn-gold" disabled={saving}>{saving ? "Saving..." : "Save Session"}</button>
      </div>
    </div>
  );
}

function SessionBlock({ session, onEdit, onDelete }) {
  const color = TYPE_COLORS[session.type] || "#a0aec0";
  return (
    <div style={{
      display: "flex", gap: 12, padding: "10px 0",
      borderBottom: "1px solid #f0f4f8", alignItems: "flex-start"
    }}>
      {/* Time */}
      <div style={{ minWidth: 90, textAlign: "right", paddingTop: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#4a5568" }}>{session.start_time}</div>
        <div style={{ fontSize: 11, color: "#a0aec0" }}>{session.end_time}</div>
      </div>
      {/* Color bar */}
      <div style={{ width: 3, alignSelf: "stretch", background: color, borderRadius: 2, minHeight: 40, flexShrink: 0 }} />
      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a202c" }}>{session.title}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
              <Badge value={session.type} />
              {session.room && <span style={{ fontSize: 11, color: "#a0aec0" }}>{session.room}</span>}
              {session.capacity && <span style={{ fontSize: 11, color: "#a0aec0" }}>· Cap. {session.capacity}</span>}
            </div>
            {session.speaker_name && (
              <div style={{ fontSize: 12, color: "#0F2D5E", marginTop: 4, fontWeight: 500 }}>
                Speaker: {session.speaker_name}
              </div>
            )}
            {session.moderator && (
              <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>
                Moderator: {session.moderator}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => onEdit(session)} className="btn-ghost" style={{ padding: "4px 8px" }}><Pencil size={13} /></button>
            <button onClick={() => onDelete(session)} className="btn-danger" style={{ padding: "4px 8px" }}><Trash2 size={13} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Agenda() {
  const [sessions, setSessions] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [activeDay, setActiveDay] = useState("2026-05-08");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function load() {
    const [sessData, spkData] = await Promise.all([
      api("/event/sessions"),
      api("/event/speakers"),
    ]);
    setSessions(sessData.sessions || []);
    setSpeakers(spkData.speakers || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...EMPTY, session_date: activeDay }); setEditId(null); setErr(""); setModal("form"); }
  function openEdit(s) {
    setForm({
      title: s.title || "", description: s.description || "",
      start_time: s.start_time || "", end_time: s.end_time || "",
      session_date: String(s.session_date).split("T")[0],
      room: s.room || "", type: s.type || "keynote",
      speaker_id: s.speaker_id || "", moderator: s.moderator || "",
      capacity: s.capacity || "", display_order: s.display_order || 0
    });
    setEditId(s.id); setErr(""); setModal("form");
  }
  function closeModal() { setModal(null); setErr(""); }

  async function save() {
    setErr(""); setSaving(true);
    const payload = {
      ...form,
      speaker_id: form.speaker_id || null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
    };
    try {
      if (!editId) {
        await api("/event/sessions", { method: "POST", body: payload });
      } else {
        await api(`/event/sessions/${editId}`, { method: "PUT", body: payload });
      }
      closeModal();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(id) {
    await api(`/event/sessions/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  }

  const daySessions = sessions
    .filter(s => String(s.session_date).startsWith(activeDay))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const days = [
    { value: "2026-05-08", label: "Day 1", sub: "Friday, 8 May" },
    { value: "2026-05-09", label: "Day 2", sub: "Saturday, 9 May" },
  ];

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="Agenda"
          subtitle={`${sessions.length} sessions scheduled across 2 days`}
          action={
            <button className="btn-gold" onClick={openAdd}>
              <Plus size={16} /> Add Session
            </button>
          }
        />

        {/* Day tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {days.map(d => (
            <button
              key={d.value}
              onClick={() => setActiveDay(d.value)}
              style={{
                padding: "8px 20px", borderRadius: 8, border: "1px solid",
                cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.2s",
                background: activeDay === d.value ? "#0F2D5E" : "white",
                color: activeDay === d.value ? "white" : "#4a5568",
                borderColor: activeDay === d.value ? "#0F2D5E" : "#e2e8f0",
              }}
            >
              {d.label}
              <span style={{ fontSize: 11, display: "block", fontWeight: 400, opacity: 0.75 }}>{d.sub}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "#718096", fontSize: 13 }}>
            <Calendar size={15} />
            {daySessions.length} sessions
          </div>
        </div>

        {/* Sessions */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
            display: "flex", gap: 12, alignItems: "center"
          }}>
            <div style={{ minWidth: 90, fontSize: 11, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
              TIME
            </div>
            <div style={{ width: 3, flexShrink: 0 }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              SESSION
            </div>
          </div>

          <div style={{ padding: "0 20px 12px" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#a0aec0" }}>Loading...</div>
            ) : daySessions.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#a0aec0" }}>
                <Clock size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 600 }}>No sessions for this day</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Click "Add Session" to create one</div>
              </div>
            ) : (
              daySessions.map(s => (
                <SessionBlock key={s.id} session={s} onEdit={openEdit} onDelete={setDeleteConfirm} />
              ))
            )}
          </div>
        </div>

        {/* Add/Edit modal */}
        {modal === "form" && (
          <Modal title={editId ? "Edit Session" : "Add Session"} onClose={closeModal} size="lg">
            <SessionForm form={form} setForm={setForm} onSave={save} onCancel={closeModal} saving={saving} err={err} speakers={speakers} />
          </Modal>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420 }}>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Session?</div>
                <div style={{ fontSize: 14, color: "#718096" }}>Are you sure you want to delete <strong>{deleteConfirm.title}</strong>?</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                  <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  <button style={{ background: "#e53e3e", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500 }} onClick={() => doDelete(deleteConfirm.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
