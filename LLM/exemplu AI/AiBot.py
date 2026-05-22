import os
import sys
import json
import threading
from datetime import datetime

def install_if_missing(package, install_name=None):
    try:
        __import__(package)
    except ImportError:
        import subprocess
        name = install_name or package
        subprocess.check_call(["uv", "pip", "install", name, "-q"])

install_if_missing("dotenv", "python-dotenv")
install_if_missing("google.generativeai", "google-generativeai")
install_if_missing("PIL", "pillow")

from dotenv import load_dotenv
import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk, ImageDraw

from llm_client import LLMClient
from prompt_builder import PromptBuilder
from output_parser import OutputParser

# ── Config ───────────────────────────────────────────────
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ Nu am găsit GEMINI_API_KEY în .env")
    sys.exit(1)

genai.configure(api_key=api_key)
MODEL        = "gemini-2.5-flash"
HISTORY_FILE = "chat_history.json"
AVATAR_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_avatar.png")
GENERATION_CONFIG = {"temperature": 0.9, "max_output_tokens": 2048}

# ── Culori ───────────────────────────────────────────────
BG           = "#111318"
BG_HEADER    = "#1c1f2b"
BG_INPUT_BAR = "#1c1f2b"
BG_INPUT     = "#2a2d3e"
BG_USER      = "#1e2a50"
TEXT         = "#e8eaf6"
TEXT_DIM     = "#6b7194"
TEXT_TIME    = "#4a5070"
ACCENT       = "#5b7cfa"
ACCENT_H     = "#7a96ff"
DANGER       = "#d95f6e"
AVATAR_SIZE  = 32

# ── Istoric ──────────────────────────────────────────────
def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_history(history):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

# ── Avatar ───────────────────────────────────────────────
def make_circle_image(path, size):
    img  = Image.open(path).convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    out  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, mask=mask)
    return ImageTk.PhotoImage(out)

# ── Bula rotunjită (Canvas) ──────────────────────────────
class RoundedBubble(tk.Canvas):
    def __init__(self, parent, text, bg, bubble_color, fg, font,
                 radius=14, padx=12, pady=8, max_width=None, **kw):
        super().__init__(parent, bg=bg, highlightthickness=0, bd=0, **kw)
        self._text      = text;  self._bc  = bubble_color
        self._fg        = fg;    self._fnt = font
        self._r         = radius; self._px = padx; self._py = pady
        self._max_width = max_width   # None = fill mode, int = auto-size mode
        self.bind("<Configure>", self._draw)

    def _draw(self, _=None):
        if self._max_width:
            # Mod auto: calculăm lățimea necesară fără a ocupa fill
            import tkinter.font as tkfont
            f  = tkfont.Font(font=self._fnt)
            # wrap la max_width - paddings
            wrap = self._max_width - self._px * 2
            # măsurăm textul la wrap dat
            tmp_c = tk.Canvas(self); tmp_c.update_idletasks()
            tmp = self.create_text(0, 0, text=self._text, font=self._fnt,
                                   anchor="nw", width=wrap)
            bb = self.bbox(tmp); self.delete(tmp)
            tw = (bb[2] - bb[0]) if bb else 60
            th = (bb[3] - bb[1]) if bb else 16
            # lățimea bulei = min(text single-line, max_width)
            single = f.measure(self._text)
            bw = min(single + self._px * 2, self._max_width)
            # dacă textul wrappează, folosim max_width
            if tw >= wrap - 2:
                bw = self._max_width
            bw = max(bw, 60)
            h  = th + self._py * 2
            self.configure(width=bw, height=h)
            w = bw
        else:
            w = self.winfo_width()
            if w < 4: return
            wrap = max(60, w - self._px * 2)
            tmp  = self.create_text(self._px, self._py, text=self._text,
                                    font=self._fnt, fill=self._fg,
                                    anchor="nw", width=wrap)
            bb = self.bbox(tmp); self.delete(tmp)
            th = (bb[3] - bb[1]) if bb else 16
            h  = th + self._py * 2
            self.configure(height=h)
            w = self.winfo_width()

        self.delete("all")
        wrap = max(60, w - self._px * 2)
        r = self._r; x2, y2 = w, h
        self.create_polygon(
            r,0, x2-r,0, x2,0, x2,r,
            x2,y2-r, x2,y2, x2-r,y2, r,y2,
            0,y2, 0,y2-r, 0,r, 0,0,
            smooth=True, fill=self._bc, outline=self._bc)
        self.create_text(self._px, self._py, text=self._text,
                         font=self._fnt, fill=self._fg, anchor="nw", width=wrap)

    def configure(self, **kw):
        kw.pop("wraplength", None)
        super().configure(**kw)

# ── Widget Entry rotunjit ────────────────────────────────
class RoundedEntry(tk.Canvas):
    """Entry cu fundal rotunjit desenat pe Canvas."""
    def __init__(self, parent, textvariable, bg_outer, bg_inner,
                 fg, font, insert_color, radius=10, padx=10, pady=6, **kw):
        super().__init__(parent, bg=bg_outer, highlightthickness=0, bd=0, **kw)
        self._r  = radius; self._px = padx; self._py = pady
        self._bg = bg_inner; self._bg_outer = bg_outer
        self._h  = None
        self.bind("<Configure>", self._draw)

        self._var   = textvariable
        self._entry = tk.Entry(
            self, textvariable=textvariable,
            font=font, fg=fg, bg=bg_inner,
            insertbackground=insert_color,
            relief="flat", bd=0, highlightthickness=0,
        )

    def _draw(self, _=None):
        w = self.winfo_width()
        h = self.winfo_height()
        if w < 4 or h < 4: return
        self.delete("bg_rect")
        r = self._r
        self.create_polygon(
            r,0, w-r,0, w,0, w,r,
            w,h-r, w,h, w-r,h, r,h,
            0,h, 0,h-r, 0,r, 0,0,
            smooth=True, fill=self._bg, outline=self._bg, tags="bg_rect")
        self.tag_lower("bg_rect")
        self._entry.place(x=self._px, y=self._py,
                          width=w - self._px*2,
                          height=h - self._py*2)

    def bind_entry(self, sequence, func):
        self._entry.bind(sequence, func)

    def focus(self):
        self._entry.focus()

# ── Buton rotunjit ───────────────────────────────────────
class RoundedButton(tk.Canvas):
    def __init__(self, parent, text, bg_outer, color, hover,
                 fg, font, command, radius=10, padx=14, pady=6, **kw):
        super().__init__(parent, bg=bg_outer, highlightthickness=0, bd=0, **kw)
        self._color = color; self._hover = hover
        self._fg = fg; self._fnt = font
        self._text = text; self._r = radius
        self._cmd  = command; self._px = padx; self._py = pady
        self.bind("<Configure>", self._draw)
        self.bind("<Enter>",     lambda e: self._set_color(hover))
        self.bind("<Leave>",     lambda e: self._set_color(color))
        self.bind("<Button-1>",  lambda e: command())
        self.configure(cursor="hand2")

    def _draw(self, _=None):
        w = self.winfo_width(); h = self.winfo_height()
        if w < 4 or h < 4: return
        self.delete("all")
        r = self._r
        self.create_polygon(
            r,0, w-r,0, w,0, w,r,
            w,h-r, w,h, w-r,h, r,h,
            0,h, 0,h-r, 0,r, 0,0,
            smooth=True, fill=self._color, outline=self._color, tags="bg")
        self.create_text(w//2, h//2, text=self._text,
                         font=self._fnt, fill=self._fg, tags="txt")

    def _set_color(self, c):
        self._color = c
        self.itemconfig("bg", fill=c, outline=c)

    def set_state(self, enabled: bool, dim_color):
        if enabled:
            self._set_color(self._hover)
            self._color = ACCENT
            self._set_color(ACCENT)
            self.bind("<Button-1>", lambda e: self._cmd())
            self.configure(cursor="hand2")
        else:
            self._set_color(dim_color)
            self.unbind("<Button-1>")
            self.configure(cursor="")


# ════════════════════════════════════════════════════════
class ChatApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Asistent AI")
        self.root.geometry("500x700")
        self.root.minsize(360, 500)
        self.root.configure(bg=BG)

        self._prompt_builder = PromptBuilder()
        self._output_parser  = OutputParser()
        self._client = LLMClient(
            api_key=api_key,
            model_name=MODEL,
            system_instruction=self._prompt_builder.build(),
            generation_config=GENERATION_CONFIG,
        )
        self.saved_history = load_history()
        self._client.reset(self._prompt_builder.format_history(self.saved_history))
        self.is_thinking   = False
        self.thinking_row  = None
        self._avatar_refs  = []
        self._message_rows = []   # (row, is_user, lbl)

        self.avatar_img = make_circle_image(AVATAR_PATH, AVATAR_SIZE) \
            if os.path.exists(AVATAR_PATH) else None

        self._build_ui()
        self.root.bind("<Configure>", self._on_win_resize)

    # ── UI ───────────────────────────────────────────────
    def _build_ui(self):
        # Header
        hdr = tk.Frame(self.root, bg=BG_HEADER, pady=10)
        hdr.pack(fill="x", side="top")

        if self.avatar_img:
            tk.Label(hdr, image=self.avatar_img, bg=BG_HEADER).pack(side="left", padx=(12,6))

        tk.Label(hdr, text="Asistent AI",
                 font=("Segoe UI", 13, "bold"), fg=TEXT, bg=BG_HEADER).pack(side="left")

        # Buton coș + text
        clear_frame = tk.Frame(hdr, bg=BG_HEADER)
        clear_frame.pack(side="right", padx=14)
        tk.Button(
            clear_frame, text="🗑  Șterge memoria",
            font=("Segoe UI", 9), fg=DANGER, bg=BG_HEADER,
            activeforeground=DANGER, activebackground=BG_HEADER,
            relief="flat", cursor="hand2", bd=0,
            command=self._clear_memory
        ).pack()

        tk.Frame(self.root, bg="#2a2d3e", height=1).pack(fill="x", side="top")

        # ── Input bar (bottom) ──
        tk.Frame(self.root, bg="#2a2d3e", height=1).pack(fill="x", side="bottom")

        bar = tk.Frame(self.root, bg=BG_INPUT_BAR, pady=10)
        bar.pack(fill="x", side="bottom")

        self.input_var = tk.StringVar()

        # Entry rotunjit - inaltime fixa 38px
        self.rounded_entry = RoundedEntry(
            bar, textvariable=self.input_var,
            bg_outer=BG_INPUT_BAR, bg_inner=BG_INPUT,
            fg=TEXT, font=("Segoe UI", 12),
            insert_color=ACCENT, radius=10, padx=12, pady=6,
            height=38,
        )
        self.rounded_entry.pack(side="left", fill="x", expand=True, padx=(12, 8))
        self.rounded_entry.bind_entry("<Return>", lambda e: self._send())
        self.rounded_entry.focus()

        # Buton trimite rotunjit - 38x38px
        self.send_btn = RoundedButton(
            bar, text="➤",
            bg_outer=BG_INPUT_BAR, color=ACCENT, hover=ACCENT_H,
            fg="white", font=("Segoe UI", 12, "bold"),
            command=self._send, radius=10, padx=0, pady=0,
            width=44, height=38,
        )
        self.send_btn.pack(side="right", padx=(0, 12))

        # ── Zona mesaje (fără scrollbar vizibil) ──
        msg_cont = tk.Frame(self.root, bg=BG)
        msg_cont.pack(fill="both", expand=True, side="top")

        self.canvas = tk.Canvas(msg_cont, bg=BG, highlightthickness=0, bd=0)
        # scrollbar ascuns (funcțional, dar invizibil)
        self._vsb = tk.Scrollbar(msg_cont, orient="vertical",
                                 command=self.canvas.yview, width=0)
        self.canvas.configure(yscrollcommand=self._vsb.set)
        self._vsb.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)

        self.msg_frame = tk.Frame(self.canvas, bg=BG)
        self._cwin = self.canvas.create_window((0, 0), window=self.msg_frame, anchor="nw")

        self.msg_frame.bind("<Configure>", self._on_frame_cfg)
        self.canvas.bind("<Configure>", self._on_canvas_resize)
        self.canvas.bind_all("<MouseWheel>", lambda e: self.canvas.yview_scroll(
            int(-1 * (e.delta / 120)), "units"))

    # ── Frame/canvas configure ───────────────────────────
    def _on_frame_cfg(self, e=None):
        self.root.update_idletasks()
        ch = self.canvas.winfo_height()
        fh = self.msg_frame.winfo_reqheight()
        # dacă conținut < canvas, punem tot în jos (nu lăsăm spațiu sus)
        if fh <= ch:
            self.canvas.configure(scrollregion=(0, 0,
                                                self.canvas.winfo_width(), ch))
        else:
            self.canvas.configure(scrollregion=(0, 0,
                                                self.canvas.winfo_width(), fh))

    def _on_canvas_resize(self, e):
        self.canvas.itemconfig(self._cwin, width=e.width)
        self._reflow(e.width)
        self._on_frame_cfg(None)

    def _on_win_resize(self, e):
        if e.widget is self.root:
            self.root.after(50, self._reflow_now)

    def _reflow_now(self):
        w = self.canvas.winfo_width()
        if w > 1: self._reflow(w)

    def _reflow(self, cw):
        av = AVATAR_SIZE + 18
        for (_, is_user, lbl) in self._message_rows:
            if isinstance(lbl, RoundedBubble):
                lbl._draw()
            elif isinstance(lbl, tk.Text):
                pass   # tk.Text se rewrap-ează singur la fill="x"
            else:
                wrap = max(100, cw - av - 32)
                lbl.configure(wraplength=wrap)

    # ── Rânduri mesaje ───────────────────────────────────
    def _add_user_row(self, text, ts):
        row = tk.Frame(self.msg_frame, bg=BG, pady=4)
        row.pack(fill="x", padx=8)

        # Bula aliniată dreapta, lățime auto după conținut
        col = tk.Frame(row, bg=BG)
        col.pack(side="right", anchor="e")

        MAX_BUBBLE = 340   # lățime maximă bula user
        lbl = RoundedBubble(col, text=text, bg=BG, bubble_color=BG_USER,
                            fg=TEXT, font=("Segoe UI", 11), radius=14,
                            padx=12, pady=8, max_width=MAX_BUBBLE)
        lbl.pack(anchor="e")
        tk.Label(col, text=ts, font=("Segoe UI", 8), fg=TEXT_TIME,
                 bg=BG, anchor="e").pack(anchor="e")

        self._message_rows.append((row, True, lbl))
        self._scroll_bottom()

    def _add_bot_row(self, text, ts):
        row = tk.Frame(self.msg_frame, bg=BG, pady=4)
        row.pack(fill="x", padx=8)

        if self.avatar_img:
            av = make_circle_image(AVATAR_PATH, AVATAR_SIZE)
            self._avatar_refs.append(av)
            tk.Label(row, image=av, bg=BG).pack(side="left", anchor="n", padx=(0,8), pady=4)
        else:
            tk.Frame(row, bg=BG, width=AVATAR_SIZE+8).pack(side="left")

        col = tk.Frame(row, bg=BG)
        col.pack(side="left", fill="x", expand=True)

        # tk.Text readonly — permite selectare și copiere cu Ctrl+C
        lbl = tk.Text(
            col,
            font=("Segoe UI", 11), fg=TEXT, bg=BG,
            relief="flat", bd=0, highlightthickness=0,
            wrap="word", cursor="xterm",
            padx=0, pady=2,
            spacing1=0, spacing3=0,
        )
        lbl.insert("1.0", text)
        lbl.configure(state="disabled")   # readonly dar selectabil
        lbl.pack(fill="x", expand=True)

        # Înălțime automată după conținut real (cu wrap)
        def _fit_text(widget=lbl, event=None):
            widget.update_idletasks()
            # count display lines (inclusiv wrap)
            try:
                dlines = int(widget.count("1.0", "end", "displaylines")[0])
                widget.configure(height=max(1, dlines))
            except Exception:
                lines = int(widget.index("end-1c").split(".")[0])
                widget.configure(height=max(1, lines))
            # forțăm recalcularea scroll-ului
            widget.after(10, lambda: self._on_frame_cfg())
        lbl.bind("<Configure>", _fit_text)
        # apelăm și după ce e randat prima dată
        lbl.after(50, _fit_text)

        tk.Label(col, text=ts, font=("Segoe UI", 8), fg=TEXT_TIME,
                 bg=BG, anchor="w").pack(anchor="w")

        self._message_rows.append((row, False, lbl))
        self._scroll_bottom()

    def _add_thinking_row(self):
        self.thinking_row = tk.Frame(self.msg_frame, bg=BG, pady=4)
        self.thinking_row.pack(fill="x", padx=8)
        if self.avatar_img:
            av = make_circle_image(AVATAR_PATH, AVATAR_SIZE)
            self._avatar_refs.append(av)
            tk.Label(self.thinking_row, image=av, bg=BG).pack(
                side="left", anchor="n", padx=(0,8), pady=4)
        tk.Label(self.thinking_row, text="● ● ●",
                 font=("Segoe UI", 13), fg=TEXT_DIM, bg=BG).pack(side="left", anchor="w")
        self._scroll_bottom()

    def _remove_thinking_row(self):
        if self.thinking_row:
            self.thinking_row.destroy()
            self.thinking_row = None

    def _scroll_bottom(self):
        self.root.update_idletasks()
        self._on_frame_cfg()
        self.canvas.yview_moveto(1.0)

    # ── Send / API ───────────────────────────────────────
    def _send(self):
        if self.is_thinking: return
        text = self.input_var.get().strip()
        if not text: return
        self.input_var.set("")
        self._add_user_row(text, datetime.now().strftime("%H:%M"))
        self._set_thinking(True)
        threading.Thread(target=self._call_api, args=(text,), daemon=True).start()

    def _call_api(self, text):
        try:
            raw   = self._client.send(text)
            reply = self._output_parser.parse(raw)
            err   = None
        except Exception as e:
            reply = None; err = str(e)
            self._client.reset(self._prompt_builder.format_history(self.saved_history))

        def update():
            self._set_thinking(False)
            if reply:
                self.saved_history += [
                    {"role": "user",  "text": text,  "timestamp": datetime.now().isoformat()},
                    {"role": "model", "text": reply, "timestamp": datetime.now().isoformat()},
                ]
                save_history(self.saved_history)
                self._add_bot_row(reply, datetime.now().strftime("%H:%M"))
            else:
                self._add_bot_row(f"❌ {err}", "")
        self.root.after(0, update)

    # ── Clear ────────────────────────────────────────────
    def _clear_memory(self):
        if not messagebox.askyesno("Confirmare", "Ștergi toată memoria?"): return
        if os.path.exists(HISTORY_FILE): os.remove(HISTORY_FILE)
        self.saved_history = []
        self._client.reset([])
        for w in self.msg_frame.winfo_children(): w.destroy()
        self._message_rows.clear(); self._avatar_refs.clear()

    # ── Thinking ─────────────────────────────────────────
    def _set_thinking(self, on):
        self.is_thinking = on
        if on:
            self._add_thinking_row()
            self.send_btn.set_state(False, "#3a4a80")
        else:
            self._remove_thinking_row()
            self.send_btn.set_state(True, ACCENT)
            self.rounded_entry.focus()


# ── Main ─────────────────────────────────────────────────
if __name__ == "__main__":
    root = tk.Tk()
    ChatApp(root)
    root.mainloop()