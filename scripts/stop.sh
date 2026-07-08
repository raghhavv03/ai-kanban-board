#!/usr/bin/env bash
# Stop and remove the Kanban app container (Mac/Linux).
set -euo pipefail

CONTAINER=kanban-app

if docker rm -f "$CONTAINER" >/dev/null 2>&1; then
  echo "Stopped $CONTAINER"
else
  echo "$CONTAINER is not running"
fi
