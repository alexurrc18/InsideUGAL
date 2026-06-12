import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile
from app.db.database import get_db
from app.models.models import Profile, QuestionsHistory

router = APIRouter(prefix="/api/v1/llm", tags=["LLM"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Generated response text")
    model: str = Field(default="InsideUGAL Campus Assistant", description="Model used")
    status: str = Field(default="success", description="Request status")
    sources: Optional[list[str]] = Field(default=None, description="Sources used for answer")
    suggestions: Optional[list[str]] = Field(default=None, description="Follow-up suggestions")


@router.post("/ask", response_model=ChatResponse)
async def ask_chatbot(
    request: ChatRequest,
    current_profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_db),
):
    try:
        async with httpx.AsyncClient() as client:
            llm_resp = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/campus-chat",
                json={"question": request.message},
                timeout=30.0,
            )
            llm_resp.raise_for_status()
            response_data = llm_resp.json()

        response_text = response_data.get("answer")
        if not response_text:
            raise ValueError("Serviciul LLM a returnat răspuns gol.")

        sources = response_data.get("sources", [])
        suggestions = response_data.get("suggestions", [])

        try:
            session.add(
                QuestionsHistory(
                    user_id=str(current_profile.id),
                    question=request.message,
                    answer=response_text,
                    pdf_id="campus-chat",
                )
            )
            await session.commit()
        except Exception:
            await session.rollback()

        return ChatResponse(
            response=response_text,
            model="InsideUGAL Campus Assistant",
            status="success",
            sources=sources,
            suggestions=suggestions,
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

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="InsideUGAL AI a eșuat procesarea cererii.",
        ) from exc