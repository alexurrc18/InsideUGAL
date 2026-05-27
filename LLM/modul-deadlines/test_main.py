import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from main import app
from schemas import ExtractedTaskResponse

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Smart Task Extractor v2.1" in data["service"]
    assert "Multi-Source Detection" in data["capabilities"]

@pytest.mark.asyncio
@patch("llm_service.LLMService.extract_tasks", new_callable=AsyncMock)
async def test_extract_tasks_success(mock_extract):
    # Simulam un raspuns de succes de la LLMService
    fake_response = ExtractedTaskResponse(
        materie_sau_subiect="Ingineria Programarii",
        entitate_sursa="AC",
        tip_eveniment="proiect",
        urgenta_estimata="medie",
        public_tinta=["Anul 3"],
        rezumat_notificare="Deadline proiect IP",
        taskuri_extrase=["UML"],
        taguri_cheie=["UML"]
    )
    mock_extract.return_value = fake_response

    payload = {"text": "Anunt haotic de test despre proiectul la IP"}
    response = client.post("/api/v1/extract-tasks", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["materie_sau_subiect"] == "Ingineria Programarii"
    assert data["entitate_sursa"] == "AC"
    assert data["tip_eveniment"] == "proiect"
    assert "id" in data
    assert "data_generare" in data

@pytest.mark.asyncio
@patch("llm_service.LLMService.extract_tasks", new_callable=AsyncMock)
async def test_extract_tasks_error(mock_extract):
    # Simulam o eroare in serviciul LLM
    mock_extract.side_effect = Exception("Gemini API Error")

    payload = {"text": "Anunt care provoaca eroare"}
    response = client.post("/api/v1/extract-tasks", json=payload)

    assert response.status_code == 500
    assert "Eroare la analiza AI" in response.json()["detail"]
