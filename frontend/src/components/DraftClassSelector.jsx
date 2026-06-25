export default function DraftClassSelector({ year, onChange, maxYear = 2025, minYear = 2012 }) {
  const years = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  return (
    <select
      value={year}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--bg-border)",
        borderRadius: 2,
        padding: "8px 12px",
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
      }}
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y} Draft Class
        </option>
      ))}
    </select>
  );
}
