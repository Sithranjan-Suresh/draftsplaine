import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const initialYear = Number(searchParams.get("year")) || 2020;
  const [year, setYear] = useState(initialYear);
  const [team, setTeam] = useState("");
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredPlayer, setHoveredPlayer] = useState(null);

  const handleRebuild = (forYear = year) => {
    setLoading(true);
    setError(null);
    fetchRedraft(forYear, team || undefined)
      .then(setSimResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (searchParams.get("year")) {
      handleRebuild(initialYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div
        style={{
          background: "var(--neutral-dim)",
          border: "1px solid var(--neutral)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 13,
          color: "var(--text-primary)",
        }}
      >
        The Optimized Order ranks players purely by the value they produced relative to their slot — it is{" "}
        <strong>not</strong> a prescriptive draft strategy. Team need, positional scarcity, and pre-draft scouting
        information aren't modeled, so it can place a player at a much earlier slot than any team would have
        realistically used on them (e.g. a Day 3 steal "moving up" to a top-10 slot).
      </div>

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
          onClick={() => handleRebuild()}
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
          <div className="card" style={{ maxHeight: 360, overflowY: "auto", padding: "8px 0" }}>
            {(() => {
              const maxAbsDelta = Math.max(1, ...simResult.team_deltas.map((td) => Math.abs(td.delta ?? 0)));
              return simResult.team_deltas.map((td) => {
                const barWidthPct = td.delta !== null ? (Math.abs(td.delta) / maxAbsDelta) * 100 : 0;
                return (
                  <div
                    key={td.team}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 50px 1fr 110px",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 14px",
                      borderBottom: "1px solid var(--bg-border)",
                    }}
                  >
                    <TeamLogo teamAbbr={td.team} size={24} />
                    <span style={{ fontSize: 13 }}>{td.team}</span>
                    {td.delta !== null ? (
                      <div style={{ height: 14, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${barWidthPct}%`,
                            background: td.delta >= 0 ? "var(--steal)" : "var(--bust)",
                            borderRadius: 4,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>insufficient qualifying picks</span>
                    )}
                    {td.delta !== null && (
                      <span
                        className="mono"
                        style={{ color: td.delta >= 0 ? "var(--steal)" : "var(--bust)", fontSize: 13, textAlign: "right" }}
                      >
                        {formatEPA(td.delta)} EPA
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}
    </div>
  );
}
