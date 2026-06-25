export default function ErrorBanner({ message }) {
  return (
    <div
      style={{
        background: "var(--bust-dim)",
        borderLeft: "3px solid var(--bust)",
        padding: "14px 18px",
        color: "var(--text-primary)",
        fontSize: 14,
      }}
    >
      <strong className="mono" style={{ color: "var(--bust)" }}>Error: </strong>
      {message || "Something went wrong."}
    </div>
  );
}
