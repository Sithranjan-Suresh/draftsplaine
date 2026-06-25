# Methodology

## 1. The Problem We're Solving

NFL teams traditionally judge draft picks using career reputation, Pro Bowl
selections, or static "draft value charts" built from historical trade
patterns -- not actual on-field production. DraftSpline instead asks: *did
this pick deliver value relative to what was reasonably expected from that
draft slot, during the only window a team fully controls the player's
economics -- the four-year rookie contract?*

## 2. What EPA Is

EPA stands for **Expected Points Added**. It's a play-by-play metric that
estimates how much a single play changed a team's expected scoring outcome
for that drive, based on down, distance, field position, and game state. A
quarterback who throws a touchdown on 3rd-and-long adds a lot of EPA; a
running back stopped for a loss on 1st-and-10 subtracts EPA. Summed across a
season, total EPA is a context-adjusted measure of how much a player's plays
actually helped (or hurt) their team score.

## 3. The Rookie Contract Window

Standard NFL rookie contracts run four years (with a possible fifth-year
option for first-round picks, which we exclude). DraftSpline sums each
player's EPA across **draft year through draft year + 3** -- the years a
team controls the player at a pre-market, below-veteran-market price. We
deliberately exclude career value beyond that window: a great Year 6 doesn't
retroactively make a pick a good *draft capital* decision if Years 1-4 were
replacement level.

To avoid unfairly penalizing injury-shortened seasons, any season with fewer
than 8 games played is scaled by `games_played / 17` before being summed
into the rookie total.

## 4. How the Expected EPA Curve Is Fit

For each of the four modeled positions (QB, RB, WR, TE), we take every
qualifying drafted player from 2012-2022, plot their rookie-contract EPA
against their overall pick number, and fit a smoothed curve using
**Nadaraya-Watson kernel regression** (a LOESS-style local smoother) followed
by **isotonic regression** to enforce that expected value never increases as
pick number gets worse. This produces one expected-EPA value per pick number,
per position, plus a 90% confidence band that **widens in later rounds**,
where we have fewer qualifying players per pick and the model is
extrapolating more.

We compare this data-driven curve against the **Stuart Chase draft value
chart**, a widely-cited update to the older Jimmy Johnson chart that NFL
front offices have historically used to value trade compensation. The Chase
chart is position-agnostic by design -- it assigns the same value to pick #10
regardless of whether it's a QB or a guard. That uniformity is itself one of
DraftSpline's central findings: real value is not position-agnostic.

## 5. How TDVS Is Calculated

```
TDVS = Rookie Contract EPA (adjusted) / Expected EPA at draft slot
```

A TDVS of 1.0 means a player delivered exactly what their slot predicted.
Above 1.0 is a steal; below 1.0 is an underperformer.

**A technical note on stabilization:** rushing offense has a well-documented
property in NFL analytics -- average EPA per rushing play is usually
*negative*, even for excellent running backs, because rushing is a lower
expected-value play type than passing in most game states. This means the
expected-EPA curve for RB (and occasionally other positions in sparse
late rounds) can be at or near zero. A literal ratio is unstable near zero,
so DraftSpline uses a formula that is mathematically identical to the literal
ratio whenever expected EPA is comfortably positive, and transitions smoothly
to a "value above expectation" form when expected EPA is small or negative.
This keeps the TDVS = 1.0 "met expectation" anchor consistent everywhere
without ever dividing by a near-zero number.

Players below the minimum qualifying-play threshold for their position are
excluded from TDVS ranking and shown as "insufficient data":

| Position | Minimum Rookie-Window Plays |
|---|---|
| QB | 150 dropbacks |
| RB | 150 carries + targets |
| WR | 75 targets |
| TE | 50 targets |

## 6. Known Limitations

- **OL is excluded entirely.** Offensive line value requires PFF-style
  blocking-grade data not available in the public nflverse dataset.
- **Defensive positions (DL, LB, CB, S) are not modeled in v1.** Defensive
  EPA exists in nflfastR but requires a different curve architecture (credit
  for a stop is distributed very differently than credit for a catch). This
  is explicitly scoped as a v2 feature.
- **Special teams (K, P, LS) are excluded** -- modeled separately in
  practice and not comparable to offensive skill-position EPA.
- **The 4-year rookie window is a simplification.** Some players hold out,
  get cut before Year 4, or get extended early. Games-played normalization
  partially compensates, but outlier player scores can still be affected.
- **Confidence intervals widen substantially in rounds 5-7.** This is honest
  signal about real sample-size limitations, not a smoothing failure --
  we show the band rather than hide it.
- **EPA does not capture all player value**, most notably blocking schemes,
  special-teams contribution, and leadership/intangibles.

## 7. Data Sources

- **nflverse / nflfastR** -- play-by-play data, 2012-2023, including EPA per
  play.
- **nfl_data_py** -- the Python client used to pull nflverse data
  (`import_pbp_data`, `import_draft_picks`, `import_seasonal_rosters`,
  `import_players`, `import_team_desc`).
- **Stuart Chase draft value chart** -- a static, publicly-cited chart used
  only as the traditional-value comparison baseline, not as an input to the
  TDVS model itself.

## Replacement-Level Table

Expected EPA at round-break picks, by position (from `draft_curve.parquet`):

| Position | Pick 1 | Pick 33 | Pick 65 | Pick 97 | Pick 129 | Pick 161 | Pick 193+ |
|---|---|---|---|---|---|---|---|
| QB | ~35 | ~5 | ~1 | ~0 | ~0 | ~0 | ~0 |
| RB | ~-25 | ~-25 | ~-25 | ~-26 | ~-27 | ~-28 | ~-29 |
| WR | ~69 | ~55 | ~40 | ~28 | ~18 | ~10 | ~4 |
| TE | ~45 | ~33 | ~22 | ~14 | ~8 | ~4 | ~1 |

(Exact values are served live from `/api/methodology` and `/api/curve`;
this table is illustrative of shape, not a frozen snapshot.)
