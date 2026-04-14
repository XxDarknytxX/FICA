import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, UserCheck, CheckCircle2, XCircle, Download } from "lucide-react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import { api } from "../services/api";

const TICKET_TYPES = ["full", "day1", "day2", "virtual", "vip"];

const EMPTY = {
  name: "", email: "", organization: "", job_title: "",
  phone: "", ticket_type: "full", dietary_requirements: "",
  notes: "", check_in_day1: false, check_in_day2: false
};

function AttendeeForm({ form, setForm, onSave, onCancel, saving, err, isEdit }) {
  const set = (k) => (e) => setForm(f => ({
    ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value
  }));
  return (
    <div>
      {err && <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#c53030" }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div>
          <label className="label">Full Name *</label>
          <input className="input" value={form.name} onChange={set("name")} placeholder="e.g. Mere Ratumaiyale" required />
        </div>
        <div>
          <label className="label">Email *</label>
          <input className="input" type="email" value={form.email} onChange={set("email")} placeholder="email@example.com" required />
        </div>
        <div>
          <label className="label">Organisation</label>
          <input className="input" value={form.organization} onChange={set("organization")} placeholder="e.g. KPMG Fiji" />
        </div>
        <div>
          <label className="label">Job Title</label>
          <input className="input" value={form.job_title} onChange={set("job_title")} placeholder="e.g. Senior Accountant" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={set("phone")} placeholder="+679 9XXXXXX" />
        </div>
        <div>
          <label className="label">Ticket Type</label>
          <select className="input" value={form.ticket_type} onChange={set("ticket_type")}>
            {TICKET_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Dietary Requirements</label>
          <input className="input" value={form.dietary_requirements} onChange={set("dietary_requirements")} placeholder="e.g. Vegetarian, Halal, Gluten Free..." />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Notes</label>
          <textarea className="input" value={form.notes} onChange={set("notes")} rows={2} placeholder="Any special requirements or notes..." />
        </div>
        {isEdit && (
          <div style={{ gridColumn: "1/-1" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#4a5568", marginBottom: 8 }}>Check-in Status</div>
            <div style={{ display: "flex", gap: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.check_in_day1} onChange={set("check_in_day1")} style={{ width: 16, height: 16, accentColor: "#0F2D5E" }} />
                <span style={{ fontSize: 14 }}>Checked in – Day 1 (14 Apr)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.check_in_day2} onChange={set("check_in_day2")} style={{ width: 16, height: 16, accentColor: "#0F2D5E" }} />
                <span style={{ fontSize: 14 }}>Checked in – Day 2 (15 Apr)</span>
              </label>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={onSave} className="btn-gold" disabled={saving}>{saving ? "Saving..." : "Save Attendee"}</button>
      </div>
    </div>
  );
}

export default function Attendees() {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTicket, setFilterTicket] = useState("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function load() {
    const data = await api("/event/attendees");
    setAttendees(data.attendees || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setEditId(null); setErr(""); setModal(true); }
  function openEdit(a) { setForm({ ...a, check_in_day1: !!a.check_in_day1, check_in_day2: !!a.check_in_day2 }); setEditId(a.id); setErr(""); setModal(true); }
  function closeModal() { setModal(false); setErr(""); }

  async function save() {
    setErr(""); setSaving(true);
    try {
      if (!editId) await api("/event/attendees", { method: "POST", body: form });
      else await api(`/event/attendees/${editId}`, { method: "PUT", body: form });
      closeModal();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(id) {
    await api(`/event/attendees/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  }

  async function toggleCheckIn(id, day) {
    try {
      await api(`/event/attendees/${id}/checkin`, { method: "POST", body: { day } });
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  const filtered = attendees.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.name.toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q) ||
      (a.organization || "").toLowerCase().includes(q) ||
      (a.registration_code || "").toLowerCase().includes(q);
    const matchTicket = filterTicket === "all" || a.ticket_type === filterTicket;
    return matchSearch && matchTicket;
  });

  const checkedIn = attendees.filter(a => a.check_in_day1 || a.check_in_day2).length;

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="Attendees"
          subtitle={`${attendees.length} registered · ${checkedIn} checked in`}
          action={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Register Attendee</button>}
        />

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total", value: attendees.length, color: "#0F2D5E" },
            { label: "Checked In", value: checkedIn, color: "#276749" },
            { label: "VIP", value: attendees.filter(a => a.ticket_type === "vip").length, color: "#92620c" },
            { label: "Virtual", value: attendees.filter(a => a.ticket_type === "virtual").length, color: "#6b21a8" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "12px 18px", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#718096" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a0aec0" }} />
            <input
              className="search-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search name, email, org, code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input"
            style={{ width: "auto" }}
            value={filterTicket}
            onChange={e => setFilterTicket(e.target.value)}
          >
            <option value="all">All Tickets</option>
            {TICKET_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Organisation</th>
                <th>Code</th>
                <th>Ticket</th>
                <th>Day 1</th>
                <th>Day 2</th>
                <th>Dietary</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 48, color: "#a0aec0" }}>
                    <UserCheck size={36} color="#e2e8f0" style={{ marginBottom: 8 }} />
                    <div style={{ fontWeight: 600 }}>No attendees found</div>
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a202c" }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "#a0aec0" }}>{a.email}</div>
                    {a.job_title && <div style={{ fontSize: 11, color: "#718096" }}>{a.job_title}</div>}
                  </td>
                  <td style={{ fontSize: 13, color: "#4a5568" }}>{a.organization || "—"}</td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 12, background: "#f0f4f8", padding: "2px 8px", borderRadius: 4, color: "#0F2D5E", fontWeight: 700 }}>
                      {a.registration_code}
                    </span>
                  </td>
                  <td><Badge value={a.ticket_type} /></td>
                  <td>
                    <button
                      onClick={() => toggleCheckIn(a.id, "day1")}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                      title={a.check_in_day1 ? "Undo check-in Day 1" : "Check in Day 1"}
                    >
                      {a.check_in_day1
                        ? <CheckCircle2 size={20} color="#48bb78" fill="#e6fffa" />
                        : <XCircle size={20} color="#e2e8f0" />}
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleCheckIn(a.id, "day2")}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                      title={a.check_in_day2 ? "Undo check-in Day 2" : "Check in Day 2"}
                    >
                      {a.check_in_day2
                        ? <CheckCircle2 size={20} color="#48bb78" fill="#e6fffa" />
                        : <XCircle size={20} color="#e2e8f0" />}
                    </button>
                  </td>
                  <td style={{ fontSize: 12, color: "#a0aec0" }}>{a.dietary_requirements || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => openEdit(a)} className="btn-ghost" style={{ padding: "4px 8px" }}><Pencil size={13} /></button>
                      <button onClick={() => setDeleteConfirm(a)} className="btn-danger" style={{ padding: "4px 8px" }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#a0aec0", textAlign: "right" }}>
            Showing {filtered.length} of {attendees.length} attendees
          </div>
        )}

        {modal && (
          <Modal title={editId ? "Edit Attendee" : "Register Attendee"} onClose={closeModal} size="lg">
            <AttendeeForm form={form} setForm={setForm} onSave={save} onCancel={closeModal} saving={saving} err={err} isEdit={!!editId} />
          </Modal>
        )}

        {deleteConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420 }}>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Remove Attendee?</div>
                <div style={{ fontSize: 14, color: "#718096" }}>Remove <strong>{deleteConfirm.name}</strong> from the congress?</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                  <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  <button style={{ background: "#e53e3e", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500 }} onClick={() => doDelete(deleteConfirm.id)}>Remove</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
