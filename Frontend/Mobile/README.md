<a name="readme-top"></a>
<div align="center">
  <h3 align="center">InsideUGAL — Aplicație Mobilă</h3>
  <p align="center">
    Aplicație React Native + Expo pentru studenții Universității "Dunărea de Jos" din Galați.<br>
    Suport nativ (iOS / Android) și web.
  </p>
</div>

<br />

---

## Ecrane implementate

| Ecran | Descriere |
|-------|-----------|
| **Acasă** | Feed anunțuri pe categorii, cu detaliu anunț și eveniment |
| **Cantină** | Meniu zilnic al cantinei universitare |
| **Hartă** | Hartă interactivă a campusului (MapLibre + MapTiler) |
| **Sesizări** | Lista sesizărilor proprii, adăugare și vizualizare detalii |
| **ACE** | Chatbot AI pentru asistență studenți |
| **Notificări** | Feed notificări cu stare citit/necitit persistată local |
| **Setări** | Temă (light/dark), limbă, preferințe cont |
| **Onboarding** | Solicitare permisiuni notificări și locație la primul acces |

---

## Pornire

```bash
npm install
npx expo start
```

Scanează codul QR cu **Expo Go** sau rulează pe:
- Emulator Android: `a`
- Simulator iOS: `i`
- Browser: `w`

---

## Variabile de mediu

```bash
cp .env.example .env
```

| Variabilă | Descriere |
|-----------|-----------|
| `EXPO_PUBLIC_API_BASE_URL` | URL-ul backend-ului FastAPI (ex: `http://<ip>:8002`) |
| `EXPO_PUBLIC_LLM_BASE_URL` | URL-ul serviciului LLM / chatbot (ex: `http://<ip>:8001`) |
| `EXPO_PUBLIC_MAPTILER_STYLE_URL` | URL stil hartă MapTiler (include API key) |
| `EXPO_PUBLIC_DASHBOARD_URL` | URL-ul dashboard-ului de administrare |

> Variabilele `EXPO_PUBLIC_*` sunt citite la pornirea serverului Expo. Orice modificare necesită restart.

---

## Stack tehnic

| Librărie | Rol |
|----------|-----|
| `expo-router` | Navigare file-based |
| `expo-notifications` | Permisiuni și push notifications |
| `expo-location` | Permisiuni locație |
| `expo-image-picker` | Upload imagini sesizări |
| `@maplibre/maplibre-react-native` + `maplibre-gl` | Hartă interactivă nativă și web |
| `expo-linear-gradient` | Gradienti UI |
| `react-native-reanimated` | Animații |
| `expo-image` | Încărcare optimizată imagini |
| `react-native-svg` | Iconițe SVG |
| `@react-native-async-storage/async-storage` | Persistență locală (notificări citite etc.) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>