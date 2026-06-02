# InsideUGAL - Backend API

Acesta este nucleul aplicației **InsideUGAL**, responsabil de logica de business, gestionarea datelor și expunerea API-urilor pentru aplicația mobilă a studenților.

## Stack Tehnologic

- **Limbaj:** Python 3.10+
- **Framework API:** FastAPI
- **Server ASGI:** Uvicorn
- **Bază de date:** PostgreSQL, găzduit via Supabase
- **Extensii DB:** PostGIS, pentru geolocații și hartă
- **ORM / Conectivitate:** SQLAlchemy + geoalchemy2 + psycopg2-binary
- **Validare date:** Pydantic
- **Autentificare:** Gestionată nativ via Supabase Auth / JWT

## Backend

Tot codul Python al proiectului este organizat în folderul `/backend`. Branch-ul `backend` conține structura curentă pentru API, configurarea FastAPI și rutele de bază pregătite pentru integrarea cu Frontend-ul.

Baza de date folosită este **PostgreSQL**, găzduită în **Supabase**. Schemele și tabelele sunt gestionate de echipa de Infrastructură, iar backend-ul se conectează la ele prin variabila `DATABASE_URL` definită în fișierul `.env`.

## Instalare și Configurare

### 1. Cerințe preliminare

- Python 3.10+
- Git instalat
- Credențialele Supabase (`DATABASE_URL`) primite de la echipa de Infrastructură

### 2. Clonare și navigare

```bash
git clone [https://github.com/alexurrc18/InsideUGAL.git](https://github.com/alexurrc18/InsideUGAL.git)
cd InsideUGAL/backend
```
