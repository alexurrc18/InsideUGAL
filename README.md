# ⚙️ InsideUGAL - Backend API

Acesta este nucleul aplicației **InsideUGAL**, responsabil de logica de business, gestionarea datelor și autentificarea utilizatorilor în cadrul platformei academice.

---

## 🛠️ Stack Tehnologic
- **Runtime:** Node.js
- **Framework:** Express.js
- **Bază de Date:** PostgreSQL
- **Conectivitate:** Prisma

---

## 🚀 Instalare și Configurare

### 1. Cerințe preliminare
- Node.js (versiune LTS recomandată)
- Git instalat
- Baza de date configurată local

### 2. Pași pentru rulare
```bash
# 1. Clonează repository-ul (dacă nu ai făcut-o deja)
git clone [https://github.com/alexurrc18/InsideUGAL.git](https://github.com/alexurrc18/InsideUGAL.git)

# 2. Navighează în folderul de backend
cd backend

# 3. Instalează dependențele
npm install

# 4. Configurează variabilele de mediu
# Copiază fișierul exemplu pentru a crea setările proprii
cp .env.example .env

# 5. Pornește serverul
npm run dev

---

 Ce trebuie facut concret pe backend:

  1. Alegerea stack-ului
     Acum README-ul si structura proiectului nu se potrivesc. Trebuie ales clar: Express sau FastAPI.
  2. Pornirea serverului
     Endpoint minim:
      - GET / sau GET /health
      - raspuns: backend-ul ruleaza.
  3. Configurarea bazei de date
     Trebuie decis ce baza folositi:
      - SQLite pentru demo/proiect simplu
      - PostgreSQL/MySQL pentru ceva mai serios
  4. Modele principale
     Probabil pentru InsideUGAL:
      - User
      - Student
      - Professor
      - Faculty
      - Course
      - Announcement / Event
      - eventual Role
  5. Autentificare
      - register
      - login
      - parole hash-uite
      - JWT/session
      - middleware pentru rute protejate
  6. Endpoint-uri API
     Exemple:
      - POST /auth/register
      - POST /auth/login
      - GET /users/me
      - GET /courses
      - GET /announcements
      - POST /announcements pentru admin/profesor
  7. Validare si erori
      - verificare date primite
      🗄️ Baza de Date: PostgreSQL
Pentru dezvoltarea sistemului InsideUGAL, am ales PostgreSQL din următoarele motive:

Versatilitate: Suportă atât date structurate (orar, conturi), cât și date semi-structurate prin tipul JSONB, ideal pentru modulele dinamice precum Cantină.

Integrare AI (pgvector): Extensia pgvector ne permite să transformăm baza de date într-un motor de căutare semantică, esențial pentru funcționarea Agentului Autonom de Evaluare și Risc (tehnologie RAG).

Integritate ACID: Garantează consistența și siguranța datelor în timpul tranzacțiilor critice (notări, plăți, rezervări).