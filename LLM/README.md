# InsideUGAL LLM Module

Această secțiune centralizează tot ce ține de LLM-ul nostru: integrarea task extraction + PDF/RAG + quiz/summary/qa.

## Ce face LLM-ul nostru

- `LLM/combined_app.py`
  - un serviciu FastAPI care combină modulele `modul-deadlines` și `modul-marius`
  - oferă endpoint-uri pentru:
    - extragerea task-urilor din anunțuri
    - încărcarea PDF-urilor în vector DB
    - întrebări pe baza materialului PDF
    - generare rezumat
    - generare quiz

- `LLM/modul-deadlines`
  - serviciu de analiză text cu Gemini
  - folosește schema `GeminiTaskOutput` și `ExtractedTaskResponse`
  - transformă anunțurile UGAL/facultăți în date structurate

- `LLM/modul-marius`
  - PDF ingestion + RAG + LLM calls
  - funcționalități pentru:
    - indexare PDF în Chroma DB
    - răspuns de tip Q&A
    - generare rezumat de curs
    - generare quiz de verificare

## Cum se configurează

1. Instalează dependențele:

   ```bash
   python -m pip install --user -r LLM/requirements.txt
   ```

2. Setează cheia Gemini în `LLM/modul-deadlines/.env`:

   ```env
   GEMINI_API_KEY=cheia_ta_google_ai_studio
   ```

3. Rulează serviciul integrat:
   ```bash
   python LLM/combined_app.py
   ```

## Endpoints disponibili

- `GET /` - health check
- `POST /api/v1/extract-tasks` - extragere task-uri din `text`
- `POST /api/v1/upload-pdf` - upload PDF și indexare vectorială
- `POST /api/v1/ask` - întrebare pe baza PDF-ului încărcat
- `POST /api/v1/summary` - rezumat generat din PDF
- `POST /api/v1/quiz` - quiz generat din PDF

## Testare rapidă

1. Deschide documentația automată:
   - `http://127.0.0.1:8000/docs`

2. Folosește Swagger UI ca să testezi endpoint-urile.

3. Pentru `upload-pdf`, obține `pdf_id` și folosește-l la `/ask`, `/summary`, `/quiz`.

## Cum fac PR pe branch-ul de LLM

Dacă te afli pe branch-ul `LLM-integration` și vrei să împingi schimbările către remote și să deschizi PR pe branch-ul `LLM`:

```bash
cd c:/Users/Administrator/Desktop/Practica/InsideUGAL
git add LLM/combined_app.py LLM/requirements.txt LLM/README.md LLM/modul-deadlines/requirements.txt
git commit -m "Integrare LLM: serviciu FastAPI + README + dependențe"
git push -u origin LLM-integration
```

Apoi, în GitHub/GitLab:

- deschide un Pull Request din `LLM-integration`
- targetează `LLM` sau `main` (după cum este convenit în echipă)
- descrie ce conține PR-ul

## Sugestie de taskuri pentru patru oameni

### 1) Setup, dependențe și infrastructură

- Curăță `LLM/requirements.txt`
- Fix `.env` și ghid de instalare
- Asigură stabilitatea la instalare pe Windows/Linux
- Documentează pașii de rulare și debugging

### 2) Modul task extraction (`modul-deadlines`)

- Îmbunătățește promptul și schema LLM pentru `ExtractedTaskResponse`
- Adaugă validări pentru datele extrase
- Gestionează erori și răspunsuri nevalide
- Testează extragerea pe anunțuri reale UGAL

### 3) Modul PDF / RAG / QA (`modul-marius`)

- Optimizează chunking-ul și indexarea în Chroma
- Verifică eventualele probleme de embedded/recall
- Îmbunătățește prompturile pentru QA, rezumat și quiz
- Adaugă validare și retry la parsare JSON

### 4) API integrat și UX pentru dezvoltatori

- Finalizează `LLM/combined_app.py`
- Adaugă validări request/response și cod de stare
- Construiește teste de integrare pentru endpoint-uri
- Verifică documentația `swagger` și `README`

## Ce poate fi următorul pas

- Adaugăm un script de testare automată pentru `LLM/combined_app.py`
- Refactorizăm modulele ca să nu mai importe `schemas` ambiguu
- Adăugăm un exemplu de request `curl` în README
