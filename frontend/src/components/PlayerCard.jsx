import { BarChart, Bar, Cell, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import usePlayer from "../hooks/usePlayer";
import TeamLogo from "./TeamLogo";
import TDVSBadge from "./TDVSBadge";
import LoadingSpinner from "./LoadingSpinner";
import ErrorBanner from "./ErrorBanner";
import { formatEPA } from "../lib/utils";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="mono card" style={{ borderLeft: "3px solid var(--accent)", padding: "8px 12px", fontSize: 12 }}>
      <div>Season {label}</div>
      <div>EPA: {formatEPA(payload[0].value)}</div>
    </div>
  );
}

export default function PlayerCard({ gsisId, onClose }) {
  const { data, loading, error } = usePlayer(gsisId);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ maxWidth: 600, width: "100%", padding: 24, position: "relative", maxHeight: "85vh", overflowY: "auto" }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--bg-elevated)",
            border: "none",
            borderRadius: 8,
            width: 32,
            height: 32,
            color: "var(--text-primary)",
            fontSize: 16,
          }}
        >
          ×
        </button>

        {loading && <LoadingSpinner label="Loading player..." />}
        {error && <ErrorBanner message={error} />}

        {data && (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 8 }}>
              <TeamLogo teamAbbr={data.team} size={44} />
              <div>
                <h2 style={{ fontSize: 22 }}>{data.player_name}</h2>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {data.position} · {data.team_name} · {data.draft_year} draft, pick {data.pick} (Round {data.round})
                </div>
              </div>
            </div>

            {!data.modeled && (
              <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: 14, margin: "16px 0", color: "var(--text-muted)", fontSize: 13 }}>
                TDVS not available — position not yet modeled for this position group.
              </div>
            )}

            {data.modeled && !data.qualifying && (
              <div style={{ background: "var(--bust-dim)", border: "1px solid var(--bust)", borderRadius: 10, padding: 14, margin: "16px 0", fontSize: 13 }}>
                Insufficient data — this player did not meet the minimum qualifying-play threshold across their
                rookie contract window. TDVS is not calculated.
              </div>
            )}

            {data.modeled && data.season_breakdown.length > 0 && (
              <div style={{ height: 220, margin: "20px 0" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.season_breakdown}>
                    <CartesianGrid stroke="var(--bg-border)" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="season" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip content={<ChartTooltip />} />
                    {data.expected_epa !== null && (
                      <ReferenceLine
                        y={data.expected_epa / 4}
                        stroke="var(--accent)"
                        strokeDasharray="4 4"
                        label={{ value: "Expected/yr", fill: "var(--accent)", fontSize: 10, position: "right" }}
                      />
                    )}
                    <Bar dataKey="total_epa" radius={[4, 4, 0, 0]}>
                      {data.season_breakdown.map((d, i) => (
                        <Cell key={i} fill={d.total_epa >= 0 ? "var(--steal)" : "var(--bust)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.season_breakdown.length > 0 && data.season_breakdown.length < 4 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                Only {data.season_breakdown.length} of 4 rookie seasons contributed — TDVS score is preliminary.
              </p>
            )}

            <div style={{ display: "flex", gap: 24, marginTop: 12, flexWrap: "wrap" }}>
              <Stat label="TDVS" value={data.qualifying ? <TDVSBadge tdvs={data.tdvs} qualifying={data.qualifying} /> : "N/A"} big />
              <Stat label="Rookie EPA Total" value={formatEPA(data.rookie_epa_total)} />
              <Stat label="Expected EPA" value={formatEPA(data.expected_epa)} />
              <Stat label="Games Played" value={data.games_played_total} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, big }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: big ? 22 : 16, color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
