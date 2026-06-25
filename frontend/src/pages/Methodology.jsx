import { useEffect, useState } from "react";
import { fetchMethodology } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";

function renderMarkdown(content) {
  const lines = content.split("\n");
  const blocks = [];
  let tableBuffer = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.filter((l) => !/^\s*\|?\s*-+\s*\|/.test(l));
    const cells = rows.map((row) => row.split("|").map((c) => c.trim()).filter((c) => c.length > 0));
    blocks.push({ type: "table", rows: cells });
    tableBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (line.startsWith("|")) {
      tableBuffer.push(line);
      return;
    }
    flushTable();

    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
    } else if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
    } else if (line.startsWith("- ")) {
      blocks.push({ type: "li", text: line.slice(2) });
    } else if (line === "") {
      blocks.push({ type: "br" });
    } else {
      // Defensively merge a hard-wrapped continuation line into the
      // previous paragraph/list-item block instead of starting a new one,
      // so source text wrapped at column width doesn't render as a wall of
      // separate single-line paragraphs.
      const prev = blocks[blocks.length - 1];
      if (prev && (prev.type === "p" || prev.type === "li")) {
        prev.text = `${prev.text} ${line}`;
      } else {
        blocks.push({ type: "p", text: line });
      }
    }
  });
  flushTable();
  return blocks;
}

function InlineText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="mono" style={{ background: "var(--bg-elevated)", padding: "1px 5px", borderRadius: 4 }}>
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </>
  );
}

export default function Methodology() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMethodology()
      .then((d) => setContent(d.content))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading methodology..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!content) return null;

  const blocks = renderMarkdown(content);

  return (
    <div style={{ maxWidth: 760 }}>
      {blocks.map((block, i) => {
        if (block.type === "h1") return <h1 key={i} style={{ fontSize: 28, marginTop: 20, marginBottom: 12 }}>{block.text}</h1>;
        if (block.type === "h2")
          return (
            <h2 key={i} style={{ fontSize: 20, marginTop: 24, marginBottom: 10, color: "var(--text-primary)" }}>
              <InlineText text={block.text} />
            </h2>
          );
        if (block.type === "li")
          return (
            <li key={i} style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 6, marginLeft: 18 }}>
              <InlineText text={block.text} />
            </li>
          );
        if (block.type === "br") return <div key={i} style={{ height: 6 }} />;
        if (block.type === "table") {
          const [header, ...rows] = block.rows;
          return (
            <div key={i} className="card" style={{ overflowX: "auto", margin: "16px 0" }}>
              <table>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--bg-border)" }}>
                    {header.map((h, hi) => (
                      <th key={hi} style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", textAlign: "left" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="mono" style={{ padding: "8px 12px", fontSize: 12 }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={i} style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)", marginBottom: 8 }}>
            <InlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
