import os
import re
import time
import json
import base64
import threading
import requests
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

load_dotenv()

app = Flask(__name__)
CORS(app)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "").strip().strip("'").strip('"')
GEMINI_MODEL       = "gemini-2.5-flash"

_gemini_client  = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
_gemini_breaker = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60)

MODELS = [
    "nvidia/nemotron-nano-9b-v2:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

print("Se încarcă indexul RAG...")
rag = RAGEngine()
print(f"RAG gata — {rag.collection.count()} chunk-uri indexate.")

RESCRAPE_INTERVAL_HOURS = 1

def _run_scraper(full_rebuild: bool = False):
    try:
        if full_rebuild:
            print("[Scraper] Rebuild complet — șterg indexul vechi...")
            rag.rebuild()
        chunks = scrape_all()
        rag.ingest(chunks)
        print(f"[Scraper] Index actualizat: {rag.collection.count()} chunk-uri totale.")
    except Exception as e:
        print(f"[Scraper] Eroare: {e}")

def _schedule_scraper():
    while True:
        time.sleep(RESCRAPE_INTERVAL_HOURS * 3600)
        print(f"[Scraper] Re-scraping automat (la fiecare {RESCRAPE_INTERVAL_HOURS}h)...")
        _run_scraper(full_rebuild=True)

if rag.collection.count() < 50:
    print("[Scraper] Index mic — pornesc scraping inițial în background...")
    threading.Thread(target=_run_scraper, daemon=True).start()
else:
    print(f"[Scraper] Index populat ({rag.collection.count()} chunk-uri).")

threading.Thread(target=_schedule_scraper, daemon=True).start()
print(f"[Scraper] Re-scraping automat activat la fiecare {RESCRAPE_INTERVAL_HOURS} ore.")

# ── Helpers ─────────────────────────────────────────────────────────────────

def _generate_suggestions(question: str, answer: str) -> list[str]:
    if not _gemini_client or len(answer) < 50:
        return []
    try:
        prompt = (
            f"Pe baza acestei conversații despre UGAL, propune 3 întrebări scurte de follow-up în română.\n"
            f"Întrebarea: {question}\nRăspunsul (extras): {answer[:300]}\n\n"
            "Răspunde cu exact 3 sugestii scurte și complete, câte una pe linie, fără numerotare sau prefix."
        )
        resp = _gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(temperature=0.7, max_output_tokens=300),
        )
        lines = [
            ln.strip().lstrip("0123456789.-) ").strip()
            for ln in (resp.text or "").strip().splitlines()
            if ln.strip()
        ]
        return [q for q in lines if 10 < len(q) < 150][:3]
    except Exception:
        return []


SYSTEM_BASE = """Ești InsideUGAL Assistant — asistentul virtual oficial al aplicației InsideUGAL și al Universității "Dunărea de Jos" din Galați (UGAL), România.
Site universitate: https://www.ugal.ro/ | Aplicație: https://insideugal.ro/

═══ COMPORTAMENT ═══
• Răspunzi la întrebări despre: aplicația InsideUGAL, toate facultățile UGAL, admitere, burse, taxe, examene, orar, cantină, cămine, contact, servicii studențești.
• Dacă întrebarea nu are legătură cu UGAL sau InsideUGAL, refuzi politicos și oferi exemple de ce poți ajuta.
• Detectezi automat limba utilizatorului (română, engleză, franceză etc.) și răspunzi în ACEEAȘI limbă.

═══ ACURATEȚE ═══
• Răspunzi EXCLUSIV pe baza contextului furnizat mai jos. Nu inventa nicio informație.
• Dacă o informație nu apare în context, spune clar că nu o ai și îndrumă spre https://www.ugal.ro/ sau secretariatul facultății respective.
• INTERZIS să inventezi URL-uri. Folosești EXCLUSIV link-urile care apar literal în contextul de mai jos. Dacă nu ai un link valid în context, NU pune niciun link.
• Nu inventa taxe, medii, date, numere de telefon sau alte date concrete. Folosești DOAR ce apare în context.

═══ FORMAT RĂSPUNSURI ═══
• Fii concis și direct — nu repeta întrebarea, nu da introduceri lungi.
• Structurează răspunsul cu titluri bold (**Titlu**), liste cu - sau 1. 2. 3., când are sens.
• Pentru liste de programe, specializări, documente — folosește obligatoriu listă cu bullet points.
• Pentru date calendaristice — scoate în evidență datele importante cu bold.
• La final, dacă e relevant, adaugă link-ul exact de pe site pentru mai multe detalii.
• Răspunsuri scurte pentru întrebări simple, detaliate pentru întrebări complexe.

═══ CONTEXT RELEVANT ═══
"""

# ── Meniu cantină ────────────────────────────────────────────────────────────

MENU_KEYWORDS = ["cantina", "cantină", "meniu", "meniuri", "menu", "mancare", "mâncare",
                 "masa", "masă", "pranz", "prânz", "ce se mananca", "ce mănânc", "canteen", "food"]

def fetch_canteen_menu():
    try:
        resp = requests.get("https://campus.ugal.ro/ccps/wp-json/wp/v2/pages/5758", timeout=8)
        resp.raise_for_status()
        html = resp.json().get("content", {}).get("rendered", "")
        text = re.sub(r"<[^>]+>", "\n", html)
        text = re.sub(r"&#\d+;|&[a-z]+;|&amp;|&lt;|&gt;", " ", text)
        text = re.sub(r"&hellip;", "...", text)
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        def is_js(line):
            return any([
                line.startswith(("var ", "document.", "function", "new ", "d =", "d=",
                                 "var d", "newDate", "Date.")),
                re.match(r"^[a-z_$]\s*=\s*", line),
                line.endswith(";") and "(" in line,
            ])
        lines = [ln for ln in lines if not is_js(ln)]

        menu_lines = []
        CATEGORIES = {"Ciorbe și supe", "garnituri", "Preparate carne",
                      "Salate/sosuri", "Pâine", "Desert", "Meniul zilei",
                      "PROGRAM  CANTINE STUDENȚEȘTI", "PROGRAM  CANTINĂ  STUDENȚEASCĂ:",
                      "PROGRAM  CANTINĂ  CORP J:", "PROGRAM  CANTINĂ  UNIVERSITATE:"}
        i = 0
        while i < len(lines):
            line = lines[i]
            if line in CATEGORIES or line.startswith("PROGRAM"):
                menu_lines.append(f"\n**{line}**")
            elif re.match(r"^\d+[,\.]\d+$", line) and i + 1 < len(lines) and lines[i+1] == "lei":
                if menu_lines:
                    menu_lines[-1] += f" — {line} lei"
                i += 2
                continue
            elif line == "lei":
                pass
            else:
                menu_lines.append(line)
            i += 1
        return "\n".join(menu_lines).strip()
    except Exception:
        return None

def is_menu_question(text):
    return any(kw in text.lower() for kw in MENU_KEYWORDS)

# ── FAQ fallback ──────────────────────────────────────────────────────────────

FACULTY_KEYWORDS = [
    "admitere", "înscriere", "inscriere", "admission", "enroll", "apply", "dosar",
    "specializare", "program", "licenta", "licență", "bachelor", "master", "masterat",
    "bursa", "bursă", "burse", "scholarship", "taxa", "taxă", "taxe", "fee",
    "contact", "telefon", "secretariat", "adresa", "erasmus", "mobilitate", "exchange",
    "orar", "schedule", "timetable", "laborator", "facultate", "faciee", "ugal",
    "curs", "examen", "diplomă", "diploma", "stagiu", "practica", "practică",
    "canteen", "food", "hackathon", "concurs", "cercetare", "research", "campus",
]

def _detect_lang(text):
    en_markers = ["what", "how", "when", "where", "who", "which", "are", "is", "the",
                  "admission", "requirements", "bachelor", "master", "scholarship",
                  "program", "faculty", "university", "fee", "cost", "contact"]
    return "en" if sum(1 for w in en_markers if w in text.lower()) >= 2 else "ro"

def faq_fallback(question):
    lang = _detect_lang(question)
    q = question.lower()

    if is_menu_question(question):
        menu = fetch_canteen_menu()
        if menu:
            header = "**Today's canteen menu**" if lang == "en" else "**Meniul cantinei (astăzi)**"
            return f"{header}\n\n{menu}"
        link = "https://campus.ugal.ro/ccps/meniu-studenti/"
        return (f"The canteen menu is available at: {link}" if lang == "en"
                else f"Nu am putut prelua meniul. Verifică: {link}")

    is_faculty_related = any(kw in q for kw in FACULTY_KEYWORDS)
    if not is_faculty_related:
        if lang == "en":
            return ("I can only answer questions about FACIEE – the Faculty of Automation, "
                    "Computers, Electrical and Electronic Engineering in Galați.")
        return ("Îmi pare rău, pot răspunde doar la întrebări despre Facultatea FACIEE "
                "din Galați. Dacă ai o întrebare despre facultate, sunt aici să ajut!")

    rag_result = rag.query(question, n_results=4)
    if rag_result and len(rag_result) > 80:
        return rag_result

    if lang == "en":
        return ("I couldn't connect to AI right now. Find all info at: "
                "https://www.ugal.ro/ or call +40 336 130 236 (Mon–Fri 12:00–14:00)")
    return ("Nu am putut conecta la AI. Găsești toate informațiile la: "
            "https://www.ugal.ro/\nSau sună: +40 336 130 236 (L–V 12:00–14:00)")

# ── Rute ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/health")
def health():
    return jsonify({"status": "ok", "rag_chunks": rag.collection.count()})

@app.route("/rebuild-rag", methods=["POST"])
def rebuild_rag():
    threading.Thread(target=lambda: _run_scraper(full_rebuild=True), daemon=True).start()
    return jsonify({"status": "ok", "message": "Rebuild pornit în background"})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    image_data = data.get("image_data")

    if not user_message:
        return jsonify({"error": "Mesaj gol"}), 400

    sources: list[str] = []

    if is_menu_question(user_message):
        menu_text = fetch_canteen_menu()
        if menu_text:
            context = f"MENIUL CANTINEI (actualizat live astăzi):\n{menu_text}\n\nPrezintă meniul structurat pe categorii cu prețurile."
        else:
            context = "Meniul cantinei nu a putut fi preluat acum. Trimite utilizatorul la: https://campus.ugal.ro/ccps/meniu-studenti/"
    else:
        backend_context = backend_client.fetch_context(user_message)
        raw_context, sources = rag.query_with_sources(user_message, n_results=5)

        if backend_context and raw_context:
            context = backend_context + "\n\n---\n\n" + raw_context
        elif backend_context:
            context = backend_context
        elif raw_context:
            context = raw_context
        else:
            context = "Nu am găsit informații specifice. Îndrumă utilizatorul spre https://www.ugal.ro/"

    system = SYSTEM_BASE + context
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_message},
    ]

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
                    print(f"[Gemini] Eroare procesare imagine: {img_err}")

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
            print(f"[Gemini] Eroare: {e}")
            return None

    def try_openrouter():
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "InsideUGAL Chatbot",
        }
        for model in MODELS:
            try:
                resp = requests.post(
                    OPENROUTER_URL,
                    headers=headers,
                    json={"model": model, "messages": messages, "max_tokens": 2000, "temperature": 0.3, "stream": True},
                    timeout=20, stream=True,
                )
                if resp.status_code == 429:
                    continue
                resp.raise_for_status()
                return resp
            except Exception:
                continue
        return None

    def generate():
        full_content = []

        cache_key = llm_cache.make_key(user_message + context, GEMINI_MODEL)
        cached_resp = llm_cache.get(cache_key)
        if cached_resp:
            for token in re.split(r"(\s+)", cached_resp):
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
            suggestions = _generate_suggestions(user_message, cached_resp)
            yield f"data: {json.dumps({'done': True, 'sources': sources, 'suggestions': suggestions})}\n\n"
            return

        gemini_stream = try_gemini_stream()
        if gemini_stream:
            try:
                for chunk in gemini_stream:
                    token = chunk.text
                    if token:
                        full_content.append(token)
                        yield f"data: {json.dumps({'token': token})}\n\n"
            except Exception as e:
                print(f"[Gemini] Stream error: {e}")
            finally:
                assistant_message = "".join(full_content)
                if assistant_message:
                    llm_cache.set(cache_key, assistant_message)
                suggestions = _generate_suggestions(user_message, assistant_message)
                yield f"data: {json.dumps({'done': True, 'sources': sources, 'suggestions': suggestions})}\n\n"
            return

        working_resp = try_openrouter()

        if not working_resp:
            yield f"data: {json.dumps({'waiting': True})}\n\n"
            for wait in (4, 7):
                time.sleep(wait)
                working_resp = try_openrouter()
                if working_resp:
                    break

        if not working_resp:
            answer = faq_fallback(user_message)
            for token in re.split(r"(\s+)", answer):
                if token:
                    full_content.append(token)
                    yield f"data: {json.dumps({'token': token})}\n\n"
            suggestions = _generate_suggestions(user_message, answer)
            yield f"data: {json.dumps({'done': True, 'sources': sources, 'suggestions': suggestions})}\n\n"
            return

        try:
            for line in working_resp.iter_lines():
                if not line:
                    continue
                line = line.decode("utf-8")
                if not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    token = chunk["choices"][0].get("delta", {}).get("content", "")
                    if token:
                        full_content.append(token)
                        yield f"data: {json.dumps({'token': token})}\n\n"
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
        finally:
            assistant_message = "".join(full_content)
            if assistant_message:
                llm_cache.set(cache_key, assistant_message)
            suggestions = _generate_suggestions(user_message, assistant_message)
            yield f"data: {json.dumps({'done': True, 'sources': sources, 'suggestions': suggestions})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@app.route("/api/announcements")
def api_announcements():
    data = backend_client._get("/announcements")
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

    threading.Thread(
        target=lambda: rag.ingest([{
            "id": chunk_id,
            "text": "\n".join(parts),
            "source": chunk_src,
            "type": "webhook",
        }]),
        daemon=True,
    ).start()

    print(f"[Webhook] Ingestat: {chunk_id}")
    return jsonify({"status": "ok", "id": chunk_id})


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true", port=5000)
