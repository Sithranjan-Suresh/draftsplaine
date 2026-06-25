import pandas as pd
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


def _pick_obj(row) -> dict:
    return {
        "pick": int(row["pick"]),
        "round": int(row["round"]),
        "team": row["team"],
        "player_name": row["player_name"],
        "position": row["position"],
        "tdvs": float(row["tdvs"]) if pd.notna(row["tdvs"]) else None,
        "qualifying": bool(row["qualifying"]),
        "gsis_id": row["gsis_id"],
    }


def _build_redraft(year: int, data: dict):
    tdvs = data["tdvs"]
    class_df = tdvs[tdvs["draft_year"] == year].copy()
    if class_df.empty:
        return None

    original = class_df.sort_values("pick").reset_index(drop=True)

    qualifying = original[original["qualifying"]].sort_values("tdvs", ascending=False).reset_index(drop=True)
    non_qualifying = original[~original["qualifying"]].reset_index(drop=True)

    pick_slots = sorted(original["pick"].tolist())
    optimized_rows = []
    q_idx = 0
    nq_idx = 0
    for slot in pick_slots:
        if q_idx < len(qualifying):
            r = qualifying.iloc[q_idx].copy()
            q_idx += 1
        else:
            r = non_qualifying.iloc[nq_idx].copy()
            nq_idx += 1
        r["pick"] = slot
        optimized_rows.append(r)
    optimized = pd.DataFrame(optimized_rows).reset_index(drop=True)

    # team deltas: compare sum(tdvs) of a team's original picks vs sum(tdvs)
    # of the players they'd receive at those same pick slots in the optimal order
    slot_to_optimized = dict(zip(optimized["pick"], optimized.to_dict("records")))

    team_deltas = []
    for team, grp in original.groupby("team"):
        qualifying_grp = grp[grp["qualifying"]]
        if qualifying_grp.empty:
            team_deltas.append(
                {
                    "team": team,
                    "original_epa": None,
                    "optimized_epa": None,
                    "delta": None,
                    "note": "insufficient qualifying picks for this team",
                }
            )
            continue
        original_tdvs_sum = float(qualifying_grp["tdvs"].sum())
        optimized_tdvs_sum = 0.0
        for slot in grp["pick"]:
            opt_pick = slot_to_optimized.get(slot)
            if opt_pick and opt_pick.get("tdvs") is not None and pd.notna(opt_pick.get("tdvs")):
                optimized_tdvs_sum += opt_pick["tdvs"]
        team_deltas.append(
            {
                "team": team,
                "original_epa": round(original_tdvs_sum, 2),
                "optimized_epa": round(optimized_tdvs_sum, 2),
                "delta": round(optimized_tdvs_sum - original_tdvs_sum, 2),
                "note": None,
            }
        )

    team_deltas.sort(key=lambda d: abs(d["delta"]) if d["delta"] is not None else -1, reverse=True)

    excluded_count = int((~original["qualifying"]).sum())

    return {
        "original": [_pick_obj(r) for _, r in original.iterrows()],
        "optimized": [_pick_obj(r) for _, r in optimized.iterrows()],
        "team_deltas": team_deltas,
        "excluded_count": excluded_count,
    }


@router.get("/api/redraft/{year}")
@router.get("/api/redraft/{year}/{team}")
async def get_redraft(year: int, request: Request, team: str = None):
    data = request.app.state.data
    data_as_of = request.app.state.data_as_of

    result = _build_redraft(year, data)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No draft class data for {year}.")

    value_delta = None
    epa_gained = 0.0
    epa_lost = 0.0
    if team:
        team = team.upper()
        team_delta = next((d for d in result["team_deltas"] if d["team"] == team), None)
        if team_delta and team_delta["delta"] is not None:
            value_delta = team_delta["delta"]
            if value_delta >= 0:
                epa_gained = value_delta
            else:
                epa_lost = abs(value_delta)

    return {
        "year": year,
        "team": team,
        "original_picks": result["original"],
        "optimized_picks": result["optimized"],
        "team_deltas": result["team_deltas"],
        "excluded_count": result["excluded_count"],
        "value_delta": value_delta,
        "epa_gained": epa_gained,
        "epa_lost": epa_lost,
        "data_as_of": data_as_of,
    }
