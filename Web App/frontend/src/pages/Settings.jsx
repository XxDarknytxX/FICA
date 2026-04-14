import { useEffect, useState } from "react";
import { Save, Settings as SettingsIcon, Globe, Phone, Mail, Calendar, MapPin, Smartphone, Users } from "lucide-react";
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
      { key: "registration_open", label: "Registration Open", placeholder: "true or false", type: "text" },
      { key: "mobile_app_enabled", label: "Mobile App Enabled", placeholder: "true or false", type: "text" },
    ]
  },
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

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

  return (
    <Layout>
      <div style={{ padding: 28 }} className="animate-in">
        <PageHeader
          title="Settings"
          subtitle="Configure FICA Congress 2026 event details, venue, and mobile app settings"
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
                    <div key={f.key}>
                      <label className="label">{f.label}</label>
                      <input
                        className="input"
                        type={f.type}
                        value={settings[f.key] || ""}
                        onChange={set(f.key)}
                        placeholder={f.placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

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
