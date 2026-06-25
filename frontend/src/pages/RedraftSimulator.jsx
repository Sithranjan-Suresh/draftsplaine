import { useState } from "react";
import DraftClassSelector from "../components/DraftClassSelector";
import TeamLogo from "../components/TeamLogo";
import TDVSBadge from "../components/TDVSBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";
import { fetchRedraft } from "../lib/api";
import { formatEPA } from "../lib/utils";

function PickRow({ pick, highlighted, onHover, onLeave }) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 32px 1fr 50px 70px",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderBottom: "1px solid var(--bg-border)",
        background: highlighted ? "var(--bg-elevated)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <span className="mono" style={{ fontSize: 13 }}>
        #{pick.pick}
      </span>
      <TeamLogo teamAbbr={pick.team} size={22} />
      <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>{pick.player_name}</span>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{pick.position}</span>
      <TDVSBadge tdvs={pick.tdvs} qualifying={pick.qualifying} />
    </div>
  );
}

export default function RedraftSimulator() {
  const [year, setYear] = useState(2020);
  const [team, setTeam] = useState("");
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredPlayer, setHoveredPlayer] = useState(null);

  const handleRebuild = () => {
    setLoading(true);
    setError(null);
    fetchRedraft(year, team || undefined)
      .then(setSimResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleReset = () => {
    setSimResult(null);
    setError(null);
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Redraft Simulator</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>
        Re-order a draft class by TDVS to see what teams should have done.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <DraftClassSelector year={year} onChange={setYear} />
        <input
          placeholder="Team abbr (optional, e.g. CIN)"
          value={team}
          onChange={(e) => setTeam(e.target.value.toUpperCase())}
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--bg-border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            width: 200,
          }}
        />
        <button
          onClick={handleRebuild}
          style={{
            background: "var(--accent)",
            color: "var(--bg-base)",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Rebuild Draft
        </button>
        {simResult && (
          <button
            onClick={handleReset}
            style={{
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--bg-border)",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 14,
            }}
          >
            Reset to Original
          </button>
        )}
      </div>

      {loading && <LoadingSpinner label="Rebuilding draft..." />}
      {error && <ErrorBanner message={error} />}

      {simResult && !loading && (
        <>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            {simResult.excluded_count} picks excluded from reordering due to insufficient data.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
            <div>
              <h3 style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>Original Order</h3>
              <div className="card" style={{ maxHeight: 480, overflowY: "auto" }}>
                {simResult.original_picks.map((p) => (
                  <PickRow
                    key={p.gsis_id}
                    pick={p}
                    highlighted={hoveredPlayer === p.gsis_id}
                    onHover={() => setHoveredPlayer(p.gsis_id)}
                    onLeave={() => setHoveredPlayer(null)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>Optimized Order</h3>
              <div className="card" style={{ maxHeight: 480, overflowY: "auto" }}>
                {simResult.optimized_picks.map((p) => (
                  <PickRow
                    key={`${p.gsis_id}-opt`}
                    pick={p}
                    highlighted={hoveredPlayer === p.gsis_id}
                    onHover={() => setHoveredPlayer(p.gsis_id)}
                    onLeave={() => setHoveredPlayer(null)}
                  />
                ))}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: 16, marginBottom: 10 }}>Team Value Delta</h3>
          <div className="card" style={{ maxHeight: 360, overflowY: "auto" }}>
            {simResult.team_deltas.map((td) => (
              <div
                key={td.team}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 140px",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--bg-border)",
                }}
              >
                <TeamLogo teamAbbr={td.team} size={24} />
                <span style={{ fontSize: 13 }}>{td.team}</span>
                {td.delta !== null ? (
                  <span
                    className="mono"
                    style={{ color: td.delta >= 0 ? "var(--steal)" : "var(--bust)", fontSize: 13, textAlign: "right" }}
                  >
                    {formatEPA(td.delta)} EPA above expectation
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
                    insufficient qualifying picks
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
