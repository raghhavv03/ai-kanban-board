import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.auth import router as auth_router

STATIC_DIR = Path(os.environ.get("STATIC_DIR", str(Path(__file__).parent / "static")))
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-change-me")

app = FastAPI(title="Kanban PM App")
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)

# Serve the static site at "/". Registered last so it does not shadow /api routes.
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
