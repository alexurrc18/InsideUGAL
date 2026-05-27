import os
import sys
import uuid
import logging
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
MODUL_DEADLINES = BASE_DIR / "modul-deadlines"
MODUL_MARIUS = BASE_DIR / "modul-marius"

# Load environment variables from modul-deadlines or repo root
env_path = MODUL_DEADLINES / ".env"
if not env_path.exists():
    env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path, override=True)


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

mod_deadlines_schemas = load_module(
    "mod_deadlines_schemas",
    MODUL_DEADLINES / "schemas.py",
    extra_paths=[MODUL_DEADLINES],
)
old_schemas = sys.modules.get("schemas")
sys.modules["schemas"] = mod_deadlines_schemas
mod_deadlines_service = load_module(
    "mod_deadlines_service",
    MODUL_DEADLINES / "llm_service.py",
    extra_paths=[MODUL_DEADLINES],
)
if old_schemas is None:
    sys.modules.pop("schemas", None)
else:
    sys.modules["schemas"] = old_schemas

mod_marius_schemas = load_module(
    "mod_marius_schemas",
    MODUL_MARIUS / "schemas.py",
    extra_paths=[MODUL_MARIUS],
)
old_schemas = sys.modules.get("schemas")
sys.modules["schemas"] = mod_marius_schemas
mod_marius_functions = load_module(
    "mod_marius_functions",
    MODUL_MARIUS / "functions" / "llm_functions.py",
    extra_paths=[MODUL_MARIUS, MODUL_MARIUS / "functions"],
)
if old_schemas is None:
    sys.modules.pop("schemas", None)
else:
    sys.modules["schemas"] = old_schemas

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY este necesar pentru LLM combined service.")

logger = logging.getLogger("llm-integration")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

llm_service = mod_deadlines_service.LLMService(api_key=API_KEY)

app = FastAPI(
    title="InsideUGAL LLM Integrated Service",
    description="Serviciu FastAPI care combină extragerea de task-uri UGAL și funcționalitățile PDF/quiz/RAG.",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = MODUL_MARIUS / "uploads"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "InsideUGAL LLM Integrated Service",
        "endpoints": [
            "/api/v1/extract-tasks",
            "/api/v1/upload-pdf",
            "/api/v1/ask",
            "/api/v1/summary",
            "/api/v1/quiz",
        ],
    }


@app.post("/api/v1/extract-tasks", response_model=mod_deadlines_schemas.ExtractedTaskResponse)
async def extract_tasks(request: mod_deadlines_schemas.AnnouncementRequest):
    try:
        logger.info("Primire cerere extractie task-uri din anunt.")
        return await llm_service.extract_tasks(request.text)
    except Exception as exc:
        logger.error("Eroare la extragerea task-urilor: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/upload-pdf")
async def upload_pdf(pdf: UploadFile = File(...)):
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Fisierul trebuie sa fie PDF.")

    pdf_id = str(uuid.uuid4())
    pdf_path = UPLOAD_FOLDER / f"{pdf_id}.pdf"

    try:
        with pdf_path.open("wb") as f:
            f.write(await pdf.read())

        mod_marius_functions.load_pdf_into_rag(str(pdf_path), pdf_id)
        return {"pdf_id": pdf_id, "message": "PDF incarcat si indexat in vector DB."}
    except Exception as exc:
        logger.error("Eroare la incarcare PDF: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/ask", response_model=mod_marius_schemas.AnswerQuestionOutput)
async def ask_question(request: mod_marius_schemas.AnswerQuestionInput):
    try:
        answer = mod_marius_functions.answer_question(request.question, request.pdf_id)
        return mod_marius_schemas.AnswerQuestionOutput(answer=answer)
    except Exception as exc:
        logger.error("Eroare la raspuns intrebare: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/summary", response_model=mod_marius_schemas.GenerateSummaryOutput)
async def summary(request: mod_marius_schemas.GenerateSummaryInput):
    try:
        summary_text = mod_marius_functions.generate_summary(request.pdf_id)
        return mod_marius_schemas.GenerateSummaryOutput(summary=summary_text)
    except Exception as exc:
        logger.error("Eroare la generare rezumat: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/quiz", response_model=mod_marius_schemas.GenerateQuizOutput)
async def quiz(request: mod_marius_schemas.GenerateQuizInput):
    try:
        quiz_responses = mod_marius_functions.generate_quiz(request.pdf_id)
        return mod_marius_schemas.GenerateQuizOutput(questions=quiz_responses)
    except Exception as exc:
        logger.error("Eroare la generare quiz: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("combined_app:app", host="127.0.0.1", port=8000, reload=True)
