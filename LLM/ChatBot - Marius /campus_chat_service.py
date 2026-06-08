"""
Serviciu stateless pentru endpoint-ul POST /api/v1/campus-chat din combined_app.py.
Folosește RAG pe Supabase pgvector + Gemini 2.5 Flash.
"""
import os
import sys
import uuid
import requests
from datetime import datetime
from pathlib import Path

# Asigurăm că importurile relative (rag_engine, cache) funcționează indiferent
# de cine încarcă acest modul
_CHATBOT_DIR = str(Path(__file__).parent)
if _CHATBOT_DIR not in sys.path:
    sys.path.insert(0, _CHATBOT_DIR)

from google import genai
from google.genai import types as genai_types
from rag_engine import RAGEngine
import cache as llm_cache

GEMINI_MODEL = "gemini-2.5-flash"
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

# Singleton RAGEngine — indexul se încarcă o singură dată la pornire
_rag = RAGEngine()

SYSTEM_PROMPT = """Ești „Asistentul Virtual InsideUGAL" — asistentul oficial al platformei InsideUGAL \
și al Universității „Dunărea de Jos" din Galați (UGAL), România.

═══ COMPORTAMENT ═══
• Răspunzi la întrebări despre: InsideUGAL, toate facultățile UGAL, admitere, burse, taxe, examene, \
orar, cantină, cămine, contact, servicii studențești.
• Dacă nu cunoști răspunsul sau informația nu apare în documentele furnizate, direcționează studentul \
politicos spre secretariatul facultății sau spre https://www.ugal.ro/.
• Dacă întrebarea nu are legătură cu UGAL, refuzi politicos și oferi exemple de ce poți ajuta.
• Detectezi automat limba utilizatorului și răspunzi în aceeași limbă.

═══ ACURATEȚE ═══
• Răspunzi EXCLUSIV pe baza contextului furnizat mai jos, extras din documentele administrative ale universității.
• Nu inventa nicio informație — taxe, medii, date, numere de telefon, URL-uri.
• Dacă un link nu apare literal în context, NU îl include în răspuns.

═══ FORMAT ═══
• Fii concis și direct — fără introduceri lungi, fără să repeți întrebarea.
• Structurează cu bold (**Titlu**) și liste (- sau 1. 2. 3.) când e relevant.
• La final, dacă e util, indică sursa oficială din context.

═══ CONTEXT DIN DOCUMENTELE UGAL ═══
"""


def _sb_headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def _sb_get_conv(conv_id: str, user_id: str) -> dict | None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/chatbot_conversations"
            f"?id=eq.{conv_id}&user_id=eq.{user_id}&limit=1",
            headers=_sb_headers(), timeout=5,
        )
        data = r.json() if r.ok else []
        return data[0] if data else None
    except Exception:
        return None


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
        print(f"[CampusChat] save_conv: {e}")


def _generate_suggestions(question: str, answer: str) -> list[str]:
    if len(answer) < 50:
        return []
    try:
        prompt = (
            f"Pe baza acestei conversații despre UGAL, propune 3 întrebări scurte de follow-up în română.\n"
            f"Întrebarea: {question}\nRăspunsul (extras): {answer[:300]}\n\n"
            "Răspunde cu exact 3 sugestii scurte și complete, câte una pe linie, fără numerotare sau prefix."
        )
        resp = _client.models.generate_content(
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


def campus_chat(
    question: str,
    conv_id: str | None = None,
    user_id: str | None = None,
) -> dict:
    """
    Funcție stateless — folosită de endpoint-ul /api/v1/campus-chat.

    Returns:
        {
            "answer": str,
            "conv_id": str,
            "title": str,
            "sources": list[str],
            "suggestions": list[str]
        }
    """
    question = question.strip()

    # Încarcă sau crează conversație
    conv = _sb_get_conv(conv_id, user_id) if (conv_id and user_id) else None

    if not conv:
        new_id = str(uuid.uuid4())[:8]
        title = question[:50] + ("…" if len(question) > 50 else "")
        conv = {
            "id": new_id,
            "title": title,
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    elif conv.get("title") == "Conversație nouă":
        conv["title"] = question[:50] + ("…" if len(question) > 50 else "")

    # RAG — context din Supabase pgvector
    raw_context, sources = _rag.query_with_sources(question, n_results=5)
    context = raw_context or "Nu am găsit informații specifice. Îndrumă utilizatorul spre https://www.ugal.ro/"

    # Istoricul conversației pentru Gemini
    history = [
        genai_types.Content(
            role="model" if m["role"] == "assistant" else "user",
            parts=[genai_types.Part(text=m["content"])]
        )
        for m in conv.get("messages", [])
    ]
    history.append(genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=question)]
    ))

    # Cache
    cache_key = llm_cache.make_key(question + context, GEMINI_MODEL)
    cached = llm_cache.get(cache_key)
    if cached:
        answer = cached
    else:
        try:
            resp = _client.models.generate_content(
                model=GEMINI_MODEL,
                contents=history,
                config=genai_types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT + context,
                    temperature=0.3,
                ),
            )
            answer = resp.text or ""
            if answer:
                llm_cache.set(cache_key, answer)
        except Exception as e:
            return {"error": str(e), "conv_id": conv["id"]}

    conv["messages"].append({"role": "user", "content": question})
    conv["messages"].append({"role": "assistant", "content": answer})
    conv["updated_at"] = datetime.now().isoformat()

    if user_id:
        _sb_save_conv(conv, user_id)

    return {
        "answer": answer,
        "conv_id": conv["id"],
        "title": conv["title"],
        "sources": sources,
        "suggestions": _generate_suggestions(question, answer),
    }
