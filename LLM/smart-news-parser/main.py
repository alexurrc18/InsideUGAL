import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from schemas import AnnouncementRequest, ExtractedAnnouncementInfo
from llm_service import LLMService

# ---------------------------------------------------------
# 0. CONFIGURARE LOGGING
# ---------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("smart-announcement-parser")

# ---------------------------------------------------------
# 1. INITIALIZARE
# ---------------------------------------------------------
current_dir = os.path.dirname(os.path.abspath(__file__))
local_env_path = os.path.join(current_dir, ".env")
load_dotenv(dotenv_path=local_env_path, override=True)

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY lipseste!")

# Curatare cheie
API_KEY = API_KEY.strip().strip("'").strip('"')

# Serviciu LLM
llm_service = LLMService(api_key=API_KEY)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Smart Announcement Parser v2.2 a pornit...")
    yield
    logger.info("🛑 Modulul se opreste...")

app = FastAPI(
    title="InsideUGAL - Smart Announcement Parser API",
    description="Middleware AI pentru extragerea datelor structurate din anunturi UGAL.",
    version="2.2.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 2. ENDPOINT-URI
# ---------------------------------------------------------
@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "Smart Announcement Parser v2.2",
        "capabilities": ["Source Detection", "Deadline Calculation", "Target Audience Extraction"]
    }

@app.post("/api/v1/extract-announcement-info", response_model=ExtractedAnnouncementInfo)
async def extract_announcement_info(request: AnnouncementRequest):
    """
    Endpoint principal care primeste textul brut al unui anunt
    si returneaza date structurate optimizate pentru aplicatie.
    """
    try:
        logger.info(f"📥 Primire cerere extractie info-anunt: {request.text[:50]}...")
        result = await llm_service.extract_announcement_info(request.text)
        return result
    except Exception as e:
        logger.error(f"❌ Eroare la procesarea anuntului: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Eroare la analiza AI: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    # Rulam pe portul 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
