# 🤖 Asistentul Virtual InsideUGAL & Servicii AI

> ⚠️ **Notă Arhitecturală:** Acest modul a fost rescris și refactorizat complet. Fosta aplicație Desktop (CustomTkinter), baza de date vectorială locală (ChromaDB), modelul `sentence-transformers` local și funcționalitățile de generare Quiz au fost **arhivate și eliminate** pentru a face platforma 100% cloud-native și orientată spre viața din campus.

## 📖 Despre Modul

Acest director conține serviciile de Inteligență Artificială ale platformei **InsideUGAL**, operate acum ca un **API Backend Integrat** bazat pe FastAPI. 

Scopul principal este asistarea studenților și a secretariatului prin intermediul a două componente majore:

1. **Asistentul Virtual al Campusului (Sistem RAG)**
2. **Smart News Parser (Extragere Inteligentă a Anunțurilor)**

## 🏗️ Arhitectura Nouă (Cloud-Native)

- **Bază de Date Vectorială:** Baza de cunoștințe folosește exclusiv **Supabase `pgvector`** (tabela `document_chunks` și funcția RPC `match_document_chunks`).
- **Generare Vectori (Embeddings):** Se folosește API-ul extern Google Gemini (`text-embedding-004`), asigurând un consum minim de spațiu și o viteză ridicată de procesare.
- **Model Limbaj (Generare):** Google Gemini (`gemini-2.5-flash`), configurat printr-un prompt strict să se comporte ca "Asistent Administrativ InsideUGAL". Extrage informații exclusiv din documentele universității și redirecționează utilizatorii politicos spre secretariat în caz contrar.
- **Generare Imagini (Text-to-Image):** Hugging Face Inference API (`FLUX.1-schnell`) pentru generarea cover-urilor pentru anunțuri.
- **Reziliență:** Integrare nativă de Circuit Breaker (`pybreaker`) și mecanisme Retry Exponențial (`tenacity`) pentru toleranța la picarea serviciilor AI.
- **Telemetrie și Caching:** Logarea consumului de tokeni direct în Supabase, rulată asincron (fire-and-forget), și cache pe răspunsuri recurente.

## 🚀 Endpoint-uri Principale

Aceste rute sunt expuse pentru Frontend direct prin gateway-ul principal `combined_app.py`:

- `POST /api/v1/ask`: (Campus Chat) Primește întrebarea studentului, caută semantic contextul în Supabase și returnează un răspuns administrativ util.
- `POST /api/v1/upload-pdf`: Extrage textul dintr-un document PDF administrativ, împarte inteligent datele (chunking cu overlap) și le stochează în `pgvector`.
- `POST /api/v1/extract-announcement-info`: Extrage structurat metadate (deadline, tip eveniment, public țintă) dintr-un text brut de la profesori și generează la cerere imagini.

## 🧪 Testare & Evaluare (LLM as a Judge)

Modulul include o suită avansată de evaluare automată (`LLM-as-a-Judge`). La fiecare deploy sau schimbare de prompt-uri, AI-ul își evaluează propriile răspunsuri primind note de la 1 la 5 pentru **Relevanță** și **Acuratețe** (pe baza a zeci de întrebări administrative prestabilite).

Pentru a rula testele E2E (inclusiv testele de stress pentru circuit breaker):
```bash
pytest "LLM/ChatBot AI/evals/" -v -m eval -s
```