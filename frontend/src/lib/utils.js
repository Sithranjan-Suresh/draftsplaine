export function formatTDVS(tdvs) {
  if (tdvs === null || tdvs === undefined) return "N/A";
  return tdvs.toFixed(2);
}

export function formatEPA(epa) {
  if (epa === null || epa === undefined) return "—";
  const sign = epa > 0 ? "+" : "";
  return `${sign}${epa.toFixed(1)}`;
}

export function getTDVSColor(tdvs, qualifying) {
  if (!qualifying || tdvs === null || tdvs === undefined) return "var(--text-muted)";
  if (tdvs >= 1.2) return "var(--steal)";
  if (tdvs >= 0.8) return "var(--neutral)";
  if (tdvs >= 0.5) return "var(--bust)";
  return "var(--bust)";
}

export function getTDVSLabel(tdvs, qualifying) {
  if (!qualifying || tdvs === null || tdvs === undefined) return "Insufficient data";
  if (tdvs >= 2.0) return "Elite steal";
  if (tdvs >= 1.2) return "Steal";
  if (tdvs >= 0.8) return "Expected";
  if (tdvs >= 0.5) return "Underperformer";
  return "Bust";
}

export function isEliteSteal(tdvs, qualifying) {
  return qualifying && tdvs !== null && tdvs !== undefined && tdvs >= 2.0;
}

export const TEAM_LOGO_BASE = "https://static.www.nfl.com/league/api/clubs/logos";

export function teamLogoUrl(teamAbbr) {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${(teamAbbr || "").toLowerCase()}.png`;
}

export function roundLabel(round) {
  return `R${round}`;
}
