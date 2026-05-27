# modul-marius — Generator Rezumat & Quiz din PDF

Modul LLM care permite studentilor sa incarce fisiere PDF si sa primeasca automat un rezumat structurat, un quiz cu variante de raspuns si un chatbot pentru intrebari despre continutul documentului.

---

## Functionalitati

- **Upload PDF** — studentul incarca un document PDF de curs
- **Rezumat automat** — Gemini genereaza un rezumat structurat (idei principale, concepte, ce trebuie retinut)
- **Quiz automat** — 5-10 intrebari cu variante A/B/C/D, raspuns corect si explicatii pentru fiecare varianta
- **Chatbot** — studentul poate pune intrebari despre PDF si primeste raspunsuri bazate exclusiv pe continutul documentului
- **Multiple PDF-uri** — sidebar cu lista tuturor PDF-urilor incarcate, switch intre ele fara sa reapeleze Gemini
- **Export quiz PDF** — descarca quiz-ul ca fisier PDF (intrebari + cheie de raspunsuri)
- **Detectie automata limba** — detecteaza limba PDF-ului (romana, engleza, franceza etc.) si Gemini raspunde in aceeasi limba
- **Logging Supabase** — fiecare apel LLM, intrebare din chat si scor quiz sunt salvate in baza de date

---

## Arhitectura

```
modul-marius/
├── app.py                          # Server Flask — endpoints REST
├── functions/
│   └── llm_functions.py           # Logica RAG + apeluri Gemini
├── schemas.py                      # Validare input/output cu Pydantic v2
├── cache.py                        # Cache SHA256 cu SQLite
├── supabase_logger.py              # Logging tokeni, intrebari, scoruri in Supabase
├── static/
│   └── index.html                  # Interfata web (sidebar + rezumat + quiz + chat)
├── uploads/                        # PDF-urile incarcate (ignorat de git)
├── chroma_db/                      # Baza de date vectoriala ChromaDB (ignorat de git)
├── requirements.txt
├── create_llm_calls_table.sql
├── create_questions_history_table.sql
└── create_quiz_scores_table.sql
```

---

## Flux tehnic

1. **Upload** — PDF-ul este salvat local, textul este extras cu `pdfplumber`
2. **Detectie limba** — `langdetect` detecteaza automat limba documentului
3. **RAG** — textul este impartit in chunk-uri de 200 de cuvinte si stocat in ChromaDB cu embeddings `all-MiniLM-L6-v2`
4. **Generare paralela** — rezumatul si quiz-ul sunt generate simultan prin `ThreadPoolExecutor`
5. **Apel Gemini** — `gemini-2.5-flash` cu circuit breaker (5 erori → deschide), retry exponential (max 3) si timeout 30s
6. **Cache** — raspunsurile Gemini sunt cacuite in SQLite dupa hash SHA256 al promptului
7. **Validare** — output-ul LLM este validat cu Pydantic v2 inainte de a fi returnat
8. **Logging** — fiecare apel, intrebare si scor este trimis asincron in Supabase (fire-and-forget)

---

## Endpoints API

| Method | Endpoint | Descriere |
|--------|----------|-----------|
| `GET` | `/` | Interfata web |
| `POST` | `/upload` | Incarca PDF, genereaza rezumat + quiz |
| `GET` | `/pdfs` | Lista tuturor PDF-urilor incarcate |
| `DELETE` | `/pdfs/<pdf_id>` | Sterge un PDF |
| `POST` | `/ask` | Pune o intrebare despre un PDF |
| `POST` | `/score` | Salveaza scorul quiz-ului |

---

## Baza de date Supabase

Trei tabele create cu SQL-urile din folder:

**`llm_calls`** — logheaza fiecare apel catre Gemini
| Coloana | Tip | Descriere |
|---------|-----|-----------|
| function_name | text | generate_summary / generate_quiz / answer_question |
| model | text | gemini-2.5-flash |
| prompt_tokens | integer | Tokeni trimisi |
| response_tokens | integer | Tokeni primiti |
| total_tokens | integer | Total tokeni consumati |
| cached | boolean | Daca raspunsul a venit din cache |
| duration_ms | integer | Timp raspuns in milisecunde |

**`questions_history`** — logheaza fiecare intrebare din chatbot
| Coloana | Tip | Descriere |
|---------|-----|-----------|
| pdf_id | text | ID-ul PDF-ului |
| question | text | Intrebarea pusa de student |
| answer | text | Raspunsul generat |

**`quiz_scores`** — salveaza scorul final al fiecarui quiz
| Coloana | Tip | Descriere |
|---------|-----|-----------|
| pdf_id | text | ID-ul PDF-ului |
| correct | integer | Raspunsuri corecte |
| total | integer | Total intrebari |

---

## Rezilienta

- **Circuit breaker** — `pybreaker`: se inchide dupa 5 erori consecutive, se reseteaza dupa 60s
- **Retry** — `tenacity`: max 3 incercari, asteptare exponentiala 2-10s
- **Timeout** — 30 secunde per apel Gemini
- **Cache** — evita apeluri duplicate pentru acelasi prompt
- **Logging fire-and-forget** — erorile de logging nu blocheaza raspunsul catre student

---

## Instalare si rulare

```bash
# Instaleaza dependentele
pip install -r requirements.txt

# Seteaza variabilele de mediu in LLM/.env
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

# Creeaza tabelele in Supabase Studio (SQL Editor)
# Ruleaza: create_llm_calls_table.sql
# Ruleaza: create_questions_history_table.sql
# Ruleaza: create_quiz_scores_table.sql

# Porneste serverul
python app.py
# Acceseaza http://localhost:5000
```

---

## Tehnologii folosite

| Tehnologie | Rol |
|-----------|-----|
| Flask | Server web |
| Google Gemini 2.5 Flash | Model LLM |
| ChromaDB | Baza de date vectoriala (RAG) |
| sentence-transformers | Embeddings (all-MiniLM-L6-v2) |
| pdfplumber | Extragere text din PDF |
| langdetect | Detectie automata limba |
| Pydantic v2 | Validare contracte LLM |
| pybreaker | Circuit breaker |
| tenacity | Retry logic |
| SQLite | Cache raspunsuri LLM |
| Supabase | Logging si analytics |
| jsPDF | Export quiz ca PDF (client-side) |
