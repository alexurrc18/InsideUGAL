from fastapi import APIRouter, HTTPException
from typing import List
import httpx
import os
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/v1/chat", tags=["Chatbot"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")

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

        # 2. Apelăm serviciul LLM via HTTP
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/chat",
                json={"prompt": full_prompt},
                timeout=30.0
            )
            response.raise_for_status()
            response_data = response.json()
            response_text = response_data["response"]
        
        return ChatResponse(
            response=response_text,
            model="gemini-2.5-flash",
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