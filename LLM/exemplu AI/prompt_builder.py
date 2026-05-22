from typing import List, Dict

SYSTEM_INSTRUCTION = """Ești un asistent AI inteligent și prietenos care vorbește în română.
Ai memorie completă a tuturor conversațiilor anterioare cu utilizatorul.
Dacă utilizatorul menționează ceva ce a spus înainte (ex: meniul cantinei, preferințe,
informații personale), folosești acea informație.
Răspunzi la orice întrebare sincer și complet."""


class PromptBuilder:
    def __init__(self, system_instruction: str = SYSTEM_INSTRUCTION):
        self._instruction = system_instruction

    def build(self) -> str:
        return self._instruction

    def format_history(self, history: List[Dict]) -> List[Dict]:
        """Convertește istoricul salvat {role, text} → {role, parts: [text]} pentru Gemini."""
        return [{"role": h["role"], "parts": [h["text"]]} for h in history]
