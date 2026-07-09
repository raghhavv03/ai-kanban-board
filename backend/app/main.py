import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.auth import router as auth_router
from app.ai import router as ai_router
from app.board import router as board_router
from app.chat import router as chat_router
from app.db import init_db

logger = logging.getLogger(__name__)

STATIC_DIR = Path(os.environ.get("STATIC_DIR", str(Path(__file__).parent / "static")))

_DEFAULT_SESSION_SECRET = "dev-secret-change-me"
SESSION_SECRET = os.environ.get("SESSION_SECRET", _DEFAULT_SESSION_SECRET)
if SESSION_SECRET == _DEFAULT_SESSION_SECRET:
    logger.warning(
        "SESSION_SECRET is not set; using an insecure default. Set it in .env for any non-local deployment."
    )


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
app.include_router(ai_router)
app.include_router(board_router)
app.include_router(chat_router)

# Serve the static site at "/". Registered last so it does not shadow /api routes.
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
