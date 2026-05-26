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

Tot codul Python al proiectului a fost mutat si organizat in folderul `/backend`. Branch-ul `backend` contine structura curenta pentru API, configurarea FastAPI si rutele de baza pregatite pentru integrarea cu Frontend-ul.

Baza de date folosita este **PostgreSQL**, gazduita in **Supabase**. Schemele si tabelele sunt gestionate de echipa de Infrastructura, iar backend-ul se conecteaza la ele prin variabila `DATABASE_URL` definita in fisierul `.env`.

### Endpoint-uri CRUD pregatite pentru Frontend

API-ul pregateste endpoint-uri CRUD pentru tabelele existente in SQL-ul curent:

- **Profiles**
- **Faculties**
- **Locations**
- **Cafeteria menus**
- **Complaints**
- **Announcements**

## Instalare si Configurare

### 1. Cerinte preliminare

- Python 3.10+
- Git instalat
- Credentialele Supabase (`DATABASE_URL`) primite de la echipa de Infrastructura

### 2. Cloneaza repository-ul si navigheaza in backend

```bash
git clone https://github.com/alexurrc18/InsideUGAL.git
cd InsideUGAL/backend
```

### 3. Creeaza si activeaza mediul virtual

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Linux / macOS:

```bash
python -m venv .venv
source .venv/bin/activate
```

### 4. Instaleaza dependintele

```bash
pip install -r requirements.txt
```

### 5. Configureaza conexiunea la Supabase

Nu crea baza de date manual. Echipa de Infrastructura gestioneaza schemele si tabelele.

Creeaza un fisier `.env` in folderul `backend/` si adauga URL-ul primit:

```env
DATABASE_URL="postgresql://postgres:parola_secreta@adresa_supabase:5432/postgres"
```

### 6. Porneste serverul

```bash
uvicorn app.main:app --reload
```

API-ul va fi disponibil local la:

- URL baza: `http://127.0.0.1:8000`
- Documentatie Swagger UI: `http://127.0.0.1:8000/docs`

## Endpoint-uri API Principale

Fiecare resursa expune operatiile CRUD standard:

- `POST /profiles/`, `GET /profiles/`, `GET /profiles/{item_id}`, `PUT /profiles/{item_id}`, `DELETE /profiles/{item_id}`
- `POST /faculties/`, `GET /faculties/`, `GET /faculties/{item_id}`, `PUT /faculties/{item_id}`, `DELETE /faculties/{item_id}`
- `POST /locations/`, `GET /locations/`, `GET /locations/{item_id}`, `PUT /locations/{item_id}`, `DELETE /locations/{item_id}`
- `POST /cafeteria_menus/`, `GET /cafeteria_menus/`, `GET /cafeteria_menus/{item_id}`, `PUT /cafeteria_menus/{item_id}`, `DELETE /cafeteria_menus/{item_id}`
- `POST /complaints/`, `GET /complaints/`, `GET /complaints/{item_id}`, `PUT /complaints/{item_id}`, `DELETE /complaints/{item_id}`
- `POST /announcements/`, `GET /announcements/`, `GET /announcements/{item_id}`, `PUT /announcements/{item_id}`, `DELETE /announcements/{item_id}`

## Structura proiectului

```text
InsideUGAL/
+-- backend/
|   +-- .env (ignorat de git)
|   +-- requirements.txt
|   +-- README.md
|   +-- app/
|       +-- api/ (Rutele FastAPI)
|       +-- db/ (Conexiunea Supabase)
|       +-- models/ (Modele SQLAlchemy si scheme Pydantic)
|       +-- main.py (Punctul de intrare)
+-- app/
+-- infra/
+-- README.md
```

## Status implementare Backend

| Componenta                                                   | Status   | Observatii                                                                                     |
| ------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------- |
| Structura directoare `/backend`                              | Gata     | Codul Python este organizat in folderul dedicat backend-ului.                                  |
| Aplicatie FastAPI                                            | Gata     | Configurarea de baza este prezenta pe branch-ul `backend`.                                     |
| Endpoint-uri de baza                                         | Gata     | Rutele de baza pentru Frontend sunt pregatite pe branch-ul `backend`.                          |
| Conectare PostgreSQL prin Supabase                           | In lucru | Conectarea se face prin `DATABASE_URL` din `.env`; tabelele sunt gestionate de Infrastructura. |
| CRUD pentru tabelele SQL curente                             | Gata     | Profiles, faculties, locations, cafeteria_menus, complaints, announcements. |
| Integrare RBAC                                               | In lucru | Urmeaza validari pe roluri si permisiuni.                                                      |
