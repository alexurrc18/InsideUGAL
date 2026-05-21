# InsideUGAL - Backend API

Acesta este nucleul aplicatiei **InsideUGAL**, responsabil de logica de business, gestionarea datelor si expunerea API-urilor pentru aplicatia mobila a studentilor.

## Stack Tehnologic

- **Limbaj:** Python 3.10+
- **Framework API:** FastAPI
- **Server ASGI:** Uvicorn
- **Baza de date:** PostgreSQL (gazduit via Supabase)
- **Extensii DB:** PostGIS (pentru geolocatii si harta)
- **ORM / Conectivitate:** SQLAlchemy + geoalchemy2 + psycopg2-binary
- **Validare date:** Pydantic
- **Autentificare:** Gestionata nativ via Supabase Auth / JWT

## Instalare si Configurare

### 1. Cerinte preliminare

- Python 3.10+
- Git instalat
- Credentialele Supabase (DATABASE_URL) primite de la echipa de Infrastructura

### 2. Cloneaza repository-ul si navigheaza in backend

```bash
git clone [https://github.com/alexurrc18/InsideUGAL.git](https://github.com/alexurrc18/InsideUGAL.git)
cd InsideUGAL/backend
3. Creeaza si activeaza mediul virtual
Windows PowerShell:

Bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
Linux / macOS:

Bash
python -m venv .venv
source .venv/bin/activate
4. Instaleaza dependintele
Bash
pip install -r requirements.txt
5. Configureaza conexiunea la Supabase
Nu crea baza de date manual! Echipa de Infrastructura gestioneaza schemele si tabelele.
Creeaza un fisier .env in folderul backend/ si adauga URL-ul primit de la ei:

Fragment de cod
DATABASE_URL="postgresql://postgres:parola_secreta@adresa_supabase:5432/postgres"
6. Porneste serverul
Bash
uvicorn app.main:app --reload
API-ul va fi disponibil local la:

URL Baza: http://127.0.0.1:8000

Documentatie Swagger UI (pentru testare API): http://127.0.0.1:8000/docs

Endpoint-uri API Principale (CRUD)
Pe langa modulele standard (Users, Faculties, Courses), API-ul acopera functionalitatile cerute de Frontend:

Noutati si Evenimente
GET /api/announcements - Lista noutati

POST /api/announcements - Creare noutate (Admin/Profesor)

GET /api/events - Lista evenimente din campus

Cantina (Meniu si Produse)
GET /api/cafeteria/products - Nomenclatorul de preparate

GET /api/cafeteria/menu - Meniul structurat pe zilele saptamanii

Harta Campusului (Necesita PostGIS)
GET /api/locations - Returneaza cladirile si coordonatele GPS (Lat/Long)

Sesizari (Ticketing)
GET /api/issues - Lista sesizarilor active

POST /api/issues - Deschidere sesizare noua

PUT /api/issues/{id}/status - Modificare status (Nou -> In lucru -> Rezolvat)

Structura proiectului
Plaintext
InsideUGAL/
+-- backend/
|   +-- .env (ignorat de git)
|   +-- requirements.txt
|   +-- README.md
|   +-- app/
|       +-- api/ (Rutele FastAPI)
|       +-- db/ (Conexiunea Supabase)
|       +-- models/ (Modele SQLAlchemy si Scheme Pydantic)
|       +-- main.py (Punctul de intrare)
+-- frontend/
+-- infra/
Status implementare Backend
[x] Aplicatie FastAPI configurata

[x] Mutare cod in folderul /backend

[x] Endpoint GET /health si setari CORS

[x] Modele de baza pentru baza de date

[ ] Conectare completa PostgreSQL prin Supabase

[ ] Rute CRUD complete pentru Cantina, Harta si Sesizari

[ ] Integrare validari Role-Based Access Control (RBAC)
