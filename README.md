# InsideUGAL - Backend API

Acesta este nucleul aplicatiei **InsideUGAL**, responsabil de logica de business,
gestionarea datelor si autentificarea utilizatorilor in cadrul platformei academice.

## Stack Tehnologic

- **Limbaj:** Python 3.10+
- **Framework API:** FastAPI
- **Server ASGI:** Uvicorn
- **Baza de date:** PostgreSQL
- **ORM / Conectivitate:** SQLAlchemy
- **Validare date:** Pydantic
- **Autentificare:** JWT + parole hash-uite

## Instalare si Configurare

### 1. Cerinte preliminare

- Python 3.10+
- Git instalat
- PostgreSQL instalat si pornit local sau disponibil printr-un serviciu extern
- Un client PostgreSQL, de exemplu `psql` sau pgAdmin

### 2. Cloneaza repository-ul

```bash
git clone https://github.com/alexurrc18/InsideUGAL.git
cd InsideUGAL
```

### 3. Creeaza si activeaza mediul virtual

```bash
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Linux / macOS
source .venv/bin/activate
```

### 4. Instaleaza dependintele

Daca exista un fisier `requirements.txt`:

```bash
pip install -r requirements.txt
```

Daca proiectul nu are inca `requirements.txt`, dependintele minime sunt:

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-dotenv passlib[bcrypt] python-jose[cryptography]
```

### 5. Configureaza baza de date PostgreSQL

Creeaza o baza de date pentru aplicatie:

```sql
CREATE DATABASE insideugal;
```

Creeaza fisierul `.env` in radacina proiectului:

```env
DATABASE_URL=postgresql://postgres:parola_ta@localhost:5432/insideugal
SECRET_KEY=schimba_aceasta_cheie
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Nota: in codul actual conexiunea la baza de date poate fi inca setata pe SQLite in
`app/db/database.py`. Pentru PostgreSQL, configurarea trebuie citita din
`DATABASE_URL`.

### 6. Porneste serverul

```bash
uvicorn app.main:app --reload
```

API-ul va fi disponibil la:

- `http://127.0.0.1:8000`
- documentatie Swagger: `http://127.0.0.1:8000/docs`
- documentatie ReDoc: `http://127.0.0.1:8000/redoc`

## Endpoint minim

Serverul trebuie sa expuna cel putin unul dintre urmatoarele endpoint-uri:

```http
GET /
GET /health
```

Raspuns asteptat:

```json
{
  "message": "backend-ul ruleaza"
}
```

sau:

```json
{
  "status": "ok"
}
```

## Modele principale

Modelele recomandate pentru InsideUGAL sunt:

- **User** - contul principal al utilizatorului
- **Role** - roluri precum admin, student, profesor
- **Student** - profil academic pentru studenti
- **Professor** - profil academic pentru profesori
- **Faculty** - facultati din cadrul universitatii
- **Course** - cursuri asociate facultatilor si profesorilor
- **Announcement / Event** - anunturi si evenimente academice

## Autentificare si autorizare

Functionalitatile de autentificare trebuie sa includa:

- inregistrare utilizator
- autentificare utilizator
- parole hash-uite, nu salvate in clar
- generare token JWT
- middleware / dependency pentru rute protejate
- verificare rol pentru actiuni de admin sau profesor

## Endpoint-uri API propuse

### Endpoint-uri autentificare

```http
POST /auth/register
POST /auth/login
GET /users/me
```

### Utilizatori

```http
GET /users
GET /users/{user_id}
PUT /users/{user_id}
DELETE /users/{user_id}
```

### Facultati

```http
GET /faculties
POST /faculties
GET /faculties/{faculty_id}
PUT /faculties/{faculty_id}
DELETE /faculties/{faculty_id}
```

### Cursuri

```http
GET /courses
POST /courses
GET /courses/{course_id}
PUT /courses/{course_id}
DELETE /courses/{course_id}
```

### Anunturi si evenimente

```http
GET /announcements
POST /announcements
GET /announcements/{announcement_id}
PUT /announcements/{announcement_id}
DELETE /announcements/{announcement_id}
```

`POST`, `PUT` si `DELETE` pentru anunturi ar trebui permise doar pentru admini sau
profesori.

## Validare si erori

API-ul trebuie sa valideze datele primite prin scheme Pydantic:

- email valid pentru utilizatori
- parola cu lungime minima
- campuri obligatorii verificate
- roluri acceptate controlat
- ID-uri existente in baza de date

Erorile trebuie returnate clar, cu status code potrivit:

- `400 Bad Request` pentru date invalide
- `401 Unauthorized` pentru lipsa autentificarii
- `403 Forbidden` pentru lipsa permisiunilor
- `404 Not Found` pentru resurse inexistente
- `409 Conflict` pentru duplicate, de exemplu email deja folosit

## Structura proiectului

```text
InsideUGAL/
+-- app/
|   +-- api/
|   |   +-- announcements.py
|   |   +-- courses.py
|   |   +-- faculties.py
|   |   +-- users.py
|   +-- db/
|   |   +-- database.py
|   +-- models/
|   |   +-- models.py
|   |   +-- schemas.py
|   +-- main.py
+-- .env
+-- requirements.txt
+-- README.md
```

## Status backend

Implementat / necesar pentru un backend minim:

- [x] Aplicatie FastAPI
- [x] Endpoint `GET /`
- [x] Endpoint `GET /health`
- [x] Rute pentru utilizatori, facultati, cursuri si anunturi
- [ ] Conectare PostgreSQL prin `DATABASE_URL`
- [ ] Autentificare completa cu register/login
- [ ] Hash parole
- [ ] JWT pentru rute protejate
- [ ] Validari si erori standardizate
