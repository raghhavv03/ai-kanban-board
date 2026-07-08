# Scripts

Start and stop scripts for running the Kanban app as a Docker container locally.

- `start.sh` / `stop.sh` - Mac and Linux (bash)
- `start.ps1` / `stop.ps1` - Windows (PowerShell)

## What start does

1. Builds the Docker image `kanban-app` from the root `Dockerfile` (multi-stage: NextJS static build + Python/FastAPI runtime)
2. Removes any existing `kanban-app` container
3. Runs a new container mapping host port **8000** to container port **8000**
4. If `.env` exists at the project root, passes it with `--env-file` (for `OPENROUTER_API_KEY`, `SESSION_SECRET`, etc.)

## What stop does

Removes the running `kanban-app` container.

## Usage

Mac/Linux:

```bash
./scripts/start.sh
./scripts/stop.sh
```

Windows:

```powershell
./scripts/start.ps1
./scripts/stop.ps1
```

App is served at http://localhost:8000. Sign in with `user` / `password`.

## Notes

- SQLite database is stored inside the container at `/app/data/kanban.db`. Data is lost if the container is removed without a volume mount (acceptable for MVP local dev).
- For development without Docker, see root `README.md` (run backend and frontend separately).
