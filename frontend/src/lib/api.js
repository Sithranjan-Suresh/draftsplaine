const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body.detail || body.error || "";
    } catch {
      // ignore parse failure
    }
    throw new Error(`Request to ${path} failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return response.json();
}

export async function fetchDraftClass(year) {
  return request(`/api/draft/${year}`);
}

export async function fetchCurve() {
  return request(`/api/curve`);
}

export async function fetchTeams() {
  return request(`/api/teams`);
}

export async function fetchTeam(abbr) {
  return request(`/api/team/${abbr}`);
}

export async function fetchPlayer(gsisId) {
  return request(`/api/player/${gsisId}`);
}

export async function fetchRedraft(year, team) {
  const path = team ? `/api/redraft/${year}/${team}` : `/api/redraft/${year}`;
  return request(path);
}

export async function postAnalystQuestion(question) {
  return request(`/api/analyst`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function fetchMethodology() {
  return request(`/api/methodology`);
}

export async function fetchDraftPreview() {
  return request(`/api/draft/2026/preview`);
}

export { BASE_URL };
