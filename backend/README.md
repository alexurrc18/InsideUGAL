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

Tot codul Python al proiectului este organizat in folderul `/backend`. Branch-ul `backend` contine structura curenta pentru API, configurarea FastAPI si rutele de baza pregatite pentru integrarea cu Frontend-ul.

Baza de date folosita este **PostgreSQL**, gazduita in **Supabase**. Schemele si tabelele sunt gestionate de echipa de Infrastructura, iar backend-ul se conecteaza la ele prin variabila `DATABASE_URL` definita in fisierul `.env`.

## Instalare si Configurare

### 1. Cerinte preliminare

- Python 3.10+
- Git instalat
- Credentialele Supabase (`DATABASE_URL`) primite de la echipa de Infrastructura

### 2. Clonare si navigare

```bash
git clone https://github.com/alexurrc18/InsideUGAL.git
cd InsideUGAL/backend
```
