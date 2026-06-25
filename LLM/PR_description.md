# fix(llm): Robustețe și îmbunătățiri pipeline generare bannere AI (`smart-news-parser`)

## Rezumat

Această ramură aduce fix-uri critice și îmbunătățiri pentru modulul de generare bannere AI din `LLM/src/smart-news-parser/image_service_v2.py`. Înainte, endpoint-ul `/api/v1/generate-banner` returna erori `500` în Docker și nu gestiona corect lipsa upload-ului Supabase.

---

## Modificări

### 1. Fallback base64 când Supabase Storage nu e disponibil
**Commits:** `625a0e6`, `fa48245`

- Dacă upload-ul în Supabase Storage eșuează, imaginea generată este returnată ca `data:image/jpeg;base64,...` în câmpul `image_base64`
- Auto-creare bucket `images` dacă nu există la pornirea serviciului
- Endpoint-ul nu mai returnează `500` — răspunde întotdeauna `200 OK` cu imaginea în cel puțin un format (`image_url` sau `image_base64`)

---

### 2. Fix erori critice de runtime
**Commit:** `ee6e72e`

- **`UnboundLocalError: cannot access local variable 're'`** — eliminat `import re` duplicat din interiorul `_generate_with_openrouter`
- **`[Errno 11001] getaddrinfo failed`** — `httpx/anyio` are probleme DNS pe Windows / Python 3.14; înlocuit cu `requests` (sync) + `asyncio.to_thread` pentru `_generate_with_flux()` și `_generate_prompt()`

---

### 3. Sistem nou de generare prompt vizual (template-based)
**Commit:** `ee6e72e`

Înlocuit abordarea anterioară (LLM text genera promptul de la zero → rezultate abstracte) cu sistem în două etape:

**Etapa 1 — `_build_base_prompt()`:** prompt concret construit în Python, fără dependință de rețea, pentru toate cele 13 `TipEveniment` + sub-categorii din taguri:

| Tip detectat | Elemente vizuale |
|---|---|
| `concurs` + IT/tech | Trofeu + laptop cu cod + circuite holografice |
| `concurs` + sport | Trofeu sportiv + motion blur + medalii |
| `bursa` UE (SMIS / Fond Social European) | Piggy bank central + steag UE pictat pe el + monede |
| `bursa` socială | Piggy bank + inimi + lumină caldă |
| `bursa` merit | Diplomă + laur + stele aurii |
| `transport` / decontare | Tren/autobuz stilizat + bilete holografice |
| `conferinta` / seminar / workshop | Podium + microfon + lightbulb icons |
| `cazare` | Clădire modernă + cheie + fereastră caldă |
| `examen` / partial / colocviu | Carte + timer countdown |
| `admitere` / master | Poartă universitară + diplomă |
| `doctorat` / cercetare | Formule + molecule + data viz |
| `oportunitate` / Erasmus | Ușă deschisă + glob |
| `anunt_general` / `administrativ` | → asset pre-fabricat (fără generare AI) |

**Etapa 2 — `_generate_prompt()`:** GPT-4o-mini (OpenRouter) enhances template-ul cu 1-2 detalii specifice anunțului. Dacă pică → template-ul merge direct la Grok.

---

### 4. Detecție îmbunătățită a contextului
**Commit:** `ee6e72e`

- `combined` include acum și `rezumat_notificare` → detectează corect „Fond Social European", „SMIS", „cofinanțat", „UEFISCDI" din rezumatul anunțului
- Cardul de debit eliminat din toate template-urile de bursă

---

### 5. Rutare corectă `anunt_general` / `administrativ` → assets pre-fabricate
**Commit:** `ee6e72e`

```
anunt_general / administrativ
├── entitate_sursa cu keyword facultate  →  banner_[facultate].jpg
├── tip == "cazare"                      →  banner_camin.jpg
└── fără facultate specifică             →  banner_universitate.jpg  (NU generare AI)
```

`thematic_types` extins: `bursa`, `internship`, `admitere`, `examen`, `partial`, `colocviu`, `proiect`, `laborator` declanșează acum corect generarea AI tematică.

---

### 6. `requirements.txt`
- `aiohttp` mutat în secțiunea `AI & LLM` (era sub `Testing` → `ImportError` în Docker)
- `requests` adăugat explicit

---

## Fișiere modificate

| Fișier | Modificări |
|---|---|
| `LLM/src/smart-news-parser/image_service_v2.py` | +413 / -77 linii |
| `LLM/requirements.txt` | +2 / -1 linii |

---

## Testare

- `/api/v1/generate-banner` testat cu: concurs IT, bursă socială UE, bursă merit, decontare transport, conferință
- `200 OK` cu `image_url` când Supabase disponibil
- `200 OK` cu `image_base64` când Supabase indisponibil (local fără Docker)
- `/api/v1/extract-announcement-info` neafectat
