import re
import time
import warnings
import requests
import urllib3
import fitz  # PyMuPDF
from bs4 import BeautifulSoup

# ugal.ro și admitere.ugal.ro au certificat SSL nerecunoscut pe Mac —
# dezactivăm verificarea doar pentru scraping intern, nu pentru prod
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL  = "https://aciee.ugal.ro"
UGAL_URL  = "https://www.ugal.ro"
ADM_URL   = "https://www.admitere.ugal.ro"

# Toate paginile relevante de pe site FACIEE
PAGES = [
    "/",
    "/prezentare",
    "/prezentare/misiune",
    "/prezentare/scurt-istoric",
    "/structura/conducere",
    "/structura/secretariat",
    "/structura/departamente",
    "/structura/comisii",
    "/educatie/licenta-4-ani",
    "/educatie/masterat-2-ani",
    "/admitere",
    "/admitere/licenta",
    "/admitere/masterat",
    "/studenti/burse",
    "/studenti/taxe",
    "/studenti/orare-licenta",
    "/studenti/orare-masterat",
    "/studenti/programarea-examenelor",
    "/studenti/regulamente",
    "/studenti/ghidul-studentului",
    "/studenti/finalizare-studii",
    "/studenti/ore-consultanta-si-tutorat",
    "/studenti/practica",
    "/studenti/erasmus",
    "/studenti/hackathon",
    "/studenti/transport-studenti",
    "/studenti/tabere-studentesti",
    "/cercetare/centre-de-cercetare",
    "/cercetare/proiecte-si-granturi",
    "/calitate/regulamente",
    "/calitate/rapoarte",
    "/informatii/admitere",
    "/informatii/anunturi",
    "/informatii/evenimente",
    "/informatii/locuri-de-munca",
    "/informatii/interes-general/baza-materiala",
    "/informatii/interes-general/parteneri",
    "/contact",
    "/alumni",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; FACIEEBot/1.0)"
}

VERIFY_SSL = {
    "https://aciee.ugal.ro": True,
    "https://www.ugal.ro": False,
    "https://www.admitere.ugal.ro": False,
}

def _clean_html(soup: BeautifulSoup, source_url: str) -> str:
    # Elimină elemente irelevante
    for tag in soup(["script", "style", "nav", "header", "footer",
                     "iframe", "noscript", "form", "button"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = [ln.strip() for ln in text.splitlines()
             if ln.strip() and len(ln.strip()) > 15]
    clean = "\n".join(lines)

    if len(clean) < 80:
        return ""
    return f"[Sursa: {source_url}]\n{clean}"


def _parse_pdf(content: bytes, source_url: str) -> str:
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text())
        text = "\n".join(pages_text).strip()
        if len(text) < 50:
            return ""
        return f"[PDF: {source_url}]\n{text}"
    except Exception:
        return ""


def _chunk_text(text: str, max_chars: int = 1200, overlap: int = 200) -> list[str]:
    """Împarte text în bucăți cu overlap — contextul nu se mai taie la mijloc."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    buf = []
    buf_len = 0

    for para in paragraphs:
        if buf_len + len(para) > max_chars and buf:
            chunks.append("\n\n".join(buf))
            # Overlap: păstrează ultimele paragrafe pentru continuitate
            overlap_buf = []
            overlap_len = 0
            for p in reversed(buf):
                if overlap_len + len(p) > overlap:
                    break
                overlap_buf.insert(0, p)
                overlap_len += len(p)
            buf = overlap_buf
            buf_len = overlap_len
        buf.append(para)
        buf_len += len(para)

    if buf:
        chunks.append("\n\n".join(buf))

    return [c for c in chunks if len(c) > 40]


def scrape_faciee() -> list[dict]:
    """
    Parcurge toate paginile FACIEE, descarcă PDF-urile găsite
    și returnează o listă de chunk-uri cu { id, text, source }.
    """
    chunks = []
    pdf_urls_seen = set()
    chunk_idx = 0

    print(f"[Scraper] Pornesc — {len(PAGES)} pagini de parcurs...")

    for path in PAGES:
        url = BASE_URL + path
        try:
            resp = requests.get(url, headers=HEADERS, timeout=12)
            if resp.status_code != 200:
                continue

            soup = BeautifulSoup(resp.text, "html.parser")
            page_text = _clean_html(soup, url)

            if page_text:
                for chunk in _chunk_text(page_text):
                    chunks.append({
                        "id": f"web_{chunk_idx}",
                        "text": chunk,
                        "source": url,
                        "type": "web",
                    })
                    chunk_idx += 1

            # Găsește link-uri PDF pe pagină
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if not href.lower().endswith(".pdf"):
                    continue
                if not href.startswith("http"):
                    href = BASE_URL + "/" + href.lstrip("/")
                if href in pdf_urls_seen:
                    continue
                pdf_urls_seen.add(href)

                try:
                    pdf_resp = requests.get(href, headers=HEADERS, timeout=20)
                    if pdf_resp.status_code != 200:
                        continue
                    pdf_text = _parse_pdf(pdf_resp.content, href)
                    if pdf_text:
                        for chunk in _chunk_text(pdf_text, max_chars=1000):
                            chunks.append({
                                "id": f"pdf_{chunk_idx}",
                                "text": chunk,
                                "source": href,
                                "type": "pdf",
                            })
                            chunk_idx += 1
                        print(f"[Scraper] PDF indexat: {href}")
                except Exception as e:
                    print(f"[Scraper] Eroare PDF {href}: {e}")

                time.sleep(0.3)

            time.sleep(0.4)  # politicos față de server
            print(f"[Scraper] ✓ {url}")

        except Exception as e:
            print(f"[Scraper] Eroare {url}: {e}")

    print(f"[Scraper] Gata — {len(chunks)} chunk-uri din {len(PAGES)} pagini + {len(pdf_urls_seen)} PDF-uri")
    return chunks


UGAL_PAGES = [
    "/",
    "/universitatea/prezentare",
    "/universitatea/conducere",
    "/universitatea/structura/facultati",
    "/universitatea/structura/departamente",
    "/studenti",
    "/studenti/burse",
    "/studenti/cazare",
    "/studenti/transport",
    "/studenti/cantina",
    "/studenti/biblioteca",
    "/studenti/activitati-extracurriculare",
    "/contact",
]

ADM_PAGES = [
    "/",
    "/licenta",
    "/masterat",
    "/doctorat",
    "/calendar-admitere",
    "/acte-necesare",
    "/taxe",
    "/rezultate",
    "/contact",
]

FACULTY_COMMON_PAGES = [
    "/",
    "/prezentare",
    "/prezentare/misiune",
    "/structura/conducere",
    "/structura/secretariat",
    "/structura/departamente",
    "/educatie/licenta",
    "/educatie/masterat",
    "/admitere",
    "/admitere/licenta",
    "/admitere/masterat",
    "/studenti/burse",
    "/studenti/taxe",
    "/studenti/orare-licenta",
    "/studenti/orare-masterat",
    "/studenti/programarea-examenelor",
    "/studenti/regulamente",
    "/studenti/ghidul-studentului",
    "/studenti/finalizare-studii",
    "/studenti/practica",
    "/studenti/erasmus",
    "/informatii/anunturi",
    "/informatii/evenimente",
    "/contact",
]

FACULTY_SITES = {
    "ing":    "https://ing.ugal.ro",    # Facultatea de Inginerie
    "feaa":   "https://feaa.ugal.ro",   # Facultatea de Economie și Administrarea Afacerilor
    "fdsa":   "https://fdsa.ugal.ro",   # Facultatea de Drept și Științe Administrative
    "litere": "https://litere.ugal.ro", # Facultatea de Litere
    "arte":   "https://arte.ugal.ro",   # Facultatea de Arte
    "fefs":   "https://fefs.ugal.ro",   # Facultatea de Educație Fizică și Sport
}


def _scrape_site(base: str, pages: list[str], prefix: str) -> list[dict]:
    chunks = []
    chunk_idx = 0
    ssl_verify = next((v for k, v in VERIFY_SSL.items() if base.startswith(k)), True)
    for path in pages:
        url = base + path
        try:
            resp = requests.get(url, headers=HEADERS, timeout=12, verify=ssl_verify)
            if resp.status_code != 200:
                continue
            soup = BeautifulSoup(resp.text, "html.parser")
            page_text = _clean_html(soup, url)
            if page_text:
                for chunk in _chunk_text(page_text):
                    chunks.append({
                        "id": f"{prefix}_{chunk_idx}",
                        "text": chunk,
                        "source": url,
                        "type": "web",
                    })
                    chunk_idx += 1
            time.sleep(0.4)
            print(f"[Scraper] ✓ {url}")
        except Exception as e:
            print(f"[Scraper] Eroare {url}: {e}")
    return chunks


def scrape_ugal_general() -> list[dict]:
    print(f"[Scraper] UGAL general — {len(UGAL_PAGES)} pagini...")
    return _scrape_site(UGAL_URL, UGAL_PAGES, "ugal")


def scrape_admitere() -> list[dict]:
    print(f"[Scraper] Admitere UGAL — {len(ADM_PAGES)} pagini...")
    return _scrape_site(ADM_URL, ADM_PAGES, "adm")


def scrape_faculties() -> list[dict]:
    """Scrape-uiește toate site-urile de facultăți UGAL."""
    chunks = []
    for prefix, base_url in FACULTY_SITES.items():
        print(f"[Scraper] Facultate {prefix} ({base_url})...")
        VERIFY_SSL[base_url] = False
        chunks += _scrape_site(base_url, FACULTY_COMMON_PAGES, prefix)
    return chunks


def scrape_all() -> list[dict]:
    """Scrape-uiește toate sursele: FACIEE + toate facultățile + UGAL general + Admitere."""
    chunks = []
    chunks += scrape_faciee()
    chunks += scrape_faculties()
    chunks += scrape_ugal_general()
    chunks += scrape_admitere()
    print(f"[Scraper] Total: {len(chunks)} chunk-uri din toate sursele.")
    return chunks
