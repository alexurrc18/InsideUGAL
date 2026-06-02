import os
import sys
import json
import threading
import io
from datetime import datetime, date

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
install_if_missing("customtkinter", "customtkinter")

import tkinter as tk
import customtkinter as ctk
from tkinter import messagebox, filedialog
from PIL import Image, ImageTk, ImageDraw
from dotenv import load_dotenv
import requests

load_dotenv(override=True)

from llm_client import LLMClient
from prompt_builder import PromptBuilder
from output_parser import OutputParser
from rag_engine import RAGEngine  # Importăm creierul UGAL

# ── Configurare CustomTkinter ─────────────────────────────
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue") 

# ── Config ───────────────────────────────────────────────
MODEL        = "openai/gpt-oss-120b:free"
HISTORY_DIR  = "histories"
AVATAR_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_avatar.png")

# ── Paleta Google Gemini Dark Mode ───────────────────────
BG_MAIN       = "#131314"
BG_SIDEBAR    = "#1e1f22"
BG_INPUT      = "#1e1f22"
BG_USER       = "#282a2c"
BG_BUBBLE_BOT = "#131314"
TEXT          = "#e3e3e3"
TEXT_DIM      = "#c4c7c5"
ACCENT        = "#a8c7fa"
ACCENT2       = "#c58af9"
DANGER        = "#f28b82"
AVATAR_SIZE   = 36

os.makedirs(HISTORY_DIR, exist_ok=True)

# ── Funcții Utilitare ────────────────────────────────────
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
            except: pass
    return sessions

def new_session_id():
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def make_title(text):
    return text[:32] + ("…" if len(text) > 32 else "")

def make_circle_image(path, size):
    img  = Image.open(path).convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    out  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, mask=mask)
    return ctk.CTkImage(light_image=out, dark_image=out, size=(size, size))

# ════════════════════════════════════════════════════════
class ChatApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Gemini-style AI Next-Gen")
        self.geometry("1050x750")
        self.minsize(800, 600)
        
        self.configure(fg_color=BG_MAIN)

        self._prompt_builder  = PromptBuilder()
        self._output_parser   = OutputParser()
        self._image_refs      = []
        self.attached_files   = [] 
        self.is_thinking      = False
        self.sidebar_visible  = True
        self.current_session  = None
        self._plus_menu       = None

        self._client = LLMClient(model_name=MODEL,
                                 system_instruction=self._prompt_builder.build())
        
        # Conectăm baza de date UGAL (RAG)
        self.rag = RAGEngine()

        self.avatar_img = make_circle_image(AVATAR_PATH, AVATAR_SIZE) \
            if os.path.exists(AVATAR_PATH) else None

        self._build_ui()
        self._load_session_list()
        self._new_chat(silent=True)

    # ── Construcția UI Next-Gen ──────────────────────────
    def _build_ui(self):
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        # === SIDEBAR ===
        self.sidebar = ctk.CTkFrame(self, width=280, corner_radius=0, fg_color=BG_SIDEBAR)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_rowconfigure(2, weight=1)

        sid_hdr = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        sid_hdr.grid(row=0, column=0, sticky="ew", padx=20, pady=20)
        
        ctk.CTkLabel(sid_hdr, text="Conversații", font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold"), text_color=TEXT).pack(side="left")
        
        ctk.CTkButton(sid_hdr, text="＋", width=30, height=30, corner_radius=15, 
                      fg_color="transparent", hover_color=BG_USER, text_color=ACCENT, 
                      font=ctk.CTkFont(size=20), command=self._new_chat).pack(side="right")

        self.sess_list = ctk.CTkScrollableFrame(self.sidebar, fg_color="transparent", corner_radius=0)
        self.sess_list.grid(row=2, column=0, sticky="nsew", padx=10)

        sid_foot = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        sid_foot.grid(row=3, column=0, sticky="ew", padx=20, pady=15)
        ctk.CTkLabel(sid_foot, text=f"✨ {MODEL}", font=ctk.CTkFont(family="Segoe UI", size=11), text_color=TEXT_DIM).pack(side="left")

        # === MAIN CHAT AREA ===
        self.main_area = ctk.CTkFrame(self, corner_radius=0, fg_color=BG_MAIN)
        self.main_area.grid(row=0, column=1, sticky="nsew")
        self.main_area.grid_rowconfigure(1, weight=1)
        self.main_area.grid_columnconfigure(0, weight=1)

        self.hdr = ctk.CTkFrame(self.main_area, corner_radius=0, fg_color=BG_MAIN, height=60)
        self.hdr.grid(row=0, column=0, sticky="ew", padx=10, pady=10)
        self.hdr.grid_columnconfigure(1, weight=1)

        ctk.CTkButton(self.hdr, text="☰", width=40, fg_color="transparent", hover_color=BG_USER, 
                      text_color=TEXT_DIM, font=ctk.CTkFont(size=20), command=self._toggle_sidebar).grid(row=0, column=0, padx=10)
        
        self.title_lbl = ctk.CTkLabel(self.hdr, text="Conversație nouă", font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold"), text_color=TEXT)
        self.title_lbl.grid(row=0, column=1, sticky="w", padx=10)

        ctk.CTkButton(self.hdr, text="🗑", width=40, fg_color="transparent", hover_color=BG_USER, 
                      text_color=DANGER, font=ctk.CTkFont(size=18), command=self._delete_current).grid(row=0, column=2, padx=10)

        self.msg_frame = ctk.CTkScrollableFrame(self.main_area, fg_color="transparent")
        self.msg_frame.grid(row=1, column=0, sticky="nsew", padx=20)

        # === ZONA DE INPUT ===
        self.input_container = ctk.CTkFrame(self.main_area, fg_color="transparent")
        self.input_container.grid(row=2, column=0, sticky="ew", padx=40, pady=(10, 20))
        self.input_container.grid_columnconfigure(0, weight=1)

        self.chips_frame = ctk.CTkFrame(self.input_container, fg_color="transparent")
        self.chips_frame.grid(row=0, column=0, sticky="ew", pady=(0, 5))

        self.inner_bar = ctk.CTkFrame(self.input_container, corner_radius=25, fg_color=BG_INPUT)
        self.inner_bar.grid(row=1, column=0, sticky="ew")
        self.inner_bar.grid_columnconfigure(1, weight=1)

        self.plus_btn = ctk.CTkButton(self.inner_bar, text="＋", width=40, height=40, corner_radius=20,
                                      fg_color="transparent", hover_color=BG_USER, text_color=TEXT_DIM,
                                      font=ctk.CTkFont(size=20), command=self._toggle_plus_menu)
        self.plus_btn.grid(row=0, column=0, padx=5, pady=5)

        self.input_txt = ctk.CTkTextbox(self.inner_bar, height=45, fg_color="transparent", 
                                        text_color=TEXT, font=ctk.CTkFont(family="Segoe UI", size=14),
                                        wrap="word", border_width=0)
        self.input_txt.grid(row=0, column=1, sticky="ew", padx=10, pady=10)
        self.input_txt.bind("<Return>", self._on_enter)

        self.send_btn = ctk.CTkButton(self.inner_bar, text="➤", width=40, height=40, corner_radius=20,
                                      fg_color="transparent", hover_color=BG_USER, text_color=TEXT_DIM,
                                      font=ctk.CTkFont(size=18), command=self._send)
        self.send_btn.grid(row=0, column=2, padx=5, pady=5)

        ctk.CTkLabel(self.input_container, text="Modelele AI pot oferi informații inexacte.", 
                     font=ctk.CTkFont(family="Segoe UI", size=11), text_color=TEXT_DIM).grid(row=2, column=0, pady=(5,0))

    # ── Meniul Modern Plus ────────────────────────────────
    def _toggle_plus_menu(self):
        if self._plus_menu:
            self._plus_menu.destroy()
            self._plus_menu = None
            return

        self._plus_menu = ctk.CTkFrame(self, corner_radius=10, fg_color=BG_USER, border_width=1, border_color=BG_SIDEBAR)
        
        btn_file = ctk.CTkButton(self._plus_menu, text="📂 Deschide fișier", fg_color="transparent", 
                                 hover_color=BG_SIDEBAR, anchor="w", command=lambda: [self._close_plus_menu(), self._open_file()])
        btn_file.pack(fill="x", padx=5, pady=5)
        
        btn_img = ctk.CTkButton(self._plus_menu, text="🖼 Creează imagine", fg_color="transparent", 
                                hover_color=BG_SIDEBAR, anchor="w", command=lambda: [self._close_plus_menu(), self._create_image()])
        btn_img.pack(fill="x", padx=5, pady=5)

        self.update_idletasks()
        x = self.plus_btn.winfo_rootx() - self.winfo_rootx()
        y = self.plus_btn.winfo_rooty() - self.winfo_rooty() - 90
        self._plus_menu.place(x=x, y=y)
        self.bind("<Button-1>", self._on_root_click_close_menu, add="+")

    def _on_root_click_close_menu(self, event):
        if self._plus_menu is None: return
        try:
            wx, wy = self._plus_menu.winfo_rootx(), self._plus_menu.winfo_rooty()
            ww, wh = self._plus_menu.winfo_width(), self._plus_menu.winfo_height()
            if not (wx <= event.x_root <= wx + ww and wy <= event.y_root <= wy + wh):
                self._close_plus_menu()
        except: self._plus_menu = None

    def _close_plus_menu(self):
        if self._plus_menu:
            self._plus_menu.destroy()
            self._plus_menu = None
        self.unbind("<Button-1>")

    # ── Upload Fișier Modern (Chip-uri externe) ───────────
    def _open_file(self):
        path = filedialog.askopenfilename(
            title="Deschide fișier",
            filetypes=[("Fișiere text", "*.txt *.md *.py *.json *.csv *.html"), ("Toate", "*.*")])
        if not path: return
        
        filename = os.path.basename(path)
        self.attached_files.append(path)
        
        chip = ctk.CTkFrame(self.chips_frame, corner_radius=15, fg_color=BG_USER)
        chip.pack(side="left", padx=5)
        
        ctk.CTkLabel(chip, text=f"📎 {filename}", font=ctk.CTkFont(size=12)).pack(side="left", padx=(10, 5), pady=2)
        
        def remove_chip():
            chip.destroy()
            if path in self.attached_files:
                self.attached_files.remove(path)
                
        btn_x = ctk.CTkButton(chip, text="×", width=20, height=20, corner_radius=10, 
                              fg_color="transparent", hover_color=DANGER, text_color=TEXT, 
                              command=remove_chip)
        btn_x.pack(side="left", padx=(0, 5), pady=2)
        self.send_btn.configure(text_color=TEXT)
        self.input_txt.focus()

    # ── Management Istoric Conversatii ───────────────────
    def _load_session_list(self):
        for w in self.sess_list.winfo_children(): w.destroy()
        sessions = list_sessions()
        if not sessions:
            ctk.CTkLabel(self.sess_list, text="Nicio conversație recentă", text_color=TEXT_DIM).pack(pady=20)
            return

        groups = {}
        for s in sessions:
            try: d = datetime.fromisoformat(s["created"]).date()
            except: d = date.today()
            lbl = self._date_label(d)
            groups.setdefault(lbl, []).append(s)

        for grp, items in groups.items():
            ctk.CTkLabel(self.sess_list, text=grp, font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_DIM, anchor="w").pack(fill="x", pady=(15,5), padx=5)
            for s in items: self._add_session_item(s)

    def _date_label(self, d):
        delta = (date.today() - d).days
        if delta == 0: return "Astăzi"
        if delta == 1: return "Ieri"
        if delta < 7:  return "Ultimele 7 zile"
        return d.strftime("%d %b %Y")

    def _add_session_item(self, session):
        title = session.get("title", "Conversație nouă")
        btn = ctk.CTkButton(self.sess_list, text=title, fg_color="transparent", hover_color=BG_USER,
                            anchor="w", text_color=TEXT, font=ctk.CTkFont(size=13),
                            command=lambda s=session: self._open_session(s))
        btn.pack(fill="x", pady=2)

    def _toggle_sidebar(self):
        if self.sidebar_visible:
            self.sidebar.grid_remove()
            self.sidebar_visible = False
        else:
            self.sidebar.grid()
            self.sidebar_visible = True

    # ── Chat Logic ───────────────────────────────────────
    def _new_chat(self, silent=False):
        self.current_session = {"id": new_session_id(), "title": "Conversație nouă", "messages": [], "created": datetime.now().isoformat()}
        self._client.reset([])
        self._clear_messages()
        self.title_lbl.configure(text="Conversație nouă")
        self._show_welcome()
        if not silent: self._load_session_list()

    def _open_session(self, session):
        self.current_session = session
        history_for_llm = [{"role": m["role"], "text": m.get("full_prompt", m["text"])} for m in session["messages"]]
        self._client.reset(self._prompt_builder.format_history(history_for_llm))
        self._clear_messages()
        self.title_lbl.configure(text=session.get("title","Conversație"))
        
        for msg in session["messages"]:
            if msg["role"] == "user": self._add_user_row(msg["text"])
            else: self._add_bot_row(msg["text"])

    def _delete_current(self):
        if not self.current_session: return
        path = get_history_path(self.current_session["id"])
        if os.path.exists(path): os.remove(path)
        self._new_chat()
        self._load_session_list()

    def _clear_messages(self):
        for w in self.msg_frame.winfo_children(): w.destroy()

    def _show_welcome(self):
        frm = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
        frm.pack(fill="x", pady=80)
        ctk.CTkLabel(frm, text="✨", font=ctk.CTkFont(size=40), text_color=ACCENT2).pack()
        ctk.CTkLabel(frm, text="Salut, cu ce te pot ajuta astăzi?", font=ctk.CTkFont(family="Segoe UI", size=22, weight="bold")).pack(pady=10)

    # ── Randare Mesaje Moderne (Fără Trunchieri și Fără Crash-uri) ──
    def _add_user_row(self, text):
        row = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
        row.pack(fill="x", pady=5, padx=10)
        
        bubble = ctk.CTkFrame(row, corner_radius=18, fg_color=BG_USER)
        bubble.pack(side="right", anchor="e")
        
        lbl = ctk.CTkLabel(bubble, text=text, font=ctk.CTkFont(size=14), text_color=TEXT, 
                           wraplength=500, justify="left")
        lbl.pack(padx=15, pady=8)
        self._scroll_bottom()

    def _add_bot_row(self, text):
        row = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
        row.pack(fill="x", pady=5, padx=10)
        
        if self.avatar_img:
            ctk.CTkLabel(row, image=self.avatar_img, text="").pack(side="left", anchor="nw", padx=(0,15))
        else:
            ctk.CTkLabel(row, text="✨", font=ctk.CTkFont(size=20), text_color=ACCENT).pack(side="left", anchor="nw", padx=(0,15))
        
        bubble = ctk.CTkFrame(row, fg_color="transparent")
        bubble.pack(side="left", fill="x", expand=True, anchor="w")
        
        # Folosim CTkTextbox pentru o preluare curată a textului, fără bucle de resize
        txt = ctk.CTkTextbox(bubble, font=ctk.CTkFont(size=14), text_color=TEXT, 
                             fg_color="transparent", wrap="word")
        txt.insert("1.0", text)
        txt.configure(state="disabled")
        txt.pack(fill="x", expand=True, pady=0)

        txt._textbox.bind("<MouseWheel>", lambda e: self.msg_frame._parent_canvas.yview_scroll(int(-1*(e.delta/120)), "units"))
        
        # Metodă sigură, on-shot (fără .bind("<Configure>")) pentru a calcula spațiul
        def _fit():
            txt.update_idletasks()
            try: 
                dlines = txt._textbox.count("1.0", "end", "displaylines")
                lines = int(dlines[0]) if dlines else len(text.split('\n'))
                # Lăsăm fix cât spațiu e nevoie matematic
                txt.configure(height=lines * 24 + 10)
            except: pass
            self._scroll_bottom()
            
        # O rulăm de două ori la interval scurt pentru a ne asigura că widget-ul s-a așezat în fereastră
        txt.after(50, _fit) 
        txt.after(150, _fit) 

    def _add_thinking_row(self):
        self.thinking_row = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
        self.thinking_row.pack(fill="x", pady=10, padx=10)
        
        if self.avatar_img:
            ctk.CTkLabel(self.thinking_row, image=self.avatar_img, text="").pack(side="left", anchor="nw", padx=(0,15))
        else:
            ctk.CTkLabel(self.thinking_row, text="✨", font=ctk.CTkFont(size=20), text_color=ACCENT).pack(side="left", anchor="nw", padx=(0,15))
            
        self.dot_lbl = ctk.CTkLabel(self.thinking_row, text="AI-ul gândește...", font=ctk.CTkFont(size=14, slant="italic"), text_color=ACCENT)
        self.dot_lbl.pack(side="left", anchor="w", pady=5)
        self._scroll_bottom()

    def _remove_thinking_row(self):
        if self.thinking_row:
            self.thinking_row.destroy()
            self.thinking_row = None

    def _scroll_bottom(self):
        self.update_idletasks()
        self.msg_frame._parent_canvas.yview_moveto(1.0)

    # ── Generare Imagine Pollinations ────────────────────
    def _create_image(self):
        dialog = ctk.CTkInputDialog(text="Descrie imaginea dorită (în engleză):", title="Generează Imagine")
        prompt = dialog.get_input()
        if prompt:
            self._add_user_row(f"🖼 Generează imagine: {prompt}")
            self._add_thinking_row()
            threading.Thread(target=self._fetch_and_show_image, args=(prompt,), daemon=True).start()

    def _fetch_and_show_image(self, prompt):
        try:
            import random
            from urllib.parse import quote
            clean = prompt[:300]
            url  = f"https://image.pollinations.ai/prompt/{quote(clean)}?width=768&height=512&seed={random.randint(1, 99999)}&nologo=true&model=flux"
            resp = requests.get(url, timeout=120)
            resp.raise_for_status()

            pil_img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            ctk_img = ctk.CTkImage(light_image=pil_img, dark_image=pil_img, size=(500, 333))
            err = None
        except Exception as e:
            ctk_img, err = None, str(e)

        def show():
            self._remove_thinking_row()
            if ctk_img:
                self._image_refs.append(ctk_img)
                row = ctk.CTkFrame(self.msg_frame, fg_color="transparent")
                row.pack(fill="x", pady=10, padx=10)
                ctk.CTkLabel(row, text="✨", font=ctk.CTkFont(size=20), text_color=ACCENT).pack(side="left", anchor="nw", padx=(0,15))
                col = ctk.CTkFrame(row, fg_color="transparent")
                col.pack(side="left", fill="x", expand=True)
                ctk.CTkLabel(col, text=f"Imagine generată pentru: '{prompt}'", font=ctk.CTkFont(size=12), text_color=TEXT_DIM).pack(anchor="w", pady=(0, 5))
                img_lbl = ctk.CTkLabel(col, image=ctk_img, text="")
                img_lbl.pack(anchor="w")
            else:
                self._add_bot_row(f"❌ Eroare la generare: {err}")
            self._scroll_bottom()
        self.after(0, show)

    # ── Trimitere Mesaje & Integrare RAG UGAL ─────────────
    def _on_enter(self, e):
        if not (e.state & 0x1): 
            self._send()
            return "break"

    def _send(self, event=None):
        if self.is_thinking: return
        raw_text = self.input_txt.get("1.0", "end-1c").strip()
        if not raw_text and not self.attached_files: return

        file_context = ""
        file_names = []
        for path in self.attached_files:
            fname = os.path.basename(path)
            file_names.append(fname)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    file_context += f"\n\n--- Conținut fișier: {fname} ---\n{f.read(8000)}\n--- End {fname} ---"
            except Exception as e:
                file_context += f"\n\n[Eroare la citirea {fname}: {e}]"
                
        # --- Căutare în Baza de Date UGAL (RAG) ---
        db_context = ""
        if raw_text:
            try:
                db_context = self.rag.search(raw_text)
            except Exception as e:
                pass # Trecem peste dacă pică căutarea
        
        # Construim prompt-ul complet, ascuns de utilizator
        full_prompt = ""
        if db_context:
            full_prompt += f"[CONTEXT EXTRAS DIN BAZA DE DATE UGAL]:\n{db_context}\n\n"
            
        full_prompt += file_context
        if raw_text:
            full_prompt += f"[ÎNTREBAREA UTILIZATORULUI]:\n{raw_text}"
        
        display_text = raw_text
        if file_names: display_text += f"\n\n📎 Atașament: {', '.join(file_names)}"

        self.input_txt.delete("1.0", "end")
        for widget in self.chips_frame.winfo_children(): widget.destroy()
        self.attached_files.clear()
        
        self._add_user_row(display_text.strip())
        self.is_thinking = True
        self._add_thinking_row()
        self.send_btn.configure(text_color=TEXT_DIM)
        
        threading.Thread(target=self._call_api, args=(full_prompt, display_text.strip()), daemon=True).start()

    def _call_api(self, full_prompt, display_text):
        try:
            raw = self._client.send(full_prompt)
            reply = self._output_parser.parse(raw)
            err = None
        except Exception as e:
            reply, err = None, str(e)
            
            # Reset history on error
            history_for_llm = []
            for m in self.current_session.get("messages", []):
                history_for_llm.append({"role": m["role"], "text": m.get("full_prompt", m["text"])})
            self._client.reset(self._prompt_builder.format_history(history_for_llm))
            
        def update():
            self.is_thinking = False
            self._remove_thinking_row()
            if reply:
                self.current_session["messages"] += [
                    {"role": "user", "text": display_text, "full_prompt": full_prompt, "timestamp": datetime.now().isoformat()},
                    {"role": "model", "text": reply, "timestamp": datetime.now().isoformat()}
                ]
                if len(self.current_session["messages"]) == 2:
                    self.current_session["title"] = make_title(display_text)
                    self.title_lbl.configure(text=self.current_session["title"])
                save_session(self.current_session)
                self._load_session_list()
                self._add_bot_row(reply)
            else:
                self._add_bot_row(f"❌ Eroare API: {err}")
            self.input_txt.focus()
            
        self.after(0, update)

if __name__ == "__main__":
    app = ChatApp()
    app.mainloop()