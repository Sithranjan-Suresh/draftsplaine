import { useMemo, useState } from "react";
import useTeams from "../hooks/useTeams";
import TeamLogo from "../components/TeamLogo";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";
import { formatEPA, formatTDVS } from "../lib/utils";

const COLUMNS = [
  { key: "rank", label: "#" },
  { key: "team", label: "Team" },
  { key: "seasons_evaluated", label: "Seasons" },
  { key: "mean_tdvs", label: "Mean TDVS" },
  { key: "weighted_tdvs", label: "Weighted TDVS" },
  { key: "epa_vs_expected", label: "EPA vs Expected" },
];

export default function GMScorecard() {
  const { data, loading, error } = useTeams();
  const [sortKey, setSortKey] = useState("weighted_tdvs");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    if (!data) return [];
    const teams = [...data.teams];
    teams.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return teams;
  }, [data, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const best = data?.teams.find((t) => t.rank === 1);
  const worst = data?.teams.length ? data.teams.reduce((a, b) => (b.rank > a.rank ? b : a)) : null;

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>GM Scorecard</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>
        Franchise-level drafting efficiency, 2012-2025.
      </p>

      {best && worst && (
        <div className="hero-grid-2" style={{ marginBottom: 20 }}>
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderColor: "var(--steal)",
              borderWidth: "1px 1px 1px 3px",
              clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)",
            }}
          >
            <div className="eyebrow" style={{ color: "var(--steal)", marginBottom: 8 }}>
              Case file — best drafting franchise
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TeamLogo teamAbbr={best.team} size={32} />
              <div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 17, color: "var(--ink)" }}>
                  {best.team_name || best.team}
                </div>
                <div className="mono" style={{ fontSize: 12, color: "var(--steal)", fontWeight: 600 }}>
                  +{formatEPA(best.epa_vs_expected).replace("+", "").replace("-", "")} EPA above expectation
                </div>
              </div>
            </div>
          </div>
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderColor: "var(--bust)",
              borderWidth: "1px 1px 1px 3px",
              clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)",
            }}
          >
            <div className="eyebrow" style={{ color: "var(--bust)", marginBottom: 8 }}>
              Case file — worst drafting franchise
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TeamLogo teamAbbr={worst.team} size={32} />
              <div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 17, color: "var(--ink)" }}>
                  {worst.team_name || worst.team}
                </div>
                <div className="mono" style={{ fontSize: 12, color: "var(--bust)", fontWeight: 600 }}>
                  {formatEPA(worst.epa_vs_expected)} EPA below expectation
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner label="Loading team scorecards..." />}
      {error && <ErrorBanner message={error} />}

      {!loading && !error && data && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bg-border)" }}>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="mono eyebrow"
                    onClick={() => toggleSort(col.key)}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    {col.label} {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.team} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 13 }} className="mono">
                    {t.rank}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <TeamLogo teamAbbr={t.team} size={26} />
                      <span style={{ fontSize: 13 }}>{t.team_name || t.team}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-muted)" }}>
                    {t.seasons_evaluated.length} seasons
                  </td>
                  <td className="mono" style={{ padding: "10px 14px", fontSize: 13 }}>
                    {formatTDVS(t.mean_tdvs)}
                  </td>
                  <td className="mono" style={{ padding: "10px 14px", fontSize: 13, color: "var(--accent)" }}>
                    {formatTDVS(t.weighted_tdvs)}
                  </td>
                  <td className="mono" style={{ padding: "10px 14px", fontSize: 13 }}>
                    {formatEPA(t.epa_vs_expected)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
