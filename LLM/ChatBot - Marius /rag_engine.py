import os
import re
import chromadb
from rank_bm25 import BM25Okapi

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
CHROMA_DIR    = os.path.join(os.path.dirname(__file__), ".chroma")

# ── Embedding function multilingvă ──────────────────────────────────────────
# Folosim fastembed direct (chromadb 1.5.9 nu mai expune FastEmbedEmbeddingFunction)

class _MultilingualEmbeddingFn:
    """Wrapper chromadb-compatibil peste fastembed TextEmbedding."""
    MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    def __init__(self):
        from fastembed import TextEmbedding
        self._model = TextEmbedding(self.MODEL)
        print(f"[RAG] Model embedding: {self.MODEL}")

    def name(self) -> str:
        return "multilingual-minilm-l12-v2"

    def __call__(self, input: list) -> list:
        return [e.tolist() for e in self._model.embed(input)]


# ── Query expansion ──────────────────────────────────────────────────────────

QUERY_EXPANSIONS = {
    "automatică":   ["automatică", "AIA", "automatica", "inginerie sisteme", "SA"],
    "calculatoare": ["calculatoare", "CTI", "informatică", "computer", "IT"],
    "electrică":    ["electrică", "inginerie electrică", "IE", "IEC", "electromecanică", "IESCE"],
    "electronică":  ["electronică", "ETC", "RST", "telecomunicații", "EA", "ETTI"],
    "admitere":     ["admitere", "înscriere", "candidat", "dosar", "bacalaureat", "bac", "media"],
    "bursă":        ["bursă", "burse", "scholarship", "performanță", "social", "ajutor social"],
    "examen":       ["examen", "examene", "sesiune", "programare examene", "colocviu", "restanță"],
    "orar":         ["orar", "program", "schedule", "cursuri", "ore", "laboratoare"],
    "master":       ["master", "masterat", "TIA", "SICA", "UEESR", "EPSAC", "PIAM", "SEA"],
    "taxă":         ["taxă", "taxe", "cost", "plată", "fee", "reducere"],
    "contact":      ["contact", "secretariat", "adresă", "telefon", "email", "biroul"],
    "practică":     ["practică", "stagiu", "internship", "proiect"],
    "erasmus":      ["erasmus", "mobilitate", "exchange", "internațional", "schimb"],
    "licență":      ["licență", "diplomă", "absolvire", "lucrare", "proiect final"],
    "cămin":        ["cămin", "cazare", "dormitor", "campus", "căminul"],
    "bibliotecă":   ["bibliotecă", "cărți", "resurse", "e-learning"],
    "înmatriculare":["înmatriculare", "matricolă", "student", "dosar student"],
    "concurs":      ["concurs", "hackathon", "competiție", "olimpiadă", "premiu"],
}

_STOPWORDS_RO = {
    "si", "in", "cu", "la", "de", "din", "pe", "un", "o", "a", "al", "ale",
    "sa", "se", "ca", "ce", "va", "fi", "au", "am", "ai", "el", "ea", "ei",
    "eu", "nu", "da", "sau", "ori", "dar", "ci", "tot", "mai", "dupa", "spre",
    "prin", "pana", "fara", "are", "este", "era", "vor", "pot", "care", "cat",
}


def _expand_query(question: str) -> str:
    q_lower = question.lower()
    extras = []
    for key, synonyms in QUERY_EXPANSIONS.items():
        if any(s.lower() in q_lower for s in synonyms):
            extras.extend(synonyms[:4])
    return (question + " " + " ".join(set(extras))).strip() if extras else question


# ── RAGEngine ────────────────────────────────────────────────────────────────

class RAGEngine:
    # Nou collection name forțează rebuild cu embeddings multilingve corecte
    COLLECTION_NAME = "faciee_v2"

    def __init__(self):
        self.client = chromadb.PersistentClient(path=CHROMA_DIR)

        try:
            self.ef = _MultilingualEmbeddingFn()
        except Exception as e:
            from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
            self.ef = DefaultEmbeddingFunction()
            print(f"[RAG] Fallback la model default: {e}")

        self.collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            embedding_function=self.ef,
            metadata={"hnsw:space": "cosine"},
        )

        self._bm25: BM25Okapi | None = None
        self._bm25_docs: list[str] = []

        self._index_files()
        self._build_bm25()

    # ── BM25 ─────────────────────────────────────────────────────────────────

    def _build_bm25(self):
        docs = self.collection.get().get("documents") or []
        if not docs:
            return
        self._bm25_docs = docs
        self._bm25 = BM25Okapi([self._tokenize_ro(d) for d in docs])

    @staticmethod
    def _tokenize_ro(text: str) -> list[str]:
        text = text.lower().translate(str.maketrans("ăâîșțĂÂÎȘȚ", "aaistaaist"))
        tokens = re.findall(r"[a-z0-9]+", text)
        return [t for t in tokens if t not in _STOPWORDS_RO and len(t) > 1]

    # ── Indexare fișiere locale ───────────────────────────────────────────────

    def _chunks_from_file(self, path: str) -> list[str]:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        raw = re.split(r"={3,}", text)
        chunks = []
        for part in raw:
            part = part.strip()
            if len(part) < 40:
                continue
            if len(part) > 900:
                lines = part.splitlines()
                buf, buf_len = [], 0
                for line in lines:
                    buf.append(line)
                    buf_len += len(line)
                    if buf_len > 700:
                        chunks.append("\n".join(buf).strip())
                        buf, buf_len = [], 0
                if buf:
                    chunks.append("\n".join(buf).strip())
            else:
                chunks.append(part)
        return [c for c in chunks if len(c) > 30]

    def _index_files(self):
        existing = set(self.collection.get()["ids"])
        docs, ids, metas = [], [], []
        idx = 0
        for fname in os.listdir(KNOWLEDGE_DIR):
            if not fname.endswith(".txt"):
                continue
            for chunk in self._chunks_from_file(os.path.join(KNOWLEDGE_DIR, fname)):
                cid = f"file_{fname}_{idx}"
                if cid not in existing:
                    docs.append(chunk)
                    ids.append(cid)
                    metas.append({"source": fname, "type": "file"})
                idx += 1
        if docs:
            self.collection.upsert(documents=docs, ids=ids, metadatas=metas)

    # ── Ingest din scraper ────────────────────────────────────────────────────

    def ingest(self, chunks: list[dict]):
        if not chunks:
            return
        existing = set(self.collection.get()["ids"])
        docs, ids, metas = [], [], []
        for c in chunks:
            if c["id"] not in existing:
                docs.append(c["text"])
                ids.append(c["id"])
                metas.append({"source": c["source"], "type": c["type"]})
        if docs:
            for i in range(0, len(docs), 100):
                self.collection.upsert(
                    documents=docs[i:i+100],
                    ids=ids[i:i+100],
                    metadatas=metas[i:i+100],
                )
            print(f"[RAG] +{len(docs)} chunk-uri. Total: {self.collection.count()}")
            self._build_bm25()

    def rebuild(self):
        self.client.delete_collection(self.collection.name)
        self.collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            embedding_function=self.ef,
            metadata={"hnsw:space": "cosine"},
        )
        self._bm25 = None
        self._bm25_docs = []
        self._index_files()

    # ── Query hibrid cu RRF ───────────────────────────────────────────────────

    def _run_query(self, q_text: str, n_fetch: int) -> tuple[list[str], list[str]]:
        """Rulează o singură căutare, returnează (docs, sources)."""
        sem_docs, sem_sources = [], []
        try:
            sem = self.collection.query(query_texts=[q_text], n_results=n_fetch)
            sem_docs   = sem.get("documents",  [[]])[0]
            sem_metas  = sem.get("metadatas",  [[]])[0]
            sem_sources = [m.get("source", "") for m in sem_metas]
        except Exception:
            pass
        return sem_docs, sem_sources

    def _rrf_merge(self, rrf: dict, docs: list[str], sources: list[str],
                   weight: float = 1.0, k: int = 60):
        """Adaugă docs în dicționarul RRF cu ponderea dată."""
        for rank, (doc, src) in enumerate(zip(docs, sources)):
            key = doc[:120]
            entry = rrf.setdefault(key, {"doc": doc, "score": 0.0, "source": src})
            entry["score"] += weight / (k + rank + 1)

    def _make_variants(self, question: str) -> list[tuple[str, float]]:
        """Generează variante de query cu ponderi diferite."""
        expanded = _expand_query(question)
        keywords = " ".join(t for t in self._tokenize_ro(question) if len(t) > 3)
        variants = [(question, 1.0), (expanded, 0.8)]
        if keywords and keywords != question:
            variants.append((keywords, 0.6))
        return variants

    def query_with_sources(self, question: str, n_results: int = 5) -> tuple[str, list[str]]:
        """Multi-query hibrid — returnează (text_context, [surse_unice])."""
        count = self.collection.count()
        if count == 0:
            return "", []

        n_fetch  = min(n_results * 3, count)
        variants = self._make_variants(question)
        rrf: dict[str, dict] = {}

        # 1. Multi-query semantic + surse
        for q_text, weight in variants:
            docs, sources = self._run_query(q_text, n_fetch)
            self._rrf_merge(rrf, docs, sources, weight=weight)

        # 2. BM25 pe query-ul expandat
        expanded = _expand_query(question)
        if self._bm25 and self._bm25_docs:
            tokens = self._tokenize_ro(expanded)
            if tokens:
                scores = self._bm25.get_scores(tokens)
                top    = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
                bm25_docs = [(self._bm25_docs[i], scores[i]) for i in top[:n_fetch] if scores[i] > 0]
                for rank, (doc, _) in enumerate(bm25_docs):
                    key = doc[:120]
                    entry = rrf.setdefault(key, {"doc": doc, "score": 0.0, "source": ""})
                    entry["score"] += 0.7 / (60 + rank + 1)

        # 3. Acronim boost
        for kw in re.findall(r"\b[A-ZĂÂÎȘȚ]{2,6}\b", question)[:3]:
            try:
                kr = self.collection.query(
                    query_texts=[question], n_results=2,
                    where_document={"$contains": kw},
                )
                for doc in kr.get("documents", [[]])[0]:
                    key = doc[:120]
                    rrf.setdefault(key, {"doc": doc, "score": 0.0, "source": ""})["score"] += 0.5
            except Exception:
                pass

        # 4. Re-ranking: boost chunks cu overlap mare față de întrebarea originală
        q_tokens = set(self._tokenize_ro(question))
        if q_tokens:
            for item in rrf.values():
                chunk_tokens = set(self._tokenize_ro(item["doc"][:600]))
                overlap = len(q_tokens & chunk_tokens) / len(q_tokens)
                item["score"] *= (1 + 0.4 * overlap)

        # 5. Sortare RRF → top-N unici
        ranked = sorted(rrf.values(), key=lambda x: x["score"], reverse=True)
        unique, seen, sources_seen, all_sources = [], set(), set(), []
        for item in ranked:
            clean = self._clean_chunk(item["doc"])
            if not clean or len(clean) < 40:
                continue
            key = clean[:120]
            if key not in seen:
                seen.add(key)
                unique.append(clean)
                src = item.get("source", "")
                if src and src not in sources_seen:
                    sources_seen.add(src)
                    all_sources.append(src)
            if len(unique) >= n_results:
                break

        result = "\n\n---\n\n".join(unique)
        if result and result[-1] not in ".!?:»\n":
            result += "..."
        return result, all_sources

    def query(self, question: str, n_results: int = 5) -> str:
        """Backward compatible — returnează doar textul."""
        text, _ = self.query_with_sources(question, n_results)
        return text

    # ── Curățare chunk ────────────────────────────────────────────────────────

    @staticmethod
    def _clean_chunk(text: str) -> str:
        text = re.sub(r"\[(?:PDF|Sursa):[^\]]+\]\n?", "", text, flags=re.IGNORECASE)
        for pattern in [
            r"ROMÂNIA\s*\n",
            r"MINISTERUL EDUCA[TȚ]IEI\s*\n",
            r"UNIVERSITATEA[^\n]*GALA[TȚ]I\s*\n",
            r"FACULTATEA DE AUTOMATIC[AĂ][^\n]*\n",
            r"Str\.\s*Dom[^\n]+\n",
            r"Str\.\s*[SȘ]tiin[^\n]+\n",
            r"Operator înscris[^\n]+\n",
            r"tel[:/][^\n]+\n",
            r"e-mail:[^\n]+\n",
        ]:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)
        text = re.sub(r"\bPagina\s+\d+\s*[|/]\s*\d+\b", "", text, flags=re.IGNORECASE)
        text = re.sub(r"^\d+/\d+\s*$", "", text, flags=re.MULTILINE)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

        lines = text.splitlines()
        merged, i = [], 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                merged.append("")
                i += 1
                continue
            if (len(line.split()) <= 2 and i + 1 < len(lines)
                    and not re.match(r"^(Art\.|Alin\.|[A-Z]\.|•|\d+\.)", line)):
                nxt = lines[i + 1].strip()
                if nxt:
                    merged.append(line + " " + nxt)
                    i += 2
                    continue
            merged.append(line)
            i += 1

        text = "\n".join(merged)
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        return text if len(text) > 30 else ""
