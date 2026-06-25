import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { fetchDraftPreview } from "../lib/api";
import TeamLogo from "../components/TeamLogo";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";
import { formatEPA } from "../lib/utils";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "Unmodeled"];

function epaColor(value) {
  if (value === null || value === undefined) return "var(--text-muted)";
  if (value >= 40) return "var(--steal)";
  if (value >= 0) return "var(--neutral)";
  return "var(--bust)";
}

function PreviewTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const team = payload[0].payload;
  return (
    <div className="mono card" style={{ borderLeft: "3px solid var(--accent)", padding: "10px 14px", fontSize: 12, maxWidth: 260 }}>
      <div style={{ marginBottom: 6, fontWeight: 600 }}>{team.team}</div>
      {team.picks.map((p) => (
        <div key={p.pick}>
          #{p.pick} {p.player_name} — {p.expected_epa_4yr === null ? "not modeled" : formatEPA(p.expected_epa_4yr)}
        </div>
      ))}
      <div style={{ marginTop: 6, color: "var(--text-muted)" }}>Total: {formatEPA(team.total)}</div>
    </div>
  );
}

export default function DraftPreview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [showUnmodeled, setShowUnmodeled] = useState(false);
  const [sortMode, setSortMode] = useState("pick");

  useEffect(() => {
    fetchDraftPreview()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredPicks = useMemo(() => {
    if (!data) return [];
    let picks = [...data.picks];
    if (positionFilter === "Unmodeled") {
      picks = picks.filter((p) => p.unmodeled);
    } else if (positionFilter !== "ALL") {
      picks = picks.filter((p) => p.position === positionFilter);
    } else if (!showUnmodeled) {
      picks = picks.filter((p) => !p.unmodeled);
    }
    if (sortMode === "epa") {
      picks.sort((a, b) => {
        if (a.expected_epa_4yr === null && b.expected_epa_4yr === null) return a.pick - b.pick;
        if (a.expected_epa_4yr === null) return 1;
        if (b.expected_epa_4yr === null) return -1;
        return b.expected_epa_4yr - a.expected_epa_4yr;
      });
    } else {
      picks.sort((a, b) => a.pick - b.pick);
    }
    return picks;
  }, [data, positionFilter, showUnmodeled, sortMode]);

  const unmodeledCount = data ? data.picks.filter((p) => p.unmodeled).length : 0;

  const heroStats = useMemo(() => {
    if (!data) return null;
    const modeled = data.picks.filter((p) => !p.unmodeled && p.expected_epa_4yr !== null);
    const highestCeiling = modeled.length
      ? modeled.reduce((a, b) => (b.expected_epa_4yr > a.expected_epa_4yr ? b : a))
      : null;

    const round12 = modeled.filter((p) => p.round <= 2);
    const positionsInPlay = [...new Set(round12.map((p) => p.position))];
    const riskiest = positionsInPlay.length
      ? positionsInPlay.reduce((a, b) => {
          const aRate = round12.find((p) => p.position === a)?.bust_rate ?? 0;
          const bRate = round12.find((p) => p.position === b)?.bust_rate ?? 0;
          return bRate > aRate ? b : a;
        })
      : null;
    const riskiestRate = riskiest ? round12.find((p) => p.position === riskiest)?.bust_rate : null;

    return { highestCeiling, riskiest, riskiestRate };
  }, [data]);

  const teamTotals = useMemo(() => {
    if (!data) return [];
    const byTeam = {};
    data.picks.forEach((p) => {
      if (!byTeam[p.team]) byTeam[p.team] = { team: p.team, total: 0, picks: [] };
      byTeam[p.team].picks.push(p);
      if (p.expected_epa_4yr !== null) byTeam[p.team].total += p.expected_epa_4yr;
    });
    return Object.values(byTeam).sort((a, b) => b.total - a.total);
  }, [data]);

  if (loading) return <LoadingSpinner label="Loading 2026 draft preview..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div>
      <div
        style={{
          background: "var(--bg-elevated)",
          borderLeft: "3px solid var(--highlight)",
          padding: "12px 16px",
          marginBottom: 20,
          fontSize: 13,
          color: "var(--text-primary)",
        }}
      >
        {data.partial_data.message} These are slot expectations, not player projections — a pick's expected EPA
        reflects what players at this slot have historically produced on average, not a forecast of this specific
        player's career.
      </div>

      {heroStats && (
        <div className="hero-grid" style={{ marginBottom: 24 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>
              Highest-Ceiling Pick
            </div>
            {heroStats.highestCeiling ? (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--accent)" }}>
                  {heroStats.highestCeiling.player_name}
                </div>
                <div className="mono" style={{ fontSize: 12 }}>
                  Pick #{heroStats.highestCeiling.pick} ({heroStats.highestCeiling.position}) — expected{" "}
                  {formatEPA(heroStats.highestCeiling.expected_epa_4yr)} EPA
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No modeled picks yet</div>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>
              Riskiest Position Bet (R1-R2)
            </div>
            {heroStats.riskiest ? (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--bust)" }}>
                  {heroStats.riskiest}
                </div>
                <div className="mono" style={{ fontSize: 12 }}>
                  {heroStats.riskiestRate}% historical bust rate (TDVS &lt; 0.5, 2012-2022)
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No modeled picks in rounds 1-2</div>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>
              Most EPA Surrendered to Trade Up
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-muted)" }}>
              Not available
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              nflverse doesn't expose a trade-chain field (no original-team-per-pick), so this can't be computed
              without inventing it. Would need an additional trade-tracking data source.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>2026 Draft Class Preview</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Slot expectations for all {data.picks.length} picks, joined to the historical expected-EPA curve.
          </p>
        </div>
        <button
          className="mono"
          onClick={() => setSortMode(sortMode === "pick" ? "epa" : "pick")}
          style={{
            background: sortMode === "epa" ? "var(--neutral-dim)" : "var(--bg-elevated)",
            color: sortMode === "epa" ? "var(--highlight)" : "var(--text-primary)",
            border: `1px solid ${sortMode === "epa" ? "var(--highlight)" : "var(--bg-border)"}`,
            borderRadius: 2,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {sortMode === "pick" ? "Pick order" : "Expected EPA"} — click to flip
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            className="mono"
            onClick={() => setPositionFilter(pos)}
            style={{
              background: positionFilter === pos ? "var(--accent-dim)" : "transparent",
              color: positionFilter === pos ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${positionFilter === pos ? "var(--accent-border)" : "var(--bg-border)"}`,
              borderRadius: 2,
              padding: "4px 12px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {pos}
          </button>
        ))}
        {positionFilter === "ALL" && unmodeledCount > 0 && (
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <input type="checkbox" checked={showUnmodeled} onChange={(e) => setShowUnmodeled(e.target.checked)} />
            Show {unmodeledCount} unmodeled picks
          </label>
        )}
      </div>

      <div className="card" style={{ overflowX: "auto", marginBottom: 28 }}>
        <table>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--bg-border)" }}>
              {["Pick", "Round", "Team", "Player", "Position", "Expected EPA (4yr)", "Bust Rate", "Slot Tier"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPicks.map((p) => (
              <tr key={p.pick} style={{ borderBottom: "1px solid var(--bg-border)", opacity: p.unmodeled ? 0.6 : 1 }}>
                <td className="mono" style={{ padding: "8px 14px", fontSize: 13 }}>
                  #{p.pick}
                </td>
                <td style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-muted)" }}>R{p.round}</td>
                <td style={{ padding: "8px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TeamLogo teamAbbr={p.team} size={22} />
                    <span style={{ fontSize: 13 }}>{p.team}</span>
                  </div>
                </td>
                <td style={{ padding: "8px 14px", fontSize: 13 }}>{p.player_name}</td>
                <td style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-muted)" }}>{p.position}</td>
                <td className="mono" style={{ padding: "8px 14px", fontSize: 13, color: epaColor(p.expected_epa_4yr) }}>
                  {p.expected_epa_4yr === null ? "not modeled" : formatEPA(p.expected_epa_4yr)}
                </td>
                <td className="mono" style={{ padding: "8px 14px", fontSize: 13 }}>
                  {p.bust_rate === null ? "—" : `${p.bust_rate}%`}
                </td>
                <td style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-muted)" }}>{p.slot_tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 10 }}>Trade Capital — Expected EPA Acquired by Team</h2>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Sum of expected EPA across each team's 2026 picks (modeled positions only). Trade-chain data isn't available
        from nflverse, so this reflects each team's final pick slate, not who traded up or down to get there.
      </p>
      <div className="card" style={{ padding: 20, height: Math.max(520, teamTotals.length * 24) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={teamTotals} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid stroke="var(--bg-border)" strokeOpacity={0.4} horizontal={false} />
            <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
            <YAxis type="category" dataKey="team" stroke="var(--text-muted)" fontSize={11} width={50} interval={0} />
            <Tooltip content={<PreviewTooltip />} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {teamTotals.map((t, i) => (
                <Cell key={i} fill={t.total >= 0 ? "var(--steal)" : "var(--bust)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
