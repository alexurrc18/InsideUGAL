import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile
from app.db.database import get_db
from app.models.models import Profile
from app.schemas.chat import (
    AskDocumentRequest,
    GenericLlmResponse,
)

router = APIRouter(prefix="/api/v1", tags=["LLM Features"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")


@router.post("/ask", response_model=GenericLlmResponse)
async def ask_document(
    request: AskDocumentRequest,
    current_profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    """
    Proxy endpoint pentru întrebări RAG pe PDF-uri.
    
    - ✅ Securizat cu JWT
    - ✅ Apelează LLM service la /api/v1/ask
    - ✅ Salvează în questions_history cu pdf_id
    - ✅ Error Handling: 503 pe orice eroare
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/ask",
                json={
                    "question": request.question,
                    "pdf_id": request.pdf_id,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            res_data = response.json()

        answer = res_data.get("answer", "")
        if not answer:
            raise ValueError("Serviciul LLM a returnat răspuns gol.")

        # ✅ SALVEAZĂ ÎN questions_history cu pdf_id
        try:
            await db.execute(
                text("""
                    INSERT INTO public.questions_history
                      (user_id, pdf_id, question, answer)
                    VALUES (:user_id, :pdf_id, :question, :answer)
                """),
                {
                    "user_id": str(current_profile.id),
                    "pdf_id": request.pdf_id,
                    "question": request.question,
                    "answer": answer,
                },
            )
            await db.commit()
        except Exception as db_exc:
            print(f"[WARN] Failed to save to questions_history: {db_exc}")
            await db.rollback()

        return GenericLlmResponse(result=answer)

    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": "InsideUGAL AI timeout."},
        ) from exc

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "InsideUGAL AI service error.",
                "provider_status": exc.response.status_code,
            },
        ) from exc

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": "InsideUGAL AI network error."},
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": "InsideUGAL AI processing error."},
        ) from exc
