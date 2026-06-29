# Ghid Integrare Traducere Automatã — Frontend

> Scris de echipa LLM. Backend-ul de traducere este **100% gata si functional**.
> Voi nu trebuie sa faceti nicio logica de traducere. Urmati pasii de mai jos.

---

## Cum functioneaza (pe scurt)

Un singur buton de limba controleaza **tot**:

1. **Interfata statica** (butoane, titluri, meniuri) → fisiere locale `.json`
2. **Datele dinamice** (anunturi, cantina, etc.) → header `Accept-Language` trimis automat la orice request

---

## Pasul 1 — Mobile (React Native / Expo)

### 1.1 Ecranul de limba exista deja ✅
Fisierele `limba.tsx` si `limba.web.tsx` din `(public)/more/` sunt deja construite.
**Nu trebuie sa creati un ecran nou.**

Lista de limbi recomandata (actualizati array-ul `languages` din ambele fisiere):

```ts
const languages = [
  { code: "ro", label: "🇷🇴 Română" },
  { code: "en", label: "🇬🇧 English" },
  { code: "hu", label: "🇭🇺 Magyar" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "uk", label: "🇺🇦 Українська" },
];
```

Sub lista asta, adaugati un camp de cautare pentru **orice alta limba** (vedeti sectiunea 1.3).

### 1.2 Legati `settingsStore.lang` de interceptorul din `api.ts`

In fisierul `src/services/api.ts`, la interceptorul de request (linia ~292), adaugati **o singura linie**:

```ts
// Request Interceptor (deja existent)
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // ... codul existent de token ...

    // ✅ ADAUGATI DOAR ACEASTA LINIE:
    const lang = settingsStore.getLang();
    if (lang && lang !== "ro") {
      config.headers["Accept-Language"] = lang;
    }

    return config;
  }
);
```

> Nu puneti header-ul pentru `ro` — backend-ul returneaza romana implicit fara sa apeleze AI-ul.

### 1.3 Campul de Search pentru limbi exotice

Sub lista de limbi principale din `limba.tsx`, adaugati un `TextInput` simplu:

```tsx
<TextInput
  placeholder="🌍 Cauta alta limba..."
  onSubmitEditing={(e) => {
    settingsStore.setLang(e.nativeEvent.text);
    router.back();
  }}
/>
```

Backend-ul accepta si denumiri libere (ex: "Japanese", "Swahili", "Hindi", "Arabic").

---

## Pasul 2 — Dashboard Web (Next.js)

### 2.1 Dropdown in Navbar

Adaugati un dropdown mic in coltul dreapta al Navbar-ului (langa avatar/profil), cu aceleasi 6-7 limbi principale + camp de search.

Salvati limba aleasa in `localStorage`:
```ts
localStorage.setItem("app_lang", "de");
```

### 2.2 Interceptor global axios

```ts
axios.interceptors.request.use((config) => {
  const lang = localStorage.getItem("app_lang") ?? "ro";
  if (lang !== "ro") {
    config.headers["Accept-Language"] = lang;
  }
  return config;
});
```

Daca folositi `fetch` nativ, wrappuiti-l:
```ts
// utils/api-fetch.ts
export function apiFetch(url: string, options: RequestInit = {}) {
  const lang = localStorage.getItem("app_lang") ?? "ro";
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(lang !== "ro" ? { "Accept-Language": lang } : {}),
    },
  });
}
```

---

## Pasul 3 — Interfata Statica (optional, pentru mai tarziu)

Daca vreti ca si **butoanele si titlurile** sa fie traduse (nu doar datele din backend):

1. Strangeti toate textele hardcodate din cod intr-un fisier `ro.json`.
2. Trimiteti-l lui Cosmin (echipa LLM).
3. Primiti inapoi `en.json`, `hu.json`, `de.json` etc. generate automat prin AI in cateva minute.
4. Integrati-le cu `react-i18next` (Mobile) sau `next-intl` (Dashboard).

> Aceasta parte este optionala pentru prima demonstratie. Datele dinamice se vor traduce automat
> fara niciun pas suplimentar din momentul in care adaugati interceptorul.

---

## Ce NU trebuie sa faceti

- ❌ Nu apelati direct endpointul `/translate` sau `/translate/batch` din frontend
- ❌ Nu faceti doua butoane separate pentru interfata vs. date
- ❌ Nu instalati librarii de traducere externe (Google Translate SDK, DeepL etc.)
- ❌ Nu modificati nimic in LLM sau Backend — totul e gata

---

## Rezumat final (un singur flow)

```
Utilizator apasa "Deutsch" (de)
        │
        ├─► settingsStore.setLang("de")      → interfata statica se schimba (daca aveti i18next)
        │
        └─► api.ts interceptor pune header   → orice request ulterior primeste datele traduse automat
              Accept-Language: de
                    │
                    └─► Backend → LLM Gemini → raspuns in Germana (cu cache in Supabase)
```

---

## Contact

Orice intrebare despre backend/LLM → Cosmin (branch `feature/translation-service`).
