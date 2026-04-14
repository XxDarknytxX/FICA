export default function Badge({ value, label }) {
  const text = label || value;
  return (
    <span className={`badge badge-${value}`} style={{ textTransform: "capitalize" }}>
      {text}
    </span>
  );
}
