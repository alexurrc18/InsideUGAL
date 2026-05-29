# Ghid de Onboarding pentru Dezvoltatori (Local Setup < 15 Min)

Bun venit în echipa de inginerie InsideUGAL. Acest document oferă setul complet de instrucțiuni tehnice necesare pentru configurarea și rularea întregului ecosistem local de microservicii într-un timp garantat de mai puțin de 15 minute.

---

## 1. Cerințe Premisă (Prerequisites)

Înainte de a începe, asigură-te că ai următoarele utilitare instalate pe stația de lucru:
* **Git** (v2.34+)
* **Docker Desktop** sau **Docker Engine** (v20.10+) cu **Docker Compose** (v2.20+)
* Un editor de cod (recomandat **VS Code**)

> 💡 **Notă privind versiunile locale:** Pentru colegii care doresc să ruleze procesele de linting, analiză statică sau teste direct pe mașina locală (în afara containerelor Docker), este recomandată instalarea **Node.js (v20+)**.

---

## 2. Protocolul de Configurare în 4 Pași (Backend & Frontend)

Urmează pașii de mai jos în ordine secvențială pentru a lansa ecosistemul de bază.

### Pasul 1: Clonarea Depozitului (Repository)
Deschide un terminal și clonează codul sursă al proiectului:
```bash
git clone [https://github.com/alexurrc18/InsideUGAL.git](https://github.com/alexurrc18/InsideUGAL.git)
cd InsideUGAL
```

Pasul 2: Configurarea Variabilelor de Mediu
Sistemul folosește un fișier .env centralizat pentru a injecta credențialele în containere. Duplică șablonul existent și completează cheile solicitate:

```bash
cp .env.example .env
```
Notă: Asigură-te că variabilele pentru conexiunea Supabase și cheile API pentru modulul LLM sunt populate corect în noul fișier .env.

Pasul 3: Construirea și Lansarea Containerelor
Folosim Docker Compose pentru a orchestra rețeaua izolată și cele 4 containere majore (Frontend, Backend, Supabase, LLM). Rulează comanda de build în modul detașat (background):

```bash
docker-compose up --build -d
```
Acest proces va descărca imaginile de bază, va compila aplicația Next.js și va porni serverul API.

Pasul 4: Verificarea Integrității Sistemului
Pentru a te asigura că toate serviciile au pornit corect și nu există containere blocate, rulează:

```bash
docker-compose ps
```
3. Configurare Aplicație Mobilă (Setup Mobile)
Pentru dezvoltatorii care lucrează direct pe partea de aplicație mobilă, configurarea se face local (în afara containerului Docker principal) folosind structura din folderul /Mobile:

Navighează în directorul dedicat aplicației mobile:

```bash
   cd Mobile
```
Instalează toate dependențele necesare proiectului:

```bash
   npm install
```
Pornește serverul de dezvoltare Expo:

```
   npx expo start
```
📱 Sfat: După rularea comenzii, poți scana codul QR generat în terminal folosind aplicația Expo Go pe telefonul tău (iOS sau Android) pentru a testa live modificările.

4. Maparea Porturilor locale şi Accesibilitate Odată ce containerele sunt în starea running, aplicaţia devine complet funcţională la nivel local prin următoarele puncte de acces:

| Serviciu / Container | Runtime Tehnic | Adresă URL Locală | Rol în Ecosystem |
| :--- | :--- | :--- | :--- |
| Frontend Dashboard | Next.js / Node | http://localhost:3000 | Interfaţa grafică a studentului |
| Backend API Gateway | FastAPI / Python | http://localhost:8000 | Logica de business / Rutele REST |
| API Documentation | Swagger / OpenAPI | http://localhost:8000/docs | Testarea manuală a endpoint-urilor |
| Baza de Date | PostgreSQL 15 | localhost:5432 | Persistenţă şi interogări PostGIS |

5. Depanare Rapidă (Troubleshooting)
Eroare de port ocupat (e.g. 5432): Asigură-te că nu ai un serviciu PostgreSQL nativ care rulează deja pe PC-ul tău în afara Docker-ului.

Module LLM lipsă: Dacă containerul AI eșuează, verifică dacă token-ul din .env are drepturi active de interogare.

Resetare completă: Pentru a curăța memoria cache și a reporni de la zero, folosește secvența:

```bash
  docker-compose down -v
  docker-compose up --build -d
```

---


6.Configurare Dashboard (Frontend Next.js)
Dacă dorești să rulezi sau să depanezi interfața web (Dashboard) nativ pe mașina ta locală, independent de restul containerelor Docker:

Din folderul rădăcină al proiectului, navighează în directorul dedicat frontend-ului (sau direct în zona de dashboard în funcție de structura aleasă):

```bash
   cd Frontend
```
Instalează pachetele de noduri necesare:

```bash
   npm install
```
Pornește serverul Next.js în modul de dezvoltare locală:

```bash
   npm run dev
```
🌐 Aplicativul va porni implicit pe http://localhost:3000 și va reflecta instant (Hot Reload) orice modificare adusă codului din componente.
