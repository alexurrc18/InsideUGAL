# InsideUGAL — TODO Tehnic pe Membri

> Listă de task-uri **inginerești** pentru echipa InsideUGAL, derivate din analiza repo-ului la 2026-05-21.
>
> **Filozofie:** funcționalitățile platformei (meniu cantină, hartă campus, plăți cămin etc.) sunt treaba voastră — fiți creativi. Lista de mai jos e despre **fundația tehnică** peste care construiți acele funcționalități. Bifați-le pe rând, fiecare task ar trebui să fie un PR separat.
>
> **Regula de bun simț:** niciun task nu se închide fără PR aprobat + CI verde + cineva care a citit cu adevărat codul. Asta-i singura disciplină care contează la 13 oameni pe un repo.

---

## 🎯 Priorități transversale (toți le citesc întâi)

1. **Stop la commits pe `main`.** Branch protection ON, PR obligatoriu, minim 1 reviewer. (Owner trebuie să apese butonul.)
2. **Niciun secret în git.** Audit acum: search după `password`, `api_key`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `.env` cu chei reale. Dacă apare ceva → rotire imediată + git history rewrite.
3. **Conventional Commits.** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`. Vă scutește de bătaia de cap cu changelog.
4. **Un singur `README.md` la rădăcină + câte un README per modul.** Cel actual amestecă instrucțiuni vechi (`npm install` la rădăcină) cu structura nouă.

---

## 👤 Alexandru Călin (`alexurrc18`) — Owner & Coordonator

Tu ai cheile. Folosește-le pe partea de proces, nu de cod.

- [ ] **Branch protection pe `main`**: required reviews ≥ 1, dismiss stale reviews on push, require status checks (CI), require linear history. Settings → Branches.
- [ ] **CODEOWNERS** (`.github/CODEOWNERS`): mapează fiecare director la echipa responsabilă (ex. `/Frontend/ @Andreea`, `/app/ @andreip19`, `/LLM/ @RentaMarius @CosminG1412`, `/supabase/ @ionradu010`, `/.github/ @RobyGabriel`). PR-urile pe acele path-uri cer automat reviewer-ul corect.
- [ ] **PR template** (`.github/PULL_REQUEST_TEMPLATE.md`): What/Why/How tested/Screenshots/Linked issue. 8 rânduri, nu mai mult.
- [ ] **Issue templates** pentru bug, feature, infra (`.github/ISSUE_TEMPLATE/*.yml`).
- [ ] **LICENSE** + **CONTRIBUTING.md** (cum se setează local, cum se dă PR, cum se rulează testele).
- [ ] **GitHub Projects board** cu 4 coloane per echipă (Infra, Backend, Frontend, LLM) + status (Todo / Doing / Review / Done). Linkează issues la el.
- [ ] **Repo description + topics** pe GitHub (pentru descoperabilitate): `university`, `student-platform`, `ugal`, `fastapi`, `nextjs`, `supabase`.

---

## 🛠️ Echipa Infrastructură

### Robert Gabriel Manea (`RobyGabriel`) — Deploy & Rețea / Tech Lead de facto

Ești singurul care atinge tot. Folosește poziția ca să impui standardele, nu doar să fixezi.

- [ ] **GitHub Actions CI** (`.github/workflows/ci.yml`): pe fiecare PR rulează `lint` + `typecheck` + `build` pentru Frontend (Next.js) și Backend (FastAPI). Fail = nu se face merge.
- [ ] **Health checks în `docker-compose.yaml`** pentru fiecare serviciu (`healthcheck:` cu `test`, `interval`, `retries`, `start_period`). Coolify le folosește pentru zero-downtime deploys.
- [ ] **Reverse proxy strict**: în Traefik, doar `frontend` și `backend` expuse public. Supabase și LLM **doar pe rețea internă Docker**. Verifică cu `docker compose exec frontend curl supabase:8000` că merge, dar din afară nu.
- [ ] **Secrets management**: `.env.example` cu toate variabilele necesare (fără valori), `.env` în `.gitignore` (deja e), în Coolify le setezi din UI. Audit: există commits cu chei reale? `git log -p | grep -iE 'key|secret|password'`.
- [ ] **Runbook deploy** (`docs/DEPLOY.md`): cum pornești de la zero pe un server nou. Pasul cu pasul, inclusiv DNS AdGuard. Cineva care nu ești tu trebuie să poată face deploy după acest doc.
- [ ] **Uptime Kuma**: monitor pentru frontend, backend, Supabase, fiecare cu alertă (mail/Telegram/Discord) la down >2min.
- [ ] **Backup automat Postgres** prin Coolify (cron) — păstrezi 7 zile rolling. Testează *restaurarea* o dată; backup netestat = backup inexistent.

### Radu Ion (`ionradu010`) — Database & Auth

Tu ești gardianul integrității datelor. Dacă greșești tu, toată lumea pierde.

- [ ] **RLS policies pe TOATE tabelele** (`profiles`, `cafeteria_menus`, `locations`, `dorm_rooms`, `payments`). Default deny, apoi `policy "students read own profile" on profiles for select using (auth.uid() = id)` etc. Verifică cu `SET ROLE authenticated` și `auth.uid()` setat manual.
- [ ] **Convenție migrations** documentată în `supabase/README.md`: timestamp prefix, un singur scop per migration, întotdeauna reversibilă (sau cu nota explicită că nu e). Niciodată edit pe o migration deja merguită.
- [ ] **Seed data deterministic** (`supabase/seed.sql`): minim 5 studenți, 2 profesori, 1 admin, 10 produse cantină, 5 locații pe hartă, 3 cămine. Toți cu UUID-uri fixe. Astfel testele integration sunt reproductibile.
- [ ] **Index strategy**: identifică query-urile reale (după ce backend-ul are 1-2 săptămâni de log-uri), rulează `EXPLAIN ANALYZE`, adaugă index doar unde scanarea e secvențială pe >1000 rânduri. Nu adăuga indexuri "pentru orice eventualitate".
- [ ] **Schema diagram auto-generat** (folosește `pg-schema-diagram`, `dbml`, sau Supabase Studio export). Pus în `docs/SCHEMA.md`, regenerat la fiecare migration.
- [ ] **Validare la nivel DB, nu doar la API**: `CHECK` constraints pentru prețuri >0, status în enum, capacități >0. Backend-ul poate fi rescris; constrângerile rămân.
- [ ] **PostGIS smoke test**: o query care întoarce locațiile dintr-un radius dat folosind `ST_DWithin`. Documentează în README.

### Raul (`Raul21000` / `thepykeprodigy`) — CI/CD + Mediu Local

Tu ai scris planul de infrastructură (frumos, 246 rânduri). Acum implementează-l.

- [ ] **Pre-commit hooks** (`.pre-commit-config.yaml`): `ruff` (Python), `eslint` + `prettier` (JS/TS), `sqlfluff` (SQL), `gitleaks` (secrete). Documentează `pre-commit install` în CONTRIBUTING.
- [ ] **GitHub Actions matrix**: rulează backend tests pe Python 3.11 și 3.12, frontend tests pe Node 20 și 22. Cache `pip` și `npm` (≥3× speedup).
- [ ] **`make` sau `just` la rădăcină** cu țintele: `up`, `down`, `logs`, `test`, `seed`, `migrate`, `reset`. Un singur loc pentru toate comenzile zilnice — eviți "ce comandă era pentru X?".
- [ ] **Container resource limits** în compose: `mem_limit`, `cpus`, `restart: unless-stopped`. Fără limits, un memory leak în LLM ucide tot serverul.
- [ ] **Dependency audit în CI**: `pip-audit` și `npm audit --audit-level=high`. Fail la high/critical. Dependabot ON pe GitHub.
- [ ] **Structured logging**: backend → JSON logs cu `correlation_id`, `user_id`, `path`, `duration_ms`. Frontend → forward la backend. Coolify le agregă deja, dar fără structură nu poți face query pe ele.
- [ ] **`root@Cuptorcupizza` commit-ul** — pune `git config --global user.name` și `user.email` cum trebuie. (Toți ar trebui să o facă; tu ai exemplul.)

---

## 🤖 Echipa LLM / Features

⚠️ **Decizie de luat în primele 48h**: ramurile `LLM` și `cosmin-llm` trebuie unificate. Nu duceți două implementări paralele după acest weekend. Cel care pierde "votul tehnic" îl ajută pe celălalt cu integrarea.

### Renta Marius — LLM Lead

- [ ] **Contract clar pentru toate apelurile LLM**: input schema (Pydantic), output schema (Pydantic), validare strictă a output-ului LLM înainte să iasă din modul. Dacă LLM-ul returnează ceva nevalid → retry o dată, apoi raise.
- [ ] **Timeout + retry + circuit breaker**: orice apel extern (OpenAI/Anthropic/etc.) cu timeout maxim 30s, max 2 retry-uri cu backoff exponențial, circuit breaker care se închide după 5 erori consecutive. Folosește `tenacity` sau `pybreaker`.
- [ ] **Token usage tracking**: log la fiecare apel `model`, `prompt_tokens`, `completion_tokens`, `cost_usd`. Salvezi în Supabase într-o tabelă `llm_calls`. Dashboardul venit ca cadou.
- [ ] **Cache cu cheie deterministă**: hash al promptului + model + temperature → răspuns. Redis sau în Postgres ca tabelă (`llm_cache` cu TTL). Reduce 60%+ din costuri în dev.
- [ ] **Eval suite minimă** (`LLM/evals/`): 20 perechi (input, expected_property) — nu output exact, ci proprietăți (ex. "răspunsul conține numele cantinei", "răspunsul nu menționează prețuri eronate"). Rulezi `pytest evals/` înainte de fiecare deploy LLM.
- [ ] **Refactor `AiBot.py`** — citește-l obiectiv. E un script sau un modul reutilizabil? Separă `LLMClient`, `PromptBuilder`, `OutputParser`. Fiecare cu test propriu.

### Vivian Hîncu (`HincuVivianStefan`, `vh135@student.ugal.ro`) — Integrator + PM Tehnic

Tu ești singurul cu mail UGAL — automat ești și interfața către universitate. Și faci cele mai multe merge-uri pe `main`. Asumă-ți rolul.

- [ ] **Stabilește GitFlow scris** — planul existent menționează `develop`, dar nu există acea ramură. Decizi: ori creezi `develop`, ori treci la trunk-based cu feature flags. **Documentat în `CONTRIBUTING.md`**, altfel fiecare face cum vrea.
- [ ] **Mergi `LLM` ↔ `cosmin-llm`** după benchmark-ul lui Cosmin (vezi mai jos). PR cu decizia argumentată, nu "am ales pe a lui Marius pentru că".
- [ ] **`commitlint` + `husky`** pe repo: Conventional Commits enforce-uit la commit time. Ai 134 commits, jumătate cu mesaje neclare ("merge", "update", "fix"). De acum încolo, disciplină.
- [ ] **CHANGELOG.md** auto-generat din Conventional Commits (`git-cliff` sau `release-please`). Actualizat la fiecare merge pe `main`.
- [ ] **Sprint retrospective săptămânală scrisă** (`docs/retros/YYYY-WW.md`): ce s-a livrat, ce s-a blocat, ce schimbăm. Tu ești PM-ul natural; cineva trebuie să țină cadența.

### Cosmin Groza (`CosminG1412`) — Variantă LLM Paralelă

Ai branch propriu. Asta e ok dacă demonstrezi că e mai bun, nu doar dacă e diferit.

- [ ] **ADR (Architecture Decision Record)** în `docs/adr/0001-llm-architecture.md`: 1-2 pagini — context, decizii, alternativă (varianta lui Marius), consecințe. Format ADR standard ([adr.github.io](https://adr.github.io/)).
- [ ] **Benchmark comparativ**: aceleași 20 prompturi pe ambele implementări, măsori latency p50/p95, cost per request, calitate output (subiectiv 1-5 de 3 oameni orbește). Tabel în ADR.
- [ ] **Unit tests pentru modulul tău** — minim 80% coverage pe partea non-LLM (parsing, formatting, error handling). LLM-ul în sine îl mockuiești.
- [ ] **Dacă varianta ta câștigă** → scrii migration plan: ce funcții din `LLM/` se păstrează, ce se aruncă, ce trebuie portat. Dacă pierde → vii pe `LLM` și ajuți Marius cu testele de mai sus.

---

## ⚙️ Echipa Backend

### Andrei Petrea (`andreip19`) — Backend Lead

Ești bus factor 1 acum. Scrie cod de care altcineva să se atingă fără frică.

- [ ] **OpenAPI / Swagger auto-generat** — FastAPI o face nativ la `/docs`. Asigură-te că toate response models și request bodies sunt declarate cu Pydantic. Zero `Dict[str, Any]` în signaturi publice.
- [ ] **Auth middleware**: verifică JWT-ul Supabase pe fiecare route protejat, extract `user_id` în `Depends(get_current_user)`. Niciun endpoint nu citește direct `Authorization` header.
- [ ] **Async DB session** prin dependency injection (`Depends(get_db)`), cu rollback automat la exception. Niciun `session.close()` manual prin route handlers.
- [ ] **Error handling unificat**: `@app.exception_handler(Exception)` care întoarce [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) — `type`, `title`, `status`, `detail`, `instance`. Frontend știe exact ce să afișeze.
- [ ] **`pytest` + `httpx.AsyncClient`** pentru integration tests pe toate endpoint-urile. Țintă: 70% coverage pe rute, 90% pe logica de business. Fixtures cu seed deterministic (sincronizare cu Ion).
- [ ] **Elimină `Base.metadata.create_all`** (ai făcut deja parțial) — toate schemele vin din migrații Supabase. Backend-ul citește, nu definește schema.
- [ ] **Request ID middleware**: generează `X-Request-ID` per request, îl propaghi în log-uri și ca header la apeluri externe. Trasabilitate end-to-end.

### Robert Râmniceanu (`Robert028`) — Backend Support

- [ ] **Migrare de la SQLite (`insideugal.db`) la Postgres dev** — toată lumea pe aceeași stack. Șterge `.db`-ul committed (e în istoric), adaugă `*.db` în `.gitignore`.
- [ ] **Repository pattern**: pentru fiecare model creezi `app/repositories/<model>_repo.py` cu metode (`get_by_id`, `list`, `create`, `update`, `delete`). Route handlers nu fac direct query, ci cheamă repository. Testabil + decuplat.
- [ ] **2-3 integration tests reale** pentru endpoint-urile existente, ca model pentru ceilalți.
- [ ] **README la `app/`** cu exemple curl pentru fiecare endpoint, până se nasc Swagger-ul lui Andrei.

---

## 🎨 Echipa Frontend

### Andreea Costin — Frontend Lead

Singura pe UI real. Ai Next.js 14 + Tailwind scaffolded — acum bazele *înainte* de prima pagină reală.

- [ ] **Design tokens** în `tailwind.config.ts`: paleta culorilor (primary, secondary, neutral 50-900, semantic success/warning/error), typography scale (4-5 tier-uri), spacing (4/8/12/16/24/32/48), radius (sm/md/lg/full). Niciun `#hex` sau `px` ad-hoc în componente.
- [ ] **Supabase JS client** configurat ca singleton (`lib/supabase.ts`), cu auth helper hooks (`useUser`, `useSession`). Niciun apel direct la `supabase.auth.*` din componente.
- [ ] **API client typed**: dacă Andrei livrează OpenAPI, generează tipuri cu `openapi-typescript` în `lib/api-types.ts`. Alternativ, TanStack Query + Zod schemas. Zero `any` în răspunsuri API.
- [ ] **TanStack Query** pentru toate data fetching-urile. Stale time + retry + error boundaries. Forget `useEffect + fetch`.
- [ ] **Error boundary + loading skeleton** la nivel de layout. Niciodată pagină albă în timpul fetch-ului.
- [ ] **Lighthouse CI** în GitHub Actions: prag minim 90 pe Performance + Accessibility + Best Practices. PR fail dacă scade.
- [ ] **Storybook** (opțional dar puternic) pentru componente reutilizabile (Button, Input, Card, Modal). Ușurează enorm code review-ul vizual.

---

## 📚 Echipa Docs & Suport

### Bogdan Andrei (`TB0gdan`)

- [ ] **Architecture diagram** (Mermaid în `docs/ARCHITECTURE.md`): containers, fluxul de date Frontend ↔ Backend ↔ Supabase ↔ LLM. Update-at la fiecare schimbare majoră.
- [ ] **Onboarding doc** (`docs/ONBOARDING.md`): un dev nou trebuie să poată rula stack-ul local în <15 min după ce citește acest doc. Testează literal cu cineva care nu a mai văzut repo-ul.
- [ ] **Glossary** (`docs/GLOSSARY.md`): UGAL, RLS, PostGIS, Coolify, Nixpacks, JWT — fiecare 1-2 rânduri. Nu presupune că toți știu.

### Claudia Răileanu (`ClaudiaRaileanu`)

- [ ] **README split**: un README per modul (`Frontend/README.md`, `app/README.md`, `LLM/README.md`, `supabase/README.md`). Cel de la root rămâne overview-ul.
- [ ] **Curățenie README root**: scoate instrucțiunile vechi (`npm install` la rădăcină — nu se aplică), pune scriptul real (`docker compose up` / `make up`).
- [ ] **User stories** (`docs/STORIES.md`) — format „As a [rol], I want [funcționalitate], so that [valoare]". Pentru fiecare echipă să aibă target clar. Coordonezi cu Alexandru.

### Dinu M. (`DMS`)

- [ ] **`.editorconfig`** la rădăcină: `indent_style`, `indent_size` (2 pentru TS/JSON, 4 pentru Python), `end_of_line`, `insert_final_newline`. Stop la "merge-mi formatter-ul diff-ul în 50 de fișiere".
- [ ] **`.gitattributes`**: `* text=auto eol=lf`, `*.lockb binary`, tratament special pentru `package-lock.json` (`merge=ours` sau marcat ca generated).
- [ ] **`.vscode/extensions.json` curat**: recomandări pentru toți (Prettier, ESLint, Python, SQL, Docker, Even Better TOML). Nu setări personale.

---

## ✅ Definition of Done — pentru orice task de mai sus

Un task se închide când:

1. PR deschis cu titlu Conventional Commit (`feat:`, `chore:` etc.)
2. CI verde (lint + typecheck + tests)
3. Cel puțin 1 reviewer din altă echipă a aprobat
4. Documentația aferentă actualizată (README modul + diagrame dacă e cazul)
5. Branch-ul șters după merge

---

## 📅 Ordinea sugerată pentru această săptămână

**Zilele 1-2** (fundație):
- Branch protection (Alexandru) + GitHub Actions CI scheleton (Robert M./Raul) + RLS scheleton (Ion)
- Decizia LLM `LLM` vs `cosmin-llm` (Vivian + Cosmin + Marius)

**Zilele 3-4** (contract):
- OpenAPI + auth middleware (Andrei) → Frontend client typed (Andreea)
- Schema finală Supabase + seed (Ion) → Backend connectat (Andrei) → Frontend conectat (Andreea)

**Zilele 5-7** (calitate):
- Tests integration backend + Lighthouse CI frontend + eval suite LLM
- Documentație (Bogdan, Claudia)
- Observability: logs structurate + Uptime Kuma (Raul + Robert M.)

---

## 💬 Cum colaborezi pe acest TODO (GitHub 101)

Tot dialogul pe lista asta se duce pe **GitHub**, nu pe WhatsApp/Discord/grup. Motivul: peste 2 luni nimeni nu mai știe ce s-a decis pe chat, dar pe GitHub rămâne istoricul complet, căutabil, atașat de cod.

### 1. Vrei să-ți asumi un task → deschide Issue

În tab-ul **Issues** → `New Issue` → titlu cu prefix de echipă, body cu task-ul exact din `todo.md`.

**Exemplu titlu bun:** `[Backend] Auth middleware cu JWT Supabase`
**Exemplu titlu rău:** `auth`

În body:
- Link înapoi la `todo.md` (linia/secțiunea ta)
- Ce abordare propui (1-3 rânduri)
- Estimare timp (ore sau zile)
- Assignează-te (`Assignees → tu`)
- Pune label (`backend`, `frontend`, `infra`, `llm`)

### 2. Vrei să comentezi pe `todo.md` direct → 3 opțiuni

**a) Comentariu general pe PR-ul de TODO** ([#3](https://github.com/alexurrc18/InsideUGAL/pull/3))
Mergi la PR → scroll jos → câmp `Leave a comment`. Util pentru discuții generale ("propun să schimbăm ordinea săptămânii").

**b) Comentariu pe o linie anume**
PR → tab `Files changed` → hover pe numărul liniei → click pe iconul `+` albastru → scrii comentariu → `Add single comment`. Util pentru: "task-ul ăsta nu-l pot face în 2 zile, e mai mare".

**c) Suggested change** (modificare propusă direct în diff)
Pe linia respectivă, în loc de text simplu scrii:
````markdown
```suggestion
- [ ] **Task nou reformulat** cu textul exact pe care îl propui
```
````
Owner-ul (Alexandru) apasă `Commit suggestion` → modificarea ta intră în repo fără să mai facă el manual.

### 3. Răspunzi la un comentariu existent → Reply

Sub orice comentariu există `Reply...`. **Folosește-l**, nu deschide thread nou. Discuțiile rămân grupate.

Când problema e rezolvată, apasă `Resolve conversation` — thread-ul se colapsează și se marchează ca închis.

### 4. Cheamă pe cineva → `@username`

Scrii `@RobyGabriel` într-un comentariu → primește notificare pe mail și în inbox-ul GitHub. Folosește pentru: cer review, cer ajutor, blocat de altcineva.

**GitHub usernames pe care le folosim** (atenție, sunt case-sensitive):
- `@alexurrc18` (Alexandru — owner)
- `@RobyGabriel` (Robert Manea — tech lead)
- `@ionradu010` (Radu Ion — DB)
- `@Raul21000` (Raul — CI/CD)
- `@HincuVivianStefan` (Vivian — integrator)
- `@CosminG1412` (Cosmin — LLM)
- `@Robert028` (Robert Râmniceanu — backend)
- `@TB0gdan` (Bogdan — docs)
- `@ClaudiaRaileanu` (Claudia — docs)
- @andreip19 (Andrei Petrea — Backend Lead)

> Cei fără cont public listat aici (Andreea, Renta Marius,  Dinu, Radu Ion-secundar) — întrebați-vă reciproc și completați lista.

### 5. Reactions (vot tăcut)

În colțul oricărui comentariu există `+ Smiley` → 👍 = de acord / 👎 = împotrivă / 🚀 = mă apuc / 👀 = mă uit / ❤️ = mulțumesc.

Folosiți-le în loc de `+1`, `merci`, `ok` ca răspunsuri. Scapă inbox-ul de spam.

### 6. Legături `#`-style între issues și PR-uri

În orice comentariu/PR/issue body scrii:
- `#15` → link automat la Issue/PR 15
- `closes #15` în descrierea unui PR → la merge, issue-ul 15 se închide automat
- `fixes #15`, `resolves #15` — la fel

**Exemplu:**
```
fix: add RLS policy pe profiles

closes #12
```
Când se face merge → Issue #12 dispare singur din lista de Todo.

### 7. Cum primești notificările

GitHub te notifică automat pentru:
- Issue/PR în care ești assignee sau author
- Comentarii pe thread-urile la care ai participat
- Mențiuni `@tine`
- Review requests

Mergi la **github.com/notifications** sau setează mail (Settings → Notifications). **Verifică zilnic, minimum.**

### 8. Pentru Marius (PM extern / observator)

Voi mă găsiți pe `@pytho25`. Eu nu sunt în echipa de dev — sunt observator tehnic. Țineți-mă în loop **doar la decizii importante** (alegere stack, schimbare arhitectură, blockere de >2 zile). Toate task-urile mici se rezolvă între voi.

Pentru status update săptămânal, deschideți un Issue cu label `weekly-status` și completați:
- Ce am livrat săptămâna asta
- Ce blockere am
- Ce livrăm săptămâna viitoare

---
