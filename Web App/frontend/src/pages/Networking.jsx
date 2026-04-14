import { useEffect, useState, useRef } from "react";
import {
  Plus, Pencil, Trash2, Coffee, MapPin, Users, Clock,
  MessageSquare, Send, Search, ChevronRight,
  Link2, CalendarClock, TrendingUp, CheckCircle2, XCircle,
  AlertCircle, BarChart3, Activity
} from "lucide-react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import { api } from "../services/api";

// ─── Tab identifiers ────────────────────────────────────────────────────────
const TABS = ["Overview", "Connections", "Messages", "Meetings", "Events"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const avatar = (name, bg = "0F2D5E", fg = "C8A951", size = 40) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=${fg}&size=${size}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-FJ", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtTime = t => t ? t.slice(0, 5) : "—";
const timeAgo = d => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const STATUS_COLORS = {
  pending: { bg: "#fefce8", color: "#854d0e", border: "#fde68a" },
  accepted: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  declined: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
  cancelled: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color = "#0F2D5E", sub }) {
  return (
    <div className="card" style={{ padding: "18px 20px", flex: 1, minWidth: 140 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 2 }}>{sub}</div>}
        </div>
        {Icon && <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={20} color={color} /></div>}
      </div>
    </div>
  );
}

function PersonChip({ name, photo, org, size = 36 }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <img src={photo || avatar(name)} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
        onError={e => { e.target.src = avatar(name); }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a202c" }}>{name}</div>
        {org && <div style={{ fontSize: 11, color: "#718096" }}>{org}</div>}
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/event/networking-stats").then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#a0aec0" }}>Loading networking overview...</div>;
  if (!stats) return <div style={{ padding: 40, textAlign: "center", color: "#a0aec0" }}>Could not load stats</div>;

  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Connections" value={stats.connections.total} icon={Link2} color="#0F2D5E" sub={`${stats.connections.accepted} accepted`} />
        <StatCard label="Pending" value={stats.connections.pending} icon={AlertCircle} color="#d97706" />
        <StatCard label="Messages" value={stats.messages.total} icon={MessageSquare} color="#7c3aed" sub={`${stats.messages.unread} unread`} />
        <StatCard label="Meetings" value={stats.meetings.total} icon={CalendarClock} color="#0891b2" sub={`${stats.meetings.accepted} confirmed`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* Most Connected */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "center" }}>
            <TrendingUp size={15} color="#0F2D5E" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a202c" }}>Most Connected</span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {stats.mostConnected.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#a0aec0", fontSize: 13 }}>No connections yet</div>
            ) : stats.mostConnected.map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 18px" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? "#C8A951" : "#a0aec0", width: 20 }}>#{i + 1}</span>
                <PersonChip name={a.name} photo={a.photo_url} org={a.organization} size={32} />
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#0F2D5E" }}>{a.conn_count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Active Chatters */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "center" }}>
            <BarChart3 size={15} color="#7c3aed" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a202c" }}>Most Active Chatters</span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {stats.activeChatters.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#a0aec0", fontSize: 13 }}>No messages yet</div>
            ) : stats.activeChatters.map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 18px" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? "#C8A951" : "#a0aec0", width: 20 }}>#{i + 1}</span>
                <PersonChip name={a.name} photo={a.photo_url} org={a.organization} size={32} />
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>{a.msg_count} msgs</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "center" }}>
            <Activity size={15} color="#0891b2" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a202c" }}>Recent Activity</span>
          </div>
          <div style={{ padding: "4px 0", overflowY: "auto", maxHeight: 380 }}>
            {stats.recentActivity.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#a0aec0", fontSize: 13 }}>No activity yet</div>
            ) : stats.recentActivity.map((a, i) => (
              <div key={`${a.activity_type}-${a.id}-${i}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 18px", borderBottom: "1px solid #f8fafc" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: a.activity_type === "connection" ? "#ede9fe" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  {a.activity_type === "connection" ? <Link2 size={13} color="#7c3aed" /> : <MessageSquare size={13} color="#16a34a" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#4a5568" }}>
                    <strong>{a.from_name}</strong>
                    {a.activity_type === "connection" ? " connected with " : " messaged "}
                    <strong>{a.to_name}</strong>
                  </div>
                  {a.activity_type === "connection" && <StatusBadge status={a.status} />}
                  <div style={{ fontSize: 10, color: "#a0aec0", marginTop: 2 }}>{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CONNECTIONS TAB ─────────────────────────────────────────────────────────
function ConnectionsTab() {
  const [connections, setConnections] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ requester_id: "", requested_id: "" });
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function load() {
    const [c, a] = await Promise.all([api("/event/connections"), api("/event/directory")]);
    setConnections(c.connections || []);
    setAttendees(a.attendees || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    await api(`/event/connections/${id}`, { method: "PUT", body: { status } });
    await load();
  }

  async function doDelete(id) {
    await api(`/event/connections/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  }

  async function createConn() {
    if (!createForm.requester_id || !createForm.requested_id) return;
    setCreating(true);
    try {
      await api("/event/connections", { method: "POST", body: { requester_id: parseInt(createForm.requester_id), requested_id: parseInt(createForm.requested_id) } });
      setShowCreate(false);
      setCreateForm({ requester_id: "", requested_id: "" });
      await load();
    } catch (e) { alert(e.message); } finally { setCreating(false); }
  }

  const counts = { all: connections.length, pending: 0, accepted: 0, declined: 0 };
  connections.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++; });

  const filtered = connections.filter(c => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.requester_name || "").toLowerCase().includes(q) || (c.requested_name || "").toLowerCase().includes(q) ||
        (c.requester_org || "").toLowerCase().includes(q) || (c.requested_org || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total" value={counts.all} icon={Link2} color="#0F2D5E" />
        <StatCard label="Pending" value={counts.pending} icon={AlertCircle} color="#d97706" />
        <StatCard label="Accepted" value={counts.accepted} icon={CheckCircle2} color="#16a34a" />
        <StatCard label="Declined" value={counts.declined} icon={XCircle} color="#dc2626" />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "pending", "accepted", "declined"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s", textTransform: "capitalize",
              background: filter === f ? "#0F2D5E" : "white", color: filter === f ? "white" : "#4a5568", borderColor: filter === f ? "#0F2D5E" : "#e2e8f0",
            }}>{f} ({counts[f]})</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a0aec0" }} />
            <input className="search-input" style={{ paddingLeft: 32, width: 220 }} placeholder="Search connections..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-gold" onClick={() => setShowCreate(true)}><Plus size={15} /> Create Connection</button>
        </div>
      </div>

      {/* Connection list */}
      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#a0aec0" }}>Loading connections...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => (
            <div key={c.id} className="card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <PersonChip name={c.requester_name} photo={c.requester_photo} org={c.requester_org} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 30, height: 2, background: "#e2e8f0" }} />
                  <Link2 size={14} color="#a0aec0" />
                  <div style={{ width: 30, height: 2, background: "#e2e8f0" }} />
                </div>
                <PersonChip name={c.requested_name} photo={c.requested_photo} org={c.requested_org} />
                <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
                  <StatusBadge status={c.status} />
                  <span style={{ fontSize: 11, color: "#a0aec0" }}>{timeAgo(c.created_at)}</span>
                  {c.status === "pending" && (
                    <>
                      <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "#16a34a" }} onClick={() => updateStatus(c.id, "accepted")}>
                        <CheckCircle2 size={13} /> Accept
                      </button>
                      <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "#dc2626" }} onClick={() => updateStatus(c.id, "declined")}>
                        <XCircle size={13} /> Decline
                      </button>
                    </>
                  )}
                  <button className="btn-danger" style={{ padding: "4px 8px" }} onClick={() => setDeleteConfirm(c)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card" style={{ padding: 60, textAlign: "center", color: "#a0aec0" }}>
              <Link2 size={36} color="#e2e8f0" style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 600 }}>No connections found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Connections will appear here when delegates start networking</div>
            </div>
          )}
        </div>
      )}

      {/* Create Connection Modal */}
      {showCreate && (
        <Modal title="Create Connection" onClose={() => setShowCreate(false)} size="md">
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label className="label">Requester (From)</label>
              <select className="input" value={createForm.requester_id} onChange={e => setCreateForm(f => ({ ...f, requester_id: e.target.value }))}>
                <option value="">— Select attendee —</option>
                {attendees.map(a => <option key={a.id} value={a.id}>{a.name} – {a.organization}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Requested (To)</label>
              <select className="input" value={createForm.requested_id} onChange={e => setCreateForm(f => ({ ...f, requested_id: e.target.value }))}>
                <option value="">— Select attendee —</option>
                {attendees.filter(a => String(a.id) !== String(createForm.requester_id)).map(a => <option key={a.id} value={a.id}>{a.name} – {a.organization}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-gold" onClick={createConn} disabled={creating || !createForm.requester_id || !createForm.requested_id}>
                {creating ? "Creating..." : "Create Connection"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay"><div className="modal" style={{ maxWidth: 420 }}><div style={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Connection?</div>
          <div style={{ fontSize: 14, color: "#718096" }}>Remove connection between <strong>{deleteConfirm.requester_name}</strong> and <strong>{deleteConfirm.requested_name}</strong>?</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button style={{ background: "#e53e3e", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500 }} onClick={() => doDelete(deleteConfirm.id)}>Delete</button>
          </div>
        </div></div></div>
      )}
    </div>
  );
}

// ─── MESSAGES TAB ────────────────────────────────────────────────────────────
function MessagesTab() {
  const [attendees, setAttendees] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [convoWith, setConvoWith] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [newMsg, setNewMsg] = useState({ sender_id: "", receiver_id: "", subject: "", body: "" });
  const [composeMode, setComposeMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);

  async function load() {
    const [atts, msgs] = await Promise.all([api("/event/directory"), api("/event/messages")]);
    setAttendees(atts.attendees || []);
    setMessages(msgs.messages || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function loadConversation(a, b) {
    const data = await api(`/event/messages/conversation?a=${a.id}&b=${b.id}`);
    setConversation(data.messages || []);
    setSelectedConvo(a);
    setConvoWith(b);
    setComposeMode(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function sendMsg() {
    if (!newMsg.sender_id || !newMsg.receiver_id || !newMsg.body.trim()) return;
    setSending(true);
    try {
      await api("/event/messages", { method: "POST", body: { ...newMsg, sender_id: parseInt(newMsg.sender_id), receiver_id: parseInt(newMsg.receiver_id) } });
      setNewMsg({ sender_id: "", receiver_id: "", subject: "", body: "" });
      setComposeMode(false);
      await load();
    } catch (e) { alert(e.message); } finally { setSending(false); }
  }

  async function deleteMsg(id) {
    await api(`/event/messages/${id}`, { method: "DELETE" });
    await load();
    if (selectedConvo && convoWith) await loadConversation(selectedConvo, convoWith);
  }

  // Unique conversations list
  const convos = [];
  const seen = new Set();
  for (const m of messages) {
    const key = [Math.min(m.sender_id, m.receiver_id), Math.max(m.sender_id, m.receiver_id)].join("-");
    if (!seen.has(key)) { seen.add(key); convos.push(m); }
  }

  const filteredConvos = convos.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.sender_name || "").toLowerCase().includes(q) || (m.receiver_name || "").toLowerCase().includes(q);
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#718096" }}>
            {messages.length} messages · {convos.length} conversations
          </span>
          {unreadCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "#fefce8", color: "#854d0e", border: "1px solid #fde68a" }}>
              {unreadCount} unread
            </span>
          )}
        </div>
        <button className="btn-gold" onClick={() => { setComposeMode(true); setSelectedConvo(null); setConvoWith(null); setNewMsg({ sender_id: "", receiver_id: "", subject: "", body: "" }); }}>
          <Plus size={15} /> Compose Message
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, minHeight: 500 }}>
        {/* Conversation list */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#a0aec0" }} />
              <input className="search-input" style={{ width: "100%", paddingLeft: 28, fontSize: 12, padding: "6px 8px 6px 28px" }} placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ overflowY: "auto", maxHeight: 600 }}>
            {loading ? <div style={{ padding: 24, textAlign: "center", color: "#a0aec0" }}>Loading...</div> :
              filteredConvos.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#a0aec0", fontSize: 13 }}>No conversations yet</div> :
              filteredConvos.map(m => {
                const a = { id: m.sender_id, name: m.sender_name, photo: m.sender_photo };
                const b = { id: m.receiver_id, name: m.receiver_name, photo: m.receiver_photo };
                const isActive = selectedConvo?.id === a.id && convoWith?.id === b.id;
                return (
                  <div key={`${m.sender_id}-${m.receiver_id}`}
                    onClick={() => loadConversation(a, b)}
                    style={{ padding: "12px 14px", borderBottom: "1px solid #f0f4f8", cursor: "pointer", background: isActive ? "#f0f4f8" : "white", transition: "background 0.15s" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ position: "relative" }}>
                        <img src={a.photo || avatar(a.name)} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} onError={e => { e.target.src = avatar(a.name); }} />
                        <img src={b.photo || avatar(b.name, "C8A951", "0F2D5E")} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", position: "absolute", bottom: -4, right: -6, border: "2px solid white" }} onError={e => { e.target.src = avatar(b.name, "C8A951", "0F2D5E"); }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: "#a0aec0" }}>with {b.name}</div>
                      </div>
                      {!m.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8A951", flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 4, paddingLeft: 44, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.body}</div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Right panel */}
        <div>
          {composeMode ? (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Compose Message</div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label className="label">From (Sender)</label>
                  <select className="input" value={newMsg.sender_id} onChange={e => setNewMsg(m => ({ ...m, sender_id: e.target.value }))}>
                    <option value="">— Select sender —</option>
                    {attendees.map(a => <option key={a.id} value={a.id}>{a.name} – {a.organization}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">To (Recipient)</label>
                  <select className="input" value={newMsg.receiver_id} onChange={e => setNewMsg(m => ({ ...m, receiver_id: e.target.value }))}>
                    <option value="">— Select recipient —</option>
                    {attendees.filter(a => String(a.id) !== String(newMsg.sender_id)).map(a => <option key={a.id} value={a.id}>{a.name} – {a.organization}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Subject</label>
                  <input className="input" value={newMsg.subject} onChange={e => setNewMsg(m => ({ ...m, subject: e.target.value }))} placeholder="Optional subject..." />
                </div>
                <div>
                  <label className="label">Message *</label>
                  <textarea className="input" rows={5} value={newMsg.body} onChange={e => setNewMsg(m => ({ ...m, body: e.target.value }))} placeholder="Write your message here..." />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn-ghost" onClick={() => setComposeMode(false)}>Cancel</button>
                  <button className="btn-gold" onClick={sendMsg} disabled={sending || !newMsg.sender_id || !newMsg.receiver_id || !newMsg.body.trim()}>
                    <Send size={14} /> {sending ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </div>
            </div>
          ) : selectedConvo ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 10, alignItems: "center", background: "#f8fafc" }}>
                <img src={selectedConvo.photo || avatar(selectedConvo.name)} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} onError={e => { e.target.src = avatar(selectedConvo.name); }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedConvo.name}</div>
                  <div style={{ fontSize: 12, color: "#a0aec0" }}>with {convoWith?.name}</div>
                </div>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#a0aec0" }}>{conversation.length} messages</span>
              </div>
              <div style={{ padding: "12px 20px", overflowY: "auto", maxHeight: 480, display: "flex", flexDirection: "column", gap: 10 }}>
                {conversation.map(msg => {
                  const isSender = msg.sender_id === selectedConvo.id;
                  return (
                    <div key={msg.id} style={{ display: "flex", flexDirection: isSender ? "row" : "row-reverse", gap: 8, alignItems: "flex-start" }}>
                      <img src={isSender ? (selectedConvo.photo || avatar(msg.sender_name)) : avatar(msg.receiver_name, "C8A951", "0F2D5E")}
                        alt="" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} onError={e => { e.target.src = avatar(isSender ? msg.sender_name : msg.receiver_name); }} />
                      <div style={{ maxWidth: "70%" }}>
                        {msg.subject && <div style={{ fontSize: 11, fontWeight: 700, color: "#a0aec0", marginBottom: 2 }}>{msg.subject}</div>}
                        <div style={{ background: isSender ? "#0F2D5E" : "#f0f4f8", color: isSender ? "white" : "#1a202c", padding: "10px 14px", borderRadius: isSender ? "12px 12px 12px 3px" : "12px 12px 3px 12px", fontSize: 13, lineHeight: 1.5 }}>
                          {msg.body}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
                          <span style={{ fontSize: 10, color: "#a0aec0" }}>{new Date(msg.sent_at).toLocaleString("en-FJ", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
                          <button onClick={() => deleteMsg(msg.id)} style={{ background: "none", border: "none", color: "#e2e8f0", cursor: "pointer", padding: 0, fontSize: 10, display: "flex", alignItems: "center" }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "#a0aec0" }}>
              <MessageSquare size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 600, fontSize: 15 }}>Select a conversation</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Or compose a new message to get started</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MEETINGS TAB ────────────────────────────────────────────────────────────
function MeetingsTab() {
  const [meetings, setMeetings] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ requester_id: "", requested_id: "", title: "", meeting_date: "2026-05-08", start_time: "", end_time: "", location: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function load() {
    const [m, a] = await Promise.all([api("/event/meetings"), api("/event/directory")]);
    setMeetings(m.meetings || []);
    setAttendees(a.attendees || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createMeeting() {
    if (!form.requester_id || !form.requested_id) return;
    setSaving(true);
    try {
      await api("/event/meetings", { method: "POST", body: { ...form, requester_id: parseInt(form.requester_id), requested_id: parseInt(form.requested_id) } });
      setShowCreate(false);
      setForm({ requester_id: "", requested_id: "", title: "", meeting_date: "2026-05-08", start_time: "", end_time: "", location: "", notes: "" });
      await load();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  }

  async function updateStatus(id, status) {
    await api(`/event/meetings/${id}`, { method: "PUT", body: { status } });
    await load();
  }

  async function doDelete(id) {
    await api(`/event/meetings/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  }

  const counts = { all: meetings.length, pending: 0, accepted: 0, declined: 0, cancelled: 0 };
  meetings.forEach(m => { if (counts[m.status] !== undefined) counts[m.status]++; });

  const filtered = meetings.filter(m => filter === "all" || m.status === filter);

  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total" value={counts.all} icon={CalendarClock} color="#0891b2" />
        <StatCard label="Pending" value={counts.pending} icon={AlertCircle} color="#d97706" />
        <StatCard label="Confirmed" value={counts.accepted} icon={CheckCircle2} color="#16a34a" />
        <StatCard label="Cancelled" value={counts.cancelled} icon={XCircle} color="#64748b" />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "pending", "accepted", "declined", "cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s", textTransform: "capitalize",
              background: filter === f ? "#0F2D5E" : "white", color: filter === f ? "white" : "#4a5568", borderColor: filter === f ? "#0F2D5E" : "#e2e8f0",
            }}>{f} ({counts[f] || 0})</button>
          ))}
        </div>
        <button className="btn-gold" onClick={() => setShowCreate(true)}><Plus size={15} /> Schedule Meeting</button>
      </div>

      {/* Meetings list */}
      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#a0aec0" }}>Loading meetings...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(m => (
            <div key={m.id} className="card" style={{ padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <PersonChip name={m.requester_name} photo={m.requester_photo} org={m.requester_org} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 2, background: "#e2e8f0" }} />
                  <CalendarClock size={14} color="#a0aec0" />
                  <div style={{ width: 24, height: 2, background: "#e2e8f0" }} />
                </div>
                <PersonChip name={m.requested_name} photo={m.requested_photo} org={m.requested_org} />

                <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  {m.title && <span style={{ fontSize: 13, fontWeight: 600, color: "#1a202c" }}>{m.title}</span>}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#718096", fontSize: 12 }}>
                    <CalendarClock size={12} />
                    {m.meeting_date ? fmtDate(m.meeting_date) : "TBD"}
                    {m.start_time && <> · {fmtTime(m.start_time)}{m.end_time && `–${fmtTime(m.end_time)}`}</>}
                  </div>
                  {m.location && <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, color: "#718096" }}><MapPin size={12} />{m.location}</div>}
                  <StatusBadge status={m.status} />
                  {m.status === "pending" && (
                    <>
                      <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "#16a34a" }} onClick={() => updateStatus(m.id, "accepted")}>
                        <CheckCircle2 size={13} /> Confirm
                      </button>
                      <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "#dc2626" }} onClick={() => updateStatus(m.id, "declined")}>
                        <XCircle size={13} /> Decline
                      </button>
                    </>
                  )}
                  {m.status !== "cancelled" && (
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "#64748b" }} onClick={() => updateStatus(m.id, "cancelled")}>Cancel</button>
                  )}
                  <button className="btn-danger" style={{ padding: "4px 8px" }} onClick={() => setDeleteConfirm(m)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {m.notes && <div style={{ marginTop: 8, paddingLeft: 48, fontSize: 12, color: "#718096", fontStyle: "italic" }}>{m.notes}</div>}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card" style={{ padding: 60, textAlign: "center", color: "#a0aec0" }}>
              <CalendarClock size={36} color="#e2e8f0" style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 600 }}>No meetings found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Schedule 1:1 meetings between delegates</div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showCreate && (
        <Modal title="Schedule 1:1 Meeting" onClose={() => setShowCreate(false)} size="lg">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
            <div>
              <label className="label">Requester *</label>
              <select className="input" value={form.requester_id} onChange={sf("requester_id")}>
                <option value="">— Select attendee —</option>
                {attendees.map(a => <option key={a.id} value={a.id}>{a.name} – {a.organization}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Meeting With *</label>
              <select className="input" value={form.requested_id} onChange={sf("requested_id")}>
                <option value="">— Select attendee —</option>
                {attendees.filter(a => String(a.id) !== String(form.requester_id)).map(a => <option key={a.id} value={a.id}>{a.name} – {a.organization}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}><label className="label">Meeting Title</label><input className="input" value={form.title} onChange={sf("title")} placeholder="e.g. Introduction & Partnership Discussion" /></div>
            <div><label className="label">Date</label><select className="input" value={form.meeting_date} onChange={sf("meeting_date")}><option value="2026-05-08">Day 1 – 8 May 2026</option><option value="2026-05-09">Day 2 – 9 May 2026</option></select></div>
            <div><label className="label">Location</label><input className="input" value={form.location} onChange={sf("location")} placeholder="e.g. Business Lounge, Crowne Plaza Fiji" /></div>
            <div><label className="label">Start Time</label><input className="input" type="time" value={form.start_time} onChange={sf("start_time")} /></div>
            <div><label className="label">End Time</label><input className="input" type="time" value={form.end_time} onChange={sf("end_time")} /></div>
            <div style={{ gridColumn: "1/-1" }}><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={sf("notes")} placeholder="Additional meeting notes..." /></div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-gold" onClick={createMeeting} disabled={saving || !form.requester_id || !form.requested_id}>
              {saving ? "Scheduling..." : "Schedule Meeting"}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay"><div className="modal" style={{ maxWidth: 420 }}><div style={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Meeting?</div>
          <div style={{ fontSize: 14, color: "#718096" }}>Remove meeting between <strong>{deleteConfirm.requester_name}</strong> and <strong>{deleteConfirm.requested_name}</strong>?</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button style={{ background: "#e53e3e", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500 }} onClick={() => doDelete(deleteConfirm.id)}>Delete</button>
          </div>
        </div></div></div>
      )}
    </div>
  );
}

// ─── EVENTS TAB ──────────────────────────────────────────────────────────────
const NET_TYPES = ["cocktail", "lunch", "coffee", "dinner", "gala", "tour", "breakfast"];
const TYPE_ICONS = { cocktail: "🍸", lunch: "🍽️", coffee: "☕", dinner: "🍷", gala: "✨", tour: "🗺️", breakfast: "🌅" };
const EMPTY_SLOT = { title: "", description: "", start_time: "", end_time: "", slot_date: "2026-05-08", location: "", capacity: "", type: "cocktail", dress_code: "" };

function SlotForm({ form, setForm, onSave, onCancel, saving, err }) {
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div>
      {err && <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#c53030" }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div style={{ gridColumn: "1/-1" }}><label className="label">Event Title *</label><input className="input" value={form.title} onChange={s("title")} placeholder="e.g. Welcome Cocktail Reception" required /></div>
        <div><label className="label">Type *</label><select className="input" value={form.type} onChange={s("type")}>{NET_TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
        <div><label className="label">Date *</label><select className="input" value={form.slot_date} onChange={s("slot_date")}><option value="2026-05-08">Day 1 – 8 May 2026</option><option value="2026-05-09">Day 2 – 9 May 2026</option></select></div>
        <div><label className="label">Start Time *</label><input className="input" type="time" value={form.start_time} onChange={s("start_time")} required /></div>
        <div><label className="label">End Time *</label><input className="input" type="time" value={form.end_time} onChange={s("end_time")} required /></div>
        <div style={{ gridColumn: "1/-1" }}><label className="label">Location</label><input className="input" value={form.location} onChange={s("location")} placeholder="e.g. Waterfront Terrace, Crowne Plaza Fiji" /></div>
        <div><label className="label">Capacity</label><input className="input" type="number" value={form.capacity} onChange={s("capacity")} placeholder="e.g. 400" /></div>
        <div><label className="label">Dress Code</label><input className="input" value={form.dress_code} onChange={s("dress_code")} placeholder="e.g. Smart Casual" /></div>
        <div style={{ gridColumn: "1/-1" }}><label className="label">Description</label><textarea className="input" value={form.description} onChange={s("description")} rows={3} placeholder="Event description..." /></div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={onSave} className="btn-gold" disabled={saving}>{saving ? "Saving..." : "Save Event"}</button>
      </div>
    </div>
  );
}

function EventsTab() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_SLOT);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeDay, setActiveDay] = useState("all");

  async function load() { const d = await api("/event/networking"); setSlots(d.slots || []); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY_SLOT); setEditId(null); setErr(""); setModal(true); }
  function openEdit(s) { setForm({ ...s, slot_date: String(s.slot_date).split("T")[0], capacity: s.capacity || "" }); setEditId(s.id); setErr(""); setModal(true); }

  async function save() {
    setErr(""); setSaving(true);
    const payload = { ...form, capacity: form.capacity ? parseInt(form.capacity) : null };
    try {
      if (!editId) await api("/event/networking", { method: "POST", body: payload });
      else await api(`/event/networking/${editId}`, { method: "PUT", body: payload });
      setModal(false); await load();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  async function doDelete(id) { await api(`/event/networking/${id}`, { method: "DELETE" }); setDeleteConfirm(null); await load(); }

  const filtered = slots.filter(s => activeDay === "all" || String(s.slot_date).startsWith(activeDay))
    .sort((a, b) => String(a.slot_date).localeCompare(String(b.slot_date)) || a.start_time.localeCompare(b.start_time));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ v: "all", l: "All" }, { v: "2026-05-08", l: "Day 1" }, { v: "2026-05-09", l: "Day 2" }].map(d => (
            <button key={d.v} onClick={() => setActiveDay(d.v)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s", background: activeDay === d.v ? "#0F2D5E" : "white", color: activeDay === d.v ? "white" : "#4a5568", borderColor: activeDay === d.v ? "#0F2D5E" : "#e2e8f0" }}>{d.l}</button>
          ))}
        </div>
        <button className="btn-gold" onClick={openAdd}><Plus size={15} /> Add Event</button>
      </div>
      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#a0aec0" }}>Loading...</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {filtered.map(s => {
            const isDay1 = String(s.slot_date).startsWith("2026-05-08");
            return (
              <div key={s.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ height: 4, background: s.type === "gala" ? "linear-gradient(90deg,#C8A951,#e2c87a)" : s.type === "cocktail" ? "linear-gradient(90deg,#6b21a8,#9333ea)" : s.type === "lunch" || s.type === "breakfast" ? "linear-gradient(90deg,#276749,#48bb78)" : "linear-gradient(90deg,#0F2D5E,#1a4080)" }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 20 }}>{TYPE_ICONS[s.type]}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</div>
                          <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                            <Badge value={s.type} />
                            <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 20, fontWeight: 600, background: isDay1 ? "#e6fffa" : "#ebf8ff", color: isDay1 ? "#234e52" : "#2c5282" }}>{isDay1 ? "Day 1" : "Day 2"}</span>
                          </div>
                        </div>
                      </div>
                      {s.description && <p style={{ fontSize: 12, color: "#718096", margin: "6px 0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</p>}
                      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}><Clock size={11} color="#a0aec0" /><span style={{ fontSize: 12, fontWeight: 600, color: "#4a5568" }}>{s.start_time} – {s.end_time}</span></div>
                        {s.location && <div style={{ display: "flex", gap: 4, alignItems: "center" }}><MapPin size={11} color="#a0aec0" /><span style={{ fontSize: 12, color: "#718096" }}>{s.location}</span></div>}
                        {s.capacity && <div style={{ display: "flex", gap: 4, alignItems: "center" }}><Users size={11} color="#a0aec0" /><span style={{ fontSize: 12, color: "#718096" }}>{s.capacity}</span></div>}
                      </div>
                      {s.dress_code && <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 4 }}>Dress: {s.dress_code}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
                      <button onClick={() => openEdit(s)} className="btn-ghost" style={{ padding: "4px 8px" }}><Pencil size={13} /></button>
                      <button onClick={() => setDeleteConfirm(s)} className="btn-danger" style={{ padding: "4px 8px" }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ gridColumn: "1/-1", padding: 60, textAlign: "center", color: "#a0aec0" }}><Coffee size={36} color="#e2e8f0" style={{ marginBottom: 10 }} /><div style={{ fontWeight: 600 }}>No events found</div></div>}
        </div>
      )}
      {modal && <Modal title={editId ? "Edit Event" : "Add Networking Event"} onClose={() => setModal(false)} size="lg"><SlotForm form={form} setForm={setForm} onSave={save} onCancel={() => setModal(false)} saving={saving} err={err} /></Modal>}
      {deleteConfirm && (
        <div className="modal-overlay"><div className="modal" style={{ maxWidth: 420 }}><div style={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Event?</div>
          <div style={{ fontSize: 14, color: "#718096" }}>Remove <strong>{deleteConfirm.title}</strong>?</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button style={{ background: "#e53e3e", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500 }} onClick={() => doDelete(deleteConfirm.id)}>Delete</button>
          </div>
        </div></div></div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function Networking() {
  const [tab, setTab] = useState("Overview");

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="Networking"
          subtitle="Monitor connections, messages, meetings, and networking events across the congress"
        />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e2e8f0" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 600, transition: "all 0.15s",
                color: tab === t ? "#0F2D5E" : "#718096",
                borderBottom: `2px solid ${tab === t ? "#0F2D5E" : "transparent"}`,
                marginBottom: -2,
              }}
            >{t}</button>
          ))}
        </div>

        {tab === "Overview" && <OverviewTab />}
        {tab === "Connections" && <ConnectionsTab />}
        {tab === "Messages" && <MessagesTab />}
        {tab === "Meetings" && <MeetingsTab />}
        {tab === "Events" && <EventsTab />}
      </div>
    </Layout>
  );
}
