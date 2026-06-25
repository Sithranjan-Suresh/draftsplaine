from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/api/curve")
async def get_curve(request: Request):
    data = request.app.state.data
    data_as_of = request.app.state.data_as_of

    curve_df = data["curve"]
    chase_df = data["chase_chart"]

    curve = [
        {
            "pick": int(row["pick"]),
            "position_group": row["position_group"],
            "expected_epa": float(row["expected_epa"]),
            "ci_lower": float(row["ci_lower"]),
            "ci_upper": float(row["ci_upper"]),
        }
        for _, row in curve_df.iterrows()
    ]

    # normalize both curves to pick 1 = 1.0 for comparability, per position group
    comparison_by_position = {}
    for position_group, group_df in curve_df.groupby("position_group"):
        group_df = group_df.sort_values("pick")
        base = group_df.iloc[0]["expected_epa"]
        base = base if base != 0 else 1.0
        comparison_by_position[position_group] = [
            {"pick": int(r["pick"]), "value": float(r["expected_epa"] / base)}
            for _, r in group_df.iterrows()
        ]

    chase_base = chase_df.sort_values("pick").iloc[0]["chase_value"]
    chase_normalized = [
        {"pick": int(r["pick"]), "value": float(r["chase_value"] / chase_base)}
        for _, r in chase_df.sort_values("pick").iterrows()
    ]

    return {
        "curve": curve,
        "comparison_chart": {
            "chase_chart": chase_normalized,
            "draftspline_curve": comparison_by_position,
        },
        "data_as_of": data_as_of,
    }
