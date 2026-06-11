#!/bin/bash
set -e

if [ ! -f .env ]; then
  echo "--- Creating dummy .env for CI ---"
  cp .env.example .env || touch .env
  echo "POSTGRES_PASSWORD=SuperSecretDummyPassword123!" >> .env
  echo "SUPABASE_JWT_SECRET=dummy_secret" >> .env
  echo "PG_META_CRYPTO_KEY=dummy_crypto_key" >> .env
  echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" >> .env
  echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:8082" >> .env
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy_anon" >> .env
fi

echo "--- Validating Docker Compose Configuration ---"
docker compose config -q

echo "--- Creating External Network (if missing) ---"
docker network create coolify || true

# Prevent Docker from creating directories when files are expected for volumes
echo "--- Ensuring SQL init files exist ---"
mkdir -p ./supabase/migrations/
touch ./supabase/migrations/202605280001_init.sql
mkdir -p ./supabase/
touch ./supabase/seed.sql

echo "--- Starting Containers (Detached Mode) ---"
if ! docker compose up -d; then
  echo "❌ EROARE: docker compose up a picat. Afișez logurile bazei de date:"
  docker compose logs supabase-db
  exit 1
fi

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
