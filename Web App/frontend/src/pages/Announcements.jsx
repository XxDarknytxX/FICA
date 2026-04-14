import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Bell, Send, Eye, EyeOff } from "lucide-react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import { api } from "../services/api";

const ANN_TYPES = ["info", "warning", "alert", "update", "reminder"];
const ANN_TARGETS = ["all", "day1", "day2", "vip", "virtual"];

const EMPTY = { title: "", body: "", type: "info", target: "all", published: false };

const TYPE_ICONS = {
  info: "ℹ️", warning: "⚠️", alert: "🚨", update: "🔄", reminder: "🔔"
};

function AnnouncementForm({ form, setForm, onSave, onCancel, saving, err }) {
  const set = (k) => (e) => setForm(f => ({
    ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value
  }));
  const charCount = (form.body || "").length;
  return (
    <div>
      {err && <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#c53030" }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Title *</label>
          <input className="input" value={form.title} onChange={set("title")} placeholder="e.g. Welcome to FICA Congress 2026!" required />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={set("type")}>
            {ANN_TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Target Audience</label>
          <select className="input" value={form.target} onChange={set("target")}>
            {ANN_TARGETS.map(t => <option key={t} value={t}>{t === "all" ? "All Delegates" : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <label className="label" style={{ margin: 0 }}>Message Body *</label>
            <span style={{ fontSize: 11, color: charCount > 280 ? "#e53e3e" : "#a0aec0" }}>{charCount} chars</span>
          </div>
          <textarea
            className="input"
            value={form.body}
            onChange={set("body")}
            rows={5}
            placeholder="Write your announcement message here. This will be displayed to delegates on the mobile app..."
            required
          />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.published} onChange={set("published")} style={{ width: 16, height: 16, accentColor: "#48bb78" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#4a5568" }}>Publish immediately</div>
              <div style={{ fontSize: 12, color: "#a0aec0" }}>When checked, this announcement will be visible to delegates right away</div>
            </div>
          </label>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={onSave} className="btn-gold" disabled={saving}>
          <Send size={14} /> {saving ? "Saving..." : form.published ? "Publish Now" : "Save as Draft"}
        </button>
      </div>
    </div>
  );
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all"); // all | published | draft
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function load() {
    const data = await api("/event/announcements");
    setAnnouncements(data.announcements || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setEditId(null); setErr(""); setModal(true); }
  function openEdit(a) {
    setForm({ title: a.title, body: a.body, type: a.type, target: a.target, published: !!a.published });
    setEditId(a.id); setErr(""); setModal(true);
  }
  function closeModal() { setModal(false); setErr(""); }

  async function save() {
    setErr(""); setSaving(true);
    try {
      if (!editId) await api("/event/announcements", { method: "POST", body: form });
      else await api(`/event/announcements/${editId}`, { method: "PUT", body: form });
      closeModal();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(ann) {
    await api(`/event/announcements/${ann.id}`, {
      method: "PUT",
      body: { ...ann, published: !ann.published }
    });
    await load();
  }

  async function doDelete(id) {
    await api(`/event/announcements/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  }

  const filtered = announcements.filter(a => {
    if (filter === "published") return a.published;
    if (filter === "draft") return !a.published;
    return true;
  });

  const published = announcements.filter(a => a.published).length;

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="Announcements"
          subtitle={`${published} published · ${announcements.length - published} drafts`}
          action={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> New Announcement</button>}
        />

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { value: "all", label: `All (${announcements.length})` },
            { value: "published", label: `Published (${published})` },
            { value: "draft", label: `Drafts (${announcements.length - published})` },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "1px solid",
                cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                background: filter === f.value ? "#0F2D5E" : "white",
                color: filter === f.value ? "white" : "#4a5568",
                borderColor: filter === f.value ? "#0F2D5E" : "#e2e8f0",
              }}
            >{f.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(ann => (
              <div key={ann.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 0 }}>
                  {/* Status strip */}
                  <div style={{
                    width: 5, background: ann.published ? "#48bb78" : "#e2e8f0", flexShrink: 0
                  }} />
                  <div style={{ flex: 1, padding: "18px 20px" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 24, flexShrink: 0 }}>{TYPE_ICONS[ann.type] || "📢"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a202c" }}>{ann.title}</div>
                          <Badge value={ann.type} />
                          <span style={{
                            fontSize: 11, padding: "1px 8px", borderRadius: 20, fontWeight: 600,
                            background: ann.published ? "#f0fff4" : "#f8fafc",
                            color: ann.published ? "#276749" : "#718096",
                            border: `1px solid ${ann.published ? "#c6f6d5" : "#e2e8f0"}`
                          }}>
                            {ann.published ? "Published" : "Draft"}
                          </span>
                          <span style={{ fontSize: 11, color: "#a0aec0" }}>→ {ann.target === "all" ? "All Delegates" : ann.target}</span>
                        </div>
                        <p style={{ fontSize: 14, color: "#4a5568", lineHeight: 1.6, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {ann.body}
                        </p>
                        {ann.published_at && (
                          <div style={{ fontSize: 11, color: "#a0aec0" }}>
                            Published: {new Date(ann.published_at).toLocaleDateString("en-FJ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => togglePublish(ann)}
                          className="btn-ghost"
                          style={{ padding: "5px 10px", fontSize: 12, gap: 4 }}
                          title={ann.published ? "Unpublish" : "Publish"}
                        >
                          {ann.published ? <EyeOff size={13} /> : <Eye size={13} />}
                          {ann.published ? "Unpublish" : "Publish"}
                        </button>
                        <button onClick={() => openEdit(ann)} className="btn-ghost" style={{ padding: "5px 8px" }}><Pencil size={13} /></button>
                        <button onClick={() => setDeleteConfirm(ann)} className="btn-danger" style={{ padding: "5px 8px" }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#a0aec0" }}>
                <Bell size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 600 }}>No announcements found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Create your first announcement for delegates</div>
              </div>
            )}
          </div>
        )}

        {modal && (
          <Modal title={editId ? "Edit Announcement" : "New Announcement"} onClose={closeModal} size="lg">
            <AnnouncementForm form={form} setForm={setForm} onSave={save} onCancel={closeModal} saving={saving} err={err} />
          </Modal>
        )}

        {deleteConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420 }}>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Announcement?</div>
                <div style={{ fontSize: 14, color: "#718096" }}>Delete <strong>{deleteConfirm.title}</strong>? This cannot be undone.</div>
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
