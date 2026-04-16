import { useEffect, useState } from "react";
import {
  Save, Settings as SettingsIcon, Globe, Phone, Mail, Calendar, MapPin,
  Smartphone, Users, Send, CheckCircle2, AlertCircle, Lock,
} from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";

const SETTING_FIELDS = [
  {
    group: "Event Details",
    icon: Calendar,
    fields: [
      { key: "event_name", label: "Event Name", placeholder: "FICA Annual Congress 2026", type: "text" },
      { key: "event_theme", label: "Event Theme / Tagline", placeholder: "Navigating Tomorrow...", type: "text" },
      { key: "event_date_start", label: "Start Date", placeholder: "2026-04-14", type: "date" },
      { key: "event_date_end", label: "End Date", placeholder: "2026-04-15", type: "date" },
      { key: "max_capacity", label: "Maximum Capacity", placeholder: "500", type: "number" },
      { key: "currency", label: "Currency Code", placeholder: "FJD", type: "text" },
      { key: "timezone", label: "Timezone", placeholder: "Pacific/Fiji", type: "text" },
    ]
  },
  {
    group: "Venue & Contact",
    icon: MapPin,
    fields: [
      { key: "event_venue", label: "Venue Name & Address", placeholder: "Sofitel Fiji Resort & Spa, Denarau Island...", type: "text" },
      { key: "event_email", label: "Congress Email", placeholder: "congress@fica.org.fj", type: "email" },
      { key: "event_phone", label: "Congress Phone", placeholder: "+679 3315266", type: "text" },
      { key: "event_website", label: "Congress Website", placeholder: "https://congress.fica.org.fj", type: "url" },
    ]
  },
  {
    group: "App Configuration",
    icon: Smartphone,
    fields: [
      { key: "registration_open", label: "Registration Open", type: "bool", hint: "Controls whether new delegate accounts can self-register." },
      { key: "mobile_app_enabled", label: "Mobile App Enabled", type: "bool", hint: "Master kill-switch for the iOS + Android apps." },
      // Voting open/closed + results visibility now live on the Projects &
      // Voting page (Event Projects tab → Results) for context-appropriate
      // control next to the project list and leaderboard.
      // Panel discussions are gated per-panel on the Panel Discussions page.
    ]
  },
];

const SMTP_FIELDS = [
  { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com", type: "text", half: true },
  { key: "smtp_port", label: "SMTP Port", placeholder: "587", type: "number", half: true },
  { key: "smtp_user", label: "SMTP Username", placeholder: "noreply@fica.org.fj", type: "text", half: true },
  { key: "smtp_pass", label: "SMTP Password / App Password", placeholder: "••••••••", type: "password", half: true },
  { key: "smtp_from_email", label: "From Email", placeholder: "noreply@fica.org.fj", type: "email", half: true },
  { key: "smtp_from_name", label: "From Name", placeholder: "FICA Congress 2026", type: "text", half: true },
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  // SMTP test
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { kind, message }

  useEffect(() => {
    async function load() {
      const data = await api("/event/settings");
      setSettings(data.settings || {});
      setLoading(false);
    }
    load();
  }, []);

  function set(key) {
    return (e) => setSettings(s => ({ ...s, [key]: e.target.value }));
  }

  // Stored in event_settings as "true" / "false" strings so everything
  // (backend, mobile, other admin pages that read voting_open) keeps its
  // existing contract. This UI toggle just maps that string ↔ boolean.
  function setBool(key, nextValue) {
    setSettings(s => ({ ...s, [key]: nextValue ? "true" : "false" }));
  }
  function isOn(key) {
    const v = settings[key];
    return v === "true" || v === true;
  }

  async function save() {
    setSaving(true); setErr(""); setSaved(false);
    try {
      await api("/event/settings", { method: "PUT", body: { settings } });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo) {
      setTestResult({ kind: "error", message: "Enter an email to send the test to" });
      return;
    }
    setTesting(true); setTestResult(null);
    try {
      // Save first so the latest SMTP values are used
      await api("/event/settings", { method: "PUT", body: { settings } });
      const { message } = await api("/event/settings/test-smtp", {
        method: "POST",
        body: { to: testTo },
      });
      setTestResult({ kind: "success", message: message || "Test email sent" });
    } catch (e) {
      setTestResult({ kind: "error", message: e.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="Settings"
          subtitle="Configure FICA Congress 2026 event details, venue, and email delivery"
          action={
            <button className="btn-gold" onClick={save} disabled={saving}>
              <Save size={15} /> {saving ? "Saving..." : "Save Settings"}
            </button>
          }
        />

        {err && (
          <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: "#c53030" }}>{err}</div>
        )}
        {saved && (
          <div style={{ background: "#f0fff4", border: "1px solid #c6f6d5", borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: "#276749" }}>
            Settings saved successfully
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>Loading settings...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {SETTING_FIELDS.map(({ group, icon: Icon, fields }) => (
              <div key={group} className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0F2D5E18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color="#0F2D5E" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1a202c" }}>{group}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                  {fields.map(f => (
                    f.type === "bool" ? (
                      <ToggleRow
                        key={f.key}
                        label={f.label}
                        hint={f.hint}
                        checked={isOn(f.key)}
                        onChange={(v) => setBool(f.key, v)}
                      />
                    ) : (
                      <div key={f.key}>
                        <label className="label">{f.label}</label>
                        <input
                          className="input"
                          type={f.type}
                          value={settings[f.key] || ""}
                          onChange={set(f.key)}
                          placeholder={f.placeholder}
                        />
                        {f.hint && (
                          <div style={{ fontSize: 11, color: "#718096", marginTop: 4 }}>{f.hint}</div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}

            {/* ─── Email / SMTP Configuration ─────────────────────────────── */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, paddingBottom: 14, borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#7c3aed18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mail size={16} color="#7c3aed" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1a202c" }}>Email / SMTP Configuration</div>
                  <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>
                    Used to send onboarding and password-reset emails to admins and delegates.
                  </div>
                </div>
              </div>

              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10,
                padding: "10px 14px", marginTop: 16, marginBottom: 18,
              }}>
                <Lock size={14} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: "#6d28d9", lineHeight: 1.5 }}>
                  Use an app-specific password for Gmail / Outlook. Port 587 = TLS (recommended), 465 = SSL.
                  The password is stored server-side and redacted from frontend reads on refresh.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                {SMTP_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="label">{f.label}</label>
                    <input
                      className="input"
                      type={f.type}
                      value={settings[f.key] || ""}
                      onChange={set(f.key)}
                      placeholder={f.placeholder}
                      autoComplete={f.type === "password" ? "new-password" : "off"}
                    />
                  </div>
                ))}
                <div>
                  <label className="label">Encryption</label>
                  <select
                    className="input"
                    value={settings.smtp_encryption || "tls"}
                    onChange={set("smtp_encryption")}
                  >
                    <option value="tls">TLS (port 587)</option>
                    <option value="ssl">SSL (port 465)</option>
                    <option value="none">None (not recommended)</option>
                  </select>
                </div>
              </div>

              {/* Test SMTP */}
              <div style={{
                marginTop: 20, padding: 16, borderRadius: 12,
                background: "#f8fafc", border: "1px solid #e2e8f0",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a202c", marginBottom: 10 }}>
                  Send a test email
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    className="input"
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="recipient@example.com"
                    style={{ flex: 1, minWidth: 220 }}
                  />
                  <button
                    onClick={sendTest}
                    disabled={testing}
                    className="btn-primary"
                    style={{ gap: 6 }}
                  >
                    <Send size={14} /> {testing ? "Sending..." : "Save & Send Test"}
                  </button>
                </div>
                {testResult && (
                  <div style={{
                    marginTop: 12,
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, fontWeight: 500,
                    color: testResult.kind === "success" ? "#276749" : "#c53030",
                  }}>
                    {testResult.kind === "success"
                      ? <CheckCircle2 size={15} />
                      : <AlertCircle size={15} />}
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>

            {/* Preview card */}
            <div className="card" style={{ padding: 24, background: "linear-gradient(135deg, #091f42, #0F2D5E)", color: "white" }}>
              <div style={{ fontSize: 11, color: "#C8A951", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                Event Preview (as seen in mobile app)
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                {settings.event_name || "FICA Annual Congress 2026"}
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginBottom: 12, lineHeight: 1.5 }}>
                {settings.event_theme || "Navigating Tomorrow: Accountancy in the Age of Change"}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { icon: Calendar, value: settings.event_date_start ? `${settings.event_date_start} – ${settings.event_date_end}` : "14–15 April 2026" },
                  { icon: MapPin, value: settings.event_venue?.split(",")[0] || "Sofitel Fiji Resort & Spa" },
                  { icon: Users, value: `${settings.max_capacity || "500"} Capacity` },
                  { icon: Globe, value: settings.timezone || "Pacific/Fiji" },
                ].map(({ icon: Ico, value }) => (
                  <div key={value} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Ico size={13} color="rgba(255,255,255,0.5)" />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <span style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
                  background: settings.registration_open === "true" ? "rgba(72,187,120,0.2)" : "rgba(255,255,255,0.1)",
                  color: settings.registration_open === "true" ? "#68d391" : "rgba(255,255,255,0.5)",
                  border: `1px solid ${settings.registration_open === "true" ? "rgba(72,187,120,0.4)" : "rgba(255,255,255,0.15)"}`
                }}>
                  Registration {settings.registration_open === "true" ? "Open" : "Closed"}
                </span>
                <span style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
                  background: settings.mobile_app_enabled === "true" ? "rgba(200,169,81,0.2)" : "rgba(255,255,255,0.1)",
                  color: settings.mobile_app_enabled === "true" ? "#C8A951" : "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(200,169,81,0.3)"
                }}>
                  Mobile App {settings.mobile_app_enabled === "true" ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

/**
 * iOS-style toggle switch for boolean settings. Renders the label + hint on
 * the left and a track/thumb switch on the right; click anywhere on the row
 * to toggle. Backed by a "true" / "false" string in event_settings (see
 * `setBool` above) so nothing else in the app needs to change.
 */
function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <label
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 14px",
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        borderRadius: 12,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{label}</div>
        {hint && (
          <div style={{ fontSize: 11, color: "#718096", marginTop: 3 }}>{hint}</div>
        )}
      </div>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
      />
      <div
        aria-hidden
        style={{
          width: 44, height: 26, borderRadius: 999,
          background: checked ? "#0F2D5E" : "#cbd5e1",
          position: "relative",
          transition: "background 0.15s ease",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3, left: checked ? 21 : 3,
            width: 20, height: 20, borderRadius: "50%",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.15s ease",
          }}
        />
      </div>
    </label>
  );
}
