import { useMemo, useState } from "react";
import useDraftClass from "../hooks/useDraftClass";
import DraftClassSelector from "../components/DraftClassSelector";
import PlayerRow from "../components/PlayerRow";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";
import PlayerCard from "../components/PlayerCard";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE"];

// Pre-computed headline stats from the live dataset (2012-2025 pipeline run,
// bust rates computed on the 2012-2022 complete-rookie-window subset for an
// apples-to-apples comparison). Hardcoded rather than fetched live so they
// render instantly with zero loading flicker. Recompute if the pipeline reruns.
const HERO_STATS = [
  {
    label: "Most Undervalued Pick (2012-2025)",
    value: "Brock Purdy",
    detail: "TDVS 24.48 at pick #262 — but the 49ers' historically strong OL and receiving corps confound this; see caveat below",
  },
  { label: "Worst Drafting Franchise", value: "New York Jets", detail: "-1,096.9 EPA below expectation, 2012-2025" },
  {
    label: "Highest-Bust-Rate Position",
    value: "Quarterback",
    detail: "55% bust rate vs. 43% RB / 40% WR / 36% TE (TDVS < 0.5, 2012-2022 complete-window classes)",
  },
];

// Bust rate (TDVS < 0.5) by position, 2012-2022 complete-window classes only
// -- the same apples-to-apples comparison cited in the QB hero stat above,
// shown visually so the claim is checkable at a glance rather than trusted
// in isolation.
const BUST_RATES = [
  { position: "QB", rate: 55.2 },
  { position: "RB", rate: 43.1 },
  { position: "WR", rate: 39.9 },
  { position: "TE", rate: 35.6 },
];

function BustRateChart() {
  const max = Math.max(...BUST_RATES.map((b) => b.rate));
  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
        Bust rate by position (TDVS &lt; 0.5, qualifying picks, 2012-2022 complete rookie windows)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {BUST_RATES.map((b) => (
          <div key={b.position} style={{ display: "grid", gridTemplateColumns: "36px 1fr 50px", alignItems: "center", gap: 10 }}>
            <span className="mono" style={{ fontSize: 12 }}>
              {b.position}
            </span>
            <div style={{ height: 12, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(b.rate / max) * 100}%`,
                  background: b.position === "QB" ? "var(--bust)" : "var(--neutral)",
                  borderRadius: 4,
                }}
              />
            </div>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
              {b.rate}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DraftBoard() {
  const [year, setYear] = useState(2020);
  const [sortMode, setSortMode] = useState("pick");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [showUnmodeled, setShowUnmodeled] = useState(false);
  const [search, setSearch] = useState("");

  const { data, loading, error } = useDraftClass(year);

  const sortedPicks = useMemo(() => {
    if (!data) return [];
    let picks = [...data.picks];
    if (positionFilter !== "ALL") {
      picks = picks.filter((p) => p.position === positionFilter);
    } else if (!showUnmodeled) {
      picks = picks.filter((p) => p.modeled);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      picks = picks.filter((p) => p.player_name.toLowerCase().includes(q));
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
  }, [data, sortMode, positionFilter, showUnmodeled, search]);

  const unmodeledCount = data ? data.picks.filter((p) => !p.modeled).length : 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {HERO_STATS.map((stat) => (
          <div key={stat.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {stat.label}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--accent)", marginBottom: 4 }}>
              {stat.value}
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-primary)" }}>
              {stat.detail}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--neutral-dim)",
          border: "1px solid var(--neutral)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 24,
          fontSize: 13,
          color: "var(--text-primary)",
          lineHeight: 1.5,
        }}
      >
        <strong>On the Purdy number above:</strong> TDVS measures outcome relative to slot expectation — it does not
        adjust for offensive line quality, receiving talent, or scheme. Purdy's 24.48 is, in part, a stress-test of
        the model's biggest blind spot, not a clean claim that he's the best value pick in isolation. We surface
        this directly rather than only on the player card, because leading with the most contestable number and
        immediately flagging why it's contestable is more honest than burying the caveat.
      </div>

      <BustRateChart />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>TDVS Draft Board</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            True Draft Value Score for every pick in the class.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player..."
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--bg-border)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              width: 160,
            }}
          />
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

      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
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
        {positionFilter === "ALL" && unmodeledCount > 0 && (
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <input type="checkbox" checked={showUnmodeled} onChange={(e) => setShowUnmodeled(e.target.checked)} />
            Show unmodeled picks ({unmodeledCount} defensive / OL / ST picks hidden)
          </label>
        )}
      </div>

      {loading && <LoadingSpinner label="Loading draft class..." />}
      {error && <ErrorBanner message={error} />}

      {!loading && !error && data && !data.window_complete && (
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
          Partial data — this class has {data.rookie_seasons_elapsed} of 4 rookie seasons available. TDVS scores are
          preliminary and will change.
        </div>
      )}

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
