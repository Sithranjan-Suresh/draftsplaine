"""One-off script to generate a submission PDF for DraftSpline. Not part of the app."""

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

INK = colors.HexColor("#1C1E1B")
MUTED = colors.HexColor("#6B6A5E")
ACCENT = colors.HexColor("#2B4570")
HIGHLIGHT = colors.HexColor("#C8902C")
BUST = colors.HexColor("#A8362A")
BORDER = colors.HexColor("#C9C5B4")
BG = colors.HexColor("#FAF8F0")

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "TitleX", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=34, leading=40,
    textColor=INK, alignment=TA_CENTER, spaceAfter=10,
)
subtitle_style = ParagraphStyle(
    "SubtitleX", parent=styles["Normal"], fontName="Helvetica", fontSize=13, leading=18,
    textColor=MUTED, alignment=TA_CENTER, spaceAfter=2,
)
eyebrow_style = ParagraphStyle(
    "EyebrowX", parent=styles["Normal"], fontName="Courier-Bold", fontSize=9,
    textColor=MUTED, alignment=TA_CENTER, spaceAfter=18, leading=12,
)
h1_style = ParagraphStyle(
    "H1X", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19,
    textColor=INK, spaceBefore=22, spaceAfter=10,
)
h2_style = ParagraphStyle(
    "H2X", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=14,
    textColor=ACCENT, spaceBefore=16, spaceAfter=8,
)
h3_style = ParagraphStyle(
    "H3X", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=11.5,
    textColor=INK, spaceBefore=10, spaceAfter=6,
)
body_style = ParagraphStyle(
    "BodyX", parent=styles["Normal"], fontName="Helvetica", fontSize=10,
    textColor=INK, leading=15, spaceAfter=8, alignment=TA_LEFT,
)
bullet_style = ParagraphStyle(
    "BulletX", parent=body_style, leftIndent=16, bulletIndent=4, spaceAfter=6,
)
mono_style = ParagraphStyle(
    "MonoX", parent=styles["Normal"], fontName="Courier", fontSize=9,
    textColor=INK, leading=13, backColor=BG, borderColor=BORDER,
    borderWidth=0.5, borderPadding=8, spaceAfter=10,
)
caption_style = ParagraphStyle(
    "CaptionX", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=8.5,
    textColor=MUTED, spaceAfter=10,
)
stamp_style = ParagraphStyle(
    "StampX", parent=styles["Normal"], fontName="Courier-Bold", fontSize=9,
    textColor=BUST, spaceAfter=10,
)

def hr():
    return HRFlowable(width="100%", thickness=0.75, color=BORDER, spaceBefore=4, spaceAfter=14)

def table_from_rows(rows, col_widths=None, header=True):
    t = Table(rows, colWidths=col_widths, hAlign="LEFT")
    style = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]
    if header:
        style += [
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BACKGROUND", (0, 0), (-1, 0), BG),
        ]
    t.setStyle(TableStyle(style))
    return t

story = []

# ---- Cover page ----
hero_number_style = ParagraphStyle(
    "HeroNumber", fontName="Helvetica-Bold", fontSize=40, leading=46,
    textColor=HIGHLIGHT, alignment=TA_CENTER, spaceAfter=8,
)
hero_stamp_style = ParagraphStyle(
    "HeroStamp", fontName="Courier-Bold", fontSize=9, leading=14,
    textColor=BUST, alignment=TA_CENTER, spaceAfter=12,
)
hero_caption_style = ParagraphStyle(
    "HeroCaption", parent=body_style, alignment=TA_CENTER, textColor=MUTED, fontSize=10, leading=15,
)
foot_style = ParagraphStyle(
    "Foot", fontName="Courier", fontSize=9, leading=13, textColor=MUTED, alignment=TA_CENTER,
)

story.append(Spacer(1, 1.4 * inch))
story.append(Paragraph("CASE FILE NO. 2022-262 &mdash; OPENED FOR REVIEW", eyebrow_style))
story.append(Paragraph('DRAFT<font color="#2B4570">SPLINE</font>', title_style))
story.append(Spacer(1, 4))
story.append(Paragraph(
    "Every NFL draft pick since 2012, graded against what its slot actually produces &mdash; "
    "not what a decades-old chart says it should.", subtitle_style
))
story.append(Spacer(1, 0.45 * inch))
story.append(hr())
story.append(Spacer(1, 8))
story.append(Paragraph("24.48&times;", hero_number_style))
story.append(Paragraph("[ OUTLIER &mdash; UNADJUSTED ]", hero_stamp_style))
story.append(Paragraph(
    "Brock Purdy &mdash; pick #262, 2022 &mdash; produced 24.48&times; his slot's historical expected value. "
    "The largest True Draft Value Score in the dataset, bigger than any first-round pick ever recorded.",
    hero_caption_style,
))
story.append(Spacer(1, 8))
story.append(hr())
story.append(Spacer(1, 0.5 * inch))
story.append(Paragraph(
    "Submission document &middot; full project writeup, methodology, and technical reference",
    foot_style,
))
story.append(PageBreak())

# ---- Hackathon writeup ----
story.append(Paragraph("Project Submission", h1_style))

story.append(Paragraph("Project name", h3_style))
story.append(Paragraph("DraftSpline", body_style))

story.append(Paragraph("Elevator pitch", h3_style))
story.append(Paragraph(
    "DraftSpline grades every NFL draft pick since 2012 against what its slot actually produced in real "
    "on-field value, not what a decades-old draft chart says it should be worth, then uses that same model "
    "to project the 2026 class and lets you ask an AI analyst to explain any pick, team, or trend in plain English.",
    body_style,
))

story.append(Paragraph("Tagline options", h3_style))
for t in [
    "The draft chart gets a performance review.",
    "Stop trusting a chart from 1960. Trust the tape.",
    "Every pick, graded on what actually happened.",
    "Draft value, recalculated from real production.",
    "The scouting report your gut feeling never had.",
]:
    story.append(Paragraph(f"&bull; {t}", bullet_style))

story.append(Paragraph("Inspiration", h2_style))
story.append(Paragraph(
    "Every draft analyst leans on the same traditional draft value chart, a static table built decades ago "
    "that says pick 1 is worth roughly 33 times as much as pick 256. It has never been updated with real "
    "outcomes. We wanted to know what happens if you throw that out and instead ask the data directly: given "
    "everything we know about every drafted quarterback, running back, receiver, and tight end since 2012, "
    "what does a given pick actually tend to produce? That question became TDVS, our True Draft Value Score, "
    "and the rest of the app grew around it.",
    body_style,
))

story.append(Paragraph("What it does", h2_style))
story.append(Paragraph(
    "DraftSpline pulls play-by-play and draft data from nflverse, computes rookie-contract-era EPA (Expected "
    "Points Added) for every modeled position, and fits a data-driven expected-value curve per draft slot. "
    "Every pick gets a TDVS score: actual production divided by what that slot has historically produced. "
    "From there:",
    body_style,
))
for b in [
    "The Draft Board shows every class from 2012 to 2025 with TDVS, bust rates, and searchable filters.",
    "The Curve Comparison page overlays our EPA curve against the traditional chart with a labeled confidence "
    "band, so you can see exactly where conventional wisdom and real outcomes diverge.",
    "The Redraft Simulator reorders any complete draft class by actual value produced, with team-by-team deltas.",
    "The GM Scorecard ranks all 32 franchises by drafting efficiency.",
    "The 2026 Draft Preview joins this year's incoming class to the same curve to project expected value before "
    "a single rookie snap is played.",
    "The AI Analyst answers natural-language questions about steals, busts, and team trends, grounded entirely "
    "in our own dataset so it cannot fabricate players or stats.",
]:
    story.append(Paragraph(f"&bull; {b}", bullet_style))

story.append(Paragraph("How we built it", h2_style))
story.append(Paragraph(
    "The backend is a Python and FastAPI service backed by a five-stage data pipeline: pull raw nflverse data, "
    "compute EPA per player per season, calculate TDVS scores with statistical stabilization for near-zero "
    "denominators, fit the expected-value curve using kernel smoothing and isotonic regression, then roll "
    "everything up into team-level scores. Results are written to parquet files and served from an in-memory "
    "store. The frontend is React with Vite, using Recharts for all data visualization, with a custom design "
    "system styled around a scouting-room aesthetic rather than a generic dashboard look. The AI Analyst is "
    "powered by Groq's LLM API, with every response grounded in a JSON context block built from real computed "
    "statistics rather than free generation.",
    body_style,
))

story.append(Paragraph("Challenges we ran into", h2_style))
story.append(Paragraph(
    "Running back EPA baselines sit close to zero, which made TDVS blow up toward infinity for some players "
    "when the denominator approached zero. We fixed this with a continuous stabilization formula instead of an "
    "arbitrary clamp. Our first curve-fitting attempt using a spline produced wildly unrealistic values at "
    "certain picks, which we replaced with kernel smoothing plus isotonic regression to guarantee a sane, "
    "monotonic curve. We also had to be careful that incomplete recent draft classes, like 2023 through 2025, "
    "did not get judged the same way as classes with a full four-year rookie window, since that was both "
    "statistically misleading and an easy way for the AI Analyst to say something indefensible.",
    body_style,
))

story.append(Paragraph("Accomplishments that we're proud of", h2_style))
story.append(Paragraph(
    "The single number that anchors the whole project, Brock Purdy's TDVS of 24.48 as a pick-262 quarterback, "
    "is both the most attention-grabbing stat in the app and the one we worked hardest to caveat honestly on "
    "screen, rather than just bury in a methodology page. We are also proud that the AI Analyst is fully "
    "grounded: it cannot invent players or numbers, because every claim it makes has to trace back to a real "
    "computed statistic in our dataset.",
    body_style,
))

story.append(Paragraph("What we learned", h2_style))
story.append(Paragraph(
    "We learned how much nuance lives inside a metric that looks simple from the outside. Actual versus "
    "expected sounds straightforward until you have to decide what counts as a qualifying season, how to "
    "handle a position whose baseline production hovers near zero, and how to talk about an outlier result "
    "without either hiding it or overselling it.",
    body_style,
))

story.append(Paragraph("What's next for DraftSpline", h2_style))
story.append(Paragraph(
    "Extending TDVS to defensive positions and offensive line, adding trade-chart data so the 2026 preview can "
    "reflect actual draft-day trades instead of just original slot value, and building year-over-year tracking "
    "so a front office could watch its drafting efficiency trend over multiple seasons.",
    body_style,
))

story.append(Paragraph("Built with", h2_style))
story.append(Paragraph(
    "Python, FastAPI, pandas, pyarrow, scikit-learn, nfl_data_py, Groq API, React, Vite, React Router, "
    "Recharts, JavaScript, HTML, CSS, Render, Vercel, GitHub.",
    body_style,
))

story.append(PageBreak())

# ---- The Finding ----
story.append(Paragraph("The Finding", h1_style))
story.append(Paragraph(
    "Using EPA from nflverse across 14 draft classes (2012-2025), DraftSpline finds:",
    body_style,
))
findings = [
    "The 7th-round pick #262 in 2022 &mdash; Brock Purdy, \"Mr. Irrelevant\" &mdash; produced 24.48&times; his "
    "slot's expected value. That's the single largest TDVS in the dataset, larger than every first-round pick "
    "in any class modeled. We lead with this number and immediately flag why it's contestable: TDVS doesn't "
    "adjust for offensive line quality, receiving talent, or scheme, and Purdy's score is in part a stress-test "
    "of that blind spot.",
    "Quarterback has the highest bust rate of any modeled position: 55.2% of qualifying QB picks miss their "
    "slot's expectation (TDVS &lt; 0.5), vs. 43.1% for RB, 39.9% for WR, and 35.6% for TE &mdash; measured on "
    "the 2012-2022 subset where every player has a complete 4-year rookie window, so the comparison is "
    "apples-to-apples.",
    "The New York Jets have drafted &minus;1,096.9 EPA below expectation since 2012 &mdash; the worst "
    "accumulated drafting record of any of the 32 franchises, while the 49ers lead at +301.8.",
    "2026 Draft Preview: Carnell Tate (WR, pick #4 to Tennessee) is the highest-ceiling pick by expected slot "
    "value (76.1 EPA); quarterback is the riskiest rounds 1-2 bet at a 55.2% historical bust rate. Trade-up "
    "cost isn't shown &mdash; nflverse has no original-team-per-pick field, so it's reported as unavailable "
    "rather than guessed.",
]
for f in findings:
    story.append(Paragraph(f"&bull; {f}", bullet_style))

story.append(Paragraph(
    "Every pick is scored by TDVS (True Draft Value Score): the EPA a player actually produced during their "
    "4-year rookie contract, divided by what was historically expected from that draft slot. TDVS &gt; 1.0 "
    "means a player outperformed his slot; the formula reframes the draft as a capital allocation problem "
    "instead of a talent-guessing game.",
    body_style,
))

# ---- Features ----
story.append(Paragraph("Features", h1_style))
features = [
    ("Landing page (/)", "A single case-file-style page built around the project's boldest claim: Purdy's "
     "24.48x TDVS, shown with the same outlier caveat used everywhere else in the app, plus three supporting "
     "headline stats and one call-to-action into the Draft Board."),
    ("TDVS Draft Board (/board)", "Every pick in a selected class (2012-2025), toggleable between pick order "
     "and TDVS ranking with an animated reorder. Defaults to hiding unmodeled positions with a toggle to "
     "reveal them; includes a player-name search box and position filter tabs. Shows three hero stats and the "
     "cross-position bust-rate chart on load."),
    ("Player drill-down", "Click any pick to open a modal with year-by-year EPA bars, an auto-generated "
     "one-sentence verdict, a limitation caveat on any outlier score (TDVS &ge; 5), and a deep link into the "
     "Redraft Simulator for that class."),
    ("Draft Value Curve Comparison (/curve)", "The traditional Stuart Chase chart vs. DraftSpline's "
     "per-position EPA curve, both normalized to pick #1 = 1.0. The 90% confidence band is labeled in the "
     "legend, and two dynamic callouts state the exact pick-number divergence and CI-width growth."),
    ("Redraft Simulator (/redraft)", "Re-orders a class by TDVS and shows original vs. optimized order with "
     "hover-linked rows and a per-team value-delta bar chart. Restricted to 2012-2022 classes (complete rookie "
     "windows only)."),
    ("AI Draft Analyst (/analyst)", "Groq-backed chat grounded in the real TDVS data. Every request includes "
     "cross-position bust/steal rates; an explicit guard prevents the model from inventing players, scores, "
     "or seasons outside the provided context."),
    ("GM Scorecard (/teams)", "All 32 franchises ranked by capital-weighted TDVS, with best/worst-franchise "
     "hero cards at the top."),
    ("Methodology page (/methodology)", "Plain-language writeup of TDVS, the curve-fitting method, and every "
     "known limitation."),
    ("2026 Draft Preview (/preview)", "Every 2026 pick joined to the same expected-EPA curve used everywhere "
     "else in the app, with hero stats and a per-team \"expected EPA acquired\" bar chart."),
]
for name, desc in features:
    story.append(Paragraph(f"<b>{name}</b> &mdash; {desc}", body_style))

story.append(PageBreak())

# ---- How it works ----
story.append(Paragraph("How It Works", h1_style))
how = [
    ("Data source", "nflverse play-by-play (2012-2025) and draft pick data, pulled via nfl_data_py. Classes "
     "2023-2025 are scored as preliminary (rookie windows incomplete); only 2012-2022 classes feed curve "
     "fitting and the Redraft Simulator."),
    ("TDVS formula", "rookie_epa_total / expected_epa[pick][position], computed across Years 1-4 of each "
     "player's rookie contract, with games-played normalization for injury-shortened seasons. Stabilized near "
     "zero/negative expected_epa with a formula mathematically identical to the literal ratio whenever "
     "expected_epa is comfortably positive."),
    ("Curve fitting", "The expected-EPA curve is fit per position (QB/RB/WR/TE) using Nadaraya-Watson kernel "
     "smoothing followed by isotonic regression, with a 90% confidence band that widens in sparse late rounds."),
    ("Simulation logic", "The Redraft Simulator re-orders all qualifying players in a complete-window class "
     "by TDVS descending and reassigns them to the original pick slots, then computes each team's value delta "
     "against what they actually drafted."),
    ("Analyst grounding", "The backend extracts entities (year/team/player/position) from each question, "
     "attaches real parquet data as JSON context, and instructs the model to never assert a value not present "
     "in that context."),
]
for name, desc in how:
    story.append(Paragraph(f"<b>{name}:</b> {desc}", body_style))

# ---- API reference ----
story.append(Paragraph("API Reference", h2_style))
api_rows = [
    ["Route", "Description"],
    ["GET /api/draft/{year}", "All picks in a draft class with TDVS scores"],
    ["GET /api/curve", "Expected-EPA curve per position + Chase chart comparison"],
    ["GET /api/teams", "All 32 GM scorecards"],
    ["GET /api/team/{abbr}", "One team's full pick-by-pick history"],
    ["GET /api/player/{gsis_id}", "Player card with year-by-year EPA"],
    ["GET /api/redraft/{year}[/{team}]", "Optimized draft order + team value deltas"],
    ["GET /api/draft/2026/preview", "2026 draft class joined to the expected-EPA curve"],
    ["POST /api/analyst", "AI analyst question/answer"],
    ["GET /api/methodology", "Methodology page content"],
    ["GET /health", "Health check"],
]
story.append(table_from_rows(api_rows, col_widths=[2.3 * inch, 4.0 * inch]))
story.append(Spacer(1, 10))

story.append(Paragraph("Data Attribution", h2_style))
for b in [
    "nflverse / nflfastR &mdash; play-by-play and draft pick data",
    "nfl_data_py &mdash; Python client for nflverse data",
    "Stuart Chase draft value chart &mdash; traditional draft-value comparison baseline (approximated)",
]:
    story.append(Paragraph(f"&bull; {b}", bullet_style))

story.append(PageBreak())

# ---- Methodology ----
story.append(Paragraph("Methodology", h1_style))

story.append(Paragraph("1. The Problem We're Solving", h2_style))
story.append(Paragraph(
    "NFL teams traditionally judge draft picks using career reputation, Pro Bowl selections, or static "
    "\"draft value charts\" built from historical trade patterns, not actual on-field production. DraftSpline "
    "instead asks: did this pick deliver value relative to what was reasonably expected from that draft slot, "
    "during the only window a team fully controls the player's economics, the four-year rookie contract?",
    body_style,
))

story.append(Paragraph("2. What EPA Is", h2_style))
story.append(Paragraph(
    "EPA stands for Expected Points Added. It's a play-by-play metric that estimates how much a single play "
    "changed a team's expected scoring outcome for that drive, based on down, distance, field position, and "
    "game state. A quarterback who throws a touchdown on 3rd-and-long adds a lot of EPA; a running back "
    "stopped for a loss on 1st-and-10 subtracts EPA. Summed across a season, total EPA is a context-adjusted "
    "measure of how much a player's plays actually helped (or hurt) their team score.",
    body_style,
))

story.append(Paragraph("3. The Rookie Contract Window", h2_style))
story.append(Paragraph(
    "Standard NFL rookie contracts run four years (with a possible fifth-year option for first-round picks, "
    "which is excluded). DraftSpline sums each player's EPA across draft year through draft year + 3, the "
    "years a team controls the player at a pre-market, below-veteran-market price. Career value beyond that "
    "window is deliberately excluded: a great Year 6 doesn't retroactively make a pick a good draft-capital "
    "decision if Years 1-4 were replacement level. To avoid unfairly penalizing injury-shortened seasons, any "
    "season with fewer than 8 games played is scaled by games_played / 17 before being summed into the "
    "rookie total.",
    body_style,
))

story.append(Paragraph("4. How the Expected EPA Curve Is Fit", h2_style))
story.append(Paragraph(
    "For each of the four modeled positions (QB, RB, WR, TE), every qualifying drafted player from 2012-2022 "
    "is plotted by rookie-contract EPA against overall pick number, and a smoothed curve is fit using "
    "Nadaraya-Watson kernel regression (a LOESS-style local smoother) followed by isotonic regression to "
    "enforce that expected value never increases as pick number gets worse. This produces one expected-EPA "
    "value per pick number, per position, plus a 90% confidence band that widens in later rounds, where there "
    "are fewer qualifying players per pick and the model is extrapolating more. This curve is compared against "
    "the Stuart Chase draft value chart, a widely cited update to the older Jimmy Johnson chart that NFL front "
    "offices have historically used to value trade compensation. The Chase chart is position-agnostic by "
    "design; that uniformity is itself one of DraftSpline's central findings, since real value is not "
    "position-agnostic.",
    body_style,
))

story.append(Paragraph("5. How TDVS Is Calculated", h2_style))
story.append(Paragraph("TDVS = Rookie Contract EPA (adjusted) / Expected EPA at draft slot", mono_style))
story.append(Paragraph(
    "A TDVS of 1.0 means a player delivered exactly what their slot predicted. Above 1.0 is a steal; below "
    "1.0 is an underperformer.",
    body_style,
))
story.append(Paragraph(
    "<b>A technical note on stabilization:</b> rushing offense has a well-documented property in NFL "
    "analytics, average EPA per rushing play is usually negative, even for excellent running backs, because "
    "rushing is a lower expected-value play type than passing in most game states. This means the "
    "expected-EPA curve for RB (and occasionally other positions in sparse late rounds) can be at or near "
    "zero. A literal ratio is unstable near zero, so DraftSpline uses a formula that is mathematically "
    "identical to the literal ratio whenever expected EPA is comfortably positive, and transitions smoothly "
    "to a \"value above expectation\" form when expected EPA is small or negative. This keeps the TDVS = 1.0 "
    "\"met expectation\" anchor consistent everywhere without ever dividing by a near-zero number.",
    body_style,
))
story.append(Paragraph(
    "Players below the minimum qualifying-play threshold for their position are excluded from TDVS ranking "
    "and shown as \"insufficient data\":",
    body_style,
))
qual_rows = [
    ["Position", "Minimum Rookie-Window Plays"],
    ["QB", "150 dropbacks"],
    ["RB", "150 carries + targets"],
    ["WR", "75 targets"],
    ["TE", "50 targets"],
]
story.append(table_from_rows(qual_rows, col_widths=[2.0 * inch, 3.0 * inch]))
story.append(Spacer(1, 10))

story.append(Paragraph("6. Known Limitations", h2_style))
for b in [
    "OL is excluded entirely. Offensive line value requires PFF-style blocking-grade data not available in "
    "the public nflverse dataset.",
    "Defensive positions (DL, LB, CB, S) are not modeled in v1. Defensive EPA exists in nflfastR but requires "
    "a different curve architecture; this is explicitly scoped as a v2 feature.",
    "Special teams (K, P, LS) are excluded. They're modeled separately in practice and not comparable to "
    "offensive skill-position EPA.",
    "The 4-year rookie window is a simplification. Some players hold out, get cut before Year 4, or get "
    "extended early. Games-played normalization partially compensates, but outlier player scores can still "
    "be affected.",
    "Confidence intervals widen substantially in rounds 5-7. This is honest signal about real sample-size "
    "limitations, not a smoothing failure; the band is shown rather than hidden.",
    "EPA does not capture all player value, most notably blocking schemes, special-teams contribution, and "
    "leadership/intangibles.",
]:
    story.append(Paragraph(f"&bull; {b}", bullet_style))

story.append(Paragraph("7. Data Sources", h2_style))
for b in [
    "nflverse / nflfastR &mdash; play-by-play data, 2012-2025, including EPA per play.",
    "nfl_data_py &mdash; the Python client used to pull nflverse data.",
    "Stuart Chase draft value chart &mdash; a static, publicly cited chart used only as the traditional-value "
    "comparison baseline, not as an input to the TDVS model itself.",
]:
    story.append(Paragraph(f"&bull; {b}", bullet_style))

story.append(Paragraph("Replacement-Level Table", h3_style))
story.append(Paragraph("Expected EPA at round-break picks, by position:", body_style))
rep_rows = [
    ["Position", "Pick 1", "Pick 33", "Pick 65", "Pick 97", "Pick 129", "Pick 161", "Pick 193+"],
    ["QB", "~38", "~8", "~1", "~0", "~0", "~0", "~0"],
    ["RB", "~-26", "~-26", "~-26", "~-26", "~-27", "~-28", "~-29"],
    ["WR", "~78", "~65", "~50", "~36", "~24", "~14", "~6"],
    ["TE", "~46", "~40", "~28", "~18", "~10", "~5", "~1"],
]
story.append(table_from_rows(rep_rows))

story.append(PageBreak())

# ---- Run locally / deployment ----
story.append(Paragraph("Run Locally", h1_style))
story.append(Paragraph("Backend", h3_style))
story.append(Paragraph("cd backend<br/>pip install -r requirements.txt<br/>uvicorn main:app --reload", mono_style))
story.append(Paragraph(
    "Serves on http://localhost:8000. Requires backend/data/*.parquet (already committed) and a .env with "
    "GROQ_API_KEY for the AI analyst (falls back to cached responses if unset).",
    body_style,
))

story.append(Paragraph("Frontend", h3_style))
story.append(Paragraph("cd frontend<br/>npm install<br/>npm run dev", mono_style))
story.append(Paragraph(
    "Serves on http://localhost:5173, reading VITE_API_BASE_URL from .env.local (defaults to "
    "http://localhost:8000).",
    body_style,
))

story.append(Paragraph("Pipeline (optional, outputs already committed)", h3_style))
story.append(Paragraph(
    "pip install -r pipeline_requirements.txt<br/>"
    "python 01_load_nflverse.py<br/>"
    "python 02_compute_epa_per_player.py<br/>"
    "python 03_compute_tdvs.py<br/>"
    "python 04_fit_draft_curve.py<br/>"
    "python 05_compute_team_scores.py",
    mono_style,
))

story.append(Paragraph("Deployment", h1_style))
for b in [
    "<b>Backend &rarr; Render:</b> root backend/, build pip install -r requirements.txt, start "
    "uvicorn main:app --host 0.0.0.0 --port $PORT. Set ALLOWED_ORIGINS and GROQ_API_KEY env vars.",
    "<b>Frontend &rarr; Vercel:</b> root frontend/, framework preset Vite, set VITE_API_BASE_URL to the "
    "Render URL. vercel.json handles SPA routing.",
    "<b>Keep-alive:</b> register the Render /health endpoint at cron-job.org on a recurring interval to "
    "avoid cold starts before a demo.",
]:
    story.append(Paragraph(f"&bull; {b}", bullet_style))

doc = SimpleDocTemplate(
    "DraftSpline_Submission.pdf",
    pagesize=LETTER,
    topMargin=0.85 * inch,
    bottomMargin=0.85 * inch,
    leftMargin=0.9 * inch,
    rightMargin=0.9 * inch,
    title="DraftSpline -- Project Submission",
    author="DraftSpline",
)
doc.build(story)
print("Wrote DraftSpline_Submission.pdf")
