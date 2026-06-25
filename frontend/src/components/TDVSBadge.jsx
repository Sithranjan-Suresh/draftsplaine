import { formatTDVS, getTDVSColor, isEliteSteal } from "../lib/utils";

export default function TDVSBadge({ tdvs, qualifying }) {
  const color = getTDVSColor(tdvs, qualifying);
  const label = !qualifying ? "N/A" : formatTDVS(tdvs);
  const elite = isEliteSteal(tdvs, qualifying);

  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 600,
        color: qualifying ? color : "var(--text-muted)",
        backgroundColor: qualifying ? colorToDim(color) : "var(--bg-elevated)",
        border: `1px solid ${qualifying ? color : "var(--text-faint)"}`,
      }}
    >
      {elite && <span style={{ color: "var(--nfl-gold)" }}>★</span>}
      {label}
    </span>
  );
}

function colorToDim(cssVar) {
  if (cssVar === "var(--steal)") return "var(--steal-dim)";
  if (cssVar === "var(--bust)") return "var(--bust-dim)";
  if (cssVar === "var(--neutral)") return "var(--neutral-dim)";
  return "var(--bg-elevated)";
}
