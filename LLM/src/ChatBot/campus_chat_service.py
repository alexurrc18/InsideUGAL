"""
Serviciu stateless pentru endpoint-ul POST /api/v1/campus-chat din combined_app.py.
Folosește Supabase (backend_client) + RAG + Gemini 2.5 Flash cu streaming SSE.
"""
import os
import re
import json
from pathlib import Path

from google import genai
from google.genai import types as genai_types
from rag_engine import RAGEngine
import backend_client
import cache as llm_cache

from chatbot_shared import (
    SYSTEM_PROMPT, GEMINI_MODEL,
    detect_link, generate_suggestions,
    MIN_ANSWER_LENGTH_FOR_SOURCES,
)

# ── Instanțe partajate ────────────────────────────────────────────────────────

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
_rag = RAGEngine()


# ── Context builder ───────────────────────────────────────────────────────────

def _build_context(question: str) -> tuple[str, str, list[str]]:
    """Returnează (context_pentru_llm, fallback_direct, sources)."""
    # Un singur pass Supabase — RAG doar dacă nu există intent recunoscut
    full_ctx, focused = backend_client.fetch_context_combined(question)
    if focused:
        return full_ctx, focused, []

    raw_context, sources = _rag.query_with_sources(question, n_results=3)
    ctx = raw_context or "Nu am găsit informații specifice. Îndrumă utilizatorul spre https://www.ugal.ro/"
    return ctx, raw_context, sources


# ── Non-streaming ─────────────────────────────────────────────────────────────

def campus_chat(question: str) -> dict:
    question = question.strip()
    link = detect_link(question) or backend_client.fetch_entity_link(question)
    context, backend_context, sources = _build_context(question)

    cache_key = llm_cache.make_key(question + context, GEMINI_MODEL)
    cached = llm_cache.get(cache_key)
    if cached:
        return {
            "answer": cached,
            "sources": sources,
            "suggestions": generate_suggestions(question, cached, _client, GEMINI_MODEL),
            "link": link,
        }

    gemini_ok = False
    answer = ""
    try:
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[genai_types.Content(role="user", parts=[genai_types.Part(text=question)])],
            config=genai_types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT + context,
                temperature=0.3,
            ),
        )
        answer = resp.text or ""
        if answer:
            gemini_ok = True
            llm_cache.set(cache_key, answer)
    except Exception:
        pass

    if not answer:
        answer = "Asistentul este momentan supraîncărcat. Te rugăm să încerci din nou în câteva secunde."
        sources = []

    if len(answer.strip()) < MIN_ANSWER_LENGTH_FOR_SOURCES:
        sources = []

    return {
        "answer": answer,
        "sources": sources,
        "suggestions": generate_suggestions(question, answer, _client, GEMINI_MODEL) if gemini_ok else [],
        "link": link,
        "_from_fallback": not gemini_ok,
    }


# ── Streaming SSE ─────────────────────────────────────────────────────────────

def campus_chat_stream(question: str):
    """Generator SSE — yield-uiește chunk-uri `data: {...}` pentru streaming incremental."""
    question = question.strip()
    link = detect_link(question) or backend_client.fetch_entity_link(question)
    context, backend_context, sources = _build_context(question)

    cache_key = llm_cache.make_key(question + context, GEMINI_MODEL)
    cached = llm_cache.get(cache_key)
    if cached:
        for token in re.split(r"(\s+)", cached):
            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"
        yield f"data: {json.dumps({'done': True, 'sources': sources, 'suggestions': [], 'link': link})}\n\n"
        return

    try:
        stream = _client.models.generate_content_stream(
            model=GEMINI_MODEL,
            contents=[genai_types.Content(role="user", parts=[genai_types.Part(text=question)])],
            config=genai_types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT + context,
                temperature=0.3,
            ),
        )
        full: list[str] = []
        for chunk in stream:
            token = chunk.text
            if token:
                full.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

        answer = "".join(full)
        if answer:
            llm_cache.set(cache_key, answer)
        visible_sources = [] if len(answer.strip()) < MIN_ANSWER_LENGTH_FOR_SOURCES else sources
        yield f"data: {json.dumps({'done': True, 'sources': visible_sources, 'suggestions': generate_suggestions(question, answer, _client, GEMINI_MODEL), 'link': link})}\n\n"
        return
    except Exception:
        pass

    # Fallback: Gemini indisponibil — mesaj curat, fără date brute
    answer = "Asistentul este momentan supraîncărcat. Te rugăm să încerci din nou în câteva secunde."
    for token in re.split(r"(\s+)", answer):
        if token:
            yield f"data: {json.dumps({'token': token})}\n\n"
    yield f"data: {json.dumps({'done': True, 'sources': [], 'suggestions': [], 'link': link, '_from_fallback': True})}\n\n"
