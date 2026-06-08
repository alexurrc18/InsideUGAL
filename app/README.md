# InsideUGAL - Backend

## Purpose

Backend logic for the **InsideUGAL** platform, built with **FastAPI**.  
It exposes REST endpoints for managing academic profiles, complaints, announcements, locations, products, daily menus and cafeteria menus, all backed by a PostgreSQL database and integrated with Supabase (auth + storage). It also integrează serviciile Asistentului Virtual (RAG) pentru asistența studenților pe baza regulamentelor din campus.

## Architecture

```text
app/
  api/           # FastAPI routers + endpoint logic
    auth.py      # Registration / login helpers
    auth_deps.py # Current user / role dependencies
    crud.py      # Generic CRUD router factory
    *.py         # Domain routers (profiles, complaints, announcements, ...)
  db/
    database.py  # SQLAlchemy async engine, session factory, get_db dependency
  models/
    models.py    # SQLAlchemy ORM models (Profile, Complaint, Announcement, ...)
    schemas.py   # Pydantic schemas (request / response DTOs)
  repositories/
    *.py         # Repository classes (data access layer, one per aggregate)
  main.py        # FastAPI app, middleware, router registration
```

### Layer responsibilities

- **API layer** (`api/`): HTTP handling, auth, validation, business rules orchestration.
- **Repository layer** (`repositories/`): Database queries and transactions; keeps ORM logic out of routers.
- **Model layer** (`models/`): Database schema (`models.py`) and serialization / deserialization rules (`schemas.py`).
- **DB layer** (`db/`): Engine configuration, session management and connection lifecycle.

## Prerequisites

- Python 3.10+
- PostgreSQL (local or remote)
- Supabase instance (for auth and storage)

## Installation

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
```

## Running the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at ([Swagger UI](http://127.0.0.1:8000/docs)).

## Running tests

Integration tests require a running database and a properly configured `.env` file.

```bash
python -m pytest tests/ --cov=app
```

## Environment variables

Copy `.env.example` to `.env` and fill in your local credentials:

```bash
cp .env.example .env
```

Required variables include (at minimum):

- `DATABASE_URL` - PostgreSQL connection string (asyncpg driver)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` - Supabase API keys
- `SUPABASE_JWT_SECRET` - Secret used to verify Supabase access tokens

Never commit real credentials to version control.
Infrastructură Supabase (Note pentru dev)
Porturile custom pentru dezvoltare locală sunt:

DB Port: 54399

Auth/API Port: 54325
