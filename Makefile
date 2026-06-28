.PHONY: up down logs test seed migrate reset validate-env check-db compose-smoke

SERVICES: dashboard mobile backend llm

up:
	docker compose up -d --build --force-recreate $(SERVICES)

up-all:
	docker compose up -d --build --force-recreate

down:
	docker compose down

logs:
	docker compose logs -f

test:
	pytest backend/ && npm --prefix Frontend/Dashboard/dashboard-insideugal test

seed:
	docker compose exec backend python scripts/seed.py

migrate:
	docker compose exec backend python scripts/migrate.py

reset:
	docker compose down && docker compose up -d --build --force-recreate $(SERVICES)

reset-all:
	docker compose down && docker compose up -d --build --force-recreate

reset-hard:
	docker compose down -v && docker compose up -d --build --force-recreate $(SERVICES)

reset-hard-all:
	docker compose down -v && docker compose up -d --build --force-recreate

validate-env:
	powershell -ExecutionPolicy Bypass -File scripts/validate-compose-env.ps1

check-db:
	powershell -ExecutionPolicy Bypass -File scripts/check-compose-db.ps1

compose-smoke: validate-env
	docker compose down -v
	docker compose up -d
	powershell -ExecutionPolicy Bypass -File scripts/check-compose-db.ps1
