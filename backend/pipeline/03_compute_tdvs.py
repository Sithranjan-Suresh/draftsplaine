"""Pipeline step 3 — join player EPA to draft picks, apply the rookie
contract window (draft_year through draft_year+3), apply games-played
normalization, and flag qualifying players.

Does NOT compute TDVS yet (that needs the expected-EPA curve from step 4).
Outputs raw rookie EPA totals only.
"""
from pathlib import Path

import pandas as pd

RAW_DIR = Path(__file__).parent / "raw"

DRAFT_YEARS = list(range(2012, 2023))  # 2012-2022 inclusive

# Minimum qualifying plays across the 4-year rookie window, per full_context.md
MIN_PLAYS = {
    "QB": 150,
    "RB": 150,
    "WR": 75,
    "TE": 50,
}

# draft_picks_raw uses pfr-style abbreviations (GNB/KAN/etc) instead of the
# standard nflverse abbreviations used elsewhere. Normalize here so every
# downstream parquet uses one consistent team key, and treat relocated
# franchises (Oakland->Las Vegas, etc.) as a single continuous franchise.
TEAM_ABBR_NORMALIZE = {
    "GNB": "GB", "KAN": "KC", "LVR": "LV", "NOR": "NO", "NWE": "NE",
    "SDG": "LAC", "SD": "LAC", "SFO": "SF", "TAM": "TB", "OAK": "LV",
    "STL": "LA", "LAR": "LA", "JAC": "JAX",
}


def main() -> None:
    draft_picks = pd.read_parquet(RAW_DIR / "draft_picks_raw.parquet")
    player_epa = pd.read_parquet(RAW_DIR / "player_epa.parquet")

    draft_picks = draft_picks[draft_picks["season"].isin(DRAFT_YEARS)].copy()
    draft_picks = draft_picks.dropna(subset=["gsis_id"])
    draft_picks = draft_picks.rename(columns={"season": "draft_year", "pfr_player_name": "player_name"})
    draft_picks = draft_picks[draft_picks["position"].isin(MIN_PLAYS.keys())]
    draft_picks["team"] = draft_picks["team"].map(lambda t: TEAM_ABBR_NORMALIZE.get(t, t))

    rows = []
    for _, pick in draft_picks.iterrows():
        gsis_id = pick["gsis_id"]
        draft_year = int(pick["draft_year"])
        position = pick["position"]
        window_seasons = list(range(draft_year, draft_year + 4))

        player_seasons = player_epa[
            (player_epa["gsis_id"] == gsis_id) & (player_epa["season"].isin(window_seasons))
        ]

        rookie_epa_total = 0.0
        games_played_total = 0
        total_plays = 0
        seasons_available = 0

        for _, season_row in player_seasons.iterrows():
            games_played = min(int(season_row["games_played"]), 17)
            season_epa = float(season_row["total_epa"])
            # games-played normalization: scale shortened seasons down so
            # injury-shortened years don't get full credit, but don't scale
            # UP a season that happened to be a full 17-game year.
            if games_played < 8:
                season_epa = season_epa * (games_played / 17.0)
            rookie_epa_total += season_epa
            games_played_total += games_played
            total_plays += int(season_row["plays"])
            seasons_available += 1

        qualifying = total_plays >= MIN_PLAYS.get(position, 999999)

        rows.append(
            {
                "gsis_id": gsis_id,
                "player_name": pick["player_name"],
                "position": position,
                "draft_year": draft_year,
                "pick": int(pick["pick"]),
                "round": int(pick["round"]),
                "team": pick["team"],
                "rookie_epa_total": round(rookie_epa_total, 1),
                "games_played_total": games_played_total,
                "seasons_available": seasons_available,
                "qualifying": bool(qualifying),
            }
        )

    out = pd.DataFrame(rows)
    out_path = RAW_DIR / "tdvs_scores_preliminary.parquet"
    out.to_parquet(out_path, index=False)
    print(f"Wrote {out_path} ({len(out):,} rows)")
    print(f"Qualifying: {out['qualifying'].sum()} / {len(out)}")
    print(out[out["player_name"].str.contains("Mahomes", na=False)])
    print(out[out["player_name"].str.contains("Russell", na=False) & (out["position"] == "QB")])


if __name__ == "__main__":
    main()
