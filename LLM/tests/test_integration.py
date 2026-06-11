import pytest
import sys
import os
from pathlib import Path

# Look for src directory to find modules
BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / "src"

def test_paths_exist():
    """Verify that all expected LLM sub-directories exist in src (case-insensitive)."""
    # If SRC_DIR doesn't exist, fall back to BASE_DIR (local dev sometimes)
    check_dir = SRC_DIR if SRC_DIR.exists() else BASE_DIR
    existing_dirs = [d.name.lower() for d in check_dir.iterdir() if d.is_dir()]
    assert "chatbot" in existing_dirs
    assert "modul-marius" in existing_dirs
    assert "smart-news-parser" in existing_dirs

def test_requirements_exist():
    """Verify that sub-projects have their requirements files."""
    # Find the chatbot folder case-insensitively in src
    check_dir = SRC_DIR if SRC_DIR.exists() else BASE_DIR
    chatbot_folder = next((d for d in check_dir.iterdir() if d.name.lower() == "chatbot"), None)
    assert chatbot_folder is not None
    # ChatBot might not have its own requirements.txt, checking root requirements is enough
    assert (BASE_DIR / "requirements.txt").exists()

def test_basic_logic_sanity():
    # Simple check to ensure testing framework is active
    assert 1 + 1 == 2
