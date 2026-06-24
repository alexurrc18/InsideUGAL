# 🤖 Asistentul Virtual InsideUGAL & Servicii AI

> ⚠️ **Notă Arhitecturală:** Acest modul este 100% cloud-native și orientat spre viața din campus. Fosta arhitectură locală a fost eliminată.

## 📖 Despre Modul

Acest director conține serviciile de Inteligență Artificială ale platformei **InsideUGAL**, operate ca un **API Backend Integrat** bazat pe FastAPI (`combined_app.py`).

Scopul principal este asistarea studenților și a secretariatului prin intermediul a două componente majore:

1. **Asistentul Virtual al Campusului (Sistem RAG)**
2. **Smart News Parser (Extragere Inteligentă a Anunțurilor)**

## 🏗️ Arhitectura (Cloud-Native)

- **Bază de Date Vectorială:** Baza de cunoștințe folosește exclusiv **Supabase `pgvector`**.
- **Generare Vectori (Embeddings):** API extern Google Gemini (`text-embedding-004`).
- **Model Limbaj (Generare Chatbot):** Google Gemini (`gemini-2.5-flash`).
- **Parsare Anunțuri (JSON Extraction):** OpenRouter (`openai/gpt-4o-mini`) + Fallback Gemini.
- **Generare Imagini (Bannere Anunțuri):** OpenRouter (`x-ai/grok-imagine-image-quality`) + Fallback HuggingFace (`FLUX.1-schnell`).
- **Reziliență:** Circuit Breaker (`pybreaker`) și mecanisme Retry Exponențial (`tenacity`).
- **Caching:** Cache semantic pe răspunsuri recurente în Supabase.

## 🚀 Endpoint-uri Principale

- `POST /api/v1/ask`: (Campus Chat) Căutare semantică RAG și răspuns.
- `POST /api/v1/upload-pdf`: Procesare PDF, chunking și indexare în `pgvector`.
- `POST /api/v1/extract-announcement-info`: Extragere structurată metadate din anunțuri.
- `POST /api/v1/admin/rebuild-rag`: Declanșare manuală rebuild index RAG (necesită `X-Admin-Secret`).
- `POST /webhook/supabase`: Ingestie automată date din webhook Supabase (necesită `X-Webhook-Secret`).

## ⚙️ Configurare (Variabile de mediu)

Asigurați-vă că fișierul `LLM/.env` conține următoarele variabile:

- `GEMINI_API_KEY`: Cheia API pentru Google Gemini.
- `ADMIN_SECRET`: Secretul utilizat pentru securizarea endpoint-ului `/api/v1/admin/rebuild-rag`.
- `SUPABASE_WEBHOOK_SECRET`: Secretul utilizat pentru securizarea endpoint-ului `/webhook/supabase`.


## 🧪 Testare & Evaluare

Pentru a valida funcționalitatea și integrarea cu Supabase, rulați testele în interiorul containerului Docker al proiectului:

### Rularea Testelor

1. Asigurați-vă că mediul Docker este pornit:
   ```bash
   docker compose up -d
   ```

2. Rulați suita de teste (Unit & Integration):
   ```bash
   docker compose exec llm pytest tests/ -v
   ```

3. Pentru teste specifice (ex: integrare):
   ```bash
   docker compose exec llm pytest tests/test_integration.py -v
   ```

Modulul include o suită avansată de evaluare automată (`LLM-as-a-Judge`) pentru validarea calității răspunsurilor.
