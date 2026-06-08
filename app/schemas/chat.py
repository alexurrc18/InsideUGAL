from typing import List, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message")
    history: List[ChatMessage] = Field(default_factory=list, description="Conversation history")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Generated response text")
    model: str = Field(default="InsideUGAL Campus Assistant", description="Model used")
    status: str = Field(default="success", description="Request status")


class AskDocumentRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Question for the document")
    pdf_id: str = Field(..., min_length=1, description="PDF identifier")


class GenericLlmResponse(BaseModel):
    result: str = Field(..., description="LLM operation result")
