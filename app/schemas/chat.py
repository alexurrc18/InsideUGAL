from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role, e.g. 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message")
    history: List[ChatMessage] = Field(default_factory=list, description="Conversation history")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Generated response text")
    model: str = Field(..., description="Model used for generation")
    usage: Dict[str, str] = Field(default_factory=dict, description="Usage metadata")
    status: str = Field(..., description="Request status")


class ExtractTasksRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text from which tasks are extracted")


class AskDocumentRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Question for the document")
    pdf_id: str = Field(..., min_length=1, description="Document PDF identifier")
    language: Optional[str] = Field(default="ro", description="Language code")


class PdfOperationRequest(BaseModel):
    pdf_id: str = Field(..., min_length=1, description="Document PDF identifier")
    language: Optional[str] = Field(default="ro", description="Language code")


class UploadPdfResponse(BaseModel):
    pdf_id: str = Field(..., description="Uploaded PDF identifier")


class GenericLlmResponse(BaseModel):
    result: str = Field(..., description="LLM operation result")
