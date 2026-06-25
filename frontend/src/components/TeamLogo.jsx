import { useState } from "react";
import { teamLogoUrl } from "../lib/utils";

export default function TeamLogo({ teamAbbr, size = 24 }) {
  const [errored, setErrored] = useState(false);

  if (errored || !teamAbbr) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--bg-elevated)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: size * 0.38,
          fontWeight: 700,
          color: "var(--text-primary)",
          flexShrink: 0,
        }}
      >
        {teamAbbr || "?"}
      </div>
    );
  }

  return (
    <img
      src={teamLogoUrl(teamAbbr)}
      alt={teamAbbr}
      width={size}
      height={size}
      style={{ objectFit: "contain", flexShrink: 0 }}
      onError={() => setErrored(true)}
    />
  );
}
