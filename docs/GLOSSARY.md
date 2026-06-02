# Glosar de Termeni Tehnici — Proiectul InsideUGAL

Acest document reprezintă un instrument de referință pentru toți membrii echipei de dezvoltare (atât cei actuali, cât și viitorii colaboratori). Scopul său este de a defini riguros conceptele, protocoalele și tehnologiile utilizate în arhitectura aplicației InsideUGAL, eliminând ambiguitățile și asigurând o numire unitară a componentelor.

---

## Indexul de Termeni și Tehnologii

### 1. UGAL (Universitatea „Dunărea de Jos” din Galați)
* **Definiție generală:** Instituția de învățământ superior de stat din Galați, România, fondată în forma sa modernă în anul 1974. Reprezintă cadrul academic, administrativ și geografic în care este implementat acest proiect.
* **Context în cadrul proiectului:** UGAL nu reprezintă doar acronimul din numele aplicației, ci definește întregul model de date. Structura bazei de date (facultăți, specializări, ani de studiu, secretariate) este modelată fidel după organigrama universității. Toate funcționalitățile aplicației, cum ar fi avizierul digital sau asistentul virtual, sunt configurate special pentru a răspunde nevoilor studenților și profesorilor din această instituție.

### 2. RLS (Row Level Security / Securitate la Nivel de Rând)
* **Definiție generală:** Un mecanism de securitate implementat direct în sistemele de gestionare a bazelor de date relaționale (în special în PostgreSQL). Spre deosebire de permisiunile clasice care oferă sau blochează accesul la o întreagă tabelă, RLS evaluează fiecare interogare (SELECT, UPDATE, DELETE) pe baza identității utilizatorului și filtrează rândurile pe care acesta are sau nu dreptul să le vadă.
* **Context în cadrul proiectului:** În InsideUGAL, RLS este integrat prin intermediul Supabase. Acest mecanism garantează, de exemplu, că un student autentificat își poate vizualiza sau modifica doar propriul profil sau istoricul de chat cu asistentul AI, fără posibilitatea tehnică de a accesa datele altor studenți, asigurând conformitatea cu standardele GDPR direct din baza de date.

### 3. PostGIS
* **Definiție generală:** O extensie open-source deosebit de puternică pentru sistemul de baze de date relaționale PostgreSQL. Aceasta adaugă suport dedicat pentru obiecte geografice (puncte, linii, poligoane) și permite executarea de interogări spațiale complexe folosind limbajul SQL standard.
* **Context în cadrul proiectului:** Deoarece InsideUGAL își propune să ajute studenții să se orienteze în cadrul campusului, PostGIS este utilizat pentru a stoca coordonatele geografice precise ale corpurilor de clădire, sălilor de curs, laboratoarelor sau căminelor studențești. Cu ajutorul PostGIS, aplicația poate calcula distanțe în timp real sau poate determina în ce corp de clădire se află o anumită sală căutată de utilizator.

### 4. Coolify
* **Definiție generală:** O suită software open-source de tip PaaS (Platform as a Service) concepută pentru auto-găzduire (self-hosted). Reprezintă o alternativă modernă, gratuită și independentă la servicii comerciale precum Heroku, Render sau Netlify, permițând gestionarea și publicarea aplicațiilor pe un server propriu printr-o interfață web intuitivă.
* **Context în cadrul proiectului:** Echipa folosește Coolify ca orchestrator central pentru deployment. Acesta monitorizează automat branch-ul principal de pe GitHub și, în momentul în care un Pull Request este aprobat, Coolify preia automat codul nou, rulează containerele Docker și publică aplicația InsideUGAL în producție, asigurând un flux continuu de integrare și livrare (CI/CD).

### 5. Nixpacks
* **Definiție generală:** Un instrument modern de construcție (build tool), inițiat de comunitatea Railway, care analizează automat codul sursă dintr-un director, detectează limbajul de programare utilizat (Python, Node.js, Go etc.) și generează o imagine de container Docker optimizată, sigură și gata de rulare.
* **Context în cadrul proiectului:** În loc ca echipa să scrie manual fișiere Dockerfile complexe și greu de întreținut pentru fiecare microserviciu (Frontend, Backend, modulul LLM), Nixpacks abstractizează acest proces. El standardizează modul în care codul nostru este compilat și ambalat în containere, reducând erorile umane legate de versiunile dependențelor în mediul de producție.

### 6. JWT (JSON Web Token)
* **Definiție generală:** Un standard deschis (RFC 7519) compact și de sine stătător, utilizat pentru transmiterea securizată a informațiilor între două părți sub forma unui obiect JSON. Aceste informații pot fi verificate și de încredere deoarece sunt semnate digital cu o cheie secretă sau o pereche de chei publică/privată.
* **Context în cadrul proiectului:** În cadrul procesului de autentificare din InsideUGAL, după ce un utilizator introduce credențialele corecte, Supabase emite un jeton JWT. Aplicația de Frontend stochează acest jeton și îl trimite automat în antetul (Header) fiecărei cereri către Backend sau către serviciul LLM pentru a demonstra că utilizatorul este autentificat legitim, eliminând necesitatea de a retrimite parola la fiecare click.
