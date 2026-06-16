"""
Backend client — acces direct la Supabase pentru toate tabelele InsideUGAL.
Când colegii adaugă date (anunțuri, facultăți, meniuri etc.), botul le preia automat.
Fallback pe backend API dacă Supabase nu e disponibil.
"""
import os
import re
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

BACKEND_URL  = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")
TIMEOUT      = 5


# ── Fetch din Supabase direct ────────────────────────────────────────────────

def _sb(table: str, order: str = "created_at.desc", limit: int = 10) -> list:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}?order={order}&limit={limit}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
            timeout=TIMEOUT,
        )
        if resp.status_code == 200:
            return resp.json() or []
    except Exception:
        pass
    return []


def _backend(path: str) -> list:
    """Fallback pe backend API dacă Supabase nu e disponibil."""
    try:
        resp = requests.get(f"{BACKEND_URL}{path}", timeout=TIMEOUT)
        if resp.status_code == 200:
            return resp.json() or []
    except Exception:
        pass
    return []


def _fetch(table: str, backend_path: str = None, order: str = "created_at.desc", limit: int = 10) -> list:
    """Încearcă Supabase direct, fallback pe backend API."""
    data = _sb(table, order=order, limit=limit)
    if not data and backend_path:
        data = _backend(backend_path)
    return data


# ── Detectare tip întrebare ──────────────────────────────────────────────────

_KEYWORDS = {
    "announcements": [
        "anunț", "anunturi", "anunțuri", "noutăți", "noutati", "stiri", "știri",
        "news", "anunt", "anuntat", "anunțat", "aviz", "comunicat", "vesti",
        "announcements", "announcement", "notices", "notice", "updates", "latest",
    ],
    "faculties": [
        "lista facultati", "lista facultăți", "toate facultatile", "toate facultățile",
        "ce facultati are ugal", "câte facultăți", "cate facultati",
        "contact facultate", "telefon facultate", "adresa facultate",
        "list of faculties", "all faculties", "faculty list",
    ],
    "locations": [
        "locație", "locatie", "locatii", "locații", "hartă", "harta", "campus",
        "clădire", "cladire", "sala", "sală", "corp", "adresă", "adresa",
        "unde se află", "unde este", "unde e", "unde gasesc",
        "location", "locations", "building", "room", "where is", "where are",
        "cămin", "camin", "cămine", "camine", "căminul", "caminul", "cazare",
        "dormitory", "dorm", "student housing",
        "sală de sport", "sala de sport", "sport", "fitness", "gym", "piscină", "piscina",
        "bibliotecă", "biblioteca", "library",
    ],
    "daily_menus": [
        "meniu", "meniuri", "cantina", "cantină", "mancare", "mâncare",
        "prânz", "pranz", "masa", "masă", "ce se mănâncă", "menu",
        "daily menu", "lunch", "food today", "what to eat",
    ],
    "complaints": [
        "sesizare", "sesizări", "sesizari", "reclamație", "reclamatie",
        "problemă", "problema", "raportez", "raportat", "plângere", "plangere",
        "complaint", "complaints", "report", "issue", "problem",
    ],
    "questions_history": [
        "intrebari", "întrebări", "istoric intrebari", "ce am intrebat",
        "întrebat", "intrebat", "history", "previous questions", "past questions",
    ],
    "menu_products": [
        "produse meniu", "ce produse are meniul", "meniu produse",
        "menu products", "what's in the menu",
    ],
    "llm_calls": [
        "tokeni", "tokens", "apeluri ai", "usage", "consum api", "statistici",
        "ai usage", "api calls", "statistics", "how many calls",
    ],
    "profiles": [
        "utilizatori", "studenti înregistrați", "conturi", "profil", "profiluri",
        "câți studenți", "users", "accounts", "profiles", "registered",
    ],
    "categories": [
        "categorie", "categorii", "category", "categories", "tip anunț", "tipuri anunțuri",
        "types of announcements", "what types",
    ],
    "products": [
        "produs", "produse", "ce produse", "articol", "articole",
        "product", "products", "items", "what products",
    ],
}


def _normalize(text: str) -> str:
    import unicodedata
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn").lower()


def detect_intent(question: str) -> list[str]:
    q = _normalize(question)
    return [ep for ep, kws in _KEYWORDS.items() if any(_normalize(kw) in q for kw in kws)]


# ── Formatare răspunsuri ─────────────────────────────────────────────────────

def _fmt_announcements(items: list) -> str:
    if not items:
        return ""
    lines = ["ANUNȚURI RECENTE (InsideUGAL):"]
    for a in items[:8]:
        title   = a.get("title") or a.get("titlu") or "Fără titlu"
        content = a.get("content") or a.get("continut") or ""
        date    = (a.get("created_at") or "")[:10]
        line    = f"- [{date}] **{title}**"
        if content:
            line += f": {content[:200]}"
        lines.append(line)
    return "\n".join(lines)


def _fmt_faculties(items: list) -> str:
    if not items:
        return ""
    lines = ["FACULTĂȚI UGAL (din baza de date InsideUGAL):"]
    for f in items:
        name    = f.get("name") or f.get("nume") or "Necunoscut"
        address = f.get("address") or f.get("adresa") or ""
        phone   = f.get("phone") or f.get("telefon") or ""
        website = f.get("website_url") or ""
        line    = f"- **{name}**"
        if address:
            line += f", {address}"
        if phone:
            line += f", tel: {phone}"
        if website:
            line += f" — {website}"
        lines.append(line)
    return "\n".join(lines)


def _fmt_locations(items: list) -> str:
    if not items:
        return ""
    lines = ["LOCAȚII UGAL (din baza de date InsideUGAL):"]
    for loc in items:
        name = loc.get("name") or loc.get("nume") or "Necunoscut"
        desc = loc.get("description") or loc.get("descriere") or ""
        line = f"- **{name}**"
        if desc:
            line += f": {desc[:120]}"
        lines.append(line)
    return "\n".join(lines)


def _fmt_menus(items: list) -> str:
    if not items:
        return ""
    lines = ["MENIURI CANTINĂ (din baza de date InsideUGAL):"]
    for m in items[:5]:
        day   = m.get("day_of_week") or m.get("data") or ""
        prods = m.get("products") or m.get("preparate") or []
        line  = f"- Ziua {day}: {', '.join(str(p) for p in prods[:5])}" if prods else f"- Ziua {day}"
        lines.append(line)
    return "\n".join(lines)


def _fmt_complaints(items: list) -> str:
    if not items:
        return ""
    lines = ["SESIZĂRI RECENTE (InsideUGAL):"]
    for c in items[:5]:
        title  = c.get("title") or c.get("titlu") or "Fără titlu"
        status = c.get("status") or ""
        date   = (c.get("created_at") or "")[:10]
        lines.append(f"- [{date}] {title} (status: {status})")
    return "\n".join(lines)


def _fmt_questions(items: list) -> str:
    if not items:
        return ""
    lines = ["ÎNTREBĂRI RECENTE PUSE ÎN INSIDEUGAL (modul PDF/Quiz):"]
    for q in items[:6]:
        question = q.get("question") or ""
        date     = (q.get("created_at") or "")[:10]
        lines.append(f"- [{date}] {question[:120]}")
    return "\n".join(lines)


def _fmt_llm_calls(items: list) -> str:
    if not items:
        return ""
    total_tokens = sum(i.get("total_tokens", 0) for i in items)
    cached = sum(1 for i in items if i.get("cached"))
    return (
        f"STATISTICI AI (InsideUGAL):\n"
        f"- Total apeluri: {len(items)}\n"
        f"- Din cache: {cached}\n"
        f"- Tokeni consumați: {total_tokens:,}"
    )


def _fmt_profiles(items: list) -> str:
    if not items:
        return ""
    return f"UTILIZATORI ÎNREGISTRAȚI ÎN INSIDEUGAL: {len(items)} conturi active."


def _fmt_categories(items: list) -> str:
    if not items:
        return ""
    names = [c.get("name", "") for c in items if c.get("name")]
    return f"CATEGORII ANUNȚURI (InsideUGAL):\n" + "\n".join(f"- {n}" for n in names)


def _fmt_menu_products(items: list) -> str:
    if not items:
        return ""
    return f"PRODUSE ÎN MENIURI: {len(items)} asocieri meniu-produs."


def _fmt_products(items: list) -> str:
    if not items:
        return ""
    lines = ["PRODUSE (InsideUGAL):"]
    for p in items[:10]:
        name  = p.get("name", "")
        desc  = p.get("description", "")
        price = p.get("price", "")
        line  = f"- **{name}**"
        if price:
            line += f" — {price} lei"
        if desc:
            line += f": {desc[:100]}"
        lines.append(line)
    return "\n".join(lines)


# ── Mapare tabele ────────────────────────────────────────────────────────────

_TABLE_MAP = {
    "announcements":    ("announcements",    "/announcements",       "created_at.desc", 10,  _fmt_announcements),
    "faculties":        ("faculties",        "/faculties",           "id.asc",          20,  _fmt_faculties),
    "locations":        ("locations",        "/locations",           "id.asc",          20,  _fmt_locations),
    "daily_menus":      ("daily_menus",      "/daily_menus",         "id.asc",          7,   _fmt_menus),
    "complaints":       ("complaints",       "/complaints",          "created_at.desc", 5,   _fmt_complaints),
    "questions_history":("questions_history",None,                   "created_at.desc", 6,   _fmt_questions),
    "llm_calls":        ("llm_calls",        None,                   "created_at.desc", 50,  _fmt_llm_calls),
    "profiles":         ("profiles",         "/profiles",            "id.asc",          100, _fmt_profiles),
    "categories":       ("categories",       "/categories",          "id.asc",          50,  _fmt_categories),
    "menu_products":    ("menu_products",    None,                   "menu_id.asc",     20,  _fmt_menu_products),
    "products":         ("products",         "/products",            "id.asc",          20,  _fmt_products),
}


# ── Deep link vizualizare ────────────────────────────────────────────────────

def fetch_entity_link(question: str) -> str:
    """Returnează /(public)/acasa/vizualizare?id=<id> pentru primul anunț sau facultate relevant."""
    intents = detect_intent(question)
    for intent in intents:
        if intent == "announcements":
            items = _fetch("announcements", "/announcements", "created_at.desc", 1)
            if items and items[0].get("id"):
                return f"/(public)/acasa/vizualizare?id={items[0]['id']}"
        elif intent == "faculties":
            items = _fetch("faculties", "/faculties", "id.asc", 1)
            if items and items[0].get("id"):
                return f"/(public)/acasa/vizualizare?id={items[0]['id']}"
    return ""


# ── Funcție principală ───────────────────────────────────────────────────────

def fetch_context(question: str) -> str:
    """
    Detectează intenția și aduce date live din Supabase / backend.
    Returnează context formatat pentru Gemini.
    """
    intents = detect_intent(question)
    if not intents:
        return ""

    parts = []
    for intent in intents:
        if intent not in _TABLE_MAP:
            continue
        table, backend_path, order, limit, fmt_fn = _TABLE_MAP[intent]
        data = _fetch(table, backend_path, order, limit)
        if data:
            text = fmt_fn(data)
            if text:
                parts.append(text)

    return "\n\n---\n\n".join(parts)
