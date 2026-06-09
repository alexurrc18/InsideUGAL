from pydantic import BaseModel, Field


# ── Input schemas ─────────────────────────────────────────

class AnswerQuestionInput(BaseModel):
    question: str = Field(..., min_length=3, description="Întrebarea utilizatorului")
    pdf_id: str = Field(..., min_length=1, description="ID-ul PDF-ului în vector DB")


class GenerateSummaryInput(BaseModel):
    pdf_id: str = Field(..., min_length=1)


# ── Output schemas ────────────────────────────────────────

class AnswerQuestionOutput(BaseModel):
    answer: str = Field(..., min_length=1, description="Răspunsul generat de LLM")


class GenerateSummaryOutput(BaseModel):
    summary: str = Field(..., min_length=1)
