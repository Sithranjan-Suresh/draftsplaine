# DraftSpline — Engineering Specification

This document specifies every component of the system at a level where it can be built without clarifying questions. Read `full_context.md` first — it defines data contracts, naming conventions, formulas, parquet schemas, the API contract, and the visual design system that every component here references rather than redefines.

**Companion file:** `full_context.md` — project vision, core metric definitions, parquet schemas, API contract, design system.

**Pipeline scripts are numbered 01–05 and must be run in order.** Each script's output is the next script's primary input. None are imported by the live backend — they are run locally, their output parquets are committed to the repo under `backend/data/`.

---

# Architecture

## System Overview

DraftSpline is a three-layer system:

```
[Data Pipeline] → [Static Parquet Files] → [FastAPI Backend] → [React Frontend]
                                          ↘ [Groq API]       ↗
```

1. **Data Pipeline** (local, run once): Python scripts that pull from `nfl_data_py`, compute TDVS and the draft curve model, and write final parquet files. These scripts are not deployed.
2. **Backend** (Render): A FastAPI server that reads from committed parquet files and serves the API. Also handles Groq API proxying for the AI analyst.
3. **Frontend** (Vercel): A Vite + React SPA. All data fetched from the backend API. No direct data file access from the frontend.

---

# Database Design

There is no traditional relational database. Parquet files committed to `backend/data/` are the database. The backend reads them at startup into pandas DataFrames held in memory. This makes cold starts slightly slower (~1–2s) but eliminates any database dependency for a hackathon.

## Parquet Files (in `backend/data/`)

All parquet schemas are defined in `full_context.md`. Summary:

| File | Rows | Primary Key | Description |
|---|---|---|---|
| `draft_picks.parquet` | ~2,800 | `gsis_id + draft_year` | All draft picks 2012–2022 with player metadata |
| `player_epa.parquet` | ~12,000 | `gsis_id + season` | Per-player per-season EPA stats |
| `tdvs_scores.parquet` | ~2,800 | `gsis_id` | Final computed TDVS per drafted player |
| `draft_curve.parquet` | ~1,048 | `pick + position_group` | Expected EPA curve by pick and position group |
| `team_draft_scores.parquet` | ~352 | `team + season` | Aggregate team draft efficiency per year |
| `chase_chart.csv` | 262 | `pick` | Stuart Chase draft value chart (static, not parquet) |
| `teams.parquet` | 32 | `team_abbr` | Team metadata: name, city, abbreviation, colors |

## In-Memory Data Store (backend startup)

At FastAPI startup, `main.py` calls `load_data()` which reads all parquets into a module-level dict:

```
DATA = {
    "draft_picks": pd.DataFrame,
    "player_epa": pd.DataFrame,
    "tdvs": pd.DataFrame,
    "curve": pd.DataFrame,
    "team_scores": pd.DataFrame,
    "teams": pd.DataFrame,
    "chase_chart": pd.DataFrame,
}
```

This dict is read-only at runtime. No writes during serving.

---

# API Design

All API routes are defined in `full_context.md`. This section specifies implementation details.

## Backend Route File Structure

```
backend/
  main.py              — app init, CORS, startup hook, health endpoint
  routers/
    draft.py           — /api/draft/{year}
    curve.py           — /api/curve
    teams.py           — /api/teams, /api/team/{abbr}
    player.py          — /api/player/{gsis_id}
    redraft.py         — /api/redraft/{year}/{team}
    analyst.py         — POST /api/analyst
    methodology.py     — /api/methodology
  data_loader.py       — load_data() function, called once at startup
  analyst_fallback.json — hardcoded fallback responses for 5 demo questions
```

## CORS Configuration

In `main.py`, configure `CORSMiddleware`:
- `allow_origins`: read from `ALLOWED_ORIGINS` env var, split by comma. Default: `["http://localhost:5173"]`.
- `allow_methods`: `["GET", "POST"]`
- `allow_headers`: `["Content-Type"]`

## Error Handling Pattern

All routes use a consistent error pattern:
- 200: success — returns data
- 404: resource not found (e.g., draft year out of range, player not found)
- 422: validation error (FastAPI default for invalid path/query params)
- 500: unexpected error — return `{"error": "internal error", "detail": str(e)}` (never expose raw stack traces)
- All 4xx/5xx responses include a `"data_as_of"` field so the client knows the data vintage

## Response Caching

FastAPI responses are not cached at the server level for v1. All parquets are in memory, so response times are fast (<100ms) for all endpoints except `/api/analyst` (Groq latency). If needed, add `functools.lru_cache` to expensive computation functions in the pipeline, not in routers.

---

# Authentication

There is no authentication in v1. The API is public. No user accounts. The Groq API key is stored as an environment variable `GROQ_API_KEY` on the Render backend. It is never exposed to the frontend — all Groq calls are proxied through the backend's `/api/analyst` endpoint.

---

# Frontend Structure

```
frontend/
  index.html               — Google Fonts preconnect, title "DraftSpline"
  src/
    main.jsx               — ReactDOM.createRoot, BrowserRouter
    App.jsx                — Route definitions
    index.css              — All CSS custom property tokens, global reset
    lib/
      api.js               — All fetch() wrappers
      utils.js             — Formatting helpers (formatTDVS, formatEPA, getTDVSColor, etc.)
    components/
      NavBar.jsx
      DraftClassSelector.jsx
      PlayerRow.jsx
      PlayerCard.jsx        — Modal card for individual player drill-down
      LoadingSpinner.jsx
      ErrorBanner.jsx
      TooltipWrapper.jsx    — Generic hover tooltip
      TDVSBadge.jsx         — Color-coded TDVS score chip
      TeamLogo.jsx          — Renders team logo img with fallback
    pages/
      DraftBoard.jsx        — Feature 1: Draft board with sort toggle
      CurveComparison.jsx   — Feature 2: Draft curve chart
      RedraftSimulator.jsx  — Feature 3: Redraft engine
      Analyst.jsx           — Feature 4: AI chat interface
      GMScorecard.jsx       — Feature 5: Team efficiency rankings
      Methodology.jsx       — Feature 7: Methodology explainer
    hooks/
      useDraftClass.js      — Fetches and caches draft class data
      useCurve.js           — Fetches curve data
      useTeams.js           — Fetches team scorecards
```

## Routing

React Router v6 routes defined in `App.jsx`:

| Path | Component | Description |
|---|---|---|
| `/` | `DraftBoard` | Default view — draft board |
| `/curve` | `CurveComparison` | Draft curve comparison |
| `/redraft` | `RedraftSimulator` | Redraft simulator |
| `/analyst` | `Analyst` | AI chat |
| `/teams` | `GMScorecard` | Team GM scorecards |
| `/methodology` | `Methodology` | Methodology explainer |

All routes also render `NavBar` at the top.

---

# Backend Structure

```
backend/
  main.py
  routers/
    draft.py
    curve.py
    teams.py
    player.py
    redraft.py
    analyst.py
    methodology.py
  data_loader.py
  analyst_fallback.json
  data/                   — committed parquet files (pipeline output)
  pipeline/
    pipeline_requirements.txt
    raw/                  — intermediate parquet files (not committed)
    01_load_nflverse.py
    02_compute_epa_per_player.py
    03_compute_tdvs.py
    04_fit_draft_curve.py
    05_compute_team_scores.py
  requirements.txt        — live backend only: fastapi, uvicorn, pandas, pyarrow, httpx, numpy, scipy, python-dotenv
```

---

# State Management

No external state management library (no Redux, no Zustand). All state is local React state managed with `useState` and `useReducer` within each page component, supplemented by custom hooks for data fetching.

## State Pattern

Each page component follows this pattern:
```
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

Loading: show `LoadingSpinner`. Error: show `ErrorBanner` with message. Success: render main content.

## DraftBoard-Specific State

```
const [year, setYear] = useState(2020);
const [sortMode, setSortMode] = useState("pick");  // "pick" | "tdvs"
const [selectedPlayer, setSelectedPlayer] = useState(null);  // opens PlayerCard modal
const [positionFilter, setPositionFilter] = useState("ALL");
```

Changing `year` triggers re-fetch. Changing `sortMode` re-sorts in memory — no re-fetch.

## Analyst-Specific State

```
const [messages, setMessages] = useState([]);  // {role: "user"|"assistant", content: string}[]
const [input, setInput] = useState("");
const [loading, setLoading] = useState(false);
```

Chat history is session-only (not persisted). Cleared on page reload.

---

# External Services

## Groq API
- Used for: AI Draft Analyst responses
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Model: `llama3-8b-8192` (fast, sufficient for analytical Q&A)
- Called from: `backend/routers/analyst.py` only — never from the frontend
- API key: `GROQ_API_KEY` env var on Render
- Timeout: 10 seconds. If timeout, return fallback response from `analyst_fallback.json`.
- System prompt (stored in `routers/analyst.py` as a module-level constant):

```
You are DraftSpline, an NFL draft analytics assistant. You answer questions about NFL draft history using TDVS (True Draft Value Score) data, which measures how much value a player produced during their rookie contract relative to what was expected at their draft slot. Keep answers under 150 words. Always cite specific numbers (TDVS scores, EPA values, pick numbers) when available. If you don't have data for a player or class, say so honestly. Do not discuss topics unrelated to NFL draft analytics.
```

- Context injection: before calling Groq, the backend queries relevant data from the parquets based on entities mentioned in the question (player names, teams, years) and appends them to the user message as a JSON context block.

## nfl_data_py (pipeline only)
- Used in: all 5 pipeline scripts
- Installed in: `backend/pipeline/pipeline_requirements.txt` only
- Do not add to `backend/requirements.txt`

---

# Deployment Plan

## Backend → Render

- Service type: Web Service
- Root directory: `backend/`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables (set in Render dashboard):
  - `ENVIRONMENT=production`
  - `ALLOWED_ORIGINS=https://your-vercel-url.vercel.app`
  - `GROQ_API_KEY=<your key>`
- The `backend/data/` parquets are committed to the repo and available at build time. The pipeline does NOT run on Render.

## Frontend → Vercel

- Framework preset: Vite
- Root directory: `frontend/`
- Environment variable: `VITE_API_BASE_URL=https://your-render-url.onrender.com`
- `vercel.json` rewrite rule routes all non-asset paths to `/index.html` for client-side routing

## Keep-Alive Cron (prevent Render cold starts)
- Register at cron-job.org (free)
- URL: `https://your-render-url.onrender.com/health`
- Schedule: every 14 minutes
- Verify "last run: success" before demo day

---

# Implementation Tasks

Tasks are ordered for sequential Claude Code execution. Each task is self-contained and has a clear handoff to the next.

---

## Task 0: Project Scaffold

**Goal:** Create the complete directory tree and all base config files so every subsequent task has a home.

**Inputs:** None.

**Outputs:**
- Full directory structure matching `full_context.md`
- `backend/requirements.txt`: `fastapi`, `uvicorn[standard]`, `pandas`, `pyarrow`, `python-dotenv`, `httpx`, `numpy`, `scipy`
- `backend/pipeline/pipeline_requirements.txt`: same as above plus `nfl_data_py`, `scikit-learn`
- `frontend/` initialized via `npm create vite@latest frontend -- --template react`
- `frontend/package.json` with added deps: `recharts`, `react-router-dom`
- `frontend/index.html` with Google Fonts preconnect for Space Grotesk (500, 700), Inter (400, 500), Space Mono. Title: `"DraftSpline"`
- `frontend/src/index.css` with all CSS custom property tokens from `full_context.md` design system, box-sizing reset, body rule
- `frontend/src/lib/api.js` with `BASE_URL` from `import.meta.env.VITE_API_BASE_URL` (fallback `http://localhost:8000`) and exported async functions: `fetchDraftClass(year)`, `fetchCurve()`, `fetchTeams()`, `fetchTeam(abbr)`, `fetchPlayer(gsis_id)`, `fetchRedraft(year, team)`, `postAnalystQuestion(question)`, `fetchMethodology()`. Each function checks `response.ok`, throws on failure.
- `frontend/.env.local`: `VITE_API_BASE_URL=http://localhost:8000`
- `frontend/vercel.json`: rewrite all non-asset paths to `/index.html`
- `backend/.env`: `ENVIRONMENT=development`, `ALLOWED_ORIGINS=http://localhost:5173`

**Dependencies:** None.

**Testing Requirements:**
- `cd frontend && npm run dev` starts without errors and serves Vite default page at `localhost:5173`
- `cd backend && pip install -r requirements.txt` completes without conflicts
- Directory tree matches the spec — no extra directories or missing files

---

## Task 1.1: Pipeline — Load nflverse Data

**Goal:** Pull all raw data from nflverse and write to `backend/pipeline/raw/` as parquet files. This is the only script that touches the network.

**Inputs:** None (network calls to nfl_data_py).

**Outputs:** Parquet files in `backend/pipeline/raw/`:
- `pbp_{YEAR}.parquet` for each year 2012–2023 (or a combined `pbp_all.parquet` — choose one and document it)
- `draft_picks_raw.parquet` — all draft picks 2012–2023
- `rosters_raw.parquet` — seasonal rosters 2012–2023
- `players_raw.parquet` — all player biographical data
- `injuries_raw.parquet` — injuries 2012–2023

**Processing notes:**
- Hardcode `SEASONS = list(range(2012, 2024))` at the top of the script.
- PBP pull: `nfl.import_pbp_data(years=SEASONS)`. This is the largest pull — print progress before each call.
- Draft picks: `nfl.import_draft_picks(years=SEASONS)`.
- Rosters: `nfl.import_seasonal_rosters(years=SEASONS)`.
- Players: `nfl.import_players()`.
- Injuries: `nfl.import_injuries(years=SEASONS)`.
- Wrap each pull in try/except. On failure, print error and `sys.exit(1)`.
- Print row counts after each save.
- Re-running overwrites existing files without error.

**Dependencies:** Task 0 complete, `pipeline_requirements.txt` installed.

**Testing Requirements:**
- All 5 files exist in `backend/pipeline/raw/`
- `draft_picks_raw.parquet` contains columns: `season`, `round`, `pick`, `team`, `player_name`, `position`, `gsis_id`
- `pbp` data (combined or per-year) contains columns: `passer_player_id`, `rusher_player_id`, `receiver_player_id`, `epa`, `play_type`, `qb_dropback`, `posteam`, `season`, `receiver_position`
- All files load without error and have non-zero row counts

---

## Task 1.2: Pipeline — Compute EPA Per Player Per Season

**Goal:** Aggregate EPA from play-by-play into per-player, per-season totals. Produces the `player_epa.parquet` that all downstream TDVS math reads from.

**Inputs:**
- `backend/pipeline/raw/pbp_{all years}.parquet`
- `backend/pipeline/raw/players_raw.parquet`
- `backend/pipeline/raw/rosters_raw.parquet`

**Outputs:**
- `backend/pipeline/raw/player_epa.parquet`

One row per (gsis_id, season). Columns: `gsis_id`, `player_name`, `position`, `team_abbr`, `season`, `plays`, `total_epa`, `epa_per_play`, `games_played`.

**Processing notes:**

Position routing — compute EPA separately using the correct play type and player ID column:

| Position | Filter | Player ID Column |
|---|---|---|
| QB | `qb_dropback == 1` | `passer_player_id` |
| RB | `play_type == "run"` AND `rusher_player_id not null` AND player position == RB | `rusher_player_id` |
| WR | `play_type == "pass"` AND `receiver_player_id not null` AND `receiver_position == "WR"` | `receiver_player_id` |
| TE | `play_type == "pass"` AND `receiver_player_id not null` AND `receiver_position == "TE"` | `receiver_player_id` |

For each position subset:
1. Filter PBP to matching plays
2. Group by `[player_id_column, season]`
3. Aggregate: count of plays, sum of EPA, mean EPA/play
4. Join to players/rosters to attach player_name, position, team_abbr

Concatenate all four position DataFrames. Handle duplicates (a player appearing in multiple position groups — rare but possible for gadget players — keep only their primary position row, defined as the one with the most plays).

Attach `games_played` from the rosters data: count distinct weeks each player appears on a roster in that season.

**Dependencies:** Task 1.1.

**Testing Requirements:**
- `player_epa.parquet` exists and loads cleanly
- Patrick Mahomes (gsis_id known) has plausible EPA values across seasons 2017–2023
- Justin Jefferson (gsis_id known) has WR EPA data starting in season 2020
- No duplicate (gsis_id, season) rows
- No null values in `total_epa`, `plays`, `epa_per_play`

---

## Task 1.3: Pipeline — Compute TDVS Scores

**Goal:** Join player EPA data to draft pick data, apply the rookie contract window filter (4 years), and compute TDVS for each player.

**Inputs:**
- `backend/pipeline/raw/player_epa.parquet`
- `backend/pipeline/raw/draft_picks_raw.parquet`

**Outputs:**
- `backend/pipeline/raw/tdvs_scores_preliminary.parquet`

One row per drafted player (2012–2022). Columns: `gsis_id`, `player_name`, `position`, `draft_year`, `pick`, `round`, `team`, `rookie_epa_total`, `games_played_total`, `seasons_available`, `qualifying`.

**Processing notes:**
- For each drafted player, compute `rookie_epa_total`: sum of `total_epa` from `player_epa` for seasons `draft_year` through `draft_year + 3` (inclusive), where seasons are available.
- Apply games-played normalization: for any season where `games_played < 8`, scale that season's EPA by `(games_played / 17)` before summing. This avoids penalizing players for injury-shortened seasons. Document this adjustment explicitly.
- `qualifying` flag: player meets minimum plays threshold for their position across all 4 rookie seasons combined (thresholds from `full_context.md`). Players with `qualifying == False` are still included in the output but excluded from TDVS ranking and curve fitting.
- `seasons_available`: count of seasons where the player appeared in `player_epa` during the rookie window. A player with `seasons_available < 2` is flagged but not removed — their score will be preliminary.
- Do not yet compute TDVS here (that requires the curve from Task 1.4). This script outputs raw rookie EPA totals only.

**Dependencies:** Tasks 1.1 and 1.2.

**Testing Requirements:**
- Row count approximately 2,500–2,800 (one per drafted player 2012–2022)
- Lamar Jackson (2018, pick 32, QB) has a high `rookie_epa_total`
- JaMarcus Russell equivalent (any known bust) has a low or near-zero `rookie_epa_total`
- `qualifying` is True for well-known starters and False for players who barely played

---

## Task 1.4: Pipeline — Fit Draft Value Curve

**Goal:** Fit a LOESS/spline regression model to compute expected rookie EPA per pick number, separately by position group. This produces the expected-EPA curve that TDVS denominates against.

**Inputs:**
- `backend/pipeline/raw/tdvs_scores_preliminary.parquet`

**Outputs:**
- `backend/data/draft_curve.parquet` — this goes directly to `backend/data/` (it's pipeline final output)
- `backend/pipeline/raw/curve_model.pkl` — serialized model for potential reuse (optional)

**Processing notes:**
- Filter to `qualifying == True` players only for curve fitting.
- Define position groups: `QB`, `skill` (RB + WR + TE combined for sample size), optionally split if sample is sufficient.
- For each position group, fit a LOESS or scipy `UnivariateSpline` with `rookie_epa_total` as dependent variable and `pick` as independent variable.
- Knot selection for spline: let scipy choose automatically based on smoothing factor. Document the smoothing parameter used.
- Compute fitted values and 90% confidence intervals at each integer pick value from 1 to 262.
- Handle picks with zero qualifying players in the training data (common in rounds 6–7): interpolate from neighboring picks rather than leaving gaps.
- Write `draft_curve.parquet` with columns: `pick`, `position_group`, `expected_epa`, `ci_lower`, `ci_upper`.
- Also compute the Stuart Chase chart lookup from `backend/pipeline/data/chase_chart.csv` and add it as a normalized column for comparison. Normalize both curves to pick 1 = 1.0 for the frontend comparison chart.

**Dependencies:** Task 1.3.

**Testing Requirements:**
- `draft_curve.parquet` exists in `backend/data/` with 262 rows per position group
- `expected_epa` at pick 1 is higher than at pick 32 (monotone decreasing at early picks)
- `expected_epa` does not go negative until deep in round 5 at earliest (negative expected EPA at pick 1 would be a clear bug)
- CI bands widen in later rounds (more uncertainty) — check that `ci_upper - ci_lower` is larger at pick 200 than at pick 20
- Stuart Chase normalized values present and declining monotonically

---

## Task 1.5: Pipeline — Compute Final TDVS and Team Scores

**Goal:** Combine preliminary EPA totals with the fitted curve to compute final TDVS scores. Aggregate to team-level draft efficiency. Write all final parquets to `backend/data/`.

**Inputs:**
- `backend/pipeline/raw/tdvs_scores_preliminary.parquet`
- `backend/data/draft_curve.parquet`
- `backend/pipeline/raw/draft_picks_raw.parquet`

**Outputs (all go to `backend/data/`):**
- `tdvs_scores.parquet`
- `team_draft_scores.parquet`
- `draft_picks.parquet` (clean merged pick+player dataset)
- `player_epa.parquet` (copy from raw, after final cleaning)
- `teams.parquet` (team metadata)

**Processing notes:**

**TDVS computation:**
```
tdvs = rookie_epa_total / expected_epa[pick][position_group]
```
- If `expected_epa` for the pick+position_group is negative or zero (extremely rare): set `qualifying = False` and `tdvs = null`. Log this.
- Round `tdvs` to 2 decimal places.
- Round `rookie_epa_total` and `expected_epa` to 1 decimal place.

**Team draft scores computation:**
- For each (team, draft_year) where `qualifying == True`:
  - `mean_tdvs`: simple mean across qualifying picks
  - `weighted_tdvs`: weighted mean using Stuart Chase chart values as weights (earlier picks count more)
  - `epa_vs_expected`: sum of (rookie_epa_total - expected_epa) across qualifying picks
  - `picks_qualifying`: count of qualifying picks
- Compute cross-team ranking by `weighted_tdvs` for each year.

**teams.parquet:**
- Pull from `nfl.import_team_desc()`. Columns: `team_abbr`, `team_name`, `team_city`, `team_conf`, `team_division`, `team_color` (hex), `team_color2` (hex).

**Dependencies:** Tasks 1.3 and 1.4.

**Testing Requirements:**
- `tdvs_scores.parquet` has the same row count as `tdvs_scores_preliminary.parquet`
- Patrick Mahomes TDVS > 3.0 (known elite value pick at #10)
- JaMarcus Russell TDVS < 0.2 (known bust at #1)
- Justin Jefferson TDVS > 2.5 (known steal at #22)
- `team_draft_scores.parquet` has 32 rows per draft year
- All team abbreviations in `team_draft_scores.parquet` match `teams.parquet` abbreviations

---

## Task 2.1: Backend — App Initialization and Data Loader

**Goal:** Build `backend/main.py` and `backend/data_loader.py`. The app initializes, loads all parquets into memory, and serves a `/health` endpoint.

**Inputs:** Parquet files in `backend/data/`.

**Outputs:**
- `backend/main.py`: FastAPI app with CORS, startup hook calling `load_data()`, and `/health` route
- `backend/data_loader.py`: `load_data()` function returning the `DATA` dict

**Processing notes:**
- `main.py` creates the FastAPI `app` object. On startup event, calls `load_data()` and stores the result in `app.state.data`.
- `data_loader.py`: reads all parquets from a `DATA_DIR` constant that defaults to `backend/data/` relative to the module. Returns the `DATA` dict. On any file-not-found error, prints a clear message and raises to prevent silent startup with missing data.
- Include all router imports and `app.include_router()` calls — routes can be empty stubs at this stage.
- CORS: read `ALLOWED_ORIGINS` from env, split by comma.

**Dependencies:** Task 0 and Task 1.5.

**Testing Requirements:**
- `uvicorn main:app --reload` starts without errors
- `GET /health` returns `{"status": "ok", "data_as_of": "YYYY-MM-DD"}`
- `app.state.data` contains all expected keys with non-empty DataFrames

---

## Task 2.2: Backend — Draft and Curve Endpoints

**Goal:** Implement `GET /api/draft/{year}` and `GET /api/curve`.

**Inputs:** `app.state.data` (DataFrames loaded in Task 2.1).

**Outputs:**
- `backend/routers/draft.py`: draft endpoint implementation
- `backend/routers/curve.py`: curve endpoint implementation

**Processing notes:**

**`/api/draft/{year}` (draft.py):**
- Validate year is between 2012 and 2022 inclusive. Return 404 if out of range.
- Filter `tdvs_scores` and `draft_picks` to the requested year.
- Join to `teams` for team metadata.
- Sort by `pick` ascending.
- Return a list of pick objects per the API contract in `full_context.md`.
- Include `data_as_of` from a module-level constant read from env or hardcoded as the pipeline run date.

**`/api/curve` (curve.py):**
- Return all rows from `draft_curve` parquet.
- Also return the Stuart Chase chart normalized values.
- Structure per the API contract.

**Dependencies:** Task 2.1.

**Testing Requirements:**
- `GET /api/draft/2020` returns ~250 pick objects, all with non-null `pick`, `player_name`, `position`
- `GET /api/draft/2020` includes Patrick Mahomes... wait, 2020 is wrong year for Mahomes. Include Joe Burrow with `pick == 1`, `position == "QB"`.
- `GET /api/draft/2011` returns 404
- `GET /api/curve` returns 262+ rows per position group with `expected_epa` values

---

## Task 2.3: Backend — Teams and Player Endpoints

**Goal:** Implement `GET /api/teams`, `GET /api/team/{abbr}`, and `GET /api/player/{gsis_id}`.

**Inputs:** `app.state.data`.

**Outputs:**
- `backend/routers/teams.py`
- `backend/routers/player.py`

**Processing notes:**

**`/api/teams`:**
- Aggregate `team_draft_scores` across all years to compute overall team ranking.
- Join to `teams` for metadata.
- Return sorted by `weighted_tdvs` descending.

**`/api/team/{abbr}`:**
- Validate team abbreviation exists in `teams` parquet. Return 404 if not.
- Return team metadata + list of all draft picks by that team with TDVS scores + summary stats.

**`/api/player/{gsis_id}`:**
- Look up player in `tdvs_scores`. Return 404 if not found.
- Join to `player_epa` to get per-season EPA breakdown.
- Return player card object including year-by-year EPA.

**Dependencies:** Task 2.1.

**Testing Requirements:**
- `GET /api/teams` returns 32 teams sorted by `weighted_tdvs`
- `GET /api/team/KC` returns Kansas City Chiefs data with picks across modeled years
- `GET /api/team/XX` returns 404
- `GET /api/player/{mahomes_gsis_id}` returns his TDVS score and per-season EPA breakdown

---

## Task 2.4: Backend — Redraft Simulator Endpoint

**Goal:** Implement `GET /api/redraft/{year}/{team}`.

**Inputs:** `app.state.data`.

**Outputs:** `backend/routers/redraft.py`

**Processing notes:**
- Load the draft class for the requested year.
- Build the "optimal" draft order: take all qualifying players in the class, sort by `tdvs` descending, assign them to pick slots 1 through N (ignoring team context — this is a global optimal redraft, not team-specific).
- Compute value delta per team: for each team, compare the sum of `tdvs` for their original picks vs. the sum of `tdvs` for the players they would receive in the optimal redraft at those same pick slots.
- The endpoint also accepts an optional `team` path param — if provided, highlight that team's picks in the response (original and optimized), but always return the full class in the response body.
- Return response per the API contract.

**Dependencies:** Task 2.1 and Task 2.2.

**Testing Requirements:**
- `GET /api/redraft/2020/CIN` returns optimized order for the 2020 class
- Optimized order does not have the same pick-slot assignment as the original order (it changed)
- Team delta values sum to approximately zero across all teams (value is redistributed, not created)
- Players with `qualifying == False` appear in the response but are marked as excluded from the simulation

---

## Task 2.5: Backend — AI Analyst Endpoint

**Goal:** Implement `POST /api/analyst`. Proxy user questions through Groq with relevant data context injected.

**Inputs:** User question string. `app.state.data` for context injection. `GROQ_API_KEY` env var.

**Outputs:** `backend/routers/analyst.py`

**Processing notes:**
- Accept `{"question": str}` in request body.
- Context extraction: scan the question for player names, team names, and years. Query the relevant parquet data for those entities. Format as a compact JSON block appended to the user message.
- Build messages array: `[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": question + "\n\nContext:\n" + json.dumps(context_data)}]`
- Call Groq API via `httpx` (async). Timeout: 10 seconds.
- On Groq success: return `{"answer": response_text, "data_points": extracted_entities}`.
- On Groq timeout or error: check `analyst_fallback.json` for a matching cached response using fuzzy keyword match. If match found, return with `{"cached": true}`. If no match, return `{"answer": "Analyst temporarily unavailable. Please try again.", "cached": false}`.
- Load `analyst_fallback.json` at startup and store in module-level variable.

**`analyst_fallback.json` structure:**
```json
{
  "questions": [
    {
      "keywords": ["2020", "draft class", "good", "bad"],
      "answer": "The 2020 class was above average overall..."
    }
  ]
}
```

**Dependencies:** Task 2.1. Groq API key required.

**Testing Requirements:**
- `POST /api/analyst {"question": "Was the 2020 draft class good?"}` returns a non-empty answer string
- Response time under 5 seconds on a normal connection
- If `GROQ_API_KEY` is unset or invalid, fallback response is returned rather than a 500 error
- Pre-loaded demo questions each return compelling, data-grounded answers

---

## Task 3.1: Frontend — Base Components and Routing

**Goal:** Build `NavBar`, `LoadingSpinner`, `ErrorBanner`, `TDVSBadge`, `TeamLogo`, `TooltipWrapper`, and wire up React Router with stub page components.

**Inputs:** Design system tokens in `index.css`.

**Outputs:**
- All component files listed in the Frontend Structure section
- `App.jsx` with all routes defined
- Stub page components (each returns `<div>Page coming soon</div>` for now)

**Processing notes:**
- `NavBar`: horizontal bar at the top. Logo "DraftSpline" in Space Grotesk 700 on the left. Nav links to all 5 pages on the right. Highlight the active route. Background: `--bg-surface`. Border-bottom: `1px solid --bg-border`.
- `TDVSBadge`: a small colored chip. Props: `tdvs: number | null`, `qualifying: boolean`. Applies color from the TDVS color rules in `full_context.md`. If `!qualifying`, renders gray with "N/A".
- `TeamLogo`: renders `<img>` from nflverse CDN URL pattern. On error, renders a fallback div with team abbreviation in Space Grotesk and `--bg-elevated` background.
- `LoadingSpinner`: centered SVG spinner in `--accent` color.
- `ErrorBanner`: red-tinted banner with error message. Uses `--bust-dim` background.
- `TooltipWrapper`: wraps a child with a hover-triggered tooltip div. Handles positioning to stay within viewport.

**Dependencies:** Task 0.

**Testing Requirements:**
- `npm run dev` renders the NavBar with all 5 links
- Navigating to each route renders the stub without error
- `TDVSBadge` with `tdvs=3.2` renders in `--steal` color
- `TDVSBadge` with `qualifying=false` renders gray

---

## Task 3.2: Frontend — Draft Board Page

**Goal:** Build the primary draft board view (Feature 1 from the product spec).

**Inputs:** `GET /api/draft/{year}` endpoint. Design system.

**Outputs:** `pages/DraftBoard.jsx`, `components/PlayerRow.jsx`, `components/DraftClassSelector.jsx`, `hooks/useDraftClass.js`

**Processing notes:**
- `DraftClassSelector`: a styled `<select>` element with options for 2012–2022. Default 2020.
- `useDraftClass(year)`: custom hook that calls `api.fetchDraftClass(year)`, returns `{data, loading, error}`.
- `DraftBoard`:
  - State: `year`, `sortMode`, `selectedPlayer`, `positionFilter`
  - Renders: `DraftClassSelector`, sort toggle button ("Pick Order" / "TDVS Ranking"), position filter tabs (All / QB / RB / WR / TE), scrollable list of `PlayerRow`
  - Sort logic: in "Pick Order" mode, sort data by `pick` ascending. In "TDVS Ranking" mode, sort by `tdvs` descending with null/non-qualifying last.
  - Sort toggle: CSS transition on row reorder using a stable key per player (`gsis_id`). Use React `key` to maintain DOM identity so the browser can animate between positions.
  - When `selectedPlayer` is set, render `PlayerCard` as a modal.

- `PlayerRow`: a single row in the draft board. Props: `pick`, `round`, `teamAbbr`, `playerName`, `position`, `tdvs`, `qualifying`, `onClick`.
  - Columns: pick number, round badge, `TeamLogo`, player name, position badge, `TDVSBadge`
  - On hover: `--bg-elevated` background. Cursor pointer.
  - Non-qualifying rows: slightly dimmed opacity (0.6).

**Dependencies:** Tasks 2.2 and 3.1.

**Testing Requirements:**
- Draft board loads with 2020 data by default and shows ~250 rows
- Toggling to "TDVS Ranking" visually reorders rows with a smooth transition
- Justin Jefferson appears near the top in TDVS mode despite being pick #22
- Clicking a player row opens `PlayerCard` (stub is fine at this task stage)
- Position filter tabs correctly filter rows

---

## Task 3.3: Frontend — Player Card Modal

**Goal:** Build the individual player drill-down modal (Feature 6 from the product spec).

**Inputs:** `GET /api/player/{gsis_id}`. Player data passed as props from `DraftBoard`.

**Outputs:** `components/PlayerCard.jsx`

**Processing notes:**
- Modal overlay: `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.7)`, `z-index: 100`. Click outside to close.
- Modal content card: `--bg-surface` background, `border-radius: 16px`, `max-width: 600px`, centered.
- Top section: player name (Space Grotesk 700), position badge, team logo, draft details (year, pick, round).
- EPA year-by-year bar chart using Recharts `BarChart`. One bar per season (up to 4). X axis: season year. Y axis: EPA. Horizontal reference line at `expected_epa / 4` (expected per-year). Bar color: `--steal` if positive, `--bust` if negative.
- Summary stats row: TDVS score (large, Space Mono), Rookie EPA Total, Expected EPA.
- If `qualifying == false`: show a banner explaining the insufficient data situation.
- Close button (×) top right.

**Dependencies:** Tasks 2.3 and 3.2.

**Testing Requirements:**
- Clicking Patrick Mahomes (2017 class) opens a card showing his TDVS and per-season EPA bars
- Clicking a non-qualifying player shows the insufficient data banner
- Click-outside and close button both dismiss the modal
- EPA bar chart renders with a reference line

---

## Task 3.4: Frontend — Draft Curve Comparison Page

**Goal:** Build the draft value curve comparison visualization (Feature 2).

**Inputs:** `GET /api/curve`.

**Outputs:** `pages/CurveComparison.jsx`, `hooks/useCurve.js`

**Processing notes:**
- `useCurve()`: fetches `/api/curve`, returns `{data, loading, error}`.
- State: `positionGroup` (All / QB / Skill)
- Recharts `ComposedChart` with:
  - X axis: pick number 1–262. Vertical reference lines at 32, 64, 96, 128, 160, 192.
  - Y axis: normalized value (0.0 to 1.0, normalized to pick 1 = 1.0)
  - `Line` for Stuart Chase chart values: color `--text-muted`, dashed stroke, `strokeWidth={1.5}`
  - `Line` for DraftSpline expected EPA: color `--accent`, solid, `strokeWidth={2.5}`
  - `Area` for confidence interval band: fill `--accent-dim`, stroke none
  - Custom tooltip showing pick number, Chase value, DraftSpline value, ratio
- Position group tabs update which DraftSpline curve line is shown (Chase always stays the same).
- Annotation: a text label at the point of maximum divergence between the two curves.
- Legend: "Traditional Draft Chart" (muted) vs. "DraftSpline EPA Curve" (accent).

**Dependencies:** Tasks 2.2 and 3.1.

**Testing Requirements:**
- Both curves render simultaneously
- DraftSpline curve shows a different shape than the Chase chart (if they look identical, the chart is wrong)
- Confidence interval band is visible and widens in later picks
- Tooltip shows accurate values on hover
- Position group tabs change the DraftSpline line without affecting the Chase line

---

## Task 3.5: Frontend — Redraft Simulator Page

**Goal:** Build the redraft simulator (Feature 3).

**Inputs:** `GET /api/redraft/{year}/{team}`.

**Outputs:** `pages/RedraftSimulator.jsx`

**Processing notes:**
- State: `year`, `team` (optional), `simResult` (null initially), `loading`
- Controls: `DraftClassSelector`, optional team selector, "Rebuild Draft" button
- On "Rebuild Draft" click: call `api.fetchRedraft(year, team)`, set `simResult`
- Result view: two columns (Original | Optimized). Each column is a scrollable list of pick rows showing pick number, team logo, player name, position, TDVS badge.
- Hover synchronization: hovering a row in the left column highlights the same player's position in the right column, and vice versa. Implement with a shared `hoveredPlayer` state.
- Below the two columns: team delta table. Columns: team logo, team name, EPA delta, formatted as "+X.X" (green) or "-X.X" (red). Sorted by absolute delta descending.
- "Reset" button clears `simResult` and returns to the pre-simulation state.
- Loading state: "Rebuilding draft..." spinner during fetch.

**Dependencies:** Tasks 2.4 and 3.1.

**Testing Requirements:**
- Selecting 2020 and clicking Rebuild Draft populates both columns
- Original and optimized orders differ for at least 50% of picks
- Hover on left column highlights correct player on right column
- Team delta table is populated and sorted by magnitude
- Reset button clears the simulation cleanly

---

## Task 3.6: Frontend — AI Analyst Page

**Goal:** Build the conversational AI analyst (Feature 4).

**Inputs:** `POST /api/analyst`.

**Outputs:** `pages/Analyst.jsx`

**Processing notes:**
- Chat layout: scrollable message history filling most of the page height. Input bar pinned to the bottom.
- Message history: each message rendered in a chat bubble. User messages: right-aligned, `--accent-dim` background. Assistant messages: left-aligned, `--bg-elevated` background. Timestamps not required.
- Typing indicator: three-dot animation while `loading == true`.
- Input: `<textarea>` that expands up to 3 rows. Submit on Enter (Shift+Enter for newline). Submit button with send icon.
- On submit: append user message to history, set loading, call `postAnalystQuestion(input)`, append assistant response, clear input.
- If response has `cached: true`: show a subtle "[cached]" tag next to the message.
- Suggested starter questions: shown when `messages.length == 0` as clickable chips. Clicking a chip populates the input (does not auto-submit).
- Auto-scroll to bottom after each new message.
- Session limit: after 20 messages, show a banner "Session limit reached — start a new session" and disable input.

**Dependencies:** Tasks 2.5 and 3.1.

**Testing Requirements:**
- Sending "Was the 2020 draft class good?" returns a response in under 5 seconds
- Typing indicator appears while loading
- Clicking a starter question chip populates the input
- Auto-scroll works after each response
- Empty input disables submit button

---

## Task 3.7: Frontend — GM Scorecard Page and Methodology Page

**Goal:** Build Feature 5 (GM Scorecards) and Feature 7 (Methodology).

**Inputs:** `GET /api/teams`. `GET /api/methodology`.

**Outputs:** `pages/GMScorecard.jsx`, `pages/Methodology.jsx`

**Processing notes:**

**GMScorecard:**
- Sortable table using in-memory sort on the fetched data. Default: `weighted_tdvs` descending.
- Column headers clickable to toggle sort direction.
- Team row: logo + name, seasons evaluated, mean TDVS, weighted TDVS, total EPA vs expected, rank badge.
- Clicking a row opens that team's detail view (can be a stub at this stage — navigate to `/teams/{abbr}`).

**Methodology:**
- Static content page. Fetches markdown from `GET /api/methodology`, renders as pre-wrapped text or parse simple markdown manually (no external markdown library needed for v1 — just whitespace and line breaks).
- Replacement-level data: render a simple HTML table with columns: Position, Minimum Qualifying Plays, Expected EPA at Pick 1, Expected EPA at Pick 32, Expected EPA at Pick 64.
- Data sources section: static, not from API.

**Dependencies:** Tasks 2.3 and 3.1.

**Testing Requirements:**
- GM scorecard table renders all 32 teams
- Clicking column headers changes sort order
- Methodology page loads without error and contains readable text
- No unexplained acronyms visible on methodology page

---

## Task 4.1: Documentation and Deployment

**Goal:** Write README, deploy to Render and Vercel, set up keep-alive cron, take required screenshots.

**Inputs:** All completed components. Render account. Vercel account. cron-job.org account.

**Outputs:**
- `README.md` at repo root
- Deployed backend URL on Render
- Deployed frontend URL on Vercel
- Cron job configured at cron-job.org
- `screenshots/` directory with 4 screenshots

**Processing notes:**

**README structure:**
1. `# DraftSpline` + one-line description
2. Live URL (Vercel) + API URL (Render) as clickable links
3. The pitch in two sentences
4. Embedded screenshots
5. "How it works" — 4 bullets (data source, TDVS formula, curve fitting method, simulation logic)
6. "Run locally" — exact commands for both backend and frontend, and pipeline scripts in order with one-sentence purpose each
7. Data attribution: nflverse / nfl_data_py, Stuart Chase chart, nflfastR

**Required screenshots:**
- `screenshots/draft_board_2020.png` — draft board showing TDVS ranking mode with color bands visible
- `screenshots/curve_comparison.png` — draft value curve comparison with both lines visible
- `screenshots/redraft_2020.png` — redraft simulator showing original vs. optimized with team delta table
- `screenshots/analyst_chat.png` — analyst chat with a compelling Q&A exchange visible

**Deployment:** follow the plan in the Deployment Plan section above. Verify all acceptance criteria from `full_context.md` Definition of Done section.

**Dependencies:** All Tasks 0–3.7.

**Testing Requirements:**
- Live Vercel URL loads draft board with 2020 data in under 2 seconds
- All 5 nav routes work on the deployed URL (no 404s)
- `/health` on Render URL returns `{"status": "ok"}`
- Cron job shows "last run: success" status
- All 4 screenshots are committed and render correctly on the GitHub README
- The 90-second demo path from `full_context.md` Success Metrics section can be walked without touching the keyboard after the initial URL load
