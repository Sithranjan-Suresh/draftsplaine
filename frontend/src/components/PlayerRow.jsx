import TeamLogo from "./TeamLogo";
import TDVSBadge from "./TDVSBadge";
import TooltipWrapper from "./TooltipWrapper";
import { formatEPA, roundLabel } from "../lib/utils";

export default function PlayerRow({ pick, round, teamAbbr, playerName, position, tdvs, qualifying, rookieEpaTotal, expectedEpa, modeled, onClick }) {
  const tooltipContent = (
    <div className="mono">
      <div>Pick {pick} · Round {round} · {teamAbbr}</div>
      <div>{position}</div>
      <div>Rookie EPA: {formatEPA(rookieEpaTotal)}</div>
      <div>Expected EPA: {formatEPA(expectedEpa)}</div>
      <div>TDVS: {qualifying ? tdvs?.toFixed(2) : "N/A"}</div>
    </div>
  );

  return (
    <TooltipWrapper content={tooltipContent}>
      <div
        onClick={onClick}
        style={{
          display: "grid",
          gridTemplateColumns: "48px 48px 32px 1fr 60px 90px",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          borderBottom: "1px solid var(--bg-border)",
          cursor: "pointer",
          opacity: !modeled ? 0.5 : qualifying ? 1 : 0.6,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span className="mono" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          #{pick}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            borderRadius: 6,
            padding: "2px 6px",
            textAlign: "center",
          }}
        >
          {roundLabel(round)}
        </span>
        <TeamLogo teamAbbr={teamAbbr} size={26} />
        <span style={{ color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
          {playerName}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            borderRadius: 6,
            padding: "2px 8px",
            textAlign: "center",
          }}
        >
          {position}
        </span>
        {modeled ? (
          <TDVSBadge tdvs={tdvs} qualifying={qualifying} />
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Not modeled</span>
        )}
      </div>
    </TooltipWrapper>
  );
}
