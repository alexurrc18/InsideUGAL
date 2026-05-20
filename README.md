# 🎓 InsideUGAL

> Platforma internă de colaborare și coordonare pentru studenții și coordonatorii Universității "Dunărea de Jos" din Galați.

<a href="#">
  <img src="./assets/universitate.jpg" alt="thumbnail">
</a>

---

## 📌 Despre Proiect

**InsideUGAL** este o platformă digitală creată pentru a facilita comunicarea și colaborarea între studenți și coordonatori în cadrul Universității "Dunărea de Jos" din Galați (UGAL).

Proiectul a fost dezvoltat cu scopul de a centraliza activitățile academice, de a simplifica fluxul de lucru și de a crea un spațiu comun unde informațiile ajung rapid la toți cei implicați.

---

## 🎯 Scopul Proiectului

- Îmbunătățirea comunicării dintre studenți și coordonatori
- Centralizarea resurselor și activităților universitare
- Simplificarea procesului de coordonare a proiectelor și sarcinilor
- Crearea unei comunități digitale pentru membrii UGAL

---

## ⚙️ Funcționalități

- 📋 Gestionarea activităților și sarcinilor
- 👥 Colaborare în timp real între membri
- 📁 Partajarea resurselor și documentelor
- 📢 Sistem de anunțuri și notificări
- 🔐 Autentificare și roluri (student / coordonator)

## 🗂️ Structura Arhitecturală a Platformei

Proiectul este împărțit în trei module mari interconectate:

### 1. Modulul Student (Portal Academic)
* **Dashboard Personalizat:** Vizualizarea sarcinilor curente, termenelor limită și anunțurilor din facultate.
* **Management de Proiect:** Spațiu virtual pentru lucrul în echipă la proiectele de semestru.
* **Repository de Resurse:** Acces rapid la materiale de curs și documente partajate de coordonatori.

### 2. Modulul Cantină UGAL (Servicii Campus)
* **Live Menu:** Afișarea listei de preparate actualizată zilnic de către personalul bucătăriei.
* **Smart Filter & Alergeni:** Filtrarea mâncărurilor după ingrediente, calorii sau regim alimentar (vegetarian/de post).
* **Traffic Indicator:** Monitorizarea vizuală a fluxului de studenți pentru evitarea orelor de vârf.

### 3. Modulul Coordonator & Admin (Panou de Control)
* **Gestiune Utilizatori:** Validarea conturilor și alocarea drepturilor (student/profesor).
* **Content Manager:** Publicarea anunțurilor globale și administrarea listei de prețuri a cantinei.

---

## 🚀 Cum rulezi proiectul local

```bash
git clone [https://github.com/alexurrc18/InsideUGAL](https://github.com/alexurrc18/InsideUGAL)
cd InsideUGAL
npm install
npm start
```
---

## 🛠️ Tehnologii folosite

- Git & GitHub — version control și colaborare

---

## 📬 Contact

Pentru întrebări sau sugestii, deschide un Issue pe GitHub sau contactează echipa direct prin platformă.

---


## 🍕 API Endpoints (Exemplu Cantină)

Dacă vrei să integrezi meniul cantinei în alte aplicații, poți folosi următoarele rute:

*Va fi completat ulterior*


- `GET /api/cantina/menu` - Returnează preparatele din ziua curentă.
- `GET /api/cantina/traffic` - Returnează nivelul de aglomerație (Low/Medium/High).

*Proiect dezvoltat în cadrul Universității "Dunărea de Jos" din Galați 🇷🇴*
