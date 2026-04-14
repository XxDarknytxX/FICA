export default function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      marginBottom: 24, gap: 16
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a202c", margin: 0, lineHeight: 1.3 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: "#718096", margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
