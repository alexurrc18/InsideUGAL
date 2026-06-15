import sys
import os

# Adaugă LLM/src în sys.path pentru ca testele să găsească modulele
# Adăugăm și fiecare sub-pachet pentru a facilita importurile
src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../src'))
sys.path.insert(0, src_path)
sys.path.insert(0, os.path.join(src_path, 'ChatBot'))
sys.path.insert(0, os.path.join(src_path, 'modul-marius'))
sys.path.insert(0, os.path.join(src_path, 'smart-news-parser'))
