import os
import re
import time
import json
import base64
import logging
import threading
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
from rag_engine import RAGEngine
from scraper import scrape_all
from google import genai
from google.genai import types as genai_types
import pybreaker
import cache as llm_cache
import backend_client
from rate_limiter import chat_limiter

from chatbot_shared import (
    SYSTEM_PROMPT, GEMINI_MODEL,
    detect_link, detect_lang, generate_suggestions,
    MIN_ANSWER_LENGTH_FOR_SOURCES,
    CIRCUIT_BREAKER_FAIL_MAX, CIRCUIT_BREAKER_RESET_TIMEOUT,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("chatbot.app")

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "").strip().strip("'").strip('"')

_gemini_client  = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
_gemini_breaker = pybreaker.CircuitBreaker(
    fail_max=CIRCUIT_BREAKER_FAIL_MAX,
    reset_timeout=CIRCUIT_BREAKER_RESET_TIMEOUT,
)

logger.info("Se încarcă indexul RAG...")
rag = RAGEngine()
logger.info("RAG gata — %d chunk-uri indexate.", rag.collection.count())

# ── Lock pentru operațiuni RAG thread-safe ─────────────────────────────────────
_rag_lock = threading.Lock()
_scraping_in_progress = threading.Event()

RESCRAPE_INTERVAL_HOURS = 24

def _run_scraper(full_rebuild: bool = False):
    if _scraping_in_progress.is_set():
        logger.warning("Scraping deja în desfășurare — skip.")
        return
    _scraping_in_progress.set()
    try:
        if full_rebuild:
            logger.info("Rebuild complet — șterg indexul vechi...")
            with _rag_lock:
                rag.rebuild()
        chunks = scrape_all()
        with _rag_lock:
            rag.ingest(chunks)
        logger.info("Index actualizat: %d chunk-uri totale.", rag.collection.count())
    except Exception as e:
        logger.error("Eroare scraper: %s", e, exc_info=True)
    finally:
        _scraping_in_progress.clear()

def _schedule_scraper():
    while True:
        time.sleep(RESCRAPE_INTERVAL_HOURS * 3600)
        logger.info("Re-scraping automat (la fiecare %dh)...", RESCRAPE_INTERVAL_HOURS)
        _run_scraper(full_rebuild=True)

if rag.collection.count() < 50:
    logger.info("Index mic — pornesc scraping inițial în background...")
    threading.Thread(target=_run_scraper, daemon=True).start()
else:
    logger.info("Index populat (%d chunk-uri).", rag.collection.count())

threading.Thread(target=_schedule_scraper, daemon=True).start()
logger.info("Re-scraping automat activat la fiecare %d ore.", RESCRAPE_INTERVAL_HOURS)

# ── Rute ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/health")
def health():
    return jsonify({"status": "ok", "rag_chunks": rag.collection.count()})

@app.route("/rebuild-rag", methods=["POST"])
def rebuild_rag():
    secret = request.headers.get("X-Admin-Secret", "")
    expected = os.getenv("ADMIN_SECRET", "")
    if expected and secret != expected:
        return jsonify({"error": "Unauthorized"}), 401
    threading.Thread(target=lambda: _run_scraper(full_rebuild=True), daemon=True).start()
    return jsonify({"status": "ok", "message": "Rebuild pornit în background"})

@app.route("/chat", methods=["POST"])
def chat():
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
    if not chat_limiter.is_allowed(client_ip):
        return jsonify({"error": "Prea multe cereri. Încearcă din nou într-un minut."}), 429

    data = request.get_json()
    user_message = data.get("message", "").strip()
    image_data = data.get("image_data")

    if not user_message:
        return jsonify({"error": "Mesaj gol"}), 400

    sources: list[str] = []
    backend_context = ""
    nav_link = detect_link(user_message) or backend_client.fetch_entity_link(user_message)

    # Un singur pass Supabase — returnează contextul complet + contextul focusat
    full_context, focused_context = backend_client.fetch_context_combined(user_message)
    if focused_context:
        backend_context = focused_context
        context = full_context
        sources = []
    else:
        # Fără intent recunoscut — caută în RAG (site-uri facultăți)
        with _rag_lock:
            raw_context, sources = rag.query_with_sources(user_message, n_results=3)
        context = raw_context or "Nu am găsit informații specifice. Îndrumă utilizatorul spre https://www.ugal.ro/"
        backend_context = raw_context

    system = SYSTEM_PROMPT + context

    def try_gemini_stream():
        if not _gemini_client:
            return None
        try:
            history = [
                genai_types.Content(role="user", parts=[genai_types.Part(text=user_message)])
            ]

            if image_data and history:
                try:
                    header, b64str = image_data.split(",", 1)
                    mime_match = re.search(r"data:([^;]+)", header)
                    mime_type = mime_match.group(1) if mime_match else "image/jpeg"
                    img_bytes = base64.b64decode(b64str)
                    history[0] = genai_types.Content(
                        role="user",
                        parts=[
                            genai_types.Part(inline_data=genai_types.Blob(mime_type=mime_type, data=img_bytes)),
                            genai_types.Part(text=user_message),
                        ],
                    )
                except Exception as img_err:
                    logger.warning("Eroare procesare imagine: %s", img_err)

            @_gemini_breaker
            def _call():
                return _gemini_client.models.generate_content_stream(
                    model=GEMINI_MODEL,
                    contents=history,
                    config=genai_types.GenerateContentConfig(
                        system_instruction=system,
                        temperature=0.3,
                    ),
                )
            return _call()
        except pybreaker.CircuitBreakerError:
            return None
        except Exception as e:
            logger.error("Gemini eroare: %s", e)
            return None

    def generate():
        full_content = []

        cache_key = llm_cache.make_key(user_message + context, GEMINI_MODEL)
        cached_resp = llm_cache.get(cache_key)
        if cached_resp:
            for token in re.split(r"(\s+)", cached_resp):
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
            suggestions = generate_suggestions(user_message, cached_resp, _gemini_client, GEMINI_MODEL)
            visible = [] if len(cached_resp.strip()) < MIN_ANSWER_LENGTH_FOR_SOURCES else sources
            yield f"data: {json.dumps({'done': True, 'sources': visible, 'suggestions': suggestions, 'link': nav_link})}\n\n"
            return

        gemini_stream = try_gemini_stream()
        if gemini_stream:
            stream_failed = False
            try:
                for chunk in gemini_stream:
                    token = chunk.text
                    if token:
                        full_content.append(token)
                        yield f"data: {json.dumps({'token': token})}\n\n"
            except Exception as e:
                logger.error("Gemini stream error: %s", e)
                stream_failed = True

            if not stream_failed:
                assistant_message = "".join(full_content)
                if assistant_message:
                    llm_cache.set(cache_key, assistant_message)
                suggestions = generate_suggestions(user_message, assistant_message, _gemini_client, GEMINI_MODEL)
                visible = [] if len(assistant_message.strip()) < MIN_ANSWER_LENGTH_FOR_SOURCES else sources
                yield f"data: {json.dumps({'done': True, 'sources': visible, 'suggestions': suggestions, 'link': nav_link})}\n\n"
                return
            if stream_failed and full_content:
                yield f"data: {json.dumps({'clear': True})}\n\n"

        if backend_context:
            answer = backend_context
        else:
            sources.clear()
            lang = detect_lang(user_message)
            if lang == "en":
                answer = "I don't have details on this right now. You can find more information at https://www.ugal.ro/ or contact the faculty secretariat directly."
            else:
                answer = "Nu am detalii despre asta în acest moment. Poți găsi mai multe informații la https://www.ugal.ro/ sau contactează direct secretariatul facultății."
        for token in re.split(r"(\s+)", answer):
            if token:
                full_content.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
        suggestions = generate_suggestions(user_message, answer, _gemini_client, GEMINI_MODEL)
        visible = [] if len(answer.strip()) < MIN_ANSWER_LENGTH_FOR_SOURCES else sources
        yield f"data: {json.dumps({'done': True, 'sources': visible, 'suggestions': suggestions, 'link': nav_link})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@app.route("/api/announcements")
def api_announcements():
    data = backend_client._fetch("announcements", "/announcements")
    return jsonify(data or [])


@app.route("/webhook/supabase", methods=["POST"])
def webhook_supabase():
    secret = request.headers.get("X-Webhook-Secret", "")
    expected = os.getenv("SUPABASE_WEBHOOK_SECRET", "")
    if expected and secret != expected:
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    if payload.get("type") != "INSERT":
        return jsonify({"status": "ignored"})

    record = payload.get("record", {})
    table  = payload.get("table", "unknown")

    parts = []
    if record.get("title"):
        parts.append(f"Titlu: {record['title']}")
    if record.get("content") or record.get("description"):
        parts.append(record.get("content") or record.get("description"))
    if record.get("url"):
        parts.append(f"Link: {record['url']}")

    if not parts:
        return jsonify({"status": "no_content"})

    import uuid
    chunk_id  = f"webhook_{table}_{record.get('id', uuid.uuid4().hex[:8])}"
    chunk_src = record.get("url") or f"supabase/{table}"

    # Ingestare cu lock pentru thread-safety
    def _ingest_webhook():
        with _rag_lock:
            rag.ingest([{
                "id": chunk_id,
                "text": "\n".join(parts),
                "source": chunk_src,
                "type": "webhook",
            }])

    threading.Thread(target=_ingest_webhook, daemon=True).start()

    logger.info("Webhook ingestat: %s", chunk_id)
    return jsonify({"status": "ok", "id": chunk_id})


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true", port=5000)
