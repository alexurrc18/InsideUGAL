import os
import time
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile
from app.db.database import get_db
from app.models.models import Profile
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/v1/chat", tags=["Campus Chat"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")

SYSTEM_PROMPT = """Ești InsideUGAL AI, asistentul virtual al studenților de la Universitatea „Dunărea de Jos" din Galați.
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
    
    - ✅ Securizat cu JWT (Depends(get_current_profile))
    - ✅ Salvează întrebări/răspunsuri în questions_history
    - ✅ Error Handling: timeout/rate-limit/network => 503
    """
    start_ts = time.perf_counter()

    full_prompt = prepare_context(request.message, request.history)

    try:
        # Apelăm serviciul LLM via HTTP la /api/v1/ask
        async with httpx.AsyncClient() as client:
            llm_resp = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/ask",
                json={"prompt": full_prompt},
                timeout=30.0,
            )
            llm_resp.raise_for_status()
            response_data = llm_resp.json()

        response_text = response_data.get("answer") or response_data.get("response", "")
        if not response_text:
            raise ValueError("Serviciul LLM a returnat răspuns gol.")

        # ✅ SALVEAZĂ ÎN questions_history
        try:
            await db.execute(
                text("""
                    INSERT INTO public.questions_history
                      (user_id, question, answer)
                    VALUES (:user_id, :question, :answer)
                """),
                {
                    "user_id": str(current_profile.id),
                    "question": request.message,
                    "answer": response_text,
                },
            )
            await db.commit()
        except Exception as db_exc:
            # Log DB error dar nu crapi response-ul
            print(f"[WARN] Failed to save to questions_history: {db_exc}")
            await db.rollback()

        duration_ms = int((time.perf_counter() - start_ts) * 1000)

        return ChatResponse(
            response=response_text,
            model="InsideUGAL Campus Assistant",
            status="success",
        )

    except httpx.TimeoutException as exc:
        duration_ms = int((time.perf_counter() - start_ts) * 1000)
        raise HTTPException(
            status_code=503,
            detail={
                "message": "InsideUGAL AI este momentan indisponibil (timeout).",
                "duration_ms": duration_ms,
            },
        ) from exc

    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        duration_ms = int((time.perf_counter() - start_ts) * 1000)
        
        # Orice eroare de la LLM service => 503
        raise HTTPException(
            status_code=503,
            detail={
                "message": "InsideUGAL AI este momentan indisponibil (service error).",
                "provider_status": status_code,
                "duration_ms": duration_ms,
            },
        ) from exc

    except httpx.RequestError as exc:
        duration_ms = int((time.perf_counter() - start_ts) * 1000)
        raise HTTPException(
            status_code=503,
            detail={
                "message": "InsideUGAL AI este momentan indisponibil (network).",
                "duration_ms": duration_ms,
            },
        ) from exc

    except Exception as exc:
        duration_ms = int((time.perf_counter() - start_ts) * 1000)
        raise HTTPException(
            status_code=503,
            detail={
                "message": "InsideUGAL AI a eșuat procesarea cererii.",
                "duration_ms": duration_ms,
            },
        ) from exc
