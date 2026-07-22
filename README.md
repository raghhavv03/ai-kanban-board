# AI Kanban Board

A full-stack Kanban project management web application featuring an integrated AI assistant capable of managing board state through natural language chat.

## Features

- Sign-in protected Kanban board interface
- Fixed, customizable board columns
- Interactive card management with drag-and-drop support
- AI chat sidebar for automated card creation, modification, and organization using OpenAI structured outputs
- Persistent SQLite storage for users and board state
- Containerized single-container execution via Docker

## Tech Stack

- **Frontend:** Next.js (Static Export), TypeScript, Tailwind CSS
- **Backend:** Python, FastAPI, SQLite
- **AI Integration:** OpenAI API (`gpt-4o-mini` with `gpt-4o` fallback)
- **Tooling & Containerization:** Docker, `uv` (Python package manager)

## Prerequisites

- Docker Desktop or Docker Engine
- An OpenAI API key

## Quick Start (Docker)

1. Copy `.env.example` to `.env` and set your credentials:

```bash
cp .env.example .env
```

2. Configure `OPENAI_API_KEY` and `SESSION_SECRET` in `.env`.

3. Run the application using the management scripts:

- **Linux / macOS:**
  ```bash
  ./scripts/start.sh
  ```
- **Windows (PowerShell):**
  ```powershell
  .\scripts\start.ps1
  ```

4. Access the web app at `http://localhost:8000`. Default login credentials:
   - **Username:** `user`
   - **Password:** `password`

To stop the container:
- **Linux / macOS:** `./scripts/stop.sh`
- **Windows (PowerShell):** `.\scripts\stop.ps1`

## Local Development

### Backend Setup

```bash
cd backend
uv run uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm run dev
```

## Testing

Run the automated test suites:

```bash
# Backend pytest suite (45 tests)
cd backend && uv run pytest

# Frontend unit and component tests (39 tests)
cd frontend && npm run test

# End-to-end Playwright tests (15 tests)
cd frontend && npm run test:e2e
```

## Environment Variables

| Variable | Description | Default / Example |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API key required for AI chat operations | `sk-...` |
| `SESSION_SECRET` | Secret key used for signing session cookies | `dev-secret-change-in-production` |

## Project Structure

- `frontend/` - Next.js web interface and Playwright / Vitest test files
- `backend/` - FastAPI backend, SQLite database layer, and AI agent routes
- `scripts/` - Shell and PowerShell startup and shutdown scripts
- `docs/` - System architecture, database schema, and implementation plan documents
