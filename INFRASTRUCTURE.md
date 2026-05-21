Planul de Infrastructură și Arhitectură: InsideUGAL
Universitatea „Dunărea de Jos” din Galați

---

## 1. Prezentare Generală a Proiectului

InsideUGAL este o aplicație dedicată studenților, concepută pentru a centraliza și simplifica viața în campus.

Funcționalități principale:

- Meniu zilnic la cantină (inclusiv valori nutriționale).
- Hartă interactivă a campusului universitar.
- Informații despre căminele studențești și notificări/sisteme de plată.
- Informații despre facultăți.
- Alte utilități destinate studenților.

Structura echipelor:

- Frontend (FE)
- Backend (BE)
- Funcționalități (Features)
- Infrastructură: 3 persoane (Robert, Ion, Raul)

---

## 2. Stiva Tehnologică Completă (Tech Stack)

Aceasta este lista exhaustivă a tehnologiilor, uneltelor și platformelor utilizate pentru dezvoltarea, operarea și monitorizarea proiectului:

Mediu de Dezvoltare Local:

- Sistem de operare: Windows 11 cu WSL 2 (Windows Subsystem for Linux - Ubuntu).
- IDE: Visual Studio Code (cu extensia Remote - WSL).
- Containere: Docker Desktop (rutat prin WSL).
- CLI Tools: Git, GitHub CLI (gh), Gemini CLI, Supabase CLI (pentru rularea mediului local de baze de date).

Hosting, Arhitectură și Deployment (Self-Hosted):

- Server/Platformă: Coolify 4.0.0 (Self-hosted pe IP local).
- Reverse Proxy / Ingress: Traefik (inclus implicit în Coolify).
- Build System: Nixpacks (integrat în Coolify pentru a construi imaginile direct din cod, fără Dockerfile manual).
- DNS Local: AdGuard Home (rulat în Docker pe porturile 3000/5353) pentru rezolvarea domeniilor .local.

Baze de Date și Backend-as-a-Service:

- Platformă: Supabase (Self-hosted prin Coolify sau gestionat via Supabase CLI pentru local). Include baza de date PostgreSQL, API-uri REST/GraphQL generate automat și sistem de Autentificare.
- Extensie Spațială: PostGIS (crucial pentru harta interactivă a campusului, suportat nativ de Supabase).

CI/CD și Versionare:

- Controlul Versiunilor: Git & GitHub.
- Continuous Integration (CI): GitHub Actions (pentru testare și linting).
- Continuous Deployment (CD): Coolify (prin webhook-uri setate către GitHub).

Monitorizare și Observabilitate:

- Uptime Monitoring: Uptime Kuma (găzduit prin Coolify).
- Jurnale (Logs): Agregatorul implicit din Coolify.

---

## 3. Împărțirea Responsabilităților în Echipa de Infrastructură

Pentru a evita suprapunerile de cod și acțiuni, sarcinile sunt împărțite clar, pe domenii specifice.

| Membru Echipă | Rol în Proiect                  | Responsabilități Principale                                                                                                                                                                              |
| :------------ | :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Robert        | Responsabil Deploy & Rețea      | Administrează instanța Coolify, conectează repository-ul GitHub, configurează webhook-urile, setează regulile DNS (AdGuard Home) și supervizează arhitectura la nivel înalt.                             |
| Ion           | Responsabil Date & Baze de Date | Gestionează instanța Supabase, proiectează structura tabelelor/schemele în PostgreSQL, setează regulile de securitate (RLS - Row Level Security) și configurează modulul de autentificare Supabase Auth. |
| Raul          | Responsabil Mediu Local & CI/CD | Creează fișierele docker-compose.yml pentru mediul local, scrie pipeline-ul GitHub Actions (CI) pentru testarea automată și setează uneltele de monitorizare (Uptime Kuma, log-uri).                     |

---

## 4. Arhitectura de Sistem (Self-Hosted prin Coolify)

Fiind un proiect găzduit local prin Coolify, arhitectura este optimizată astfel:

1. Traficul Web: Orice cerere (ex: de pe telefonul unui student conectat la rețeaua locală) este interceptată de AdGuard Home, care rezolvă domeniul (ex: app.insideugal.local) către adresa IP a serverului Coolify.
2. Rutarea Internă: Traefik (din Coolify) primește cererea pe IP-ul respectiv și o direcționează către containerul potrivit (Frontend, Backend sau instanța de Supabase).
3. Aplicațiile: Frontend-ul și Backend-ul rulează în containere Docker separate, gestionate, actualizate și construite automat de Coolify la fiecare push pe GitHub.
4. Baza de date: Supabase rulează local pe serverul vostru, oferind atât baza de date PostgreSQL, cât și API-urile direct către Frontend/Backend.

---

## 5. Strategia pentru Baza de Date și Structura Schemelor (Supabase)

Decizie Tehnică: Supabase. Autentificarea utilizatorilor va fi gestionată nativ de auth.users din Supabase.

Tabele Core (Recomandare Structură)
| Nume Tabel | Scop | Coloane Cheie |
| :--- | :--- | :--- |
| profiles | Profilul extins al studentului, legat de Supabase Auth. | id (FK către auth.users.id), role (student/admin), student_id. |
| cafeteria_menus | Evidența meselor, prețuri, nutriție. | id, date, item_name, calories, protein, price. |
| locations | Pini pentru harta interactivă. | id, name, type (facultate/cămin), coordinates (tip Point din PostGIS). |
| dorm_rooms | Gestiunea clădirilor și capacității. | id, building_name, room_number, capacity, current_occupancy. |
| payments | Evidența plăților (cămin etc.). | id, user_id (FK către profiles.id), amount, status, due_date. |

---

## 6. Strategia Git și Fluxul de Lucru (GitFlow Lite)

Pentru a asigura stabilitatea aplicației când 4 echipe diferite lucrează simultan.

- main — Conține doar cod de producție. Nu se face commit direct niciodată. Orice merge aici se implementează automat (deploy) pe aplicația live via Coolify.
- develop — Ramura principală de integrare (Staging). Toate funcționalitățile noi ajung întâi aici.
- infra/, feat/, fix/\* — Ramuri temporare create de dezvoltatori pentru lucrul activ (ex: infra/setup-coolify sau feat/campus-map).

Procesul de Pull Request (PR):

1. Se creează o ramură nouă din develop: git checkout -b infra/nume-task.
2. Se finalizează munca, se dă commit și push.
3. Se deschide un PR pe GitHub către ramura develop.
4. Obligatoriu: Necesită aprobarea (Review) a cel puțin unui alt membru al echipei (ex: dacă lucrează Robert, Ion sau Raul trebuie să aprobe).
5. Obligatoriu: Pipeline-ul GitHub Actions (CI) trebuie să ruleze și să nu prezinte erori pentru ca butonul de Merge să fie activ.

---

## 7. Mediu Local și Configurarea Docker

Acest fișier docker-compose.yml trebuie plasat de Raul în directorul principal al proiectului (root). Deoarece folosiți Supabase, dezvoltatorii vor folosi Supabase CLI pentru a rula baza de date local (prin comanda supabase start), așa că fișierul de mai jos se concentrează pe ridicarea rapidă a codului scris de echipele FE și BE.

```yaml
version: "3.8"
services:
  backend:
    build:
      context: ./backend
    ports:
      - "8000:8000"
    environment:
      # Acestea vor pointa către URL-urile generate de supabase start
      SUPABASE_URL: ${SUPABASE_URL:-[http://host.docker.internal:54321](http://host.docker.internal:54321)}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:-your_local_anon_key}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-your_local_service_key}

  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL:-http://localhost:54321}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:-your_local_anon_key}
```

---

## 8. Securitate și Gestiunea Secretelor

1. Regula de Aur: Fișierul .env nu se încarcă niciodată pe GitHub. Se adaugă \*.env în .gitignore de la primul commit.
2. Secretele Supabase: Supabase folosește un ANON_KEY (sigur pentru a fi expus în Frontend) și un SERVICE_ROLE_KEY (care oferă drepturi de admin și trebuie ținut strict în Backend).
3. Variabilele în Producție: Secretele sunt gestionate exclusiv prin interfața Coolify -> Secțiunea Environment Variables a fiecărei aplicații.

---

## 9. Monitorizare și Observabilitate

- Jurnale Aplicații: Se verifică direct în interfața web Coolify, navigând la fiecare serviciu/aplicație.
- Monitorizare Uptime: Uptime Kuma va fi instalat tot ca serviciu prin Coolify.
  - Se configurează monitoare de tip HTTP(s) către: http://app.insideugal.local și http://api.insideugal.local/health (un endpoint special creat de echipa BE).
  - Notificările în caz de downtime vor fi trimise automat prin Webhook pe un canal de Discord sau grup de Telegram al echipei.

---

## 10. Plan de Execuție Pas cu Pas (Ordinea Priorităților)

Această ordine trebuie respectată strict. Rulați comenzile prezentate direct în terminalul WSL (Ubuntu).

PASUL 1: Configurarea DNS-ului Local (Robert)
Pentru ca proiectul să poată fi accesat prin nume de domenii locale.

1. Deschide interfața AdGuard Home (port 3000 sau 5353).
2. Mergi la Filters -> DNS rewrites.
3. Adaugă:
   - Domain: \*.insideugal.local
   - IP Address: IP-ul IPv4 local al PC-ului pe care rulează Coolify (ex: 192.168.x.x).
4. Conectează device-urile la IP-ul de AdGuard Home ca server DNS.

PASUL 2: Inițializarea Proiectului și Mediului Local (Raul)

```bash
# Se navighează în folderul de proiect
cd ~/InsideUGAL

# Crearea structurii de bază
mkdir frontend backend infra
touch docker-compose.yml .gitignore README.md
echo ".env" >> .gitignore

# Inițializarea Supabase pentru dezvoltare locală
npx supabase init

# Salvarea și urcarea pe GitHub
git fetch --all
git checkout -b develop
git checkout -b infra/initial-setup
git add .
git commit -m "chore: setup initial directory structure and supabase"
git push -u origin infra/initial-setup
```

PASUL 3: Integrarea Continuă - GitHub Actions CI (Raul)
Se testează automat codul. Creați fișierul .github/workflows/ci.yml:
name: CI Pipeline
on:
  pull_request:
    branches: [ develop, main ]
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up mediul ales (Node/Python)
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies & Test
        run: |
          cd backend
          npm ci
          npm test

PASUL 4: Configurarea Bazei de Date / Supabase (Ion)
Instalează instanța Supabase (fie ca Docker compose în Coolify, fie conectând aplicațiile la un proiect cloud dacă ulterior se decide mutarea de pe self-hosted).
Creează tabelele necesare (profiles, locations, etc.) și activează extensia PostGIS rulând CREATE EXTENSION postgis; în SQL Editor.

Configurează politicile RLS (Row Level Security) pentru ca studenții să își poată vedea doar propriile date (ex: plăți).
Extrage SUPABASE_URL, ANON_KEY și SERVICE_ROLE_KEY pentru a i le transmite lui Robert.

PASUL 5: Implementarea (Deployment-ul) Aplicațiilor în Coolify (Robert)

În proiectul InsideUGAL din Coolify, adaugă o resursă nouă: Application -> GitHub.
Selectează repository-ul alexurrc18/InsideUGAL și ramura develop.
Setează Base Directory la /backend.
La Build Pack, lasă pe Nixpacks.
În tab-ul Environment Variables, adaugă variabilele primite de la Ion (SUPABASE_URL, etc.).
Setează domeniul: http://api.insideugal.local și apasă Deploy.
Repetă procesul pentru Frontend, setând Base Directory /frontend și domeniul http://app.insideugal.local.

---

11. Configurare Tool-uri Locale și Extensii (Pregătire Individuală)
Fiecare membru al echipei (Robert, Ion, Raul) trebuie să ruleze aceste comenzi în VS Code și WSL.

Instalare Extensii în VS Code (din terminal):
code --install-extension ms-azuretools.vscode-docker
code --install-extension redhat.vscode-yaml
code --install-extension github.vscode-github-actions
code --install-extension supabase.supabase

# Update la pachete
sudo apt-get update

# Instalare Supabase CLI (necesar pentru dezvoltarea locală a bazei de date)
brew install supabase/tap/supabase
```
