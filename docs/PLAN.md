# Project Management MVP - Build Plan

A single-board Kanban PM app: NextJS frontend (static export) served by a Python FastAPI backend, SQLite storage, and an AI chat sidebar (OpenRouter, `openai/gpt-oss-120b`) that can create/edit/move cards. Everything runs locally in one Docker container.

## How to use this document

Each part below has substeps as a checklist, plus tests and success criteria. Work through parts in order. Do not start a part until the previous part's success criteria are met. Check off substeps as they are completed.

## Key assumptions / decisions (confirm before Part 2)

These defaults were chosen to keep the MVP simple; flag if any should change.

1. Card editing IS in scope (business requirements say cards can be edited). We will add card title/details editing during the frontend work (Part 3) and wire it to the backend (Part 7).
2. Auth uses a signed HTTP-only session cookie issued by FastAPI on successful login. Credentials hardcoded to `user` / `password`. Backend Kanban/AI routes require a valid session.
3. Frontend is a fully static NextJS export (`output: "export"`) served by FastAPI; it calls the FastAPI JSON API at `/api/*`. No NextJS server/SSR at runtime.
4. Columns are fixed (Backlog, To Do, In Progress, Review, Done) and only renameable. No add/remove column.
5. SQLite schema supports multiple users but the MVP seeds/uses exactly one board per user.
6. Single Docker image: multi-stage build (NextJS static build stage + Python runtime stage). `uv` manages Python deps. Container exposes one port (8000).
7. AI uses OpenRouter model `openai/gpt-oss-120b` with Structured Outputs. If that model does not reliably support structured outputs on OpenRouter, we fall back to another OpenRouter model that does (to be confirmed at Part 8/9).

---

## Part 1: Plan (this document)

Enrich this plan and describe the existing frontend, then get sign-off.

- [x] Enrich `docs/PLAN.md` with per-part checklists, tests, and success criteria
- [x] Create `frontend/AGENTS.md` describing the existing frontend code
- [ ] User reviews and approves the plan and the assumptions above

Tests / verification:
- N/A (documentation only)

Success criteria:
- Plan is detailed enough to execute each part without further clarification
- `frontend/AGENTS.md` accurately reflects the current frontend
- User has explicitly approved before Part 2 begins

---

## Part 2: Scaffolding (Docker + FastAPI + scripts)

Stand up the container and backend serving a hello-world page and a health API.

- [x] Create `backend/` FastAPI app (`uv` project: `pyproject.toml`, `uv.lock`)
- [x] Add `GET /api/health` returning `{"status": "ok"}`
- [x] Serve a static `hello world` page at `/` (temporary placeholder, replaced in Part 3)
- [x] Add `Dockerfile` (multi-stage: build stage placeholder + Python runtime with `uv`) and `.dockerignore`
- [x] Container runs the app with uvicorn on port 8000
- [x] Write `scripts/start.sh`, `scripts/stop.sh` (Mac/Linux) and `scripts/start.ps1`, `scripts/stop.ps1` (Windows) that build/run/stop the container
- [x] Update `backend/AGENTS.md` and `scripts/AGENTS.md` with real descriptions

Tests / verification:
- `pytest` backend test hitting `/api/health` via FastAPI `TestClient` returns 200 + `{"status":"ok"}`
- Manual: `scripts/start.sh` builds and runs; `curl localhost:8000/` returns the hello page; `curl localhost:8000/api/health` returns ok; `scripts/stop.sh` stops the container

Success criteria:
- One command starts the container; `/` shows hello world and an API call succeeds
- Backend unit test passes

---

## Part 3: Integrate the frontend (static build served by FastAPI)

Build the NextJS site statically and serve it from FastAPI, showing the demo Kanban at `/`.

- [x] Set `output: "export"` in `frontend/next.config.ts` and verify `next build` emits static files to `out/`
- [x] Add card editing UI + reducer action (`EDIT_CARD`) to satisfy the "cards can be edited" requirement
- [x] Dockerfile build stage runs `npm ci && npm run build`; runtime stage copies `out/` into the FastAPI static dir
- [x] FastAPI serves `index.html` at `/` and static assets (`/_next/*`)
- [x] Ensure `/api/*` routes are not shadowed by the static mount

Tests / verification:
- Frontend Vitest unit tests pass (including new `EDIT_CARD` reducer test)
- Frontend Playwright e2e still passes against the demo (load, rename, add, edit, delete, drag)
- Backend test: requesting `/` returns HTML containing the board; `/api/health` still works
- Manual: container serves the full demo board at `/`

Success criteria:
- The static Kanban demo renders and is fully interactive when served by FastAPI in the container
- All existing + new frontend tests pass

---

## Part 4: Fake user sign-in

Gate the board behind a login page with dummy credentials and support logout.

- [x] Backend: `POST /api/login` validates `user`/`password`, sets signed HTTP-only session cookie; `POST /api/logout` clears it; `GET /api/me` reports auth status
- [x] Backend dependency (`require_user`) that protects routes and returns 401 when unauthenticated
- [x] Frontend: login page/form; unauthenticated users hitting `/` see login; authenticated users see the board; logout button in header
- [x] Client checks `GET /api/me` on load to decide login vs board

Tests / verification:
- Backend tests: valid login sets cookie (200); invalid login rejected (401); protected route 401 without cookie, 200 with cookie; logout clears session
- Frontend Vitest: login form validation and auth-state rendering
- Playwright e2e: cannot see board before login; login with `user`/`password` reveals board; logout returns to login

Success criteria:
- Board is inaccessible until login with the dummy credentials; logout works; sessions persist across reloads until logout

---

## Part 5: Database modeling

Design and document the SQLite schema; get sign-off before implementing routes.

- [x] Propose schema: `users`, `boards` (one per user for MVP), `columns` (ordered, renameable), `cards` (title, details, ordered within column)
- [x] Define the JSON shape the API will exchange with the frontend (mirrors current `BoardState`)
- [x] Document schema, relationships, ordering strategy, and seed behavior in `docs/DATABASE.md`
- [x] Decide access approach (raw `sqlite3` vs SQLAlchemy) - default: SQLAlchemy for clarity, kept minimal
- [ ] User signs off on `docs/DATABASE.md`

Tests / verification:
- N/A (design doc); review only

Success criteria:
- `docs/DATABASE.md` fully specifies tables, columns, ordering, and the API JSON shape
- User has approved the schema

---

## Part 6: Backend Kanban API

Implement persistent read/write of a user's Kanban, creating the DB if absent.

- [ ] Create DB and tables on startup if missing; seed the fixed columns + demo cards for the user on first use
- [ ] `GET /api/board` returns the authenticated user's board as JSON
- [ ] Endpoints to rename a column, add/edit/delete a card, and move a card (with ordering)
- [ ] Enforce auth on all board routes; scope all queries to the current user
- [ ] Data access layer isolated from route handlers

Tests / verification:
- Backend unit/integration tests (pytest) against a temp SQLite DB: DB auto-creation, seeding, GET board shape, rename column, add/edit/delete card, move card (same + cross column ordering), auth enforcement (401)
- Verify persistence: mutate, re-read, confirm changes stored

Success criteria:
- All board operations persist correctly and are user-scoped; DB is created if missing; tests pass

---

## Part 7: Connect frontend to backend

Replace in-memory state with real API calls for a persistent board.

- [ ] Add a typed API client in the frontend (`/api/board` + mutation endpoints)
- [ ] Load board from backend on mount; render loading/error states
- [ ] Wire rename column, add/edit/delete card, and move card to backend, updating UI optimistically with reconciliation on response
- [ ] Remove reliance on `dummyData` for runtime state (keep only for tests/seed reference)

Tests / verification:
- Frontend Vitest: API client and hook logic with a mocked fetch (success + error)
- Playwright e2e against the running container: perform each operation, reload page, confirm changes persisted
- Backend tests remain green

Success criteria:
- The board is fully persistent end-to-end; a reload preserves all changes; all tests pass

---

## Part 8: AI connectivity

Prove OpenRouter connectivity from the backend.

- [ ] Load `OPENROUTER_API_KEY` from `.env` (never commit real key; already gitignored)
- [ ] Backend AI client calling OpenRouter with model `openai/gpt-oss-120b`
- [ ] Temporary/verified test path that asks "what is 2+2" and confirms a sane response
- [ ] Handle missing key / network error gracefully

Tests / verification:
- A connectivity test (guarded so CI without a key skips) that sends "2+2" and asserts the response contains "4"
- Manual: run inside container and confirm the AI call succeeds

Success criteria:
- Backend can reach OpenRouter and get a valid completion from the configured model

---

## Part 9: AI with board context + Structured Outputs

Send the board JSON + user question + history; get a structured response with an optional board update.

- [ ] Define the Structured Output schema: `{ reply: string, board_update?: <list of card operations or full board> }`
- [ ] `POST /api/chat` accepts the user message + conversation history; backend attaches current board JSON and system prompt
- [ ] Parse/validate structured output; if a board update is present, apply it via the Part 6 data layer (create/edit/move cards)
- [ ] Return the assistant reply and a flag indicating whether the board changed
- [ ] Confirm chosen model supports structured outputs on OpenRouter; fall back per assumption 7 if not

Tests / verification:
- Backend tests with a mocked OpenRouter response: reply-only path; board-update path applies changes and persists; malformed output handled without corrupting the board
- Live smoke test: ask "add a card X to To Do" and confirm the card is created

Success criteria:
- The AI reliably returns structured output; board updates from the AI are applied and persisted correctly; invalid output never corrupts the board

---

## Part 10: AI chat sidebar UI

Add a polished chat sidebar; auto-refresh the board when the AI changes it.

- [ ] Sidebar chat widget (brand-styled) with message list, input, send, and loading state
- [ ] Maintain conversation history client-side and send it with each request
- [ ] On a response indicating a board change, re-fetch/refresh the board so the UI updates automatically
- [ ] Responsive layout: board + collapsible sidebar

Tests / verification:
- Frontend Vitest: chat component renders messages, sends input, shows loading, triggers board refresh on update flag (mocked API)
- Playwright e2e against the container: send a message that adds/moves a card and assert the board updates without manual reload
- Full regression: all backend + frontend + e2e suites pass

Success criteria:
- User can chat with the AI in a beautiful sidebar; AI-driven create/edit/move operations appear on the board automatically; full app works end-to-end in the container
