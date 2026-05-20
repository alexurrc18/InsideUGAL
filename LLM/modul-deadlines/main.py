import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

# ---------------------------------------------------------
# 1. INITIALIZARE SI CONFIGURARE
# ---------------------------------------------------------
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY lipseste din fisierul .env!")

client = genai.Client(api_key=API_KEY)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Modulul Smart Task Extractor (UGAL) a pornit...")
    yield
    print("🛑 Modulul se opreste...")

app = FastAPI(
    title="InsideUGAL - Smart Task Extractor API",
    description="Microserviciu LLM pentru extragerea datelor structurate din anunturi academice.",
    version="1.0.0",
    lifespan=lifespan
)

# ---------------------------------------------------------
# 2. SCHEME PYDANTIC (Pentru Request si Response)
# ---------------------------------------------------------
class AnnouncementRequest(BaseModel):
    text: str = Field(..., description="Textul brut al anuntului postat de profesor")

class ExtractedTaskResponse(BaseModel):
    materie: str = Field(description="Numele materiei la care se face referire")
    deadline_absolut: Optional[str] = Field(None, description="Data si ora limita (ex: YYYY-MM-DD HH:MM)")
    dimensiune_echipa: Optional[int] = Field(None, description="Numarul maxim de membri permisi")
    taskuri_extrase: List[str] = Field(description="Lista cu actiunile concrete pe care trebuie sa le faca studentul")
    penalizari_sau_reguli: List[str] = Field(default=[], description="Reguli stricte, penalizari la nota sau conventii")

# ---------------------------------------------------------
# 3. ENDPOINT-URILE API-ULUI
# ---------------------------------------------------------
@app.get("/")
def health_check():
    return {"status": "ok", "service": "Smart Task Extractor v1"}

@app.post("/api/v1/extract-tasks", response_model=ExtractedTaskResponse)
def extract_tasks(request: AnnouncementRequest):
    """
    Primeste un text brut si foloseste Gemini 2.0 Flash pentru a returna
    un obiect JSON perfect structurat cu deadline-uri si task-uri.
    """
    try:
        # Schema strictă transmisă modelului
        schema = {
            "type": "OBJECT",
            "properties": {
                "materie": {"type": "STRING"},
                "deadline_absolut": {"type": "STRING"},
                "dimensiune_echipa": {"type": "INTEGER"},
                "taskuri_extrase": {"type": "ARRAY", "items": {"type": "STRING"}},
                "penalizari_sau_reguli": {"type": "ARRAY", "items": {"type": "STRING"}}
            },
            "required": ["materie", "taskuri_extrase"]
        }

        prompt_system = (
            "Esti un asistent analitic strict. Rolul tau este sa analizezi anunturile academice "
            "si sa extragi informatiile fix in formatul cerut, fara text suplimentar."
        )

        response = client.models.generate_content(
            model='gemini-1.5-flash', # <-- Aici am modificat
            contents=f"{prompt_system}\n\nAnalizeaza urmatorul anunt:\n{request.text}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema,
                temperature=0.1
            ),
        )

        # Gemini returnează JSON sub formă de text, pe care îl parsam înapoi în dicționar
        result_dict = json.loads(response.text)
        
        # FastAPI și Pydantic se vor asigura că dict-ul respectă clasa ExtractedTaskResponse
        return result_dict

    except Exception as e:
        # Capturăm orice eroare (ex: timeout la API) pentru a nu pica serverul
        raise HTTPException(status_code=500, detail=f"Eroare la procesarea LLM: {str(e)}")

# Pentru pornire rapida in mod dezvoltare
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)