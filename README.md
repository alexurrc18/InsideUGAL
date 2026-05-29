# 🎓 InsideUGAL

> Platforma internă de colaborare și coordonare pentru studenții și coordonatorii Universității "Dunărea de Jos" din Galați.

<a href="#">
  <img src="./assets/universitate.jpg" alt="thumbnail">
</a>

---

## 📌 Despre Proiect

**🏛️ InsideUGAL - Platformă Universitară** este o platformă digitală creată pentru a facilita comunicarea și colaborarea între studenți și coordonatori în cadrul Universității "Dunărea de Jos" din Galați (UGAL).

Proiectul a fost dezvoltat cu scopul de a centraliza activitățile academice, de a simplifica fluxul de lucru și de a crea un spațiu comun unde informațiile ajung rapid la toți cei implicați.

📂 Locație Documentație Module
Proiectul a fost structurat în module independente. Pentru detalii tehnice specifice, accesați fișierele dedicate:

🎨 Frontend -> Frontend/Dashboard/dashboard-insideugal/README.md

Interfața de administrare (Next.js & Tailwind).

⚙️ Backend -> app/README.md

Logica de business și API (FastAPI).

🤖 LLM -> LLM/README.md

Integrarea ChatBot-ului AI.

🗄️ Database -> supabase/migrations/README.md

Schema bazei de date și politici de securitate RLS.

🎯 User Stories -> docs/STORIES.md

Cerințele funcționale, ierarhia de acces și obiectivele pe echipe.

🚀 Pornire Proiect (Docker)
Întregul ecosistem este containerizat. Nu este necesară instalarea dependențelor local (ex: npm install) la rădăcina proiectului. Toate serviciile sunt orchestrate prin Docker.

Pentru a porni platforma, rulați comanda:

Bash
docker compose up
