.PHONY: up down logs test seed migrate reset validate-env check-db compose-smoke

up:
	docker compose up -d

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
	docker compose down -v && docker compose up -d

validate-env:
	powershell -ExecutionPolicy Bypass -File scripts/validate-compose-env.ps1

check-db:
	powershell -ExecutionPolicy Bypass -File scripts/check-compose-db.ps1

compose-smoke: validate-env
	docker compose down -v
	docker compose up -d
	powershell -ExecutionPolicy Bypass -File scripts/check-compose-db.ps1
