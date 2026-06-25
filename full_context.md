# DraftSpline — Full Project Context
*Read this entire file before writing a single line of code. Every architectural and design decision references definitions made here.*

---

## Project Vision

**DraftSpline** is an NFL draft analytics and simulation platform that reframes the NFL draft as a **capital allocation problem**, not a talent-guessing game.

It answers one question that NFL front offices consistently get wrong:

> *"Was this pick actually worth it — measured against what it cost and what it delivered during the only contract window that matters: the rookie deal?"*

The project is built to win a sports analytics hackathon judged on three criteria: analytical insight, practical application, and data presentation. Every decision — methodological, architectural, visual — is optimized for those three criteria simultaneously.

---

## The One-Sentence Pitch

**"DraftSpline is an NFL draft intelligence system that reconstructs draft value using rookie-contract EPA to measure true return on draft capital and simulate optimal draft decisions."**

---

## Problem

### What's Wrong With How Drafts Are Currently Evaluated

**The traditional model:** Teams use draft value charts (most famously the "Jimmy Johnson chart") to trade picks. Media and front offices judge picks based on career trajectory, Pro Bowl selections, or general reputation.

**Why this is wrong:**
- Career value ignores the cost structure of rookie contracts. A player's fifth year matters far less than years 1–4, because that's when teams are paying pre-market rates.
- Traditional draft charts are exponentially smoothed curves fit to historical trade patterns — not actual on-field production data.
- Position value is conflated with player value. An average QB drafted at #1 and an elite WR drafted at #25 produce radically different returns on draft capital, even if career reputations favor the QB.
- "Draft success" is measured by Pro Bowl appearances or starter status — not by expected-vs-actual EPA during the contract window a team actually controlled.

**The actual problem:** NFL teams routinely overpay in draft capital for picks that underdeliver relative to their slot expectation, because they're optimizing for a wrong metric.

---

## Users

**Primary users (hackathon context):** Judges who are sports analytics professionals at AQX Analytics. They understand EPA and draft value. They want to see statistical rigor, practical insight, and compelling visualization.

**Secondary users (product context):**
- NFL front office analysts evaluating draft capital allocation
- Sports journalists writing about draft efficiency and team-building philosophy
- Fantasy football enthusiasts wanting a data-driven view of historical drafts
- General NFL fans interested in understanding why teams succeed or fail in the draft

---

## User Journey

### Judge / Demo Viewer Experience (90-second demo path)

1. **Arrive at Draft Board View** — see TDVS scores replacing traditional draft rankings. Cognitive dissonance: the #1 pick is not the #1 value.
2. **View Draft Curve Comparison** — old vs. new EPA-based curve. Understand *why* traditional charts fail.
3. **Interact with Redraft Simulator** — select a draft class (e.g., 2020). Watch the draft get algorithmically reordered. See value gained/lost by team.
4. **Ask the AI Draft Analyst a question** — plain-English Q&A about draft steals, busts, or class-level assessments.
5. **Leave with a systemic insight** — NFL teams consistently leave measurable rookie-contract value on the table.

### Analyst Experience (full product)

1. Select draft year → explore TDVS board
2. Filter by position or team
3. Drill into individual player cards with EPA breakdown
4. Run counterfactual simulator for any team
5. Query AI analyst for narrative context

---

## Features

### Core Features (P0 — required for demo)

**1. TDVS Draft Board**
Interactive draft board showing all picks in a given class with TDVS scores overlaid. Color-coded over/under value vs. expected at that slot. Sortable by TDVS, pick number, position.

**2. Draft Value Curve Comparison**
Side-by-side visualization: traditional Jimmy Johnson chart curve vs. DraftSpline's data-driven EPA-based expected value curve. Interactive hover by pick number.

**3. Redraft Simulator**
For any historical draft class, re-orders picks according to TDVS ranking. Shows original vs. optimized order. Computes value delta per team.

**4. AI Draft Analyst (Groq)**
Conversational interface. Users ask natural-language questions. Groq LLM converts to structured queries against the dataset and returns plain-English explanations. Functions like a GM-level analyst.

### Supporting Features (P1 — required for credibility)

**5. Team GM Scorecards**
Franchise-level drafting efficiency scores across all modeled seasons. Rankings by draft EPA efficiency.

**6. Individual Player Cards**
Per-player view: pick number, draft slot expected EPA, actual rookie EPA, TDVS score, position-adjusted metrics, snap share context.

**7. Methodology Panel**
Plain-language explanation of TDVS, the EPA curve model, and data sources. Must be reachable in one click from the main view.

### Stretch Features (P2 — if time permits)

**8. Historical Class Comparisons**
Side-by-side of two draft classes by TDVS distribution.

**9. Position Efficiency Trends**
How positional over/under-valuation has shifted across draft eras (pre/post 2011 CBA, pre/post pass-rule emphasis).

---

## Core Differentiators

**1. Contract-window scoping.** All EPA is filtered to Years 1–4 of a player's rookie contract. This is not career value — it's value during the period when draft capital has economic leverage.

**2. Slot-relative scoring.** TDVS is not raw EPA — it is EPA relative to what was historically expected from that slot. A good player at #1 who underperforms a historically elite slot is still a bad value pick.

**3. Position-adjusted curves.** The expected value curve is not a single exponential — it is fit separately by position group and draft era to account for rule changes and positional value shifts.

**4. Counterfactual simulation.** DraftSpline does not just describe history — it reconstructs it. The Redraft Simulator shows what *should have happened* if teams had optimized for TDVS.

**5. AI analyst layer.** The Groq integration transforms raw analytics into conversational insights. This is not a dashboard — it is a decision intelligence interface.

---

## Core Metric: TDVS (True Draft Value Score)

Every player is scored using:

```
TDVS = Rookie Contract EPA (adjusted) / Expected EPA at draft slot
```

A TDVS > 1.0 means the player outperformed their slot. A TDVS < 1.0 means they underperformed. A TDVS of 2.0 means they delivered twice the expected value — a steal.

### Step A — Rookie Contract EPA

For each drafted player, compute total EPA accumulated across all plays during their rookie contract window (Years 1–4 from draft year).

- QBs: dropback EPA (pass EPA + scramble EPA)
- RBs: rush EPA + receiving EPA
- WRs: receiving EPA
- TEs: receiving EPA

Apply adjustments for:
- Snap share (normalize for players with limited opportunity)
- Team offensive environment (opponent-adjusted EPA where available)
- Injury-discounted seasons (scale by games played / 17)

### Step B — Expected Draft Curve Model

Build a regression model over historical drafted players (2012–2022 window where complete rookie contracts are available):

- Dependent variable: total rookie-contract EPA
- Independent variable: draft pick number
- Fit separate curves per position group: QB, RB, WR, TE, DL, DB, LB, OL (OL v2)
- Smoothing method: LOESS or spline regression
- Era control: include a dummy for pre/post-2013 (rule changes affecting pass-game EPA)

Output: one expected EPA value per pick number per position group.

### Step C — TDVS Computation

```
TDVS_player = rookie_epa_adjusted / expected_epa[pick_number][position]
```

Players with fewer than the minimum snap threshold for their position are excluded from TDVS ranking (listed as "insufficient data"). Thresholds defined per position in the Engineering Spec.

### Step D — Team Draft Efficiency Score

Aggregate TDVS across all picks made by a franchise in a given season or across seasons:

```
Team Draft Efficiency = mean(TDVS) across all picks with qualifying data
```

Weight by draft capital spent (early picks weighted more heavily because they cost more in terms of pick trading value).

---

## Data Sources

### Primary Dataset: nflverse / nflfastR

**`nflfastR` play-by-play data (2012–2023):**
- Columns used: `passer_player_id`, `rusher_player_id`, `receiver_player_id`, `epa`, `play_type`, `qb_dropback`, `posteam`, `season`, `week`, `receiver_position`, `pass_location`, `air_yards`, `yards_after_catch`
- Pull via `nfl_data_py`: `nfl.import_pbp_data(years=range(2012, 2024))`

**`nflverse` draft picks data:**
- Pull via `nfl_data_py`: `nfl.import_draft_picks(years=range(2012, 2024))`
- Columns used: `season`, `round`, `pick`, `team`, `player_name`, `position`, `pfr_player_id`, `gsis_id`

**`nflverse` rosters:**
- Pull via `nfl_data_py`: `nfl.import_seasonal_rosters(years=range(2012, 2024))`
- Used to link player IDs and confirm rookie year assignments

**`nflverse` player data:**
- Pull via `nfl_data_py`: `nfl.import_players()`
- Columns used: `gsis_id`, `display_name`, `position`, `entry_year` (for rookie year confirmation)

### Draft Pick Trade Value (baseline comparison only)
- The Stuart Chase draft value chart (open source, widely cited as update to Jimmy Johnson chart)
- Stored as a static CSV in `backend/pipeline/data/chase_draft_chart.csv`

---

## Parquet Schema (single source of truth)

### `draft_picks_raw_{SEASON}.parquet` (one per year, 2012–2023)
| Column | Type | Description |
|---|---|---|
| `season` | int | Draft year |
| `round` | int | Draft round |
| `pick` | int | Overall pick number |
| `team` | str | Drafting team abbreviation |
| `player_name` | str | Full player name |
| `position` | str | Position code (QB/RB/WR/TE/etc.) |
| `gsis_id` | str | nflverse player ID |

### `player_epa_by_season.parquet`
| Column | Type | Description |
|---|---|---|
| `gsis_id` | str | nflverse player ID |
| `season` | int | NFL season year |
| `position` | str | Position code |
| `plays` | int | Qualifying plays/dropbacks/targets |
| `total_epa` | float | Total EPA for season |
| `epa_per_play` | float | EPA per qualifying play |
| `games_played` | int | Games played in season |

### `tdvs_scores.parquet` (pipeline final output)
| Column | Type | Description |
|---|---|---|
| `gsis_id` | str | nflverse player ID |
| `player_name` | str | Display name |
| `position` | str | Position code |
| `draft_year` | int | Year drafted |
| `pick` | int | Overall pick number |
| `round` | int | Draft round |
| `team` | str | Drafting team |
| `rookie_epa_total` | float | Adjusted total EPA, years 1–4 |
| `expected_epa` | float | Model-predicted EPA for that slot |
| `tdvs` | float | rookie_epa_total / expected_epa |
| `games_played_total` | int | Games played across rookie contract |
| `qualifying` | bool | Met minimum snap threshold |

### `draft_curve.parquet`
| Column | Type | Description |
|---|---|---|
| `pick` | int | Overall pick number (1–262) |
| `position_group` | str | QB/skill/defense/oline |
| `expected_epa` | float | Smoothed expected EPA |
| `ci_lower` | float | 90% confidence interval lower bound |
| `ci_upper` | float | 90% confidence interval upper bound |

### `team_draft_scores.parquet`
| Column | Type | Description |
|---|---|---|
| `team` | str | Team abbreviation |
| `season` | int | Draft year |
| `picks_qualifying` | int | Number of picks with sufficient data |
| `mean_tdvs` | float | Mean TDVS across qualifying picks |
| `weighted_tdvs` | float | Capital-weighted mean TDVS |
| `epa_vs_expected` | float | Total EPA above/below expected |

---

## API Contract

All responses include `data_as_of: "YYYY-MM-DD"` field.

### `GET /api/draft/{year}`
Returns all picks in a draft class with TDVS scores.
```json
{
  "year": 2020,
  "picks": [
    {
      "pick": 1,
      "round": 1,
      "player_name": "Joe Burrow",
      "position": "QB",
      "team": "CIN",
      "tdvs": 1.84,
      "rookie_epa_total": 42.3,
      "expected_epa": 23.0,
      "qualifying": true
    }
  ],
  "data_as_of": "2024-09-01"
}
```

### `GET /api/curve`
Returns the draft value curve data for all positions.
```json
{
  "curve": [
    {
      "pick": 1,
      "position_group": "QB",
      "expected_epa": 25.1,
      "ci_lower": 10.2,
      "ci_upper": 48.9
    }
  ],
  "comparison_chart": {
    "chase_chart": [...],
    "draftspline_curve": [...]
  }
}
```

### `GET /api/teams`
Returns all team GM scorecards.
```json
{
  "teams": [
    {
      "team": "KC",
      "team_name": "Kansas City Chiefs",
      "seasons_evaluated": [2012, 2013, ..., 2022],
      "mean_tdvs": 1.12,
      "weighted_tdvs": 1.08,
      "rank": 4
    }
  ]
}
```

### `GET /api/team/{abbr}`
Returns a single team's GM scorecard with per-pick breakdown.

### `GET /api/player/{gsis_id}`
Returns full player card with per-season EPA breakdown.

### `GET /api/redraft/{year}/{team}`
Returns optimized draft order for a specific team in a given year.
```json
{
  "year": 2020,
  "team": "CIN",
  "original_picks": [...],
  "optimized_picks": [...],
  "value_delta": 18.4,
  "epa_gained": 18.4,
  "epa_lost": 0.0
}
```

### `POST /api/analyst`
Groq AI analyst endpoint.
```json
// Request
{ "question": "Was the 2020 draft class good or bad overall?" }

// Response
{
  "answer": "The 2020 class was above average overall, driven primarily by...",
  "data_points": [
    { "player": "Justin Jefferson", "tdvs": 3.2, "pick": 22 }
  ]
}
```

### `GET /api/methodology`
Returns plain-language methodology content for the panel.

### `GET /health`
Returns `{"status": "ok"}`.

---

## Visual Design System

### Color Tokens
```css
--bg-base:        #0A0D1A    (deep navy — main background)
--bg-surface:     #111425    (card/panel backgrounds)
--bg-elevated:    #1A1F35    (hover states, selected states)
--bg-border:      #232840    (card borders, dividers)

--accent:         #00D4FF    (primary interactive — pick highlight, links)
--accent-dim:     rgba(0, 212, 255, 0.10)
--accent-border:  rgba(0, 212, 255, 0.30)

--steal:          #00E5A0    (TDVS > 1.2 — green for value picks)
--steal-dim:      rgba(0, 229, 160, 0.10)

--bust:           #FF3B5C    (TDVS < 0.5 — red for busts)
--bust-dim:       rgba(255, 59, 92, 0.10)

--neutral:        #F5A623    (TDVS 0.5–1.2 — amber for average)
--neutral-dim:    rgba(245, 166, 35, 0.10)

--text-primary:   #EEF2FF
--text-muted:     #5A6480
--text-faint:     #2A3050

--nfl-gold:       #D4AF37   (used only for championship/award contexts)
```

### Typography
```
Display / Headlines:  Space Grotesk — weights 500, 700
Body / Labels:        Inter — weights 400, 500
Stat Numbers / EPA:   Space Mono — weight 400
```

All three loaded from Google Fonts in `index.html`.

### TDVS Color Rules (applied consistently across all views)
| TDVS Range | Color | Label |
|---|---|---|
| ≥ 2.0 | `--steal` + gold star | Elite steal |
| 1.2–1.99 | `--steal` | Steal |
| 0.8–1.19 | `--neutral` | Expected |
| 0.5–0.79 | `--bust` dim | Underperformer |
| < 0.5 | `--bust` | Bust |
| Not qualifying | `--text-muted` | Insufficient data |

### Signature Visual
The **TDVS Ranking Flip** — the moment where the original pick order (sorted by pick number) is toggled against the TDVS ranking (sorted by value) — is the primary emotional beat of the demo. This toggle animation should be smooth, fast (under 300ms transition), and visually dramatic. Player rows reorder; color bands appear. This is the "wow" moment.

### Chart Conventions
- All chart backgrounds: transparent
- Card wrappers: `--bg-surface`, `1px solid --bg-border`, `border-radius: 12px`
- Grid lines: `--bg-border` at 40% opacity
- Tooltips: `--bg-surface` background, `--accent` left border, `--text-primary` text, `Space Mono` for numbers
- Axis labels: `--text-muted`, `Inter`, 11px
- Positive TDVS bars: `--steal`
- Negative/low TDVS bars: `--bust`
- Expected EPA line: `--accent` dashed
- Confidence interval band: `--accent-dim`

---

## Demo Flow

### 1. Hook — The Ranking Flip (0:00–0:15)
Open on the 2020 draft board sorted by pick number. Toggle to TDVS ranking. Rankings flip. The #1 pick is no longer #1 value.

**One-line punch:** "The NFL draft doesn't reward the best picks — it rewards mispriced ones."

### 2. Draft Curve Revelation (0:15–0:35)
Show old Jimmy Johnson / Stuart Chase curve vs. DraftSpline EPA-based curve. Highlight: exponential decay is not uniform across positions. Mid-rounds are systematically undervalued.

### 3. Redraft Simulator (0:35–1:00)
Select 2020 draft → click "Rebuild Draft" → system shows optimized order. Value delta per team appears. CIN gained X EPA. Team Y lost Y EPA.

### 4. AI Analyst Live Q&A (1:00–1:20)
Ask: "Was this draft class good or bad overall?" Groq answers in plain English. Names biggest steal and biggest bust. Feels like a GM advisor.

### 5. Final Systemic Insight (1:20–1:30)
"Across 10 years of NFL drafts, teams consistently overvalue early picks — and leave billions of rookie-contract value unexploited."

Fade to DraftSpline logo.

---

## Success Metrics

The project is complete when all of the following are true:

1. The deployed URL loads the 2020 Draft Board with TDVS scores in under 2 seconds
2. Toggling between pick-number order and TDVS order animates cleanly
3. The draft curve comparison chart shows both curves simultaneously with interactive hover
4. Selecting any draft year (2012–2022) and clicking "Rebuild Draft" returns an optimized order in under 3 seconds
5. The AI analyst responds to any free-text question with a coherent, data-grounded answer in under 5 seconds
6. The methodology panel, reachable in one click, cites sources and explains TDVS in plain English
7. `/health` returns `{"status": "ok"}`
8. The full demo path — URL load → ranking flip → curve reveal → redraft 2020 → AI question → answer — completes in 90 seconds without keyboard input after load

---

## Positions Covered in TDVS Model

| Code | Label | EPA Source | Minimum Rookie Plays |
|---|---|---|---|
| `QB` | Quarterback | Dropback EPA (pass + scramble) | 150 dropbacks across 4 years |
| `RB` | Running Back | Rush EPA + receiving EPA | 150 carries + targets |
| `WR` | Wide Receiver | Receiving EPA | 75 targets |
| `TE` | Tight End | Receiving EPA | 50 targets |

Positions with limited EPA modeling in v1 (displayed as "not yet modeled" on player cards):
- `OL` — blocking value requires PFF-style charting data not available in nflverse
- `K`, `P`, `LS` — special teams EPA is modeled separately and excluded from draft curve
- `DL`, `LB`, `CB`, `S` — defensive EPA via nflfastR is available but requires different curve modeling; mark as v2

---

## Naming Conventions

- `team`: always the standard nflverse 2–3 character abbreviation (e.g., `"KC"`, `"SF"`, `"CIN"`). Use `nfl.import_team_desc()` to normalize. Never use full team name as a join key.
- `gsis_id`: always the nflverse GSIS-style player ID. This is the primary join key between all parquets and all EPA/roster/draft data.
- `position`: always one of the covered position codes. No sub-positions in v1.
- `season` / `draft_year`: integer year (e.g., `2020` means the 2020 NFL Draft / 2020 season). Be explicit about which context you're in at every join.
- All floats: `tdvs` rounded to 2 decimal places; `epa_per_play` rounded to 4 decimal places; `total_epa` rounded to 1 decimal place; `expected_epa` rounded to 1 decimal place.
- Pipeline scripts numbered `01` through `05` and run strictly in order. Each script reads only from the prior script's output. Scripts never reach back to earlier raw data.

---

## What Not to Build

- ❌ Career value analysis — v1 scopes strictly to the 4-year rookie contract window
- ❌ Scouting or physical attribute modeling — this is production analytics, not prospect evaluation
- ❌ Live/in-season data — all analysis uses completed seasons (2012–2022 where complete 4-year windows exist)
- ❌ Defensive player TDVS in v1 — defensive EPA modeling requires a separate architecture; placeholder cards only
- ❌ OL TDVS in v1 — blocking value requires tracking data; exclude entirely
- ❌ User accounts or saved analyses
- ❌ `create-react-app` — use Vite
- ❌ `axios` — use native `fetch` wrapped in `lib/api.js`
- ❌ Additional chart libraries beyond Recharts
- ❌ A traditional relational database — parquet IS the database

---

## Future Expansion (v2+)

- Defensive position TDVS using nflfastR defensive EPA
- OL TDVS using PFF-grade data if available
- Trade value simulator: "Was this pick trade fair given TDVS expectations?"
- Draft pick acquisition efficiency: did the team get the picks it needed for its roster construction strategy?
- Prospect-level expected TDVS based on college production models
- Real-time current draft class projection (for ongoing drafts)
- Multi-team redraft leagues (fantasy-style redraft using TDVS)

---

## Pre-Verified Demo Draft Classes

Before demo day, the following draft classes must be run through the full pipeline and their outputs manually verified:

| Year | Why This Class |
|---|---|
| 2020 | Burrow, Herbert, Lamb, Jefferson — memorable names, clear steals at 22/23; known hits and misses |
| 2018 | Baker Mayfield, Lamar Jackson at 32 — textbook early bust vs. late steal story |
| 2021 | Trevor Lawrence vs. Mac Jones narrative; strong class with clear TDVS spread |
| 2017 | Mahomes at 10 — the definitive draft steal story; judges will know this one |

For each pre-verified class, know: the top 3 TDVS steals, top 3 TDVS busts, and the team with the best/worst aggregate class efficiency. Do not trust live computation during the demo for these classes.

---

## Honest Remaining Risk

- The rookie contract EPA window assumption (4 years) is a simplification. Some players hold out, some are cut before year 4, some are extended mid-rookie-deal. These edge cases are handled by using games-played normalization, but they affect outlier player scores. Document this limitation in the methodology panel.
- Defensive TDVS is excluded in v1. If a judge asks about edge rushers or CBs, the correct answer is: "Defensive EPA modeling requires a different curve architecture — we scoped v1 to skill positions and QB where EPA/play is the cleanest signal."
- The Groq AI analyst layer depends on Groq API availability. If Groq is unavailable during the demo, have a hardcoded fallback for the 5 most likely demo questions stored in `backend/analyst_fallback.json`.
- LOESS/spline fitting on a relatively small dataset (10 seasons × ~250 picks × 4 positions = ~10,000 player-seasons) produces confidence intervals that are wide in rounds 5–7. This is honest, not a flaw — show the CI band and call it out.
