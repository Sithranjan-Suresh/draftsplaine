const YEARS = Array.from({ length: 11 }, (_, i) => 2022 - i); // 2022..2012

export default function DraftClassSelector({ year, onChange }) {
  return (
    <select
      value={year}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--bg-border)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 14,
        fontFamily: "var(--font-body)",
      }}
    >
      {YEARS.map((y) => (
        <option key={y} value={y}>
          {y} Draft Class
        </option>
      ))}
    </select>
  );
}
