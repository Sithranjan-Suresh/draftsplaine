# DraftSpline

NFL draft intelligence that reconstructs draft value using rookie-contract EPA, instead of career reputation or static trade charts.

**Live URL:** _deploy to Vercel and paste the URL here_
**API URL:** _deploy to Render and paste the URL here_

## The Pitch

DraftSpline reframes the NFL draft as a capital allocation problem: every pick is scored by **TDVS (True Draft Value Score)** — the EPA a player actually produced during their 4-year rookie contract, divided by what was historically expected from that draft slot. The result is a complete re-ranking of draft history that exposes which picks were genuinely worth their cost, and which weren't.

## Screenshots

_Screenshots pending — capture `draft_board_2020.png`, `curve_comparison.png`, `redraft_2020.png`, and `analyst_chat.png` from a running local or deployed instance and drop them in `screenshots/`._

## How It Works

- **Data source:** nflverse play-by-play (2012-2023) and draft pick data, pulled via `nfl_data_py`.
- **TDVS formula:** `rookie_epa_total / expected_epa[pick][position]`, computed across Years 1-4 of each player's rookie contract, with games-played normalization for injury-shortened seasons.
- **Curve fitting:** the expected-EPA curve is fit per position (QB/RB/WR/TE) using Nadaraya-Watson kernel smoothing followed by isotonic regression, with a 90% confidence band that widens in sparse late rounds — reported honestly rather than smoothed away.
- **Simulation logic:** the Redraft Simulator re-orders all qualifying players in a class by TDVS descending and reassigns them to the original pick slots, then computes each team's value delta against what they actually drafted.

## Run Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Serves on `http://localhost:8000`. Requires `backend/data/*.parquet` (already committed) and a `.env` with `GROQ_API_KEY` for the AI analyst (falls back to cached responses if unset).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Serves on `http://localhost:5173`, reading `VITE_API_BASE_URL` from `.env.local` (defaults to `http://localhost:8000`).

### Pipeline (optional — outputs already committed to `backend/data/`)

Run in order from `backend/pipeline/`:

```bash
pip install -r pipeline_requirements.txt
python 01_load_nflverse.py          # pull raw nflverse data (PBP, draft picks, rosters, players, injuries)
python 02_compute_epa_per_player.py # aggregate play-by-play into per-player, per-season EPA
python 03_compute_tdvs.py           # join EPA to draft picks, apply rookie-window + games-played normalization
python 04_fit_draft_curve.py        # fit the expected-EPA curve per position with confidence bands
python 05_compute_team_scores.py    # compute final TDVS, team scores, and write all backend/data/ parquets
```

## Data Attribution

- **nflverse / nflfastR** — play-by-play and draft pick data
- **nfl_data_py** — Python client for nflverse data
- **Stuart Chase draft value chart** — traditional draft-value comparison baseline (approximated; see `backend/pipeline/data/chase_chart.csv`)

See `/methodology` in the running app (or `backend/methodology.md`) for the full writeup, including known limitations.

## Deployment

- **Backend → Render:** root `backend/`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set `ALLOWED_ORIGINS` and `GROQ_API_KEY` env vars in the Render dashboard. See `render.yaml`.
- **Frontend → Vercel:** root `frontend/`, framework preset Vite, set `VITE_API_BASE_URL` to the Render URL. `vercel.json` handles SPA routing.
- **Keep-alive:** register `https://<render-url>/health` at cron-job.org on a 14-minute interval to avoid cold starts before a demo.
