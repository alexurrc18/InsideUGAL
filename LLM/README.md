# InsideUGAL — LLM Module (consolidat)

Acest README unifică documentația internă pentru tot ce ține de LLM în proiect: extragere task-uri, ingestie PDF + RAG, Q&A, generare rezumat și quiz. Scopul: să ai o singură sursă clară pentru dezvoltare, configurare și înțelegerea arhitecturii.

## 1. Prezentare generală

- Serviciul integrat este `LLM/combined_app.py` — un API FastAPI care expune funcționalitățile principale.
- Există două componente principale:
  - `smart-news-parser`: extragere structuratã de task-uri din anunțuri folosind Google Gemini (biblioteca `google-genai`).
  - `modul-marius`: ingestie PDF → indexare în Chroma DB → RAG + apeluri LLM pentru `ask`, `summary`, `quiz`.

## 2. Diagramă simplă a fluxului

1. Extragere task-uri
   - Client → `POST /api/v1/extract-tasks` → `smart-news-parser.llm_service.LLMService.extract_tasks(text)` → GenAI (Gemini) → validare Pydantic → răspuns structurat.

2. Ingestie PDF și RAG
   - Client → `POST /api/v1/upload-pdf` → fișier salvat în `LLM/modul-marius/uploads/` → `modul-marius.functions.load_pdf_into_rag` → extragere text (`pdfplumber`) → chunking → embeddings (`sentence-transformers`) → stocat în Chroma DB local.

3. Q&A / Rezumat / Quiz
   - Client → `POST /api/v1/ask|summary|quiz` → `modul-marius.functions` interoghează colecția Chroma pentru `pdf_id` → construiește prompt cu contextul relevant (cele mai bune n chunk-uri) → apelează LLM (Gemini) cu mecanisme de retry, caching și circuit-breaker → parse și validate răspuns → returnează.

## 3. Fișiere și locuri importante

- API integrat: [LLM/combined_app.py](LLM/combined_app.py#L1)
- Extracție task-uri: [LLM/modul-deadlines/llm_service.py](LLM/modul-deadlines/llm_service.py#L1)
- Schema task-uri: [LLM/modul-deadlines/schemas.py](LLM/modul-deadlines/schemas.py#L1)
- PDF / RAG / QA: [LLM/modul-marius/functions/llm_functions.py](LLM/modul-marius/functions/llm_functions.py#L1)
- Schema PDF/QA: [LLM/modul-marius/schemas.py](LLM/modul-marius/schemas.py#L1)
- Exemple locale / prototip: [LLM/exemplu AI](LLM/exemplu%20AI/README.md)

## 4. Configurare (env & dependențe)

- Instalează dependențele principale:

```bash
python -m pip install --user -r LLM/requirements.txt
```

- Variabile de mediu (exemplu `.env` în root-ul `LLM`):

```env
GEMINI_API_KEY=sk-...     # cheia Google GenAI (Gemini) folosită de ambele module
OPENROUTER_API_KEY=...   # folosit doar în exemple (LLM/exemplu AI)
DATABASE_URL=...         # opțional, dacă înregistrezi loguri/telemetrie
```

Notă: `combined_app.py` încarcă variabilele din `LLM/.env` și toate modulele active folosesc aceeași locație.

> Folosește un singur fișier de requirements: `LLM/requirements.txt`. Fișierele `requirements.txt` ale modulelor au fost arhivate în `LLM/archived_examples/`.

## 5. Cum rulezi local (quickstart)

1. Asigură-ți că `GEMINI_API_KEY` este setat.
2. Rulează API-ul integrat:

```bash
python LLM/combined_app.py
# sau, pentru reload dev:
uvicorn LLM.combined_app:app --reload --port 8000
```

3. Deschide Swagger UI: `http://127.0.0.1:8000/docs`

## 6. Endpoint-uri (sumar)

- `GET /` — health check
- `POST /api/v1/extract-tasks` — body: `{ "text": "..." }` → returnează `ExtractedTaskResponse` (vezi schema în LLM/smart-news-parser/schemas.py).
- `POST /api/v1/upload-pdf` — multipart upload PDF → răspunde `{ pdf_id }` după indexare în Chroma.
- `POST /api/v1/ask` — body: `{ "question": "...", "pdf_id": "..." }` → returnează `AnswerQuestionOutput`.
- `POST /api/v1/summary` — body: `{ "pdf_id": "..." }` → returnează `GenerateSummaryOutput`.
- `POST /api/v1/quiz` — body: `{ "pdf_id": "..." }` → returnează `GenerateQuizOutput`.

Vezi definițiile Pydantic pentru detalii (validări, formate): [LLM/modul-marius/schemas.py](LLM/modul-marius/schemas.py#L1).

## 7. Detalii implementare și bune practici

- Apelurile LLM din `modul-marius` folosesc:
  - caching intern (`llm_cache`) pentru a evita costuri duplicate
  - `pybreaker` circuit breaker pentru degradare controlată
  - `tenacity` retry exponential backoff la erori temporare
  - execuție cu timeout (ThreadPoolExecutor) pentru a opri apelurile blocate

- Indexarea PDF:
  - text extras cu `pdfplumber`
  - chunking simplu pe cuvinte (`chunk_size` implicit 200, overlap 30)
  - embeddings generate cu `sentence-transformers` (`all-MiniLM-L6-v2`)
  - stocate local în Chroma DB persistent

- Extracția de taskuri (`smart-news-parser`):
  - folosește `google-genai` (Gemini) cu `response_schema` Pydantic când e posibil
  - promptul conține reguli stricte (format, deadline calculat relativ la data curentă, taguri)

## 8. Testare

- Sunt teste pentru modulele de exemplu și pentru `LLM`:
  - [LLM/evals](LLM/evals) conține test-evaluate
  - [LLM/exemplu AI/tests](LLM/exemplu%20AI/tests) conține teste pentru `prompt_builder`, `output_parser`, `llm_client`

Rulează teste cu:

```bash
pytest -q LLM
```

## 9. Limitări cunoscute și riscuri

- Dependență directă de API-urile comerciale (costuri, rate limits).
- Răspunsurile LLM pot necesita validare și sanitizare (în special pentru JSON generat de quiz).
- Chunking simplu poate duce la pierdere de context în documente complexe; recomandat: îmbunătăţirea metodei de chunking (pe paragraf + sentințe).

## 10. Propuneri de îmbunătățire (next steps)

- Centralizare `.env` și documentare clară a variabilelor necesare.
- Adăugare job-uri de curățare pentru Chroma (gestionare spațiu) și o rută de ștergere PDF/colecție.
- Script de testare end-to-end: upload PDF → ask → verify schema răspuns.
- Extragere rate-limit și monitorizare costuri LLM (telemetrie Supabase deja utilizată în cod).

---

Dacă vrei, pot:

- genera exemple `curl` pentru fiecare endpoint,
- rula testele din `LLM` (dacă vrei să rulez local),
- crea un `CONTRIBUTING` mic pentru modulul `LLM`.

Spune-mi ce preferi să fac mai departe.
