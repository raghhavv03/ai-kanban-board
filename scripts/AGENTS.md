# Scripts

Start and stop scripts for running the Kanban app as a Docker container locally.

- `start.sh` / `stop.sh` - Mac and Linux (bash)
- `start.ps1` / `stop.ps1` - Windows (PowerShell)

`start` builds the image (`kanban-app`), removes any existing container, and runs a new one mapping host port 8000 to container port 8000. If a `.env` file exists at the project root it is passed with `--env-file`.

`stop` removes the running `kanban-app` container.

## Usage

Mac/Linux:

```
./scripts/start.sh
./scripts/stop.sh
```

Windows:

```
./scripts/start.ps1
./scripts/stop.ps1
```

App is served at http://localhost:8000.
