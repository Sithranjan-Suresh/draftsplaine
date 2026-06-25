from pathlib import Path

from fastapi import APIRouter, Request

router = APIRouter()

METHODOLOGY_PATH = Path(__file__).parent.parent / "methodology.md"
with open(METHODOLOGY_PATH, "r", encoding="utf-8") as f:
    METHODOLOGY_CONTENT = f.read()


@router.get("/api/methodology")
async def get_methodology(request: Request):
    data_as_of = request.app.state.data_as_of
    return {"content": METHODOLOGY_CONTENT, "data_as_of": data_as_of}
