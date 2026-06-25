import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";
import { postAnalystQuestion } from "../lib/api";
import { formatEPA, formatTDVS } from "../lib/utils";

const STARTER_QUESTIONS = [
  "Was the 2020 draft class good or bad overall?",
  "Who is the biggest draft steal since 2018?",
  "Was Patrick Mahomes actually the best value pick of the 2017 draft?",
  "Which team has been the best at drafting over the last 10 years?",
  "Why do teams keep overdrafting running backs?",
];

const MAX_MESSAGES = 20;

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "10px 14px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--text-muted)",
            animation: `bounce 1.2s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`@keyframes bounce { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }`}</style>
    </div>
  );
}

function PlayerMiniChart({ player }) {
  if (!player.season_breakdown || player.season_breakdown.length === 0) return null;
  return (
    <div className="card" style={{ marginTop: 8, padding: 12, maxWidth: 320 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{player.player_name}</span>
        <span className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>
          TDVS {formatTDVS(player.tdvs)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
        Pick #{player.pick} ({player.draft_year}) · {formatEPA(player.rookie_epa_total)} actual vs.{" "}
        {formatEPA(player.expected_epa)} expected
      </div>
      <div style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={player.season_breakdown}>
            <XAxis dataKey="season" stroke="var(--text-muted)" fontSize={10} />
            <YAxis hide />
            {player.expected_epa !== null && (
              <ReferenceLine y={player.expected_epa / 4} stroke="var(--accent)" strokeDasharray="3 3" />
            )}
            <Bar dataKey="total_epa" radius={[3, 3, 0, 0]}>
              {player.season_breakdown.map((d, i) => (
                <Cell key={i} fill={d.total_epa >= 0 ? "var(--steal)" : "var(--bust)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Analyst() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sessionFull = messages.length >= MAX_MESSAGES;

  const send = async (text) => {
    const question = text.trim();
    if (!question || loading || sessionFull) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const result = await postAnalystQuestion(question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, cached: result.cached, dataPoints: result.data_points },
      ]);
    } catch (err) {
      if (err.message.includes("429")) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 10000);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Rate limit reached — please wait a moment." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Analyst temporarily unavailable. Try again." },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>AI Draft Analyst</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>
        Ask plain-English questions about draft history, steals, busts, and team trends.
      </p>

      <div className="card" style={{ flex: 1, overflowY: "auto", padding: 16, marginBottom: 12 }}>
        {messages.length === 0 && (
          <div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>Try asking:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="mono"
                  onClick={() => setInput(q)}
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: 2,
                    padding: "8px 12px",
                    fontSize: 11.5,
                    textAlign: "left",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div
              style={{
                maxWidth: "75%",
                background: m.role === "user" ? "var(--accent-dim)" : "var(--bg-elevated)",
                borderLeft: `3px solid ${m.role === "user" ? "var(--accent)" : "var(--bg-border)"}`,
                borderRadius: 2,
                padding: "10px 14px",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {m.content}
              {m.cached && (
                <span
                  style={{
                    display: "inline-block",
                    marginLeft: 8,
                    fontSize: 10,
                    color: "var(--text-muted)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: 4,
                    padding: "1px 5px",
                  }}
                >
                  [cached]
                </span>
              )}
            </div>
            {m.dataPoints && m.dataPoints.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {m.dataPoints.map((p) => (
                  <PlayerMiniChart key={p.gsis_id} player={p} />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {rateLimited && (
        <p style={{ fontSize: 12, color: "var(--neutral)", marginBottom: 8 }}>
          Rate limit reached — please wait a moment.
        </p>
      )}

      {sessionFull && (
        <p style={{ fontSize: 12, color: "var(--bust)", marginBottom: 8 }}>
          Session limit reached — start a new session.
        </p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a draft class, player, or team..."
          rows={1}
          disabled={sessionFull}
          style={{
            flex: 1,
            resize: "none",
            maxHeight: 72,
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--bg-border)",
            borderRadius: 2,
            padding: "10px 14px",
            fontSize: 14,
          }}
        />
        <button
          className="mono"
          onClick={() => send(input)}
          disabled={!input.trim() || loading || sessionFull}
          style={{
            background: input.trim() && !loading && !sessionFull ? "var(--ink)" : "var(--bg-elevated)",
            color: input.trim() && !loading && !sessionFull ? "var(--bg-base)" : "var(--text-muted)",
            border: "none",
            borderRadius: 2,
            padding: "0 20px",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
