# Cum contribuim la proiectul InsideUGAL

Acest document definește regulile tehnice de lucru pentru toți cei 13 membri ai echipei. Vă rugăm să le citiți și să le respectați. Orice cod care nu respectă aceste reguli va fi respins la Code Review.

## 1. Strategia Git (Trunk-Based / GitHub Flow)

Am decis să nu folosim o ramură intermediară `develop`. Ramura principală și singura sursă de adevăr a proiectului este `main`.

**Reguli de lucru:**

- Nimeni **NU** face push direct pe `main`. Este interzis.
- Orice funcționalitate nouă (feature) sau rezolvare de bug se face pe o ramură nouă, creată din `main`.
- Denumirea ramurilor trebuie să fie clară: `feat/nume-functie`, `fix/nume-problema`, `chore/task-tehnic`.

## 2. Reguli pentru Commit-uri (Conventional Commits)

S-a terminat cu mesajele de commit de genul "update", "fix", "ceva" sau "merge". De acum, impunem standardul **Conventional Commits**. Fiecare commit trebuie să înceapă cu un prefix:

- `feat:` - pentru o funcționalitate nouă (ex: `feat: adaugare harta interactiva`)
- `fix:` - pentru repararea unui bug (ex: `fix: reparat butonul de login`)
- `docs:` - pentru modificări în README sau documentație (ex: `docs: actualizare instructiuni deploy`)
- `chore:` - pentru setări tehnice, pachete, configurări (ex: `chore: actualizare dependinte npm`)
- `refactor:` - modificări de cod care nu schimbă logica aplicației, dar o fac mai curată.

## 3. Pull Requests (PR) și Merge

- Tot codul ajunge în `main` DOAR prin Pull Request pe GitHub.
- Niciun PR nu primește Merge fără **cel puțin 1 Review (Approve)** de la un coleg.
- Cel care dă Merge (Integratorul) va folosi **doar opțiunea "Squash and Merge"** pentru a păstra istoricul curat în `main`, redenumind commit-ul final conform regulilor de la punctul 2.
