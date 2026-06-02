from typing import Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, model_validator


# ── Input schemas ─────────────────────────────────────────

class AnswerQuestionInput(BaseModel):
    question: str = Field(..., min_length=3, description="Întrebarea utilizatorului")
    pdf_id: str = Field(..., min_length=1, description="ID-ul PDF-ului în vector DB")


class GenerateSummaryInput(BaseModel):
    pdf_id: str = Field(..., min_length=1)


class GenerateQuizInput(BaseModel):
    pdf_id: str = Field(..., min_length=1)


# ── Output schemas ────────────────────────────────────────

class AnswerQuestionOutput(BaseModel):
    answer: str = Field(..., min_length=1, description="Răspunsul generat de LLM")


class GenerateSummaryOutput(BaseModel):
    summary: str = Field(..., min_length=1)


class QuizVariants(BaseModel):
    A: str
    B: str
    C: str
    D: str


class QuizQuestion(BaseModel):
    intrebare: str = Field(..., min_length=5)
    variante: QuizVariants
    raspuns_corect: Literal["A", "B", "C", "D"]
    # Acceptă ambele formate: dict per variantă SAU string simplu
    explicatii: Optional[Dict[str, str]] = None
    explicatie: Optional[str] = None

    @model_validator(mode="after")
    def normalize_explanation(self) -> "QuizQuestion":
        # Dacă LLM-ul returnează string simplu, îl normalizăm la dict
        if self.explicatie and not self.explicatii:
            self.explicatii = {k: self.explicatie for k in ("A", "B", "C", "D")}
            self.explicatie = None
        return self


class GenerateQuizOutput(BaseModel):
    questions: List[QuizQuestion] = Field(..., min_length=1)
