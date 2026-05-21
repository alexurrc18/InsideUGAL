import os
import sys
import json
from datetime import datetime

def install_if_missing(package, install_name=None):
    try:
        __import__(package)
    except ImportError:
        import subprocess
        name = install_name or package
        print(f"📦 Instalez {name}...")
        subprocess.check_call(["uv", "pip", "install", name, "-q"])

install_if_missing("dotenv", "python-dotenv")
install_if_missing("google.generativeai", "google-generativeai")

from dotenv import load_dotenv
import google.generativeai as genai

# ── Config ──────────────────────────────────────────────
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ Nu am găsit GEMINI_API_KEY în .env")
    sys.exit(1)

genai.configure(api_key=api_key)
MODEL = "gemini-2.5-flash"
HISTORY_FILE = "chat_history.json"  # se salvează în folderul proiectului

# ── Salvare / Încărcare istoric ──────────────────────────
def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_history(history):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

def history_to_gemini(history):
    """Convertește istoricul salvat în formatul cerut de Gemini"""
    return [
        {"role": h["role"], "parts": [h["text"]]}
        for h in history
    ]

# ── Model ────────────────────────────────────────────────
generation_config = {"temperature": 0.9, "max_output_tokens": 2048}

system_instruction = """Ești un asistent AI inteligent și prietenos care vorbește în română.
Ai memorie completă a tuturor conversațiilor anterioare cu utilizatorul.
Dacă utilizatorul menționează ceva ce a spus înainte (ex: meniul cantinei, preferințe, 
informații personale), folosești acea informație.
Răspunzi la orice întrebare sincer și complet."""

model = genai.GenerativeModel(
    model_name=MODEL,
    generation_config=generation_config,
    system_instruction=system_instruction
)

# ── Pornire ──────────────────────────────────────────────
saved_history = load_history()
chat = model.start_chat(history=history_to_gemini(saved_history))

msg_count = len(saved_history)
print("=" * 52)
print("🤖 Asistent AI cu Memorie Permanentă!")
if msg_count > 0:
    print(f"   💾 Am încărcat {msg_count} mesaje din istoric.")
else:
    print("   💾 Conversație nouă — istoricul e gol.")
print("   Scrie 'iesire' pentru a închide.")
print("   Scrie 'sterge memorie' pentru a reseta istoricul.")
print("=" * 52)

# ── Loop principal ───────────────────────────────────────
while True:
    try:
        user_input = input("\n👤 Tu: ").strip()

        if not user_input:
            continue

        if user_input.lower() in ["iesire", "exit", "quit"]:
            print("🤖 Asistent: La revedere! Ne vedem data viitoare!")
            break

        if user_input.lower() == "sterge memorie":
            if os.path.exists(HISTORY_FILE):
                os.remove(HISTORY_FILE)
            saved_history = []
            chat = model.start_chat(history=[])
            print("🤖 Asistent: Am șters tot istoricul. Pornim de la zero!")
            continue

        # Trimite mesaj
        response = chat.send_message(user_input)
        reply = response.text
        print(f"\n🤖 Asistent: {reply}")

        # Salvează în istoric
        saved_history.append({
            "role": "user",
            "text": user_input,
            "timestamp": datetime.now().isoformat()
        })
        saved_history.append({
            "role": "model",
            "text": reply,
            "timestamp": datetime.now().isoformat()
        })
        save_history(saved_history)

    except KeyboardInterrupt:
        print("\n\n🤖 Asistent: La revedere!")
        save_history(saved_history)
        break
    except Exception as e:
        print(f"❌ Eroare: {e}")
        chat = model.start_chat(history=history_to_gemini(saved_history))