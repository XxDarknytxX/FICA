import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Search, UserCheck, CheckCircle2, XCircle,
  Users, Crown, Globe, Ticket,
} from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import {
  Toast, useToast, StatCard, IconBtn, Chip, FilterBar, SegmentedTabs,
  LoadingState, EmptyState, ActionModal, ConfirmModal,
  Field, GhostBtn, GoldBtn,
} from "../components/ui";

const TICKET_TYPES = ["full", "day1", "day2", "virtual", "vip"];

const TICKET_STYLES = {
  full:    { color: "#0F2D5E", bg: "#eef2ff", border: "#c7d2fe" },
  day1:    { color: "#2c5282", bg: "#ebf8ff", border: "#bee3f8" },
  day2:    { color: "#276749", bg: "#f0fff4", border: "#9ae6b4" },
  virtual: { color: "#6b21a8", bg: "#f5f3ff", border: "#ddd6fe" },
  vip:     { color: "#92620c", bg: "#fef9e7", border: "#f6d860" },
};

const EMPTY = {
  name: "", email: "", organization: "", job_title: "",
  phone: "", ticket_type: "full", dietary_requirements: "",
  notes: "", check_in_day1: false, check_in_day2: false
};

export default function Attendees() {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTicket, setFilterTicket] = useState("all");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { message, show } = useToast();

  async function load() {
    try {
      const data = await api("/event/attendees");
      setAttendees(data.attendees || []);
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
        ...EMPTY, ...a,
        check_in_day1: !!a.check_in_day1,
        check_in_day2: !!a.check_in_day2,
      },
      editId: a.id,
    });
  }
  function closeModal() { if (!saving) setModal(null); }
  function setField(k, v) { setModal(m => ({ ...m, form: { ...m.form, [k]: v } })); }

  async function save() {
    if (!modal.form.name.trim()) return show("error", "Name is required");
    if (!modal.form.email.trim()) return show("error", "Email is required");
    setSaving(true);
    try {
      if (modal.editId) {
        await api(`/event/attendees/${modal.editId}`, { method: "PUT", body: modal.form });
        show("success", `${modal.form.name} updated`);
      } else {
        await api("/event/attendees", { method: "POST", body: modal.form });
        show("success", `${modal.form.name} registered`);
      }
      setModal(null);
      await load();
    } catch (e) {
      show("error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleCheckIn(a, day) {
    try {
      await api(`/event/attendees/${a.id}/checkin`, { method: "POST", body: { day } });
      await load();
    } catch (e) {
      show("error", e.message);
    }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api(`/event/attendees/${deleteConfirm.id}`, { method: "DELETE" });
      show("success", `${deleteConfirm.name} removed`);
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      show("error", e.message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = attendees.filter(a => {
    const q = search.toLowerCase();
    const matchSearch =
      (a.name || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q) ||
      (a.organization || "").toLowerCase().includes(q) ||
      (a.registration_code || "").toLowerCase().includes(q);
    const matchTicket = filterTicket === "all" || a.ticket_type === filterTicket;
    return matchSearch && matchTicket;
  });

  const checkedInCount = attendees.filter(a => a.check_in_day1 || a.check_in_day2).length;
  const ticketCounts = TICKET_TYPES.reduce((acc, t) => {
    acc[t] = attendees.filter(a => a.ticket_type === t).length;
    return acc;
  }, {});

  return (
    <Layout>
      <div style={{ padding: "8px 0 28px" }} className="animate-in">
        <PageHeader
          title="Attendees"
          subtitle="Registered delegates for FICA Congress 2026"
          action={
            <GoldBtn onClick={openAdd}>
              <Plus size={15} /> Register Attendee
            </GoldBtn>
          }
        />

        <Toast message={message} />

        {/* Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12, marginBottom: 16,
        }}>
          <StatCard label="Total" value={attendees.length} icon={Users} color="#0F2D5E" />
          <StatCard label="Checked In" value={checkedInCount} icon={UserCheck} color="#276749" sub={`of ${attendees.length}`} />
          <StatCard label="VIP" value={ticketCounts.vip} icon={Crown} color="#92620c" />
          <StatCard label="Virtual" value={ticketCounts.virtual} icon={Globe} color="#6b21a8" />
          <StatCard label="Full Access" value={ticketCounts.full} icon={Ticket} color="#2c5282" />
        </div>

        {/* Filters */}
        <FilterBar>
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Search name, email, organisation, or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <SegmentedTabs
            value={filterTicket}
            onChange={setFilterTicket}
            options={[
              { value: "all", label: "All", count: attendees.length },
              ...TICKET_TYPES
                .filter(t => ticketCounts[t] > 0)
                .map(t => ({
                  value: t,
                  label: t.charAt(0).toUpperCase() + t.slice(1),
                  count: ticketCounts[t],
                })),
            ]}
          />
        </FilterBar>

        {/* List */}
        {loading ? (
          <LoadingState label="Loading attendees…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            Icon={Users}
            title="No attendees match"
            subtitle={attendees.length === 0 ? "Register your first delegate to get started." : "Try clearing the search or changing the ticket filter."}
          />
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            {filtered.map((a, idx) => (
              <AttendeeRow
                key={a.id}
                attendee={a}
                isLast={idx === filtered.length - 1}
                onEdit={() => openEdit(a)}
                onDelete={() => setDeleteConfirm(a)}
                onToggleDay={toggleCheckIn}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
            Showing {filtered.length} of {attendees.length} attendees
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ActionModal
          title={modal.editId ? "Edit Attendee" : "Register Attendee"}
          subtitle={modal.editId ? "Update delegate details" : "Add a new congress delegate"}
          size="lg"
          saving={saving}
          onClose={closeModal}
          footer={
            <>
              <GhostBtn onClick={closeModal} disabled={saving}>Cancel</GhostBtn>
              <GoldBtn onClick={save} disabled={saving}>
                {saving ? "Saving…" : modal.editId ? "Update Attendee" : "Register"}
              </GoldBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Full name" required>
              <input
                className="input"
                value={modal.form.name}
                onChange={e => setField("name", e.target.value)}
                placeholder="Mere Ratumaiyale"
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className="input"
                value={modal.form.email}
                onChange={e => setField("email", e.target.value)}
                placeholder="email@example.com"
              />
            </Field>
            <Field label="Organisation">
              <input
                className="input"
                value={modal.form.organization}
                onChange={e => setField("organization", e.target.value)}
                placeholder="KPMG Fiji"
              />
            </Field>
            <Field label="Job title">
              <input
                className="input"
                value={modal.form.job_title}
                onChange={e => setField("job_title", e.target.value)}
                placeholder="Senior Accountant"
              />
            </Field>
            <Field label="Phone">
              <input
                className="input"
                value={modal.form.phone}
                onChange={e => setField("phone", e.target.value)}
                placeholder="+679 9234567"
              />
            </Field>
            <Field label="Ticket type">
              <select
                className="input"
                value={modal.form.ticket_type}
                onChange={e => setField("ticket_type", e.target.value)}
              >
                {TICKET_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Dietary requirements" full>
              <input
                className="input"
                value={modal.form.dietary_requirements}
                onChange={e => setField("dietary_requirements", e.target.value)}
                placeholder="Vegetarian, Halal, Gluten-Free…"
              />
            </Field>
            <Field label="Notes" full>
              <textarea
                className="input"
                value={modal.form.notes}
                onChange={e => setField("notes", e.target.value)}
                rows={2}
                placeholder="Any special requirements or notes…"
              />
            </Field>
            {modal.editId && (
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                  Check-in Status
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { key: "check_in_day1", label: "Day 1 (8 May)" },
                    { key: "check_in_day2", label: "Day 2 (9 May)" },
                  ].map(d => {
                    const checked = !!modal.form[d.key];
                    return (
                      <label
                        key={d.key}
                        style={{
                          flex: 1, display: "flex", alignItems: "center", gap: 10, padding: 12,
                          background: checked ? "#f0fff4" : "#f8fafc",
                          border: `1px solid ${checked ? "#9ae6b4" : "#e2e8f0"}`,
                          borderRadius: 10, cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => setField(d.key, e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: "#48bb78" }}
                        />
                        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? "#276749" : "#475569" }}>
                          {d.label}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ActionModal>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        tone="danger"
        title="Remove attendee"
        message={deleteConfirm ? `Remove ${deleteConfirm.name} (${deleteConfirm.email}) from the congress? This cannot be undone.` : ""}
        confirmLabel="Remove Attendee"
        loading={deleting}
        onCancel={() => !deleting && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />
    </Layout>
  );
}

/* ───────── Attendee Row ───────── */
function AttendeeRow({ attendee, isLast, onEdit, onDelete, onToggleDay }) {
  const ts = TICKET_STYLES[attendee.ticket_type] || TICKET_STYLES.full;
  const initial = (attendee.name || attendee.email || "?").charAt(0).toUpperCase();
  return (
    <div
      style={{
        padding: "14px 18px",
        borderBottom: isLast ? "none" : "1px solid #f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Left: avatar + name/email + chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #0F2D5E, #1a4080)",
            color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, flexShrink: 0,
            boxShadow: "0 1px 2px rgba(15,45,94,0.15)",
          }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {attendee.name}
            </div>
            <Chip
              label={attendee.ticket_type || "full"}
              color={ts.color} bg={ts.bg} border={ts.border}
              small uppercase
            />
            {attendee.registration_code && (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4,
                fontFamily: "ui-monospace, monospace", fontWeight: 700,
                background: "#f0f4f8", color: "#64748b",
              }}>{attendee.registration_code}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span>{attendee.email}</span>
            {attendee.organization && (
              <span style={{ color: "#cbd5e1" }}>· <span style={{ color: "#94a3b8" }}>{attendee.organization}</span></span>
            )}
            {attendee.job_title && (
              <span style={{ color: "#cbd5e1" }}>· <span style={{ color: "#94a3b8" }}>{attendee.job_title}</span></span>
            )}
          </div>
          {attendee.dietary_requirements && (
            <div style={{ fontSize: 11, color: "#92400e", marginTop: 3 }}>
              🍴 {attendee.dietary_requirements}
            </div>
          )}
        </div>
      </div>

      {/* Check-in toggles */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {[
          { key: "check_in_day1", day: "day1", label: "D1" },
          { key: "check_in_day2", day: "day2", label: "D2" },
        ].map(d => {
          const on = !!attendee[d.key];
          return (
            <button
              key={d.key}
              onClick={() => onToggleDay(attendee, d.day)}
              title={on ? `Undo check-in ${d.label}` : `Check in ${d.label}`}
              style={{
                minWidth: 52, padding: "5px 10px", borderRadius: 999,
                border: "1px solid",
                background: on ? "#f0fff4" : "#f8fafc",
                borderColor: on ? "#9ae6b4" : "#e2e8f0",
                color: on ? "#276749" : "#94a3b8",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 4,
                transition: "all 0.12s",
              }}
            >
              {on ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <IconBtn Icon={Pencil} color="#7c3aed" bg="#f5f3ff" title="Edit" onClick={onEdit} />
        <IconBtn Icon={Trash2} color="#dc2626" bg="#fff5f5" title="Remove" onClick={onDelete} />
      </div>
    </div>
  );
}
