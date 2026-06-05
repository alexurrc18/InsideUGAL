import os
import sys
import json
import threading
import io
import webbrowser
from datetime import datetime, date

import tkinter as tk
import customtkinter as ctk
from tkinter import messagebox, filedialog
from PIL import Image, ImageTk, ImageDraw, ImageFilter
from dotenv import load_dotenv
import requests

load_dotenv(override=True)

from llm_client import LLMClient
from prompt_builder import PromptBuilder
from output_parser import OutputParser
from rag_engine import RAGEngine

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

MODEL        = "openrouter/free"
HISTORY_DIR  = "histories"
AVATAR_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_avatar.png")

UGAL_LOCATIONS = {
    "corpul d": ("📍 Corpul D pe Maps", "https://maps.app.goo.gl/k9e3Z2f8XQ1L2M3N4"),
    "cantina":  ("📍 Cantina pe Maps",  "https://maps.app.goo.gl/aBcD1234EfGh5678"),
    "facultatea de inginerie": ("📍 Fac. Inginerie pe Maps", "https://maps.app.goo.gl/zXyW9876VuTs5432"),
}

# ── Paleta Obsidian Glow ─────────────────────────────────
BG_MAIN        = "#0d0d0f"
BG_SIDEBAR     = "#111113"
BG_CARD        = "#18181c"
BG_INPUT       = "#1c1c21"
BG_USER        = "#1e1e24"
BG_HOVER       = "#242429"
TEXT           = "#f0f0f5"
TEXT_DIM       = "#6b6b7a"
TEXT_MID       = "#a0a0b0"
ACCENT         = "#7c6af7"        # Violet electric
ACCENT_SOFT    = "#2a2540"        # Violet închis (bg butoane)
ACCENT2        = "#38bdf8"        # Albastru azur
ACCENT2_SOFT   = "#0c2233"
SUCCESS        = "#34d399"
SUCCESS_SOFT   = "#0d2d22"
DANGER         = "#f87171"
DANGER_SOFT    = "#2d1010"
GOLD           = "#fbbf24"
BORDER         = "#2a2a32"
AVATAR_SIZE    = 34

os.makedirs(HISTORY_DIR, exist_ok=True)

# ── Utilitare ────────────────────────────────────────────
def get_history_path(sid):   return os.path.join(HISTORY_DIR, f"{sid}.json")
def new_session_id():        return datetime.now().strftime("%Y%m%d_%H%M%S")
def make_title(text):        return text[:34] + ("…" if len(text) > 34 else "")

def save_session(s):
    with open(get_history_path(s["id"]), "w", encoding="utf-8") as f:
        json.dump(s, f, ensure_ascii=False, indent=2)

def list_sessions():
    out = []
    for fn in sorted(os.listdir(HISTORY_DIR), reverse=True):
        if fn.endswith(".json"):
            try:
                with open(os.path.join(HISTORY_DIR, fn), encoding="utf-8") as f:
                    out.append(json.load(f))
            except: pass
    return out

def make_circle_image(path, size):
    img  = Image.open(path).convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    out  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, mask=mask)
    return ctk.CTkImage(light_image=out, dark_image=out, size=(size, size))

def make_gradient_avatar(size):
    """Creează un avatar gradient violet→azur dacă nu există imagine."""
    img = Image.new("RGBA", (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    for i in range(size):
        t = i / size
        r = int(124 + (56-124)*t)
        g = int(106 + (189-106)*t)
        b = int(247 + (248-247)*t)
        draw.line([(0,i),(size,i)], fill=(r,g,b,255))
    mask = Image.new("L", (size,size), 0)
    ImageDraw.Draw(mask).ellipse((0,0,size,size), fill=255)
    result = Image.new("RGBA", (size,size), (0,0,0,0))
    result.paste(img, mask=mask)
    # Monogramă "AI" centrată
    try:
        from PIL import ImageFont
        font = ImageFont.truetype("arial.ttf", size//3)
    except:
        font = None
    d = ImageDraw.Draw(result)
    txt = "AI"
    if font:
        bb = d.textbbox((0,0), txt, font=font)
        tw, th = bb[2]-bb[0], bb[3]-bb[1]
        d.text(((size-tw)//2, (size-th)//2 - 2), txt, fill=(255,255,255,230), font=font)
    else:
        d.text((size//2-8, size//2-8), txt, fill=(255,255,255,230))
    return ctk.CTkImage(light_image=result, dark_image=result, size=(size,size))


# ════════════════════════════════════════════════════════
class ChatApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("UGAL AI · Asistent Academic")
        self.geometry("1100x760")
        self.minsize(820, 580)
        self.configure(fg_color=BG_MAIN)

        self._prompt_builder = PromptBuilder()
        self._output_parser  = OutputParser()
        self._image_refs     = []
        self.attached_files  = []
        self.is_thinking     = False
        self.is_listening    = False
        self.sidebar_visible = True
        self.current_session = None
        self._plus_menu      = None
        self.thinking_row    = None
        self._msg_count      = 0   # pentru animații de fade-in

        self._client = LLMClient(model_name=MODEL,
                                 system_instruction=self._prompt_builder.build())
        self.rag = RAGEngine()

        if os.path.exists(AVATAR_PATH):
            self.avatar_img = make_circle_image(AVATAR_PATH, AVATAR_SIZE)
        else:
            self.avatar_img = make_gradient_avatar(AVATAR_SIZE)

        self._build_ui()
        self._load_session_list()
        self._new_chat(silent=True)

    # ════════════════════════════════════════════════════
    # BUILD UI
    # ════════════════════════════════════════════════════
    def _build_ui(self):
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        self._build_sidebar()
        self._build_main()

    # ── SIDEBAR ─────────────────────────────────────────
    def _build_sidebar(self):
        self.sidebar = ctk.CTkFrame(self, width=270, corner_radius=0, fg_color=BG_SIDEBAR)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_rowconfigure(2, weight=1)
        self.sidebar.grid_propagate(False)

        # ── Logo Header ──
        logo_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent", height=72)
        logo_frame.grid(row=0, column=0, sticky="ew", padx=0)
        logo_frame.grid_propagate(False)

        inner_logo = ctk.CTkFrame(logo_frame, fg_color=ACCENT_SOFT, corner_radius=12)
        inner_logo.place(relx=0.5, rely=0.5, anchor="center", relwidth=0.88, relheight=0.72)

        ctk.CTkLabel(inner_logo, text="⬡  UGAL AI",
                     font=ctk.CTkFont(family="Trebuchet MS", size=15, weight="bold"),
                     text_color=ACCENT).pack(side="left", padx=14, pady=0)

        new_btn = ctk.CTkButton(inner_logo, text="＋", width=28, height=28,
                                corner_radius=8, fg_color=ACCENT,
                                hover_color="#6355d4", text_color="white",
                                font=ctk.CTkFont(size=16, weight="bold"),
                                command=self._new_chat)
        new_btn.pack(side="right", padx=10)

        # ── Divider ──
        self._divider(self.sidebar, row=1)

        # ── Lista sesiuni ──
        self.sess_list = ctk.CTkScrollableFrame(
            self.sidebar, fg_color="transparent", corner_radius=0,
            scrollbar_button_color=BG_SIDEBAR,
            scrollbar_button_hover_color=BG_HOVER)
        self.sess_list.grid(row=2, column=0, sticky="nsew", padx=8, pady=4)

        # ── Footer sidebar ──
        foot = ctk.CTkFrame(self.sidebar, fg_color=BG_CARD, corner_radius=10)
        foot.grid(row=3, column=0, sticky="ew", padx=12, pady=12)

        ctk.CTkLabel(foot, text="● " + MODEL,
                     font=ctk.CTkFont(family="Consolas", size=10),
                     text_color=SUCCESS).pack(side="left", padx=12, pady=8)
        ctk.CTkLabel(foot, text="FREE",
                     font=ctk.CTkFont(family="Trebuchet MS", size=9, weight="bold"),
                     text_color=BG_MAIN,
                     fg_color=SUCCESS, corner_radius=4,
                     width=36, height=16).pack(side="right", padx=10)

    # ── MAIN AREA ────────────────────────────────────────
    def _build_main(self):
        self.main_area = ctk.CTkFrame(self, corner_radius=0, fg_color=BG_MAIN)
        self.main_area.grid(row=0, column=1, sticky="nsew")
        self.main_area.grid_rowconfigure(1, weight=1)
        self.main_area.grid_columnconfigure(0, weight=1)

        self._build_header()
        self._build_messages()
        self._build_input()

    def _build_header(self):
        hdr = ctk.CTkFrame(self.main_area, corner_radius=0, fg_color=BG_MAIN, height=58)
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)
        hdr.grid_propagate(False)

        # Thin accent line at bottom of header
        accent_line = ctk.CTkFrame(hdr, height=1, fg_color=BORDER, corner_radius=0)
        accent_line.place(relx=0, rely=1.0, relwidth=1.0, anchor="sw")

        ctk.CTkButton(hdr, text="☰", width=38, height=38, corner_radius=8,
                      fg_color="transparent", hover_color=BG_HOVER,
                      text_color=TEXT_MID, font=ctk.CTkFont(size=18),
                      command=self._toggle_sidebar).grid(row=0, column=0, padx=(14,4), pady=10)

        self.title_lbl = ctk.CTkLabel(
            hdr, text="Conversație nouă",
            font=ctk.CTkFont(family="Trebuchet MS", size=15, weight="bold"),
            text_color=TEXT)
        self.title_lbl.grid(row=0, column=1, sticky="w", padx=8)

        # Status indicator
        self.status_dot = ctk.CTkLabel(hdr, text="● Online",
                                       font=ctk.CTkFont(family="Consolas", size=10),
                                       text_color=SUCCESS)
        self.status_dot.grid(row=0, column=2, padx=8)

        ctk.CTkButton(hdr, text="⌫", width=38, height=38, corner_radius=8,
                      fg_color="transparent", hover_color=DANGER_SOFT,
                      text_color=DANGER, font=ctk.CTkFont(size=16),
                      command=self._delete_current).grid(row=0, column=3, padx=(4,14), pady=10)

    def _build_messages(self):
        self.msg_frame = ctk.CTkScrollableFrame(
            self.main_area, fg_color="transparent",
            scrollbar_button_color=BG_MAIN,
            scrollbar_button_hover_color=BG_HOVER)
        self.msg_frame.grid(row=1, column=0, sticky="nsew", padx=0, pady=0)

    def _build_input(self):
        # Container estetic
        input_outer = ctk.CTkFrame(self.main_area, fg_color="transparent")
        input_outer.grid(row=2, column=0, sticky="ew", padx=32, pady=(6, 18))
        input_outer.grid_columnconfigure(0, weight=1)

        # Chips atașamente
        self.chips_frame = ctk.CTkFrame(input_outer, fg_color="transparent")
        self.chips_frame.grid(row=0, column=0, sticky="ew", pady=(0, 4))

        # Bara principală de input cu border subtil
        bar_wrap = ctk.CTkFrame(input_outer, fg_color=BG_INPUT, corner_radius=18,
                                border_width=1, border_color=BORDER)
        bar_wrap.grid(row=1, column=0, sticky="ew")
        # col 3 = input text, se extinde pe toata latimea ramasa
        bar_wrap.grid_columnconfigure(3, weight=1)

        # Buton + fisiere
        self.plus_btn = ctk.CTkButton(
            bar_wrap, text="＋", width=36, height=36, corner_radius=10,
            fg_color="transparent", hover_color=BG_HOVER,
            text_color=TEXT_DIM, font=ctk.CTkFont(size=19),
            command=self._toggle_plus_menu)
        self.plus_btn.grid(row=0, column=0, padx=(8,2), pady=6)

        # Buton Camera
        self.cam_btn = ctk.CTkButton(
            bar_wrap, text="📷", width=36, height=36, corner_radius=10,
            fg_color="transparent", hover_color=BG_HOVER,
            text_color=TEXT_DIM, font=ctk.CTkFont(size=16),
            command=self._ocr_image)
        self.cam_btn.grid(row=0, column=1, padx=2, pady=6)

        # Buton Microfon
        self.mic_btn = ctk.CTkButton(
            bar_wrap, text="🎤", width=36, height=36, corner_radius=10,
            fg_color="transparent", hover_color=BG_HOVER,
            text_color=TEXT_DIM, font=ctk.CTkFont(size=16),
            command=self._start_voice_thread)
        self.mic_btn.grid(row=0, column=2, padx=(2, 4), pady=6)

        # Input text - coloana 3, se intinde pe toata latimea ramasa
        self.input_txt = ctk.CTkTextbox(
            bar_wrap, height=42, fg_color="transparent",
            text_color=TEXT, font=ctk.CTkFont(family="Segoe UI", size=14),
            wrap="word", border_width=0,
            scrollbar_button_color=BG_INPUT,
            scrollbar_button_hover_color=BG_INPUT)
        self.input_txt.grid(row=0, column=3, sticky="ew", padx=(8, 4), pady=8)
        self.input_txt.bind("<Return>", self._on_enter)

        # Buton Send — accent violet
        self.send_btn = ctk.CTkButton(
            bar_wrap, text="↑", width=38, height=38, corner_radius=12,
            fg_color=ACCENT, hover_color="#6355d4",
            text_color="white", font=ctk.CTkFont(size=18, weight="bold"),
            command=self._send)
        self.send_btn.grid(row=0, column=4, padx=(4,8), pady=6)

        # Disclaimer
        ctk.CTkLabel(input_outer,
                     text="UGAL AI poate face greșeli. Verifică informațiile importante.",
                     font=ctk.CTkFont(family="Segoe UI", size=10),
                     text_color=TEXT_DIM).grid(row=2, column=0, pady=(5,0))

    # ── HELPER: divider ──────────────────────────────────
    def _divider(self, parent, row):
        line = ctk.CTkFrame(parent, height=1, fg_color=BORDER, corner_radius=0)
        line.grid(row=row, column=0, sticky="ew", padx=0)

    # ════════════════════════════════════════════════════
    # MESAJE
    # ════════════════════════════════════════════════════
    def _add_user_row(self, text):
        self._msg_count += 1
        row = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
        row.pack(fill="x", pady=(4, 2), padx=16)

        # Spațiu push la stânga
        ctk.CTkFrame(row, fg_color="transparent").pack(side="left", fill="x", expand=True)

        bubble = ctk.CTkFrame(row, corner_radius=16, fg_color=BG_USER,
                              border_width=1, border_color=BORDER)
        bubble.pack(side="right", anchor="ne", padx=(80, 0))

        ctk.CTkLabel(bubble, text=text,
                     font=ctk.CTkFont(family="Segoe UI", size=14),
                     text_color=TEXT, wraplength=440, justify="left").pack(padx=16, pady=10)
        self._scroll_bottom()

    def _add_bot_row(self, text):
        self._msg_count += 1
        row = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
        row.pack(fill="x", pady=(4, 8), padx=16)

        # Avatar
        av_frame = ctk.CTkFrame(row, fg_color="transparent", width=AVATAR_SIZE + 8)
        av_frame.pack(side="left", anchor="nw", padx=(0, 10), pady=4)
        av_frame.pack_propagate(False)
        ctk.CTkLabel(av_frame, image=self.avatar_img, text="").pack()

        # Bubble
        bubble = ctk.CTkFrame(row, fg_color=BG_CARD, corner_radius=16,
                              border_width=1, border_color=BORDER)
        bubble.pack(side="left", fill="x", expand=True, anchor="nw", padx=(0, 60))

        # Calculăm wraplength imediat din lățimea ferestrei — nu așteptăm Configure
        win_w = self.winfo_width()
        sidebar_w = 270 if self.sidebar_visible else 0
        # lățime disponibilă: fereastră - sidebar - padding - avatar - margini bubble
        wrap_w = max(300, win_w - sidebar_w - 80 - (AVATAR_SIZE + 18) - 60 - 28)

        lbl = ctk.CTkLabel(
            bubble,
            text=text,
            font=ctk.CTkFont(family="Segoe UI", size=14),
            text_color=TEXT,
            fg_color="transparent",
            justify="left",
            anchor="nw",
            wraplength=wrap_w,
        )
        lbl.pack(fill="x", expand=True, padx=14, pady=(12, 8))

        # Update wraplength când fereastra se redimensionează
        def _update_wrap(event=None):
            try:
                w = bubble.winfo_width() - 28
                if w > 80:
                    lbl.configure(wraplength=w)
            except:
                pass

        bubble.bind("<Configure>", _update_wrap)

        # Google Maps button
        lower = text.lower()
        for key, (btn_text, link) in UGAL_LOCATIONS.items():
            if key in lower:
                ctk.CTkButton(
                    bubble, text=btn_text, height=30, corner_radius=8,
                    fg_color=SUCCESS_SOFT, hover_color="#1a4435",
                    text_color=SUCCESS, font=ctk.CTkFont(size=12),
                    border_width=1, border_color=SUCCESS,
                    command=lambda l=link: webbrowser.open(l)
                ).pack(anchor="w", padx=12, pady=(0, 8))
                break

        # Toolbar acțiuni
        self._add_action_toolbar(bubble, text)

        # Scroll jos — multiplu, cu delay crescător, ca să prindă după ce layout-ul e gata
        self.after(100, self._force_scroll_bottom)
        self.after(400, self._force_scroll_bottom)
        self.after(800, self._force_scroll_bottom)

    def _force_scroll_bottom(self):
        """Scroll robust — actualizează canvas și merge jos."""
        try:
            self.msg_frame.update_idletasks()
            self.msg_frame._parent_canvas.update_idletasks()
            self.msg_frame._parent_canvas.yview_moveto(1.0)
        except:
            pass

    def _scroll_bottom(self):
        self.after(80, self._force_scroll_bottom)
        self.after(350, self._force_scroll_bottom)

    def _add_action_toolbar(self, parent, text):
        """Bara subtilă de acțiuni sub fiecare mesaj bot."""
        bar = ctk.CTkFrame(parent, fg_color="transparent")
        bar.pack(fill="x", padx=10, pady=(0, 8))

        def copy_text():
            self.clipboard_clear()
            self.clipboard_append(text)
            copy_btn.configure(text="✓ Copiat", text_color=SUCCESS)
            self.after(1800, lambda: copy_btn.configure(text="⎘ Copiază", text_color=TEXT_DIM))

        copy_btn = ctk.CTkButton(
            bar, text="⎘ Copiază", height=22, width=80, corner_radius=6,
            fg_color="transparent", hover_color=BG_HOVER,
            text_color=TEXT_DIM, font=ctk.CTkFont(size=10),
            command=copy_text)
        copy_btn.pack(side="left", padx=(0, 4))

        # Export PDF / DOCX dacă modulul există
        try:
            from export_utils import export_to_pdf, export_to_docx
            title = self.current_session.get("title","Răspuns AI") if self.current_session else "Răspuns AI"
            ctk.CTkButton(bar, text="↓ PDF", height=22, width=64, corner_radius=6,
                          fg_color="transparent", hover_color=BG_HOVER,
                          text_color=TEXT_DIM, font=ctk.CTkFont(size=10),
                          command=lambda t=text, ti=title: export_to_pdf(t, ti)
                          ).pack(side="left", padx=(0,4))
            ctk.CTkButton(bar, text="↓ Word", height=22, width=68, corner_radius=6,
                          fg_color="transparent", hover_color=BG_HOVER,
                          text_color=TEXT_DIM, font=ctk.CTkFont(size=10),
                          command=lambda t=text, ti=title: export_to_docx(t, ti)
                          ).pack(side="left", padx=(0,4))
        except ImportError:
            pass

        # Calendar dacă detectăm date
        try:
            from export_utils import extract_dates, generate_ics
            detected = extract_dates(text)
            if detected:
                ctk.CTkButton(
                    bar, text=f"📅 Calendar ({len(detected)})",
                    height=22, width=110, corner_radius=6,
                    fg_color=ACCENT_SOFT, hover_color="#3a2e70",
                    text_color=ACCENT, font=ctk.CTkFont(size=10),
                    command=lambda t=text, d=detected: self._pick_and_export_ics(t, d)
                ).pack(side="left", padx=(0,4))
        except ImportError:
            pass

    def _add_thinking_row(self):
        self.thinking_row = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
        self.thinking_row.pack(fill="x", pady=6, padx=16)

        av_frame = ctk.CTkFrame(self.thinking_row, fg_color="transparent", width=AVATAR_SIZE+8)
        av_frame.pack(side="left", anchor="nw", padx=(0,10), pady=2)
        av_frame.pack_propagate(False)
        ctk.CTkLabel(av_frame, image=self.avatar_img, text="").pack()

        bubble = ctk.CTkFrame(self.thinking_row, fg_color=BG_CARD, corner_radius=16,
                              border_width=1, border_color=BORDER)
        bubble.pack(side="left", anchor="nw")

        dots_frame = ctk.CTkFrame(bubble, fg_color="transparent")
        dots_frame.pack(padx=18, pady=12)
        self._dots = []
        for i in range(3):
            d = ctk.CTkLabel(dots_frame, text="●", font=ctk.CTkFont(size=11),
                             text_color=TEXT_DIM)
            d.pack(side="left", padx=3)
            self._dots.append(d)
        self._dot_idx = 0
        self._animate_dots()
        self._scroll_bottom()

    def _animate_dots(self):
        if not self.thinking_row or not self._dots: return
        try:
            for i, d in enumerate(self._dots):
                d.configure(text_color=ACCENT if i == self._dot_idx else TEXT_DIM)
            self._dot_idx = (self._dot_idx + 1) % 3
            self.after(420, self._animate_dots)
        except: pass

    def _remove_thinking_row(self):
        if self.thinking_row:
            self.thinking_row.destroy()
            self.thinking_row = None
            self._dots = []



    # ════════════════════════════════════════════════════
    # WELCOME SCREEN
    # ════════════════════════════════════════════════════
    def _show_welcome(self):
        frm = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
        frm.pack(fill="both", expand=True, pady=60)

        # Orb decorativ
        orb = ctk.CTkFrame(frm, width=72, height=72, corner_radius=36,
                           fg_color=ACCENT_SOFT, border_width=2, border_color=ACCENT)
        orb.pack(pady=(0, 18))
        orb.pack_propagate(False)
        ctk.CTkLabel(orb, text="⬡", font=ctk.CTkFont(size=28), text_color=ACCENT).place(relx=0.5, rely=0.5, anchor="center")

        ctk.CTkLabel(frm,
                     text="Bună ziua! Sunt UGAL AI",
                     font=ctk.CTkFont(family="Trebuchet MS", size=24, weight="bold"),
                     text_color=TEXT).pack()
        ctk.CTkLabel(frm,
                     text="Asistentul tău academic. Cu ce te pot ajuta astăzi?",
                     font=ctk.CTkFont(family="Segoe UI", size=14),
                     text_color=TEXT_MID).pack(pady=(6, 28))

        # Suggestion chips
        suggestions = [
            ("📅", "Când e sesiunea de examene?"),
            ("🗺", "Unde e Corpul D?"),
            ("📋", "Cerere de adeverință"),
            ("📚", "Structura anului universitar"),
        ]
        chips_row = ctk.CTkFrame(frm, fg_color="transparent")
        chips_row.pack()
        for icon, label in suggestions:
            chip = ctk.CTkButton(
                chips_row, text=f"{icon}  {label}",
                height=36, corner_radius=18,
                fg_color=BG_CARD, hover_color=BG_HOVER,
                text_color=TEXT_MID, font=ctk.CTkFont(size=12),
                border_width=1, border_color=BORDER,
                command=lambda l=label: self._quick_send(l))
            chip.pack(side="left", padx=5)

    def _quick_send(self, text):
        self.input_txt.delete("1.0", "end")
        self.input_txt.insert("1.0", text)
        self._send()

    # ════════════════════════════════════════════════════
    # SIDEBAR SESIUNI
    # ════════════════════════════════════════════════════
    def _load_session_list(self):
        for w in self.sess_list.winfo_children(): w.destroy()
        sessions = list_sessions()
        if not sessions:
            ctk.CTkLabel(self.sess_list, text="Nicio conversație încă",
                         font=ctk.CTkFont(size=12), text_color=TEXT_DIM).pack(pady=24)
            return

        groups = {}
        for s in sessions:
            try: d = datetime.fromisoformat(s["created"]).date()
            except: d = date.today()
            groups.setdefault(self._date_label(d), []).append(s)

        for grp, items in groups.items():
            ctk.CTkLabel(self.sess_list, text=grp.upper(),
                         font=ctk.CTkFont(family="Consolas", size=9),
                         text_color=TEXT_DIM, anchor="w").pack(fill="x", padx=8, pady=(12,3))
            for s in items:
                self._add_session_item(s)

    def _date_label(self, d):
        delta = (date.today() - d).days
        if delta == 0: return "Astăzi"
        if delta == 1: return "Ieri"
        if delta < 7:  return "Ultimele 7 zile"
        return d.strftime("%d %b %Y")

    def _add_session_item(self, session):
        title = session.get("title", "Conversație nouă")
        is_active = self.current_session and self.current_session["id"] == session["id"]

        btn = ctk.CTkButton(
            self.sess_list, text=f"  {title}",
            fg_color=ACCENT_SOFT if is_active else "transparent",
            hover_color=BG_HOVER,
            anchor="w", text_color=ACCENT if is_active else TEXT_MID,
            font=ctk.CTkFont(family="Segoe UI", size=12),
            corner_radius=8, height=34,
            command=lambda s=session: self._open_session(s))
        btn.pack(fill="x", pady=1, padx=4)

    def _toggle_sidebar(self):
        if self.sidebar_visible:
            self.sidebar.grid_remove(); self.sidebar_visible = False
        else:
            self.sidebar.grid(); self.sidebar_visible = True

    # ════════════════════════════════════════════════════
    # CHAT LOGIC
    # ════════════════════════════════════════════════════
    def _new_chat(self, silent=False):
        self.current_session = {"id": new_session_id(), "title": "Conversație nouă",
                                "messages": [], "created": datetime.now().isoformat()}
        self._client.reset([])
        self._clear_messages()
        self.title_lbl.configure(text="Conversație nouă")
        self._show_welcome()
        if not silent: self._load_session_list()

    def _open_session(self, session):
        self.current_session = session
        history = [{"role": m["role"], "text": m.get("full_prompt", m["text"])}
                   for m in session["messages"]]
        self._client.reset(self._prompt_builder.format_history(history))
        self._clear_messages()
        self.title_lbl.configure(text=session.get("title", "Conversație"))
        for msg in session["messages"]:
            if msg["role"] == "user": self._add_user_row(msg["text"])
            else: self._add_bot_row(msg["text"])
        self._load_session_list()

    def _delete_current(self):
        if not self.current_session: return
        path = get_history_path(self.current_session["id"])
        if os.path.exists(path): os.remove(path)
        self._new_chat()
        self._load_session_list()

    def _clear_messages(self):
        for w in self.msg_frame.winfo_children(): w.destroy()
        self._msg_count = 0

    # ── PLUS MENU ────────────────────────────────────────
    def _toggle_plus_menu(self):
        if self._plus_menu:
            self._plus_menu.destroy(); self._plus_menu = None; return

        self._plus_menu = ctk.CTkFrame(self, corner_radius=12, fg_color=BG_CARD,
                                       border_width=1, border_color=BORDER)
        for text, cmd in [
            ("📂  Atașează fișier", lambda: [self._close_plus_menu(), self._open_file()]),
            ("🖼  Generează imagine", lambda: [self._close_plus_menu(), self._create_image()]),
        ]:
            ctk.CTkButton(self._plus_menu, text=text, fg_color="transparent",
                          hover_color=BG_HOVER, anchor="w", text_color=TEXT_MID,
                          font=ctk.CTkFont(size=13), height=36,
                          command=cmd).pack(fill="x", padx=6, pady=3)

        self.update_idletasks()
        x = self.plus_btn.winfo_rootx() - self.winfo_rootx()
        y = self.plus_btn.winfo_rooty() - self.winfo_rooty() - 96
        self._plus_menu.place(x=x, y=y)
        self.bind("<Button-1>", self._on_root_click_close_menu, add="+")

    def _on_root_click_close_menu(self, event):
        if not self._plus_menu: return
        try:
            wx, wy = self._plus_menu.winfo_rootx(), self._plus_menu.winfo_rooty()
            ww, wh = self._plus_menu.winfo_width(), self._plus_menu.winfo_height()
            if not (wx <= event.x_root <= wx+ww and wy <= event.y_root <= wy+wh):
                self._close_plus_menu()
        except: self._plus_menu = None

    def _close_plus_menu(self):
        if self._plus_menu: self._plus_menu.destroy(); self._plus_menu = None
        self.unbind("<Button-1>")

    # ── FISIERE ──────────────────────────────────────────
    def _open_file(self):
        path = filedialog.askopenfilename(
            title="Atașează fișier",
            filetypes=[("Fișiere suportate", "*.txt *.md *.py *.json *.csv *.html"), ("Toate", "*.*")])
        if not path: return
        fname = os.path.basename(path)
        self.attached_files.append(path)

        chip = ctk.CTkFrame(self.chips_frame, corner_radius=12, fg_color=BG_CARD,
                            border_width=1, border_color=BORDER)
        chip.pack(side="left", padx=4, pady=2)
        ctk.CTkLabel(chip, text=f"📎 {fname[:24]}",
                     font=ctk.CTkFont(size=11), text_color=TEXT_MID).pack(side="left", padx=(10,4), pady=4)

        def rm():
            chip.destroy()
            if path in self.attached_files: self.attached_files.remove(path)

        ctk.CTkButton(chip, text="×", width=18, height=18, corner_radius=9,
                      fg_color="transparent", hover_color=DANGER_SOFT,
                      text_color=TEXT_DIM, font=ctk.CTkFont(size=12),
                      command=rm).pack(side="left", padx=(0,6))

    # ── VOCE ────────────────────────────────────────────
    def _start_voice_thread(self):
        if self.is_listening: return
        self.is_listening = True
        self.mic_btn.configure(text_color=DANGER, fg_color=DANGER_SOFT)
        self.input_txt.insert("end", "[ 🎤 Ascult... ]")
        threading.Thread(target=self._listen_voice, daemon=True).start()

    def _listen_voice(self):
        try:
            import speech_recognition as sr
            r = sr.Recognizer()
            with sr.Microphone() as src:
                r.adjust_for_ambient_noise(src, duration=0.5)
                audio = r.listen(src, timeout=5, phrase_time_limit=15)
            text = r.recognize_google(audio, language="ro-RO")
            cur = self.input_txt.get("1.0","end-1c").replace("[ 🎤 Ascult... ]","")
            self.input_txt.delete("1.0","end")
            self.input_txt.insert("1.0", (cur+" "+text).strip())
        except Exception as e:
            self._remove_listening_text()
        finally:
            self.is_listening = False
            self.mic_btn.configure(text_color=TEXT_DIM, fg_color="transparent")

    def _remove_listening_text(self):
        cur = self.input_txt.get("1.0","end-1c").replace("[ 🎤 Ascult... ]","")
        self.input_txt.delete("1.0","end")
        self.input_txt.insert("1.0", cur)

    # ── OCR ─────────────────────────────────────────────
    def _ocr_image(self):
        cur = self.input_txt.get("1.0","end-1c")
        self.input_txt.delete("1.0","end")
        self.input_txt.insert("1.0", cur + "\n[ 📷 Se deschide camera... ]\n")

        def process():
            try:
                import cv2, pytesseract
                pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
                cap = cv2.VideoCapture(0)
                if not cap.isOpened(): raise Exception("Nu am putut accesa camera.")
                cv2.namedWindow("Camera UGAL AI", cv2.WINDOW_NORMAL)
                cv2.resizeWindow("Camera UGAL AI", 800, 600)
                captured = None
                while True:
                    ret, frame = cap.read()
                    if not ret: break
                    clean = frame.copy()
                    cv2.putText(frame,"SPACE = poză | ESC = anulare",(10,40),cv2.FONT_HERSHEY_SIMPLEX,0.8,(124,106,247),2)
                    cv2.imshow("Camera UGAL AI", frame)
                    k = cv2.waitKey(1) & 0xFF
                    if k == 32: captured = clean; break
                    elif k == 27: break
                cap.release(); cv2.destroyAllWindows()
                if captured is not None:
                    rgb = cv2.cvtColor(captured, cv2.COLOR_BGR2RGB)
                    pil = Image.fromarray(rgb)
                    w,h = pil.size
                    disp = pil.resize((400, int(h*400/w)), Image.LANCZOS) if w>400 else pil
                    cimg = ctk.CTkImage(light_image=disp, dark_image=disp, size=disp.size)
                    extracted = pytesseract.image_to_string(pil, lang='ron+eng')
                    clean_cur = self.input_txt.get("1.0","end-1c").replace("[ 📷 Se deschide camera... ]\n","")
                    self.input_txt.delete("1.0","end")
                    if extracted.strip():
                        self.input_txt.insert("1.0", f"{clean_cur}\n{extracted.strip()}")
                    else:
                        self.input_txt.insert("1.0", clean_cur)
                    def show_img():
                        self._image_refs.append(cimg)
                        row = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
                        row.pack(fill="x", pady=8, padx=16)
                        ctk.CTkLabel(row, text="📷", font=ctk.CTkFont(size=18), text_color=ACCENT2).pack(side="left", anchor="nw", padx=(0,10))
                        col = ctk.CTkFrame(row, fg_color=BG_CARD, corner_radius=12, border_width=1, border_color=BORDER)
                        col.pack(side="left")
                        ctk.CTkLabel(col, text="Imagine capturată:", font=ctk.CTkFont(size=11), text_color=TEXT_DIM).pack(anchor="w", padx=12, pady=(8,4))
                        ctk.CTkLabel(col, image=cimg, text="").pack(padx=12, pady=(0,10))
                        self._scroll_bottom()
                    self.after(0, show_img)
                else:
                    clean_cur = self.input_txt.get("1.0","end-1c").replace("[ 📷 Se deschide camera... ]\n","")
                    self.input_txt.delete("1.0","end"); self.input_txt.insert("1.0",clean_cur)
            except Exception as e:
                clean_cur = self.input_txt.get("1.0","end-1c").replace("[ 📷 Se deschide camera... ]\n","")
                self.input_txt.delete("1.0","end"); self.input_txt.insert("1.0",clean_cur)
                messagebox.showerror("Eroare Cameră", str(e))
        threading.Thread(target=process, daemon=True).start()

    # ── IMAGINE POLLINATIONS ────────────────────────────
    def _create_image(self):
        dlg = ctk.CTkInputDialog(text="Descrie imaginea (în engleză):", title="Generează Imagine")
        prompt = dlg.get_input()
        if prompt:
            self._add_user_row(f"🖼  {prompt}")
            self._add_thinking_row()
            threading.Thread(target=self._fetch_and_show_image, args=(prompt,), daemon=True).start()

    def _fetch_and_show_image(self, prompt):
        try:
            from urllib.parse import quote
            url = f"https://image.pollinations.ai/prompt/{quote(prompt[:300])}"
            r = requests.get(url, headers={'User-Agent':'Mozilla/5.0'}, timeout=120)
            r.raise_for_status()
            pil = Image.open(io.BytesIO(r.content)).convert("RGB")
            w,h = pil.size
            if w>500: pil = pil.resize((500, int(h*500/w)), Image.LANCZOS)
            cimg = ctk.CTkImage(light_image=pil, dark_image=pil, size=pil.size)
            err = None
        except Exception as e:
            cimg, err = None, str(e)

        def show():
            self._remove_thinking_row()
            if cimg:
                self._image_refs.append(cimg)
                row = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
                row.pack(fill="x", pady=6, padx=16)
                ctk.CTkLabel(row, image=self.avatar_img, text="").pack(side="left", anchor="nw", padx=(0,10))
                col = ctk.CTkFrame(row, fg_color=BG_CARD, corner_radius=16, border_width=1, border_color=BORDER)
                col.pack(side="left")
                ctk.CTkLabel(col, text=f'Imagine: "{prompt[:50]}"',
                             font=ctk.CTkFont(size=11), text_color=TEXT_DIM).pack(anchor="w", padx=14, pady=(10,4))
                ctk.CTkLabel(col, image=cimg, text="").pack(padx=14, pady=(0,12))
            else:
                self._add_bot_row(f"❌ {err}")
            self._scroll_bottom()
        self.after(0, show)

    # ── SEND ────────────────────────────────────────────
    def _on_enter(self, e):
        if not (e.state & 0x1): self._send(); return "break"

    def _send(self, event=None):
        if self.is_thinking: return
        raw = self.input_txt.get("1.0","end-1c").strip()
        if not raw and not self.attached_files: return

        file_context, file_names = "", []
        for path in self.attached_files:
            fname = os.path.basename(path)
            file_names.append(fname)
            try:
                with open(path, encoding="utf-8") as f:
                    file_context += f"\n\n--- {fname} ---\n{f.read(8000)}\n---"
            except Exception as e:
                file_context += f"\n[Eroare {fname}: {e}]"

        db_context = ""
        if raw:
            try: db_context = self.rag.search(raw)
            except: pass

        full_prompt = ""
        if db_context: full_prompt += f"[CONTEXT UGAL]:\n{db_context}\n\n"
        full_prompt += file_context
        if raw: full_prompt += f"[ÎNTREBARE]:\n{raw}"

        display = raw + (f"\n\n📎 {', '.join(file_names)}" if file_names else "")

        self.input_txt.delete("1.0","end")
        for w in self.chips_frame.winfo_children(): w.destroy()
        self.attached_files.clear()

        self._add_user_row(display.strip())
        self.is_thinking = True
        self.send_btn.configure(fg_color=BG_HOVER, text_color=TEXT_DIM, state="disabled")
        self._add_thinking_row()

        threading.Thread(target=self._call_api, args=(full_prompt, display.strip()), daemon=True).start()

    def _call_api(self, full_prompt, display):
        try:
            raw = self._client.send(full_prompt)
            reply = self._output_parser.parse(raw)
            err = None
        except Exception as e:
            reply, err = None, str(e)
            history = [{"role": m["role"], "text": m.get("full_prompt", m["text"])}
                       for m in self.current_session.get("messages",[])]
            self._client.reset(self._prompt_builder.format_history(history))

        def update():
            self.is_thinking = False
            self._remove_thinking_row()
            self.send_btn.configure(fg_color=ACCENT, text_color="white", state="normal")
            if reply:
                self.current_session["messages"] += [
                    {"role":"user","text":display,"full_prompt":full_prompt,"timestamp":datetime.now().isoformat()},
                    {"role":"model","text":reply,"timestamp":datetime.now().isoformat()},
                ]
                if len(self.current_session["messages"]) == 2:
                    self.current_session["title"] = make_title(display)
                    self.title_lbl.configure(text=self.current_session["title"])
                save_session(self.current_session)
                self._load_session_list()
                self._add_bot_row(reply)
            else:
                self._add_bot_row(f"❌ Eroare API: {err}")
            self.input_txt.focus()
        self.after(0, update)

    # ── ICS PICKER ──────────────────────────────────────
    def _pick_and_export_ics(self, text, detected):
        try:
            from export_utils import generate_ics
        except ImportError:
            messagebox.showerror("Lipsă modul", "export_utils.py nu a fost găsit.")
            return
        if len(detected) == 1:
            ev = detected[0]
            generate_ics(ev.get("label","Eveniment"), ev["date_start"], ev.get("date_end"), ev.get("context",""))
            return
        dlg = ctk.CTkToplevel(self)
        dlg.title("Alege evenimentul")
        dlg.geometry("460x320")
        dlg.configure(fg_color=BG_MAIN)
        dlg.grab_set()
        ctk.CTkLabel(dlg, text="Selectează evenimentul de adăugat:",
                     font=ctk.CTkFont(size=13, weight="bold"), text_color=TEXT).pack(pady=16)
        scroll = ctk.CTkScrollableFrame(dlg, fg_color=BG_CARD, corner_radius=10)
        scroll.pack(fill="both", expand=True, padx=16, pady=(0,16))
        for ev in detected:
            lbl = ev.get("label") or "Eveniment"
            ds = ev["date_start"].strftime("%d %b %Y")
            de = ev.get("date_end")
            rng = f" – {de.strftime('%d %b %Y')}" if de and de != ev["date_start"] else ""
            ctk.CTkButton(scroll, text=f"📅  {lbl[:42]}  ·  {ds}{rng}",
                          fg_color="transparent", hover_color=BG_HOVER,
                          anchor="w", text_color=TEXT_MID, corner_radius=8, height=36,
                          command=lambda e=ev, d=dlg: [d.destroy(),
                              generate_ics(e.get("label","Eveniment"), e["date_start"], e.get("date_end"), e.get("context",""))]
                          ).pack(fill="x", pady=2, padx=6)


if __name__ == "__main__":
    app = ChatApp()
    app.mainloop()