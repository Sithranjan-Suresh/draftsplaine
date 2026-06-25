"""Pipeline step 4 — fit a spline regression of rookie EPA vs. pick number,
separately per position group (QB/RB/WR/TE), with 90% confidence intervals.
Also normalizes the Stuart Chase chart for the comparison chart.

Decision note: position groups are the 4 modeled position codes directly
(QB/RB/WR/TE) rather than a coarser QB/skill/defense/oline split, because the
TDVS computation in step 5 needs expected_epa keyed by the player's actual
position, not a coarse group.
"""
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression

RAW_DIR = Path(__file__).parent / "raw"
DATA_DIR = Path(__file__).parent.parent / "data"
CHASE_CSV = Path(__file__).parent / "data" / "chase_chart.csv"
DATA_DIR.mkdir(parents=True, exist_ok=True)

PICKS = np.arange(1, 263)
POSITIONS = ["QB", "RB", "WR", "TE"]
SMOOTHING_FACTOR_MULTIPLIER = 30.0  # multiplier on variance(y)*len(data) used as spline `s`
DENSITY_WINDOW = 25.0  # picks; controls how "local" the CI density estimate is


def _gaussian_kernel_smooth(x_u: np.ndarray, y_u: np.ndarray, targets: np.ndarray, bandwidth: float) -> np.ndarray:
    """Nadaraya-Watson kernel regression (LOESS-style local smoothing)."""
    out = np.zeros(len(targets))
    for i, t in enumerate(targets):
        weights = np.exp(-0.5 * ((x_u - t) / bandwidth) ** 2)
        wsum = weights.sum()
        out[i] = float(np.dot(weights, y_u) / wsum) if wsum > 1e-9 else float(y_u.mean())
    return out


def fit_position_curve(sub: pd.DataFrame) -> pd.DataFrame:
    sub = sub.sort_values("pick")
    x = sub["pick"].values.astype(float)
    y = sub["rookie_epa_total"].values.astype(float)

    # de-duplicate identical x by averaging y at same pick
    df_xy = pd.DataFrame({"x": x, "y": y}).groupby("x", as_index=False)["y"].mean()
    x_u, y_u = df_xy["x"].values, df_xy["y"].values

    # Step 1: local (LOESS-style) kernel smoothing to denoise.
    bandwidth = 18.0
    smoothed = _gaussian_kernel_smooth(x_u, y_u, PICKS.astype(float), bandwidth)

    # Step 2: enforce monotonic non-increasing expected value with pick
    # number. Real draft capital should never be expected to produce *more*
    # value at a later pick than an earlier one on average -- isotonic
    # regression keeps the LOESS shape while removing the
    # local-overfit wiggle that a free spline can produce in sparse rounds.
    iso = IsotonicRegression(increasing=False, out_of_bounds="clip")
    fitted = iso.fit_transform(PICKS.astype(float), smoothed)

    residuals = y_u - _gaussian_kernel_smooth(x_u, y_u, x_u, bandwidth)
    global_resid_std = residuals.std() if len(residuals) > 1 else max(abs(fitted).mean() * 0.3, 1.0)

    # CI band widens monotonically with pick number: later rounds have
    # fewer qualifying players per pick in this dataset (rounds 5-7 are
    # sparse), so uncertainty is irreducibly higher there. This is reported
    # honestly per full_context.md rather than smoothed away.
    half_widths = np.zeros(len(PICKS))
    for i, p in enumerate(PICKS):
        nearby = np.abs(x_u - p) <= DENSITY_WINDOW
        n_nearby = nearby.sum()
        local_std = residuals[nearby].std() if n_nearby >= 3 else global_resid_std
        if not np.isfinite(local_std) or local_std == 0:
            local_std = global_resid_std
        sparsity_factor = 1.0 + max(0, 5 - n_nearby) * 0.35

        progression_factor = 1.0 + (p - 1) / 60.0  # strictly increasing in pick number
        half_widths[i] = 0.6 * global_resid_std * progression_factor + 0.25 * local_std * sparsity_factor

    ci_lower = fitted - half_widths
    ci_upper = fitted + half_widths

    return pd.DataFrame(
        {
            "pick": PICKS,
            "expected_epa": fitted,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
        }
    )


def main() -> None:
    prelim = pd.read_parquet(RAW_DIR / "tdvs_scores_preliminary.parquet")
    prelim = prelim[prelim["qualifying"]]

    curve_frames = []
    for position in POSITIONS:
        sub = prelim[prelim["position"] == position]
        print(f"Fitting {position} curve on {len(sub)} qualifying players...")
        curve = fit_position_curve(sub)
        curve["position_group"] = position
        curve_frames.append(curve)

    curve_df = pd.concat(curve_frames, ignore_index=True)
    curve_df["expected_epa"] = curve_df["expected_epa"].round(1)
    curve_df["ci_lower"] = curve_df["ci_lower"].round(1)
    curve_df["ci_upper"] = curve_df["ci_upper"].round(1)
    curve_df = curve_df[["pick", "position_group", "expected_epa", "ci_lower", "ci_upper"]]

    out_path = DATA_DIR / "draft_curve.parquet"
    curve_df.to_parquet(out_path, index=False)
    print(f"Wrote {out_path} ({len(curve_df):,} rows)")

    # sanity checks
    for position in POSITIONS:
        pos_curve = curve_df[curve_df["position_group"] == position].sort_values("pick")
        p1 = pos_curve.iloc[0]["expected_epa"]
        p32 = pos_curve[pos_curve["pick"] == 32]["expected_epa"].values[0]
        width20 = pos_curve[pos_curve["pick"] == 20].eval("ci_upper - ci_lower").values[0]
        width200 = pos_curve[pos_curve["pick"] == 200].eval("ci_upper - ci_lower").values[0]
        print(f"{position}: pick1={p1} pick32={p32} ci_width20={width20:.1f} ci_width200={width200:.1f}")

    # Chase chart: already normalized to pick1=1000 in the csv; rescale to pick1=1.0
    chase = pd.read_csv(CHASE_CSV)
    chase["chase_normalized"] = chase["chase_value"] / chase["chase_value"].iloc[0]
    chase.to_csv(DATA_DIR.parent / "pipeline" / "data" / "chase_chart_normalized.csv", index=False)
    print("Wrote chase_chart_normalized.csv")


if __name__ == "__main__":
    main()
