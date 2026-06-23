import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile
from app.db.database import get_db
from app.models.models import Profile, QuestionsHistory
from app.rate_limit import limiter, LLM_RATE_LIMIT

router = APIRouter(prefix="/api/v1/llm", tags=["LLM"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")


@router.post("/ask")
@limiter.limit(LLM_RATE_LIMIT)
async def ask_chatbot(
    request: Request,
    current_profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_db),
):
    try:
        user_question = "placeholder"

        cached = await session.execute(
            select(QuestionsHistory)
            .where(QuestionsHistory.user_id == str(current_profile.id))
            .where(QuestionsHistory.question == user_question)
            .order_by(QuestionsHistory.created_at.desc())
            .limit(1)
        )
        cached_row = cached.scalar_one_or_none()
        if cached_row:
            return {
                "answer": cached_row.answer,
                "sources": [],
                "suggestions": [],
                "cached": True,
            }

        async with httpx.AsyncClient() as client:
            llm_resp = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/campus-chat",
                json={"question": user_question},
                timeout=30.0,
            )
            llm_resp.raise_for_status()
            response_data = llm_resp.json()

        response_text = response_data.get("answer", "")

        session.add(
            QuestionsHistory(
                user_id=str(current_profile.id),
                question=user_question,
                answer=response_text,
                pdf_id="campus-chat",
            )
        )
        await session.commit()

        return {
            **response_data,
            "cached": False,
        }

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