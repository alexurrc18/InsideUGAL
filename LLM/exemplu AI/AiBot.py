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
class ChatApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Gemini-style AI")
        self.root.geometry("1000x750")
        self.root.minsize(700, 500)
        self.root.configure(bg=BG)

        self._prompt_builder  = PromptBuilder()
        self._output_parser   = OutputParser()
        self._avatar_refs     = []
        self._image_refs      = []   # referinte imagini generate (anti-GC)
        self._message_rows    = []
        self.is_thinking      = False
        self.thinking_row     = None
        self.sidebar_visible  = True
        self.current_session  = None
        self.placeholder_text = "Întreabă AI..."
        self._plus_menu       = None

        self._client = LLMClient(model_name=MODEL,
                                 system_instruction=self._prompt_builder.build())

        self.avatar_img = make_circle_image(AVATAR_PATH, AVATAR_SIZE) \
            if os.path.exists(AVATAR_PATH) else None

        self._build_ui()
        self._load_session_list()
        self._new_chat(silent=True)

    # ── UI ───────────────────────────────────────────────
    def _build_ui(self):
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_columnconfigure(1, weight=1)

        # Sidebar
        self.sidebar = tk.Frame(self.root, bg=BG_SIDEBAR, width=260)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_propagate(False)
        self.sidebar.grid_rowconfigure(2, weight=1)
        self.sidebar.grid_columnconfigure(0, weight=1)

        sid_hdr = tk.Frame(self.sidebar, bg=BG_SIDEBAR, pady=18)
        sid_hdr.grid(row=0, column=0, sticky="ew", padx=16)
        tk.Label(sid_hdr, text="Conversații", font=("Segoe UI", 12, "bold"),
                 fg=TEXT, bg=BG_SIDEBAR, anchor="w").pack(side="left")

        new_chat_btn = tk.Button(sid_hdr, text="＋", font=("Segoe UI", 16, "bold"),
                  fg=ACCENT, bg=BG_SIDEBAR, activeforeground=ACCENT2,
                  activebackground=BG_SIDEBAR, relief="flat",
                  cursor="hand2", bd=0, command=self._new_chat)
        new_chat_btn.pack(side="right")

        tk.Frame(self.sidebar, bg=BORDER, height=1).grid(row=1, column=0, sticky="ew")

        list_frame = tk.Frame(self.sidebar, bg=BG_SIDEBAR)
        list_frame.grid(row=2, column=0, sticky="nsew")
        list_frame.grid_rowconfigure(0, weight=1)
        list_frame.grid_columnconfigure(0, weight=1)

        self.sess_canvas = tk.Canvas(list_frame, bg=BG_SIDEBAR, highlightthickness=0, bd=0)
        sess_vsb = tk.Scrollbar(list_frame, orient="vertical",
                                command=self.sess_canvas.yview, width=0,
                                bg=BG_SIDEBAR, troughcolor=BG_SIDEBAR,
                                borderwidth=0, highlightthickness=0)
        self.sess_canvas.configure(yscrollcommand=sess_vsb.set)
        sess_vsb.grid(row=0, column=1, sticky="ns")
        self.sess_canvas.grid(row=0, column=0, sticky="nsew")

        self.sess_list = tk.Frame(self.sess_canvas, bg=BG_SIDEBAR)
        self._sess_cwin = self.sess_canvas.create_window((0,0), window=self.sess_list, anchor="nw")
        self.sess_list.bind("<Configure>", lambda e: self.sess_canvas.configure(
            scrollregion=self.sess_canvas.bbox("all")))
        self.sess_canvas.bind("<Configure>", lambda e: self.sess_canvas.itemconfig(
            self._sess_cwin, width=e.width))

        tk.Frame(self.sidebar, bg=BORDER, height=1).grid(row=3, column=0, sticky="ew")
        sid_foot = tk.Frame(self.sidebar, bg=BG_SIDEBAR, pady=14)
        sid_foot.grid(row=4, column=0, sticky="ew", padx=16)
        tk.Label(sid_foot, text=f"✨ {MODEL}", font=("Segoe UI", 9),
                 fg=TEXT_DIM, bg=BG_SIDEBAR).pack(anchor="w")

        # Main Chat Area
        main = tk.Frame(self.root, bg=BG)
        main.grid(row=0, column=1, sticky="nsew")
        main.grid_rowconfigure(1, weight=1)
        main.grid_columnconfigure(0, weight=1)

        hdr = tk.Frame(main, bg=BG_HEADER)
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)

        tk.Button(hdr, text="☰", font=("Segoe UI", 16), fg=TEXT_DIM,
                  bg=BG_HEADER, activeforeground=TEXT,
                  activebackground=BG_HEADER, relief="flat",
                  cursor="hand2", bd=0,
                  command=self._toggle_sidebar).grid(row=0, column=0, padx=(18,10), pady=16)

        self.title_lbl = tk.Label(hdr, text="Conversație nouă",
                                   font=("Segoe UI", 13, "bold"), fg=TEXT,
                                   bg=BG_HEADER, anchor="w")
        self.title_lbl.grid(row=0, column=1, sticky="ew", padx=4)

        tk.Button(hdr, text="🗑", font=("Segoe UI", 14), fg=DANGER,
                  bg=BG_HEADER, activeforeground=DANGER,
                  activebackground=BG_HEADER, relief="flat",
                  cursor="hand2", bd=0,
                  command=self._delete_current).grid(row=0, column=2, padx=(0,18))

        msg_outer = tk.Frame(main, bg=BG_MSG)
        msg_outer.grid(row=1, column=0, sticky="nsew")
        msg_outer.grid_rowconfigure(0, weight=1)
        msg_outer.grid_columnconfigure(0, weight=1)

        self.canvas = tk.Canvas(msg_outer, bg=BG_MSG, highlightthickness=0, bd=0)
        self._vsb = tk.Scrollbar(msg_outer, orient="vertical",
                                 command=self.canvas.yview, width=0,
                                 bg=BG, troughcolor=BG,
                                 borderwidth=0, highlightthickness=0)
        self.canvas.configure(yscrollcommand=self._vsb.set)
        self._vsb.grid(row=0, column=1, sticky="ns")
        self.canvas.grid(row=0, column=0, sticky="nsew")

        self.msg_frame = tk.Frame(self.canvas, bg=BG_MSG)
        self._cwin = self.canvas.create_window((0,0), window=self.msg_frame, anchor="nw")
        self.msg_frame.bind("<Configure>", self._on_frame_cfg)
        self.canvas.bind("<Configure>", self._on_canvas_resize)
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)

        # ── Zona de Input ──
        bar_container = tk.Frame(main, bg=BG, pady=15, padx=45)
        bar_container.grid(row=3, column=0, sticky="ew")
        bar_container.grid_columnconfigure(0, weight=1)

        bar = tk.Frame(bar_container, bg=BG_INPUT, bd=0)
        bar.grid(row=0, column=0, sticky="ew")
        bar.grid_columnconfigure(1, weight=1)

        # Buton Plus cu meniu
        self.plus_btn = tk.Label(bar, text="＋", font=("Segoe UI", 18),
                                  fg=TEXT_DIM, bg=BG_INPUT, cursor="hand2")
        self.plus_btn.grid(row=0, column=0, padx=(15, 5), pady=12, sticky="sw")
        self.plus_btn.bind("<Button-1>", self._toggle_plus_menu)

        self.input_txt = tk.Text(bar, font=("Segoe UI", 12), fg=TEXT,
                                 bg=BG_INPUT, insertbackground=TEXT,
                                 relief="flat", bd=0, highlightthickness=0,
                                 wrap="word", height=1, pady=14)
        self.input_txt.grid(row=0, column=1, sticky="ew", padx=5)
        self.input_txt.bind("<Return>", self._on_enter)
        self.input_txt.bind("<KeyRelease>", self._auto_resize_input)
        self.input_txt.bind("<FocusIn>", self._remove_placeholder)
        self.input_txt.bind("<FocusOut>", self._add_placeholder)

        self.send_btn = tk.Label(bar, text="➤", font=("Segoe UI", 15),
                                  fg=TEXT_DIM, bg=BG_INPUT, cursor="hand2")
        self.send_btn.grid(row=0, column=2, padx=(5, 15), pady=12, sticky="se")
        self.send_btn.bind("<Button-1>", self._send)

        self._add_placeholder()

        tk.Label(bar_container, text="Modelele AI pot oferi informații inexacte. Verifică răspunsurile.",
                 font=("Segoe UI", 8), fg=TEXT_DIM, bg=BG).grid(row=1, column=0, pady=(8,0))

    # ── Plus Menu ────────────────────────────────────────
    def _toggle_plus_menu(self, event=None):
        if self._plus_menu is not None:
            try:
                if self._plus_menu.winfo_exists():
                    self._plus_menu.destroy()
                    self._plus_menu = None
                    return
            except:
                pass

        menu = tk.Frame(self.root, bg=BG_SIDEBAR,
                        highlightthickness=1, highlightbackground=BORDER)
        self._plus_menu = menu

        def make_item(icon, label, cmd):
            row = tk.Frame(menu, bg=BG_SIDEBAR, cursor="hand2")
            row.pack(fill="x")
            inner = tk.Frame(row, bg=BG_SIDEBAR, padx=14, pady=11)
            inner.pack(fill="x")
            lbl_icon = tk.Label(inner, text=icon, font=("Segoe UI", 13),
                                fg=TEXT, bg=BG_SIDEBAR)
            lbl_icon.pack(side="left", padx=(0, 10))
            lbl_text = tk.Label(inner, text=label, font=("Segoe UI", 11),
                                fg=TEXT, bg=BG_SIDEBAR, anchor="w")
            lbl_text.pack(side="left")
            all_w = [row, inner, lbl_icon, lbl_text]

            def on_enter(e):
                for w in all_w: w.configure(bg=BG_ITEM_HOV)
            def on_leave(e):
                for w in all_w: w.configure(bg=BG_SIDEBAR)
            def on_click(e):
                self._close_plus_menu()
                cmd()

            for w in all_w:
                w.bind("<Enter>", on_enter)
                w.bind("<Leave>", on_leave)
                w.bind("<Button-1>", on_click)

        make_item("📂", "Deschide fișier", self._open_file)
        tk.Frame(menu, bg=BORDER, height=1).pack(fill="x")
        make_item("🖼", "Creează imagine", self._create_image)

        self.root.update_idletasks()
        btn_x = self.plus_btn.winfo_rootx() - self.root.winfo_rootx()
        btn_y = self.plus_btn.winfo_rooty() - self.root.winfo_rooty()
        menu.place(x=btn_x, y=btn_y - 100, width=210)
        menu.lift()

        self.root.bind("<Button-1>", self._on_root_click_close_menu, add="+")

    def _on_root_click_close_menu(self, event):
        if self._plus_menu is None:
            return
        try:
            if not self._plus_menu.winfo_exists():
                self._plus_menu = None
                return
            wx = self._plus_menu.winfo_rootx()
            wy = self._plus_menu.winfo_rooty()
            ww = self._plus_menu.winfo_width()
            wh = self._plus_menu.winfo_height()
            if not (wx <= event.x_root <= wx + ww and wy <= event.y_root <= wy + wh):
                self._close_plus_menu()
        except:
            self._plus_menu = None

    def _close_plus_menu(self):
        if self._plus_menu is not None:
            try:
                self._plus_menu.destroy()
            except:
                pass
            self._plus_menu = None
        try:
            self.root.unbind("<Button-1>")
        except:
            pass

    # ── Deschide fișier ──────────────────────────────────
    def _open_file(self):
        from tkinter import filedialog
        path = filedialog.askopenfilename(
            title="Deschide fișier",
            filetypes=[
                ("Toate fișierele", "*.*"),
                ("Text", "*.txt *.md *.py *.json *.csv"),
                ("Imagini", "*.png *.jpg *.jpeg *.webp *.gif"),
                ("Documente", "*.pdf *.docx *.doc"),
            ]
        )
        if not path:
            return
        filename = os.path.basename(path)
        ext = os.path.splitext(filename)[1].lower()
        text_exts = {".txt", ".md", ".py", ".json", ".csv", ".html", ".js", ".ts", ".css"}
        if ext in text_exts:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read(4000)
                self._remove_placeholder()
                self.input_txt.delete("1.0", "end")
                self.input_txt.insert("1.0",
                    f"Am deschis fișierul '{filename}':\n\n{content}\n\nCe vrei să faci cu el?")
                self.input_txt.configure(fg=TEXT)
                self.send_btn.configure(fg=TEXT)
                self._auto_resize_input()
                self.input_txt.focus()
            except Exception as e:
                messagebox.showerror("Eroare", f"Nu am putut citi fișierul:\n{e}")
        else:
            self._remove_placeholder()
            self.input_txt.delete("1.0", "end")
            self.input_txt.insert("1.0", f"[Fișier atașat: {filename}] ")
            self.input_txt.configure(fg=TEXT)
            self.send_btn.configure(fg=TEXT)
            self._auto_resize_input()
            self.input_txt.focus()

    # ── Creează imagine cu Pollinations.AI ───────────────
    def _create_image(self):
        win = tk.Toplevel(self.root)
        win.title("Creează imagine")
        win.configure(bg=BG)
        win.geometry("480x220")
        win.resizable(False, False)
        win.grab_set()

        self.root.update_idletasks()
        rx = self.root.winfo_x() + (self.root.winfo_width() - 480) // 2
        ry = self.root.winfo_y() + (self.root.winfo_height() - 220) // 2
        win.geometry(f"480x220+{rx}+{ry}")

        tk.Label(win, text="🖼  Generează imagine cu AI",
                 font=("Segoe UI", 12, "bold"), fg=ACCENT2, bg=BG).pack(anchor="w", padx=20, pady=(16, 2))
        tk.Label(win, text="Descrie imaginea în engleză pentru rezultate mai bune:",
                 font=("Segoe UI", 10), fg=TEXT_DIM, bg=BG).pack(anchor="w", padx=20, pady=(0, 6))

        entry = tk.Text(win, font=("Segoe UI", 11), fg=TEXT, bg=BG_INPUT,
                        insertbackground=TEXT, relief="flat", bd=0,
                        highlightthickness=1, highlightbackground=BORDER,
                        height=3, wrap="word", pady=8, padx=10)
        entry.pack(fill="x", padx=20)
        entry.focus()

        status_lbl = tk.Label(win, text="", font=("Segoe UI", 9),
                              fg=ACCENT, bg=BG)
        status_lbl.pack(pady=(4, 0))

        def do_generate():
            prompt = entry.get("1.0", "end-1c").strip()
            if not prompt:
                return
            win.destroy()
            # Afișăm mesajul utilizatorului în chat
            ts = datetime.now().strftime("%H:%M")
            self._add_user_row(f"🖼 Generează imagine: {prompt}", ts)
            # Afișăm indicator de loading
            self._set_thinking(True)
            # Generăm în thread separat
            threading.Thread(target=self._fetch_and_show_image,
                             args=(prompt,), daemon=True).start()

        btn_frame = tk.Frame(win, bg=BG)
        btn_frame.pack(pady=10)

        gen_btn = tk.Button(btn_frame, text="✨  Generează", font=("Segoe UI", 11),
                  fg=ACCENT, bg=BG_SIDEBAR, activeforeground=ACCENT2,
                  activebackground=BG_ITEM_HOV, relief="flat",
                  cursor="hand2", padx=20, pady=6, command=do_generate)
        gen_btn.pack(side="left", padx=6)

        tk.Button(btn_frame, text="Anulează", font=("Segoe UI", 11),
                  fg=TEXT_DIM, bg=BG_SIDEBAR, activeforeground=TEXT,
                  activebackground=BG_ITEM_HOV, relief="flat",
                  cursor="hand2", padx=20, pady=6,
                  command=win.destroy).pack(side="left", padx=6)

        entry.bind("<Return>", lambda e: (do_generate(), "break")[1])

    def _fetch_and_show_image(self, prompt):
        """Genereaza imaginea cu Pollinations.AI (FLUX) si o afiseaza in chat."""
        try:
            import random
            clean = prompt
            for ro, en in [("a\u0306","a"),("a\u0302","a"),("i\u0302","i"),("s\u0327","s"),("t\u0327","t"),
                           ("\u0103","a"),("\u00e2","a"),("\u00ee","i"),("\u015f","s"),("\u0163","t"),
                           ("\u0102","A"),("\u00c2","A"),("\u00ce","I"),("\u015e","S"),("\u0162","T")]:
                clean = clean.replace(ro, en)
            # fallback simplu
            ro_map = {"ă":"a","â":"a","î":"i","ș":"s","ț":"t","Ă":"A","Â":"A","Î":"I","Ș":"S","Ț":"T"}
            for k,v in ro_map.items():
                clean = clean.replace(k, v)
            clean = clean[:300]

            from urllib.parse import quote
            seed = random.randint(1, 99999)
            url  = f"https://image.pollinations.ai/prompt/{quote(clean)}?width=768&height=512&seed={seed}&nologo=true&model=flux"

            resp = None
            for attempt in range(4):
                try:
                    resp = requests.get(url, timeout=120)
                    if resp.status_code in (402, 429, 503):
                        import time; time.sleep(6)
                        continue
                    resp.raise_for_status()
                    break
                except requests.exceptions.Timeout:
                    if attempt == 3:
                        raise Exception("Timeout dupa 4 incercari. Mai incearca.")
                    continue

            img_data = io.BytesIO(resp.content)
            pil_img  = Image.open(img_data).convert("RGB")

            # Redimensionăm pentru chat (max 600px lățime)
            max_w = 600
            w, h  = pil_img.size
            if w > max_w:
                pil_img = pil_img.resize((max_w, int(h * max_w / w)), Image.LANCZOS)

            tk_img = ImageTk.PhotoImage(pil_img)
            err    = None
        except Exception as e:
            tk_img = None
            err    = str(e)

        def show():
            self._set_thinking(False)
            ts = datetime.now().strftime("%H:%M")
            if tk_img:
                self._add_image_row(tk_img, prompt, ts)
            else:
                self._add_bot_row(f"❌ Nu am putut genera imaginea: {err}", ts)

        self.root.after(0, show)

    def _add_image_row(self, tk_img, prompt, ts):
        """Afișează imaginea generată în chat, în stil bot."""
        row = tk.Frame(self.msg_frame, bg=BG_MSG, pady=10)
        row.pack(fill="x", padx=40)

        left = tk.Frame(row, bg=BG_MSG)
        left.pack(side="left", anchor="nw", padx=(0, 14))
        if self.avatar_img:
            av = make_circle_image(AVATAR_PATH, AVATAR_SIZE)
            self._avatar_refs.append(av)
            tk.Label(left, image=av, bg=BG_MSG).pack()
        else:
            tk.Label(left, text="✨", font=("Segoe UI", 16), fg=ACCENT, bg=BG_MSG).pack()

        col = tk.Frame(row, bg=BG_MSG)
        col.pack(side="left", fill="x", expand=True)

        # Label mic deasupra imaginii
        tk.Label(col, text=f"Imagine generată pentru: \"{prompt}\"",
                 font=("Segoe UI", 9), fg=TEXT_DIM, bg=BG_MSG,
                 anchor="w").pack(anchor="w", pady=(0, 6))

        # Imaginea în sine
        img_lbl = tk.Label(col, image=tk_img, bg=BG_MSG, cursor="hand2")
        img_lbl.pack(anchor="w")

        # Buton Salvează
        def save_img():
            from tkinter import filedialog
            path = filedialog.asksaveasfilename(
                defaultextension=".png",
                filetypes=[("PNG", "*.png"), ("JPEG", "*.jpg")],
                initialfile=f"imagine_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            )
            if path:
                # Salvăm imaginea originală (nu thumbnail)
                try:
                    img_lbl.image_pil.save(path)
                    messagebox.showinfo("Salvat", f"Imaginea a fost salvată:\n{path}")
                except Exception as e:
                    messagebox.showerror("Eroare", str(e))

        tk.Button(col, text="💾  Salvează imaginea", font=("Segoe UI", 9),
                  fg=TEXT_DIM, bg=BG_SIDEBAR, activeforeground=TEXT,
                  activebackground=BG_ITEM_HOV, relief="flat",
                  cursor="hand2", padx=10, pady=4,
                  command=save_img).pack(anchor="w", pady=(8, 0))

        # Salvăm referința (anti garbage-collector)
        img_lbl.image    = tk_img
        self._image_refs.append(tk_img)

        self._message_rows.append((row, False, None))
        self._scroll_bottom()

    # ── Logica Placeholder-ului ───────────────────────────
    def _remove_placeholder(self, event=None):
        if self.input_txt.get("1.0", "end-1c") == self.placeholder_text:
            self.input_txt.delete("1.0", "end")
            self.input_txt.configure(fg=TEXT)

    def _add_placeholder(self, event=None):
        if not self.input_txt.get("1.0", "end-1c").strip():
            self.input_txt.delete("1.0", "end")
            self.input_txt.insert("1.0", self.placeholder_text)
            self.input_txt.configure(fg=TEXT_DIM)
            self.send_btn.configure(fg=TEXT_DIM)

    def _auto_resize_input(self, event=None):
        text = self.input_txt.get("1.0", "end-1c")
        if text.strip() and text != self.placeholder_text:
            self.send_btn.configure(fg=TEXT)
        else:
            self.send_btn.configure(fg=TEXT_DIM)
        lines = int(self.input_txt.index('end-1c').split('.')[0])
        new_height = min(max(1, lines), 6)
        if int(self.input_txt.cget("height")) != new_height:
            self.input_txt.configure(height=new_height)
            self.input_txt.yview_moveto(1.0)

    # ── Scroll ───────────────────────────────────────────
    def _on_mousewheel(self, e):
        self.canvas.yview_scroll(int(-1*(e.delta/120)), "units")

    def _on_frame_cfg(self, e=None):
        self.root.update_idletasks()
        ch = self.canvas.winfo_height()
        fh = self.msg_frame.winfo_reqheight()
        self.canvas.configure(scrollregion=(0,0,self.canvas.winfo_width(), max(ch,fh)))

    def _on_canvas_resize(self, e):
        self.canvas.itemconfig(self._cwin, width=e.width)
        self._on_frame_cfg()

    def _scroll_bottom(self):
        self.root.update_idletasks()
        self._on_frame_cfg()
        self.canvas.yview_moveto(1.0)

    def _toggle_sidebar(self):
        if self.sidebar_visible:
            self.sidebar.grid_remove()
            self.sidebar_visible = False
        else:
            self.sidebar.grid()
            self.sidebar_visible = True

    # ── Session list ──────────────────────────────────────
    def _load_session_list(self):
        for w in self.sess_list.winfo_children():
            w.destroy()
        sessions = list_sessions()
        if not sessions:
            tk.Label(self.sess_list, text="Nicio conversație recentă",
                     font=("Segoe UI", 9), fg=TEXT_DIM, bg=BG_SIDEBAR,
                     wraplength=180).pack(pady=20, padx=12)
            return

        groups = {}
        for s in sessions:
            try:
                d = datetime.fromisoformat(s["created"]).date()
            except:
                d = date.today()
            lbl = self._date_label(d)
            groups.setdefault(lbl, []).append(s)

        for grp, items in groups.items():
            tk.Label(self.sess_list, text=grp,
                     font=("Segoe UI", 8, "bold"), fg=TEXT_DIM,
                     bg=BG_SIDEBAR, anchor="w").pack(fill="x", padx=16, pady=(14,4))
            for s in items:
                self._add_session_item(s)

    def _date_label(self, d):
        today = date.today()
        delta = (today - d).days
        if delta == 0: return "Astăzi"
        if delta == 1: return "Ieri"
        if delta < 7:  return "Ultimele 7 zile"
        return d.strftime("%d %b %Y")

    def _add_session_item(self, session):
        title = session.get("title", "Conversație nouă")
        frame = tk.Frame(self.sess_list, bg=BG_SIDEBAR, cursor="hand2")
        frame.pack(fill="x", padx=8, pady=2)
        inner = tk.Frame(frame, bg=BG_SIDEBAR, padx=12, pady=10)
        inner.pack(fill="x")
        lbl1 = tk.Label(inner, text=title, font=("Segoe UI", 10),
                        fg=TEXT_SIDEBAR_H, bg=BG_SIDEBAR, anchor="w",
                        wraplength=190, justify="left")
        lbl1.pack(fill="x")
        all_widgets = [frame, inner, lbl1]

        def on_enter(e):
            for w in all_widgets: w.configure(bg=BG_ITEM_HOV)
        def on_leave(e):
            for w in all_widgets: w.configure(bg=BG_SIDEBAR)
        def on_click(e, s=session):
            self._open_session(s)

        for w in all_widgets:
            w.bind("<Enter>", on_enter)
            w.bind("<Leave>", on_leave)
            w.bind("<Button-1>", on_click)

    # ── Chat ─────────────────────────────────────────────
    def _new_chat(self, silent=False):
        self.current_session = {
            "id": new_session_id(),
            "title": "Conversație nouă",
            "messages": [],
            "created": datetime.now().isoformat()
        }
        self._client.reset([])
        self._clear_messages()
        self.title_lbl.configure(text="Conversație nouă")
        self._show_welcome()
        if not silent:
            self._load_session_list()

    def _open_session(self, session):
        self.current_session = session
        self._client.reset(self._prompt_builder.format_history(session["messages"]))
        self._clear_messages()
        self.title_lbl.configure(text=session.get("title","Conversație"))
        for msg in session["messages"]:
            ts = ""
            try:
                ts = datetime.fromisoformat(msg.get("timestamp","")).strftime("%H:%M")
            except: pass
            if msg["role"] == "user":
                self._add_user_row(msg["text"], ts)
            else:
                self._add_bot_row(msg["text"], ts)

    def _delete_current(self):
        if not self.current_session: return
        if not messagebox.askyesno("Șterge", "Ștergi această conversație?"): return
        path = get_history_path(self.current_session["id"])
        if os.path.exists(path): os.remove(path)
        self._new_chat()
        self._load_session_list()

    def _clear_messages(self):
        for w in self.msg_frame.winfo_children(): w.destroy()
        self._message_rows.clear()
        self._avatar_refs.clear()
        self._image_refs.clear()

    def _show_welcome(self):
        frm = tk.Frame(self.msg_frame, bg=BG_MSG, pady=60)
        frm.pack(fill="x", padx=40)
        tk.Label(frm, text="✨", font=("Segoe UI", 36), fg=ACCENT2, bg=BG_MSG).pack()
        tk.Label(frm, text="Salut, cu ce te pot ajuta astăzi?",
                 font=("Segoe UI", 18, "bold"), fg=TEXT, bg=BG_MSG).pack(pady=(10,4))
        tk.Label(frm, text="Integrare nativă cu ecosistemul AI",
                 font=("Segoe UI", 11), fg=TEXT_DIM, bg=BG_MSG).pack()

    # ── Mesaje ────────────────────────────────────────────
    def _add_user_row(self, text, ts):
        row = tk.Frame(self.msg_frame, bg=BG_MSG, pady=10)
        row.pack(fill="x", padx=40)
        col = tk.Frame(row, bg=BG_MSG)
        col.pack(side="right", anchor="e")
        bubble = tk.Frame(col, bg=BG_USER, padx=18, pady=12)
        bubble.pack(anchor="e")
        tk.Label(bubble, text=text, font=("Segoe UI", 11),
                 fg=TEXT, bg=BG_USER, wraplength=450,
                 justify="left", anchor="w").pack()
        self._message_rows.append((row, True, None))
        self._scroll_bottom()

    def _add_bot_row(self, text, ts):
        row = tk.Frame(self.msg_frame, bg=BG_MSG, pady=10)
        row.pack(fill="x", padx=40)

        left = tk.Frame(row, bg=BG_MSG)
        left.pack(side="left", anchor="nw", padx=(0,14))
        if self.avatar_img:
            av = make_circle_image(AVATAR_PATH, AVATAR_SIZE)
            self._avatar_refs.append(av)
            tk.Label(left, image=av, bg=BG_MSG).pack()
        else:
            tk.Label(left, text="✨", font=("Segoe UI", 16), fg=ACCENT, bg=BG_MSG).pack()

        col = tk.Frame(row, bg=BG_MSG)
        col.pack(side="left", fill="x", expand=True)

        bubble = tk.Frame(col, bg=BG_BUBBLE_BOT, padx=0, pady=2)
        bubble.pack(fill="x", anchor="w")

        lbl = tk.Text(bubble, font=("Segoe UI", 11), fg=TEXT,
                      bg=BG_BUBBLE_BOT, relief="flat", bd=0,
                      highlightthickness=0, wrap="word",
                      cursor="arrow", padx=0, pady=0)
        lbl.insert("1.0", text)
        lbl.configure(state="disabled")
        lbl.pack(fill="x", expand=True)

        def _fit(event=None):
            lbl.update_idletasks()
            try:
                dlines = int(lbl.count("1.0","end","displaylines")[0])
                lbl.configure(height=max(1, dlines))
            except:
                lines = int(lbl.index("end-1c").split(".")[0])
                lbl.configure(height=max(1, lines))
            lbl.after(10, self._on_frame_cfg)

        lbl.bind("<Configure>", _fit)
        lbl.after(50, _fit)

        self._message_rows.append((row, False, lbl))
        self._scroll_bottom()

    def _add_thinking_row(self):
        self.thinking_row = tk.Frame(self.msg_frame, bg=BG_MSG, pady=10)
        self.thinking_row.pack(fill="x", padx=40)
        left = tk.Frame(self.thinking_row, bg=BG_MSG)
        left.pack(side="left", anchor="nw", padx=(0,14))

        if self.avatar_img:
            av = make_circle_image(AVATAR_PATH, AVATAR_SIZE)
            self._avatar_refs.append(av)
            tk.Label(left, image=av, bg=BG_MSG).pack()
        else:
            tk.Label(left, text="✨", font=("Segoe UI", 16), fg=ACCENT, bg=BG_MSG).pack()

        self.dot_lbl = tk.Label(self.thinking_row, text="Se generează...",
                                font=("Segoe UI", 11, "italic"), fg=ACCENT, bg=BG_MSG)
        self.dot_lbl.pack(side="left", anchor="w", pady=6)
        self._scroll_bottom()
        self._animate_dots()

    def _animate_dots(self, step=0):
        if not self.thinking_row: return
        dots = ["Se generează.", "Se generează..", "Se generează..."]
        try:
            self.dot_lbl.configure(text=dots[step % 3])
            self.root.after(400, lambda: self._animate_dots(step+1))
        except: pass

    def _remove_thinking_row(self):
        if self.thinking_row:
            self.thinking_row.destroy()
            self.thinking_row = None

    # ── Send ─────────────────────────────────────────────
    def _on_enter(self, e):
        if not (e.state & 0x1):
            self._send()
            return "break"

    def _send(self, event=None):
        if self.is_thinking: return
        text = self.input_txt.get("1.0", "end-1c").strip()
        if not text or text == self.placeholder_text: return

        self.input_txt.delete("1.0", "end")
        self.input_txt.configure(height=1)
        self.send_btn.configure(fg=TEXT_DIM)

        self._add_user_row(text, datetime.now().strftime("%H:%M"))
        self._set_thinking(True)
        threading.Thread(target=self._call_api, args=(text,), daemon=True).start()

    def _call_api(self, text):
        try:
            raw   = self._client.send(text)
            reply = self._output_parser.parse(raw)
            err   = None
        except Exception as e:
            reply = None
            err   = str(e)
            self._client.reset(
                self._prompt_builder.format_history(
                    self.current_session.get("messages", [])))

        def update():
            self._set_thinking(False)
            ts = datetime.now().strftime("%H:%M")
            if reply:
                self.current_session["messages"] += [
                    {"role": "user",  "text": text,  "timestamp": datetime.now().isoformat()},
                    {"role": "model", "text": reply, "timestamp": datetime.now().isoformat()},
                ]
                if len(self.current_session["messages"]) == 2:
                    self.current_session["title"] = make_title(text)
                    self.title_lbl.configure(text=self.current_session["title"])
                save_session(self.current_session)
                self._load_session_list()
                self._add_bot_row(reply, ts)
            else:
                self._add_bot_row(f"❌ {err}", ts)
        self.root.after(0, update)

    def _set_thinking(self, on):
        self.is_thinking = on
        if on:
            self._add_thinking_row()
            self.send_btn.configure(fg=BG_INPUT)
        else:
            self._remove_thinking_row()
            self._add_placeholder()
            self.input_txt.focus()


if __name__ == "__main__":
    root = tk.Tk()
    ChatApp(root)
    root.mainloop()