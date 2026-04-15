import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Search, Star, Mic2, Mail,
  Link2, AtSign, Building2,
} from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import {
  Toast, useToast, StatCard, IconBtn, Chip, FilterBar,
  LoadingState, EmptyState, SegmentedTabs, ActionModal, ConfirmModal,
  Field, GhostBtn, GoldBtn,
} from "../components/ui";

const EMPTY = {
  name: "", title: "", organization: "", bio: "",
  photo_url: "", email: "", linkedin: "", twitter: "",
  is_keynote: false, display_order: 0
};

export default function Speakers() {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState("all"); // all | keynote | regular
  const [modal, setModal] = useState(null); // null | { form, editId }
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { message, show } = useToast();

  async function load() {
    try {
      const data = await api("/event/speakers");
      setSpeakers(data.speakers || []);
    } catch (e) {
      show("error", e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ form: { ...EMPTY }, editId: null }); }
  function openEdit(s) {
    setModal({
      form: { ...EMPTY, ...s, is_keynote: !!s.is_keynote },
      editId: s.id,
    });
  }
  function closeModal() { if (!saving) setModal(null); }
  function setField(k, v) {
    setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));
  }

  async function save() {
    if (!modal.form.name.trim()) return show("error", "Name is required");
    setSaving(true);
    try {
      if (modal.editId) {
        await api(`/event/speakers/${modal.editId}`, { method: "PUT", body: modal.form });
        show("success", `${modal.form.name} updated`);
      } else {
        await api("/event/speakers", { method: "POST", body: modal.form });
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
      await api(`/event/speakers/${deleteConfirm.id}`, { method: "DELETE" });
      show("success", `${deleteConfirm.name} deleted`);
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      show("error", e.message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = speakers.filter(s => {
    if (filterKind === "keynote" && !s.is_keynote) return false;
    if (filterKind === "regular" && s.is_keynote) return false;
    const q = search.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.organization || "").toLowerCase().includes(q) ||
      (s.title || "").toLowerCase().includes(q)
    );
  });

  const keynoteCount = speakers.filter(s => s.is_keynote).length;

  return (
    <Layout>
      <div style={{ padding: "8px 0 28px" }} className="animate-in">
        <PageHeader
          title="Speakers"
          subtitle="Manage keynote and regular speakers for FICA Congress 2026"
          action={
            <GoldBtn onClick={openAdd}>
              <Plus size={15} /> Add Speaker
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
          <StatCard label="Total Speakers" value={speakers.length} icon={Mic2} color="#0F2D5E" />
          <StatCard label="Keynote Speakers" value={keynoteCount} icon={Star} color="#C8A951" />
          <StatCard label="With Bio" value={speakers.filter(s => s.bio).length} icon={Building2} color="#276749" />
        </div>

        {/* Filter bar */}
        <FilterBar>
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Search by name, title, or organisation…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <SegmentedTabs
            value={filterKind}
            onChange={setFilterKind}
            options={[
              { value: "all", label: "All", count: speakers.length },
              { value: "keynote", label: "Keynote", icon: Star, count: keynoteCount },
              { value: "regular", label: "Regular", count: speakers.length - keynoteCount },
            ]}
          />
        </FilterBar>

        {/* Grid */}
        {loading ? (
          <LoadingState label="Loading speakers…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            Icon={Mic2}
            title="No speakers match"
            subtitle="Try clearing the search or adjusting the filter."
          />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 14,
          }}>
            {filtered.map(s => (
              <SpeakerCard
                key={s.id}
                speaker={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setDeleteConfirm(s)}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
            Showing {filtered.length} of {speakers.length} speakers
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <ActionModal
          title={modal.editId ? "Edit Speaker" : "Add Speaker"}
          subtitle={modal.editId ? "Update speaker profile" : "Register a speaker for the congress"}
          size="lg"
          saving={saving}
          onClose={closeModal}
          footer={
            <>
              <GhostBtn onClick={closeModal} disabled={saving}>Cancel</GhostBtn>
              <GoldBtn onClick={save} disabled={saving}>
                {saving ? "Saving…" : modal.editId ? "Update Speaker" : "Add Speaker"}
              </GoldBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Full name" required full>
              <input
                className="input"
                value={modal.form.name}
                onChange={e => setField("name", e.target.value)}
                placeholder="e.g. Dr. Sarah Chen"
              />
            </Field>
            <Field label="Title / Role">
              <input
                className="input"
                value={modal.form.title}
                onChange={e => setField("title", e.target.value)}
                placeholder="Managing Partner"
              />
            </Field>
            <Field label="Organisation">
              <input
                className="input"
                value={modal.form.organization}
                onChange={e => setField("organization", e.target.value)}
                placeholder="Deloitte Fiji"
              />
            </Field>
            <Field label="Bio" full>
              <textarea
                className="input"
                value={modal.form.bio}
                onChange={e => setField("bio", e.target.value)}
                placeholder="Short professional biography…"
                rows={3}
              />
            </Field>
            <Field label="Photo URL" full>
              <input
                className="input"
                value={modal.form.photo_url}
                onChange={e => setField("photo_url", e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="input"
                value={modal.form.email}
                onChange={e => setField("email", e.target.value)}
                placeholder="speaker@example.com"
              />
            </Field>
            <Field label="LinkedIn">
              <input
                className="input"
                value={modal.form.linkedin}
                onChange={e => setField("linkedin", e.target.value)}
                placeholder="https://linkedin.com/in/…"
              />
            </Field>
            <Field label="Twitter handle">
              <input
                className="input"
                value={modal.form.twitter}
                onChange={e => setField("twitter", e.target.value)}
                placeholder="@handle"
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
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 12, padding: 12,
                background: modal.form.is_keynote ? "#fef9e7" : "#f8fafc",
                border: `1px solid ${modal.form.is_keynote ? "#f6d860" : "#e2e8f0"}`,
                borderRadius: 10, cursor: "pointer", transition: "all 0.12s",
              }}>
                <input
                  type="checkbox"
                  checked={!!modal.form.is_keynote}
                  onChange={e => setField("is_keynote", e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#C8A951" }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a202c", display: "flex", alignItems: "center", gap: 6 }}>
                    <Star size={13} color="#C8A951" fill={modal.form.is_keynote ? "#C8A951" : "transparent"} />
                    Keynote Speaker
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    Highlight this speaker as a keynote across the mobile app and schedule.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </ActionModal>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteConfirm}
        tone="danger"
        title="Delete speaker"
        message={
          deleteConfirm
            ? `Permanently delete ${deleteConfirm.name}? They'll also be unlinked from any sessions they were assigned to.`
            : ""
        }
        confirmLabel="Delete Speaker"
        loading={deleting}
        onCancel={() => !deleting && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />
    </Layout>
  );
}

/* ───────────────── Speaker Card ───────────────── */
function SpeakerCard({ speaker, onEdit, onDelete }) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=0F2D5E&color=C8A951&size=120`;
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
      {/* Top band with keynote marker */}
      <div style={{
        height: 4,
        background: speaker.is_keynote
          ? "linear-gradient(90deg, #C8A951, #e2c87a)"
          : "#eef2ff",
      }} />


      <div style={{ padding: 16, display: "flex", gap: 14 }}>
        <img
          src={speaker.photo_url || fallback}
          alt={speaker.name}
          style={{
            width: 64, height: 64, borderRadius: 14,
            objectFit: "cover", flexShrink: 0,
            border: "1px solid #e2e8f0",
          }}
          onError={(e) => { e.target.src = fallback; }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14.5, fontWeight: 700, color: "#0f172a",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{speaker.name}</div>
              {speaker.title && (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{speaker.title}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
              <IconBtn Icon={Pencil} color="#7c3aed" bg="#f5f3ff" title="Edit" onClick={onEdit} />
              <IconBtn Icon={Trash2} color="#dc2626" bg="#fff5f5" title="Delete" onClick={onDelete} />
            </div>
          </div>

          {speaker.organization && (
            <div style={{
              fontSize: 11.5, color: "#0F2D5E", fontWeight: 600, marginTop: 6,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <Building2 size={11} />
              {speaker.organization}
            </div>
          )}

          {/* Chips row */}
          {Boolean(speaker.is_keynote) && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <Chip
                label="Keynote"
                color="#92620c"
                bg="#fef9e7"
                border="#f6d860"
                small
                icon={Star}
              />
            </div>
          )}

          {speaker.bio && (
            <div style={{
              fontSize: 12, color: "#94a3b8", marginTop: 8, lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {speaker.bio}
            </div>
          )}

          {/* Social row */}
          {(speaker.email || speaker.linkedin || speaker.twitter) && (
            <div style={{
              display: "flex", gap: 8, marginTop: 10,
              paddingTop: 10, borderTop: "1px solid #f1f5f9",
            }}>
              {speaker.email && (
                <a
                  href={`mailto:${speaker.email}`}
                  style={{ color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, textDecoration: "none" }}
                  title={speaker.email}
                >
                  <Mail size={12} /> Email
                </a>
              )}
              {speaker.linkedin && (
                <a
                  href={speaker.linkedin} target="_blank" rel="noreferrer"
                  style={{ color: "#0077b5", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, textDecoration: "none" }}
                >
                  <Link2 size={12} /> LinkedIn
                </a>
              )}
              {speaker.twitter && (
                <a
                  href={speaker.twitter.startsWith("http") ? speaker.twitter : `https://twitter.com/${String(speaker.twitter).replace(/^@/, "")}`}
                  target="_blank" rel="noreferrer"
                  style={{ color: "#1da1f2", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, textDecoration: "none" }}
                >
                  <AtSign size={12} /> {speaker.twitter}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
