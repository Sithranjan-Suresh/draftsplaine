import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Draft Board" },
  { to: "/curve", label: "Curve" },
  { to: "/redraft", label: "Redraft" },
  { to: "/preview", label: "2026 Draft", badge: "NEW" },
  { to: "/analyst", label: "Analyst" },
  { to: "/teams", label: "GM Scorecard" },
  { to: "/methodology", label: "Methodology" },
];

export default function NavBar() {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "13px 24px",
        background: "var(--bg-surface)",
        borderBottom: "2px solid var(--ink)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="mono"
        style={{
          fontWeight: 700,
          fontSize: 16,
          color: "var(--ink)",
          letterSpacing: "0.02em",
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            border: "1px solid var(--bg-border)",
            borderRadius: 2,
            padding: "1px 5px",
          }}
        >
          TDVS
        </span>
        DRAFT<span style={{ color: "var(--accent)" }}>SPLINE</span>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="mono"
            style={({ isActive }) => ({
              padding: "7px 13px",
              borderRadius: 2,
              fontSize: 12.5,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: "0.01em",
              color: isActive ? "var(--ink)" : "var(--text-muted)",
              background: isActive ? "var(--neutral-dim)" : "transparent",
              borderBottom: isActive
                ? "2px solid var(--highlight)"
                : "2px solid transparent",
              textDecoration: "none",
              textTransform: "uppercase",
              transition: "background 0.15s, color 0.15s, border-color 0.15s",
            })}
          >
            {link.label}
            {link.badge && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--bust)",
                  border: "1px solid var(--bust)",
                  borderRadius: 2,
                  padding: "1px 4px",
                  letterSpacing: "0.04em",
                }}
              >
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
