from __future__ import annotations

import os
import sys
import uuid
import logging
import tempfile
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi import Request, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from llm_optimizer import LLMOptimizer

BASE_DIR = Path(__file__).resolve().parent
SRC_DIR = BASE_DIR / "src"
SMART_NEWS_PARSER = SRC_DIR / "smart-news-parser"
MODUL_MARIUS      = SRC_DIR / "modul-marius"
CHATBOT_MARIUS    = SRC_DIR / "ChatBot"

# Load environment variables from the LLM root .env
# In Docker, compose environment variables should take precedence over local .env values.
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path, override=False)


def load_module(name: str, path: Path, extra_paths: list[Path] | None = None):
    old_sys_path = list(sys.path)
    try:
        if extra_paths:
            for p in reversed(extra_paths):
                sys.path.insert(0, str(p))
        spec = spec_from_file_location(name, path)
        module = module_from_spec(spec)
        assert spec and spec.loader
        sys.modules[name] = module
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path[:] = old_sys_path

smart_news_image_service = load_module(
    "smart_news_image_service",
    SMART_NEWS_PARSER / "image_service_v2.py",
    extra_paths=[SMART_NEWS_PARSER],
)
mod_marius_schemas = load_module(
    "mod_marius_schemas",
    MODUL_MARIUS / "schemas.py",
    extra_paths=[MODUL_MARIUS],
)
sys.modules["schemas"] = mod_marius_schemas
mod_marius_functions = load_module(
    "mod_marius_functions",
    MODUL_MARIUS / "functions" / "llm_functions.py",
    extra_paths=[MODUL_MARIUS, MODUL_MARIUS / "functions"],
)
sys.modules.pop("schemas", None)

smart_news_schemas = load_module(
    "smart_news_schemas",
    SMART_NEWS_PARSER / "parser_schemas.py",
    extra_paths=[SMART_NEWS_PARSER],
)
sys.modules["schemas"] = mod_marius_schemas
sys.modules["llm_functions"] = mod_marius_functions
smart_news_service = load_module(
    "smart_news_service",
    SMART_NEWS_PARSER / "llm_service.py",
    extra_paths=[SMART_NEWS_PARSER],
)
sys.modules.pop("schemas", None)
sys.modules.pop("llm_functions", None)

# Salvează cache-ul modul-marius înainte să fie suprascris de ChatBot/cache.py
_modul_marius_cache = sys.modules.get("cache")
sys.modules.pop("cache", None)
campus_chat_service = load_module(
    "campus_chat_service",
    CHATBOT_MARIUS / "campus_chat_service.py",
    extra_paths=[CHATBOT_MARIUS],
)
# Restaurează cache-ul modul-marius în sys.modules pentru apelurile ulterioare
if _modul_marius_cache is not None:
    sys.modules["cache"] = _modul_marius_cache

rate_limiter_module = load_module(
    "rate_limiter",
    CHATBOT_MARIUS / "rate_limiter.py",
    extra_paths=[CHATBOT_MARIUS],
)

API_KEY = os.getenv("GEMINI_API_KEY", "").strip().strip("'").strip('"')
if not API_KEY:
    raise ValueError("GEMINI_API_KEY este necesar pentru LLM combined service.")

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "").strip().strip("'").strip('"')

logger = logging.getLogger("llm-integration")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

llm_service = smart_news_service.LLMService()
if HF_API_KEY:
    image_service = smart_news_image_service.ImageServiceV2(hf_api_key=HF_API_KEY)
else:
    image_service = None
    logger.warning(
        "HUGGINGFACE_API_KEY lipseste — generarea de bannere este dezactivata. "
        "Adauga cheia in .env pentru a activa ImageServiceV2."
    )
llm_optimizer_service = LLMOptimizer(api_key=API_KEY, supabase_client=mod_marius_functions.supabase_client)

app = FastAPI(
    title="InsideUGAL LLM Integrated Service",
    description="Serviciu FastAPI care combină extragerea de task-uri UGAL, funcționalitățile PDF/RAG și asistentul virtual campus.",
    version="2.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter_module.chat_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Prea multe cereri. Te rugăm să aștepți.")


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "InsideUGAL LLM Integrated Service",
        "endpoints": [
            "/api/v1/extract-announcement-info",
            "/api/v1/generate-banner",
            "/api/v1/upload-pdf",
            "/api/v1/ask",
            "/api/v1/summary",
            "/api/v1/delete-pdf/{pdf_id}",
            "/api/v1/campus-chat",
            "/api/v1/campus-chat/stream",
        ],
    }


@app.post("/api/v1/extract-announcement-info", response_model=smart_news_schemas.ExtractedAnnouncementInfo)
async def extract_announcement_info(request: smart_news_schemas.AnnouncementRequest):  # type: ignore
    try:
        logger.info("Primire cerere extractie info-anunt.")
        return await llm_service.extract_announcement_info(request.text)
    except Exception as exc:
        logger.error("Eroare la extragerea informatiilor din anunt: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/generate-banner", response_model=smart_news_image_service.ImageGenerationResult)
async def generate_banner(info: smart_news_schemas.ExtractedAnnouncementInfo):
    if image_service is None:
        raise HTTPException(
            status_code=503,
            detail="Generarea de bannere este dezactivata — HUGGINGFACE_API_KEY lipseste din configuratie."
        )
    try:
        logger.info("Primire cerere generare banner pentru eveniment.")
        result = await image_service.generate_announcement_banner(info)
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.error_message)
            
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Eroare la generarea banner-ului: %s", exc)
        raise HTTPException(status_code=500, detail=f"Eroare interna la generarea imaginii: {str(exc)}")


def process_pdf_background(pdf_path: str, pdf_id: str):
    """Functie care ruleaza in background pentru a procesa si indexa PDF-ul."""
    try:
        logger.info("BG_TASK: Pornire indexare RAG pentru pdf_id=%s", pdf_id)
        mod_marius_functions.load_pdf_into_rag(pdf_path, pdf_id)
        logger.info("BG_TASK: Indexare RAG finalizata pentru pdf_id=%s", pdf_id)
    except Exception as exc:
        logger.error("BG_TASK: Eroare la indexare RAG pentru %s: %s", pdf_id, exc)
    finally:
        # Curățăm mereu fișierul temporar local, indiferent dacă procesarea a reușit sau a eșuat
        path_obj = Path(pdf_path)
        if path_obj.exists():
            path_obj.unlink()


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".pptx"}

@app.post("/api/v1/upload-pdf")
async def upload_pdf(background_tasks: BackgroundTasks, pdf: UploadFile = File(...)):
    ext = os.path.splitext(pdf.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Format nesupорtat. Formate acceptate: {', '.join(ALLOWED_EXTENSIONS)}")

    pdf_id = str(uuid.uuid4())
    file_bytes = await pdf.read()

    # 1. Salvăm fișierul în Supabase Storage
    try:
        mod_marius_functions.supabase_client.storage.from_("documents").upload(
            path=f"{pdf_id}{ext}",
            file=file_bytes,
            file_options={"content-type": pdf.content_type or "application/octet-stream"}
        )
    except Exception as exc:
        logger.error("Eroare la upload in Supabase Storage: %s", exc)
        raise HTTPException(status_code=500, detail="Eroare la salvarea fisierului in cloud.")

    # 2. Fișier temporar pentru procesare AI
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp_file.write(file_bytes)
    temp_file.close()

    # 3. Procesare în background
    background_tasks.add_task(process_pdf_background, temp_file.name, pdf_id)

    return {"pdf_id": pdf_id, "message": "Documentul a fost primit si va fi procesat in background."}


@app.post("/api/v1/ask", response_model=mod_marius_schemas.AnswerQuestionOutput, dependencies=[Depends(check_rate_limit)])
def ask_question(request: mod_marius_schemas.AnswerQuestionInput):  # type: ignore
    # 1. Verificare Semantic Cache (rapid, fără cost API)
    cached_answer = llm_optimizer_service.get_cached_answer(request.question)
    if cached_answer:
        return mod_marius_schemas.AnswerQuestionOutput(answer=cached_answer)

    # 2. Filtru de Securitate Guardrails (doar pentru non-cached)
    if not llm_optimizer_service.check_prompt_safety(request.question):
        raise HTTPException(status_code=403, detail="Întrebarea a fost respinsă de filtrul de securitate.")

    try:
        answer = mod_marius_functions.answer_question(request.question, request.pdf_id)
        # 3. Salvare în cache după răspuns cu succes
        llm_optimizer_service.save_to_cache(request.question, answer)
        return mod_marius_schemas.AnswerQuestionOutput(answer=answer)
    except Exception as exc:
        logger.error("Eroare la raspuns intrebare: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/summary", response_model=mod_marius_schemas.GenerateSummaryOutput)
def summary(request: mod_marius_schemas.GenerateSummaryInput):  # type: ignore
    try:
        summary_text = mod_marius_functions.generate_summary(request.pdf_id)
        return mod_marius_schemas.GenerateSummaryOutput(summary=summary_text)
    except Exception as exc:
        logger.error("Eroare la generare rezumat: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.delete("/api/v1/delete-pdf/{pdf_id}")
async def delete_pdf(pdf_id: str):
    """Sterge fisierul fizic din Supabase Storage si vectorii din pgvector."""
    try:
        mod_marius_functions.supabase_client.storage.from_("documents").remove([f"{pdf_id}.pdf"])
        logger.info("Fisier sters din Supabase Storage: %s", pdf_id)
    except Exception as exc:
        logger.warning("Nu am putut sterge fisierul din Storage pentru %s: %s", pdf_id, exc)

    try:
        mod_marius_functions.delete_pdf_from_rag(pdf_id)
        logger.info("Vectori stersi din pgvector pentru pdf_id=%s", pdf_id)
    except Exception as exc:
        logger.warning("Nu am putut sterge vectorii pentru %s: %s", pdf_id, exc)

    return {"ok": True, "pdf_id": pdf_id}


# ── Campus Chat (Asistentul Virtual InsideUGAL) ──────────────────────────────

class CampusChatRequest(BaseModel):
    question: str


class CampusChatResponse(BaseModel):
    answer: str
    sources: list[str]
    suggestions: list[str]
    link: str = ""


@app.post("/api/v1/campus-chat", response_model=CampusChatResponse, dependencies=[Depends(check_rate_limit)])
def campus_chat(request: CampusChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Câmpul 'question' nu poate fi gol.")

    # 1. Verificare Semantic Cache (rapid, fără cost API)
    try:
        cached_answer = llm_optimizer_service.get_cached_answer(request.question)
    except Exception as cache_exc:
        logger.warning("Semantic cache error (ignorat): %s", cache_exc)
        cached_answer = None
    if cached_answer:
        return CampusChatResponse(
            answer=cached_answer,
            sources=["Memorie Cache (Răspuns stocat semantic)"],
            suggestions=[]
        )

    # 2. Filtru de Securitate Guardrails (doar pentru non-cached)
    if not llm_optimizer_service.check_prompt_safety(request.question):
        raise HTTPException(status_code=403, detail="Întrebarea a fost respinsă de filtrul de securitate.")

    try:
        result = campus_chat_service.campus_chat(question=request.question)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        # 3. Salvare în cache după răspuns cu succes
        llm_optimizer_service.save_to_cache(request.question, result["answer"])

        return CampusChatResponse(**result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Eroare campus-chat: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/campus-chat/stream", dependencies=[Depends(check_rate_limit)])
def campus_chat_stream(request: CampusChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Câmpul 'question' nu poate fi gol.")

    # 1. Verificare Semantic Cache (rapid, fără cost API)
    try:
        cached_answer = llm_optimizer_service.get_cached_answer(request.question)
    except Exception as cache_exc:
        logger.warning("Semantic cache error (ignorat): %s", cache_exc)
        cached_answer = None
    if cached_answer:
        return CampusChatResponse(
            answer=cached_answer,
            sources=["Memorie Cache (Răspuns stocat semantic)"],
            suggestions=[]
        )

    # 2. Filtru de Securitate Guardrails (doar pentru non-cached)
    if not llm_optimizer_service.check_prompt_safety(request.question):
        raise HTTPException(status_code=403, detail="Întrebarea a fost respinsă de filtrul de securitate.")

    return StreamingResponse(
        campus_chat_service.campus_chat_stream(question=request.question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("combined_app:app", host="127.0.0.1", port=8000, reload=True)