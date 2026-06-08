import os
import re
import requests
from google import genai
from google.genai import types as genai_types

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 384

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")

_gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))


def _embed(texts: list[str]) -> list[list[float]]:
    result = _gemini.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=genai_types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMS),
    )
    return [e.values for e in result.embeddings]


def _sb_headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


class _CollectionProxy:
    """Proxy backward-compat pentru rag.collection.count() din app.py."""
    def __init__(self, engine):
        self._engine = engine

    def count(self) -> int:
        return self._engine.count()


class RAGEngine:
    def __init__(self):
        self.collection = _CollectionProxy(self)
        self._index_files()

    # ── Supabase helpers ──────────────────────────────────────────────────────

    def count(self) -> int:
        try:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/chatbot_chunks",
                headers={**_sb_headers(), "Prefer": "count=exact"},
                params={"select": "id"},
                timeout=10,
            )
            return int(r.headers.get("Content-Range", "0/0").split("/")[-1])
        except Exception:
            return 0

    def _get_existing_ids(self) -> set:
        try:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/chatbot_chunks",
                headers=_sb_headers(),
                params={"select": "chunk_id", "limit": 50000},
                timeout=20,
            )
            return {row["chunk_id"] for row in r.json()} if r.ok else set()
        except Exception:
            return set()

    def _upsert(self, docs: list[str], ids: list[str], metas: list[dict]):
        if not docs:
            return
        # Embed in batches of 100 (Gemini API limit)
        embeddings: list[list[float]] = []
        for i in range(0, len(docs), 100):
            embeddings.extend(_embed(docs[i:i + 100]))

        rows = [
            {
                "chunk_id": ids[i],
                "content": docs[i],
                "source": metas[i].get("source", ""),
                "type": metas[i].get("type", "file"),
                "embedding": embeddings[i],
            }
            for i in range(len(docs))
        ]
        for i in range(0, len(rows), 50):
            requests.post(
                f"{SUPABASE_URL}/rest/v1/chatbot_chunks",
                headers={**_sb_headers(), "Prefer": "resolution=merge-duplicates"},
                json=rows[i:i + 50],
                timeout=30,
            )

    # ── Chunking ──────────────────────────────────────────────────────────────

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
        existing = self._get_existing_ids()
        docs, ids, metas = [], [], []
        idx = 0
        for fname in sorted(os.listdir(KNOWLEDGE_DIR)):
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
            print(f"[RAG] Indexez {len(docs)} chunk-uri noi în Supabase...")
            self._upsert(docs, ids, metas)

    # ── Public API ────────────────────────────────────────────────────────────

    def ingest(self, chunks: list[dict]):
        if not chunks:
            return
        existing = self._get_existing_ids()
        docs, ids, metas = [], [], []
        for c in chunks:
            if c["id"] not in existing:
                docs.append(c["text"])
                ids.append(c["id"])
                metas.append({"source": c["source"], "type": c["type"]})
        if docs:
            self._upsert(docs, ids, metas)
            print(f"[RAG] +{len(docs)} chunk-uri ingerate.")

    def rebuild(self):
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/chatbot_chunks",
            headers=_sb_headers(),
            params={"id": "gte.1"},
            timeout=30,
        )
        self._index_files()

    def query_with_sources(self, question: str, n_results: int = 5) -> tuple[str, list[str]]:
        try:
            q_emb = _embed([question])[0]
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/match_chatbot_chunks",
                headers=_sb_headers(),
                json={"query_embedding": q_emb, "match_count": n_results},
                timeout=15,
            )
            rows = r.json() if r.ok else []
        except Exception as e:
            print(f"[RAG] Query error: {e}")
            return "", []

        if not rows or not isinstance(rows, list):
            return "", []

        chunks, sources, seen_src = [], [], set()
        for row in rows:
            content = self._clean_chunk(row.get("content", ""))
            if content and len(content) > 30:
                chunks.append(content)
            src = row.get("source", "")
            if src and src not in seen_src:
                seen_src.add(src)
                sources.append(src)

        result = "\n\n---\n\n".join(chunks)
        if result and result[-1] not in ".!?:»\n":
            result += "..."
        return result, sources

    def query(self, question: str, n_results: int = 5) -> str:
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
