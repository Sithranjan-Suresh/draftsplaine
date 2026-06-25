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

  const ciWidthCallout = useMemo(() => {
    const early = chartData.find((d) => d.pick === 20);
    const late = chartData.find((d) => d.pick === 200);
    if (!early?.ci_band || !late?.ci_band) return null;
    const earlyWidth = (early.ci_band[1] - early.ci_band[0]).toFixed(2);
    const lateWidth = (late.ci_band[1] - late.ci_band[0]).toFixed(2);
    const growth = (late.ci_band[1] - late.ci_band[0]) / (early.ci_band[1] - early.ci_band[0]);
    return `The shaded 90% confidence band (right axis units) is ${earlyWidth} wide at pick #20 and grows to ${lateWidth} at pick #200 — ${growth.toFixed(
      1
    )}x wider. That's not a smoothing failure; it's an honest signal that there are far fewer qualifying ${positionGroup} picks per slot in rounds 5-7 to estimate from.`;
  }, [chartData, positionGroup]);

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
            className="mono"
            onClick={() => setPositionGroup(pos)}
            style={{
              background: positionGroup === pos ? "var(--accent-dim)" : "transparent",
              color: positionGroup === pos ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${positionGroup === pos ? "var(--accent-border)" : "var(--bg-border)"}`,
              borderRadius: 2,
              padding: "4px 14px",
              fontSize: 12.5,
              fontWeight: 600,
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
                formatter={(value) =>
                  value === "chase"
                    ? "Traditional Draft Chart"
                    : value === "draftspline"
                    ? "DraftSpline EPA Curve"
                    : "90% Confidence Interval"
                }
              />
              {ROUND_BOUNDARIES.map((b) => (
                <ReferenceLine key={b} x={b} stroke="var(--bg-border)" strokeDasharray="2 2" />
              ))}
              {maxDivergence && (
                <ReferenceLine
                  x={maxDivergence.pick}
                  stroke="var(--bust)"
                  strokeDasharray="4 4"
                  label={{ value: "Max divergence", fill: "var(--bust)", fontSize: 10, position: "top" }}
                />
              )}
              <Area
                dataKey="ci_band"
                name="ci_band"
                stroke="var(--highlight)"
                strokeWidth={1}
                fill="var(--highlight-dim)"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Line dataKey="chase" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              <Line dataKey="draftspline" stroke="var(--ink)" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {divergenceCallout && (
        <div
          style={{
            background: "var(--bg-elevated)",
            borderLeft: "3px solid var(--bust)",
            padding: "11px 16px",
            marginTop: 14,
            fontSize: 13,
            color: "var(--text-primary)",
          }}
        >
          <span className="eyebrow" style={{ color: "var(--bust)" }}>Margin note — divergence</span>
          <div style={{ marginTop: 4 }}>{divergenceCallout}</div>
        </div>
      )}

      {ciWidthCallout && (
        <div
          style={{
            background: "var(--bg-elevated)",
            borderLeft: "3px solid var(--highlight)",
            padding: "11px 16px",
            marginTop: 10,
            fontSize: 13,
            color: "var(--text-primary)",
          }}
        >
          <span className="eyebrow" style={{ color: "var(--highlight)" }}>Margin note — confidence band</span>
          <div style={{ marginTop: 4 }}>{ciWidthCallout}</div>
        </div>
      )}
    </div>
  );
}
