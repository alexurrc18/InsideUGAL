"""
Serviciu stateless pentru endpoint-ul POST /api/v1/campus-chat din combined_app.py.
Folosește RAG pe Supabase pgvector + Gemini 2.5 Flash.
"""
import os
import sys
from pathlib import Path

_CHATBOT_DIR = str(Path(__file__).parent)
if _CHATBOT_DIR not in sys.path:
    sys.path.insert(0, _CHATBOT_DIR)

from google import genai
from google.genai import types as genai_types
from rag_engine import RAGEngine
import cache as llm_cache

GEMINI_MODEL = "gemini-2.5-flash"

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
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


def campus_chat(question: str) -> dict:
    """
    Funcție stateless — primește o întrebare, returnează răspunsul.

    Returns:
        {"answer": str, "sources": list[str], "suggestions": list[str]}
    """
    question = question.strip()

    raw_context, sources = _rag.query_with_sources(question, n_results=5)
    context = raw_context or "Nu am găsit informații specifice. Îndrumă utilizatorul spre https://www.ugal.ro/"

    cache_key = llm_cache.make_key(question + context, GEMINI_MODEL)
    cached = llm_cache.get(cache_key)
    if cached:
        return {
            "answer": cached,
            "sources": sources,
            "suggestions": _generate_suggestions(question, cached),
        }

    try:
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[genai_types.Content(role="user", parts=[genai_types.Part(text=question)])],
            config=genai_types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT + context,
                temperature=0.3,
            ),
        )
        answer = resp.text or ""
        if answer:
            llm_cache.set(cache_key, answer)
    except Exception as e:
        return {"error": str(e)}

    return {
        "answer": answer,
        "sources": sources,
        "suggestions": _generate_suggestions(question, answer),
    }
