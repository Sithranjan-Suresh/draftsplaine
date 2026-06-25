# DraftSpline

NFL draft intelligence that reconstructs draft value using rookie-contract EPA, instead of career reputation or static trade charts.

**Live URL:** _deploy to Vercel and paste the URL here_
**API URL:** _deploy to Render and paste the URL here_

## The Finding

Using EPA from nflverse across 14 draft classes (2012-2025), DraftSpline finds:

- **The 7th-round pick #262 in 2022 — Brock Purdy, "Mr. Irrelevant" — produced 24.48x his slot's expected value.** That's the single largest TDVS in the dataset, larger than every first-round pick in any class we modeled. **We lead with this number and immediately flag why it's contestable**, not just on the player card but directly under the hero stats on the landing page: TDVS doesn't adjust for offensive line quality, receiving talent, or scheme, and Purdy's score is in part a stress-test of that blind spot.
- **Quarterback has the highest bust rate of any modeled position: 55.2%** of qualifying QB picks miss their slot's expectation (TDVS < 0.5), vs. 43.1% for RB, 39.9% for WR, and 35.6% for TE — measured on the 2012-2022 subset where every player has a complete 4-year rookie window, so the comparison is apples-to-apples. This is shown as a labeled bar chart on the Draft Board, not asserted in isolation.
- **The New York Jets have drafted -1,096.9 EPA below expectation since 2012** — the worst accumulated drafting record of any of the 32 franchises, while the 49ers lead at +301.8.

Every pick is scored by **TDVS (True Draft Value Score)**: the EPA a player actually produced during their 4-year rookie contract, divided by what was historically expected from that draft slot. TDVS > 1.0 means a player outperformed his slot; the formula reframes the draft as a capital allocation problem instead of a talent-guessing game.

## Features

1. **TDVS Draft Board** (`/`) — every pick in a selected class (2012-2025), toggleable between pick order and TDVS ranking with an animated reorder. Defaults to hiding unmodeled positions (OL/DL/LB/CB/S/K/P) with a count and a toggle to reveal them; includes a player-name search box and position filter tabs. Shows three hero stats and the cross-position bust-rate chart on load. Recent classes (2023-2025) carry a partial-data banner since their rookie windows haven't completed.
2. **Player drill-down** — click any pick to open a modal with year-by-year EPA bars, an auto-generated one-sentence verdict, a limitation caveat on any outlier score (TDVS ≥ 5), and a deep-link into the Redraft Simulator for that class.
3. **Draft Value Curve Comparison** (`/curve`) — the traditional Stuart Chase chart vs. DraftSpline's per-position EPA curve (Nadaraya-Watson kernel smoothing + isotonic regression), both normalized to pick #1 = 1.0. The 90% confidence band is labeled in the legend, and two dynamic callouts state the exact pick-number divergence and the exact CI-width growth from early to late rounds — not just a visual that's left to speak for itself.
4. **Redraft Simulator** (`/redraft`) — re-orders a class by TDVS and shows original vs. optimized order with hover-linked rows and a per-team value-delta bar chart. Restricted to 2012-2022 classes (complete rookie windows only): small-sample noise in incomplete classes combined with RB's near-zero EPA baseline produced implausible "best picks ever" results, so the fix is to restrict the input rather than clamp the output. Carries an inline disclaimer that it ranks by value, not team need or fit.
5. **AI Draft Analyst** (`/analyst`) — Groq-backed chat that's grounded in the real TDVS data, not general football knowledge. Every request includes cross-position bust/steal rates; position-specific top-5 steal/bust leaderboards are added automatically when a position is mentioned; entities (player/team/year) are extracted from the question and answer to ground every claim. An explicit guard prevents the model from inventing players, scores, or seasons outside the provided context (verified against a "biggest steal of all time" prompt that previously fabricated pre-2012 players). Responses that mention a player render an inline EPA bar chart. Falls back to `analyst_fallback.json` if Groq is unavailable.
6. **GM Scorecard** (`/teams`) — all 32 franchises ranked by capital-weighted TDVS, with best/worst-franchise hero cards at the top using the same numbers as the Draft Board's lead claim.
7. **Methodology page** (`/methodology`) — plain-language writeup of TDVS, the curve-fitting method, and every known limitation, served from `backend/methodology.md`.

## Demo Walkthrough

1. **Draft Board** (`/`) — opens on the 2020 class. The hero stats and bust-rate chart are the lead claims above. Toggle "Pick Order" ↔ "TDVS Ranking" — Jordan Love (pick #26) and Justin Herbert (pick #6) jump ahead of Joe Burrow (pick #1) despite being picked later.
2. **Click any player row** — opens the drill-down with the year-by-year EPA chart and a "View in Redraft Simulator" link.
3. **Curve Comparison** (`/curve`) — toggle position groups and read both dynamic callouts below the chart.
4. **Redraft Simulator** (`/redraft`) — select 2020, click "Rebuild Draft," and watch ~90% of picks reorder. Read the inline disclaimer first.
5. **AI Analyst** (`/analyst`) — ask "Which position busts the most, QB or RB?" and get a real, numbers-grounded comparative answer with an inline chart, not generic prose.
6. **GM Scorecard** (`/teams`) — best/worst franchise hero cards, traceable back to the Draft Board's lead claim.

## Screenshots

_Screenshots pending — capture `draft_board_2020.png`, `curve_comparison.png`, `redraft_2020.png`, and `analyst_chat.png` from a running local or deployed instance and drop them in `screenshots/`._

## How It Works

- **Data source:** nflverse play-by-play (2012-2025) and draft pick data, pulled via `nfl_data_py`. Classes 2023-2025 are scored as preliminary (rookie windows incomplete) and flagged accordingly; only 2012-2022 classes feed curve fitting and the Redraft Simulator.
- **TDVS formula:** `rookie_epa_total / expected_epa[pick][position]`, computed across Years 1-4 of each player's rookie contract, with games-played normalization for injury-shortened seasons. Stabilized near zero/negative `expected_epa` (a real effect for RB, since rushing has structurally negative average EPA) with a formula that's mathematically identical to the literal ratio whenever `expected_epa` is comfortably positive.
- **Curve fitting:** the expected-EPA curve is fit per position (QB/RB/WR/TE) using Nadaraya-Watson kernel smoothing followed by isotonic regression, with a 90% confidence band that widens in sparse late rounds — reported honestly and labeled in the UI rather than smoothed away or left unexplained.
- **Simulation logic:** the Redraft Simulator re-orders all qualifying players in a complete-window class by TDVS descending and reassigns them to the original pick slots, then computes each team's value delta against what they actually drafted.
- **Analyst grounding:** the backend extracts entities (year/team/player/position) from each question, attaches real parquet data as JSON context, and instructs the model to never assert a value not present in that context.

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

## API Reference

| Route | Description |
|---|---|
| `GET /api/draft/{year}` | All picks in a draft class with TDVS scores |
| `GET /api/curve` | Expected-EPA curve per position + Stuart Chase comparison |
| `GET /api/teams` | All 32 GM scorecards |
| `GET /api/team/{abbr}` | One team's full pick-by-pick history |
| `GET /api/player/{gsis_id}` | Player card with year-by-year EPA |
| `GET /api/redraft/{year}` / `/api/redraft/{year}/{team}` | Optimized draft order + team value deltas |
| `POST /api/analyst` | AI analyst question/answer |
| `GET /api/methodology` | Methodology page content |
| `GET /health` | Health check |

## Data Attribution

- **nflverse / nflfastR** — play-by-play and draft pick data
- **nfl_data_py** — Python client for nflverse data
- **Stuart Chase draft value chart** — traditional draft-value comparison baseline (approximated; see `backend/pipeline/data/chase_chart.csv`)

See `/methodology` in the running app (or `backend/methodology.md`) for the full writeup, including known limitations.

## Deployment

- **Backend → Render:** root `backend/`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set `ALLOWED_ORIGINS` and `GROQ_API_KEY` env vars in the Render dashboard. See `render.yaml`.
- **Frontend → Vercel:** root `frontend/`, framework preset Vite, set `VITE_API_BASE_URL` to the Render URL. `vercel.json` handles SPA routing.
- **Keep-alive:** register `https://<render-url>/health` at cron-job.org on a 14-minute interval to avoid cold starts before a demo.
