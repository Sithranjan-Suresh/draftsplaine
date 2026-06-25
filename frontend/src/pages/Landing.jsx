import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: prefersReducedMotion ? 0 : 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: prefersReducedMotion ? 0 : 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

const FILE_STATS = [
  {
    label: "Worst drafting franchise",
    value: "NY Jets",
    detail: "−1,096.9 EPA below expectation, 2012–2025",
  },
  {
    label: "Highest-bust-rate position",
    value: "Quarterback",
    detail: "55.2% bust rate, 2012–2022 complete windows",
  },
  {
    label: "2026 class is live",
    value: "/preview",
    detail: "All 257 picks joined to the expected-EPA curve",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 760, width: "100%" }}>
        <motion.div {...fadeUp(0)} className="eyebrow" style={{ marginBottom: 18, textAlign: "center" }}>
          Case file no. 2022-262 &nbsp;—&nbsp; opened for review
        </motion.div>

        <motion.h1
          {...fadeUp(0.08)}
          style={{
            fontSize: "clamp(40px, 7vw, 64px)",
            textAlign: "center",
            lineHeight: 1.05,
            marginBottom: 6,
            letterSpacing: "-0.02em",
          }}
        >
          DRAFT<span style={{ color: "var(--accent)" }}>SPLINE</span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.16)}
          style={{
            textAlign: "center",
            fontFamily: "var(--font-body)",
            fontSize: 16,
            color: "var(--text-muted)",
            marginBottom: 36,
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Every NFL draft pick since 2012, graded against what its slot actually produces — not what a
          decades-old chart says it should.
        </motion.p>

        <motion.div
          {...fadeUp(0.26)}
          className="card"
          style={{
            padding: "28px 32px",
            marginBottom: 28,
            position: "relative",
            clipPath: "polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%)",
            borderWidth: "1px 1px 1px 4px",
            borderColor: "var(--highlight)",
          }}
        >
          <div className="eyebrow" style={{ color: "var(--highlight)", marginBottom: 10 }}>
            The thesis, in one pick
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
            <span
              className="mono"
              style={{ fontSize: "clamp(48px, 9vw, 76px)", fontWeight: 700, color: "var(--highlight)", lineHeight: 1 }}
            >
              24.48&times;
            </span>
            <span className="grade-stamp">Outlier — unadjusted</span>
          </div>
          <p style={{ fontSize: 14.5, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 0 }}>
            <strong>Brock Purdy</strong> — pick <strong>#262</strong>, 2022 — produced 24.48&times; his
            slot's historical expected value. The largest True Draft Value Score in the dataset, bigger than any
            first-round pick ever recorded. We lead with it, and we flag immediately why it's contestable: TDVS
            doesn't adjust for offensive line, receiving talent, or scheme — and Purdy landed on a 49ers roster
            stacked with all three.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp(0.36)}
          className="landing-file-stats"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            border: "1px solid var(--bg-border)",
            marginBottom: 36,
          }}
        >
          {FILE_STATS.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                padding: "16px 18px",
                background: "var(--bg-elevated)",
                borderLeft: i === 0 ? "none" : "1px solid var(--bg-border)",
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>
                {stat.label}
              </div>
              <div className="mono" style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 4 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{stat.detail}</div>
            </div>
          ))}
        </motion.div>

        <motion.div {...fadeUp(0.46)} style={{ display: "flex", justifyContent: "center" }}>
          <button
            className="mono"
            onClick={() => navigate("/board")}
            style={{
              background: "var(--ink)",
              color: "var(--bg-base)",
              border: "none",
              borderRadius: 2,
              padding: "14px 28px",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ink)")}
          >
            OPEN THE DRAFT BOARD
            <span aria-hidden="true">&rarr;</span>
          </button>
        </motion.div>

        <motion.p
          {...fadeUp(0.54)}
          className="mono"
          style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 18 }}
        >
          2012–2025 draft classes &middot; 2026 class projected &middot; updated nightly
        </motion.p>
      </div>
    </div>
  );
}
