🗄️ Supabase - Arhitectura și Organizarea Datelor
Acest folder conține configurația bazei de date PostgreSQL și migrările necesare. Supabase funcționează ca „depozitul” central al proiectului, unde informațiile sunt organizate în tabele (sertare de date) securizate.

📊 Structura Tabelelor (Schema SQL)
📍 locations (Infrastructură)
Stochează locațiile fizice din campus pentru a fi afișate pe hartă.

Coloane cheie: id, name, address, coordinates (Lat/Long), faculty_id.

Rol: Sursa de date pentru harta din Frontend.

🍴 cafeteria_inventory (Cantină)
Inventarul de produse și preparate disponibile la cantină.

Coloane cheie: id, name, price, calories, proteins, is_available.

Rol: Afișarea meniului și a valorilor nutriționale pentru studenți.

⚠️ complaints (Ticketing)
Baza de date pentru sesizările și plângerile trimise de utilizatori.

Coloane cheie: id, user_id, location_id, description, status (new, in_progress, resolved).

Rol: Suportă fluxul de lucru pentru rezolvarea incidentelor din campus.

👥 profiles (Utilizatori)
Centralizatorul de utilizatori și permisiuni.

Conținut: Lista cu toți utilizatorii și „gradul” lor (Admin, Profesor, Student).

🔒 Reguli de Securitate (Policies - RLS)
Nu oricine poate modifica orice. Folosim Row Level Security pentru a controla accesul:

🔓 Public / Studenți: Pot doar să citească (SELECT) meniul și locațiile. Pot adăuga (INSERT) sesizări noi, dar nu le pot modifica pe cele existente.

🛡️ Admini: Au permisiuni de editare pentru a actualiza prețurile la cantină sau a schimba statusul sesizărilor.

⚙️ Service Role: Permite backend-ului (modulul app) să gestioneze datele fără restricții.

🔄 Folderul migrations
Aici se găsesc fișierele .sql care funcționează ca o „rețetă”:
Dacă proiectul trebuie mutat sau refăcut de la zero pe un alt server, aceste scripturi rulează în ordine cronologică pentru a recrea automat toate tabelele și regulile de securitate descrise mai sus.
