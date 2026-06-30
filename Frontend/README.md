<a name="readme-top"></a>
<div align="center">
  <h3 align="center">InsideUGAL — Frontend</h3>
  <p align="center">
    Interfețele utilizator ale platformei InsideUGAL:<br>un panou de control web pentru coordonatori și o aplicație mobilă pentru studenți.
  </p>
</div>

---

## Dashboard Web (`Dashboard/`)

Panou de control Next.js + Tailwind CSS destinat coordonatorilor și angajaților universității.

**Pagini implementate:**
- **Noutăți** — gestionarea anunțurilor și evenimentelor
- **Sesizări** — vizualizarea și procesarea sesizărilor studenților
- **Cantină** — administrarea meniului și produselor
- **Hărți** — gestionarea locațiilor și punctelor de interes din campus
- **Facultăți** — administrarea structurii facultăților
- **Conturi** — gestionarea utilizatorilor și rolurilor
- **Notificări** — trimiterea notificărilor către studenți

**Pornire:**

```bash
cd Dashboard/dashboard-insideugal
npm install
npm run dev
```

Disponibil la `http://localhost:3000`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Aplicație Mobilă (`Mobile/`)

Aplicație React Native + Expo destinată studenților, cu suport nativ (iOS/Android) și web.

**Ecrane implementate:**
- **Acasă** — feed anunțuri pe categorii, cu detaliu anunț și eveniment
- **Cantină** — meniu zilnic
- **Hartă** — harta interactivă a campusului cu locații și puncte de interes
- **Sesizări** — lista sesizărilor proprii, adăugare și detalii
- **ACE** — chatbot AI integrat pentru asistență studenți
- **Notificări** — feed cu stare citit/necitit persistată local
- **Setări** — temă (light/dark), limbă, preferințe cont
- **Onboarding** — solicitare permisiuni notificări și locație la primul acces

**Pornire:**

```bash
cd Mobile
npm install
npx expo start
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Roluri de acces

| Rol | Acces Dashboard | Acces Mobile |
|-----|----------------|--------------|
| **Administrator** | Complet | — |
| **Profesor / Staff** | Noutăți, Evenimente, vizualizare completă | — |
| **Student Responsabil** | Doar propriile anunțuri și evenimente | — |
| **Student** | Nu are acces | Toate ecranele |
