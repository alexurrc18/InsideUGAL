import os
import uuid
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.chat import (
    ExtractTasksRequest,
    AskDocumentRequest,
    PdfOperationRequest,
    UploadPdfResponse,
    GenericLlmResponse
)
from LLM.modul_marius.functions import llm_functions
from LLM.smart_news_parser.llm_service import LLMService

logger = logging.getLogger("app.llm_features")

router = APIRouter(prefix="/api/v1", tags=["LLM Features"])

# Inițializăm serviciul cu cheia din env
API_KEY = os.getenv("GEMINI_API_KEY")
task_extractor = LLMService(api_key=API_KEY) if API_KEY else None

@router.get("/")
async def health_check():
    return {"status": "online", "service": "InsideUGAL LLM Engine"}

@router.post("/extract-tasks")
async def extract_tasks(request: ExtractTasksRequest):
    """Extrage date structurate dintr-un anunț academic folosind Gemini."""
    if not task_extractor:
        raise HTTPException(status_code=500, detail="Serviciul LLM nu este configurat (lipsește API Key)")
    try:
        # Apelăm extract_announcement_info din llm_service.py
        result = await task_extractor.extract_announcement_info(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-pdf", response_model=UploadPdfResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Încarcă un PDF, îl fragmentează și îl indexează în Chroma DB pentru RAG."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sunt acceptate doar fișiere PDF.")
    
    pdf_id = str(uuid.uuid4())
    upload_dir = os.path.join("LLM", "modul-marius", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_path = os.path.join(upload_dir, f"{pdf_id}.pdf")
    
    with open(temp_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    try:
        # Indexare în baza de date vectorială
        llm_functions.load_pdf_into_rag(temp_path, pdf_id)
        return UploadPdfResponse(pdf_id=pdf_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare indexare: {str(e)}")

@router.post("/ask", response_model=GenericLlmResponse)
async def ask_document(request: AskDocumentRequest):
    """Răspunde la întrebări bazându-se EXCLUSIV pe un PDF indexat anterior."""
    try:
        answer = llm_functions.answer_question(request.question, request.pdf_id, request.language)
        return GenericLlmResponse(result=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summary", response_model=GenericLlmResponse)
async def get_summary(request: PdfOperationRequest):
    """Generează un rezumat structurat (Idei, Concepte, Key takeaways) din PDF."""
    try:
        summary = llm_functions.generate_summary(request.pdf_id, request.language)
        return GenericLlmResponse(result=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz")
async def get_quiz(request: PdfOperationRequest):
    """Generează un set de întrebări tip grilă bazat pe conținutul PDF-ului."""
    try:
        quiz = llm_functions.generate_quiz(request.pdf_id, request.language)
        return {"questions": quiz, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))