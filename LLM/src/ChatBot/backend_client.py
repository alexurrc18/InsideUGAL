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

def _sb(table: str, order: str = "created_at.desc", limit: int = 10, select: str = "*") -> list:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}?select={select}&order={order}&limit={limit}",
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


def _fetch(table: str, backend_path: str = None, order: str = "created_at.desc", limit: int = 10, select: str = "*") -> list:
    """Încearcă Supabase direct, fallback pe backend API."""
    data = _sb(table, order=order, limit=limit, select=select)
    if not data and backend_path:
        data = _backend(backend_path)
    return data


def _fetch_menus(limit: int = 7) -> list:
    """Fetch meniuri cu produse via join (menu_products -> products)."""
    return _sb(
        "daily_menus",
        order="id.asc",
        limit=limit,
        select="id,day_of_week,menu_products(product_id,products(name,price))",
    )


# ── Detectare tip întrebare ──────────────────────────────────────────────────

_KEYWORDS = {
    "announcements": [
        # română
        "anunt", "anunturi", "anuntat", "noutati", "noutate", "stire", "stiri",
        "veste", "vesti", "aviz", "comunicat", "afisaj", "afisare", "postare",
        "eveniment", "evenimente", "activitate", "activitati", "program", "programare",
        "workshop", "conferinta", "seminar", "concurs", "competitie", "hackathon",
        "bursa", "burse", "erasmus", "mobilitate", "practica", "stagiu", "stagii",
        "admitere", "inscriere", "inscrieri", "termen", "deadline", "rezultate",
        "sesiune", "examene", "examen", "colocviu", "restanta", "marire",
        "festiv", "deschidere", "absolvire", "diplomare", "ceremonie",
        "nou", "noi", "recent", "recente", "ultimele", "cele mai noi",
        # engleză
        "announcement", "news", "notice", "update", "event", "activity",
        "scholarship", "internship", "competition", "latest", "recent",
    ],
    "faculties": [
        # română
        "facultate", "facultati", "facultatii", "facultatea",
        "inginerie", "medicina", "farmacie", "litere", "sport", "educatie fizica",
        "arhitectura navala", "automatica", "calculatoare", "electronica", "electrica",
        "secretariat", "decan", "prodecan", "rector", "prorector",
        "telefon", "contact", "adresa", "email", "site", "website",
        "specializare", "specializari", "program de studiu", "programe de studiu",
        "licenta", "master", "doctorat", "postuniversitar",
        "acreditare", "clasificare", "ranking", "ugal",
        # engleză
        "faculty", "faculties", "department", "dean", "rector",
        "specialization", "study program", "bachelor", "master", "phd",
    ],
    "locations": [
        # română
        "unde", "locatie", "locatii", "harta", "campus",
        "cladire", "corp", "sala", "laborator", "amfiteatru", "aula",
        "camin", "camine", "cazare", "dormitor", "camera",
        "cantina", "bufet", "restaurant", "cafeteria",
        "biblioteca", "sala de lectura", "sala de studiu",
        "sala de sport", "bazin", "piscina", "teren sport", "palestra",
        "parcare", "intrare", "acces", "poarta",
        "str.", "strada", "bulevardul", "domneasca", "stiintei", "garii",
        # engleză
        "location", "building", "room", "lab", "dorm", "dormitory",
        "library", "pool", "gym", "canteen", "parking", "where is", "where are",
    ],
    "daily_menus": [
        # română
        "cantina", "meniu", "meniuri", "mancare", "masa", "pranz", "cina", "mic dejun",
        "luni", "marti", "miercuri", "joi", "vineri", "sambata", "duminica",
        "azi", "astazi", "maine", "saptamana",
        "fel", "feluri", "preparat", "preparate", "garnitura",
        "ciorba", "supa", "friptura", "salata", "desert", "clatite", "papanasi",
        "ce se mananca", "ce e la", "ce ofera", "ce servesc",
        # engleză
        "menu", "lunch", "dinner", "breakfast", "food", "meal", "today",
        "monday", "tuesday", "wednesday", "thursday", "friday",
        "what to eat", "canteen", "cafeteria food",
    ],
    "products": [
        # română
        "produs", "produse", "preparat", "preparate",
        "costa", "pret", "preturi", "cat costa", "cat platesc", "cat e",
        "ieftin", "scump", "disponibil", "disponibile",
        "ciorba", "supa", "friptura", "snitel", "ceafa", "piure", "cartofi",
        "salata", "desert", "clatite", "papanasi", "dulceata",
        # engleză
        "product", "price", "cost", "how much", "cheap", "expensive",
        "soup", "steak", "salad", "dessert",
    ],
    "complaints": [
        # română
        "sesizare", "sesizari", "reclamatie", "reclamatii",
        "problema", "probleme", "defect", "defectiune", "stricat", "stricata",
        "raportat", "raporta", "raportez", "depus", "depune",
        "status", "stare", "rezolvat", "solutionat", "in lucru", "in asteptare",
        "wi-fi", "wifi", "internet", "retea", "apa", "caldura", "curent",
        "geam", "fereastra", "usa", "priza", "lumina", "lift", "elevator",
        "toaleta", "baie", "duș", "dus",
        # engleză
        "complaint", "complaints", "issue", "problem", "broken", "report",
        "status", "resolved", "pending", "wifi", "water", "heating",
    ],
    "categories": [
        "categorie", "categorii", "tipuri", "tip de anunt", "clasificare",
        "category", "categories", "type", "types",
    ],
    "profiles": [
        "studenti", "utilizatori", "conturi", "profil", "profiluri", "inregistrati",
        "cati studenti", "nr studenti", "users", "accounts", "profiles", "students",
    ],
    "llm_calls": [
        "tokeni", "tokens", "apeluri", "consum", "statistici", "usage", "api calls",
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


_DAYS_RO = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"]


def _fmt_menus(items: list) -> str:
    if not items:
        return ""
    lines = ["MENIURI CANTINĂ (din baza de date InsideUGAL):"]
    for m in items[:7]:
        day_raw = m.get("day_of_week") or m.get("data") or ""
        try:
            day_name = _DAYS_RO[int(day_raw) - 1]
        except (ValueError, IndexError, TypeError):
            day_name = str(day_raw) if day_raw else "Necunoscut"
        # Supabase join: menu_products -> products
        menu_prods = m.get("menu_products") or []
        prods = [mp["products"] for mp in menu_prods if mp.get("products")]
        if prods:
            names = [f"{p.get('name', '')} ({p.get('price', '')} lei)" for p in prods[:6]]
            line = f"- {day_name}: {', '.join(names)}"
        else:
            line = f"- {day_name}: meniu nedisponibil"
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
    "daily_menus":      ("daily_menus",      "/daily-menus",         "id.asc",          7,   _fmt_menus),
    "cafeteria_menus":  ("cafeteria_menus",  "/cafeteria_menus",     "id.asc",          7,   _fmt_menus),
    "facilities":       ("facilities",       "/facilities",          "id.asc",          20,  _fmt_locations),
    "product_categories":("product_categories", "/product_categories", "id.asc",        20,  _fmt_categories),
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


# ── Tabele aduse mereu, indiferent de întrebare ─────────────────────────────

_ALWAYS_FETCH = ["announcements", "faculties", "locations", "daily_menus", "complaints"]

# Dacă nu e detectat niciun keyword, aducem și restul (catch-all)
_FALLBACK_TABLES = ["products", "categories"]


def fetch_context_combined(question: str) -> tuple[str, str]:
    """
    Combină keywords + always-fetch:
    - _ALWAYS_FETCH: mereu prezente în context
    - tabele detectate prin keywords: adăugate în plus
    - niciun keyword detectat: aduce și _FALLBACK_TABLES (catch-all)
    Returnează (full_context, focused_context).
    """
    intents = detect_intent(question)
    to_fetch = list(dict.fromkeys(
        _ALWAYS_FETCH
        + [i for i in intents if i not in _ALWAYS_FETCH]
        + (_FALLBACK_TABLES if not intents else [])
    ))

    all_parts: list[str] = []
    focused_parts: list[str] = []
    sep = "\n\n---\n\n"

    for key in to_fetch:
        if key not in _TABLE_MAP:
            continue
        table, backend_path, order, limit, fmt_fn = _TABLE_MAP[key]
        data = _fetch_menus() if key == "daily_menus" else _fetch(table, backend_path, order, limit)
        if data:
            text = fmt_fn(data)
            if text:
                all_parts.append(text)
                if key in intents:
                    focused_parts.append(text)

    return sep.join(all_parts), sep.join(focused_parts)
