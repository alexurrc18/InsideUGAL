import pytest
import json
import asyncio
import sys
from unittest.mock import patch, MagicMock

# Mock the entire llm_functions module before importing llm_service
# This prevents an import shadowing issue where llm_functions tries to import schemas
# and accidentally gets smart-news-parser/parser_schemas.py instead of modul-marius/schemas.py
sys.modules['llm_functions'] = MagicMock()
sys.modules['llm_functions']._call = MagicMock()

from pydantic import ValidationError
from llm_service import LLMService
from parser_schemas import ExtractedAnnouncementInfo, TipEveniment, NivelUrgenta

@pytest.fixture
def service():
    return LLMService()

def test_extract_sync_valid_json(service):
    mock_json = {
        "materie_sau_subiect": "Test Materie",
        "entitate_sursa": "ACIEE",
        "tip_eveniment": "examen",
        "urgenta_estimata": "ridicata",
        "public_tinta": ["Studenti Anul 3"],
        "deadline_absolut": "2026-06-10T23:59:00",
        "locatie": "B21",
        "rezumat_notificare": "Test rezumat",
        "actiuni_extrase": ["Test actiune"],
        "penalizari_sau_reguli": [],
        "linkuri_utile": [],
        "taguri_cheie": ["Test Tag"]
    }
    mock_response = f"Here is the JSON you requested:\n```json\n{json.dumps(mock_json)}\n```\nHave a good day."

    with patch('llm_service._call', return_value=mock_response) as mock_call:
        result = service._extract_sync("Test text")
        
        assert mock_call.called
        assert result.materie_sau_subiect == "Test Materie"
        assert result.entitate_sursa == "ACIEE"
        assert result.tip_eveniment == TipEveniment.EXAMEN
        assert result.urgenta_estimata == NivelUrgenta.RIDICATA
        assert result.public_tinta == ["Studenti Anul 3"]
        assert result.deadline_absolut.isoformat().startswith("2026-06-10")
        assert result.locatie == "B21"

def test_extract_sync_missing_optional_fields_get_defaults(service):
    # Missing materie_sau_subiect, tip_eveniment, urgenta_estimata, and lists
    mock_json = {
        "entitate_sursa": "ACIEE"
    }
    mock_response = json.dumps(mock_json)

    with patch('llm_service._call', return_value=mock_response):
        result = service._extract_sync("Test text")
        
        # Test the normalization logic
        assert result.materie_sau_subiect == "Nespecificat"
        assert result.tip_eveniment == TipEveniment.ANUNT_GENERAL
        assert result.urgenta_estimata == NivelUrgenta.MEDIE
        assert result.rezumat_notificare == "Anunt important"
        assert result.public_tinta == []
        assert result.actiuni_extrase == []
        assert result.penalizari_sau_reguli == []
        assert result.linkuri_utile == []
        assert result.taguri_cheie == []

def test_extract_sync_normalizes_invalid_enum(service):
    # Testăm că o valoare invalidă pentru tip_eveniment este normalizată la ANUNT_GENERAL
    mock_json = {
        "materie_sau_subiect": "Test",
        "tip_eveniment": "invalid_event_type",
        "urgenta_estimata": "medie",
        "public_tinta": [],
        "deadline_absolut": None,
        "locatie": None,
        "rezumat_notificare": "Test",
        "actiuni_extrase": [],
        "penalizari_sau_reguli": [],
        "linkuri_utile": [],
        "taguri_cheie": []
    }
    mock_response = json.dumps(mock_json)

    with patch('llm_service._call', return_value=mock_response):
        result = service._extract_sync("Test text")
        
        # Verificăm că a fost normalizat la valoarea default
        assert result.tip_eveniment == TipEveniment.ANUNT_GENERAL

def test_extract_sync_empty_response(service):
    with patch('llm_service._call', return_value=""):
        with pytest.raises(ValueError) as exc_info:
            service._extract_sync("Test text")
        
        assert "LLM returned an empty response" in str(exc_info.value)

def test_extract_sync_invalid_json(service):
    with patch('llm_service._call', return_value="This is not a JSON { broken JSON"):
        with pytest.raises(json.JSONDecodeError):
            service._extract_sync("Test text")

@pytest.mark.asyncio
async def test_extract_announcement_info_async(service):
    mock_json = {
        "materie_sau_subiect": "Async Test",
        "entitate_sursa": "ACIEE",
        "tip_eveniment": "examen",
        "urgenta_estimata": "ridicata",
        "public_tinta": ["Studenti Anul 3"],
        "deadline_absolut": None,
        "locatie": None,
        "rezumat_notificare": "Test rezumat",
        "actiuni_extrase": ["Test actiune"],
        "penalizari_sau_reguli": [],
        "linkuri_utile": [],
        "taguri_cheie": ["Test Tag"]
    }
    mock_response = json.dumps(mock_json)

    with patch('llm_service._call', return_value=mock_response):
        result = await service.extract_announcement_info("Test text async")
        assert result.materie_sau_subiect == "Async Test"
