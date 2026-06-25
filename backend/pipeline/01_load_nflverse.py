"""Pipeline step 1 — pull raw nflverse data via nfl_data_py.

This is the only pipeline script that touches the network. Output: raw
parquet files in backend/pipeline/raw/. Re-running overwrites existing files.
"""
import sys
from pathlib import Path

import nfl_data_py as nfl
import pandas as pd

SEASONS = list(range(2012, 2024))
RAW_DIR = Path(__file__).parent / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)


def save(df: pd.DataFrame, name: str) -> None:
    path = RAW_DIR / name
    df.to_parquet(path, index=False)
    print(f"  -> wrote {path} ({len(df):,} rows, {len(df.columns)} cols)")


def main() -> None:
    print(f"Seasons: {SEASONS[0]}-{SEASONS[-1]}")

    print("Pulling play-by-play data (this is the largest pull)...")
    try:
        pbp = nfl.import_pbp_data(years=SEASONS, downcast=True, cache=False)
    except Exception as e:  # noqa: BLE001
        print(f"ERROR pulling pbp data: {e}")
        sys.exit(1)
    save(pbp, "pbp_all.parquet")

    print("Pulling draft picks...")
    try:
        draft_picks = nfl.import_draft_picks(years=SEASONS)
    except Exception as e:  # noqa: BLE001
        print(f"ERROR pulling draft picks: {e}")
        sys.exit(1)
    save(draft_picks, "draft_picks_raw.parquet")

    print("Pulling seasonal rosters...")
    try:
        rosters = nfl.import_seasonal_rosters(years=SEASONS)
    except Exception as e:  # noqa: BLE001
        print(f"ERROR pulling rosters: {e}")
        sys.exit(1)
    save(rosters, "rosters_raw.parquet")

    print("Pulling player biographical data...")
    try:
        players = nfl.import_players()
    except Exception as e:  # noqa: BLE001
        print(f"ERROR pulling players: {e}")
        sys.exit(1)
    save(players, "players_raw.parquet")

    print("Pulling injuries...")
    try:
        injuries = nfl.import_injuries(years=SEASONS)
    except Exception as e:  # noqa: BLE001
        print(f"ERROR pulling injuries: {e}")
        sys.exit(1)
    save(injuries, "injuries_raw.parquet")

    print("Done.")


if __name__ == "__main__":
    main()
