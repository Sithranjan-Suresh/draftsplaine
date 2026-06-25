import pandas as pd
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


@router.get("/api/teams")
async def get_teams(request: Request):
    data = request.app.state.data
    data_as_of = request.app.state.data_as_of

    team_scores = data["team_scores"]
    teams = data["teams"]

    agg = (
        team_scores.groupby("team")
        .apply(
            lambda g: pd.Series(
                {
                    "seasons_evaluated": sorted(g["season"].unique().tolist()),
                    "mean_tdvs": round(g["mean_tdvs"].dropna().mean(), 2) if g["mean_tdvs"].notna().any() else None,
                    "weighted_tdvs": round(g["weighted_tdvs"].dropna().mean(), 2)
                    if g["weighted_tdvs"].notna().any()
                    else None,
                    "epa_vs_expected": round(g["epa_vs_expected"].sum(), 1),
                }
            )
        )
        .reset_index()
    )

    agg = agg.merge(teams, left_on="team", right_on="team_abbr", how="left")
    agg = agg.sort_values("weighted_tdvs", ascending=False, na_position="last").reset_index(drop=True)
    agg["rank"] = agg.index + 1

    result = []
    for _, row in agg.iterrows():
        result.append(
            {
                "team": row["team"],
                "team_name": row.get("team_name", row["team"]),
                "seasons_evaluated": row["seasons_evaluated"],
                "mean_tdvs": row["mean_tdvs"],
                "weighted_tdvs": row["weighted_tdvs"],
                "epa_vs_expected": row["epa_vs_expected"],
                "rank": int(row["rank"]),
            }
        )

    return {"teams": result, "data_as_of": data_as_of}


@router.get("/api/team/{abbr}")
async def get_team(abbr: str, request: Request):
    data = request.app.state.data
    data_as_of = request.app.state.data_as_of

    teams = data["teams"]
    abbr = abbr.upper()
    team_row = teams[teams["team_abbr"] == abbr]
    if team_row.empty:
        raise HTTPException(status_code=404, detail=f"Team '{abbr}' not found.")

    tdvs = data["tdvs"]
    team_scores = data["team_scores"]

    picks = tdvs[tdvs["team"] == abbr].sort_values(["draft_year", "pick"])
    pick_list = [
        {
            "draft_year": int(r["draft_year"]),
            "pick": int(r["pick"]),
            "round": int(r["round"]),
            "player_name": r["player_name"],
            "position": r["position"],
            "tdvs": float(r["tdvs"]) if pd.notna(r["tdvs"]) else None,
            "qualifying": bool(r["qualifying"]),
        }
        for _, r in picks.iterrows()
    ]

    team_seasons = team_scores[team_scores["team"] == abbr]
    best_season = None
    worst_season = None
    qualifying_seasons = team_seasons.dropna(subset=["mean_tdvs"])
    if not qualifying_seasons.empty:
        best_row = qualifying_seasons.loc[qualifying_seasons["mean_tdvs"].idxmax()]
        worst_row = qualifying_seasons.loc[qualifying_seasons["mean_tdvs"].idxmin()]
        best_season = int(best_row["season"])
        worst_season = int(worst_row["season"])

    row = team_row.iloc[0]
    return {
        "team": abbr,
        "team_name": row.get("team_name", abbr),
        "picks": pick_list,
        "best_draft_class": best_season,
        "worst_draft_class": worst_season,
        "data_as_of": data_as_of,
    }
