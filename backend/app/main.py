import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.auth import router as auth_router
from app.board import router as board_router
from app.db import init_db

STATIC_DIR = Path(os.environ.get("STATIC_DIR", str(Path(__file__).parent / "static")))
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-change-me")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Kanban PM App", lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(board_router)

# Serve the static site at "/". Registered last so it does not shadow /api routes.
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
