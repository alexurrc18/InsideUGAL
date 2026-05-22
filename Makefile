.PHONY: up down logs test seed migrate reset

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

test:
	pytest backend/ && npm --prefix frontend test

seed:
	docker compose exec backend python scripts/seed.py

migrate:
	docker compose exec backend python scripts/migrate.py

reset:
	docker compose down -v && docker compose up -d