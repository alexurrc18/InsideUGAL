import os
import json
import uuid
import logging
from enum import Enum
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types
from datetime import datetime

# ---------------------------------------------------------
# 0. CONFIGURARE LOGGING
# ---------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("smart-task-extractor-mobile")

# ---------------------------------------------------------
# 1. INITIALIZARE SI CONFIGURARE
# ---------------------------------------------------------
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")

logger.info(f"📂 Incarcare configuratie din: {env_path}")
load_dotenv(dotenv_path=env_path, override=True)

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError(f"GEMINI_API_KEY lipseste din fisierul .env la calea: {env_path}!")

API_KEY = API_KEY.strip().strip("'").strip('"')
client = genai.Client(api_key=API_KEY)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Middleware-ul Smart Task Extractor (Mobile Ready) a pornit...")
    yield
    logger.info("🛑 Modulul se opreste...")

app = FastAPI(
    title="InsideUGAL - Smart Task Extractor API",
    description="Middleware AI pentru extragerea datelor optimizate pentru Mobile & Dashboard.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 2. ENUMS SI SCHEME PYDANTIC (Mobile-Optimized)
# ---------------------------------------------------------
class TipEveniment(str, Enum):
    PROIECT = "proiect"
    LABORATOR = "laborator"
    PARTIAL = "partial"
    COLOCVIU = "colocviu"
    ANUNT_GENERAL = "anunt_general"

class NivelUrgenta(str, Enum):
    RIDICATA = "ridicata"
    MEDIE = "medie"
    SCAZUTA = "scazuta"

class AnnouncementRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=5000, description="Textul brut al anuntului postat de profesor")

class GeminiTaskOutput(BaseModel):
    """Schema extinsa pentru datele extrase direct de LLM"""
    materie: str = Field(description="Numele complet sau acronimul materiei")
    tip_eveniment: TipEveniment = Field(description="Clasificarea stricta a anuntului (ex: 'proiect', 'laborator')")
    urgenta_estimata: NivelUrgenta = Field(description="Nivelul de prioritate calculat ('ridicata', 'medie', 'scazuta')")
    taguri_cheie: List[str] = Field(description="Cuvinte-cheie extrase (ex: 'Git', 'UML') pentru etichete in UI")
    deadline_absolut: Optional[str] = Field(None, description="Data si ora limita (ex: YYYY-MM-DD HH:MM)")
    dimensiune_echipa: Optional[int] = Field(None, description="Numarul maxim de membri permisi")
    rezumat_notificare: str = Field(description="Text de max 80 caractere pentru notificari Push Mobile")
    taskuri_extrase: List[str] = Field(description="Lista cu actiuni concrete de facut")
    penalizari_sau_reguli: List[str] = Field(default=[], description="Reguli stricte sau penalizari la nota")
    linkuri_utile: List[str] = Field(default=[], description="URL-uri detectate in text (Teams, GitHub, etc)")

class ExtractedTaskResponse(GeminiTaskOutput):
    """Schema completa pentru raspunsul API (include ID si Timestamp)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="ID unic generat automat")
    data_generare: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Data si ora cand a fost extras")

# ---------------------------------------------------------
# 3. ENDPOINT-URI
# ---------------------------------------------------------
@app.get("/")
def health_check():
    return {"status": "ok", "service": "Smart Task Extractor v2.0 (Mobile Ready)", "cors": "enabled"}

@app.post("/api/v1/extract-tasks", response_model=ExtractedTaskResponse)
async def extract_tasks(request: AnnouncementRequest):
    try:
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        prompt_system = (
            "Esti un asistent analitic strict pentru o facultate de inginerie. "
            "Rolul tau este sa procesezi anunturile profesorilor si sa generezi date structurate optimizate pentru o aplicatie mobila studenteasca.\n\n"
            f"Data curenta pentru calcularea deadline-urilor este {now}.\n\n"
            "Reguli stricte de completare:\n"
            "1. `tip_eveniment`: Alege strict din ('proiect', 'laborator', 'partial', 'colocviu', 'anunt_general').\n"
            "2. `urgenta_estimata`: Seteaza 'ridicata' pt < 3 zile, 'medie' pt saptamana curenta, 'scazuta' restul.\n"
            "3. `rezumat_notificare`: Creaza o singura propozitie ultra-scurta, fara formule de politete (ex: 'Predare Proiect IP pe 15.06').\n"
            "4. `taguri_cheie`: Extrage tehnologii/cerinte scurte (max 2 cuvinte/tag).\n"
            "5. `linkuri_utile`: Extrage DOAR URL-uri valide gasite in text."
        )

        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash', 
            contents=f"{prompt_system}\n\nAnalizeaza urmatorul anunt:\n{request.text}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiTaskOutput,
                temperature=0.1 
            ),
        )

        if hasattr(response, 'parsed') and isinstance(response.parsed, GeminiTaskOutput):
            result_dict = response.parsed.model_dump()
        else:
            raw_text = response.text
            if not isinstance(raw_text, str):
                raw_text = str(raw_text)
            
            raw_text = raw_text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
            result_dict = json.loads(raw_text, strict=False)
        
        # Validam prin schema extinsa si returnam direct (fara a mai salva pe disc local)
        task_complet = ExtractedTaskResponse(**result_dict)
        return task_complet.model_dump()

    except Exception as e:
        logger.error(f"Eroare la procesarea LLM: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Eroare la procesarea LLM: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)