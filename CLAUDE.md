# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-board Kanban PM app: Next.js frontend (static export) served by a Python FastAPI backend, SQLite storage, and an AI chat sidebar (OpenAI `gpt-4o-mini`, fallback `gpt-4o`) that can create/edit/move cards via natural language. Everything runs in one Docker container. MVP is feature-complete (Parts 1-10 done, see `docs/PLAN.md`).

Sign-in is hardcoded to `user` / `password`. There is one board per user for the MVP, though the DB schema supports multiple users/boards.

## Detailed docs (read these before working in an area)

This repo documents itself heavily via `AGENTS.md` files — treat them as more detailed, current-state extensions of this file:

| Document | Covers |
|----------|--------|
| `AGENTS.md` (root) | Business requirements, tech decisions, brand colors, coding standards |
| `docs/PLAN.md` | Build history / per-part checklists (historical; MVP is done) |
| `docs/DATABASE.md` | SQLite schema, entity relationships, ordering strategy, seeding |
| `backend/AGENTS.md` | Backend module-by-module breakdown, API JSON shape, env vars |
| `frontend/AGENTS.md` | Frontend directory layout, state model, drag-and-drop internals, test layout |
| `scripts/AGENTS.md` | Docker start/stop scripts |

## Coding standards (from root AGENTS.md)

1. Use latest versions of libraries and idiomatic approaches.
2. Keep it simple — never over-engineer, no unnecessary defensive programming, no extra features.
3. Be concise; no emojis, ever.
4. When hitting issues, identify root cause before fixing. Prove with evidence, don't guess.

## Commands

Run via Docker (production-like):
```bash
./scripts/start.sh              # build + run at http://localhost:8000
./scripts/stop.sh
```

Backend dev (no Docker):
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload          # placeholder static
# or, with a built frontend:
OPENAI_API_KEY=... STATIC_DIR="../frontend/out" uv run uvicorn app.main:app --reload
```

Frontend dev:
```bash
cd frontend
npm run dev            # next dev
npm run build           # static export to out/
npm run lint             # eslint
```

Tests:
```bash
cd backend && uv run pytest                 # 45 tests, 1 live AI test skipped without OPENAI_API_KEY
cd backend && uv run pytest tests/test_board.py -k move_card   # single test example

cd frontend && npm run test                 # vitest run, 39 unit/component tests
cd frontend && npm run test:watch           # vitest watch mode
cd frontend && npm run test:e2e             # playwright, 15 e2e tests (builds static export + starts FastAPI on port 3001)
cd frontend && npm run test:e2e:ui          # playwright UI mode
```

Config lives in `.env` at the project root (`OPENAI_API_KEY`, `SESSION_SECRET`); see `.env.example`.

## Architecture

**Request flow:** FastAPI (`backend/app/main.py`) registers `/api/*` routers first (auth, ai, board, chat), then mounts `StaticFiles` at `/` serving the Next.js static export. In Docker, the frontend is built (`npm run build` → `out/`) and copied into `backend/app/static/` at image build time — there is no Next.js server at runtime.

**Backend layering:** routers (`auth.py`, `ai.py`, `board.py`, `chat.py`) depend on `require_user` (session-cookie auth from `auth.py`) and call into `board_service.py`, the single data-access layer over SQLAlchemy models (`models.py`: `User` → `Board` → `Column` → `Card`, cascade deletes, position-ordered). All DB ids are integers internally but serialized as **strings** in JSON to match the frontend's id type. `ai_client.py` wraps OpenAI calls (`complete` for plain text, `complete_structured` for JSON-schema responses); `chat.py` sends the current board + system prompt + capped history, and applies any returned operations through `board_service.apply_operations`.

**Frontend data flow:** `page.tsx` composes `useAuth` + `useBoard(enabled)` + `useChat`, passing state/callbacks into `<Board>`. `useBoard` holds a normalized `BoardState` (`{ columns: [{id,title,cardIds}], cards: {id: {id,title,details}} }`), applies mutations optimistically via `boardReducer`, then reconciles with the full board JSON each mutation endpoint returns. AI-driven board changes come back as `board_changed: true` from `/api/chat`, triggering a silent `useBoard.refresh()`.

**Drag and drop** (`Board.tsx` + `dropIndex.ts`) is the trickiest part of the frontend — backend column ids and card ids are independent integer sequences that can collide, so column droppables are namespaced as `col-<id>` / `col-<id>-end`. Custom collision detection (`pointerWithin` + `MeasuringStrategy.Always`) finds the column under the pointer, then walks cards top-to-bottom to find the insertion index using `getEventCoordinates(activatorEvent) + delta.y` (not raw `MouseEvent`, since `PointerSensor` fires `PointerEvent`). See `frontend/AGENTS.md` for the full rationale if touching this code.

**Testing:** backend uses an isolated temp SQLite DB per test (`conftest.py` overrides `get_db`). Frontend e2e runs against the real FastAPI-served static export (not `next dev`), with `POST /api/test/reset` (gated by `ALLOW_TEST_RESET=1`) reseeding the board before each test.

## Brand colors

Accent yellow `#ecad0a`, blue `#209dd7`, purple `#753991`, dark navy `#032147`, gray `#888888` — defined as CSS variables in `frontend/src/app/globals.css`.
