"""
Task 4.1 — Test End-to-End pe fluxul RAG (combined_app FastAPI)
Task 4.2 — Test Rezilienta Circuit Breaker / Chaos Engineering

Rulare: pytest LLM/evals/test_rag_e2e.py -v -m eval
"""
import os
import sys
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec
from unittest.mock import patch

import pytest

BASE = Path(__file__).resolve().parent.parent
MODUL_MARIUS = BASE / "modul-marius"
PDF_TEST_PATH = MODUL_MARIUS / "pdfs" / "PAW_curs_1.pdf"

sys.path.insert(0, str(MODUL_MARIUS))


# ── Helper: incarca combined_app o singura data ───────────────────────────

def _import_combined():
    spec = spec_from_file_location("combined_app_test", BASE / "combined_app.py")
    mod = module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def combined():
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY lipseste — teste E2E necesita API key real")
    return _import_combined()


@pytest.fixture(scope="module")
def http(combined):
    from starlette.testclient import TestClient
    return TestClient(combined.app, raise_server_exceptions=False)


# ════════════════════════════════════════════════════════════════
# Task 4.1 — End-to-End RAG Flow
# ════════════════════════════════════════════════════════════════

@pytest.mark.eval
class TestRAGEndToEnd:

    @pytest.fixture(scope="class")
    def pdf_id(self, http):
        if not PDF_TEST_PATH.exists():
            pytest.skip(f"PDF de test lipseste: {PDF_TEST_PATH}")

        with open(PDF_TEST_PATH, "rb") as f:
            resp = http.post(
                "/api/v1/upload-pdf",
                files={"pdf": ("PAW_curs_1.pdf", f, "application/pdf")},
            )

        assert resp.status_code == 200, f"Upload esuat: {resp.text}"
        data = resp.json()
        assert "pdf_id" in data, "Raspunsul nu contine pdf_id"
        return data["pdf_id"]

    def test_upload_returneaza_uuid(self, pdf_id):
        # pdf_id trebuie sa fie UUID (36 caractere cu liniute)
        assert len(pdf_id) == 36
        assert pdf_id.count("-") == 4

    def test_upload_confirma_indexarea(self, http, pdf_id):
        # Dupa upload, /ask trebuie sa returneze 200 (indexarea a reusit)
        resp = http.post(
            "/api/v1/ask",
            json={"question": "Ce este PAW?", "pdf_id": pdf_id},
        )
        assert resp.status_code == 200

    def test_ask_schema_pydantic_corecta(self, http, pdf_id):
        resp = http.post(
            "/api/v1/ask",
            json={"question": "Ce este PAW?", "pdf_id": pdf_id},
        )
        assert resp.status_code == 200
        data = resp.json()
        # Schema AnswerQuestionOutput: un singur camp 'answer' de tip string
        assert set(data.keys()) == {"answer"}
        assert isinstance(data["answer"], str)

    def test_ask_raspuns_nevid(self, http, pdf_id):
        resp = http.post(
            "/api/v1/ask",
            json={"question": "Ce este PAW?", "pdf_id": pdf_id},
        )
        assert resp.status_code == 200
        assert len(resp.json()["answer"].strip()) > 0

    def test_ask_raspuns_are_minim_20_caractere(self, http, pdf_id):
        resp = http.post(
            "/api/v1/ask",
            json={"question": "Ce este PAW?", "pdf_id": pdf_id},
        )
        assert len(resp.json()["answer"]) >= 20

    def test_ask_pdf_id_invalid_nu_crapa_serverul(self, http):
        # Un pdf_id inexistent nu trebuie sa pice serverul — 200 sau 500, nu 502/503
        resp = http.post(
            "/api/v1/ask",
            json={"question": "Test?", "pdf_id": "id_inexistent_000"},
        )
        assert resp.status_code in (200, 422, 500)

    def test_delete_sterge_resursele(self, http, pdf_id):
        resp = http.delete(f"/api/v1/delete-pdf/{pdf_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert data.get("pdf_id") == pdf_id


# ════════════════════════════════════════════════════════════════
# Task 4.2 — Chaos Engineering: Circuit Breaker
# ════════════════════════════════════════════════════════════════

@pytest.mark.eval
class TestCircuitBreaker:

    @pytest.fixture(autouse=True)
    def reset_breaker(self):
        """Reseteaza circuit breaker-ul inainte de fiecare test."""
        from functions import llm_functions as llm
        self.llm = llm
        llm._breaker.close()
        yield
        llm._breaker.close()

    def _breaker_wrapped_failing(self):
        """Returneaza o functie care esueaza si trece PRIN circuit breaker."""
        def failing(*args, **kwargs):
            raise OSError("Simulare cadere Gemini API")
        return self.llm._breaker(failing)

    def test_5_erori_consecutive_deschid_circuit_breaker(self):
        """Dupa fail_max=5 erori, breaker-ul trebuie sa fie 'open'."""
        wrapped = self._breaker_wrapped_failing()
        for _ in range(7):
            try:
                wrapped("prompt")
            except Exception:
                pass

        assert self.llm._breaker.current_state == "open"

    def test_circuit_breaker_deschis_ridica_circuit_breaker_error(self):
        """Cu breaker-ul deschis, urmatorul apel ridica CircuitBreakerError."""
        import pybreaker

        wrapped = self._breaker_wrapped_failing()

        # Deschidem breaker-ul cu 5+ erori
        for _ in range(6):
            try:
                wrapped("prompt")
            except Exception:
                pass

        # Acum breaker-ul e deschis — urmatorul apel trebuie sa ridice CircuitBreakerError
        with pytest.raises(pybreaker.CircuitBreakerError):
            wrapped("prompt")

    def test_fastapi_returneaza_500_cu_breaker_deschis(self, combined, http):
        """Cu circuit breaker-ul deschis, /api/v1/ask trebuie sa returneze HTTP 500."""
        combined.mod_marius_functions._breaker.open()

        resp = http.post(
            "/api/v1/ask",
            json={"question": "Test chaos?", "pdf_id": "orice_id"},
        )
        assert resp.status_code == 500

        combined.mod_marius_functions._breaker.close()

    def test_server_ramane_functional_cu_breaker_deschis(self, combined, http):
        """Health check trebuie sa raspunda 200 chiar si cu breaker-ul deschis."""
        combined.mod_marius_functions._breaker.open()

        resp = http.get("/")
        assert resp.status_code == 200

        combined.mod_marius_functions._breaker.close()

    def test_breaker_se_reseteaza_dupa_timeout(self):
        """Dupa reset (close), breaker-ul accepta din nou apeluri."""
        self.llm._breaker.open()
        self.llm._breaker.close()
        assert self.llm._breaker.current_state == "closed"
