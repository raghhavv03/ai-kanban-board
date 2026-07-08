# Backend

Python FastAPI backend. Serves the JSON API under `/api/*` and the static frontend at `/`. Managed with `uv`.

## Stack

- FastAPI + Uvicorn
- `uv` for dependency management (`pyproject.toml`, `uv.lock`)
- pytest + httpx for tests

## Layout

- `app/main.py` - FastAPI app. Adds `SessionMiddleware`, defines `GET /api/health`, includes the auth router, then mounts `StaticFiles` at `/` (`html=True`). API routes are registered before the mount so they are not shadowed. The static directory is `STATIC_DIR` (env), defaulting to `app/static`.
- `app/auth.py` - auth router and `require_user` dependency. `POST /api/login` (hardcoded `user`/`password`) sets a signed HTTP-only session cookie, `POST /api/logout` clears it, `GET /api/me` reports auth status. `require_user` returns the username or raises 401; use it to protect routes.
- `app/board.py` - auth-protected board API router: `GET /api/board`, `PATCH /api/columns/{id}` (rename), `POST /api/columns/{id}/cards` (add), `PATCH /api/cards/{id}` (edit), `DELETE /api/cards/{id}`, `POST /api/cards/{id}/move`. Each mutation returns the full board JSON.
- `app/board_service.py` - data access layer (no FastAPI deps): seeding, `serialize_board`, and rename/add/edit/delete/move operations scoped to a board. Raises `NotFoundError` for unknown/unowned columns or cards.
- `app/models.py` - SQLAlchemy 2.0 ORM models: `User`, `Board`, `Column`, `Card`.
- `app/db.py` - engine, session factory, `get_db` dependency, `init_db` (creates the SQLite file/dir and tables), foreign-key pragma.
- `app/static/` - static files served at `/`. A hello-world placeholder locally; the Docker build overlays the NextJS static export here.
- `tests/` - pytest suite (`test_health.py`, `test_auth.py`, `test_board.py`); `conftest.py` provides an isolated per-test SQLite DB via a `get_db` override.
- `pyproject.toml` / `uv.lock` - dependencies (runtime + `dev` group).

## Config (env vars)

- `STATIC_DIR` - directory served at `/` (default `app/static`).
- `SESSION_SECRET` - key used to sign the session cookie (default is a dev value; set in production).
- `DATABASE_URL` - SQLAlchemy URL (default `sqlite:///./data/kanban.db`; created on startup if missing).

## Run locally (without Docker)

```
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

## Tests

```
cd backend
uv run pytest
```

## Notes

- Runtime is Python 3.12 in Docker (see root `Dockerfile`).
- `OPENROUTER_API_KEY` (Part 8+) is provided at runtime via `--env-file .env`, never baked into the image.
