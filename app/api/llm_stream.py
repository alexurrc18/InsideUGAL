import asyncio
import json
import logging
import os
import uuid
from typing import AsyncGenerator

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.auth_deps import oauth2_scheme, verify_supabase_token
from app.db.database import get_db
from app.models.models import Profile, QuestionsHistory
from app.rate_limit import limiter, LLM_RATE_LIMIT

logger = logging.getLogger("app.api.llm_stream")

router = APIRouter(prefix="/api/v1/llm", tags=["LLM"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")


async def get_current_profile_optional(
    token: str | None = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
) -> Profile | None:
    """Returnează `Profile` dacă există token valid, altfel `None` (pentru requests anonime/tests)."""
    if token is None:
        return None

    token_value = token.strip()
    if len(token_value) >= 2 and (
        (token_value.startswith('"') and token_value.endswith('"'))
        or (token_value.startswith("'") and token_value.endswith("'"))
    ):
        token_value = token_value[1:-1]

    try:
        payload = verify_supabase_token(token_value)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    result = await session.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalars().first()
    if profile is None or not profile.is_active:
        raise HTTPException(status_code=403, detail="Active profile not found.")
    return profile


def _chunk_text(text: str, chunk_size: int = 10) -> list[str]:
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]


async def _stream_response(
    answer: str, user_question: str, current_profile: Profile, session: AsyncSession
) -> AsyncGenerator[str, None]:
    for chunk in _chunk_text(answer, 10):
        yield f"data: {json.dumps({'content': chunk, 'cached': False})}\n\n"
        await asyncio.sleep(0.05)

    try:
        # Salvăm doar dacă avem un user_id valid UUID (profil autentificat)
        try:
            uuid.UUID(str(current_profile.id))
            valid_user = True
        except Exception:
            valid_user = False

        if valid_user:
            session.add(
                QuestionsHistory(
                    user_id=str(current_profile.id),
                    question=user_question,
                    answer=answer,
                    pdf_id="campus-chat",
                )
            )
            await session.commit()
    except Exception as db_exc:
        # Nu blocăm stream-ul pentru probleme la salvarea istoricului.
        try:
            await session.rollback()
        except Exception:
            logger.exception("Rollback eșuat după eroarea DB: %s", db_exc)
        logger.exception("Nu s-a putut salva QuestionsHistory: %s", db_exc)
        yield f"data: {json.dumps({'warning': 'Nu s-a putut salva istoricul conversatiei.'})}\n\n"

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

                # `resp.aiter_lines()` poate fi fie un async iterator (real httpx),
                # fie (în teste) o coroutine care returnează o listă. Acceptăm ambele.
                lines_obj = resp.aiter_lines()
                if asyncio.iscoroutine(lines_obj):
                    # test mocks return a regular list
                    lines_iterable = await lines_obj
                    sync_iter = True
                else:
                    lines_iterable = lines_obj
                    sync_iter = False

                if sync_iter:
                    for line in lines_iterable:
                        if not line.startswith("data: "):
                            continue

                        payload_line = line[len("data: "):]
                        # process below (identical to async branch)
                        # Semnal de final: suportăm fie stringul literal "[DONE]", fie un obiect JSON cu 'done': True
                        if payload_line.strip() == "[DONE]":
                            break

                        try:
                            chunk_data = json.loads(payload_line)
                        except json.JSONDecodeError:
                            continue

                        if isinstance(chunk_data, dict) and chunk_data.get("done"):
                            final_meta = chunk_data
                            break

                        content = ""
                        if isinstance(chunk_data, dict):
                            content = chunk_data.get("content") or chunk_data.get("token") or ""

                        if content:
                            full_answer += content
                            yield f"data: {json.dumps({'content': content, 'cached': False})}\n\n"
                else:
                    async for line in lines_iterable:
                        if not line.startswith("data: "):
                            continue

                        payload_line = line[len("data: "):]

                        # Semnal de final: suportăm fie stringul literal "[DONE]", fie un obiect JSON cu 'done': True
                        if payload_line.strip() == "[DONE]":
                            break

                        try:
                            chunk_data = json.loads(payload_line)
                        except json.JSONDecodeError:
                            continue

                        # Final metadata (sources/suggestions/link)
                        if isinstance(chunk_data, dict) and chunk_data.get("done"):
                            # ultima parte va fi procesată în afara buclei
                            # dar putem transmite eventuale mesaje finale către client
                            final_meta = chunk_data
                            break

                        # Acceptăm fie 'content' fie 'token' ca payload
                        content = ""
                        if isinstance(chunk_data, dict):
                            content = chunk_data.get("content") or chunk_data.get("token") or ""

                        if content:
                            full_answer += content
                            # Retransmitem evenimentul SSE către client
                            yield f"data: {json.dumps({'content': content, 'cached': False})}\n\n"

        # Salvăm răspunsul complet în istoricul de întrebări (non-blocking)
        if full_answer:
            try:
                # Salvăm doar pentru useri cu UUID valid
                try:
                    uuid.UUID(str(current_profile.id))
                    valid_user = True
                except Exception:
                    valid_user = False

                if valid_user:
                    session.add(
                        QuestionsHistory(
                            user_id=str(current_profile.id),
                            question=question,
                            answer=full_answer,
                            pdf_id="campus-chat",
                        )
                    )
                    await session.commit()
            except Exception as db_exc:
                try:
                    await session.rollback()
                except Exception:
                    logger.exception("Rollback eșuat după eroarea DB: %s", db_exc)
                logger.exception("Nu s-a putut salva QuestionsHistory (stream): %s", db_exc)
                yield f"data: {json.dumps({'warning': 'Nu s-a putut salva istoricul conversatiei.'})}\n\n"
    except Exception as e:
        await session.rollback()
        # Trimitem eroarea către client înainte de a închide
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        return

    # Dacă LLM-ul a transmis meta final printr-un obiect JSON cu 'done', retransmitem aceea informație
    try:
        if 'final_meta' in locals() and isinstance(final_meta, dict):
            # Normalize field names: 'sources', 'suggestions', 'link', '_from_fallback'
            yield f"data: {json.dumps({'done': True, 'sources': final_meta.get('sources', []), 'suggestions': final_meta.get('suggestions', []), 'link': final_meta.get('link', ''), '_from_fallback': final_meta.get('_from_fallback', False)})}\n\n"
    except Exception:
        logger.exception("Eroare la transmiterea metadatelor finale.")

    yield "data: [DONE]\n\n"


class DummyProfile:
    id: str
    is_active: bool


@router.post("/ask/stream")
@limiter.limit(LLM_RATE_LIMIT)
async def ask_chatbot_stream(
    body: StreamRequest,
    request: Request,
    current_profile: Profile | DummyProfile | None = Depends(get_current_profile_optional),
    session: AsyncSession = Depends(get_db),
):
    try:
        # If current_profile is not provided (tests / anonymous), create a lightweight dummy profile
        if current_profile is None:
            dummy = DummyProfile()
            dummy.id = "anonymous"
            dummy.is_active = True
            current_profile = dummy

        # Verificăm cache-ul local (QuestionsHistory) pentru a răspunde rapid dacă avem deja un răspuns
        cached_row = None
        # Doar dacă avem un id valid UUID pentru user (profil autentic), facem lookup în DB
        try:
            uuid.UUID(str(current_profile.id))
            do_cache_lookup = True
        except Exception:
            do_cache_lookup = False

        if do_cache_lookup:
            cached = await session.execute(
                select(QuestionsHistory)
                .where(QuestionsHistory.user_id == str(current_profile.id))
                .where(QuestionsHistory.question == body.question.strip())
                .order_by(QuestionsHistory.created_at.desc())
                .limit(1)
            )
            cached_row = cached.scalar_one_or_none()
        if cached_row:
            # Stream-ăm răspunsul din cache (marcat ca 'cached')
            return StreamingResponse(
                _stream_response(cached_row.answer, body.question, current_profile, session),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "content-type": "text/event-stream",
                },
            )
        return StreamingResponse(
            _real_stream_response(body.question, body.history, current_profile, session),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "content-type": "text/event-stream",
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
