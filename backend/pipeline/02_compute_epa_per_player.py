"""Pipeline step 2 — aggregate play-by-play EPA into per-player, per-season
totals, routed by position per the rules in full_context.md.

Note: the installed nfl_data_py version's pbp does not include a
`receiver_position` column directly, so position is derived by joining each
player id (passer/rusher/receiver) to the seasonal rosters file on
(player_id, season).
"""
from pathlib import Path

import numpy as np
import pandas as pd

RAW_DIR = Path(__file__).parent / "raw"

PBP_COLS = [
    "play_type",
    "qb_dropback",
    "epa",
    "passer_player_id",
    "rusher_player_id",
    "receiver_player_id",
    "posteam",
    "season",
    "week",
]


def load_roster_positions() -> pd.DataFrame:
    rosters = pd.read_parquet(RAW_DIR / "rosters_raw.parquet", columns=["player_id", "season", "position", "team"])
    rosters = rosters.dropna(subset=["player_id", "season"])

    def mode_or_none(s: pd.Series):
        s = s.dropna()
        if len(s) == 0:
            return None
        return s.value_counts().idxmax()

    # a player can appear on multiple weekly rows in a season; take most common position
    pos = (
        rosters.groupby(["player_id", "season"])["position"]
        .agg(mode_or_none)
        .reset_index()
    )
    team = (
        rosters.groupby(["player_id", "season"])["team"]
        .agg(mode_or_none)
        .reset_index()
        .rename(columns={"team": "team_abbr"})
    )
    merged = pos.merge(team, on=["player_id", "season"], how="left")
    return merged.rename(columns={"player_id": "gsis_id"})


def load_games_played(pbp: pd.DataFrame) -> pd.DataFrame:
    """games_played is derived from distinct weeks a player appears in the
    play-by-play as passer/rusher/receiver. `import_seasonal_rosters` only
    returns a single end-of-season snapshot row per player, not weekly
    history, so it cannot be used for an attendance count."""
    frames = []
    for col in ["passer_player_id", "rusher_player_id", "receiver_player_id"]:
        sub = pbp.dropna(subset=[col])[[col, "season", "week"]].rename(columns={col: "gsis_id"})
        frames.append(sub)
    appearances = pd.concat(frames, ignore_index=True).drop_duplicates()
    games = (
        appearances.groupby(["gsis_id", "season"])["week"]
        .nunique()
        .reset_index()
        .rename(columns={"week": "games_played"})
    )
    return games


def load_player_names() -> pd.DataFrame:
    players = pd.read_parquet(RAW_DIR / "players_raw.parquet", columns=["gsis_id", "display_name"])
    return players.dropna(subset=["gsis_id"]).drop_duplicates(subset=["gsis_id"])


def aggregate(pbp: pd.DataFrame, id_col: str, label: str) -> pd.DataFrame:
    sub = pbp.dropna(subset=[id_col, "epa"]).rename(columns={id_col: "gsis_id"})
    grouped = (
        sub.groupby(["gsis_id", "season"])
        .agg(plays=("epa", "size"), total_epa=("epa", "sum"))
        .reset_index()
    )
    grouped["epa_per_play"] = grouped["total_epa"] / grouped["plays"]
    grouped["position_source"] = label
    return grouped


def main() -> None:
    print("Loading play-by-play (filtered columns)...")
    pbp = pd.read_parquet(RAW_DIR / "pbp_all.parquet", columns=PBP_COLS)

    roster_pos = load_roster_positions()
    games = load_games_played(pbp)
    names = load_player_names()

    print("Aggregating QB dropback EPA...")
    qb_plays = pbp[pbp["qb_dropback"] == 1]
    qb = aggregate(qb_plays, "passer_player_id", "QB")

    print("Aggregating RB rush+receiving EPA...")
    run_plays = pbp[pbp["play_type"] == "run"]
    rb_rush = aggregate(run_plays, "rusher_player_id", "RB_rush")
    pass_plays = pbp[pbp["play_type"] == "pass"]
    rb_rec = aggregate(pass_plays, "receiver_player_id", "RB_rec")

    print("Aggregating WR/TE receiving EPA...")
    rec_all = aggregate(pass_plays, "receiver_player_id", "REC")

    # Determine each player's true position per season from rosters, then
    # route their EPA contribution to the correct bucket.
    def attach_position(df: pd.DataFrame) -> pd.DataFrame:
        return df.merge(roster_pos, on=["gsis_id", "season"], how="left")

    qb = attach_position(qb)
    qb = qb[qb["position"] == "QB"]

    rb_rush = attach_position(rb_rush)
    rb_rec = attach_position(rb_rec)
    rb_rush_only = rb_rush[rb_rush["position"] == "RB"]
    rb_rec_only = rb_rec[rb_rec["position"] == "RB"]
    rb_combined = pd.concat([rb_rush_only, rb_rec_only], ignore_index=True)
    rb = (
        rb_combined.groupby(["gsis_id", "season", "position", "team_abbr"])
        .agg(plays=("plays", "sum"), total_epa=("total_epa", "sum"))
        .reset_index()
    )
    rb["epa_per_play"] = rb["total_epa"] / rb["plays"]

    rec_all = attach_position(rec_all)
    wr = rec_all[rec_all["position"] == "WR"].copy()
    te = rec_all[rec_all["position"] == "TE"].copy()

    qb = qb[["gsis_id", "season", "position", "team_abbr", "plays", "total_epa", "epa_per_play"]]
    wr = wr[["gsis_id", "season", "position", "team_abbr", "plays", "total_epa", "epa_per_play"]]
    te = te[["gsis_id", "season", "position", "team_abbr", "plays", "total_epa", "epa_per_play"]]
    rb = rb[["gsis_id", "season", "position", "team_abbr", "plays", "total_epa", "epa_per_play"]]

    combined = pd.concat([qb, rb, wr, te], ignore_index=True)

    # A gadget player could in theory show up under multiple positions if
    # rosters disagree across weeks; keep the row with the most plays per
    # (gsis_id, season).
    combined = combined.sort_values("plays", ascending=False).drop_duplicates(
        subset=["gsis_id", "season"], keep="first"
    )

    combined = combined.merge(games, on=["gsis_id", "season"], how="left")
    combined["games_played"] = combined["games_played"].fillna(0).astype(int)

    combined = combined.merge(names, on="gsis_id", how="left").rename(columns={"display_name": "player_name"})
    combined["player_name"] = combined["player_name"].fillna("Unknown")

    combined["total_epa"] = combined["total_epa"].round(1)
    combined["epa_per_play"] = combined["epa_per_play"].round(4)

    combined = combined.dropna(subset=["total_epa", "plays", "epa_per_play"])
    combined = combined[["gsis_id", "player_name", "position", "team_abbr", "season", "plays", "total_epa", "epa_per_play", "games_played"]]

    out_path = RAW_DIR / "player_epa.parquet"
    combined.to_parquet(out_path, index=False)
    print(f"Wrote {out_path} ({len(combined):,} rows)")
    print(combined["position"].value_counts())


if __name__ == "__main__":
    main()
