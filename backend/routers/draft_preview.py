"""GET /api/draft/2026/preview -- 2026 draft class slot-expectation preview.

Unlike /api/draft/{year}, this endpoint does not read from the committed
backend/data/ parquets for picks (those only cover 2012-2025, per the
pipeline's SEASONS range). Instead it pulls 2026 draft picks live via
nfl_data_py at first request and caches the result in memory for the life of
the process, then joins each pick to the EXISTING expected-EPA curve
(backend/data/draft_curve.parquet) by pick number + position. No pipeline
script is re-run and no parquet is rewritten.

Every player in this response has zero realized NFL seasons -- the numbers
here are pure slot expectations from historical players at that pick/position,
not a projection of this specific player's career. That distinction is
surfaced explicitly in the response (`partial_data` block) and in the UI.
"""
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException, Request

from .analyst import compute_position_stats

router = APIRouter()

PREVIEW_YEAR = 2026
MODELED_POSITIONS = {"QB", "RB", "WR", "TE"}

# draft_picks_raw (and therefore any fresh nfl_data_py pull) uses pfr-style
# abbreviations -- same normalization used by the pipeline (see
# backend/pipeline/03_compute_tdvs.py) so this endpoint's team keys line up
# with backend/data/teams.parquet.
TEAM_ABBR_NORMALIZE = {
    "GNB": "GB", "KAN": "KC", "LVR": "LV", "NOR": "NO", "NWE": "NE",
    "SDG": "LAC", "SD": "LAC", "SFO": "SF", "TAM": "TB", "OAK": "LV",
    "STL": "LA", "LAR": "LA", "JAC": "JAX",
}

# TODO: if nfl_data_py has not yet ingested the 2026 class in a given
# environment (e.g. pulled before the draft happened), drop a CSV with the
# same columns as draft_picks_raw.parquet (season, round, pick, team,
# pfr_player_name, position, gsis_id) here and the loader below will use it
# instead. Not currently needed -- nfl_data_py already has full 2026 results.
STATIC_FALLBACK_CSV = Path(__file__).parent.parent / "data" / "draft_2026_picks.csv"

_cached_picks_df: pd.DataFrame | None = None


def _slot_tier(pick: int) -> str:
    if pick <= 32:
        return "R1"
    if pick <= 64:
        return "R2"
    if pick <= 96:
        return "R3"
    return "D3"


def _load_2026_picks() -> pd.DataFrame:
    global _cached_picks_df
    if _cached_picks_df is not None:
        return _cached_picks_df

    df = None
    try:
        import nfl_data_py as nfl

        pulled = nfl.import_draft_picks(years=[PREVIEW_YEAR])
        if pulled is not None and not pulled.empty:
            df = pulled
    except Exception as e:  # noqa: BLE001
        print(f"WARNING: live nfl_data_py pull for {PREVIEW_YEAR} draft picks failed: {e}")

    if df is None or df.empty:
        if STATIC_FALLBACK_CSV.exists():
            print(f"Falling back to static {STATIC_FALLBACK_CSV.name}")
            df = pd.read_csv(STATIC_FALLBACK_CSV)
        else:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"{PREVIEW_YEAR} draft picks are not yet available from nfl_data_py and no "
                    f"fallback file exists at backend/data/{STATIC_FALLBACK_CSV.name}."
                ),
            )

    df = df.rename(columns={"season": "draft_year", "pfr_player_name": "player_name"})
    df["team"] = df["team"].map(lambda t: TEAM_ABBR_NORMALIZE.get(t, t))
    df = df[["draft_year", "round", "pick", "team", "player_name", "position", "gsis_id"]].copy()
    df = df.sort_values("pick").reset_index(drop=True)

    _cached_picks_df = df
    return df


@router.get("/api/draft/2026/preview")
async def get_2026_preview(request: Request):
    data = request.app.state.data
    data_as_of = request.app.state.data_as_of

    picks_df = _load_2026_picks()
    curve = data["curve"]
    teams = data["teams"]
    position_stats = compute_position_stats(data)

    curve_lookup = {
        (int(r["pick"]), r["position_group"]): float(r["expected_epa"]) for _, r in curve.iterrows()
    }

    merged = picks_df.merge(teams[["team_abbr", "team_name"]], left_on="team", right_on="team_abbr", how="left")

    picks = []
    for _, row in merged.iterrows():
        position = row["position"]
        pick = int(row["pick"])
        modeled = position in MODELED_POSITIONS
        expected_epa_4yr = curve_lookup.get((pick, position)) if modeled else None
        pos_stats = position_stats.get(position) if modeled else None

        picks.append(
            {
                "pick": pick,
                "round": int(row["round"]),
                "team": row["team"],
                "team_name": row["team_name"] if isinstance(row["team_name"], str) else row["team"],
                "player_name": row["player_name"],
                "position": position,
                "expected_epa_4yr": round(expected_epa_4yr, 1) if expected_epa_4yr is not None else None,
                "bust_rate": pos_stats["bust_rate_pct"] if pos_stats else None,
                "steal_rate": pos_stats["steal_rate_pct"] if pos_stats else None,
                "slot_tier": _slot_tier(pick),
                "unmodeled": not modeled,
                # No trade-chain data source exists in nflverse/nfl_data_py
                # (no "original team" field per pick) -- rather than guess at
                # trade detection from pick-count anomalies, this is reported
                # honestly as unavailable. See README known-limitations note.
                "trade_up_cost": None,
            }
        )

    return {
        "year": PREVIEW_YEAR,
        "picks": picks,
        "partial_data": {
            "rookie_seasons_elapsed": 0,
            "window_complete": False,
            "message": "Slot expectations only — no realized EPA yet. This class has 0 of 4 rookie seasons played.",
        },
        "trade_data_available": False,
        "data_as_of": data_as_of,
    }
