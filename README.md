<a name="readme-top"></a>
<div align="center">
  <h3 align="center">InsideUGAL — Platformă Universitară</h3>
  <p align="center">
    Platformă internă de colaborare și coordonare pentru studenții și coordonatorii<br>Universității "Dunărea de Jos" din Galați.
    <br />
  </p>
  <br />
  <img src="./assets/universitate.jpg" alt="InsideUGAL thumbnail" width="760">
</div>

<br />
<div align="center">
  <a href="https://nextjs.org/">
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  </a>
  <a href="https://reactnative.dev/">
    <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native">
  </a>
  <a href="https://expo.dev/">
    <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  </a>
  <a href="https://fastapi.tiangolo.com/">
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  </a>
  <a href="https://supabase.com/">
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  </a>
  <a href="https://www.docker.com/">
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  </a>
</div>

<br />

Proiect dezvoltat în cadrul practicii la **Thecon**, cu scopul de a centraliza activitățile academice și de a simplifica comunicarea între studenți, reprezentanți, profesori și administratori. InsideUGAL reunește un panou de control web, o aplicație mobilă și un asistent virtual AI într-un singur ecosistem containerizat.

---

## Cuprins

- [Features](#features)
- [Roluri și Permisiuni](#roluri-și-permisiuni)
- [Pornire Rapidă](#pornire-rapidă)
- [Dezvoltare Locală](#dezvoltare-locală)
- [Variabile de Mediu](#variabile-de-mediu)
- [Documentație](#documentație)
- [Acknowledgements](#acknowledgements)

---

## Features

**Dashboard Web (Next.js + TypeScript)**
Panou de control pentru coordonatori și angajați, cu următoarele pagini implementate:
- **Noutăți** — gestionarea anunțurilor și evenimentelor
- **Sesizări** — vizualizarea și procesarea sesizărilor studenților
- **Cantină** — administrarea meniului și produselor
- **Hărți** — gestionarea locațiilor și punctelor de interes din campus
- **Facultăți** — administrarea structurii facultăților
- **Conturi** — gestionarea utilizatorilor și rolurilor
- **Notificări** — trimiterea notificărilor către studenți

**Aplicație Mobilă (React Native + Expo)**
Interfață pentru studenți, cu suport nativ și web, cu următoarele ecrane implementate:
- **Acasă** — feed anunțuri pe categorii, cu detaliu anunț și eveniment
- **Cantină** — meniu zilnic
- **Hartă** — harta interactivă a campusului cu locații și puncte de interes
- **Sesizări** — lista sesizărilor proprii, adăugare și detalii
- **ACE** — chatbot AI integrat pentru asistență studenți
- **Notificări** — feed cu stare citit/necitit persistată local, navigare la conținut intern sau extern
- **Setări** — temă (light/dark), limbă, preferințe cont
- **Onboarding** — solicitare permisiuni notificări și locație la primul acces

**Backend REST (FastAPI)**
API async cu autentificare JWT prin Supabase, upload fișiere în Supabase Storage, paginare pentru toate colecțiile și suport PostGIS pentru coordonate geografice pe hartă.

**Asistent Virtual AI (RAG + Gemini)**
Chatbot bazat pe Google Gemini și `pgvector` care răspunde întrebărilor studenților pe baza regulamentelor campusului. Include cache semantic, circuit breaker (`pybreaker`) și retry exponențial (`tenacity`) pentru reziliență în producție.

**Smart News Parser**
Extrage automat metadate structurate din anunțuri text prin OpenRouter (`gpt-4o-mini`) cu fallback pe Gemini, și generează bannere vizuale prin modele de imagine AI.

**Infrastructură Docker**
Întregul ecosistem este orchestrat prin Docker Compose. Un singur `docker compose up` pornește toate serviciile: frontend, backend, LLM și baza de date.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Roluri și Permisiuni

| Rol | Nivel | Acces |
|-----|-------|-------|
| **Administrator** | Acces total | Gestionează conturi, roluri, inventar cantină, validează locații, închide sesizări |
| **Profesor / Staff** | Gestiune conținut | Postează și editează noutăți și evenimente; vizualizare completă pe toate modulele |
| **Student Responsabil** | Gestiune operativă | Poate adăuga și modifica doar propriile anunțuri și evenimente |
| **Student** | Vizualizare & raportare | Consultă meniu, hartă, știri; raportează sesizări; editează propriul profil |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---


## Pornire Rapidă

Întregul ecosistem este containerizat. Nu este necesară instalarea dependențelor local.

### Makefile (recomandat)

Toate operațiunile comune sunt disponibile prin `make`:

| Comandă | Descriere |
|---------|-----------|
| `make up` | Pornește serviciile principale (dashboard, mobile, backend, llm) |
| `make up-all` | Pornește toate serviciile inclusiv Supabase local |
| `make down` | Oprește toate containerele |
| `make logs` | Urmărește logurile în timp real (`docker compose logs -f`) |
| `make reset` | Restart complet fără ștergerea volumelor |
| `make reset-hard` | Restart cu ștergerea volumelor — **date locale pierdute** |
| `make seed` | Populează baza de date cu date de test |
| `make migrate` | Rulează migrările bazei de date |
| `make test` | Rulează testele backend și dashboard |
| `make compose-smoke` | Validare completă: env → down -v → up → check-db |

**Pornire obișnuită:**

```bash
make up
```

**Primul setup sau după conflicte de volum:**

```bash
make reset-hard
make seed
```

### Fără Make (PowerShell / Windows)

```powershell
# Validează .env (chei Supabase, valori nerezolvate)
powershell -ExecutionPolicy Bypass -File scripts/validate-compose-env.ps1

docker compose down -v
docker compose up -d

# Verifică dacă supabase-db este healthy și seed data a fost încărcată
powershell -ExecutionPolicy Bypass -File scripts/check-compose-db.ps1
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Dezvoltare Locală

### Dashboard Web

```bash
cd Frontend/Dashboard/dashboard-insideugal
npm install
npm run dev
```

Disponibil la `http://localhost:3000`.

### Aplicație Mobilă

```bash
cd Frontend/Mobile
npm install
npx expo start
```

Scanează codul QR cu Expo Go sau rulează pe emulator Android / simulator iOS.

### Backend API

```bash
cd app
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI disponibil la `http://localhost:8000/docs`.

### Asistent Virtual AI

```bash
cd LLM
# Pornire prin Docker (recomandat)
docker compose up llm

# Sau local
pip install -r requirements.txt
uvicorn combined_app:app --reload --port 5000
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Variabile de Mediu

Copiați `.env.example` în `.env` la rădăcina proiectului și completați valorile. **Nu commitați fișiere `.env` reale.**

```bash
cp .env.example .env
```

Pentru modulul LLM există un fișier separat:

```bash
cp LLM/.env.example LLM/.env
```

**Postgres / Supabase DB**

| Variabilă | Descriere |
|-----------|-----------|
| `POSTGRES_PASSWORD` | Parola bazei de date PostgreSQL |
| `POSTGRES_HOST_PORT` | Portul expus local (default: `54399`) |
| `DATABASE_URL` | Connection string complet (asyncpg) |

**Backend (FastAPI)**

| Variabilă | Descriere |
|-----------|-----------|
| `ENVIRONMENT` | `development` sau `production` |
| `ALLOWED_HOSTS` | Hosturi permise, separate prin virgulă |
| `ALLOWED_ORIGINS` | Origini CORS permise, separate prin virgulă |
| `LLM_SERVICE_URL` | Adresa internă a containerului LLM (ex: `http://llm:8000`) |

**Supabase**

| Variabilă | Descriere |
|-----------|-----------|
| `SUPABASE_URL` | URL-ul Kong gateway (intern Docker) |
| `SUPABASE_ANON_KEY` | Cheia publică Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Cheia de serviciu Supabase (backend) |
| `SUPABASE_SERVICE_KEY` | Alias identic cu `SERVICE_ROLE_KEY`, folosit de modulul LLM |
| `SUPABASE_JWT_SECRET` | Secret pentru verificarea token-urilor JWT |
| `SUPABASE_JWT_AUDIENCE` | Audience JWT (default: `authenticated`) |

**Frontend Dashboard (Next.js)**

| Variabilă | Descriere |
|-----------|-----------|
| `NEXT_PUBLIC_BACKEND_URL` | URL-ul API-ului backend accesibil din browser |
| `NEXT_PUBLIC_SUPABASE_URL` | URL-ul Supabase accesibil din browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cheia publică Supabase pentru dashboard |

**LLM / AI**

| Variabilă | Descriere |
|-----------|-----------|
| `GEMINI_API_KEY` | Cheia API Google Gemini (RAG + embeddings) |
| `OPENROUTER_API_KEY` | Cheie OpenRouter (Smart News Parser + generare imagini) |
| `HUGGINGFACE_API_KEY` | Cheie HuggingFace (fallback generare imagini) |
| `ADMIN_SECRET` | Protejează `POST /api/v1/admin/rebuild-rag` |
| `SUPABASE_WEBHOOK_SECRET` | Protejează `POST /webhook/supabase` |
| `BACKEND_URL` | URL-ul backend-ului accesat din containerul LLM |

**Mobile (Expo)**

| Variabilă | Descriere |
|-----------|-----------|
| `EXPO_PUBLIC_API_BASE_URL` | URL-ul API-ului backend (ex: `http://<ip>:8002`) |
| `EXPO_PUBLIC_LLM_BASE_URL` | URL-ul serviciului LLM (ex: `http://<ip>:8001`) |
| `EXPO_PUBLIC_MAPTILER_STYLE_URL` | URL stil hartă MapTiler (include API key) |
| `EXPO_PUBLIC_DASHBOARD_URL` | URL-ul dashboard-ului de administrare |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Documentație

| Document | Descriere |
|----------|-----------|
| [ARCHITECTURE.MD](docs/ARCHITECTURE.MD) | Diagrame de arhitectură și specificații de flux |
| [STORIES.md](docs/STORIES.md) | User stories, ierarhia de acces și obiective pe echipe |
| [ONBOARDING.md](docs/ONBOARDING.md) | Ghid de pornire pentru membrii noi |
| [DEPLOY.md](docs/DEPLOY.md) | Instrucțiuni de deployment |
| [GLOSSARY.md](docs/GLOSSARY.md) | Terminologie și concepte cheie |
| [LOGGING.md](docs/LOGGING.md) | Strategie de logging și observabilitate |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Acknowledgements

* [Next.js Documentation](https://nextjs.org/docs)
* [Expo Documentation](https://docs.expo.dev/)
* [FastAPI Documentation](https://fastapi.tiangolo.com/)
* [Supabase Documentation](https://supabase.com/docs)
* [Google Gemini API](https://ai.google.dev/docs)
* [React Native Documentation](https://reactnative.dev/docs/getting-started)

<p align="right">(<a href="#readme-top">back to top</a>)</p>