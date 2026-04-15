import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Award, ExternalLink, Search, Building2, Mail,
} from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import {
  Toast, useToast, StatCard, IconBtn, Chip, FilterBar,
  LoadingState, EmptyState, SegmentedTabs, ActionModal, ConfirmModal,
  Field, GhostBtn, GoldBtn,
} from "../components/ui";

const TIERS = ["platinum", "gold", "silver", "bronze", "supporter", "media"];

const TIER_STYLES = {
  platinum:  { color: "#334155", bg: "#f1f5f9", border: "#cbd5e1", gradient: "linear-gradient(90deg, #e2e8f0, #cbd5e1)" },
  gold:      { color: "#92620c", bg: "#fef9e7", border: "#f6d860", gradient: "linear-gradient(90deg, #C8A951, #e2c87a)" },
  silver:    { color: "#475569", bg: "#f8fafc", border: "#e2e8f0", gradient: "linear-gradient(90deg, #94a3b8, #cbd5e1)" },
  bronze:    { color: "#92400e", bg: "#fef3c7", border: "#fcd34d", gradient: "linear-gradient(90deg, #d97706, #b45309)" },
  supporter: { color: "#3730a3", bg: "#eef2ff", border: "#c7d2fe", gradient: "linear-gradient(90deg, #6366f1, #818cf8)" },
  media:     { color: "#c2410c", bg: "#ffedd5", border: "#fdba74", gradient: "linear-gradient(90deg, #f97316, #fb923c)" },
};

const EMPTY = {
  name: "", logo_url: "", website: "", tier: "gold",
  description: "", contact_name: "", contact_email: "", display_order: 0
};

export default function Sponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { message, show } = useToast();

  async function load() {
    try {
      const data = await api("/event/sponsors");
      setSponsors(data.sponsors || []);
    } catch (e) {
      show("error", e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ form: { ...EMPTY }, editId: null }); }
  function openEdit(s) { setModal({ form: { ...EMPTY, ...s }, editId: s.id }); }
  function closeModal() { if (!saving) setModal(null); }
  function setField(k, v) { setModal(m => ({ ...m, form: { ...m.form, [k]: v } })); }

  async function save() {
    if (!modal.form.name.trim()) return show("error", "Name is required");
    setSaving(true);
    try {
      if (modal.editId) {
        await api(`/event/sponsors/${modal.editId}`, { method: "PUT", body: modal.form });
        show("success", `${modal.form.name} updated`);
      } else {
        await api("/event/sponsors", { method: "POST", body: modal.form });
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
      await api(`/event/sponsors/${deleteConfirm.id}`, { method: "DELETE" });
      show("success", `${deleteConfirm.name} removed`);
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      show("error", e.message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = sponsors.filter(s => {
    if (filterTier !== "all" && s.tier !== filterTier) return false;
    const q = search.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q) ||
      (s.contact_name || "").toLowerCase().includes(q)
    );
  });

  // Group filtered by tier
  const grouped = TIERS.reduce((acc, tier) => {
    const group = filtered.filter(s => s.tier === tier);
    if (group.length > 0) acc[tier] = group;
    return acc;
  }, {});

  const tierCounts = TIERS.reduce((acc, t) => {
    acc[t] = sponsors.filter(s => s.tier === t).length;
    return acc;
  }, {});

  return (
    <Layout>
      <div style={{ padding: "8px 0 28px" }} className="animate-in">
        <PageHeader
          title="Sponsors"
          subtitle="Organisations supporting FICA Congress 2026"
          action={
            <GoldBtn onClick={openAdd}>
              <Plus size={15} /> Add Sponsor
            </GoldBtn>
          }
        />

        <Toast message={message} />

        {/* Stats — tier counts */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12, marginBottom: 16,
        }}>
          <StatCard label="Total" value={sponsors.length} color="#0F2D5E" />
          <StatCard label="Platinum" value={tierCounts.platinum} color={TIER_STYLES.platinum.color} />
          <StatCard label="Gold" value={tierCounts.gold} color={TIER_STYLES.gold.color} />
          <StatCard label="Silver" value={tierCounts.silver} color={TIER_STYLES.silver.color} />
          <StatCard label="Bronze" value={tierCounts.bronze} color={TIER_STYLES.bronze.color} />
        </div>

        {/* Filters */}
        <FilterBar>
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Search sponsors…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <SegmentedTabs
            value={filterTier}
            onChange={setFilterTier}
            options={[
              { value: "all", label: "All", count: sponsors.length },
              ...TIERS
                .filter(t => tierCounts[t] > 0)
                .map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1), count: tierCounts[t] })),
            ]}
          />
        </FilterBar>

        {/* List grouped by tier */}
        {loading ? (
          <LoadingState label="Loading sponsors…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            Icon={Award}
            title="No sponsors to show"
            subtitle={sponsors.length === 0 ? "Add your first sponsor to get started." : "Try clearing the search or changing the tier filter."}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {Object.entries(grouped).map(([tier, group]) => {
              const ts = TIER_STYLES[tier];
              return (
                <div key={tier}>
                  {/* Tier header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                  }}>
                    <div style={{ width: 28, height: 4, borderRadius: 2, background: ts.gradient }} />
                    <div style={{
                      fontSize: 12, fontWeight: 800, color: ts.color,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>{tier}</div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {group.length} sponsor{group.length !== 1 ? "s" : ""}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
                  </div>

                  {/* Tier sponsors */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: tier === "platinum"
                      ? "repeat(auto-fill, minmax(400px, 1fr))"
                      : "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: 12,
                  }}>
                    {group.map(s => (
                      <SponsorCard
                        key={s.id}
                        sponsor={s}
                        tier={tier}
                        onEdit={() => openEdit(s)}
                        onDelete={() => setDeleteConfirm(s)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <ActionModal
          title={modal.editId ? "Edit Sponsor" : "Add Sponsor"}
          subtitle={modal.editId ? "Update sponsor details" : "Register a new sponsor"}
          size="lg"
          saving={saving}
          onClose={closeModal}
          footer={
            <>
              <GhostBtn onClick={closeModal} disabled={saving}>Cancel</GhostBtn>
              <GoldBtn onClick={save} disabled={saving}>
                {saving ? "Saving…" : modal.editId ? "Update Sponsor" : "Add Sponsor"}
              </GoldBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Company / Organisation" required full>
              <input
                className="input"
                value={modal.form.name}
                onChange={e => setField("name", e.target.value)}
                placeholder="ANZ Bank Fiji"
              />
            </Field>
            <Field label="Tier" required>
              <select
                className="input"
                value={modal.form.tier}
                onChange={e => setField("tier", e.target.value)}
              >
                {TIERS.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
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
            <Field label="Logo URL" full>
              <input
                className="input"
                value={modal.form.logo_url}
                onChange={e => setField("logo_url", e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Website" full>
              <input
                className="input"
                value={modal.form.website}
                onChange={e => setField("website", e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Description" full>
              <textarea
                className="input"
                value={modal.form.description}
                onChange={e => setField("description", e.target.value)}
                placeholder="About this sponsor…"
                rows={3}
              />
            </Field>
            <Field label="Contact name">
              <input
                className="input"
                value={modal.form.contact_name}
                onChange={e => setField("contact_name", e.target.value)}
                placeholder="Peter Shalendra"
              />
            </Field>
            <Field label="Contact email">
              <input
                type="email"
                className="input"
                value={modal.form.contact_email}
                onChange={e => setField("contact_email", e.target.value)}
                placeholder="contact@company.com"
              />
            </Field>
          </div>
        </ActionModal>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        tone="danger"
        title="Remove sponsor"
        message={deleteConfirm ? `Remove ${deleteConfirm.name} from the congress? This cannot be undone.` : ""}
        confirmLabel="Remove Sponsor"
        loading={deleting}
        onCancel={() => !deleting && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />
    </Layout>
  );
}

/* ───────── Sponsor card ───────── */
function SponsorCard({ sponsor, tier, onEdit, onDelete }) {
  const ts = TIER_STYLES[tier] || TIER_STYLES.gold;
  const isPlatinum = tier === "platinum";
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
      <div style={{ height: 3, background: ts.gradient }} />
      <div style={{ padding: 16, display: "flex", gap: 14 }}>
        {/* Logo tile */}
        <div style={{
          width: isPlatinum ? 96 : 76,
          height: isPlatinum ? 60 : 48,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
        }}>
          {sponsor.logo_url ? (
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              style={{ maxWidth: "86%", maxHeight: "86%", objectFit: "contain" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <Award size={20} color="#cbd5e1" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14.5, fontWeight: 700, color: "#0f172a",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{sponsor.name}</div>
              <div style={{ marginTop: 5 }}>
                <Chip
                  label={tier.toUpperCase()}
                  color={ts.color}
                  bg={ts.bg}
                  border={ts.border}
                  small
                  uppercase
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
              {sponsor.website && (
                <IconBtn
                  Icon={ExternalLink}
                  color="#0F2D5E"
                  bg="#eef2ff"
                  title="Visit website"
                  onClick={() => window.open(sponsor.website, "_blank", "noopener")}
                />
              )}
              <IconBtn Icon={Pencil} color="#7c3aed" bg="#f5f3ff" title="Edit" onClick={onEdit} />
              <IconBtn Icon={Trash2} color="#dc2626" bg="#fff5f5" title="Remove" onClick={onDelete} />
            </div>
          </div>

          {sponsor.description && (
            <div style={{
              fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {sponsor.description}
            </div>
          )}

          {(sponsor.contact_name || sponsor.contact_email) && (
            <div style={{
              display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap",
              paddingTop: 10, borderTop: "1px solid #f1f5f9",
            }}>
              {sponsor.contact_name && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
                  <Building2 size={11} /> {sponsor.contact_name}
                </div>
              )}
              {sponsor.contact_email && (
                <a
                  href={`mailto:${sponsor.contact_email}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#2563eb", textDecoration: "none" }}
                >
                  <Mail size={11} /> {sponsor.contact_email}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
