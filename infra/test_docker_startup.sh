#!/bin/bash
set -e

echo "--- Validating Docker Compose Configuration ---"
docker compose config -q

echo "--- Creating External Network (if missing) ---"
docker network create coolify || true

echo "--- Starting Containers (Detached Mode) ---"
docker compose up -d

echo "--- Waiting for Services to be Healthy ---"
# Give it some time or check specific health status
sleep 10

echo "--- Checking Container Status ---"
docker ps

# Optional: Add specific health checks here, e.g.:
# curl -f http://localhost:8000/health || exit 1

echo "--- Shutting Down Cleanly ---"
docker compose down

echo "--- Infrastructure Validation Successful ---"
