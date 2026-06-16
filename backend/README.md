# InsideUGAL - Backend API

Acesta este nucleul aplicatiei **InsideUGAL**, responsabil de logica de business, gestionarea datelor si expunerea API-urilor pentru aplicatia mobila a studentilor.

## Stack Tehnologic

- **Limbaj:** Python 3.10+
- **Framework API:** FastAPI
- **Server ASGI:** Uvicorn
- **Baza de date:** PostgreSQL, gazduit via Supabase
- **Extensii DB:** PostGIS, pentru geolocatii si harta
- **ORM / Conectivitate:** SQLAlchemy + geoalchemy2 + psycopg2-binary
- **Validare date:** Pydantic
- **Autentificare:** Gestionata nativ via Supabase Auth / JWT

## Backend

Codul activ al API-ului este in `app/`. Folderul `backend/` pastreaza configuratia Docker/requirements si notele pentru rularea serviciului.

Baza de date folosita este **PostgreSQL**, gazduita in **Supabase**. Schemele si tabelele sunt gestionate de echipa de infrastructura, iar backend-ul se conecteaza la ele prin variabila `DATABASE_URL` definita in fisierul `.env`.

## Progres backend

Pana acum pe partea de backend au fost implementate:

- FastAPI app cu routere pentru autentificare, profile, anunturi, sesizari, locatii, facultati, categorii, produse, meniuri zilnice si meniuri cantina.
- SQLAlchemy async cu repository layer in `app/repositories/` pentru acces la baza de date.
- Scheme Pydantic pentru request/response in `app/models/schemas.py`.
- Integrare Supabase pentru Auth/JWT si Storage upload pentru imagini la anunturi si sesizari.
- Verificari de rol pentru admin, responsabili, profesori si utilizatori autentificati.
- Conversie coordonate PostGIS pentru raspunsurile de locatii.
- Paginare bounded pentru endpointurile de lista, ca aplicatia mobila sa nu primeasca toate randurile din baza de date intr-un singur request.

### Contract paginare

Endpointurile de tip lista accepta:

- `page`, default `1`, minim `1`
- `size`, default `20`, maxim `50`

Raspunsul are forma:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "size": 20,
  "total_pages": 0
}
```

Endpointuri paginate: `/announcements`, `/complaints`, `/locations`, `/faculties`, `/categories`, `/products`, `/profiles`, `/daily-menus`, `/cafeteria_menus`.

## Instalare si Configurare

### 1. Cerinte preliminare

- Python 3.10+
- Git instalat
- Credentialele Supabase (`DATABASE_URL`) primite de la echipa de infrastructura

### 2. Clonare si navigare

```bash
git clone https://github.com/alexurrc18/InsideUGAL.git
cd InsideUGAL/backend
```
