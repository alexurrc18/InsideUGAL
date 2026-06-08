import os
import re
import time
import json
import uuid
import base64
import threading
import requests
from datetime import datetime
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
from rag_engine import RAGEngine
from scraper import scrape_faciee, scrape_all
from google import genai
from google.genai import types as genai_types
import pybreaker
import hashlib
import cache as llm_cache
import backend_client

load_dotenv()

app = Flask(__name__)
CORS(app)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "").strip().strip("'").strip('"')
GEMINI_MODEL       = "gemini-2.5-flash"
CONVERSATIONS_DIR  = os.path.join(os.path.dirname(__file__), "conversations")
SUPABASE_URL       = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY       = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")

_gemini_client  = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
_gemini_breaker = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60)

MODELS = [
    "nvidia/nemotron-nano-9b-v2:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

def _knowledge_hash() -> str:
    """Hash-ul tuturor fișierelor din knowledge/ — dacă se schimbă, RAG se rebuilduiește."""
    kdir = os.path.join(os.path.dirname(__file__), "knowledge")
    h = hashlib.sha256()
    for fname in sorted(os.listdir(kdir)):
        if fname.endswith(".txt"):
            with open(os.path.join(kdir, fname), "rb") as f:
                h.update(fname.encode() + f.read())
    return h.hexdigest()

KNOWLEDGE_HASH_FILE = os.path.join(os.path.dirname(__file__), ".knowledge_hash")

print("Se încarcă indexul RAG...")
rag = RAGEngine()

# Rebuild dacă knowledge files s-au schimbat
current_hash = _knowledge_hash()
stored_hash  = open(KNOWLEDGE_HASH_FILE).read().strip() if os.path.exists(KNOWLEDGE_HASH_FILE) else ""
if current_hash != stored_hash:
    print("[RAG] Fișiere knowledge noi/modificate — rebuild index...")
    rag.rebuild()
    with open(KNOWLEDGE_HASH_FILE, "w") as f:
        f.write(current_hash)
    print(f"[RAG] Rebuild complet — {rag.collection.count()} chunk-uri.")

print(f"RAG gata — {rag.collection.count()} chunk-uri indexate.")

RESCRAPE_INTERVAL_HOURS = 1  # re-scrape automat la fiecare oră

def _run_scraper(full_rebuild: bool = False):
    """Rulează scraperrul în background și ingestează chunk-urile din toate sursele."""
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
    """Rulează scraperrul periodic la fiecare RESCRAPE_INTERVAL_HOURS ore."""
    while True:
        time.sleep(RESCRAPE_INTERVAL_HOURS * 3600)
        print(f"[Scraper] Re-scraping automat (la fiecare {RESCRAPE_INTERVAL_HOURS}h)...")
        _run_scraper(full_rebuild=True)

# La pornire: scrape dacă indexul e mic
if rag.collection.count() < 50:
    print("[Scraper] Index mic — pornesc scraping inițial în background...")
    threading.Thread(target=_run_scraper, daemon=True).start()
else:
    print(f"[Scraper] Index populat ({rag.collection.count()} chunk-uri).")

# Job periodic în background
threading.Thread(target=_schedule_scraper, daemon=True).start()
print(f"[Scraper] Re-scraping automat activat la fiecare {RESCRAPE_INTERVAL_HOURS} ore.")

# ── Helpers conversație ─────────────────────────────────────────────────────

def _truncate_history(messages: list, max_chars: int = 10000) -> list:
    """Trunchiază istoricul la max_chars, păstrând minim ultimele 4 mesaje."""
    if len(messages) <= 4:
        return messages
    msgs = list(messages)
    total = sum(len(m["content"]) for m in msgs)
    while total > max_chars and len(msgs) > 4:
        removed = msgs.pop(0)
        total -= len(removed["content"])
    return msgs


def _generate_suggestions(question: str, answer: str) -> list[str]:
    """Generează 3 întrebări sugerate folosind Gemini (fără streaming)."""
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

# ── Helpers pentru fișiere ──────────────────────────────────────────────────

def slugify(text):
    text = text.lower().strip()
    ro_map = str.maketrans("ăâîșțĂÂÎȘȚ", "aaistaaist")
    text = text.translate(ro_map)
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:35].rstrip("-") or "conversatie"

def make_filename(title, conv_id):
    return f"{slugify(title)}_{conv_id}"

def find_conv_file(conv_id):
    """Găsește fișierul după ID (suportă și fișierele vechi cu nume UUID)."""
    direct = os.path.join(CONVERSATIONS_DIR, f"{conv_id}.json")
    if os.path.exists(direct):
        return direct
    for fname in os.listdir(CONVERSATIONS_DIR):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(CONVERSATIONS_DIR, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            if data.get("id") == conv_id:
                return fpath
        except (json.JSONDecodeError, KeyError):
            continue
    return None

def save_conversation(conv, old_filename=None):
    conv["updated_at"] = datetime.now().isoformat()
    new_path = os.path.join(CONVERSATIONS_DIR, f"{conv['filename']}.json")
    if old_filename and old_filename != conv["filename"]:
        old_path = os.path.join(CONVERSATIONS_DIR, f"{old_filename}.json")
        if os.path.exists(old_path):
            os.remove(old_path)
    with open(new_path, "w", encoding="utf-8") as f:
        json.dump(conv, f, ensure_ascii=False, indent=2)

def load_conversation(conv_id):
    fpath = find_conv_file(conv_id)
    if not fpath:
        return None
    with open(fpath, "r", encoding="utf-8") as f:
        return json.load(f)

def list_conversations():
    convs = []
    for fname in os.listdir(CONVERSATIONS_DIR):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(CONVERSATIONS_DIR, fname), "r", encoding="utf-8") as f:
                data = json.load(f)
            convs.append({
                "id": data["id"],
                "title": data.get("title", "Conversație nouă"),
                "updated_at": data.get("updated_at", ""),
                "message_count": len(data.get("messages", [])),
            })
        except (json.JSONDecodeError, KeyError):
            continue
    convs.sort(key=lambda x: x["updated_at"], reverse=True)
    return convs

def make_title(text):
    title = text.strip()[:50]
    return title + ("…" if len(text.strip()) > 50 else "")

# ── Supabase — istoricul conversațiilor per cont ─────────────────────────────

def _sb_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

def _sb_save_conv(conv: dict, user_id: str):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/chatbot_conversations",
            headers={**_sb_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            json={
                "id": conv["id"],
                "user_id": user_id,
                "title": conv.get("title", "Conversație nouă"),
                "messages": conv.get("messages", []),
                "updated_at": conv.get("updated_at", datetime.now().isoformat()),
            },
            timeout=5,
        )
    except Exception as e:
        print(f"[Supabase] save_conv: {e}")

def _sb_list_convs(user_id: str) -> list:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/chatbot_conversations"
            f"?user_id=eq.{user_id}&order=updated_at.desc&limit=50"
            f"&select=id,title,updated_at,messages",
            headers=_sb_headers(),
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json() or []
    except Exception:
        pass
    return []

def _sb_get_conv(conv_id: str, user_id: str) -> dict | None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/chatbot_conversations"
            f"?id=eq.{conv_id}&user_id=eq.{user_id}&limit=1",
            headers=_sb_headers(),
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data[0] if data else None
    except Exception:
        pass
    return None

def _sb_delete_conv(conv_id: str, user_id: str):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/chatbot_conversations"
            f"?id=eq.{conv_id}&user_id=eq.{user_id}",
            headers=_sb_headers(),
            timeout=5,
        )
    except Exception as e:
        print(f"[Supabase] delete_conv: {e}")

def _save_conv(conv: dict, user_id: str | None, old_filename: str | None = None):
    """Salvează în Supabase dacă user_id e prezent, altfel local."""
    if user_id:
        conv["updated_at"] = datetime.now().isoformat()
        _sb_save_conv(conv, user_id)
    else:
        save_conversation(conv, old_filename=old_filename)

# ── Meniu cantină (fetch live) ──────────────────────────────────────────────

MENU_KEYWORDS = ["cantina", "cantină", "meniu", "meniuri", "menu", "mancare", "mâncare",
                 "masa", "masă", "pranz", "prânz", "ce se mananca", "ce mănânc", "canteen", "food"]

def fetch_canteen_menu():
    try:
        resp = requests.get(
            "https://campus.ugal.ro/ccps/wp-json/wp/v2/pages/5758",
            timeout=8
        )
        resp.raise_for_status()
        html = resp.json().get("content", {}).get("rendered", "")
        text = re.sub(r"<[^>]+>", "\n", html)
        text = re.sub(r"&#\d+;|&[a-z]+;|&amp;|&lt;|&gt;", " ", text)
        text = re.sub(r"&hellip;", "...", text)

        lines = [line.strip() for line in text.splitlines() if line.strip()]

        # Filtrează orice linie care arată a cod JS
        def is_js(line):
            return any([
                line.startswith(("var ", "document.", "function", "new ", "d =", "d=",
                                 "var d", "newDate", "Date.")),
                re.match(r"^[a-z_$]\s*=\s*", line),
                line.endswith(";") and "(" in line,
            ])

        lines = [ln for ln in lines if not is_js(ln)]

        # Reconstituie meniul structurat
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
                # Prețul — alipim la rândul anterior
                if menu_lines:
                    menu_lines[-1] += f" — {line} lei"
                i += 2
                continue
            elif line == "lei":
                pass  # skip "lei" standalone
            else:
                menu_lines.append(line)
            i += 1

        return "\n".join(menu_lines).strip()
    except Exception:
        return None

def is_menu_question(text):
    t = text.lower()
    return any(kw in t for kw in MENU_KEYWORDS)

# ── FAQ fallback (când toate modelele sunt ocupate) ──────────────────────────

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
    t = text.lower()
    return "en" if sum(1 for w in en_markers if w in t) >= 2 else "ro"

def faq_fallback(question):
    lang = _detect_lang(question)
    q = question.lower()

    # 1. Cantina → fetch live
    if is_menu_question(question):
        menu = fetch_canteen_menu()
        if menu:
            header = "**Today's canteen menu**" if lang == "en" else "**Meniul cantinei (astăzi)**"
            return f"{header}\n\n{menu}"
        link = "https://campus.ugal.ro/ccps/meniu-studenti/"
        return (f"The canteen menu is available at: {link}" if lang == "en"
                else f"Nu am putut prelua meniul. Verifică: {link}")

    # 2. Out of scope → refuz politicos
    is_faculty_related = any(kw in q for kw in FACULTY_KEYWORDS)
    if not is_faculty_related:
        if lang == "en":
            return ("I can only answer questions about FACIEE – the Faculty of Automation, "
                    "Computers, Electrical and Electronic Engineering in Galați.")
        return ("Îmi pare rău, pot răspunde doar la întrebări despre Facultatea FACIEE "
                "din Galați. Dacă ai o întrebare despre facultate, sunt aici să ajut!")

    # 3. RAG → caută în toate datele indexate (pagini + PDF-uri)
    rag_result = rag.query(question, n_results=4)
    if rag_result and len(rag_result) > 80:
        return rag_result

    # 4. Ultimul resort
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

@app.route("/conversations", methods=["GET"])
def get_conversations():
    user_id = request.args.get("user_id")
    if user_id:
        convs = _sb_list_convs(user_id)
        return jsonify([{
            "id": c["id"],
            "title": c.get("title", "Conversație nouă"),
            "updated_at": c.get("updated_at", ""),
            "message_count": len(c.get("messages") or []),
        } for c in convs])
    return jsonify(list_conversations())

@app.route("/conversations", methods=["POST"])
def create_conversation():
    conv_id = str(uuid.uuid4())[:8]
    conv = {
        "id": conv_id,
        "filename": f"conversatie-noua_{conv_id}",
        "title": "Conversație nouă",
        "messages": [],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    save_conversation(conv)
    return jsonify(conv)

@app.route("/conversations/<conv_id>", methods=["GET"])
def get_conversation(conv_id):
    user_id = request.args.get("user_id")
    if user_id:
        conv = _sb_get_conv(conv_id, user_id)
        if conv:
            return jsonify(conv)
        return jsonify({"error": "Nu există"}), 404
    conv = load_conversation(conv_id)
    if not conv:
        return jsonify({"error": "Nu există"}), 404
    return jsonify(conv)

@app.route("/conversations/<conv_id>", methods=["DELETE"])
def delete_conversation(conv_id):
    user_id = request.args.get("user_id")
    if user_id:
        _sb_delete_conv(conv_id, user_id)
    else:
        fpath = find_conv_file(conv_id)
        if fpath and os.path.exists(fpath):
            os.remove(fpath)
    return jsonify({"status": "ok"})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    conv_id = data.get("conv_id")
    image_data = data.get("image_data")  # base64 data URL, opțional
    user_id = data.get("user_id")        # UUID utilizator logat, opțional

    if not user_message:
        return jsonify({"error": "Mesaj gol"}), 400

    # Încarcă conversația: din Supabase dacă user_id prezent, altfel local
    if conv_id:
        conv = _sb_get_conv(conv_id, user_id) if user_id else load_conversation(conv_id)
    else:
        conv = None

    old_filename = None

    if not conv:
        new_id = str(uuid.uuid4())[:8]
        title = make_title(user_message)
        conv = {
            "id": new_id,
            "filename": make_filename(title, new_id),
            "title": title,
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    elif conv["title"] == "Conversație nouă":
        if not user_id:
            old_filename = conv.get("filename", conv["id"])
            conv["filename"] = make_filename(make_title(user_message), conv["id"])
        conv["title"] = make_title(user_message)

    # Compatibilitate fișiere vechi fără câmpul filename
    if not user_id and "filename" not in conv:
        conv["filename"] = conv["id"]

    conv["messages"].append({"role": "user", "content": user_message})

    recent = _truncate_history(list(conv["messages"]))

    sources: list[str] = []

    # Cantina → fetch live
    if is_menu_question(user_message):
        menu_text = fetch_canteen_menu()
        if menu_text:
            context = f"MENIUL CANTINEI (actualizat live astăzi):\n{menu_text}\n\nPrezintă meniul structurat pe categorii cu prețurile."
        else:
            context = "Meniul cantinei nu a putut fi preluat acum. Trimite utilizatorul la: https://campus.ugal.ro/ccps/meniu-studenti/"
    else:
        # Date live din backend (anunțuri, facultăți, locații etc.)
        backend_context = backend_client.fetch_context(user_message)

        # RAG — caută semantic + keyword boost + re-ranking
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

    messages = [{"role": "system", "content": system}] + recent

    def try_gemini_stream():
        """Gemini 2.5 Flash cu streaming, circuit breaker, cache și suport multimodal."""
        if not _gemini_client:
            return None
        try:
            system_text = next((m["content"] for m in messages if m["role"] == "system"), "")
            history = [
                genai_types.Content(
                    role="model" if m["role"] == "assistant" else "user",
                    parts=[genai_types.Part(text=m["content"])]
                )
                for m in messages if m["role"] != "system"
            ]

            # Multimodal: adaugă imaginea la ultimul mesaj user
            if image_data and history and history[-1].role == "user":
                try:
                    header, b64str = image_data.split(",", 1)
                    mime_match = re.search(r"data:([^;]+)", header)
                    mime_type = mime_match.group(1) if mime_match else "image/jpeg"
                    img_bytes = base64.b64decode(b64str)
                    text_part = history[-1].parts[0]
                    history[-1] = genai_types.Content(
                        role="user",
                        parts=[
                            genai_types.Part(
                                inline_data=genai_types.Blob(mime_type=mime_type, data=img_bytes)
                            ),
                            text_part,
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
                        system_instruction=system_text,
                        temperature=0.3,
                    ),
                )

            return _call()
        except pybreaker.CircuitBreakerError:
            print("[Gemini] Circuit breaker deschis — fallback pe OpenRouter")
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

        # 0. Cache — răspunsuri frecvente fără apel API
        cache_key = llm_cache.make_key(user_message + context, GEMINI_MODEL)
        cached_resp = llm_cache.get(cache_key)
        if cached_resp:
            for token in re.split(r"(\s+)", cached_resp):
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
            conv["messages"].append({"role": "assistant", "content": cached_resp})
            _save_conv(conv, user_id, old_filename)
            suggestions = _generate_suggestions(user_message, cached_resp)
            yield f"data: {json.dumps({'done': True, 'conv_id': conv['id'], 'title': conv['title'], 'sources': sources, 'suggestions': suggestions})}\n\n"
            return

        # 1. Încearcă Gemini (calitate superioară, fără greșeli gramaticale)
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
                    conv["messages"].append({"role": "assistant", "content": assistant_message})
                    _save_conv(conv, user_id, old_filename)
                suggestions = _generate_suggestions(user_message, assistant_message)
                yield f"data: {json.dumps({'done': True, 'conv_id': conv['id'], 'title': conv['title'], 'sources': sources, 'suggestions': suggestions})}\n\n"
            return

        # 2. Fallback: OpenRouter free models
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
            conv["messages"].append({"role": "assistant", "content": answer})
            _save_conv(conv, user_id, old_filename)
            suggestions = _generate_suggestions(user_message, answer)
            yield f"data: {json.dumps({'done': True, 'conv_id': conv['id'], 'title': conv['title'], 'sources': sources, 'suggestions': suggestions})}\n\n"
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
                conv["messages"].append({"role": "assistant", "content": assistant_message})
                _save_conv(conv, user_id, old_filename)
            suggestions = _generate_suggestions(user_message, assistant_message)
            yield f"data: {json.dumps({'done': True, 'conv_id': conv['id'], 'title': conv['title'], 'sources': sources, 'suggestions': suggestions})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@app.route("/api/announcements")
def api_announcements():
    """Proxy pentru anunțurile din backend — folosit de interfața web."""
    data = backend_client._get("/announcements")
    return jsonify(data or [])


@app.route("/webhook/supabase", methods=["POST"])
def webhook_supabase():
    """Webhook Supabase — indexează imediat în RAG când se adaugă un anunț nou."""
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
