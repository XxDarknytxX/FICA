import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Trophy, Users, BarChart3, Eye, Power } from "lucide-react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import { api } from "../services/api";

const CATEGORIES = ["innovation", "sustainability", "technology", "community", "other"];

const EMPTY = {
  name: "", description: "", team: "", image_url: "", category: "innovation", display_order: 0
};

const CAT_COLORS = {
  innovation: "#6b21a8", sustainability: "#276749", technology: "#2c5282",
  community: "#c05621", other: "#718096"
};

function ProjectForm({ form, setForm, onSave, onCancel, saving, err }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div>
      {err && <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#c53030" }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Project Name *</label>
          <input className="input" value={form.name} onChange={set("name")} placeholder="e.g. Smart Water Monitoring System" required />
        </div>
        <div>
          <label className="label">Team / Author</label>
          <input className="input" value={form.team} onChange={set("team")} placeholder="e.g. Team Innovate" />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={set("category")}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Image URL</label>
          <input className="input" value={form.image_url} onChange={set("image_url")} placeholder="https://..." />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label className="label">Description</label>
          <textarea className="input" value={form.description} onChange={set("description")} rows={4} placeholder="Describe the project..." />
        </div>
        <div>
          <label className="label">Display Order</label>
          <input className="input" type="number" value={form.display_order} onChange={set("display_order")} min={0} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={onSave} className="btn-gold" disabled={saving}>{saving ? "Saving..." : "Save Project"}</button>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [tab, setTab] = useState("manage");

  // Results state
  const [results, setResults] = useState(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [voterModal, setVoterModal] = useState(null);
  const [voters, setVoters] = useState([]);

  async function load() {
    try {
      if (tab === "manage") {
        const data = await api("/event/projects");
        setProjects(data.projects || []);
      } else {
        const data = await api("/event/votes/results");
        setResults(data);
        setVotingOpen(data.votingOpen);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }
  useEffect(() => { setLoading(true); load(); }, [tab]);

  function openAdd() { setForm(EMPTY); setEditId(null); setErr(""); setModal(true); }
  function openEdit(p) { setForm({ ...p }); setEditId(p.id); setErr(""); setModal(true); }
  function closeModal() { setModal(false); setErr(""); }

  async function save() {
    setErr(""); setSaving(true);
    try {
      if (!editId) await api("/event/projects", { method: "POST", body: form });
      else await api(`/event/projects/${editId}`, { method: "PUT", body: form });
      closeModal();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(id) {
    await api(`/event/projects/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  }

  async function handleToggleVoting() {
    try {
      await api("/event/votes/toggle", { method: "POST", body: { open: !votingOpen } });
      setVotingOpen(!votingOpen);
    } catch (e) {
      console.error(e);
    }
  }

  async function showVoters(projectId) {
    setVoterModal(projectId);
    try {
      const data = await api(`/event/votes/details/${projectId}`);
      setVoters(data.voters || []);
    } catch (e) {
      console.error(e);
      setVoters([]);
    }
  }

  const maxVotes = results ? Math.max(...(results.projects || []).map(p => p.vote_count || 0), 1) : 1;
  const participation = results && results.totalDelegates > 0
    ? Math.round((results.totalVotes / results.totalDelegates) * 100)
    : 0;

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="Projects & Voting"
          subtitle={tab === "manage"
            ? `${projects.length} project${projects.length !== 1 ? "s" : ""} registered`
            : `${results?.totalVotes ?? 0} votes cast`}
          action={tab === "manage"
            ? <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Add Project</button>
            : null}
        />

        {/* Tab Selector */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f0f4f8", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {[{ key: "manage", label: "Manage Projects", icon: Trophy }, { key: "results", label: "Vote Results", icon: BarChart3 }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              background: tab === t.key ? "white" : "transparent",
              color: tab === t.key ? "#0F2D5E" : "#718096",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s"
            }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>Loading...</div>
        ) : tab === "manage" ? (
          /* ─── MANAGE TAB ────────────────────────────────────────── */
          <>
            {projects.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#a0aec0" }}>
                <Trophy size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 600, fontSize: 15 }}>No projects yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Add your first project to get started</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {projects.map(p => {
                  const catColor = CAT_COLORS[p.category] || "#718096";
                  return (
                    <div key={p.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                      {/* Image */}
                      <div style={{ height: 140, background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #e2e8f0" }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                        ) : (
                          <Trophy size={32} color="#cbd5e0" />
                        )}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a202c" }}>{p.name}</div>
                            {p.team && <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>{p.team}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => openEdit(p)} className="btn-ghost" style={{ padding: "3px 7px" }}><Pencil size={13} /></button>
                            <button onClick={() => setDeleteConfirm(p)} className="btn-danger" style={{ padding: "3px 7px" }}><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                            background: `${catColor}15`, color: catColor, textTransform: "capitalize"
                          }}>{p.category || "other"}</span>
                          <span style={{ fontSize: 11, color: "#a0aec0", display: "flex", alignItems: "center", gap: 3 }}>
                            <Users size={11} /> {p.vote_count ?? 0} votes
                          </span>
                        </div>
                        {p.description && (
                          <div style={{ fontSize: 12, color: "#718096", marginTop: 8, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {p.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ─── RESULTS TAB ───────────────────────────────────────── */
          <>
            {/* Voting toggle + stats */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <button onClick={handleToggleVoting} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 700,
                background: votingOpen ? "#c6f6d5" : "#fed7d7",
                color: votingOpen ? "#276749" : "#c53030",
              }}>
                <Power size={16} /> Voting is {votingOpen ? "OPEN" : "CLOSED"}
              </button>
              <div className="card" style={{ padding: "10px 20px", display: "flex", gap: 24, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1a202c" }}>{results?.totalVotes ?? 0}</div>
                  <div style={{ fontSize: 11, color: "#a0aec0" }}>Total Votes</div>
                </div>
                <div style={{ width: 1, height: 36, background: "#e2e8f0" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1a202c" }}>{results?.totalDelegates ?? 0}</div>
                  <div style={{ fontSize: 11, color: "#a0aec0" }}>Eligible Delegates</div>
                </div>
                <div style={{ width: 1, height: 36, background: "#e2e8f0" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#0F2D5E" }}>{participation}%</div>
                  <div style={{ fontSize: 11, color: "#a0aec0" }}>Participation</div>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart3 size={16} color="#0F2D5E" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a202c" }}>Leaderboard</span>
              </div>
              {(results?.projects || []).length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#a0aec0", fontSize: 13 }}>No projects to show</div>
              ) : (
                (results?.projects || []).map((p, i) => {
                  const pct = maxVotes > 0 ? ((p.vote_count || 0) / maxVotes) * 100 : 0;
                  const catColor = CAT_COLORS[p.category] || "#718096";
                  return (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                      borderBottom: "1px solid #f0f4f8",
                      background: i === 0 && p.vote_count > 0 ? "#fffff0" : "white"
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: i === 0 && p.vote_count > 0 ? "#C8A951" : i === 1 ? "#a0aec0" : i === 2 ? "#c05621" : "#e2e8f0",
                        color: i < 3 && p.vote_count > 0 ? "white" : "#718096",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 800
                      }}>
                        {i === 0 && p.vote_count > 0 ? <Trophy size={16} /> : `#${i + 1}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#1a202c" }}>{p.name}</span>
                          {p.team && <span style={{ fontSize: 11, color: "#a0aec0" }}>{p.team}</span>}
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20,
                            background: `${catColor}15`, color: catColor, textTransform: "capitalize"
                          }}>{p.category || "other"}</span>
                        </div>
                        <div style={{ marginTop: 6, height: 6, background: "#f0f4f8", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? "#C8A951" : "#0F2D5E", borderRadius: 3, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a202c" }}>{p.vote_count || 0}</div>
                        <div style={{ fontSize: 10, color: "#a0aec0" }}>votes</div>
                      </div>
                      <button onClick={() => showVoters(p.id)} className="btn-ghost" style={{ padding: "4px 8px" }} title="View voters">
                        <Eye size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Add/Edit Modal */}
        {modal && (
          <Modal title={editId ? "Edit Project" : "Add Project"} onClose={closeModal} size="lg">
            <ProjectForm form={form} setForm={setForm} onSave={save} onCancel={closeModal} saving={saving} err={err} />
          </Modal>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420 }}>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Project?</div>
                <div style={{ fontSize: 14, color: "#718096" }}>Remove <strong>{deleteConfirm.name}</strong> and all its votes?</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                  <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  <button style={{ background: "#e53e3e", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500 }} onClick={() => doDelete(deleteConfirm.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voter Detail Modal */}
        {voterModal && (
          <Modal title="Voter Details" onClose={() => { setVoterModal(null); setVoters([]); }} size="md">
            {voters.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#a0aec0", fontSize: 13 }}>No votes for this project yet</div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 12 }}>{voters.length} voter{voters.length !== 1 ? "s" : ""}</div>
                {voters.map(v => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0f4f8" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a202c" }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: "#718096" }}>{v.organization} · {v.email}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#a0aec0" }}>{new Date(v.voted_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        )}
      </div>
    </Layout>
  );
}
