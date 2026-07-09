# Code Review

Full review of the codebase as of 2026-07-09 (commit `7ca3d2d`, MVP complete per `docs/PLAN.md`). Covers `backend/app`, `frontend/src`, `Dockerfile`, and the deployment scripts. All three test suites pass (44 backend / 39 Vitest / 15 Playwright, 1 backend test skipped without a live `OPENAI_API_KEY`).

Overall the codebase is in good shape: small, consistently layered, well-documented via the `AGENTS.md` files, and backed by a real test suite rather than token coverage. One real correctness bug was found in the AI operation validator; everything else is minor or scope-appropriate for an MVP.

**Status (2026-07-09): items 1, 3, and 4 fixed and re-tested (46 backend / 39 Vitest / 15 Playwright all passing). Item 2 deliberately left open — see note below.**

## Action items

| # | Priority | File | Issue | Status |
|---|----------|------|-------|--------|
| 1 | High | `backend/app/board_service.py:265,272,281,288,332` | AI-driven `title`/`details` fields can be persisted as the literal string `"None"` instead of empty/rejected | **Fixed** — `operation.get(field) or ""` at all 5 sites |
| 2 | Low | `backend/app/auth.py` | No rate limiting/lockout on `/api/login` (brute-forceable hardcoded credential) | **Open by design** — explicit MVP scope call (single hardcoded credential), not implemented |
| 3 | Low | `backend/app/main.py:16` | Silent insecure fallback for `SESSION_SECRET` with no startup warning | **Fixed** — logs a warning when the default is used |
| 4 | Info | `backend/tests/test_chat.py` | No test exercises a structured-output operation with an explicit JSON `null` field, which is what triggered #1 | **Fixed** — added `test_apply_operations_null_details_becomes_empty_string` and `test_apply_operations_null_title_is_rejected` |

---

## 1. `str(None)` coercion turns nulls into the literal text `"None"` (High)

`backend/app/chat_schema.py` documents that OpenAI's strict `json_schema` mode forbids `oneOf`, so every operation field is declared on every operation object and unused fields are sent as JSON `null` (see the `_nullable_string()` helper and the comment at `chat_schema.py:9-10`). The system prompt also says `title` is required for `create_card`/`edit_card`, but nothing in the JSON Schema itself enforces that — `null` is a structurally valid value for `title` too.

`_validate_operation` in `board_service.py` handles this correctly for numeric/id fields (`_parse_positive_int` and `_resolve_column_id` both explicitly check `is not None`), but not for the `title`/`details` string fields:

```python
# board_service.py:265, 272 (create_card) — same pattern at 281/288 (edit_card) and 332 (rename_column)
title = str(operation.get("title", "")).strip()
...
"details": str(operation.get("details", "")).strip(),
```

`dict.get(key, default)` only returns `default` when the key is **absent**. Since the schema guarantees the key is always present (with value `null` when unused), `operation.get("details")` returns `None`, and `str(None)` is the four-character string `"None"` — not empty. Two concrete failure modes:

- **`details`**: any AI-created or AI-edited card where the model omits details (the common case) gets `card.details == "None"` persisted and rendered in the UI, instead of an empty details section.
- **`title`**: if the model ever emits `"title": null` for `create_card`/`edit_card`/`rename_column` (schema-legal even though prompt-discouraged), the non-blank check at `board_service.py:266/282/333` passes because `"None"` is non-empty — silently creating a card or renaming a column to literally "None" instead of raising `OperationError` and being skipped by `apply_operations`.

**Fix**: use `operation.get(field) or ""` (or an explicit `is None` check) instead of `str(operation.get(field, ""))`, consistent with how `_resolve_column_id` already treats `None` as "not provided". This is a one-line change at each of the five call sites, no new abstraction needed.

**Why it wasn't caught**: every mock in `test_chat.py` either omits `details`/`title` entirely or passes an empty/real string — none pass explicit JSON `null`, which is the actual shape the real strict-schema API sends for unused fields. Recommend adding one test that mocks `complete_structured` returning `"details": None` for a `create_card` operation and asserts the persisted card has `details == ""`.

## 2. No throttling on `/api/login` (Low)

`backend/app/auth.py` compares the submitted credentials against hardcoded constants with no delay, attempt counter, or lockout. For the current single-hardcoded-user MVP scope this is explicitly acceptable (`docs/PLAN.md` assumption #2), but it's worth flagging now since `docs/DATABASE.md` already designs the schema for multiple real users — rate limiting should land before real credentials are ever stored.

## 3. Silent `SESSION_SECRET` fallback (Low)

```python
# main.py:16
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-change-me")
```

If `.env` is missing or doesn't set `SESSION_SECRET`, the app starts silently with a well-known secret and issues session cookies signed with it. `.env.example` documents the variable, so this is a configuration footgun rather than a code bug — a one-line `log.warning(...)` when the fallback is used would make a misconfigured deployment obvious instead of silently insecure. Not urgent for local-only Docker use.

## Things done well

Worth calling out since these reflect deliberate, good decisions rather than accidents:

- **`apply_operations`** (`board_service.py:370-385`) validates and applies each AI operation independently, skipping invalid ones without raising — malformed AI output can't corrupt the board or abort a batch of otherwise-valid changes. `test_chat_malformed_operations_do_not_corrupt_board` and `test_apply_operations_invalid_operation_skips_invalid_only` directly verify this.
- **Drag-and-drop** (`frontend/src/lib/dropIndex.ts`, `Board.tsx`) correctly solves a genuinely tricky problem (independent id sequences for cards vs. columns, pointer-vs-rect-center positioning, `DragOverlay` interaction with `dnd-kit`) and is one of the few areas with dedicated regression tests for the actual bugs that were previously found (see `docs/PLAN.md` Part 7 notes) — the comments explain *why*, not *what*, which is exactly right.
- **Optimistic UI + reconciliation** (`useBoard.ts`) is consistent everywhere: dispatch local state, call the API, replace with the authoritative server response, refetch on failure. No divergent one-off patterns per mutation.
- **ID string boundary**: the backend owns integer PKs and serializes everything as strings at the API boundary (`serialize_board`); the frontend treats ids as opaque strings throughout. This is a clean, consistently-applied contract — no leaking of int/string mismatches anywhere in either codebase.
- **Docker build** cleanly separates the Node build stage from the Python runtime stage, uses `uv sync --frozen --no-dev`, and never bakes `OPENAI_API_KEY` into the image (passed via `--env-file` at `docker run` time only) — good secret hygiene.
- Test suites test behavior, not implementation: e.g. Playwright asserts persistence *after reload*, not just in-memory state; backend tests hit real endpoints against a temp SQLite file rather than mocking the ORM.

## Non-issues considered and dismissed

- `board_service._get_column`/`_get_card` do O(n) linear scans over `board.columns`/`column.cards` — fine at MVP board sizes (a handful of columns/cards), not worth a data-structure change per the project's explicit "don't over-engineer" standard.
- `delete_card`/`move_card` explicitly filter the deleted/moved card out of the in-memory relationship collection by id after `db.delete`/reassignment, rather than relying on SQLAlchemy to have already updated the cached collection — this looks defensive but is actually necessary and correct, not redundant.
- `boardReducer`'s client-generated temporary card id (`generateId()`) is only ever visible for one render before the server's authoritative `SET_BOARD` reconciliation replaces it — no real collision risk.
- No XSS surface: card/column text is rendered as React children throughout, never via `dangerouslySetInnerHTML`.

## Suggested next steps

1. Fix the `title`/`details` null-coercion bug (item 1) — five one-line changes in `board_service.py`.
2. Add a regression test mocking a structured-output response with explicit `null` details/title to lock in the fix.
3. Optionally log a warning when `SESSION_SECRET` falls back to its dev default, so a misconfigured non-local deployment is loud instead of silent.

Items 2–3 in the action table (login throttling, secret warning) are scope calls for the user — flagging them, not blocking on them, since they're outside the documented MVP boundary.
