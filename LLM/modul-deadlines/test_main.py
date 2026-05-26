import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from main import app

# Initializam clientul de test oferit de FastAPI
client = TestClient(app)

# ---------------------------------------------------------
# 1. TEST PENTRU HEALTH CHECK (ENDPOINT-UL DE BAZA)
# ---------------------------------------------------------
def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "Smart Task Extractor v1.1", "cors": "enabled"}

# ---------------------------------------------------------
# 2. TEST PENTRU EXTRACTIE CU RASPUNS CURAT (MOCK LLM)
# ---------------------------------------------------------
@pytest.mark.asyncio
@patch("main.client.aio.models.generate_content", new_callable=AsyncMock)
async def test_extract_tasks_success(mock_generate_content):
    # Simulam ce ar returna in mod normal Gemini daca totul e perfect
    fake_gemini_json = (
        '{"materie": "Ingineria Programarii", "deadline_absolut": "2026-05-27 23:59", '
        '"dimensiune_echipa": 3, "taskuri_extrase": ["UML"], "penalizari_sau_reguli": []}'
    )
    
    # Configuram obiectul fals (mock-ul) sa returneze acest text
    mock_response = AsyncMock()
    mock_response.text = fake_gemini_json
    mock_generate_content.return_value = mock_response

    # Executam cererea catre API-ul nostru local
    payload = {"text": "Anunt haotic de test"}
    response = client.post("/api/v1/extract-tasks", json=payload)

    # Verificam daca codul nostru a procesat corect raspunsul primit de la mock
    assert response.status_code == 200
    data = response.json()
    assert data["materie"] == "Ingineria Programarii"
    assert data["dimensiune_echipa"] == 3
    assert "UML" in data["taskuri_extrase"]

# ---------------------------------------------------------
# 3. TEST PENTRU CURATAREA BLOCURILOR MARKDOWN (```json)
# ---------------------------------------------------------
@pytest.mark.asyncio
@patch("main.client.aio.models.generate_content", new_callable=AsyncMock)
async def test_extract_tasks_cleaning_markdown(mock_generate_content):
    # Uneori LLM-ul returneaza JSON-ul incapsulat in blocuri de cod markdown.
    # Testam daca logica noastra de curatare (if raw_text.startswith...) functioneaza.
    fake_gemini_markdown = (
        "```json\n"
        '{"materie": "Baze de Date", "taskuri_extrase": ["Proiect SQL"]}\n'
        "```"
    )
    
    mock_response = AsyncMock()
    mock_response.text = fake_gemini_markdown
    mock_generate_content.return_value = mock_response

    payload = {"text": "Alt anunt de test"}
    response = client.post("/api/v1/extract-tasks", json=payload)

    # Daca testul trece, inseamna ca functia a curatat cu succes caracterele "```json"
    assert response.status_code == 200
    data = response.json()
    assert data["materie"] == "Baze de Date"

# ---------------------------------------------------------
# 4. TEST PENTRU GESTIONAREA ERORILOR (ERROR HANDLING)
# ---------------------------------------------------------
@pytest.mark.asyncio
@patch("main.client.aio.models.generate_content", new_callable=AsyncMock)
async def test_extract_tasks_invalid_json(mock_generate_content):
    # Simulam situatia in care Gemini returneaza un text corupt care nu e JSON valid
    mock_response = AsyncMock()
    mock_response.text = "Acesta nu este un obiect JSON valid, este doar un text."
    mock_generate_content.return_value = mock_response

    payload = {"text": "Anunt cu probleme"}
    response = client.post("/api/v1/extract-tasks", json=payload)

    # Codul nostru trebuie sa prinda eroarea in blocul 'except Exception' si sa returneze status 500
    assert response.status_code == 500
    assert "Eroare la procesarea LLM" in response.json()["detail"]

# ---------------------------------------------------------
# 5. TEST PENTRU VALIDARE INPUT (TEXT PREA SCURT)
# ---------------------------------------------------------
def test_extract_tasks_invalid_input():
    payload = {"text": "Scurt"}
    response = client.post("/api/v1/extract-tasks", json=payload)
    
    # FastAPI/Pydantic returneaza 422 Unprocessable Entity pentru erori de validare
    assert response.status_code == 422
    assert "text" in response.json()["detail"][0]["loc"]