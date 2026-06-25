export default function ErrorBanner({ message }) {
  return (
    <div
      style={{
        background: "var(--bust-dim)",
        border: "1px solid var(--bust)",
        borderRadius: 10,
        padding: "14px 18px",
        color: "var(--text-primary)",
        fontSize: 14,
      }}
    >
      <strong style={{ color: "var(--bust)" }}>Error: </strong>
      {message || "Something went wrong."}
    </div>
  );
}
