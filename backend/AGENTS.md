# Backend

Python FastAPI backend. Serves the JSON API under `/api/*` and the static frontend at `/`. Managed with `uv`. Parts 2-8 complete.

## Stack

- FastAPI + Uvicorn
- SQLAlchemy 2.0 ORM (SQLite)
- httpx (OpenRouter API calls)
- `uv` for dependency management (`pyproject.toml`, `uv.lock`)
- pytest + httpx for tests

## Layout

- `app/main.py` - FastAPI app with lifespan (`init_db()` on startup). `SessionMiddleware`, `GET /api/health`, auth router, AI router, board router, then `StaticFiles` mount at `/` (`html=True`). API routes registered before the static mount.
- `app/auth.py` - auth router and `require_user` dependency. `POST /api/login` (hardcoded `user`/`password`) sets signed HTTP-only session cookie; `POST /api/logout` clears it; `GET /api/me` reports auth status. `require_user` raises 401 when unauthenticated.
- `app/ai_client.py` - OpenRouter client (Part 8). `complete(messages)` sends chat completions to `https://openrouter.ai/api/v1/chat/completions` using model `openai/gpt-oss-120b`. Reads `OPENROUTER_API_KEY` from the environment. Raises `AIConfigError` if the key is missing; `AIRequestError` on HTTP/parse failures.
- `app/ai.py` - AI router (Part 8). `POST /api/ai/connectivity` (auth required) asks the model "What is 2+2?" and returns `{ model, answer }`. Returns 503 if the key is missing, 502 if OpenRouter fails.
- `app/board.py` - auth-protected board API:
  - `GET /api/board` - fetch user's board (creates + seeds on first access)
  - `PATCH /api/columns/{column_id}` - rename column
  - `POST /api/columns/{column_id}/cards` - add card
  - `PATCH /api/cards/{card_id}` - edit card
  - `DELETE /api/cards/{card_id}` - delete card (reindexes remaining cards)
  - `POST /api/cards/{card_id}/move` - move card (same or cross column, with ordering)
  - `POST /api/test/reset` - reseed user's board (only when env `ALLOW_TEST_RESET=1`; used by Playwright e2e)
  - Each mutation returns the full serialized board JSON
- `app/board_service.py` - data access layer: seed data (`SEED` constant mirroring frontend dummy data), `get_or_create_board`, `serialize_board`, rename/add/edit/delete/move, `reset_user_board`. Raises `NotFoundError` for unknown/unowned resources. All ids serialized as strings for the frontend.
- `app/models.py` - ORM models: `User`, `Board`, `Column`, `Card` (with position ordering, cascade deletes)
- `app/db.py` - engine, `SessionLocal`, `get_db` dependency, `init_db`, SQLite foreign-key pragma
- `app/static/` - static files at `/`. Placeholder locally; Docker overlays the NextJS `out/` export here.
- `tests/` - pytest suite:
  - `test_health.py` - health endpoint
  - `test_auth.py` - login/logout/session/protection
  - `test_board.py` - board CRUD, move ordering, auth, 404/422, persistence, test reset
  - `test_ai.py` - OpenRouter client (mocked), connectivity endpoint, optional live test when key set
  - `conftest.py` - isolated temp SQLite DB per test via `get_db` override; `client` fixture logs in

## API JSON shape

Matches frontend `BoardState` (see `docs/DATABASE.md`):

```json
{
  "columns": [{ "id": "1", "title": "Backlog", "cardIds": ["1", "2"] }],
  "cards": { "1": { "id": "1", "title": "...", "details": "..." } }
}
```

## Config (env vars)

- `STATIC_DIR` - directory served at `/` (default `app/static`)
- `SESSION_SECRET` - session cookie signing key (default dev value; set in production)
- `DATABASE_URL` - SQLAlchemy URL (default `sqlite:///./data/kanban.db`; created on startup)
- `ALLOW_TEST_RESET` - set to `1` to enable `POST /api/test/reset` (e2e only)
- `OPENROUTER_API_KEY` - OpenRouter key; loaded from `.env` at runtime via `--env-file`, never baked into the image

## Run locally (without Docker)

```bash
cd backend
uv sync
# Serve placeholder static (or point STATIC_DIR at frontend/out after npm run build):
uv run uvicorn app.main:app --reload
```

With the built frontend and OpenRouter key:

```bash
OPENROUTER_API_KEY=... STATIC_DIR="../frontend/out" uv run uvicorn app.main:app --reload
```

Test AI connectivity (after login):

```bash
curl -X POST http://localhost:8000/api/ai/connectivity -b cookies.txt
```

## Tests

```bash
cd backend
uv run pytest   # 32 passed, 1 skipped (live OpenRouter test without key)
```

## Docker

Root `Dockerfile`: multi-stage build (Node builds frontend static export, Python runtime with `uv sync --frozen`, copies `out/` to `app/static/`). Exposes port 8000. See `scripts/AGENTS.md` for start/stop. Pass `.env` with `OPENROUTER_API_KEY` via `scripts/start.sh`.

## Not yet implemented (Part 9)

- No `POST /api/chat` with board context or structured outputs yet
- Part 9 will attach current board JSON to prompts and apply card operations via `board_service.py`
- Part 10 adds the frontend chat sidebar

When implementing Part 9, extend `ai_client.py` for structured outputs and reuse `board_service.py` for applying changes.
