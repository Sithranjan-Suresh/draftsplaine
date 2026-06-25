"""load_data() reads every committed parquet/csv in backend/data/ into
in-memory pandas DataFrames. Called once at FastAPI startup; the resulting
dict is treated as read-only for the lifetime of the process."""
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).parent / "data"

REQUIRED_FILES = {
    "draft_picks": "draft_picks.parquet",
    "player_epa": "player_epa.parquet",
    "tdvs": "tdvs_scores.parquet",
    "curve": "draft_curve.parquet",
    "team_scores": "team_draft_scores.parquet",
    "teams": "teams.parquet",
}


def load_data() -> dict:
    data = {}
    for key, filename in REQUIRED_FILES.items():
        path = DATA_DIR / filename
        if not path.exists():
            print(f"FATAL: required data file missing: {path}")
            raise FileNotFoundError(f"Missing required data file: {path}")
        data[key] = pd.read_parquet(path)
        print(f"Loaded {filename}: {len(data[key]):,} rows")

    chase_path = DATA_DIR / "chase_chart.csv"
    if not chase_path.exists():
        print(f"FATAL: required data file missing: {chase_path}")
        raise FileNotFoundError(f"Missing required data file: {chase_path}")
    data["chase_chart"] = pd.read_csv(chase_path)
    print(f"Loaded chase_chart.csv: {len(data['chase_chart']):,} rows")

    return data
