import asyncio
import json
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Requestfrom fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile
from app.db.database import get_db
from app.models.models import Profile, QuestionsHistory
from app.rate_limit import limiter, LLM_RATE_LIMIT

router = APIRouter(prefix="/api/v1/llm", tags=["LLM"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")


def _chunk_text(text: str, chunk_size: int = 10) -> list[str]:
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]


async def _stream_response(answer: str, user_question: str, current_profile: Profile, session: AsyncSession):
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


@router.post("/ask/stream")
@limiter.limit(LLM_RATE_LIMIT)
async def ask_chatbot_stream(
    request: Request,
    current_profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_db),
):
    try:
        async with httpx.AsyncClient() as client:
            llm_resp = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/campus-chat",
                json={"question": "placeholder"},
                timeout=30.0,
            )
            llm_resp.raise_for_status()
            response_data = llm_resp.json()

        answer = response_data.get("answer", "")

        return StreamingResponse(
            _stream_response(answer, "placeholder", current_profile, session),
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
