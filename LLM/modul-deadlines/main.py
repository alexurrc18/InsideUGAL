import os
import json
import uuid
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
# 1. INITIALIZARE SI CONFIGURARE
# ---------------------------------------------------------
# Obtinem calea absoluta catre fisierul .env din acelasi director cu main.py
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")

# Incarcam variabilele de mediu, fortand suprascrierea celor existente (override=True)
print(f"📂 Incarcare configuratie din: {env_path}")
load_dotenv(dotenv_path=env_path, override=True)

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError(f"GEMINI_API_KEY lipseste din fisierul .env la calea: {env_path}!")

# Curatam eventuale spatii sau ghilimele accidentale
API_KEY = API_KEY.strip().strip("'").strip('"')

client = genai.Client(api_key=API_KEY)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Modulul Smart Task Extractor (UGAL) a pornit...")
    yield
    print("🛑 Modulul se opreste...")

app = FastAPI(
    title="InsideUGAL - Smart Task Extractor API",
    description="Microserviciu LLM pentru extragerea datelor structurate din anunturi academice.",
    version="1.1.0",
    lifespan=lifespan
)

# --- ADAUGARE NOUA: Configurare CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite oricarei aplicatii de frontend sa comunice cu acest API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOGICA DE BAZA DE DATE LOCALA ---
DEADLINES_STORAGE_PATH = os.path.join(current_dir, "extracted_deadlines.json")

def save_deadline_to_local_storage(deadline_data: dict):
    deadlines = []
    if os.path.exists(DEADLINES_STORAGE_PATH):
        try:
            with open(DEADLINES_STORAGE_PATH, "r", encoding="utf-8") as f:
                deadlines = json.load(f)
        except Exception:
            deadlines = []
            
    deadlines.append(deadline_data)
    with open(DEADLINES_STORAGE_PATH, "w", encoding="utf-8") as f:
        json.dump(deadlines, f, indent=4, ensure_ascii=False)

# ---------------------------------------------------------
# 2. SCHEME PYDANTIC (Pentru Request si Response)
# ---------------------------------------------------------
class AnnouncementRequest(BaseModel):
    text: str = Field(..., description="Textul brut al anuntului postat de profesor")

class ExtractedTaskResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="ID unic generat automat")
    data_generare: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Data si ora cand a fost extras")
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
    return {"status": "ok", "service": "Smart Task Extractor v1.1", "cors": "enabled"}

@app.post("/api/v1/extract-tasks", response_model=ExtractedTaskResponse)
async def extract_tasks(request: AnnouncementRequest):
    try:
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
            "Esti un asistent analitic strict pentru studentii unei facultati de inginerie. "
            "Rolul tau este sa analizezi anunturile academice. Fii atent la termeni precum: "
            "'colocviu', 'partial', 'laborator', 'proiect'. Extrage informatiile in formatul cerut, "
            "fara niciun text suplimentar."
        )

        # Modificarea principala: folosim 'await' si clientul asincron 'client.aio'
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash', 
            contents=f"{prompt_system}\n\nAnalizeaza urmatorul anunt:\n{request.text}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema,
                temperature=0.1 
            ),
        )

        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1].split("```")[0].strip()

        result_dict = json.loads(raw_text)
        
        # --- MODIFICARE AICI ---
        # Validam si injectam UUID-ul si Timestamp-ul trecand prin Pydantic
        task_complet = ExtractedTaskResponse(**result_dict)
        final_dict = task_complet.model_dump()
        
        # Salvam pe disc
        save_deadline_to_local_storage(final_dict)
        
        return final_dict

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la procesarea LLM: {str(e)}")

# --- ENDPOINT PENTRU FRONTEND: CITIREA CARDURILOR ---
@app.get("/api/v1/deadlines", response_model=List[ExtractedTaskResponse])
def get_all_extracted_deadlines():
    """Returneaza toate cardurile salvate"""
    if os.path.exists(DEADLINES_STORAGE_PATH):
        try:
            with open(DEADLINES_STORAGE_PATH, "r", encoding="utf-8") as f:
                deadlines = json.load(f)
                deadlines.sort(key=lambda x: x.get("data_generare", ""), reverse=True)
                return deadlines
        except Exception:
            return []
    return []

# --- ENDPOINT PENTRU FRONTEND: STERGEREA UNUI CARD ---
@app.delete("/api/v1/deadlines/{task_id}")
def delete_deadline(task_id: str):
    """Sterge un card pe baza ID-ului"""
    if not os.path.exists(DEADLINES_STORAGE_PATH):
        raise HTTPException(status_code=404, detail="Nu exista niciun card salvat.")
        
    try:
        with open(DEADLINES_STORAGE_PATH, "r", encoding="utf-8") as f:
            deadlines = json.load(f)
            
        new_deadlines = [task for task in deadlines if task.get("id") != task_id]
        
        if len(deadlines) == len(new_deadlines):
            raise HTTPException(status_code=404, detail="Task-ul nu a fost gasit.")
            
        with open(DEADLINES_STORAGE_PATH, "w", encoding="utf-8") as f:
            json.dump(new_deadlines, f, indent=4, ensure_ascii=False)
            
        return {"status": "success", "message": f"Task-ul {task_id} a fost sters."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)