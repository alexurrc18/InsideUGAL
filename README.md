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

API-ul pregateste endpoint-uri CRUD pentru urmatoarele module:

- **Noutati**
- **Cantina**
- **Harta**
- **Sesizari**
- **Facultati**
- **Cursuri**

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

Pe langa modulele standard, API-ul acopera functionalitatile cerute de Frontend:

### Noutati si Evenimente

- `GET /api/announcements` - Lista noutati
- `POST /api/announcements` - Creare noutate
- `GET /api/events` - Lista evenimente din campus

### Cantina

- `GET /api/cafeteria/products` - Nomenclatorul de preparate
- `GET /api/cafeteria/menu` - Meniul structurat pe zilele saptamanii

### Harta Campusului

- `GET /api/locations` - Returneaza cladirile si coordonatele GPS

### Sesizari

- `GET /api/issues` - Lista sesizarilor active
- `POST /api/issues` - Deschidere sesizare noua
- `PUT /api/issues/{id}/status` - Modificare status

### Facultati

- `GET /api/faculties` - Lista facultati
- `POST /api/faculties` - Creare facultate
- `PUT /api/faculties/{id}` - Actualizare facultate
- `DELETE /api/faculties/{id}` - Stergere facultate

### Cursuri

- `GET /api/courses` - Lista cursuri
- `POST /api/courses` - Creare curs
- `PUT /api/courses/{id}` - Actualizare curs
- `DELETE /api/courses/{id}` - Stergere curs

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

| Componenta | Status | Observatii |
| --- | --- | --- |
| Structura directoare `/backend` | Gata | Codul Python este organizat in folderul dedicat backend-ului. |
| Aplicatie FastAPI | Gata | Configurarea de baza este prezenta pe branch-ul `backend`. |
| Endpoint-uri de baza | Gata | Rutele de baza pentru Frontend sunt pregatite pe branch-ul `backend`. |
| Conectare PostgreSQL prin Supabase | In lucru | Conectarea se face prin `DATABASE_URL` din `.env`; tabelele sunt gestionate de Infrastructura. |
| CRUD Noutati, Cantina, Harta, Sesizari, Facultati si Cursuri | In lucru | Endpoint-urile sunt pregatite pentru integrarea cu Frontend-ul. |
| Integrare RBAC | In lucru | Urmeaza validari pe roluri si permisiuni. |
