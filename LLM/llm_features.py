from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.chat import (
    ExtractTasksRequest, 
    AskDocumentRequest, 
    PdfOperationRequest,
    UploadPdfResponse,
    GenericLlmResponse
)
import os
import uuid
from LLM.modul_marius.functions import llm_functions
from LLM.smart_news_parser.llm_service import LLMService

router = APIRouter(prefix="/api/v1", tags=["LLM Features"])
API_KEY = os.getenv("GEMINI_API_KEY")
task_extractor = LLMService(api_key=API_KEY) if API_KEY else None

@router.get("/")
async def health_check():
    return {"status": "online", "service": "InsideUGAL LLM Engine"}

@router.post("/extract-tasks")
async def extract_tasks(request: ExtractTasksRequest):
    """Extrage task-uri structurate dintr-un anunț academic."""
    if not task_extractor:
        raise HTTPException(status_code=500, detail="LLM Service not configured.")
    try:
        result = await task_extractor.extract_announcement_info(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-pdf", response_model=UploadPdfResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Încarcă un PDF, îl fragmentează și îl stochează în baza vectorială Chroma."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Doar fișierele PDF sunt acceptate.")
    
    pdf_id = str(uuid.uuid4())
    temp_path = f"LLM/modul-marius/uploads/{pdf_id}.pdf"
    
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    with open(temp_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    try:
        llm_functions.load_pdf_into_rag(temp_path, pdf_id)
        return UploadPdfResponse(pdf_id=pdf_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la indexare: {str(e)}")

@router.post("/ask", response_model=GenericLlmResponse)
async def ask_document(request: AskDocumentRequest):
    """Răspunde la întrebări bazându-se EXCLUSIV pe conținutul PDF-ului specificat."""
    try:
        answer = llm_functions.answer_question(request.question, request.pdf_id, request.language)
        return GenericLlmResponse(result=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summary", response_model=GenericLlmResponse)
async def get_summary(request: PdfOperationRequest):
    """Generează un rezumat structurat (Idei principale, Concepte, Retenție)."""
    try:
        summary = llm_functions.generate_summary(request.pdf_id, request.language)
        return GenericLlmResponse(result=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz")
async def get_quiz(request: PdfOperationRequest):
    """Generează un set de întrebări tip grilă din materialul PDF."""
    try:
        quiz = llm_functions.generate_quiz(request.pdf_id, request.language)
        return {"questions": quiz, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
