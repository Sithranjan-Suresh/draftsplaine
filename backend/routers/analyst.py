import json
import os
import re
from pathlib import Path

import httpx
import pandas as pd
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_TIMEOUT = 10.0

SYSTEM_PROMPT = (
    "You are DraftSpline, an NFL draft analytics assistant. You answer questions about NFL "
    "draft history using TDVS (True Draft Value Score) data, which measures how much value a "
    "player produced during their rookie contract relative to what was expected at their draft "
    "slot. Keep answers under 150 words. Always cite specific numbers (TDVS scores, EPA values, "
    "pick numbers) when available. If you don't have data for a player or class, say so "
    "honestly. Do not discuss topics unrelated to NFL draft analytics. If asked something "
    "offensive or off-topic, redirect with: \"I'm focused on NFL draft analytics — let me know "
    "if you have a draft-related question.\" "
    "When comparing multiple players' TDVS scores, first state the numbers in ranked order "
    "(highest TDVS first), then write your interpretation -- never assert who is 'higher' or "
    "'best' before listing the actual values, and never let your interpretation contradict the "
    "ranked list you just gave. Double-check that any superlative claim ('highest', 'best', "
    "'biggest') is consistent with the numeric values you cited in the same response. "
    "TDVS does not adjust for team context (offensive line quality, receiving talent, scheme, "
    "opponent strength) -- when a player's TDVS is unusually high (above ~5.0), note this "
    "limitation briefly rather than presenting the score as a clean measure of individual talent. "
    "Your dataset covers ONLY 2012-2025 NFL drafts, and ONLY the QB/RB/WR/TE positions -- you have "
    "no data on any player drafted before 2012, no data on OL/DL/LB/CB/S/K/P, and no data outside "
    "the JSON context block provided with each question. NEVER invent a player name, TDVS score, "
    "pick number, or season that isn't in the provided context. If the context says "
    "'no_specific_entity_matched', it means the question didn't reference a specific year, team, or "
    "player you have data for -- use the all_time_leaderboard in the context to answer general "
    "'best/worst ever' questions, and otherwise say plainly that you'd need a specific year, team, "
    "or player name (within 2012-2025, QB/RB/WR/TE) to look up real numbers. "
    "The context ALWAYS includes 'cross_position_stats_2012_2022': mean TDVS, bust rate (% with "
    "TDVS < 0.5), and steal rate (% with TDVS >= 1.2) for each of QB/RB/WR/TE. Use this whenever a "
    "question is about a position generally ('overrated QB', 'is RB worse than WR', 'which position "
    "busts most') -- ground your answer in these real rates, never a vague impression. When a "
    "specific position is mentioned, the context also includes 'position_leaderboards' with the top "
    "5 steals and top 5 busts for that position specifically -- use these, not the mixed-position "
    "all_time_leaderboard, when the question names a position. For subjective framings like "
    "'overrated', interpret it as: a high pick (low pick number) with a low TDVS from that position's "
    "top_busts list -- a player who cost a lot of capital but underdelivered relative to that cost."
)

FALLBACK_PATH = Path(__file__).parent.parent / "analyst_fallback.json"
with open(FALLBACK_PATH, "r", encoding="utf-8") as f:
    FALLBACK_DATA = json.load(f)


class AnalystRequest(BaseModel):
    question: str


def find_fallback(question: str):
    q_lower = question.lower()
    best_match = None
    best_score = 0
    for entry in FALLBACK_DATA.get("questions", []):
        score = sum(1 for kw in entry["keywords"] if kw.lower() in q_lower)
        if score > best_score:
            best_score = score
            best_match = entry
    if best_match and best_score > 0:
        return best_match["answer"]
    return None


POSITION_KEYWORDS = {
    "QB": ["qb", "quarterback", "quarterbacks"],
    "RB": ["rb", "running back", "running backs", "runningback"],
    "WR": ["wr", "wide receiver", "wide receivers", "receiver"],
    "TE": ["te", "tight end", "tight ends"],
}


def compute_position_stats(data: dict) -> dict:
    """Cross-position bust/steal rates on the 2012-2022 complete-rookie-window
    subset -- always included in context so the model can answer comparative
    questions ('is QB more bust-prone than RB?') correctly without that
    comparison needing to be spelled out in the user's question."""
    tdvs_all = data["tdvs"]
    complete = tdvs_all[(tdvs_all["draft_year"] <= 2022) & tdvs_all["qualifying"]]
    stats = {}
    for position in ["QB", "RB", "WR", "TE"]:
        sub = complete[complete["position"] == position]
        if sub.empty:
            continue
        stats[position] = {
            "n_qualifying": int(len(sub)),
            "mean_tdvs": round(float(sub["tdvs"].mean()), 2),
            "bust_rate_pct": round(float((sub["tdvs"] < 0.5).mean() * 100), 1),
            "steal_rate_pct": round(float((sub["tdvs"] >= 1.2).mean() * 100), 1),
        }
    return stats


def extract_context(question: str, data: dict) -> dict:
    """Scan the question for years, team abbreviations, player names, and
    position mentions, and pull the relevant rows from the in-memory
    parquets as compact JSON context for the LLM."""
    context = {
        # Always included, regardless of what else matched, so comparative
        # position questions are grounded even when the question names no
        # specific player/team/year.
        "cross_position_stats_2012_2022": compute_position_stats(data),
    }

    question_lower = question.lower()
    mentioned_positions = [
        pos for pos, keywords in POSITION_KEYWORDS.items() if any(kw in question_lower for kw in keywords)
    ]
    if mentioned_positions:
        tdvs_all = data["tdvs"]
        complete = tdvs_all[(tdvs_all["draft_year"] <= 2022) & tdvs_all["qualifying"]]
        for position in mentioned_positions:
            sub = complete[complete["position"] == position].sort_values("tdvs", ascending=False)
            if sub.empty:
                continue
            context.setdefault("position_leaderboards", {})[position] = {
                "top_steals": sub.head(5)[["player_name", "pick", "draft_year", "tdvs"]].to_dict("records"),
                "top_busts": sub.tail(5)[["player_name", "pick", "draft_year", "tdvs"]].to_dict("records"),
            }

    years = re.findall(r"\b(19|20)\d{2}\b", question)
    years = [int(y) for y in re.findall(r"\b\d{4}\b", question) if 2012 <= int(y) <= 2022]
    if years:
        year = years[0]
        tdvs = data["tdvs"]
        class_df = tdvs[(tdvs["draft_year"] == year) & tdvs["qualifying"]].sort_values("tdvs", ascending=False)
        if not class_df.empty:
            context["draft_class"] = {
                "year": year,
                "mean_tdvs": round(float(class_df["tdvs"].mean()), 2),
                "top_steals": class_df.head(3)[["player_name", "pick", "tdvs"]].to_dict("records"),
                "top_busts": class_df.tail(3)[["player_name", "pick", "tdvs"]].to_dict("records"),
            }

    teams_df = data["teams"]
    tdvs_all = data["tdvs"]
    for _, team_row in teams_df.iterrows():
        abbr = team_row["team_abbr"]
        if re.search(rf"\b{abbr}\b", question) or (
            isinstance(team_row.get("team_name"), str) and team_row["team_name"].lower() in question.lower()
        ):
            team_scores = data["team_scores"]
            team_seasons = team_scores[team_scores["team"] == abbr]
            context.setdefault("teams", []).append(
                {
                    "team": abbr,
                    "team_name": team_row.get("team_name", abbr),
                    "weighted_tdvs_avg": round(float(team_seasons["weighted_tdvs"].dropna().mean()), 2)
                    if team_seasons["weighted_tdvs"].notna().any()
                    else None,
                }
            )

    name_tokens = re.findall(r"[A-Z][a-z]+(?:\s[A-Z][a-z]+)+", question)
    for name in name_tokens:
        match = tdvs_all[tdvs_all["player_name"].str.lower() == name.lower()]
        if not match.empty:
            r = match.iloc[0]
            context.setdefault("players", []).append(
                {
                    "player_name": r["player_name"],
                    "pick": int(r["pick"]),
                    "draft_year": int(r["draft_year"]),
                    "tdvs": float(r["tdvs"]) if pd.notna(r["tdvs"]) else None,
                    "qualifying": bool(r["qualifying"]),
                }
            )

    # "specific" here excludes cross_position_stats_2012_2022, which is
    # always present -- this checks whether the question matched any
    # particular position, year, team, or player.
    matched_something_specific = any(
        key in context for key in ("position_leaderboards", "draft_class", "teams", "players")
    )
    if not matched_something_specific:
        # No specific year/team/player was detected in the question (e.g.
        # "biggest steal of all time", "who's the best ever"). Rather than
        # let the LLM invent names and numbers with no grounding, supply the
        # real all-time leaderboard from complete-window classes (2012-2022)
        # as a substitute, and flag explicitly that nothing more specific
        # was matched so the model doesn't pretend it searched a broader
        # dataset than it has.
        complete_qualifying = tdvs_all[tdvs_all["qualifying"] & (tdvs_all["draft_year"] <= 2022)]
        top_steals = complete_qualifying.sort_values("tdvs", ascending=False).head(5)
        top_busts = complete_qualifying.sort_values("tdvs", ascending=True).head(5)
        context["no_specific_entity_matched"] = True
        context["dataset_scope"] = "2012-2025 NFL drafts, QB/RB/WR/TE positions only"
        context["all_time_leaderboard"] = {
            "top_steals": top_steals[["player_name", "pick", "draft_year", "tdvs"]].to_dict("records"),
            "top_busts": top_busts[["player_name", "pick", "draft_year", "tdvs"]].to_dict("records"),
        }

    return context


def find_mentioned_players(text: str, data: dict, max_players: int = 2) -> list:
    """Scan a block of text (typically the LLM's answer, where the player
    names actually appear even if they weren't in the user's question) for
    known TDVS player names, and attach a full season-by-season EPA
    breakdown so the frontend can render an inline chart without an extra
    round trip."""
    tdvs_all = data["tdvs"]
    player_epa = data["player_epa"]

    name_tokens = re.findall(r"[A-Z][a-z'.]+(?:\s[A-Z][a-z'.]+){1,2}", text)
    seen_gsis = set()
    results = []
    for name in name_tokens:
        if len(results) >= max_players:
            break
        match = tdvs_all[tdvs_all["player_name"].str.lower() == name.lower()]
        if match.empty:
            continue
        r = match.iloc[0]
        if r["gsis_id"] in seen_gsis:
            continue
        seen_gsis.add(r["gsis_id"])

        draft_year = int(r["draft_year"])
        window_seasons = list(range(draft_year, draft_year + 4))
        season_rows = player_epa[
            (player_epa["gsis_id"] == r["gsis_id"]) & (player_epa["season"].isin(window_seasons))
        ].sort_values("season")
        season_breakdown = [
            {"season": int(sr["season"]), "total_epa": float(sr["total_epa"])} for _, sr in season_rows.iterrows()
        ]

        results.append(
            {
                "gsis_id": r["gsis_id"],
                "player_name": r["player_name"],
                "pick": int(r["pick"]),
                "draft_year": draft_year,
                "tdvs": float(r["tdvs"]) if pd.notna(r["tdvs"]) else None,
                "expected_epa": float(r["expected_epa"]) if pd.notna(r["expected_epa"]) else None,
                "rookie_epa_total": float(r["rookie_epa_total"]) if pd.notna(r["rookie_epa_total"]) else None,
                "qualifying": bool(r["qualifying"]),
                "season_breakdown": season_breakdown,
            }
        )
    return results


@router.post("/api/analyst")
async def post_analyst(req: AnalystRequest, request: Request):
    data = request.app.state.data
    question = req.question.strip()

    if not question:
        return {"answer": "Please enter a question.", "data_points": [], "cached": False}

    context = extract_context(question, data)
    api_key = os.getenv("GROQ_API_KEY")

    if api_key:
        try:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"{question}\n\nContext:\n{json.dumps(context, default=str)}",
                },
            ]
            async with httpx.AsyncClient(timeout=GROQ_TIMEOUT) as client:
                response = await client.post(
                    GROQ_URL,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": GROQ_MODEL, "messages": messages, "max_tokens": 400},
                )
            if response.status_code == 200:
                body = response.json()
                answer = body["choices"][0]["message"]["content"]
                data_points = find_mentioned_players(answer, data)
                return {"answer": answer, "data_points": data_points, "cached": False}
            print(f"Groq returned non-200: {response.status_code} {response.text[:300]}")
        except Exception as e:  # noqa: BLE001
            print(f"Groq call failed: {e}")

    fallback_answer = find_fallback(question)
    if fallback_answer:
        return {"answer": fallback_answer, "data_points": find_mentioned_players(fallback_answer, data), "cached": True}

    return {
        "answer": "Analyst temporarily unavailable. Please try again.",
        "data_points": [],
        "cached": False,
    }
