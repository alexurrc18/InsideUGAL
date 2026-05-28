"""
Teste E2E pentru modulul smart-news-parser (aplicatie standalone).
Testeaza direct aplicatia FastAPI din smart-news-parser/main.py,
independent de combined_app.

Rulare: pytest LLM/evals/test_smart_news_parser.py -v -m eval
"""
import os
import sys
from pathlib import Path

import pytest

BASE = Path(__file__).resolve().parent.parent
SMART_NEWS_PARSER = BASE / "smart-news-parser"

sys.path.insert(0, str(SMART_NEWS_PARSER))


@pytest.fixture(scope="module")
def client():
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY lipseste — teste E2E necesita API key real")

    from starlette.testclient import TestClient
    from main import app
    return TestClient(app, raise_server_exceptions=False)


ANUNT_EXAMEN = (
    "Facultatea ACIEE anunta ca examenul de Baze de Date pentru anul 2 "
    "va avea loc pe 15 iunie 2026, sala B21, ora 10:00. "
    "Studentii trebuie sa se inscrie pe platforma pana pe 10 iunie. "
    "Neprezentarea atrage dupa sine pierderea dreptului de examinare."
)

ANUNT_CONCURS = (
    "Concursul de creativitate in IT Severin Bumbaru editia 2026 se va desfasura "
    "online in format hackathon in perioada 25-27 martie. "
    "Inscrierea se face pana pe 20 martie 2026 pe site-ul concursului. "
    "Fiecare echipa este formata din maximum trei membri."
)

TIPURI_VALIDE = {
    "proiect", "laborator", "partial", "colocviu",
    "examen", "concurs", "anunt_general", "administrativ",
}

CAMPURI_OBLIGATORII = [
    "materie_sau_subiect", "entitate_sursa", "tip_eveniment",
    "urgenta_estimata", "public_tinta", "rezumat_notificare",
    "taskuri_extrase", "taguri_cheie", "id", "data_generare",
]


@pytest.mark.eval
class TestSmartNewsParserStandalone:
    """Teste E2E pentru smart-news-parser rulat ca aplicatie independenta."""

    def test_health_check_returneaza_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_health_check_contine_service_name(self, client):
        resp = client.get("/")
        data = resp.json()
        assert "service" in data
        assert "Smart Task Extractor" in data["service"]

    def test_extract_tasks_returneaza_200(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200

    def test_extract_tasks_schema_completa(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200
        data = resp.json()
        for camp in CAMPURI_OBLIGATORII:
            assert camp in data, f"Camp lipsa: {camp}"

    def test_tip_eveniment_este_enum_valid(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200
        tip = resp.json()["tip_eveniment"]
        assert tip in TIPURI_VALIDE, f"tip_eveniment invalid: {tip}"

    def test_urgenta_este_enum_valid(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200
        assert resp.json()["urgenta_estimata"] in {"ridicata", "medie", "scazuta"}

    def test_rezumat_max_80_caractere(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200
        rezumat = resp.json()["rezumat_notificare"]
        assert len(rezumat) <= 80, f"Rezumat prea lung: {len(rezumat)} caractere"

    def test_taskuri_extrase_nevide(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200
        taskuri = resp.json()["taskuri_extrase"]
        assert isinstance(taskuri, list)
        assert len(taskuri) > 0

    def test_public_tinta_este_lista(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200
        assert isinstance(resp.json()["public_tinta"], list)

    def test_id_este_uuid(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200
        id_val = resp.json()["id"]
        assert len(id_val) == 36 and id_val.count("-") == 4

    def test_text_prea_scurt_returneaza_422(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": "scurt"})
        assert resp.status_code == 422

    def test_text_prea_lung_returneaza_422(self, client):
        text_lung = "a" * 5001
        resp = client.post("/api/v1/extract-tasks", json={"text": text_lung})
        assert resp.status_code == 422

    def test_anunturi_diferite_produc_rezultate_diferite(self, client):
        resp1 = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        resp2 = client.post("/api/v1/extract-tasks", json={"text": ANUNT_CONCURS})
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.json()["tip_eveniment"] != resp2.json()["tip_eveniment"]

    def test_deadline_format_corect_daca_prezent(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200
        deadline = resp.json().get("deadline_absolut")
        if deadline is not None:
            # Format asteptat: YYYY-MM-DD HH:MM
            assert len(deadline) == 16, f"Format deadline incorect: {deadline}"
            assert deadline[4] == "-" and deadline[7] == "-"

    def test_taguri_cheie_lista_nevida(self, client):
        resp = client.post("/api/v1/extract-tasks", json={"text": ANUNT_EXAMEN})
        assert resp.status_code == 200
        taguri = resp.json()["taguri_cheie"]
        assert isinstance(taguri, list)
        assert len(taguri) > 0
