import os
import time
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile
from app.api.errors import global_exception_handler  # noqa: F401 (kept for project conventions)
from app.db.database import get_db
from app.models.models import Profile
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/v1/chat", tags=["Chatbot"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")

SYSTEM_PROMPT = """Ești InsideUGAL AI, asistentul virtual al studenților de la Universitatea „Dunărea de Jos” din Galați.
Misiunea ta este să ajuți cu informații despre orar, cantină, hartă și regulamente.
Fii prietenos și profesional. Dacă nu știi ceva, îndrumă-i către secretariat."""


def prepare_context(message: str, history: List) -> str:
    """Formatează istoricul pentru a păstra contextul conversației."""
    context = f"{SYSTEM_PROMPT}\n\n"
    for msg in history:
        role = "Student" if msg.role == "user" else "InsideUGAL AI"
        context += f"{role}: {msg.content}\n"
    context += f"Student: {message}\nInsideUGAL AI:"
    return context


@router.post("/", response_model=ChatResponse)
async def ask_chatbot(
    request: ChatRequest,
    current_profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint-ul principal pentru chatbot-ul InsideUGAL.
    """
    start_ts = time.perf_counter()

    full_prompt = prepare_context(request.message, request.history)

    try:
        # Apelăm serviciul LLM via HTTP
        async with httpx.AsyncClient() as client:
            llm_resp = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/chat",
                json={"prompt": full_prompt},
                timeout=30.0,
            )
            llm_resp.raise_for_status()
            response_data = llm_resp.json()

        response_text = response_data["response"]
        model = response_data.get("model") or "gemini-2.5-flash"
        usage = response_data.get("usage") or {}

        duration_ms = int((time.perf_counter() - start_ts) * 1000)

        # tokens - dacă providerul nu trimite, folosim 0 (tabelul are DEFAULT 0)
        prompt_tokens = int(usage.get("prompt_tokens") or 0)
        response_tokens = int(usage.get("response_tokens") or 0)
        total_tokens = int(
            usage.get("total_tokens")
            or (prompt_tokens + response_tokens)
            or 0
        )
        cached = bool(usage.get("cached") or False)

        # Persist în DB: public.llm_calls
        await db.execute(
            text(
                """
                INSERT INTO public.llm_calls
                  (function_name, model, prompt_tokens, response_tokens, total_tokens, cached, duration_ms)
                VALUES
                  (:function_name, :model, :prompt_tokens, :response_tokens, :total_tokens, :cached, :duration_ms)
                """
            ),
            {
                "function_name": "chat",
                "model": model,
                "prompt_tokens": prompt_tokens,
                "response_tokens": response_tokens,
                "total_tokens": total_tokens,
                "cached": cached,
                "duration_ms": duration_ms,
            },
        )
        await db.commit()

        return ChatResponse(
            response=response_text,
            model=model,
            usage={
                "info": "ok",
                "prompt_tokens": str(prompt_tokens),
                "response_tokens": str(response_tokens),
                "total_tokens": str(total_tokens),
                "duration_ms": str(duration_ms),
            },
            status="success",
        )

    except httpx.TimeoutException as exc:
        # Provider timeout => 503
        duration_ms = int((time.perf_counter() - start_ts) * 1000)
        raise HTTPException(
            status_code=503,
            detail={
                "message": "InsideUGAL AI este momentan indisponibil (timeout).",
                "technical_details": str(exc),
                "duration_ms": duration_ms,
            },
        ) from exc
    except httpx.HTTPStatusError as exc:
        # Rate limit / invalid key / etc => 502/503 controlat
        status_code = exc.response.status_code
        duration_ms = int((time.perf_counter() - start_ts) * 1000)

        if status_code == 401 or status_code == 403:
            mapped = 502
            friendly = "Cheie/credendțiale invalide pentru serviciul AI."
        elif status_code == 429:
            mapped = 503
            friendly = "Serviciul AI este rate-limited. Încearcă din nou."
        else:
            mapped = 502
            friendly = "Eroare de la serviciul AI."

        raise HTTPException(
            status_code=mapped,
            detail={
                "message": friendly,
                "technical_details": str(exc),
                "provider_status": status_code,
                "duration_ms": duration_ms,
            },
        ) from exc
    except httpx.RequestError as exc:
        # Probleme de rețea
        duration_ms = int((time.perf_counter() - start_ts) * 1000)
        raise HTTPException(
            status_code=503,
            detail={
                "message": "InsideUGAL AI este momentan indisponibil (network).",
                "technical_details": str(exc),
                "duration_ms": duration_ms,
            },
        ) from exc
    except Exception as exc:
        # Ultima plasă: nu crăpăm 500 cu blur => controlat 502
        duration_ms = int((time.perf_counter() - start_ts) * 1000)
        raise HTTPException(
            status_code=502,
            detail={
                "message": "InsideUGAL AI a eșuat procesarea cererii.",
                "technical_details": str(exc),
                "duration_ms": duration_ms,
            },
        ) from exc
