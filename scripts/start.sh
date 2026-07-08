#!/usr/bin/env bash
# Build and run the Kanban app container (Mac/Linux).
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE=kanban-app
CONTAINER=kanban-app

docker build -t "$IMAGE" .
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

ENV_ARG=()
[ -f .env ] && ENV_ARG=(--env-file .env)

docker run -d --name "$CONTAINER" -p 8000:8000 "${ENV_ARG[@]}" "$IMAGE"

echo "Kanban app running at http://localhost:8000"
