import os
import sys
import json
import threading
from datetime import datetime, date

def install_if_missing(package, install_name=None):
    try:
        __import__(package)
    except ImportError:
        import subprocess
        name = install_name or package
        subprocess.check_call([sys.executable, "-m", "pip", "install", name, "-q"])

# Dependențele tale + python-dotenv pentru securizarea cheii API
install_if_missing("PIL", "pillow")
install_if_missing("requests", "requests")
install_if_missing("dotenv", "python-dotenv") # <--- Adăugat pentru securitate
install_if_missing("google.genai", "google-genai")

import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk, ImageDraw
from dotenv import load_dotenv # <--- Importăm librăria dotenv

# Încărcăm automat variabilele de mediu din fișierul .env
load_dotenv(override=True)

from llm_client import LLMClient
from prompt_builder import PromptBuilder
from output_parser import OutputParser

# ── Config ───────────────────────────────────────────────
# Folosim modelul oficial de la Google
MODEL = "openai/gpt-oss-120b:free"
HISTORY_DIR  = "histories"
AVATAR_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_avatar.png")

# ── Paleta ───────────────────────────────────────────────
BG            = "#0d0f14"
BG_SIDEBAR    = "#111318"
BG_HEADER     = "#111318"
BG_MSG        = "#0d0f14"
BG_INPUT_BAR  = "#111318"
BG_INPUT      = "#1e2130"
BG_USER       = "#1a237e"
BG_BUBBLE_BOT = "#161b27"
BG_ITEM_HOV   = "#1a1d28"
TEXT          = "#e8eaf6"
TEXT_DIM      = "#4a5280"
TEXT_TIME     = "#363c5a"
TEXT_SIDEBAR_H= "#cdd6f4"
ACCENT        = "#5b7cfa"
ACCENT2       = "#7c3aed"
DANGER        = "#f87171"
BORDER        = "#1e2235"
AVATAR_SIZE   = 34

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
        self.root.title("Asistent AI")
        self.root.geometry("860x680")
        self.root.minsize(600, 480)
        self.root.configure(bg=BG)

        self._prompt_builder = PromptBuilder()
        self._output_parser  = OutputParser()
        self._avatar_refs    = []
        self._message_rows   = []
        self.is_thinking     = False
        self.thinking_row    = None
        self.sidebar_visible = True
        self.current_session = None

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
        self.sidebar = tk.Frame(self.root, bg=BG_SIDEBAR, width=220)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_propagate(False)
        self.sidebar.grid_rowconfigure(2, weight=1)
        self.sidebar.grid_columnconfigure(0, weight=1)

        sid_hdr = tk.Frame(self.sidebar, bg=BG_SIDEBAR, pady=14)
        sid_hdr.grid(row=0, column=0, sticky="ew", padx=12)
        tk.Label(sid_hdr, text="Conversații", font=("Segoe UI", 11, "bold"),
                 fg=TEXT, bg=BG_SIDEBAR, anchor="w").pack(side="left")
        tk.Button(sid_hdr, text="+", font=("Segoe UI", 15, "bold"),
                  fg=ACCENT, bg=BG_SIDEBAR, activeforeground=TEXT,
                  activebackground=BG_ITEM_HOV, relief="flat",
                  cursor="hand2", bd=0, command=self._new_chat).pack(side="right")

        tk.Frame(self.sidebar, bg=BORDER, height=1).grid(row=1, column=0, sticky="ew")

        list_frame = tk.Frame(self.sidebar, bg=BG_SIDEBAR)
        list_frame.grid(row=2, column=0, sticky="nsew")
        list_frame.grid_rowconfigure(0, weight=1)
        list_frame.grid_columnconfigure(0, weight=1)

        self.sess_canvas = tk.Canvas(list_frame, bg=BG_SIDEBAR, highlightthickness=0, bd=0)
        sess_vsb = tk.Scrollbar(list_frame, orient="vertical",
                                command=self.sess_canvas.yview, width=0)
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
        sid_foot = tk.Frame(self.sidebar, bg=BG_SIDEBAR, pady=10)
        sid_foot.grid(row=4, column=0, sticky="ew", padx=12)
        tk.Label(sid_foot, text=f"🤖  {MODEL}", font=("Segoe UI", 9),
                 fg=TEXT_DIM, bg=BG_SIDEBAR).pack(anchor="w")

        # Main
        main = tk.Frame(self.root, bg=BG)
        main.grid(row=0, column=1, sticky="nsew")
        main.grid_rowconfigure(1, weight=1)
        main.grid_columnconfigure(0, weight=1)

        hdr = tk.Frame(main, bg=BG_HEADER)
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)

        tk.Button(hdr, text="☰", font=("Segoe UI", 13), fg=TEXT_DIM,
                  bg=BG_HEADER, activeforeground=TEXT,
                  activebackground=BG_HEADER, relief="flat",
                  cursor="hand2", bd=0,
                  command=self._toggle_sidebar).grid(row=0, column=0, padx=(14,6), pady=12)

        self.title_lbl = tk.Label(hdr, text="Conversație nouă",
                                   font=("Segoe UI", 12, "bold"), fg=TEXT,
                                   bg=BG_HEADER, anchor="w")
        self.title_lbl.grid(row=0, column=1, sticky="ew", padx=4)

        tk.Button(hdr, text="🗑", font=("Segoe UI", 12), fg=DANGER,
                  bg=BG_HEADER, activeforeground=DANGER,
                  activebackground=BG_HEADER, relief="flat",
                  cursor="hand2", bd=0,
                  command=self._delete_current).grid(row=0, column=2, padx=(0,14))

        tk.Frame(main, bg=BORDER, height=1).grid(row=0, column=0, sticky="sew", pady=(48,0))

        msg_outer = tk.Frame(main, bg=BG_MSG)
        msg_outer.grid(row=1, column=0, sticky="nsew")
        msg_outer.grid_rowconfigure(0, weight=1)
        msg_outer.grid_columnconfigure(0, weight=1)

        self.canvas = tk.Canvas(msg_outer, bg=BG_MSG, highlightthickness=0, bd=0)
        self._vsb = tk.Scrollbar(msg_outer, orient="vertical",
                                 command=self.canvas.yview, width=0)
        self.canvas.configure(yscrollcommand=self._vsb.set)
        self._vsb.grid(row=0, column=1, sticky="ns")
        self.canvas.grid(row=0, column=0, sticky="nsew")

        self.msg_frame = tk.Frame(self.canvas, bg=BG_MSG)
        self._cwin = self.canvas.create_window((0,0), window=self.msg_frame, anchor="nw")
        self.msg_frame.bind("<Configure>", self._on_frame_cfg)
        self.canvas.bind("<Configure>", self._on_canvas_resize)
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)

        tk.Frame(main, bg=BORDER, height=1).grid(row=2, column=0, sticky="ew")

        bar = tk.Frame(main, bg=BG_INPUT_BAR, pady=12)
        bar.grid(row=3, column=0, sticky="ew")
        bar.grid_columnconfigure(0, weight=1)

        self.input_txt = tk.Text(bar, font=("Segoe UI", 12), fg=TEXT,
                                 bg=BG_INPUT, insertbackground=ACCENT,
                                 relief="flat", bd=0,
                                 highlightthickness=1,
                                 highlightbackground=BORDER,
                                 highlightcolor=ACCENT,
                                 wrap="word", height=2, padx=12, pady=8)
        self.input_txt.grid(row=0, column=0, padx=(14,8), sticky="ew")
        self.input_txt.bind("<Return>", self._on_enter)
        self.input_txt.focus()

        self.send_btn = tk.Button(bar, text="↑", font=("Segoe UI", 16, "bold"),
                                  fg="white", bg=ACCENT,
                                  activeforeground="white", activebackground=ACCENT2,
                                  relief="flat", cursor="hand2", bd=0,
                                  width=3, command=self._send)
        self.send_btn.grid(row=0, column=1, padx=(0,14))

        tk.Label(bar, text="Enter → trimite  |  Shift+Enter → linie nouă",
                 font=("Segoe UI", 8), fg=TEXT_DIM,
                 bg=BG_INPUT_BAR).grid(row=1, column=0, columnspan=2,
                                       pady=(4,0), padx=14, sticky="w")

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
            tk.Label(self.sess_list, text="Nicio conversație salvată",
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
                     bg=BG_SIDEBAR, anchor="w").pack(fill="x", padx=12, pady=(10,2))
            for s in items:
                self._add_session_item(s)

    def _date_label(self, d):
        today = date.today()
        delta = (today - d).days
        if delta == 0: return "Azi"
        if delta == 1: return "Ieri"
        if delta < 7:  return f"Acum {delta} zile"
        return d.strftime("%d %b %Y")

    def _add_session_item(self, session):
        title = session.get("title", "Conversație nouă")
        msgs  = session.get("messages", [])
        sub   = f"{len(msgs)//2} mesaje" if msgs else "Gol"

        frame = tk.Frame(self.sess_list, bg=BG_SIDEBAR, cursor="hand2")
        frame.pack(fill="x", padx=6, pady=1)
        inner = tk.Frame(frame, bg=BG_SIDEBAR, padx=10, pady=7)
        inner.pack(fill="x")

        lbl1 = tk.Label(inner, text=title, font=("Segoe UI", 10),
                        fg=TEXT_SIDEBAR_H, bg=BG_SIDEBAR, anchor="w",
                        wraplength=160, justify="left")
        lbl1.pack(fill="x")
        lbl2 = tk.Label(inner, text=sub, font=("Segoe UI", 8),
                        fg=TEXT_DIM, bg=BG_SIDEBAR, anchor="w")
        lbl2.pack(fill="x")

        all_widgets = [frame, inner, lbl1, lbl2]

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

    def _show_welcome(self):
        frm = tk.Frame(self.msg_frame, bg=BG_MSG, pady=40)
        frm.pack(fill="x", padx=40)
        tk.Label(frm, text="✦", font=("Segoe UI", 30), fg=ACCENT, bg=BG_MSG).pack()
        tk.Label(frm, text="Bună! Cum te pot ajuta?",
                 font=("Segoe UI", 14, "bold"), fg=TEXT, bg=BG_MSG).pack(pady=(6,2))
        # Text modificat pentru Google GenAI
        tk.Label(frm, text=f"Asistentul rulează {MODEL} oficial",
                 font=("Segoe UI", 9), fg=TEXT_DIM, bg=BG_MSG).pack()

    # ── Mesaje ────────────────────────────────────────────
    def _add_user_row(self, text, ts):
        row = tk.Frame(self.msg_frame, bg=BG_MSG, pady=4)
        row.pack(fill="x", padx=16)
        col = tk.Frame(row, bg=BG_MSG)
        col.pack(side="right", anchor="e")
        bubble = tk.Frame(col, bg=BG_USER, padx=14, pady=9)
        bubble.pack(anchor="e")
        tk.Label(bubble, text=text, font=("Segoe UI", 11),
                 fg=TEXT, bg=BG_USER, wraplength=380,
                 justify="left", anchor="w").pack()
        tk.Label(col, text=ts, font=("Segoe UI", 8),
                 fg=TEXT_TIME, bg=BG_MSG).pack(anchor="e", pady=(2,0))
        self._message_rows.append((row, True, None))
        self._scroll_bottom()

    def _add_bot_row(self, text, ts):
        row = tk.Frame(self.msg_frame, bg=BG_MSG, pady=4)
        row.pack(fill="x", padx=16)

        left = tk.Frame(row, bg=BG_MSG)
        left.pack(side="left", anchor="nw", padx=(0,10), pady=4)
        if self.avatar_img:
            av = make_circle_image(AVATAR_PATH, AVATAR_SIZE)
            self._avatar_refs.append(av)
            tk.Label(left, image=av, bg=BG_MSG).pack()
        else:
            tk.Label(left, text="AI", font=("Segoe UI", 9, "bold"),
                     fg=ACCENT, bg=BG_MSG, width=3).pack()

        col = tk.Frame(row, bg=BG_MSG)
        col.pack(side="left", fill="x", expand=True)

        bubble = tk.Frame(col, bg=BG_BUBBLE_BOT, padx=14, pady=10)
        bubble.pack(fill="x", anchor="w")

        lbl = tk.Text(bubble, font=("Segoe UI", 11), fg=TEXT,
                      bg=BG_BUBBLE_BOT, relief="flat", bd=0,
                      highlightthickness=0, wrap="word",
                      cursor="xterm", padx=0, pady=0)
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

        tk.Label(col, text=ts, font=("Segoe UI", 8),
                 fg=TEXT_TIME, bg=BG_MSG).pack(anchor="w", pady=(2,0))
        self._message_rows.append((row, False, lbl))
        self._scroll_bottom()

    def _add_thinking_row(self):
        self.thinking_row = tk.Frame(self.msg_frame, bg=BG_MSG, pady=4)
        self.thinking_row.pack(fill="x", padx=16)
        left = tk.Frame(self.thinking_row, bg=BG_MSG)
        left.pack(side="left", anchor="nw", padx=(0,10), pady=4)
        if self.avatar_img:
            av = make_circle_image(AVATAR_PATH, AVATAR_SIZE)
            self._avatar_refs.append(av)
            tk.Label(left, image=av, bg=BG_MSG).pack()
        self.dot_lbl = tk.Label(self.thinking_row, text="●  ○  ○",
                                font=("Segoe UI", 13), fg=ACCENT, bg=BG_MSG)
        self.dot_lbl.pack(side="left", anchor="w", padx=4)
        self._scroll_bottom()
        self._animate_dots()

    def _animate_dots(self, step=0):
        if not self.thinking_row: return
        dots = ["●  ○  ○", "○  ●  ○", "○  ○  ●"]
        try:
            self.dot_lbl.configure(text=dots[step % 3])
            self.root.after(350, lambda: self._animate_dots(step+1))
        except: pass

    def _remove_thinking_row(self):
        if self.thinking_row:
            self.thinking_row.destroy()
            self.thinking_row = None

    # ── Send ─────────────────────────────────────────────
    def _on_enter(self, e):
        if not (e.state & 0x1):  # Shift nu e apăsat
            self._send()
            return "break"

    def _send(self):
        if self.is_thinking: return
        text = self.input_txt.get("1.0", "end-1c").strip()
        if not text: return
        self.input_txt.delete("1.0", "end")
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
            self.send_btn.configure(state="disabled", bg=TEXT_DIM)
        else:
            self._remove_thinking_row()
            self.send_btn.configure(state="normal", bg=ACCENT)
            self.input_txt.focus()


if __name__ == "__main__":
    root = tk.Tk()
    ChatApp(root)
    root.mainloop()