import pytest
import sys
import os
from pathlib import Path

# Ensure the LLM root is in path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

def test_paths_exist():
    """Verify that all expected LLM sub-directories exist."""
    assert (BASE_DIR / "ChatBot-Marius").exists()
    assert (BASE_DIR / "modul-marius").exists()
    assert (BASE_DIR / "smart-news-parser").exists()

def test_requirements_exist():
    """Verify that sub-projects have their requirements files."""
    assert (BASE_DIR / "ChatBot-Marius" / "requirements.txt").exists()
    assert (BASE_DIR / "requirements.txt").exists()

def test_basic_logic_sanity():
    # Simple check to ensure testing framework is active
    assert 1 + 1 == 2
