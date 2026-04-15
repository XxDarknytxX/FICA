import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Trophy, Users, BarChart3, Eye, Power,
  ImageIcon,
} from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import {
  Toast, useToast, StatCard, IconBtn, Chip, SegmentedTabs,
  LoadingState, EmptyState, ActionModal, ConfirmModal,
  Field, GhostBtn, GoldBtn,
} from "../components/ui";

const CATEGORIES = ["innovation", "sustainability", "technology", "community", "other"];

const CAT_STYLES = {
  innovation:     { color: "#6b21a8", bg: "#f5f3ff", border: "#ddd6fe" },
  sustainability: { color: "#276749", bg: "#f0fff4", border: "#9ae6b4" },
  technology:     { color: "#2c5282", bg: "#ebf8ff", border: "#bee3f8" },
  community:      { color: "#c05621", bg: "#ffedd5", border: "#fdba74" },
  other:          { color: "#64748b", bg: "#f8fafc", border: "#cbd5e1" },
};

const EMPTY = {
  name: "", description: "", team: "", image_url: "", category: "innovation", display_order: 0
};

export default function Projects() {
  const [tab, setTab] = useState("manage");
  const [projects, setProjects] = useState([]);
  const [results, setResults] = useState(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggleVotingConfirm, setToggleVotingConfirm] = useState(false);
  const [voterModal, setVoterModal] = useState(null);
  const [voters, setVoters] = useState([]);
  const { message, show } = useToast();

  async function load() {
    try {
      if (tab === "manage") {
        const data = await api("/event/projects");
        setProjects(data.projects || []);
      } else {
        const data = await api("/event/votes/results");
        setResults(data);
        setVotingOpen(!!data.votingOpen);
      }
    } catch (e) {
      show("error", e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { setLoading(true); load(); }, [tab]);

  function openAdd() { setModal({ form: { ...EMPTY }, editId: null }); }
  function openEdit(p) { setModal({ form: { ...EMPTY, ...p }, editId: p.id }); }
  function closeModal() { if (!saving) setModal(null); }
  function setField(k, v) { setModal(m => ({ ...m, form: { ...m.form, [k]: v } })); }

  async function save() {
    if (!modal.form.name.trim()) return show("error", "Project name is required");
    setSaving(true);
    try {
      if (modal.editId) {
        await api(`/event/projects/${modal.editId}`, { method: "PUT", body: modal.form });
        show("success", `${modal.form.name} updated`);
      } else {
        await api("/event/projects", { method: "POST", body: modal.form });
        show("success", `${modal.form.name} added`);
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
      await api(`/event/projects/${deleteConfirm.id}`, { method: "DELETE" });
      show("success", `${deleteConfirm.name} removed`);
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      show("error", e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleVoting() {
    try {
      await api("/event/votes/toggle", { method: "POST", body: { open: !votingOpen } });
      setVotingOpen(!votingOpen);
      setToggleVotingConfirm(false);
      show("success", !votingOpen ? "Voting opened" : "Voting closed");
    } catch (e) {
      show("error", e.message);
    }
  }

  async function showVoters(projectId) {
    setVoterModal(projectId);
    try {
      const data = await api(`/event/votes/details/${projectId}`);
      setVoters(data.voters || []);
    } catch (e) {
      show("error", e.message);
      setVoters([]);
    }
  }

  const maxVotes = results ? Math.max(...(results.projects || []).map(p => p.vote_count || 0), 1) : 1;
  const participation = results && results.totalDelegates > 0
    ? Math.round((results.totalVotes / results.totalDelegates) * 100)
    : 0;

  return (
    <Layout>
      <div style={{ padding: "8px 0 28px" }} className="animate-in">
        <PageHeader
          title="Projects & Voting"
          subtitle="Showcase delegate projects and run live voting"
          action={tab === "manage" ? (
            <GoldBtn onClick={openAdd}><Plus size={15} /> Add Project</GoldBtn>
          ) : null}
        />

        <Toast message={message} />

        {/* Top tab control */}
        <div style={{ marginBottom: 14 }}>
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "manage", label: "Manage Projects", icon: Trophy, count: projects.length },
              { value: "results", label: "Vote Results", icon: BarChart3 },
            ]}
          />
        </div>

        {loading ? (
          <LoadingState label={tab === "manage" ? "Loading projects…" : "Loading results…"} />
        ) : tab === "manage" ? (
          projects.length === 0 ? (
            <EmptyState
              Icon={Trophy}
              title="No projects yet"
              subtitle="Add your first project for delegates to explore and vote on."
            />
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 14,
            }}>
              {projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onEdit={() => openEdit(p)}
                  onDelete={() => setDeleteConfirm(p)}
                />
              ))}
            </div>
          )
        ) : (
          <>
            {/* Results header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div className="card" style={{
                padding: "14px 16px",
                background: votingOpen
                  ? "linear-gradient(135deg, #f0fff4, #ecfdf5)"
                  : "linear-gradient(135deg, #fff5f5, #ffe5e5)",
                border: `1px solid ${votingOpen ? "#9ae6b4" : "#fed7d7"}`,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              }}>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    color: votingOpen ? "#276749" : "#c53030",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    Voting is {votingOpen ? "OPEN" : "CLOSED"}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: votingOpen ? "#276749" : "#c53030", marginTop: 4 }}>
                    {votingOpen ? "Delegates can vote now" : "Voting is paused"}
                  </div>
                </div>
                <button
                  onClick={() => setToggleVotingConfirm(true)}
                  style={{
                    width: 42, height: 42, borderRadius: 12, border: "none", cursor: "pointer",
                    background: votingOpen ? "#dc2626" : "#059669", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  title={votingOpen ? "Close voting" : "Open voting"}
                >
                  <Power size={18} />
                </button>
              </div>
              <StatCard label="Total Votes" value={results?.totalVotes ?? 0} icon={Users} color="#0F2D5E" />
              <StatCard label="Eligible Delegates" value={results?.totalDelegates ?? 0} icon={Users} color="#2c5282" />
              <StatCard label="Participation" value={`${participation}%`} icon={BarChart3} color="#7c3aed" />
            </div>

            {/* Leaderboard */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                padding: "14px 18px", borderBottom: "1px solid #f1f5f9",
                display: "flex", alignItems: "center", gap: 8, background: "#f8fafc",
              }}>
                <BarChart3 size={15} color="#0F2D5E" />
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Live Leaderboard</div>
              </div>
              {(results?.projects || []).length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>
                  No projects to rank
                </div>
              ) : (
                (results?.projects || []).map((p, i) => {
                  const pct = maxVotes > 0 ? ((p.vote_count || 0) / maxVotes) * 100 : 0;
                  const cs = CAT_STYLES[p.category] || CAT_STYLES.other;
                  const isWinner = i === 0 && (p.vote_count || 0) > 0;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                        borderBottom: "1px solid #f1f5f9",
                        background: isWinner ? "linear-gradient(90deg, #fffbeb, transparent 60%)" : "transparent",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: isWinner ? "linear-gradient(135deg, #C8A951, #e2c87a)"
                                 : i === 1 ? "#cbd5e1"
                                 : i === 2 ? "#fca5a5" : "#eef2ff",
                        color: isWinner ? "white" : i === 1 ? "white" : i === 2 ? "white" : "#64748b",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 800,
                      }}>
                        {isWinner ? <Trophy size={16} /> : `#${i + 1}`}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{p.name}</span>
                          {p.team && <span style={{ fontSize: 11, color: "#94a3b8" }}>{p.team}</span>}
                          <Chip label={p.category || "other"} color={cs.color} bg={cs.bg} border={cs.border} small uppercase />
                        </div>
                        <div style={{ marginTop: 6, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${pct}%`,
                            background: isWinner ? "linear-gradient(90deg, #C8A951, #e2c87a)" : "linear-gradient(90deg, #0F2D5E, #1a4080)",
                            borderRadius: 3, transition: "width 0.5s ease",
                          }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 58 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{p.vote_count || 0}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>votes</div>
                      </div>
                      <IconBtn
                        Icon={Eye}
                        color="#0F2D5E"
                        bg="#eef2ff"
                        title="View voters"
                        onClick={() => showVoters(p.id)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <ActionModal
          title={modal.editId ? "Edit Project" : "Add Project"}
          subtitle={modal.editId ? "Update project details" : "Add a new project for voting"}
          size="lg"
          saving={saving}
          onClose={closeModal}
          footer={
            <>
              <GhostBtn onClick={closeModal} disabled={saving}>Cancel</GhostBtn>
              <GoldBtn onClick={save} disabled={saving}>
                {saving ? "Saving…" : modal.editId ? "Update Project" : "Add Project"}
              </GoldBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Project name" required full>
              <input
                className="input"
                value={modal.form.name}
                onChange={e => setField("name", e.target.value)}
                placeholder="Smart Water Monitoring System"
              />
            </Field>
            <Field label="Team / Author">
              <input
                className="input"
                value={modal.form.team}
                onChange={e => setField("team", e.target.value)}
                placeholder="Team Innovate"
              />
            </Field>
            <Field label="Category">
              <select
                className="input"
                value={modal.form.category}
                onChange={e => setField("category", e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Image URL" full>
              <input
                className="input"
                value={modal.form.image_url}
                onChange={e => setField("image_url", e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Description" full>
              <textarea
                className="input"
                value={modal.form.description}
                onChange={e => setField("description", e.target.value)}
                rows={4}
                placeholder="Describe the project…"
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
          </div>
        </ActionModal>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        tone="danger"
        title="Delete project"
        message={deleteConfirm ? `Remove ${deleteConfirm.name}? All of its votes will also be deleted.` : ""}
        confirmLabel="Delete Project"
        loading={deleting}
        onCancel={() => !deleting && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmModal
        open={toggleVotingConfirm}
        tone={votingOpen ? "warning" : "info"}
        title={votingOpen ? "Close voting" : "Open voting"}
        message={votingOpen
          ? "Delegates will no longer be able to cast votes. Any votes already cast are preserved."
          : "Delegates will be able to cast their vote from the mobile app."}
        confirmLabel={votingOpen ? "Close voting" : "Open voting"}
        onCancel={() => setToggleVotingConfirm(false)}
        onConfirm={toggleVoting}
      />

      {voterModal && (
        <ActionModal
          title="Voter Details"
          subtitle={`${voters.length} delegate${voters.length !== 1 ? "s" : ""}`}
          onClose={() => { setVoterModal(null); setVoters([]); }}
          footer={
            <GhostBtn onClick={() => { setVoterModal(null); setVoters([]); }}>Close</GhostBtn>
          }
        >
          {voters.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>
              No votes for this project yet
            </div>
          ) : (
            <div>
              {voters.map(v => (
                <div key={v.id} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: "1px solid #f1f5f9",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {v.organization && `${v.organization} · `}{v.email}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {new Date(v.voted_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ActionModal>
      )}
    </Layout>
  );
}

/* ───────── Project Card ───────── */
function ProjectCard({ project, onEdit, onDelete }) {
  const cs = CAT_STYLES[project.category] || CAT_STYLES.other;
  return (
    <div
      className="card"
      style={{
        padding: 0, overflow: "hidden",
        display: "flex", flexDirection: "column",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 6px 18px -6px rgba(15,45,94,0.15)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.transform = "";
      }}
    >
      {/* Image / placeholder */}
      <div style={{
        height: 140, background: `linear-gradient(135deg, ${cs.bg}, white)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottom: "1px solid #f1f5f9", position: "relative",
      }}>
        {project.image_url ? (
          <img
            src={project.image_url} alt={project.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <ImageIcon size={36} color={cs.color} style={{ opacity: 0.45 }} />
        )}
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <Chip label={project.category || "other"} color={cs.color} bg="white" border={cs.border} small uppercase />
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>{project.name}</div>
            {project.team && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{project.team}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            <IconBtn Icon={Pencil} color="#7c3aed" bg="#f5f3ff" title="Edit" onClick={onEdit} />
            <IconBtn Icon={Trash2} color="#dc2626" bg="#fff5f5" title="Remove" onClick={onDelete} />
          </div>
        </div>

        {project.description && (
          <div style={{
            fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {project.description}
          </div>
        )}

        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "#64748b",
        }}>
          <Users size={12} />
          <span><strong style={{ color: "#0f172a" }}>{project.vote_count ?? 0}</strong> vote{(project.vote_count ?? 0) !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
