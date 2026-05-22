# InsideUGAL Backend

Backend-ul InsideUGAL expune API-ul folosit de aplicația Frontend pentru noutăți, cantină, hartă, sesizări, facultăți și cursuri. Serviciul este construit cu FastAPI și se conectează la baza de date PostgreSQL administrată în Supabase de echipa de Infrastructură.

## Stack tehnologic

| Componentă | Rol |
| --- | --- |
| Python | Limbajul principal pentru backend |
| FastAPI | Framework API REST |
| Uvicorn | Server ASGI pentru rularea aplicației FastAPI |
| PostgreSQL (Supabase) | Baza de date principală, administrată de echipa de Infrastructură |
| PostGIS | Extensie PostgreSQL pentru date geografice folosite de modulul Hartă |
| SQLAlchemy | ORM și layer de conectare la baza de date |
| geoalchemy2 | Integrare SQLAlchemy pentru tipuri și operații geografice PostGIS |

## Structura proiectului

Tot codul Python al backend-ului trebuie să fie în `InsideUGAL/backend/app/`.

```text
InsideUGAL/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   │   ├── news.py
│   │   │   ├── cafeteria.py
│   │   │   ├── map.py
│   │   │   ├── reports.py
│   │   │   ├── faculties.py
│   │   │   └── courses.py
│   │   └── services/
│   ├── .env
│   ├── README.md
│   └── requirements.txt
├── .venv/
└── README.md
```

## Instalare

1. Clonează repository-ul:

```bash
git clone <repository-url>
cd InsideUGAL
```

2. Creează și activează mediul virtual:

Pe Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Pe macOS/Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

3. Instalează dependențele backend-ului:

```bash
cd backend
pip install -r requirements.txt
```

## Configurare `.env`

În folderul `backend/`, creează fișierul secret `.env`.

```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>:<port>/<database>
```

Valoarea `DATABASE_URL` este primită de la echipa de Infrastructură. Baza de date este găzduită în Supabase, iar tabelele sunt create și administrate de ei. Backend-ul InsideUGAL doar se conectează la schema existentă și consumă datele prin SQLAlchemy.

Fișierul `.env` nu se comite în Git.

## Rulare locală

Din folderul `backend/`:

```bash
uvicorn app.main:app --reload
```

API-ul va fi disponibil local la:

```text
http://127.0.0.1:8000
```

Documentația interactivă FastAPI:

```text
http://127.0.0.1:8000/docs
```

## Endpoint-uri CRUD cerute de Frontend

### Noutăți

| Metodă | Endpoint | Descriere |
| --- | --- | --- |
| GET | `/news` | Listează toate noutățile |
| GET | `/news/{id}` | Returnează o noutate după ID |
| POST | `/news` | Creează o noutate |
| PUT | `/news/{id}` | Actualizează o noutate |
| DELETE | `/news/{id}` | Șterge o noutate |

### Cantină

| Metodă | Endpoint | Descriere |
| --- | --- | --- |
| GET | `/cafeteria` | Listează meniurile sau informațiile de cantină |
| GET | `/cafeteria/{id}` | Returnează un element de cantină după ID |
| POST | `/cafeteria` | Creează un element de cantină |
| PUT | `/cafeteria/{id}` | Actualizează un element de cantină |
| DELETE | `/cafeteria/{id}` | Șterge un element de cantină |

### Hartă

| Metodă | Endpoint | Descriere |
| --- | --- | --- |
| GET | `/map` | Listează punctele de interes de pe hartă |
| GET | `/map/{id}` | Returnează un punct de interes după ID |
| POST | `/map` | Creează un punct de interes |
| PUT | `/map/{id}` | Actualizează un punct de interes |
| DELETE | `/map/{id}` | Șterge un punct de interes |

### Sesizări

| Metodă | Endpoint | Descriere |
| --- | --- | --- |
| GET | `/reports` | Listează sesizările |
| GET | `/reports/{id}` | Returnează o sesizare după ID |
| POST | `/reports` | Creează o sesizare |
| PUT | `/reports/{id}` | Actualizează statusul sau conținutul unei sesizări |
| DELETE | `/reports/{id}` | Șterge o sesizare |

### Facultăți

| Metodă | Endpoint | Descriere |
| --- | --- | --- |
| GET | `/faculties` | Listează facultățile |
| GET | `/faculties/{id}` | Returnează o facultate după ID |
| POST | `/faculties` | Creează o facultate |
| PUT | `/faculties/{id}` | Actualizează o facultate |
| DELETE | `/faculties/{id}` | Șterge o facultate |

### Cursuri

| Metodă | Endpoint | Descriere |
| --- | --- | --- |
| GET | `/courses` | Listează cursurile |
| GET | `/courses/{id}` | Returnează un curs după ID |
| POST | `/courses` | Creează un curs |
| PUT | `/courses/{id}` | Actualizează un curs |
| DELETE | `/courses/{id}` | Șterge un curs |

## Status implementare

| Zonă | Status | Observații |
| --- | --- | --- |
| Folder `backend/` | Gata | Există folderul backend și fișierul `requirements.txt` |
| FastAPI | Gata | Framework-ul este inclus în dependențele backend-ului |
| Uvicorn | Gata | Serverul ASGI este inclus în dependențe |
| CORS | Gata | Necesită configurare în `app.main` pentru originile Frontend aprobate |
| PostgreSQL Supabase | Urmează | Se configurează prin `DATABASE_URL` primit de la Infrastructură |
| PostGIS | Urmează | Tabelele și extensiile sunt administrate de Infrastructură |
| SQLAlchemy | Gata | Inclus în dependențe pentru conectarea la baza de date |
| geoalchemy2 | Urmează | Trebuie adăugat în `requirements.txt` și folosit pentru câmpurile geografice |
| Mutarea codului în `backend/app/` | Urmează | Codul Python trebuie centralizat sub `InsideUGAL/backend/app/` |
| Modele ORM | Urmează | Se aliniază cu tabelele create de Infrastructură |
| Scheme Pydantic | Urmează | Necesare pentru validarea request/response |
| Endpoint-uri CRUD | Urmează | Se implementează pentru Noutăți, Cantină, Hartă, Sesizări, Facultăți și Cursuri |
| Testare API | Urmează | Se validează cu `/docs` și teste automate după stabilizarea endpoint-urilor |

## Responsabilități

Echipa Backend implementează API-ul, conectarea la Supabase și logica de acces la date. Echipa de Infrastructură furnizează `DATABASE_URL`, creează tabelele, gestionează schema PostgreSQL și activează extensiile necesare, inclusiv PostGIS.
