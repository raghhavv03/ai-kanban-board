# AI Kanban Board

A single-board Kanban project-management app with an AI chat assistant. Next.js frontend (static export) served by a Python FastAPI backend, SQLite storage, and AI via OpenAI. Runs locally in one Docker container.

## Features

- Sign-in protected Kanban board (single board per user)
- Fixed, renameable columns
- Drag-and-drop cards, with editing
- AI chat sidebar that can create, edit, and move cards via natural language
- Persistent storage with SQLite

## Tech Stack

- **Frontend:** Next.js (static export), TypeScript
- **Backend:** Python, FastAPI, served at `/`
- **Database:** SQLite
- **AI:** OpenAI (`gpt-4o-mini`, falls back to `gpt-4o`)
- **Packaging:** Docker, `uv` for Python dependency management

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
cd backend && uv run pytest        # 45 tests (1 live AI test skipped without key)
cd frontend && npm run test        # 39 unit/component tests
cd frontend && npm run test:e2e    # 15 end-to-end tests
```

## Configuration

Set in a `.env` file at the project root (not committed):

- `OPENAI_API_KEY` - OpenAI API key for AI chat (copy from `.env.example`)
- `SESSION_SECRET` - session cookie signing key

See `docs/PLAN.md` for the build plan and `docs/DATABASE.md` for the schema.

Manual AI connectivity check (requires login session cookie):

```bash
curl -X POST http://localhost:8000/api/ai/connectivity -b cookies.txt
```
