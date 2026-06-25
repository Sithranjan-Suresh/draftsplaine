import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Draft Board" },
  { to: "/curve", label: "Curve" },
  { to: "/redraft", label: "Redraft" },
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
        padding: "14px 24px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--bg-border)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 20,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        Draft<span style={{ color: "var(--accent)" }}>Spline</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              background: isActive ? "var(--accent-dim)" : "transparent",
              textDecoration: "none",
              transition: "background 0.15s, color 0.15s",
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
