import asyncio
import json
import os
from typing import AsyncGenerator

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile
from app.db.database import get_db
from app.models.models import Profile, QuestionsHistory
from app.rate_limit import limiter, LLM_RATE_LIMIT

router = APIRouter(prefix="/api/v1/llm", tags=["LLM"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")


def _chunk_text(text: str, chunk_size: int = 10) -> list[str]:
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]


async def _stream_response(
    answer: str, user_question: str, current_profile: Profile, session: AsyncSession
) -> AsyncGenerator[str, None]:
    try:
        for chunk in _chunk_text(answer, 10):
            yield f"data: {json.dumps({'content': chunk, 'cached': False})}\n\n"
            await asyncio.sleep(0.05)

        session.add(
            QuestionsHistory(
                user_id=str(current_profile.id),
                question=user_question,
                answer=answer,
                pdf_id="campus-chat",
            )
        )
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    yield "data: [DONE]\n\n"


class StreamRequest(BaseModel):
    """Model pentru corpul cererii de streaming."""
    question: str
    history: list[dict] | None = None


async def _real_stream_response(
    question: str, history: list[dict] | None, current_profile: Profile, session: AsyncSession
) -> AsyncGenerator[str, None]:
    """
    Streaming real: conectare la endpoint-ul SSE al serviciului LLM
    și retransmitere a evenimentelor către client cu gestionare de erori.
    """
    full_answer = ""

    try:
        async with httpx.AsyncClient() as client:
            # Trimitem și istoricul dacă există
            payload = {"question": question, "history": history or []}
            async with client.stream(
                "POST",
                f"{LLM_SERVICE_URL}/api/v1/campus-chat/stream",
                json=payload,
                timeout=60.0,
            ) as resp:
                if resp.status_code != 200:
                    yield f"data: {json.dumps({'error': 'Serviciul LLM a returnat o eroare.'})}\n\n"
                    return

                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue

                    payload_line = line[len("data: "):]

                    # Semnalul de final de stream
                    if payload_line.strip() == "[DONE]":
                        break

                    try:
                        chunk_data = json.loads(payload_line)
                        content = chunk_data.get("content", "")
                        full_answer += content
                        # Retransmitem evenimentul SSE către client
                        yield f"data: {json.dumps({'content': content, 'cached': False})}\n\n"
                    except json.JSONDecodeError:
                        continue

        # Salvăm răspunsul complet în istoricul de întrebări
        if full_answer:
            session.add(
                QuestionsHistory(
                    user_id=str(current_profile.id),
                    question=question,
                    answer=full_answer,
                    pdf_id="campus-chat",
                )
            )
            await session.commit()

    except Exception as e:
        await session.rollback()
        # Trimitem eroarea către client înainte de a închide
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        return

    yield "data: [DONE]\n\n"


@router.post("/ask/stream")
@limiter.limit(LLM_RATE_LIMIT)
async def ask_chatbot_stream(
    body: StreamRequest,
    request: Request,
    current_profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_db),
):
    try:
        return StreamingResponse(
            _real_stream_response(body.question, body.history, current_profile, session),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=503,
            detail="InsideUGAL AI este momentan indisponibil (timeout).",
        ) from exc

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=503,
            detail="InsideUGAL AI este momentan indisponibil.",
        ) from exc

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail="InsideUGAL AI este momentan indisponibil.",
        ) from exc
