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
    """Skip la rate limit sau circuit breaker deschis — nu fail."""
    try:
        item.runtest()
    except Exception as e:
        err = str(e)
        if any(x in err for x in ("429", "RESOURCE_EXHAUSTED", "CircuitBreakerError", "RetryError")):
            pytest.skip(f"Gemini indisponibil (rate limit sau circuit breaker): {type(e).__name__}")
        raise


@pytest.fixture(scope="session", autouse=True)
def load_pdf():
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY lipsește — evals necesită API key real")
    if not os.path.exists(PDF_PATH):
        pytest.skip(f"PDF lipsește: {PDF_PATH}")

    # Resetăm circuit breaker-ul — starea din sesiuni anterioare nu e relevantă
    from functions import llm_functions as llm
    llm._breaker.close()

    load_pdf_into_rag(PDF_PATH, PDF_ID)
    return PDF_ID
