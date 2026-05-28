import os
import sys
import json
import threading
import io
from datetime import datetime, date
from urllib.parse import quote

def install_if_missing(package, install_name=None):
    try:
        __import__(package)
    except ImportError:
        import subprocess
        name = install_name or package
        subprocess.check_call([sys.executable, "-m", "pip", "install", name, "-q"])

install_if_missing("PIL", "pillow")
install_if_missing("requests", "requests")
install_if_missing("dotenv", "python-dotenv")
install_if_missing("google.genai", "google-genai")

import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk, ImageDraw
from dotenv import load_dotenv
import requests

load_dotenv(override=True)

from llm_client import LLMClient
from prompt_builder import PromptBuilder
from output_parser import OutputParser

# ── Config ───────────────────────────────────────────────
MODEL        = "openai/gpt-oss-120b:free"
HISTORY_DIR  = "histories"
AVATAR_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_avatar.png")

# ── Paleta Google Gemini Dark Mode ───────────────────────
BG            = "#131314"
BG_SIDEBAR    = "#1e1f22"
BG_HEADER     = "#131314"
BG_MSG        = "#131314"
BG_INPUT_BAR  = "#131314"
BG_INPUT      = "#1e1f22"
BG_USER       = "#282a2c"
BG_BUBBLE_BOT = "#131314"
BG_ITEM_HOV   = "#2d2f31"
TEXT          = "#e3e3e3"
TEXT_DIM      = "#c4c7c5"
TEXT_TIME     = "#8e8e8e"
TEXT_SIDEBAR_H= "#e3e3e3"
ACCENT        = "#a8c7fa"
ACCENT2       = "#c58af9"
DANGER        = "#f28b82"
BORDER        = "#444746"
AVATAR_SIZE   = 36

os.makedirs(HISTORY_DIR, exist_ok=True)

# ── Istorice ─────────────────────────────────────────────
def get_history_path(session_id):
    return os.path.join(HISTORY_DIR, f"{session_id}.json")

def save_session(session):
    with open(get_history_path(session["id"]), "w", encoding="utf-8") as f:
        json.dump(session, f, ensure_ascii=False, indent=2)

def list_sessions():
    sessions = []
    for fname in sorted(os.listdir(HISTORY_DIR), reverse=True):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(HISTORY_DIR, fname), "r", encoding="utf-8") as f:
                    sessions.append(json.load(f))
            except:
                pass
    return sessions

def new_session_id():
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def make_title(text):
    return text[:32] + ("…" if len(text) > 32 else "")

# ── Avatar ───────────────────────────────────────────────
def make_circle_image(path, size):
    img  = Image.open(path).convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    out  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, mask=mask)
    return ImageTk.PhotoImage(out)

# ════════════════════════════════════════════════════════
# (rest of file preserved from original)
