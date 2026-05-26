import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from typing import Dict, Optional, Tuple

import chromadb
import pdfplumber
import pybreaker
from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from pydantic import ValidationError
from sentence_transformers import SentenceTransformer
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import cache as llm_cache
import supabase_logger
from schemas import (
    AnswerQuestionInput,
    AnswerQuestionOutput,
    GenerateQuizInput,
    GenerateQuizOutput,
    GenerateSummaryInput,
    GenerateSummaryOutput,
)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

GEMINI_MODEL = "gemini-2.5-flash"
TEMPERATURE = 0.7
TIMEOUT_S = 30

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
_embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
_chroma_path = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
_chroma = chromadb.PersistentClient(path=_chroma_path)

# Se închide după 5 erori consecutive, se resetează după 60s
_breaker = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60)


# ── LLM call cu timeout + circuit breaker + retry ────────

@_breaker
def _raw_gemini(prompt: str) -> Tuple[str, Dict[str, int]]:
    resp = _client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    usage: Dict[str, int] = {}
    if hasattr(resp, "usage_metadata") and resp.usage_metadata:
        usage = {
            "prompt_tokens": resp.usage_metadata.prompt_token_count or 0,
            "response_tokens": resp.usage_metadata.candidates_token_count or 0,
            "total_tokens": resp.usage_metadata.total_token_count or 0,
        }
    return resp.text or "", usage


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((TimeoutError, pybreaker.CircuitBreakerError, OSError, genai_errors.ServerError)),
)
def _call(prompt: str, function_name: str = "unknown") -> str:
    """Apel Gemini cu cache, timeout 30s, max 2 retry-uri, circuit breaker și logging Supabase."""
    key = llm_cache.make_key(prompt, GEMINI_MODEL, TEMPERATURE)
    cached = llm_cache.get(key)
    if cached is not None:
        supabase_logger.log_llm_call(
            function_name=function_name,
            model=GEMINI_MODEL,
            prompt_tokens=0,
            response_tokens=0,
            total_tokens=0,
            cached=True,
        )
        return cached

    start = time.time()
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_raw_gemini, prompt)
        try:
            result, usage = future.result(timeout=TIMEOUT_S)
        except FutureTimeout:
            raise TimeoutError(f"Gemini nu a răspuns în {TIMEOUT_S}s")
    duration_ms = int((time.time() - start) * 1000)

    llm_cache.set(key, result, GEMINI_MODEL)
    supabase_logger.log_llm_call(
        function_name=function_name,
        model=GEMINI_MODEL,
        prompt_tokens=usage.get("prompt_tokens", 0),
        response_tokens=usage.get("response_tokens", 0),
        total_tokens=usage.get("total_tokens", 0),
        cached=False,
        duration_ms=duration_ms,
    )
    return result


# ── PDF / vector DB helpers ───────────────────────────────

def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text


def chunk_text(text: str, chunk_size: int = 200, overlap: int = 30) -> list:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunks.append(" ".join(words[i : i + chunk_size]))
        i += chunk_size - overlap
    return chunks


def store_in_vector_db(chunks: list, pdf_id: str):
    collection = _chroma.get_or_create_collection(name=pdf_id)
    embeddings = _embedding_model.encode(chunks).tolist()
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[f"{pdf_id}_chunk_{i}" for i in range(len(chunks))],
    )
    return collection


def query_relevant_chunks(query: str, pdf_id: str, n_results: int = 5) -> list:
    collection = _chroma.get_or_create_collection(name=pdf_id)
    query_embedding = _embedding_model.encode([query]).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=n_results)
    return results["documents"][0]


def load_pdf_into_rag(pdf_path: str, pdf_id: str) -> list:
    text = extract_text_from_pdf(pdf_path)
    chunks = chunk_text(text)
    store_in_vector_db(chunks, pdf_id)
    return chunks


# ── Funcții publice cu contract Pydantic ──────────────────

def answer_question(question: str, pdf_id: str) -> str:
    inp = AnswerQuestionInput(question=question, pdf_id=pdf_id)

    chunks = query_relevant_chunks(inp.question, inp.pdf_id, n_results=8)
    context = "\n\n".join(chunks)
    prompt = (
        "Esti un asistent care raspunde EXCLUSIV pe baza materialului furnizat mai jos.\n"
        "Reguli stricte:\n"
        "- Foloseste DOAR informatiile din materialul de mai jos.\n"
        "- Daca intrebarea nu are raspuns in material, raspunde exact: "
        "'Aceasta informatie nu se regaseste in materialul furnizat.'\n"
        "- Nu inventa, nu completa, nu presupune nimic in afara materialului.\n\n"
        f"Material:\n{context}\n\nIntrebare: {inp.question}"
    )

    for attempt in range(2):
        raw = _call(prompt, function_name="answer_question")
        try:
            return AnswerQuestionOutput(answer=raw).answer
        except ValidationError as exc:
            if attempt == 1:
                raise ValueError(f"Output LLM invalid după retry: {exc}") from exc

    raise RuntimeError("unreachable")


def generate_summary(pdf_id: str) -> str:
    inp = GenerateSummaryInput(pdf_id=pdf_id)

    chunks = query_relevant_chunks(
        "rezumat general curs introducere concepte principale", inp.pdf_id, n_results=8
    )
    context = "\n\n".join(chunks)
    prompt = (
        "Esti un profesor care ajuta studentii sa invete eficient.\n"
        "Creeaza un rezumat structurat al materialului de mai jos, in romana, respectand EXACT acest format:\n\n"
        "## Idei principale\n"
        "- [maxim 5 idei cheie, fiecare pe un rand]\n\n"
        "## Concepte importante\n"
        "- **Concept**: explicatie scurta si clara\n"
        "- [repeta pentru fiecare concept important]\n\n"
        "## Ce trebuie sa retii\n"
        "[2-3 fraze cu cele mai importante lucruri de memorat pentru examen]\n\n"
        "Reguli:\n"
        "- Foloseste limbaj simplu, fara jargon inutil\n"
        "- Fii concis — studentul trebuie sa inteleaga in 2 minute\n"
        "- Nu copia fraze din material, reformuleaza cu cuvinte proprii\n\n"
        f"Material:\n{context}"
    )

    for attempt in range(2):
        raw = _call(prompt, function_name="generate_summary")
        try:
            return GenerateSummaryOutput(summary=raw).summary
        except ValidationError as exc:
            if attempt == 1:
                raise ValueError(f"Rezumat invalid după retry: {exc}") from exc

    raise RuntimeError("unreachable")


def generate_quiz(pdf_id: str) -> list:
    inp = GenerateQuizInput(pdf_id=pdf_id)

    chunks = query_relevant_chunks(
        "concepte importante definitii exemple", inp.pdf_id, n_results=10
    )
    context = "\n\n".join(chunks)
    nr_intrebari = min(10, max(5, len(chunks)))
    prompt = (
        f"Genereaza {nr_intrebari} intrebari quiz bazate pe materialul de mai jos.\n"
        "Returneaza DOAR un JSON valid, fara alt text, in acest format exact:\n"
        "[\n"
        "  {\n"
        '    "intrebare": "...",\n'
        '    "variante": {"A": "...", "B": "...", "C": "...", "D": "..."},\n'
        '    "raspuns_corect": "A",\n'
        '    "explicatii": {\n'
        '      "A": "De ce varianta A este corecta sau gresita.",\n'
        '      "B": "De ce varianta B este corecta sau gresita.",\n'
        '      "C": "De ce varianta C este corecta sau gresita.",\n'
        '      "D": "De ce varianta D este corecta sau gresita."\n'
        "    }\n"
        "  }\n"
        "]\n\n"
        f"Material:\n{context}"
    )

    for attempt in range(2):
        raw = _call(prompt, function_name="generate_quiz")
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
            parsed = json.loads(cleaned)
            # Filtrăm întrebările incomplete returnate uneori de Gemini
            parsed = [q for q in parsed if isinstance(q, dict) and "raspuns_corect" in q and "variante" in q]
            output = GenerateQuizOutput(questions=parsed)
            return [q.model_dump(exclude_none=True) for q in output.questions]
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            if attempt == 1:
                raise ValueError(f"Quiz invalid după retry: {exc}") from exc

    raise RuntimeError("unreachable")
