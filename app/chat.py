from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.chat import ChatRequest, ChatResponse

# Importăm logica centrală LLM (care are Circuit Breaker și Cache)
from LLM.modul_marius.functions import llm_functions

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
    Endpoint-ul principal pentru chatbot-ul InsideUGAL.
    """
    try:
        # 1. Pregătim prompt-ul cu istoric
        full_prompt = prepare_context(request.message, request.history)

        # 2. Apelăm motorul LLM (Modulul Marius)
        # _call se ocupă intern de logging în Supabase, retry și cache
        response_text = llm_functions._call(full_prompt, function_name="chat_general")
        
        return ChatResponse(
            response=response_text,
            model=llm_functions.GEMINI_MODEL,
            usage={"info": "Logged in Supabase"},
            status="success"
        )
    
    except Exception as e:
        # Error handling conform standardelor proiectului
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "InsideUGAL AI este momentan indisponibil",
                "technical_details": str(e)
            }
        )