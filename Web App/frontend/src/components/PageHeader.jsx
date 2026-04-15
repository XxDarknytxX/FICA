export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title" style={{ margin: 0 }}>{title}</h1>
        {subtitle && <p className="page-subtitle" style={{ margin: 0 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
