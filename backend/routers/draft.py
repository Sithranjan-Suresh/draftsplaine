import pandas as pd
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()

MIN_YEAR = 2012
MAX_YEAR = 2022


@router.get("/api/draft/{year}")
async def get_draft_class(year: int, request: Request):
    data = request.app.state.data
    data_as_of = request.app.state.data_as_of

    if year < MIN_YEAR or year > MAX_YEAR:
        raise HTTPException(
            status_code=404,
            detail=f"TDVS analysis available for {MIN_YEAR}-{MAX_YEAR} only.",
        )

    draft_picks = data["draft_picks"]
    tdvs = data["tdvs"]
    teams = data["teams"]

    MODELED_POSITIONS = {"QB", "RB", "WR", "TE"}

    class_df = draft_picks[draft_picks["draft_year"] == year].merge(
        tdvs[["gsis_id", "draft_year", "rookie_epa_total", "expected_epa", "tdvs", "qualifying"]],
        on=["gsis_id", "draft_year"],
        how="left",
    ).merge(teams[["team_abbr", "team_name"]], left_on="team", right_on="team_abbr", how="left")
    class_df = class_df.sort_values("pick")

    picks = []
    for _, row in class_df.iterrows():
        modeled = row["position"] in MODELED_POSITIONS
        tdvs_val = row.get("tdvs")
        qualifying = bool(row["qualifying"]) if pd.notna(row.get("qualifying")) else False
        picks.append(
            {
                "pick": int(row["pick"]),
                "round": int(row["round"]),
                "player_name": row["player_name"],
                "position": row["position"],
                "team": row["team"],
                "team_name": row["team_name"] if isinstance(row["team_name"], str) else row["team"],
                "tdvs": float(tdvs_val) if pd.notna(tdvs_val) else None,
                "rookie_epa_total": float(row["rookie_epa_total"]) if pd.notna(row.get("rookie_epa_total")) else None,
                "expected_epa": float(row["expected_epa"]) if pd.notna(row.get("expected_epa")) else None,
                "qualifying": qualifying,
                "modeled": modeled,
                "gsis_id": row["gsis_id"],
            }
        )

    return {
        "year": year,
        "picks": picks,
        "data_as_of": data_as_of,
    }
