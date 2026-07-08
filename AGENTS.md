# The Project Management MVP web app

## Business Requirements

This project is building a Project Management App. Key features:
- A user can sign in
- When signed in, the user sees a Kanban board representing their project
- The Kanban board has fixed columns that can be renamed
- The cards on the Kanban board can be moved with drag and drop, and edited
- There is an AI chat feature in a sidebar; the AI is able to create / edit / move one or more cards

## Limitations

For the MVP, there will only be a user sign in (hardcoded to 'user' and 'password') but the database will support multiple users for future.

For the MVP, there will only be 1 Kanban board per signed in user.

For the MVP, this will run locally (in a docker container)

## Technical Decisions

- NextJS frontend
- Python FastAPI backend, including serving the static NextJS site at /
- Everything packaged into a Docker container
- Use "uv" as the package manager for python in the Docker container
- Use OpenAI for AI calls. Set `OPENAI_API_KEY` in `.env` at the project root (see `.env.example`)
- Default model `gpt-4o-mini` (fallback `gpt-4o` on failure)
- Use SQLLite local database for the database, creating a new db if it doesn't exist
- Start and Stop server scripts for Mac, PC, Linux in scripts/

## Project status (as of Part 10 complete)

**Done:** Parts 1-10. Full app with persistent Kanban board, AI chat sidebar, and structured-output board updates via `POST /api/chat`.

**Next step for a new session:** MVP is complete. Optional polish or deployment work only.

## Starting point (historical)

The repo began with a working frontend-only Kanban demo in `frontend/`. That demo has since been integrated into the Docker/FastAPI stack, wired to auth and a persistent backend, and is no longer in-memory-only.

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever
4. When hitting issues, always identify root cause before trying a fix. Do not guess. Prove with evidence, then fix the root cause.

## Working documentation

All documents for planning and executing this project will be in the `docs/` directory.

| Document | Purpose |
|----------|---------|
| `docs/PLAN.md` | Build plan with per-part checklists, tests, success criteria. **Read this first.** |
| `docs/DATABASE.md` | SQLite schema, API JSON shape, seed behavior |

Code-specific guides (read after the plan):

| Document | Purpose |
|----------|---------|
| `frontend/AGENTS.md` | Frontend stack, layout, state, drag-and-drop, tests |
| `backend/AGENTS.md` | Backend stack, routes, DB layer, config, tests |
| `scripts/AGENTS.md` | Docker start/stop scripts |

## Running and testing

See root `README.md`. Quick reference:

```bash
./scripts/start.sh              # Docker at http://localhost:8000
cd backend && uv run pytest     # 45 backend tests (1 live AI test skipped without OPENAI_API_KEY)
cd frontend && npm run test     # 39 unit/component tests
cd frontend && npm run test:e2e # 15 Playwright e2e tests
```

Sign in with `user` / `password`.
