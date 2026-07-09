# Code Review: Kanban PM App (Parts 1-10)

## Security: CRITICAL

### 1. Real OpenAI API key committed to the working tree
The `.env` file at the project root contains a **live OpenAI API key**. While `.gitignore` does exclude `.env` from git tracking, the key is sitting on disk in plaintext and would be leaked if the file is ever accidentally staged, included in a debug bundle, or exposed via a screenshot in an issue/PR. **This key should be revoked immediately via the OpenAI dashboard** and a new key created.

**File:** `.env` (not tracked by git, but present on disk)

### 2. Weak default `SESSION_SECRET`
`main.py:21` defaults to `"dev-secret-change-me"` when `SESSION_SECRET` is unset. A warning is logged, but the app still runs. An attacker who knows this default can forge session cookies.

---

## Backend: Medium Priority

### 3. No CORS configuration
`backend/app/main.py` does not configure any CORS middleware. The production setup (Docker) serves frontend and API from the same origin, so this is fine there. However, the README says users can run `cd frontend && npm run dev` alongside `uv run uvicorn app.main:app --reload`, which would put the frontend on port 3000 and the API on port 8000. Without CORS, all API calls from `npm run dev` will fail with cross-origin errors.

**Fix:** Add `CORSMiddleware` (conditional, or always allow localhost origins).

### 4. `_repair_operations` uses heuristic column matching
`chat.py:96-137` fills in missing column references by checking if a column title appears as a substring in the user message. This is fragile: if the user says "Move the card from To Do to Done" and both "To Do" and "Done" are substring-matched, the **first** alphabetical match wins (iterating `columns_by_title` keys). This is non-deterministic for dict ordering and can match the wrong column.

### 5. Fallback on all `AIRequestError` instead of just model errors
`chat.py:84-90` catches `AIRequestError` (which includes network failures, auth failures, parse errors) and retries with `gpt-4o`. If the API key is invalid or the network is down, both calls fail, doubling the latency with no benefit.

**Suggestion:** Only retry on model-specific errors (e.g., 429 rate-limit, 500 server errors) and fail fast on auth failures.

### 6. `apply_operations` silently skips invalid operations
`board_service.py:376-383` catches all `OperationError` exceptions and continues. If the AI returns a batch of operations where **all** are invalid, the user sees `board_changed: false` with no indication of what went wrong. The AI's reply might claim the board was updated, creating a confusing UX.

### 7. Linear scan for column/card lookups
`board_service.py:109-121` iterates over `board.columns` and nested cards in Python rather than querying the DB. With 5 columns and ~10 cards this is fine, but it makes the `apply_operations` path O(n*m) per operation. The functions are called both in validation and in application.

### 8. `serialize_board` returns loose types
`board_service.py:90-106` has `cards: dict[str, dict]` -- the inner `dict` should be a typed dict. No Pydantic model for the response shape means no auto-validation of the API contract.

### 9. No constraint against duplicate boards
`board_service.py:51-53` uses `select(Board).where(...).order_by(Board.id).first()` to find the user's board. There is no `unique` constraint on `(user_id)` for boards, so if two concurrent requests both hit the "no board" check, duplicate boards could be created (though SQLite's serialized writes make this unlikely in practice).

### 10. `delete_card` reindexes in Python
`board_service.py:153-161` deletes a card, flushes, then reindexes the remaining cards by iterating in Python. This is two roundtrips to the DB. A single SQL `UPDATE ... SET position = ...` could do this atomically.

---

## Backend: Minor

### 11. `_extract_reply_and_operations` silently substitutes "Done."
`chat.py:148-150` -- If the AI returns operations but no reply, the code substitutes `"Done."`. This could mask malformed AI responses.

### 12. Typing: `_get_column` and `_get_card` return concrete types but their docstring/names don't clarify they raise on missing
Minor -- callers must know about `NotFoundError`. The FastAPI routes catch it correctly.

### 13. `chat_schema.py` uses `anyOf` for nullable fields
The schema uses `{"anyOf": [{"type": "string"}, {"type": "null"}]}` which is valid JSON Schema. OpenAI's `strict: true` does support `anyOf` for nullables, so this is fine. But the comment says "OpenAI strict json_schema rejects oneOf" which is misleading -- it's `oneOf` that's not supported, not `anyOf`. The code correctly uses `anyOf`.

### 14. `pyproject.toml` has no async dependencies despite `httpx` being usable async
Not a bug, but `httpx` is used synchronously. The route handlers are also synchronous. This is fine for a small app but limits throughput.

---

## Frontend

### 15. `load` and `refresh` in `useBoard` are nearly identical
`useBoard.ts:23-42` -- `load` and `refresh` differ only by `setStatus("loading")`. Could be factored into one function with a flag.

### 16. `persistMove` does not use the optimistic-update pattern
`useBoard.ts:110-133` -- Unlike `renameColumn`, `addCard`, etc., `persistMove` does not use the `reconcile` helper. It calls the API directly and reconciles with the response. This is because the optimistic update is already applied locally via `moveCardLocal` during the drag. But if `persistMove` fails, the optimistic local state (from the drag) is lost and replaced by a fresh server fetch. This is correct but inconsistent with the `reconcile` pattern.

### 17. `handleDragEnd` recomputes the destination
`Board.tsx:167-185` -- `handleDragEnd` calls `computeAndMove` again (the same function called during `onDragMove`), even though the position was already updated live. The `computeAndMove` in `handleDragEnd` is redundant for the local state but serves as a source of truth for the persistence call. The comment doesn't explain this clearly.

### 18. EditableColumnTitle double-sync
`EditableColumnTitle.tsx:18-20` -- The `useEffect` syncing `title` prop to local state `value` can cause a flash if the parent re-renders while the title field is being edited (the user's in-progress edit gets overwritten).

### 19. Append-only message array in `useChat`
`useChat.ts:19-20` and `useChat.ts:26-29` -- Messages are appended but never pruned client-side. History sent to the API is capped at 10, but the local `messages` array grows unboundedly across the session.

### 20. Empty board skeleton text references `dummyData.ts`
Unused import in `boardReducer.ts:2-3` -- `initialBoardState` is imported but only re-exported on line 126. The import is dead code. Actually, looking again, it's used: `export { initialBoardState }` on line 126. Fine.

---

## Infrastructure & Dev Experience

### 21. Playwright config has fragile `uv` path
`playwright.config.ts:24` -- The web server command prepends `PATH="$HOME/.local/bin:$PATH"` to find `uv`. This is machine-specific and may not work for users who installed `uv` differently (e.g., via Homebrew, pipx, or in a different location).

### 22. `.dockerignore` excludes `docs` and `scripts`
The `scripts` directory is excluded from the Docker build context, but `AGENTS.md` says the start/stop scripts are for Docker. The scripts don't need to be in the image -- they run on the host -- so this is correct.

### 23. No docker-compose or volume mount for DB persistence
`scripts/AGENTS.md` explicitly notes that SQLite data is lost when the container is removed. For an MVP this is acceptable, but a `docker-compose.yml` with a named volume would be a trivial improvement that makes the app feel complete.

### 24. `uv.lock` is present but `uv.lock` is in `.gitignore`
Wait, looking at `.gitignore` lines 96-100, `uv.lock` is commented as "generally recommended to include...". So it's NOT ignored. The `uv.lock` is checked in. This is good.

---

## Testing

### 25. `test_health.py` uses a module-level client
`test_health.py:5` creates `client = TestClient(app)` at module scope, while all other test files use fixture-based clients. This works but is inconsistent and the health test doesn't benefit from the isolated DB setup.

### 26. No test for the `_repair_operations` function in isolation
`chat.py:93-137` has no direct unit test -- it's only tested indirectly via `test_chat_repairs_incomplete_create_card_from_user_message` and similar e2e tests. A unit test for the heuristic matching logic would catch subtle bugs (e.g., matching "Done" when the user says "To Do").

### 27. AI client `complete` is mocked at different levels
`test_ai.py` mocks `httpx.post` directly, while `test_chat.py` mocks `app.chat.complete_structured`. This dual approach is fine but means the `_post_completion` retry/error logic is only tested through the AI connectivity endpoint, not through the chat path.

---

## Documentation

### 28. `AGENTS.md` test counts slightly off
`AGENTS.md` says 45 backend tests. My count: test_health (2), test_auth (4), test_board (19), test_ai (8, 1 skipped), test_chat (14) = 47 total (46 executable). This is a minor discrepancy that won't affect users but should be updated if the file is maintained.

---

## Strengths

- **Clean architecture**: Clear separation of routes, data access, and ORM models in backend; hooks + components + reducer pattern in frontend.
- **Excellent test coverage**: 47 backend tests, 39 frontend tests, 15 e2e tests covering happy paths, error states, and edge cases like tall-card-above-short-card drag.
- **Well-documented**: Every file has a purpose, AGENTS.md explains architecture decisions.
- **Good error handling**: AI failures are caught, logged, and surfaced as proper HTTP status codes (502/503). Invalid operations never corrupt the board.
- **Optimistic updates**: Frontend feels responsive despite API latency.
- **Smart drag-and-drop architecture**: Custom collision detection using pointer position instead of dragged-card center, column-droppable namespacing to avoid id collisions, `MeasuringStrategy.Always` to handle dynamic rects.
- **Structured Outputs pattern**: The flat operation schema (nullable fields instead of `oneOf`) is the correct approach for OpenAI's `strict: true` mode.
- **Immutable state management**: `boardReducer` is a pure function, making state predictable and testable.

**Verdict:** High-quality MVP with thoughtful design. The live API key in `.env` is the only critical issue.
