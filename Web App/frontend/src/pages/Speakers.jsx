import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Star, Mic2 } from "lucide-react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";

const EMPTY = {
  name: "", title: "", organization: "", bio: "",
  photo_url: "", email: "", linkedin: "", twitter: "",
  is_keynote: false, display_order: 0
};

function SpeakerForm({ form, setForm, onSave, onCancel, saving, err }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  return (
    <div>
      {err && <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#c53030" }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Full Name *</label>
          <input className="input" value={form.name} onChange={set("name")} placeholder="e.g. Dr. Sarah Chen" required />
        </div>
        <div>
          <label className="label">Title / Role</label>
          <input className="input" value={form.title} onChange={set("title")} placeholder="e.g. Managing Partner" />
        </div>
        <div>
          <label className="label">Organisation</label>
          <input className="input" value={form.organization} onChange={set("organization")} placeholder="e.g. Deloitte Fiji" />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Bio</label>
          <textarea className="input" value={form.bio} onChange={set("bio")} placeholder="Speaker biography..." rows={4} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Photo URL</label>
          <input className="input" value={form.photo_url} onChange={set("photo_url")} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={set("email")} placeholder="speaker@example.com" />
        </div>
        <div>
          <label className="label">LinkedIn URL</label>
          <input className="input" value={form.linkedin} onChange={set("linkedin")} placeholder="https://linkedin.com/in/..." />
        </div>
        <div>
          <label className="label">Twitter / X handle</label>
          <input className="input" value={form.twitter} onChange={set("twitter")} placeholder="@handle" />
        </div>
        <div>
          <label className="label">Display Order</label>
          <input className="input" type="number" value={form.display_order} onChange={set("display_order")} min={0} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!form.is_keynote}
              onChange={set("is_keynote")}
              style={{ width: 16, height: 16, accentColor: "#C8A951" }}
            />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#4a5568" }}>
              Keynote Speaker
            </span>
          </label>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={onSave} className="btn-gold" disabled={saving}>
          {saving ? "Saving..." : "Save Speaker"}
        </button>
      </div>
    </div>
  );
}

export default function Speakers() {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "add" | "edit"
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function load() {
    try {
      const data = await api("/event/speakers");
      setSpeakers(data.speakers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setEditId(null); setErr(""); setModal("add"); }
  function openEdit(s) { setForm({ ...s, is_keynote: !!s.is_keynote }); setEditId(s.id); setErr(""); setModal("edit"); }
  function closeModal() { setModal(null); setErr(""); }

  async function save() {
    setErr(""); setSaving(true);
    try {
      if (modal === "add") {
        await api("/event/speakers", { method: "POST", body: form });
      } else {
        await api(`/event/speakers/${editId}`, { method: "PUT", body: form });
      }
      closeModal();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSpeaker(id) {
    try {
      await api(`/event/speakers/${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  const filtered = speakers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.organization || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="Speakers"
          subtitle={`${speakers.length} speaker${speakers.length !== 1 ? "s" : ""} registered for FICA Congress 2026`}
          action={
            <button className="btn-gold" onClick={openAdd}>
              <Plus size={16} /> Add Speaker
            </button>
          }
        />

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 20, maxWidth: 300 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a0aec0" }} />
          <input
            className="search-input"
            style={{ width: "100%", paddingLeft: 34 }}
            placeholder="Search speakers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>Loading speakers...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {filtered.map(s => (
              <div key={s.id} className="card" style={{ padding: 20, display: "flex", gap: 14 }}>
                {/* Avatar */}
                <div style={{ flexShrink: 0 }}>
                  <img
                    src={s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=0F2D5E&color=C8A951&size=80`}
                    alt={s.name}
                    style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", display: "block" }}
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=0F2D5E&color=C8A951&size=80`; }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a202c" }}>{s.name}</div>
                      {s.is_keynote && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          fontSize: 10, color: "#92620c", background: "#fef9e7",
                          border: "1px solid #f6d860", padding: "1px 7px", borderRadius: 20, fontWeight: 700, marginTop: 2
                        }}>
                          <Star size={9} fill="#92620c" /> Keynote
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openEdit(s)} className="btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm(s)} className="btn-danger" style={{ padding: "4px 8px" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#718096", marginTop: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#0F2D5E", fontWeight: 600, marginTop: 2 }}>{s.organization}</div>
                  {s.bio && (
                    <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {s.bio}
                    </div>
                  )}
                  {/* Social links */}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {s.email && <a href={`mailto:${s.email}`} style={{ fontSize: 11, color: "#4299e1", textDecoration: "none" }}>Email</a>}
                    {s.linkedin && <a href={s.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0077b5", textDecoration: "none" }}>LinkedIn</a>}
                    {s.twitter && <span style={{ fontSize: 11, color: "#1da1f2" }}>{s.twitter}</span>}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "#a0aec0" }}>
                <Mic2 size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>No speakers found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Add your first speaker to get started</div>
              </div>
            )}
          </div>
        )}

        {/* Add / Edit Modal */}
        {(modal === "add" || modal === "edit") && (
          <Modal
            title={modal === "add" ? "Add Speaker" : "Edit Speaker"}
            onClose={closeModal}
            size="lg"
          >
            <SpeakerForm form={form} setForm={setForm} onSave={save} onCancel={closeModal} saving={saving} err={err} />
          </Modal>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420 }}>
              <div style={{ padding: "24px" }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Speaker?</div>
                <div style={{ fontSize: 14, color: "#718096" }}>
                  Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This will also remove them from any assigned sessions.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                  <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  <button className="btn-danger" style={{ background: "#e53e3e", color: "white", border: "none" }} onClick={() => deleteSpeaker(deleteConfirm.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
