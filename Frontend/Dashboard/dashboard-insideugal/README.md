# 🎨 Documentație Detaliată Frontend - InsideUGAL

Acest modul gestionează interfața de administrare a platformei, construită pentru a fi modulară și ușor de extins.

## 👥 Ierarhia Utilizatorilor (RBAC)
Sistemul filtrează automat paginile vizibile în funcție de nivelul de acces:
* **Șef departament**: Acces la paginile de *Conturi* și *Structură*.
* **Profesor**: Acces la *Evenimente*, *Facultăți* și *Sesizări*.
* **Student Reprezentant**: Acces la *Noutăți* și *Cantină*.

## 🖼️ Structura Paginilor & Funcționalități

### 📍 Pagina: Hartă
* **Management Clădiri**: Permite introducerea de nume, adrese și coordonate GPS.
* **Sistem de Validare**: Afișează un badge de avertizare vizuală (**"Nepoziționat"**) pentru clădirile care apar în baza de date dar nu au coordonate setate.
* **Filtrare**: Vizualizarea clădirilor în funcție de facultatea de care aparțin.

### 🍴 Pagina: Cantină
* **Nomenclator Produse**: Tabel pentru gestiunea prețurilor, gramajului și a valorilor nutriționale (calorii, proteine).
* **Meniu Săptămânal**: Interfață pentru planificarea meniului pe zile lucrătoare.

### ⚠️ Pagina: Sesizări
* **Centralizator Ticketing**: Listă cu toate problemele raportate din campus.
* **Flux de Lucru**: Dropdown pentru schimbarea statusului (Nou, În lucru, Rezolvat, Respins).
* **Corelare Automată**: Fiecare sesizare afișează clădirea și facultatea de unde a fost trimisă.

### 🏫 Pagina: Facultăți
* **Date Identificare**: Acronim, nume complet și descriere.
* **Infrastructură**: Listă cu corpurile de clădire alocate și link-uri utile (site oficial, cazări).

## 🧩 Componente Reutilizabile
* **Sidebar (Meniu Lateral)**: Se restrânge pentru a optimiza spațiul și se randează dinamic.
* **Header**: Zonă fixă pentru profil și centrul de notificări push.

## 💻 Stack Tehnic
- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Interconectare**: Datele sunt preluate prin API-ul din modulul `app` și stocate în `supabase`.
