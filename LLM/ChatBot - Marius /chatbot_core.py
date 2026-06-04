"""
ChatbotCore — interfață programatică pentru integrarea cu backend-ul FastAPI.
Folosește Gemini 2.5 Flash + RAG (ChromaDB) + cache SQLite.
"""
import os
import json
from datetime import datetime
from urllib.parse import quote

from google import genai
from google.genai import types as genai_types
from dotenv import load_dotenv
from rag_engine import RAGEngine
import cache as llm_cache

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip().strip("'").strip('"')
GEMINI_MODEL   = "gemini-2.5-flash"

SYSTEM_PROMPT = """Ești InsideUGAL Assistant — asistentul virtual oficial al aplicației InsideUGAL și al Universității "Dunărea de Jos" din Galați (UGAL), România.
Răspunzi la întrebări despre facultăți, admitere, burse, examene, cantină, cămine, InsideUGAL și servicii studențești.
Răspunzi EXCLUSIV pe baza contextului furnizat. Nu inventa URL-uri, taxe, date sau numere de telefon.
Dacă informația nu e în context, îndrumă spre https://www.ugal.ro/ sau secretariatul facultății.
Detectezi automat limba utilizatorului și răspunzi în aceeași limbă."""


class ChatbotCore:
    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY lipsește din .env")

        self._client  = genai.Client(api_key=GEMINI_API_KEY)
        self._rag     = RAGEngine()
        self._history: list[genai_types.Content] = []

        self.conversations_dir = os.path.join(os.path.dirname(__file__), "conversations")
        os.makedirs(self.conversations_dir, exist_ok=True)
        self.current_session: dict = self._new_session()

    # ── Sesiuni ──────────────────────────────────────────────

    def _new_session(self) -> dict:
        return {
            "id": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "title": "Conversație nouă",
            "messages": [],
            "created": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "filename": datetime.now().strftime("%Y%m%d_%H%M%S"),
        }

    def new_conversation(self):
        self._history = []
        self.current_session = self._new_session()

    def load_conversation(self, conv_id: str) -> bool:
        for fname in os.listdir(self.conversations_dir):
            if not fname.endswith(".json"):
                continue
            path = os.path.join(self.conversations_dir, fname)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("id") == conv_id:
                    self.current_session = data
                    self._history = [
                        genai_types.Content(
                            role="model" if m["role"] == "assistant" else "user",
                            parts=[genai_types.Part(text=m["content"])]
                        )
                        for m in data.get("messages", [])
                    ]
                    return True
            except Exception:
                continue
        return False

    def _save(self):
        self.current_session["updated_at"] = datetime.now().isoformat()
        path = os.path.join(self.conversations_dir, f"{self.current_session['filename']}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.current_session, f, ensure_ascii=False, indent=2)

    # ── Mesaj principal ──────────────────────────────────────

    def send_message(self, text: str) -> dict:
        """
        Interfață pentru backend: primește textul, returnează răspunsul.
        Returnează: {"status": "success", "reply": "...", "conv_id": "..."}
        sau:        {"status": "error", "message": "..."}
        """
        context = self._rag.query(text, n_results=5)
        full_prompt = text
        if context:
            full_prompt = f"[CONTEXT DIN BAZA DE DATE UGAL]:\n{context}\n\n[ÎNTREBAREA UTILIZATORULUI]:\n{text}"

        cache_key = llm_cache.make_key(full_prompt, GEMINI_MODEL)
        cached = llm_cache.get(cache_key)
        if cached:
            self._append_to_session(text, cached)
            return {"status": "success", "reply": cached, "conv_id": self.current_session["id"], "cached": True}

        self._history.append(genai_types.Content(
            role="user",
            parts=[genai_types.Part(text=full_prompt)]
        ))

        try:
            resp = self._client.models.generate_content(
                model=GEMINI_MODEL,
                contents=self._history,
                config=genai_types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.3,
                ),
            )
            reply = resp.text or ""
            self._history.append(genai_types.Content(
                role="model",
                parts=[genai_types.Part(text=reply)]
            ))
            llm_cache.set(cache_key, reply)
            self._append_to_session(text, reply)
            return {"status": "success", "reply": reply, "conv_id": self.current_session["id"], "cached": False}

        except Exception as e:
            self._history.pop()
            return {"status": "error", "message": str(e)}

    def _append_to_session(self, user_text: str, reply: str):
        msgs = self.current_session["messages"]
        msgs.append({"role": "user", "content": user_text, "timestamp": datetime.now().isoformat()})
        msgs.append({"role": "assistant", "content": reply, "timestamp": datetime.now().isoformat()})
        if len(msgs) == 2:
            self.current_session["title"] = user_text[:50] + ("…" if len(user_text) > 50 else "")
        self._save()

    # ── Generare imagine ─────────────────────────────────────

    def generate_image_url(self, prompt: str) -> dict:
        import random
        ro_map = {"ă":"a","â":"a","î":"i","ș":"s","ț":"t","Ă":"A","Â":"A","Î":"I","Ș":"S","Ț":"T"}
        clean = prompt[:300]
        for k, v in ro_map.items():
            clean = clean.replace(k, v)
        seed = random.randint(1, 99999)
        url = f"https://image.pollinations.ai/prompt/{quote(clean)}?width=768&height=512&seed={seed}&nologo=true&model=flux"
        return {"status": "success", "image_url": url}
