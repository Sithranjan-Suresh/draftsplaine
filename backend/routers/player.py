import pandas as pd
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()

MODELED_POSITIONS = {"QB", "RB", "WR", "TE"}


@router.get("/api/player/{gsis_id}")
async def get_player(gsis_id: str, request: Request):
    data = request.app.state.data
    data_as_of = request.app.state.data_as_of

    tdvs = data["tdvs"]
    player_epa = data["player_epa"]
    teams = data["teams"]

    player_row = tdvs[tdvs["gsis_id"] == gsis_id]
    if player_row.empty:
        raise HTTPException(status_code=404, detail=f"Player '{gsis_id}' not found.")
    row = player_row.iloc[0]

    draft_year = int(row["draft_year"])
    window_seasons = list(range(draft_year, draft_year + 4))
    season_rows = player_epa[
        (player_epa["gsis_id"] == gsis_id) & (player_epa["season"].isin(window_seasons))
    ].sort_values("season")

    season_breakdown = [
        {
            "season": int(r["season"]),
            "plays": int(r["plays"]),
            "total_epa": float(r["total_epa"]),
            "epa_per_play": float(r["epa_per_play"]),
            "games_played": int(r["games_played"]),
        }
        for _, r in season_rows.iterrows()
    ]

    team_meta = teams[teams["team_abbr"] == row["team"]]
    team_name = team_meta.iloc[0]["team_name"] if not team_meta.empty else row["team"]

    return {
        "gsis_id": gsis_id,
        "player_name": row["player_name"],
        "position": row["position"],
        "team": row["team"],
        "team_name": team_name,
        "draft_year": draft_year,
        "pick": int(row["pick"]),
        "round": int(row["round"]),
        "rookie_epa_total": float(row["rookie_epa_total"]) if pd.notna(row["rookie_epa_total"]) else None,
        "expected_epa": float(row["expected_epa"]) if pd.notna(row["expected_epa"]) else None,
        "tdvs": float(row["tdvs"]) if pd.notna(row["tdvs"]) else None,
        "games_played_total": int(row["games_played_total"]),
        "qualifying": bool(row["qualifying"]),
        "modeled": row["position"] in MODELED_POSITIONS,
        "season_breakdown": season_breakdown,
        "data_as_of": data_as_of,
    }
