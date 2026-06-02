from fastapi import APIRouter, HTTPException, Depends
from pathlib import Path
import sys
from typing import List

ROOT_DIR = Path(__file__).resolve().parents[2]
LLM_DIR = Path(__file__).resolve().parents[1]
CURRENT_DIR = Path(__file__).resolve().parent
for path in (CURRENT_DIR, LLM_DIR, ROOT_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from app.schemas.chat import ChatRequest, ChatResponse

# Folosim funcția centralizată de apel LLM care are Circuit Breaker și Cache
from modul_marius.functions import llm_functions

router = APIRouter(prefix="/api/v1/chat", tags=["Chatbot"])

SYSTEM_PROMPT = """Ești InsideUGAL AI, asistentul virtual al studenților de la Universitatea „Dunărea de Jos” din Galați.
Misiunea ta este să ajuți cu informații despre orar, cantină, hartă și regulamente.
Fii prietenos și profesional. Dacă nu știi ceva, îndrumă-i către secretariat."""

def prepare_context(message: str, history: List) -> str:
    """Formatează istoricul pentru a păstra contextul conversației."""
    context = f"{SYSTEM_PROMPT}\n\n"
    for msg in history:
        role = "Student" if msg.role == "user" else "InsideUGAL AI"
        context += f"{role}: {msg.content}\n"
    context += f"Student: {message}\nInsideUGAL AI:"
    return context

@router.post("/", response_model=ChatResponse)
async def ask_chatbot(request: ChatRequest):
    """
    Endpoint-ul principal pentru comunicarea cu InsideUGAL AI.
    """
    try:
        # 1. Pregătim prompt-ul cu istoric
        full_prompt = prepare_context(request.message, request.history)

        # 2. Apelăm motorul LLM (Marius's module)
        # _call se ocupă intern de logging, retry și cache
        response_text = llm_functions._call(full_prompt, function_name="chat_general")
        
        return ChatResponse(
            response=response_text,
            model=llm_functions.GEMINI_MODEL,
            usage={"info": "Logged in Supabase"},
            status="success"
        )
    
    except Exception as e:
        # Error handling conform todo.md
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "InsideUGAL AI este momentan indisponibil",
                "technical_details": str(e)
            }
        )