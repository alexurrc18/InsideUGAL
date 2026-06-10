import pytest
import sys
import os
from pathlib import Path

# Ensure the LLM root is in path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

def test_paths_exist():
    """Verify that all expected LLM sub-directories exist (case-insensitive)."""
    existing_dirs = [d.name.lower() for d in BASE_DIR.iterdir() if d.is_dir()]
    assert "chatbot" in existing_dirs
    assert "modul-marius" in existing_dirs
    assert "smart-news-parser" in existing_dirs

def test_requirements_exist():
    """Verify that sub-projects have their requirements files."""
    # Find the chatbot folder case-insensitively
    chatbot_folder = next((d for d in BASE_DIR.iterdir() if d.name.lower() == "chatbot"), None)
    assert chatbot_folder is not None
    assert (chatbot_folder / "requirements.txt").exists()
    assert (BASE_DIR / "requirements.txt").exists()

def test_basic_logic_sanity():
    # Simple check to ensure testing framework is active
    assert 1 + 1 == 2
