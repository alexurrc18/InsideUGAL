# Ghid de Management DB — InsideUGAL

Fundația bazei de date este administrată exclusiv prin migrări Supabase.

## 📜 Reguli de aur
1. **Imutabilitate:** Niciodată nu editați o migrare (`.sql`) care a primit deja merge pe branch-ul `main`. Va strica mediile locale ale colegilor.
2. **Idempotent:** Toate scripturile noi trebuie să folosească structuri de tip `CREATE TABLE IF NOT EXISTS` sau `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
3. **Scop unic:** O migrare trebuie să aibă un singur scop clar (ex: doar adăugarea unei tabele, nu amestecată cu politici sau seed).

## 🔄 Rularea mediului local
Pentru a curăța și reîncărca baza de date locală cu cele 10 produse de cantină, 5 locații, 3 cămine și utilizatorii de test, rulați:



