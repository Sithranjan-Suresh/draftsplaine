import { useState, useRef } from "react";

export default function TooltipWrapper({ children, content }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  if (!content) return children;

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="mono card"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-surface)",
            borderLeft: "3px solid var(--accent)",
            color: "var(--text-primary)",
            padding: "10px 12px",
            fontSize: 12,
            whiteSpace: "nowrap",
            zIndex: 200,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
