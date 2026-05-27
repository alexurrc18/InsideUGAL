# 🗄️ Supabase — Setup Local (Windows)

Acest ghid explică cum să pornești baza de date local pe PC-ul tău pentru a putea lucra la proiect.

---

## ✅ Cerințe

- Windows 10/11
- Git instalat
- Conexiune la internet (prima dată, pentru descărcat imaginile Docker)

---

## 📦 PASUL 1 — Instalează Docker Desktop

> ⚠️ Dacă ai deja Docker Desktop instalat, treci la Pasul 2.

1. Descarcă Docker Desktop de la: https://www.docker.com/products/docker-desktop/
2. Rulează installer-ul
3. Când întreabă, bifează **"Use WSL 2"**
4. **Repornește PC-ul** după instalare
5. Deschide Docker Desktop și așteaptă să pornească complet (iconița din taskbar devine stabilă)

---

## ⚙️ PASUL 2 — Instalează Supabase CLI

1. Deschide **PowerShell ca Administrator** (click dreapta pe Start → Terminal Admin)
2. Rulează comanda:

```powershell
winget install Supabase.CLI
```

3. Închide și redeschide PowerShell
4. Verifică instalarea:

```powershell
supabase --version
```

Ar trebui să apară un număr de versiune (ex: `1.x.x`). Dacă apare, ești gata.

---

## 📁 PASUL 3 — Clonează repo-ul

```powershell
git clone https://github.com/ORGANIZATIE/NUME-REPO.git
cd NUME-REPO
```

> ⚠️ Înlocuiește `ORGANIZATIE/NUME-REPO` cu path-ul real al repo-ului vostru.

---

## 🚀 PASUL 4 — Pornește Supabase local

Navighează în folderul `supabase/` din repo:

```powershell
cd supabase
```

Inițializează (doar prima dată):

```powershell
supabase init
```

Pornește containerele:

```powershell
supabase start
```

> ⏳ **Prima pornire durează 5-10 minute** — descarcă imaginile Docker. Urmărește progresul în terminal.

La final vei vedea ceva de genul:

```
API URL:        http://localhost:54321
DB URL:         postgresql://postgres:postgres@localhost:54322/postgres
Studio URL:     http://localhost:54323
anon key:       eyJ...
service_role:   eyJ...
```

> 📋 **Copiază aceste valori** și pune-le în fișierul `.env` al proiectului tău (backend/frontend după caz).

---

## 🗃️ PASUL 5 — Importă schema bazei de date

Aplică toate migrațiile (tabelele) din repo pe instanța ta locală:

```powershell
supabase db reset
```

Această comandă rulează automat toate fișierele din folderul `migrations/` în ordine.

---

## 🌐 PASUL 6 — Verifică în browser

Deschide:

```
http://localhost:54323
```

Ar trebui să se deschidă **Supabase Studio local** cu toate tabelele vizibile. Dacă le vezi — totul funcționează! ✅

---

## 📅 Folosire zilnică

```powershell
# Pornire Supabase
supabase start

# Oprire Supabase
supabase stop
```

---

## 🔄 Când apar modificări în schema bazei de date

Când colegul de infrastructure face update la tabele și dă push, trebuie să:

```powershell
git pull
supabase db reset
```

> ⚠️ `supabase db reset` șterge datele locale și reimportă schema curată. Datele de test se pierd — este normal în development.

---

## 🆘 Probleme frecvente

**Docker nu pornește / eroare WSL 2**
→ Asigură-te că WSL 2 este activat: deschide PowerShell ca Admin și rulează `wsl --install`, apoi repornește PC-ul.

**`supabase` nu e recunoscut ca comandă**
→ Închide și redeschide PowerShell după instalarea CLI-ului.

**Port deja folosit (eroare 54321 / 54322 / 54323)**
→ Ai alt Supabase sau PostgreSQL pornit. Rulează `supabase stop` sau oprește serviciul conflictual.

**`supabase db reset` dă eroare**
→ Verifică că Docker Desktop rulează în fundal înainte să rulezi orice comandă Supabase.

---

## 📞 Contact

Pentru probleme legate de baza de date, contactează colegul de infrastructure.
