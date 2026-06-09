from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid
from datetime import datetime

class TipEveniment(str, Enum):
    PROIECT = "proiect"
    LABORATOR = "laborator"
    PARTIAL = "partial"
    COLOCVIU = "colocviu"
    EXAMEN = "examen"
    CONCURS = "concurs"
    INTERNSHIP = "internship"
    BURSA = "bursa"
    VOLUNTARIAT = "voluntariat"
    OPORTUNITATE = "oportunitate"
    CAZARE = "cazare"
    ANUNT_GENERAL = "anunt_general"
    ADMINISTRATIV = "administrativ"
    ADMITERE = "admitere"

class NivelUrgenta(str, Enum):
    RIDICATA = "ridicata"
    MEDIE = "medie"
    SCAZUTA = "scazuta"

class AnnouncementRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=15000, description="Textul brut al anuntului")

class GeminiAnnouncementInfo(BaseModel):
    """Schema pentru datele extrase de LLM"""
    materie_sau_subiect: str = Field(description="Numele materiei sau subiectul administrativ")
    entitate_sursa: Optional[str] = Field(None, description="Facultatea sau departamentul sursa")
    tip_eveniment: TipEveniment = Field(description="Clasificarea anuntului")
    urgenta_estimata: NivelUrgenta = Field(description="Nivelul de prioritate")
    public_tinta: List[str] = Field(description="Cine trebuie sa actioneze")
    
    deadline_absolut: Optional[datetime] = Field(None, description="Data si ora limita (YYYY-MM-DD HH:MM)")
    locatie: Optional[str] = Field(None, description="Sala, corpul sau platforma online (ex: 'B21', 'Microsoft Teams')")
    
    rezumat_notificare: str = Field(description="Text de max 80 caractere pentru notificari Push")
    actiuni_extrase: List[str] = Field(description="Lista cu actiuni concrete de facut")
    penalizari_sau_reguli: List[str] = Field(default=[], description="Reguli sau penalizari mentionate")
    
    linkuri_utile: List[str] = Field(default=[], description="URL-uri detectate in text")
    taguri_cheie: List[str] = Field(description="Etichete pentru UI")

class ExtractedAnnouncementInfo(GeminiAnnouncementInfo):
    """Schema completa pentru raspunsul API, include metadate de sistem"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    data_generare: str = Field(default_factory=lambda: datetime.now().isoformat())
