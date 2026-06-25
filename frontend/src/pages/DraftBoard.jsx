import { useMemo, useState } from "react";
import useDraftClass from "../hooks/useDraftClass";
import DraftClassSelector from "../components/DraftClassSelector";
import PlayerRow from "../components/PlayerRow";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";
import PlayerCard from "../components/PlayerCard";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE"];

export default function DraftBoard() {
  const [year, setYear] = useState(2020);
  const [sortMode, setSortMode] = useState("pick");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [positionFilter, setPositionFilter] = useState("ALL");

  const { data, loading, error } = useDraftClass(year);

  const sortedPicks = useMemo(() => {
    if (!data) return [];
    let picks = [...data.picks];
    if (positionFilter !== "ALL") {
      picks = picks.filter((p) => p.position === positionFilter);
    }
    if (sortMode === "pick") {
      picks.sort((a, b) => a.pick - b.pick);
    } else {
      picks.sort((a, b) => {
        const aQual = a.qualifying && a.tdvs !== null;
        const bQual = b.qualifying && b.tdvs !== null;
        if (aQual && !bQual) return -1;
        if (!aQual && bQual) return 1;
        if (!aQual && !bQual) return a.pick - b.pick;
        return b.tdvs - a.tdvs;
      });
    }
    return picks;
  }, [data, sortMode, positionFilter]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>TDVS Draft Board</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            True Draft Value Score for every pick in the class.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <DraftClassSelector year={year} onChange={setYear} />
          <button
            onClick={() => setSortMode(sortMode === "pick" ? "tdvs" : "pick")}
            style={{
              background: sortMode === "tdvs" ? "var(--accent-dim)" : "var(--bg-elevated)",
              color: sortMode === "tdvs" ? "var(--accent)" : "var(--text-primary)",
              border: `1px solid ${sortMode === "tdvs" ? "var(--accent-border)" : "var(--bg-border)"}`,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {sortMode === "pick" ? "Pick Order" : "TDVS Ranking"} — click to flip
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setPositionFilter(pos)}
            style={{
              background: positionFilter === pos ? "var(--accent-dim)" : "transparent",
              color: positionFilter === pos ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${positionFilter === pos ? "var(--accent-border)" : "var(--bg-border)"}`,
              borderRadius: 6,
              padding: "4px 12px",
              fontSize: 13,
            }}
          >
            {pos}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner label="Loading draft class..." />}
      {error && <ErrorBanner message={error} />}

      {!loading && !error && data && (
        <div className="card" style={{ maxHeight: 640, overflowY: "auto" }}>
          {sortedPicks.map((p) => (
            <div key={p.gsis_id} style={{ transition: "transform 0.28s ease, opacity 0.28s ease" }}>
              <PlayerRow
                pick={p.pick}
                round={p.round}
                teamAbbr={p.team}
                playerName={p.player_name}
                position={p.position}
                tdvs={p.tdvs}
                qualifying={p.qualifying}
                modeled={p.modeled}
                rookieEpaTotal={p.rookie_epa_total}
                expectedEpa={p.expected_epa}
                onClick={() => setSelectedPlayer(p)}
              />
            </div>
          ))}
        </div>
      )}

      {selectedPlayer && (
        <PlayerCard gsisId={selectedPlayer.gsis_id} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
