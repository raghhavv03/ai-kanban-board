# AI Kanban Board

A single-board Kanban project-management app with an AI chat assistant. NextJS frontend (static export) served by a Python FastAPI backend, SQLite storage, and AI via OpenRouter. Runs locally in one Docker container.

## Run

Requires Docker running.

```bash
./scripts/start.sh   # build + run at http://localhost:8000
./scripts/stop.sh    # stop
```

Sign in with `user` / `password`.

## Develop

```bash
# backend (uv)
cd backend && uv run uvicorn app.main:app --reload

# frontend
cd frontend && npm run dev
```

## Test

```bash
cd backend && uv run pytest        # backend
cd frontend && npm run test        # unit/component
cd frontend && npm run test:e2e    # end-to-end
```

## Configuration

Set in a `.env` file at the project root (not committed):

- `OPENROUTER_API_KEY` - OpenRouter key for AI calls
- `SESSION_SECRET` - session cookie signing key

See `docs/PLAN.md` for the build plan and `docs/DATABASE.md` for the schema.

Manual AI connectivity check (requires login session cookie):

```bash
curl -X POST http://localhost:8000/api/ai/connectivity -b cookies.txt
```
