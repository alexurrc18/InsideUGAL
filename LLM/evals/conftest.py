import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "modul-marius"))

from functions.llm_functions import load_pdf_into_rag

PDF_PATH = os.path.join(os.path.dirname(__file__), "..", "modul-marius", "pdfs", "PAW_curs_1.pdf")
PDF_ID = "eval_paw"


def pytest_configure(config):
    config.addinivalue_line("markers", "eval: teste cu apeluri reale la Gemini (rulează înainte de deploy)")


def pytest_runtest_call(item):
    """Dacă Gemini returnează 429 (rate limit), skip-uim testul în loc să-l crăpăm."""
    import sys
    try:
        item.runtest()
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            pytest.skip(f"Gemini rate limit atins — încearcă mâine sau upgrade plan: {e}")
        raise


@pytest.fixture(scope="session", autouse=True)
def load_pdf():
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY lipsește — evals necesită API key real")
    if not os.path.exists(PDF_PATH):
        pytest.skip(f"PDF lipsește: {PDF_PATH}")
    load_pdf_into_rag(PDF_PATH, PDF_ID)
    return PDF_ID
