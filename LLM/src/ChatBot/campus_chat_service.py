"""
Serviciu stateless pentru endpoint-ul POST /api/v1/campus-chat din combined_app.py.
Folosește Supabase (backend_client) + RAG + Gemini 2.5 Flash.
"""
import os
import re
import sys
import requests
from pathlib import Path

_CHATBOT_DIR = str(Path(__file__).parent)
if _CHATBOT_DIR not in sys.path:
    sys.path.insert(0, _CHATBOT_DIR)

from google import genai
from google.genai import types as genai_types
from rag_engine import RAGEngine
import backend_client

import importlib.util as _ilu
_cs = _ilu.spec_from_file_location("_chatbot_cache", Path(__file__).parent / "cache.py")
_cm = _ilu.module_from_spec(_cs)
_cs.loader.exec_module(_cm)
llm_cache = _cm

GEMINI_MODEL = "gemini-2.5-flash"

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
_rag = RAGEngine()

SYSTEM_PROMPT = """Ești InsideUGAL Assistant — asistentul virtual oficial al aplicației InsideUGAL și al Universității "Dunărea de Jos" din Galați (UGAL), România.
Site universitate: https://www.ugal.ro/ | Aplicație: https://insideugal.ro/

═══ COMPORTAMENT ═══
• Răspunzi la întrebări despre: aplicația InsideUGAL, toate facultățile UGAL, admitere, burse, taxe, examene, orar, cantină, cămine, contact, servicii studențești.
• Dacă întrebarea nu are legătură cu UGAL sau InsideUGAL, refuzi politicos și oferi exemple de ce poți ajuta.
• Detectezi automat limba utilizatorului (română, engleză etc.) și răspunzi în ACEEAȘI limbă.

═══ ACURATEȚE ═══
• Răspunzi EXCLUSIV pe baza contextului furnizat mai jos. Nu inventa nicio informație.
• Dacă contextul conține date structurate din baza de date InsideUGAL (anunțuri, produse, locații, sesizări etc.), PREZINTĂ-LE întotdeauna utilizatorului — nu refuza răspunsul pe motiv că întrebarea e scurtă sau ambiguă.
• Extrage din context DOAR informațiile care răspund direct la întrebarea utilizatorului. Nu cita textul brut al documentelor — reformulează concis.
• Dacă contextul conține informații despre o temă similară dar NU răspunde direct la întrebarea specifică, spune că nu ai detalii specifice și îndrumă spre secretariatul facultății sau https://www.ugal.ro/.
• Dacă o informație nu apare în context, spune clar că nu o ai și îndrumă spre https://www.ugal.ro/ sau secretariatul facultății respective.
• INTERZIS să inventezi URL-uri. Folosești EXCLUSIV link-urile care apar literal în contextul de mai jos.
• Nu inventa taxe, medii, date, numere de telefon sau alte date concrete. Folosești DOAR ce apare în context.

═══ FORMAT RĂSPUNSURI ═══
• Răspunde DIRECT și SCURT — maxim 3-5 rânduri pentru întrebări simple. Nicio introducere, nicio recapitulare.
• Dacă întrebarea are un singur răspuns concret (ex: o sumă, o dată, o adresă), dă DOAR acel răspuns + un link dacă există în context.
• Folosește liste cu bullet points DOAR când sunt mai mult de 2-3 elemente distincte.
• Nu explica ce urmează să faci. Nu repeta întrebarea. Nu adăuga concluzii.

═══ CONTEXT RELEVANT ═══
"""

MENU_KEYWORDS = [
    "cantina", "cantină", "meniu", "meniuri", "menu", "mancare", "mâncare",
    "masa", "masă", "pranz", "prânz", "ce se mananca", "ce mănânc", "canteen", "food",
]


def fetch_canteen_menu() -> str | None:
    try:
        resp = requests.get("https://campus.ugal.ro/ccps/wp-json/wp/v2/pages/5758", timeout=8)
        resp.raise_for_status()
        html = resp.json().get("content", {}).get("rendered", "")
        text = re.sub(r"<[^>]+>", "\n", html)
        text = re.sub(r"&#\d+;|&[a-z]+;|&amp;|&lt;|&gt;", " ", text)
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        def is_js(line):
            return any([
                line.startswith(("var ", "document.", "function", "new ", "d =", "d=")),
                re.match(r"^[a-z_$]\s*=\s*", line),
                line.endswith(";") and "(" in line,
            ])
        lines = [ln for ln in lines if not is_js(ln)]

        CATEGORIES = {
            "Ciorbe și supe", "garnituri", "Preparate carne", "Salate/sosuri",
            "Pâine", "Desert", "Meniul zilei", "PROGRAM  CANTINE STUDENȚEȘTI",
            "PROGRAM  CANTINĂ  STUDENȚEASCĂ:", "PROGRAM  CANTINĂ  CORP J:",
            "PROGRAM  CANTINĂ  UNIVERSITATE:",
        }
        menu_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]
            if line in CATEGORIES or line.startswith("PROGRAM"):
                menu_lines.append(f"\n**{line}**")
            elif re.match(r"^\d+[,\.]\d+$", line) and i + 1 < len(lines) and lines[i + 1] == "lei":
                if menu_lines:
                    menu_lines[-1] += f" — {line} lei"
                i += 2
                continue
            elif line == "lei":
                pass
            else:
                menu_lines.append(line)
            i += 1
        return "\n".join(menu_lines).strip() or None
    except Exception:
        return None


def is_menu_question(text: str) -> bool:
    return any(kw in text.lower() for kw in MENU_KEYWORDS)


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
    question = question.strip()
    sources: list[str] = []
    backend_context = ""

    # Încearcă Supabase (anunțuri, meniuri, facultăți etc.) — prioritate maximă
    backend_context = backend_client.fetch_context(question)

    if backend_context:
        context = backend_context
        sources = []
    elif is_menu_question(question):
        # Supabase nu are date de meniu — fallback pe scraping live
        menu_text = fetch_canteen_menu()
        if menu_text:
            context = f"MENIUL CANTINEI (actualizat live astăzi):\n{menu_text}\n\nPrezintă meniul structurat pe categorii cu prețurile."
            backend_context = f"**Meniul cantinei (astăzi):**\n\n{menu_text}"
        else:
            context = "Meniul cantinei nu a putut fi preluat acum. Trimite utilizatorul la: https://campus.ugal.ro/ccps/meniu-studenti/"
            backend_context = "Meniul cantinei nu este disponibil momentan. Verifică la: https://campus.ugal.ro/ccps/meniu-studenti/"
    else:
        raw_context, sources = _rag.query_with_sources(question, n_results=3)
        context = raw_context or "Nu am găsit informații specifice. Îndrumă utilizatorul spre https://www.ugal.ro/"
        backend_context = raw_context

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
    except Exception:
        answer = backend_context if backend_context else ""

    if not answer:
        answer = backend_context if backend_context else "Nu am detalii despre asta în acest moment. Poți găsi mai multe informații la https://www.ugal.ro/ sau contactează direct secretariatul facultății."

    return {
        "answer": answer,
        "sources": sources,
        "suggestions": _generate_suggestions(question, answer),
    }
