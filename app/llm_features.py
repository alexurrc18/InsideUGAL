import os
import logging
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.chat import (
    ExtractTasksRequest,
    AskDocumentRequest,
    PdfOperationRequest,
    UploadPdfResponse,
    GenericLlmResponse
)

logger = logging.getLogger("app.llm_features")

router = APIRouter(prefix="/api/v1", tags=["LLM Features"])

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")

@router.get("/")
async def health_check():
    return {"status": "online", "service": "InsideUGAL LLM Engine"}

@router.post("/extract-tasks")
async def extract_tasks(request: ExtractTasksRequest):
    """Extrage date structurate dintr-un anunț academic folosind Gemini."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/extract-announcement-info",
                json={"text": request.text},
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare serviciu LLM: {str(e)}")

@router.post("/upload-pdf", response_model=UploadPdfResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Încarcă un PDF, îl fragmentează și îl indexează în Chroma DB pentru RAG."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sunt acceptate doar fișiere PDF.")
    
    try:
        # Trimitem fișierul prin POST multipart form-data către microserviciul LLM
        async with httpx.AsyncClient() as client:
            file_content = await file.read()
            files = {"pdf": (file.filename, file_content, file.content_type)}
            response = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/upload-pdf",
                files=files,
                timeout=60.0
            )
            response.raise_for_status()
            result = response.json()
            return UploadPdfResponse(pdf_id=result["pdf_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare indexare pe microserviciul LLM: {str(e)}")

@router.post("/ask", response_model=GenericLlmResponse)
async def ask_document(request: AskDocumentRequest):
    """Răspunde la întrebări bazându-se EXCLUSIV pe un PDF indexat anterior."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/ask",
                json={"question": request.question, "pdf_id": request.pdf_id},
                timeout=30.0
            )
            response.raise_for_status()
            res_data = response.json()
            return GenericLlmResponse(result=res_data["answer"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare microserviciu LLM: {str(e)}")

@router.post("/summary", response_model=GenericLlmResponse)
async def get_summary(request: PdfOperationRequest):
    """Generează un rezumat structurat (Idei, Concepte, Key takeaways) din PDF."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/summary",
                json={"pdf_id": request.pdf_id},
                timeout=60.0
            )
            response.raise_for_status()
            res_data = response.json()
            return GenericLlmResponse(result=res_data["summary"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare microserviciu LLM: {str(e)}")

@router.post("/quiz")
async def get_quiz(request: PdfOperationRequest):
    """Generează un set de întrebări tip grilă bazat pe conținutul PDF-ului."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/api/v1/quiz",
                json={"pdf_id": request.pdf_id},
                timeout=60.0
            )
            response.raise_for_status()
            res_data = response.json()
            return {"questions": res_data["questions"], "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare microserviciu LLM: {str(e)}")