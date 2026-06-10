import pytest
import sys
import os
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec
from pydantic import ValidationError

# Setup path for smart-news-parser
BASE_DIR = Path(__file__).resolve().parent.parent / "src"
SMART_NEWS_PARSER = BASE_DIR / "smart-news-parser"

def load_module(name: str, path: Path, extra_paths: list[Path] | None = None):
    if extra_paths:
        for p in reversed(extra_paths):
            if str(p) not in sys.path:
                sys.path.insert(0, str(p))
    spec = spec_from_file_location(name, path)
    module = module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

# Load the schemas module
parser_schemas = load_module(
    "parser_schemas",
    SMART_NEWS_PARSER / "parser_schemas.py",
    extra_paths=[SMART_NEWS_PARSER],
)

def test_announcement_schema_validation():
    valid_data = {
        "materie_sau_subiect": "Analiză Matematică",
        "entitate_sursa": "AC",
        "tip_eveniment": "examen",
        "urgenta_estimata": "ridicata",
        "public_tinta": ["studenti anul 1"],
        "rezumat_notificare": "Examen la Analiză",
        "actiuni_extrase": ["prezentare cu card student"],
        "taguri_cheie": ["examen", "matematica"]
    }
    announcement = parser_schemas.GeminiAnnouncementInfo(**valid_data)
    assert announcement.materie_sau_subiect == "Analiză Matematică"
    assert announcement.tip_eveniment == "examen"

def test_announcement_schema_invalid_data():
    invalid_data = {
        "materie_sau_subiect": "Test",
        # missing tip_eveniment
        "urgenta_estimata": "medie"
    }
    with pytest.raises(ValidationError):
        parser_schemas.GeminiAnnouncementInfo(**invalid_data)

def test_extracted_announcement_info():
    valid_data = {
        "materie_sau_subiect": "Analiză Matematică",
        "entitate_sursa": "AC",
        "tip_eveniment": "examen",
        "urgenta_estimata": "ridicata",
        "public_tinta": ["studenti anul 1"],
        "rezumat_notificare": "Examen la Analiză",
        "actiuni_extrase": ["prezentare cu card student"],
        "taguri_cheie": ["examen", "matematica"]
    }
    info = parser_schemas.ExtractedAnnouncementInfo(**valid_data)
    assert info.id is not None
    assert info.data_generare is not None
