import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Award, ExternalLink } from "lucide-react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import { api } from "../services/api";

const TIERS = ["platinum", "gold", "silver", "bronze", "supporter", "media"];

const TIER_ORDER = { platinum: 1, gold: 2, silver: 3, bronze: 4, supporter: 5, media: 6 };

const EMPTY = {
  name: "", logo_url: "", website: "", tier: "gold",
  description: "", contact_name: "", contact_email: "", display_order: 0
};

function SponsorForm({ form, setForm, onSave, onCancel, saving, err }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div>
      {err && <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#c53030" }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Company / Organisation Name *</label>
          <input className="input" value={form.name} onChange={set("name")} placeholder="e.g. ANZ Bank Fiji" required />
        </div>
        <div>
          <label className="label">Sponsor Tier *</label>
          <select className="input" value={form.tier} onChange={set("tier")}>
            {TIERS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Display Order</label>
          <input className="input" type="number" value={form.display_order} onChange={set("display_order")} min={0} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Logo URL</label>
          <input className="input" value={form.logo_url} onChange={set("logo_url")} placeholder="https://..." />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Website</label>
          <input className="input" value={form.website} onChange={set("website")} placeholder="https://..." />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Description</label>
          <textarea className="input" value={form.description} onChange={set("description")} rows={3} placeholder="About this sponsor..." />
        </div>
        <div>
          <label className="label">Contact Name</label>
          <input className="input" value={form.contact_name} onChange={set("contact_name")} placeholder="e.g. Peter Shalendra" />
        </div>
        <div>
          <label className="label">Contact Email</label>
          <input className="input" type="email" value={form.contact_email} onChange={set("contact_email")} placeholder="contact@company.com" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={onSave} className="btn-gold" disabled={saving}>{saving ? "Saving..." : "Save Sponsor"}</button>
      </div>
    </div>
  );
}

export default function Sponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function load() {
    const data = await api("/event/sponsors");
    setSponsors(data.sponsors || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setEditId(null); setErr(""); setModal(true); }
  function openEdit(s) { setForm({ ...s }); setEditId(s.id); setErr(""); setModal(true); }
  function closeModal() { setModal(false); setErr(""); }

  async function save() {
    setErr(""); setSaving(true);
    try {
      if (!editId) await api("/event/sponsors", { method: "POST", body: form });
      else await api(`/event/sponsors/${editId}`, { method: "PUT", body: form });
      closeModal();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(id) {
    await api(`/event/sponsors/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  }

  // Group by tier
  const grouped = TIERS.reduce((acc, tier) => {
    const group = sponsors.filter(s => s.tier === tier);
    if (group.length > 0) acc[tier] = group;
    return acc;
  }, {});

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="Sponsors"
          subtitle={`${sponsors.length} sponsors supporting FICA Congress 2026`}
          action={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Add Sponsor</button>}
        />

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>Loading sponsors...</div>
        ) : (
          Object.entries(grouped).map(([tier, group]) => (
            <div key={tier} style={{ marginBottom: 28 }}>
              {/* Tier header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Badge value={tier} />
                <span style={{ fontSize: 13, color: "#a0aec0" }}>{group.length} sponsor{group.length !== 1 ? "s" : ""}</span>
                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: tier === "platinum" ? "repeat(auto-fill, minmax(400px, 1fr))" : "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 14
              }}>
                {group.map(s => (
                  <div key={s.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      {/* Logo */}
                      <div style={{
                        width: tier === "platinum" ? 100 : 80,
                        height: tier === "platinum" ? 50 : 40,
                        background: "#f8fafc", border: "1px solid #e2e8f0",
                        borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "hidden", flexShrink: 0
                      }}>
                        {s.logo_url ? (
                          <img
                            src={s.logo_url} alt={s.name}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            onError={e => { e.target.style.display = "none"; }}
                          />
                        ) : (
                          <Award size={20} color="#a0aec0" />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a202c" }}>{s.name}</div>
                            <Badge value={tier} />
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            {s.website && (
                              <a href={s.website} target="_blank" rel="noreferrer" style={{ color: "#718096", display: "flex" }}>
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button onClick={() => openEdit(s)} className="btn-ghost" style={{ padding: "3px 7px" }}><Pencil size={13} /></button>
                            <button onClick={() => setDeleteConfirm(s)} className="btn-danger" style={{ padding: "3px 7px" }}><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {s.description && (
                          <div style={{ fontSize: 12, color: "#718096", marginTop: 8, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {s.description}
                          </div>
                        )}
                        {(s.contact_name || s.contact_email) && (
                          <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 6 }}>
                            Contact: {s.contact_name} {s.contact_email && `· ${s.contact_email}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {!loading && sponsors.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#a0aec0" }}>
            <Award size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, fontSize: 15 }}>No sponsors yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add your first sponsor to get started</div>
          </div>
        )}

        {modal && (
          <Modal title={editId ? "Edit Sponsor" : "Add Sponsor"} onClose={closeModal} size="lg">
            <SponsorForm form={form} setForm={setForm} onSave={save} onCancel={closeModal} saving={saving} err={err} />
          </Modal>
        )}

        {deleteConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420 }}>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Sponsor?</div>
                <div style={{ fontSize: 14, color: "#718096" }}>Remove <strong>{deleteConfirm.name}</strong> from the congress?</div>
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
