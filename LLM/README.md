# InsideUGAL - Serviciu LLM (Inteligență Artificială)

Acest modul conține componenta de AI a platformei **InsideUGAL**, expunând un API scris în **FastAPI**. Gestionează procesarea inteligentă a documentelor (RAG) și extragerea automată a datelor folosind modelele de limbaj Gemini.

## 🚀 Arhitectură și Funcționalități

Am migrat către o arhitectură 100% *stateless / cloud-native*, ceea ce permite aplicației să scaleze orizontal pe mai multe instanțe:

- **Procesare PDF Asincronă:** Extragerea textului, *chunking-ul* și vectorizarea se fac în background prin `BackgroundTasks` din FastAPI, pentru a nu bloca răspunsurile HTTP.
- **Supabase Storage:** Fișierele PDF încărcate se salvează imediat într-un bucket privat Supabase (`documents`). API-ul descarcă fișierul fizic doar într-un obiect temporar (`tempfile`) pe parcursul procesării AI, autodistrugându-l ulterior.
- **Supabase pgvector:** Am înlocuit baza de date locală pe disc (ChromaDB) cu extensia **pgvector** din PostgreSQL (via RPC). Toate cunoștințele sunt astfel unificate cu baza principală de date.
- **Integrare Gemini API:** Generăm vectori cu `sentence-transformers` (`all-MiniLM-L6-v2`) și generăm răspunsuri folosind modelul `gemini-2.5-flash` de la Google.
- **Detectare Automată a Limbii:** Textele sunt procesate, iar întrebările și quiz-urile sunt generate automat în limba documentului original (ex: română, engleză, franceză).
- **Smart News Parser:** Extragere nativă de entități (titlu, organizator, locație, timestamp precis) din anunțuri textuale nesortate.

## 📋 Endpoints Principale

Rutele de AI se pot testa direct din interfața Swagger la adresa `/docs`:

- `POST /api/v1/upload-pdf` - Încarcă documentul, îl pune în Storage și începe procesarea în fundal.
- `POST /api/v1/summary` - Generează un rezumat structurat pe baza `pdf_id`-ului.
- `POST /api/v1/ask` - Răspunde la o întrebare direct din conținutul PDF-ului dat.
- `POST /api/v1/quiz` - Generează o grilă de teste cu explicații extrase din document.
- `POST /api/v1/extract-announcement-info` - Extrage titlu, locație și intervale orare dintr-un text "Smart News".
- `DELETE /api/v1/delete-pdf/{pdf_id}` - Șterge documentul din Storage și realizează un *garbage collection* vectorial în baza de date.

## ⚙️ Configurare Locală

### 1. Instalare dependențe

```bash
cd LLM
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
pip install python-multipart
```

### 2. Variabile de mediu

Creează un fișier `.env` în directorul `/LLM` cu următoarele chei:

```env
GEMINI_API_KEY=cheia_ta_de_la_google_aistudio

# Acestea pot fi copiate din terminal rulând `npx supabase status` la rădăcina proiectului
SUPABASE_URL=http://127.0.0.1:54325
SUPABASE_SERVICE_KEY=cheia_service_role_secret
```

### 3. Pornirea Serverului

```bash
python combined_app.py
```
Serverul va fi disponibil la `http://127.0.0.1:8000`.