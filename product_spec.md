# DraftSpline — Product Specification

> This document assumes the reader has already read `full_context.md`. It does not repeat the project vision or core metric definitions; it specifies requirements for every feature at a level suitable for a professional software team to build and QA against.

Priority levels used throughout:
- **P0** — required for the demo to function at all. If incomplete, there is no project.
- **P1** — required for the project to be credible and complete, but the demo survives without it in a pinch.
- **P2** — stretch. Build only if P0 and P1 are done and stable with time remaining.

---

# Product Requirements

## Feature 1: TDVS Draft Board View

### Description
The primary view of the application. Displays all picks in a selected draft class as an interactive board with TDVS scores overlaid. The board can be toggled between two sort orders: original pick number (traditional view) and TDVS ranking (DraftSpline view). The animated transition between these two states is the central "wow" moment of the demo.

### User Story
As a user viewing the draft board, I want to toggle between traditional pick order and TDVS order so that I can immediately see how dramatically the rankings shift when measuring actual value produced — not draft position.

### Acceptance Criteria
- Draft class selector (minimum years: 2012–2022) is visible and functional on first load. Default to 2020.
- Board displays all picks in the selected class: pick number, round, team logo, player name, position badge, TDVS score, and a color indicator (steal / average / bust per the design system).
- Two sort modes: "Pick Order" (ascending pick number) and "TDVS Ranking" (descending TDVS). Toggle is a prominent button labeled clearly.
- Toggling sort order triggers a smooth animated reorder of all rows (CSS transition ≤ 300ms). Rows do not flash or jump.
- Players below the minimum snap threshold display a "Insufficient Data" badge and are sorted last in TDVS mode.
- Hovering over any player row opens a tooltip showing: pick number, round, team, position, rookie EPA total, expected EPA, and TDVS score in Space Mono font.
- Board is scrollable and handles 250+ rows without performance degradation.
- Changing the selected draft year refreshes all data without a full page reload.

### Edge Cases
- **Player with no EPA data at all** (e.g., drafted but never played due to injury): show as "No data — career ended before qualifying sample." Do not calculate or display a TDVS score. Sort to absolute bottom in TDVS mode.
- **Position not yet modeled (OL, K, defense)**: show a grayed row with position badge and a tooltip: "TDVS not yet modeled for this position." Do not leave blank.
- **Draft class before 2012**: block selection with a disabled state and tooltip: "TDVS analysis available for 2012 and later." Do not allow selection of out-of-scope years.
- **Very recent draft class where rookie contract hasn't completed** (e.g., 2022 class with only 2 seasons of data): display a banner warning: "Partial data — this class has [N] of 4 rookie seasons available. TDVS scores are preliminary and will change."
- **Multiple players at the same pick number** (very rare — administrative corrections to historical data): surface both and flag with a note "duplicate pick entry — data source ambiguity."

### Priority
**P0**

---

## Feature 2: Draft Value Curve Comparison

### Description
A visualization showing two curves side by side: (1) the traditional Stuart Chase / Jimmy Johnson draft value chart, and (2) DraftSpline's data-driven expected EPA curve. The DraftSpline curve is fit separately per position group. This visualization makes the argument that the *shape* of draft value has been systematically misunderstood.

### User Story
As a user, I want to see the traditional draft curve versus the DraftSpline EPA-based curve so that I can understand *structurally* why traditional draft charts produce bad capital allocation decisions.

### Acceptance Criteria
- Chart shows pick number (1–262) on the X axis. Y axis shows normalized value (both curves normalized to pick #1 = 1.0 for comparability).
- Traditional curve (Stuart Chase chart values, normalized) rendered as a smooth line in `--text-muted` color.
- DraftSpline EPA curve rendered as a solid line in `--accent` color with confidence interval band in `--accent-dim`.
- Position group selector (All / QB / Skill / Defense) updates the DraftSpline curve to the position-specific fit. The traditional curve does not change (it is position-agnostic by design — which is itself an insight).
- Hovering over any pick number on the chart displays a tooltip: pick number, traditional value, DraftSpline expected EPA, and the ratio (DraftSpline / traditional) — framed as "are early picks overvalued or undervalued by traditional charts?"
- Vertical lines at round boundaries (pick 32, 64, 96, 128, 160, 192) with round labels.
- Chart annotation highlighting the region of maximum divergence (typically rounds 2–3) with a callout: "Traditional charts most overvalue picks here."
- Chart is fully responsive and readable on a 1280px wide screen without horizontal scrolling.

### Edge Cases
- **Wide confidence intervals in rounds 5–7**: render the CI band but do not hide it. This is honest signal, not a bug.
- **Position groups with fewer than 50 qualifying players** (e.g., QB sample is smaller): display a note "Lower sample size — wider uncertainty bands expected" rather than suppressing or smoothing artificially.
- **Zero picks in a round for a position group**: do not render a data point. Interpolate or leave gap depending on position in the curve.

### Priority
**P0**

---

## Feature 3: Redraft Simulator

### Description
For a selected draft class and optionally a selected team, the simulator re-orders all picks according to TDVS rankings to show what an "optimal" draft would have looked like. Displays original vs. optimized picks side by side. Computes value delta per team: EPA gained or lost if they had drafted optimally.

### User Story
As a user, I want to see a specific draft class rebuilt using TDVS rankings so that I can understand exactly which teams left the most value on the table and which teams lucked into or skillfully identified undervalued picks.

### Acceptance Criteria
- Draft class selector (same as Feature 1). A "Rebuild Draft" button triggers the simulation.
- Simulation result shows a two-column view: original draft order (left) vs. optimized draft order (right). Each pick shows the team logo, player name, position, and TDVS score.
- Rows are visually linked: hovering the original pick 12 highlights the corresponding player in the optimized view, and vice versa.
- A per-team value delta table appears below the simulation. Columns: Team, Original EPA, Optimized EPA, Delta (EPA gained/lost), expressed in plain language as "+X.X EPA above expectation."
- Teams sorted by absolute value delta (biggest swing first).
- Simulation completes in under 3 seconds after clicking "Rebuild Draft."
- A "Reset to Original" button returns to the pre-simulation view.
- Simulation is deterministic: running it twice on the same class produces identical output.

### Edge Cases
- **Draft picks where the player is not TDVS-qualifying** (insufficient data): these picks are excluded from reordering logic. Their slots are filled by the next available TDVS-qualifying player in the queue. Document this exclusion visibly: "N picks excluded due to insufficient data."
- **Two teams with same original pick position** (compensatory picks in the same slot): handle both picks. Compensatory picks are listed as distinct rows.
- **Team with only one or zero qualifying picks** in the class: show their row in the delta table with a note "insufficient qualifying picks for this team" rather than a computed delta.
- **Large EPA swings that look implausible**: do not cap or clamp deltas. Present raw model output. The methodology panel explains that individual TDVS values carry uncertainty.

### Priority
**P0**

---

## Feature 4: AI Draft Analyst (Groq)

### Description
A conversational chat interface powered by Groq LLM. Users type natural-language questions about any draft class, player, team, or systemic trend. The backend converts the question to structured data queries, retrieves relevant TDVS and EPA data, and prompts Groq to return a plain-English analyst-style answer with data citations.

### User Story
As a user, I want to ask plain-English questions about draft history and receive expert-level, data-grounded answers so that DraftSpline functions as an intelligent analyst rather than a static dashboard.

### Acceptance Criteria
- Chat input is always visible when the Analyst tab is active. Submit on Enter or button click.
- Response appears within 5 seconds of submission (Groq latency is typically sub-second; backend data retrieval is the constraint).
- Every response includes at least one specific data point (player name, TDVS score, pick number, EPA figure). Responses must never be purely qualitative.
- Responses are capped at 150 words displayed. Longer responses are truncated with a "Show more" expander.
- The chat history persists within a session (does not clear between messages). Maximum 20 messages per session before a "Start new session" prompt appears.
- A loading indicator (typing animation) displays while the response is being generated.
- If Groq API call fails, show a graceful error: "Analyst temporarily unavailable. Try again." Do not show a raw error message or stack trace.
- If Groq is unavailable, fallback responses from `backend/analyst_fallback.json` are served for the 5 most likely demo questions. Fallback responses are flagged with a subtle "[cached]" badge.

### Suggested Pre-loaded Demo Questions
These must be tested and produce compelling responses before demo day:
- "Was the 2020 draft class good or bad overall?"
- "Who is the biggest draft steal since 2018?"
- "Was Patrick Mahomes actually the best value pick of the 2017 draft?"
- "Which team has been the best at drafting over the last 10 years?"
- "Why do teams keep overdrafting running backs?"

### Edge Cases
- **Question references a player not in the TDVS dataset** (e.g., pre-2012 draft, or defensive player with no TDVS): Groq should acknowledge the limitation honestly and provide what context it can. The system prompt must instruct Groq to say "I don't have TDVS data for this player" rather than inventing numbers.
- **Very long or compound question**: Groq should acknowledge all parts but may defer one sub-question if the response would exceed the word limit.
- **Offensive or off-topic question**: the system prompt must instruct Groq to redirect: "I'm focused on NFL draft analytics — let me know if you have a draft-related question."
- **Empty input**: disable submit button when input is blank. Do not send empty requests.
- **Rate limit hit on Groq API**: surface a visible warning "Rate limit reached — please wait a moment" and re-enable input after 10 seconds.

### Priority
**P0**

---

## Feature 5: Team GM Scorecard

### Description
A franchise-level view showing each NFL team's aggregate drafting efficiency across all modeled seasons (2012–2022). Rankings by mean TDVS, capital-weighted TDVS, and total EPA above/below expectation. Functions as a "report card" for every GM / front office over the period.

### User Story
As a user, I want to see how every NFL team has performed as a drafting organization across the last decade so that I can contextualize individual draft class results within a franchise's overall track record.

### Acceptance Criteria
- Displays all 32 teams in a sortable table. Default sort: capital-weighted TDVS descending (best drafters first).
- Columns: Team (logo + name), Seasons Evaluated, Mean TDVS, Capital-Weighted TDVS, Total EPA vs Expected, Rank.
- Clicking any team row navigates to that team's detailed GM view showing their full pick-by-pick history with individual TDVS scores.
- Rankings update if the user filters to a specific position group (e.g., "Show me teams ranked by QB drafting efficiency only").
- A "best draft class" callout per team: which year had their highest aggregate TDVS.
- A "worst draft class" callout per team: which year had their lowest aggregate TDVS.

### Edge Cases
- **Team relocated or rebranded during the modeled window** (e.g., Raiders moved from Oakland to Las Vegas): treat as a continuous franchise. Do not split into two entities. Note the name/location change in a tooltip.
- **Very small number of qualifying picks for a team** in a given position filter (e.g., filtering to QB and a team that drafted 0 QBs): show "insufficient qualifying picks for this filter" rather than displaying an unreliable mean.
- **Tie in rankings**: use total EPA vs. expected as tiebreaker. Document this in a tooltip.

### Priority
**P1**

---

## Feature 6: Individual Player Card

### Description
A detailed per-player view accessible by clicking any player on the draft board or in the redraft simulator. Shows the player's full TDVS context: pick details, rookie EPA by season, expected EPA at their slot, and a year-by-year EPA bar chart across their rookie contract window.

### User Story
As a user, I want to drill into any specific player's TDVS breakdown so that I can understand how their year-by-year production contributed to their overall score and whether early seasons or late seasons drove their value.

### Acceptance Criteria
- Accessible via click on any player row in the draft board or redraft simulator. Opens as a modal or side panel without navigating away from the main view.
- Displays: player name, headshot (if available via nflverse), position, team, draft year, pick number, round.
- Year-by-year EPA bar chart: one bar per season of the rookie contract window (up to 4 seasons). Bars colored by position (receiving EPA = one color, rush EPA = another if applicable). A horizontal dotted line at the "expected EPA per year" level derived from the curve model.
- Summary stats panel: Rookie EPA Total, Expected EPA Total, TDVS score, games played total, qualifying snap threshold met (yes/no).
- If the player's career ended early (injury, cut, retirement), clearly indicate how many seasons contributed to the TDVS score and note the career interruption.
- Positions not yet modeled in TDVS: show a clear "TDVS not available — position not yet modeled" message inside the card. Still show pick details.
- Close button and click-outside-modal to dismiss.

### Edge Cases
- **Player played multiple positions across the rookie window** (e.g., a WR used as a gadget QB): use their primary position as defined in the nflverse draft pick data. Note secondary usage in a tooltip.
- **Player with only one season of data** (cut after year 1): display the single bar with a note "only 1 of 4 rookie seasons contributed — TDVS score is preliminary and lower than it would be for a 4-year window."
- **Player headshot unavailable**: show a placeholder silhouette in the team's primary color. Never show a broken image tag.

### Priority
**P1**

---

## Feature 7: Methodology Panel

### Description
An accessible, non-default-visible panel explaining how TDVS is computed, what data sources are used, known limitations, and citations. Written for a non-technical judge who has never heard of EPA.

### User Story
As a skeptical judge or analyst, I want to understand exactly how TDVS is derived and what its limitations are so that I can evaluate whether the findings are statistically credible before accepting them as real insights.

### Acceptance Criteria
- Reachable via a "Methodology" link in the top navigation bar. Renders as a full page, not a modal.
- Explains the following in plain language, in this order: (1) what problem we're solving, (2) what EPA is, (3) how the rookie contract window is defined, (4) how the expected EPA curve is fit, (5) how TDVS is calculated, (6) what the known limitations are, (7) what data sources are cited.
- Must explicitly name: nflfastR, nfl_data_py, nflverse, the Stuart Chase draft chart (for comparison), and the LOESS/spline regression method used for the curve.
- Must explicitly state known limitations: OL excluded, defense v2, 4-year window assumption, games-played normalization method, and the fact that EPA does not capture all player value (most notably blocking and special teams).
- No unexplained acronyms — every abbreviation is defined on first use in the panel.
- Must include a replacement-level table showing expected EPA per pick number at round breaks (1, 33, 65, 97, 129, 161, 193+) for each position group.
- Navigation back to the main draft board via NavBar.

### Edge Cases
- N/A — this is a static-content feature. The only operational risk is that methodology content goes out of sync with actual computation logic. Treat this page's content as requiring an update whenever the pipeline computation changes.

### Priority
**P1**

---

## Feature 8: Draft Class Historical Comparison

### Description
Side-by-side comparison view for two draft classes. Shows TDVS distribution by class, position-level breakdown, and an aggregate "class quality score" for each year. Answers: "Was the 2020 class better than the 2017 class?"

### User Story
As a user, I want to compare two draft classes side by side so that I can evaluate which class produced more value relative to draft capital invested.

### Acceptance Criteria
- Two class selectors (left and right). Each defaults to a different year.
- TDVS distribution histogram for each class: X axis = TDVS bins, Y axis = number of players. Overlaid on the same chart for comparison.
- Summary metrics per class: mean TDVS, % of picks that outperformed slot (TDVS > 1.0), total class EPA above expectation.
- Position-group breakdown: for each position, which class produced more value per pick?

### Edge Cases
- **Same year selected for both**: allowed. Show identical histograms. Add a banner: "Same class selected — select different years to compare."
- **Unequal qualifying player counts between classes** (one class had more unmodeled positions): note the discrepancy in a tooltip rather than implying equal bases for comparison.

### Priority
**P2**

---

## Feature 9: Position Efficiency Trend View

### Description
A time-series view showing how position-level draft over/under-valuation has shifted across draft years. Answers: "Are teams still overdrafting RBs in 2021 the way they did in 2012?"

### User Story
As a user, I want to see how the NFL's drafting biases have evolved by position over time so that I can understand whether the league is learning from its historical mispricing.

### Acceptance Criteria
- Line chart: X axis = draft year, Y axis = mean TDVS for that position in that year. One line per position group (QB / RB / WR / TE).
- Hovering a year shows the mean TDVS for all four positions in that year and the specific draft class.
- Annotation: highlight any year where a specific position's mean TDVS diverges significantly from expected (e.g., "2014: RBs drafted at historically poor TDVS efficiency").

### Edge Cases
- **Years with very few qualifying players at a position**: render a dotted line segment to signal low sample size rather than a solid line implying high confidence.

### Priority
**P2**
