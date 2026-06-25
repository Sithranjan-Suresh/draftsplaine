import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from data_loader import load_data
from routers import analyst, curve, draft, methodology, player, redraft, teams

load_dotenv()

DATA_AS_OF = "2026-06-24"

app = FastAPI(title="DraftSpline API")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.on_event("startup")
async def startup_event():
    app.state.data = load_data()
    app.state.data_as_of = DATA_AS_OF
    print(f"DraftSpline backend ready. data_as_of={DATA_AS_OF}")


@app.get("/health")
async def health():
    return {"status": "ok", "data_as_of": DATA_AS_OF}


app.include_router(draft.router)
app.include_router(curve.router)
app.include_router(teams.router)
app.include_router(player.router)
app.include_router(redraft.router)
app.include_router(analyst.router)
app.include_router(methodology.router)
