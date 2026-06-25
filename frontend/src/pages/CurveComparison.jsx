import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import useCurve from "../hooks/useCurve";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";

const POSITION_GROUPS = ["QB", "RB", "WR", "TE"];
const ROUND_BOUNDARIES = [32, 64, 96, 128, 160, 192];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const chase = payload.find((p) => p.dataKey === "chase")?.value;
  const draftspline = payload.find((p) => p.dataKey === "draftspline")?.value;
  const ratio = chase && draftspline !== undefined && draftspline !== null ? (draftspline / chase).toFixed(2) : null;
  return (
    <div className="mono card" style={{ borderLeft: "3px solid var(--accent)", padding: "10px 14px", fontSize: 12 }}>
      <div>Pick {label}</div>
      {chase !== undefined && <div style={{ color: "var(--text-muted)" }}>Traditional: {chase?.toFixed(2)}</div>}
      {draftspline !== undefined && draftspline !== null && (
        <div style={{ color: "var(--accent)" }}>DraftSpline: {draftspline?.toFixed(2)}</div>
      )}
      {ratio && <div>Ratio: {ratio}x</div>}
    </div>
  );
}

export default function CurveComparison() {
  const { data, loading, error } = useCurve();
  const [positionGroup, setPositionGroup] = useState("QB");

  const chartData = useMemo(() => {
    if (!data) return [];
    const chaseSeries = data.comparison_chart.chase_chart;
    const positionRaw = data.curve.filter((c) => c.position_group === positionGroup).sort((a, b) => a.pick - b.pick);
    if (positionRaw.length === 0) return [];
    const base = positionRaw[0].expected_epa || 1;
    const byPick = {};
    positionRaw.forEach((row) => {
      byPick[row.pick] = {
        draftspline: row.expected_epa / base,
        ci_lower: row.ci_lower / base,
        ci_upper: row.ci_upper / base,
      };
    });
    return chaseSeries.map((c) => ({
      pick: c.pick,
      chase: c.value,
      draftspline: byPick[c.pick]?.draftspline ?? null,
      ci_band: byPick[c.pick] ? [byPick[c.pick].ci_lower, byPick[c.pick].ci_upper] : null,
    }));
  }, [data, positionGroup]);

  const maxDivergence = useMemo(() => {
    if (!chartData.length) return null;
    let maxDiff = -Infinity;
    let best = null;
    chartData.forEach((d) => {
      if (d.draftspline === null) return;
      const diff = Math.abs(d.draftspline - d.chase);
      if (diff > maxDiff) {
        maxDiff = diff;
        best = d;
      }
    });
    return best;
  }, [chartData]);

  const divergenceCallout = useMemo(() => {
    if (!maxDivergence) return null;
    const round = Math.ceil(maxDivergence.pick / 32);
    const overvalued = maxDivergence.chase > maxDivergence.draftspline;
    const ratio = maxDivergence.draftspline !== 0 ? (maxDivergence.chase / maxDivergence.draftspline).toFixed(1) : "—";
    return `At pick #${maxDivergence.pick} (Round ${round}), the traditional chart ${
      overvalued ? "overvalues" : "undervalues"
    } this slot by roughly ${ratio}x relative to actual ${positionGroup} production — the widest gap on this curve.`;
  }, [maxDivergence, positionGroup]);

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Draft Value Curve Comparison</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>
        Traditional draft chart value vs. DraftSpline's data-driven EPA curve, both normalized to pick #1 = 1.0.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {POSITION_GROUPS.map((pos) => (
          <button
            key={pos}
            onClick={() => setPositionGroup(pos)}
            style={{
              background: positionGroup === pos ? "var(--accent-dim)" : "transparent",
              color: positionGroup === pos ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${positionGroup === pos ? "var(--accent-border)" : "var(--bg-border)"}`,
              borderRadius: 6,
              padding: "4px 14px",
              fontSize: 13,
            }}
          >
            {pos}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner label="Loading curve data..." />}
      {error && <ErrorBanner message={error} />}

      {!loading && !error && chartData.length > 0 && (
        <div className="card" style={{ padding: 20, height: 460 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid stroke="var(--bg-border)" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="pick" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                formatter={(value) => (value === "chase" ? "Traditional Draft Chart" : "DraftSpline EPA Curve")}
              />
              {ROUND_BOUNDARIES.map((b) => (
                <ReferenceLine key={b} x={b} stroke="var(--bg-border)" strokeDasharray="2 2" />
              ))}
              {maxDivergence && (
                <ReferenceLine
                  x={maxDivergence.pick}
                  stroke="var(--neutral)"
                  strokeDasharray="4 4"
                  label={{ value: "Max divergence", fill: "var(--neutral)", fontSize: 10, position: "top" }}
                />
              )}
              <Area dataKey="ci_band" stroke="none" fill="var(--accent-dim)" isAnimationActive={false} />
              <Line dataKey="chase" stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              <Line dataKey="draftspline" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {divergenceCallout && (
        <div
          style={{
            background: "var(--neutral-dim)",
            border: "1px solid var(--neutral)",
            borderRadius: 10,
            padding: "12px 16px",
            marginTop: 14,
            fontSize: 13,
            color: "var(--text-primary)",
          }}
        >
          {divergenceCallout}
        </div>
      )}
    </div>
  );
}
