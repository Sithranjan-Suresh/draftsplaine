"""Pipeline step 5 — combine preliminary EPA totals with the fitted curve to
compute final TDVS, aggregate to team-level draft efficiency, and write all
final parquets to backend/data/.
"""
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import nfl_data_py as nfl
except ImportError:  # pragma: no cover
    nfl = None

RAW_DIR = Path(__file__).parent / "raw"
DATA_DIR = Path(__file__).parent.parent / "data"
CHASE_CSV = Path(__file__).parent / "data" / "chase_chart.csv"

# Normalize every historical/alternate team abbreviation found in
# nfl_data_py's various endpoints to one canonical current abbreviation per
# franchise. Relocated franchises (e.g. Oakland -> Las Vegas) are treated as
# a single continuous franchise per the product spec (Feature 5 edge case).
TEAM_ABBR_NORMALIZE = {
    "GNB": "GB", "KAN": "KC", "LVR": "LV", "NOR": "NO", "NWE": "NE",
    "SDG": "LAC", "SD": "LAC", "SFO": "SF", "TAM": "TB", "OAK": "LV",
    "STL": "LA", "LAR": "LA", "JAC": "JAX",
}


def normalize_team(abbr: str) -> str:
    if pd.isna(abbr):
        return abbr
    return TEAM_ABBR_NORMALIZE.get(abbr, abbr)


def compute_tdvs() -> pd.DataFrame:
    prelim = pd.read_parquet(RAW_DIR / "tdvs_scores_preliminary.parquet")
    curve = pd.read_parquet(DATA_DIR / "draft_curve.parquet")

    merged = prelim.merge(
        curve.rename(columns={"position_group": "position"}),
        on=["pick", "position"],
        how="left",
    )

    # TDVS stabilization floor: rush EPA is structurally negative even for
    # elite RBs (this is a genuine, well-documented analytics finding, not a
    # pipeline bug -- see methodology.md). That means expected_epa for RB,
    # and occasionally for other positions in sparse rounds, can be zero or
    # negative. A literal actual/expected ratio is undefined or explodes
    # near zero in that regime. We use a formula that is mathematically
    # identical to the literal ratio whenever expected_epa exceeds the
    # floor, and smoothly continues below it as 1 + (actual-expected)/floor
    # -- continuous at expected_epa == floor, well-behaved for negative
    # expected_epa, and preserves the same TDVS=1.0 "met expectation"
    # semantics everywhere.
    TDVS_FLOOR = 15.0

    def calc_row(row):
        expected = row["expected_epa"]
        qualifying = row["qualifying"]
        if pd.isna(expected):
            return pd.Series({"tdvs": np.nan, "qualifying": False, "expected_epa": expected})
        actual = row["rookie_epa_total"]
        if expected > TDVS_FLOOR:
            tdvs = actual / expected
        else:
            tdvs = 1.0 + (actual - expected) / TDVS_FLOOR
        tdvs = round(tdvs, 2)
        return pd.Series({"tdvs": tdvs, "qualifying": qualifying, "expected_epa": round(expected, 1)})

    results = merged.apply(calc_row, axis=1)
    merged["tdvs"] = results["tdvs"]
    merged["qualifying"] = results["qualifying"]
    merged["expected_epa"] = results["expected_epa"]
    merged["rookie_epa_total"] = merged["rookie_epa_total"].round(1)

    out = merged[
        [
            "gsis_id",
            "player_name",
            "position",
            "draft_year",
            "pick",
            "round",
            "team",
            "rookie_epa_total",
            "expected_epa",
            "tdvs",
            "games_played_total",
            "qualifying",
            "rookie_seasons_elapsed",
            "window_complete",
        ]
    ]
    return out


def compute_team_scores(tdvs_df: pd.DataFrame) -> pd.DataFrame:
    chase = pd.read_csv(CHASE_CSV).set_index("pick")["chase_value"]
    tdvs_df = tdvs_df.copy()
    tdvs_df["chase_weight"] = tdvs_df["pick"].map(chase).fillna(chase.min())

    rows = []
    for (team, draft_year), grp in tdvs_df.groupby(["team", "draft_year"]):
        qualifying = grp[grp["qualifying"]]
        picks_qualifying = len(qualifying)
        if picks_qualifying == 0:
            mean_tdvs = np.nan
            weighted_tdvs = np.nan
            epa_vs_expected = 0.0
        else:
            mean_tdvs = qualifying["tdvs"].mean()
            weights = qualifying["chase_weight"]
            weighted_tdvs = float((qualifying["tdvs"] * weights).sum() / weights.sum())
            epa_vs_expected = float((qualifying["rookie_epa_total"] - qualifying["expected_epa"]).sum())
        rows.append(
            {
                "team": team,
                "season": int(draft_year),
                "picks_qualifying": picks_qualifying,
                "mean_tdvs": round(mean_tdvs, 2) if pd.notna(mean_tdvs) else None,
                "weighted_tdvs": round(weighted_tdvs, 2) if pd.notna(weighted_tdvs) else None,
                "epa_vs_expected": round(epa_vs_expected, 1),
            }
        )
    return pd.DataFrame(rows)


def build_teams_table() -> pd.DataFrame:
    if nfl is not None:
        try:
            desc = nfl.import_team_desc()
            cols = {
                "team_abbr": "team_abbr",
                "team_name": "team_name",
                "team_nick": "team_nick",
                "team_conf": "team_conf",
                "team_division": "team_division",
                "team_color": "team_color",
                "team_color2": "team_color2",
            }
            available = [c for c in cols if c in desc.columns]
            teams = desc[available].rename(columns=cols)
            teams["team_abbr"] = teams["team_abbr"].map(normalize_team)
            teams = teams[~teams["team_abbr"].isin(["OAK", "SD", "STL", "LAR"])]
            teams = teams.drop_duplicates(subset=["team_abbr"])
            if "team_name" not in teams.columns and "team_nick" in teams.columns:
                teams["team_name"] = teams["team_nick"]
            return teams
        except Exception as e:  # noqa: BLE001
            print(f"WARNING: could not pull team_desc ({e}), using static fallback")

    # static fallback (32 current team abbreviations)
    static_teams = [
        ("ARI", "Arizona Cardinals"), ("ATL", "Atlanta Falcons"), ("BAL", "Baltimore Ravens"),
        ("BUF", "Buffalo Bills"), ("CAR", "Carolina Panthers"), ("CHI", "Chicago Bears"),
        ("CIN", "Cincinnati Bengals"), ("CLE", "Cleveland Browns"), ("DAL", "Dallas Cowboys"),
        ("DEN", "Denver Broncos"), ("DET", "Detroit Lions"), ("GB", "Green Bay Packers"),
        ("HOU", "Houston Texans"), ("IND", "Indianapolis Colts"), ("JAX", "Jacksonville Jaguars"),
        ("KC", "Kansas City Chiefs"), ("LA", "Los Angeles Rams"), ("LAC", "Los Angeles Chargers"),
        ("LV", "Las Vegas Raiders"), ("MIA", "Miami Dolphins"), ("MIN", "Minnesota Vikings"),
        ("NE", "New England Patriots"), ("NO", "New Orleans Saints"), ("NYG", "New York Giants"),
        ("NYJ", "New York Jets"), ("PHI", "Philadelphia Eagles"), ("PIT", "Pittsburgh Steelers"),
        ("SEA", "Seattle Seahawks"), ("SF", "San Francisco 49ers"), ("TB", "Tampa Bay Buccaneers"),
        ("TEN", "Tennessee Titans"), ("WAS", "Washington Commanders"),
    ]
    return pd.DataFrame(static_teams, columns=["team_abbr", "team_name"])


def main() -> None:
    print("Computing final TDVS scores...")
    tdvs_df = compute_tdvs()
    tdvs_df.to_parquet(DATA_DIR / "tdvs_scores.parquet", index=False)
    print(f"  -> tdvs_scores.parquet ({len(tdvs_df):,} rows)")

    print("Computing team draft scores...")
    team_scores = compute_team_scores(tdvs_df)
    team_scores.to_parquet(DATA_DIR / "team_draft_scores.parquet", index=False)
    print(f"  -> team_draft_scores.parquet ({len(team_scores):,} rows)")

    print("Building draft_picks.parquet (clean merged dataset)...")
    draft_picks_raw = pd.read_parquet(RAW_DIR / "draft_picks_raw.parquet")
    draft_picks_raw = draft_picks_raw.rename(columns={"season": "draft_year", "pfr_player_name": "player_name_full"})
    draft_picks_clean = draft_picks_raw[["draft_year", "round", "pick", "team", "player_name_full", "position", "gsis_id"]]
    draft_picks_clean = draft_picks_clean.rename(columns={"player_name_full": "player_name"})
    draft_picks_clean["team"] = draft_picks_clean["team"].map(normalize_team)
    draft_picks_clean.to_parquet(DATA_DIR / "draft_picks.parquet", index=False)
    print(f"  -> draft_picks.parquet ({len(draft_picks_clean):,} rows)")

    print("Copying player_epa.parquet...")
    player_epa = pd.read_parquet(RAW_DIR / "player_epa.parquet")
    player_epa.to_parquet(DATA_DIR / "player_epa.parquet", index=False)
    print(f"  -> player_epa.parquet ({len(player_epa):,} rows)")

    print("Building teams.parquet...")
    teams = build_teams_table()
    teams.to_parquet(DATA_DIR / "teams.parquet", index=False)
    print(f"  -> teams.parquet ({len(teams):,} rows)")

    print("\nSanity checks:")
    mahomes = tdvs_df[tdvs_df["player_name"].str.contains("Mahomes", na=False)]
    print("Mahomes TDVS:", mahomes[["pick", "tdvs"]].to_dict("records"))
    jefferson = tdvs_df[(tdvs_df["player_name"].str.contains("Jefferson", na=False)) & (tdvs_df["position"] == "WR")]
    print("Jefferson rows:", jefferson[["player_name", "pick", "tdvs"]].to_dict("records"))
    print("team_draft_scores rows per year:")
    print(team_scores.groupby("season").size())


if __name__ == "__main__":
    main()
