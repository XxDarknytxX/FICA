import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Bell, Send, Eye, EyeOff,
  Info, AlertTriangle, AlertOctagon, RefreshCw, Megaphone,
} from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import {
  Toast, useToast, StatCard, IconBtn, Chip, SegmentedTabs,
  LoadingState, EmptyState, ActionModal, ConfirmModal,
  Field, GhostBtn, GoldBtn,
} from "../components/ui";

const ANN_TYPES = ["info", "warning", "alert", "update", "reminder"];
const ANN_TARGETS = ["all", "day1", "day2", "vip", "virtual"];

const EMPTY = { title: "", body: "", type: "info", target: "all", published: false };

// Proper SVG icons + brand-consistent accent colors per announcement type.
const TYPE_META = {
  info:     { Icon: Info,          color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  warning:  { Icon: AlertTriangle, color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  alert:    { Icon: AlertOctagon,  color: "#c53030", bg: "#fff5f5", border: "#fecaca" },
  update:   { Icon: RefreshCw,     color: "#0F2D5E", bg: "#eef2ff", border: "#c7d2fe" },
  reminder: { Icon: Bell,          color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

function TypeIcon({ type, size = 20 }) {
  const meta = TYPE_META[type] || { Icon: Megaphone, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
  const { Icon, color, bg, border } = meta;
  return (
    <div
      style={{
        width: size + 18,
        height: size + 18,
        borderRadius: 10,
        background: bg,
        border: `1px solid ${border}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={size} color={color} strokeWidth={2} />
    </div>
  );
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { message, show } = useToast();

  async function load() {
    try {
      const data = await api("/event/announcements");
      setAnnouncements(data.announcements || []);
    } catch (e) {
      show("error", e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ form: { ...EMPTY }, editId: null }); }
  function openEdit(a) {
    setModal({
      form: {
        title: a.title, body: a.body, type: a.type,
        target: a.target, published: !!a.published,
      },
      editId: a.id,
    });
  }
  function closeModal() { if (!saving) setModal(null); }
  function setField(k, v) { setModal(m => ({ ...m, form: { ...m.form, [k]: v } })); }

  async function save() {
    if (!modal.form.title.trim()) return show("error", "Title is required");
    if (!modal.form.body.trim()) return show("error", "Message body is required");
    setSaving(true);
    try {
      if (modal.editId) {
        await api(`/event/announcements/${modal.editId}`, { method: "PUT", body: modal.form });
        show("success", "Announcement updated");
      } else {
        await api("/event/announcements", { method: "POST", body: modal.form });
        show("success", modal.form.published ? "Announcement published" : "Draft saved");
      }
      setModal(null);
      await load();
    } catch (e) {
      show("error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(ann) {
    try {
      await api(`/event/announcements/${ann.id}`, {
        method: "PUT",
        body: { ...ann, published: !ann.published }
      });
      show("success", ann.published ? "Announcement unpublished" : "Announcement published");
      await load();
    } catch (e) {
      show("error", e.message);
    }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api(`/event/announcements/${deleteConfirm.id}`, { method: "DELETE" });
      show("success", "Announcement deleted");
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      show("error", e.message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = announcements.filter(a => {
    if (filter === "published") return a.published;
    if (filter === "draft") return !a.published;
    return true;
  });

  const publishedCount = announcements.filter(a => a.published).length;
  const draftCount = announcements.length - publishedCount;

  return (
    <Layout>
      <div style={{ padding: "8px 0 28px" }} className="animate-in">
        <PageHeader
          title="Announcements"
          subtitle="Messages shown to delegates on the mobile app"
          action={
            <GoldBtn onClick={openAdd}>
              <Plus size={15} /> New Announcement
            </GoldBtn>
          }
        />

        <Toast message={message} />

        {/* Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12, marginBottom: 16,
        }}>
          <StatCard label="Total" value={announcements.length} icon={Bell} color="#0F2D5E" />
          <StatCard label="Published" value={publishedCount} icon={Send} color="#276749" />
          <StatCard label="Drafts" value={draftCount} icon={Pencil} color="#7c3aed" />
        </div>

        {/* Filter tabs */}
        <div style={{ marginBottom: 14 }}>
          <SegmentedTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: announcements.length },
              { value: "published", label: "Published", count: publishedCount },
              { value: "draft", label: "Drafts", count: draftCount },
            ]}
          />
        </div>

        {/* List */}
        {loading ? (
          <LoadingState label="Loading announcements…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            Icon={Bell}
            title={announcements.length === 0 ? "No announcements yet" : "No announcements match"}
            subtitle={announcements.length === 0 ? "Create your first announcement for delegates." : "Switch filter to see more."}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(ann => (
              <AnnouncementCard
                key={ann.id}
                ann={ann}
                onEdit={() => openEdit(ann)}
                onDelete={() => setDeleteConfirm(ann)}
                onToggle={() => togglePublish(ann)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ActionModal
          title={modal.editId ? "Edit Announcement" : "New Announcement"}
          subtitle={modal.editId ? "Update or publish changes" : "Compose a message for delegates"}
          size="lg"
          saving={saving}
          onClose={closeModal}
          footer={
            <>
              <GhostBtn onClick={closeModal} disabled={saving}>Cancel</GhostBtn>
              <GoldBtn onClick={save} disabled={saving}>
                <Send size={13} />
                {saving ? "Saving…" : modal.form.published ? "Publish Now" : "Save Draft"}
              </GoldBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Title" required full>
              <input
                className="input"
                value={modal.form.title}
                onChange={e => setField("title", e.target.value)}
                placeholder="Welcome to FICA Congress 2026!"
              />
            </Field>
            <Field label="Type">
              <select
                className="input"
                value={modal.form.type}
                onChange={e => setField("type", e.target.value)}
              >
                {ANN_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Audience">
              <select
                className="input"
                value={modal.form.target}
                onChange={e => setField("target", e.target.value)}
              >
                {ANN_TARGETS.map(t => (
                  <option key={t} value={t}>
                    {t === "all" ? "All Delegates" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Message body"
              required
              full
              hint={`${(modal.form.body || "").length} characters`}
            >
              <textarea
                className="input"
                value={modal.form.body}
                onChange={e => setField("body", e.target.value)}
                rows={5}
                placeholder="Write the announcement message here…"
              />
            </Field>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 12, padding: 12,
                background: modal.form.published ? "#f0fff4" : "#f8fafc",
                border: `1px solid ${modal.form.published ? "#9ae6b4" : "#e2e8f0"}`,
                borderRadius: 10, cursor: "pointer", transition: "all 0.12s",
              }}>
                <input
                  type="checkbox"
                  checked={!!modal.form.published}
                  onChange={e => setField("published", e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#48bb78" }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a202c" }}>Publish immediately</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    Visible to delegates in the mobile app right after save.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </ActionModal>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        tone="danger"
        title="Delete announcement"
        message={deleteConfirm ? `Delete "${deleteConfirm.title}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => !deleting && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />
    </Layout>
  );
}

/* ───────── Announcement Card ───────── */
function AnnouncementCard({ ann, onEdit, onDelete, onToggle }) {
  const meta = TYPE_META[ann.type] || { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
  const isPublished = !!ann.published;
  return (
    <div
      className="card"
      style={{
        padding: 0, overflow: "hidden",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px -4px rgba(15,45,94,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{
          width: 4, flexShrink: 0,
          background: isPublished ? "#48bb78" : "#e2e8f0",
        }} />
        <div style={{ flex: 1, padding: "16px 18px" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <TypeIcon type={ann.type} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>{ann.title}</div>
                <Chip
                  label={ann.type}
                  color={meta.color}
                  bg={meta.bg}
                  border={meta.border}
                  small
                  uppercase
                />
                <Chip
                  label={isPublished ? "Published" : "Draft"}
                  color={isPublished ? "#276749" : "#64748b"}
                  bg={isPublished ? "#f0fff4" : "#f8fafc"}
                  border={isPublished ? "#9ae6b4" : "#e2e8f0"}
                  small
                  uppercase
                />
                <span style={{
                  fontSize: 10.5, color: "#94a3b8",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                  {ann.target === "all" ? "All delegates" : ann.target}
                </span>
              </div>
              <p style={{
                fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: "6px 0 0",
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {ann.body}
              </p>
              {ann.published_at && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                  Published {new Date(ann.published_at).toLocaleString("en-FJ", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
              <IconBtn
                Icon={isPublished ? EyeOff : Eye}
                color={isPublished ? "#d97706" : "#276749"}
                bg={isPublished ? "#fffbeb" : "#f0fff4"}
                title={isPublished ? "Unpublish" : "Publish"}
                onClick={onToggle}
              />
              <IconBtn Icon={Pencil} color="#7c3aed" bg="#f5f3ff" title="Edit" onClick={onEdit} />
              <IconBtn Icon={Trash2} color="#dc2626" bg="#fff5f5" title="Delete" onClick={onDelete} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
