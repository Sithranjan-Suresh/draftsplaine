export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 60,
        color: "var(--text-muted)",
      }}
    >
      <svg width="36" height="36" viewBox="0 0 50 50" style={{ animation: "spin 0.9s linear infinite" }}>
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="90 60"
        />
      </svg>
      <span style={{ fontSize: 13 }}>{label}</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
