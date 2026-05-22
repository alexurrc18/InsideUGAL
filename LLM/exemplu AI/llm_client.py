from typing import Dict, List
import google.generativeai as genai


class LLMClient:
    def __init__(
        self,
        api_key: str,
        model_name: str,
        system_instruction: str,
        generation_config: Dict,
    ):
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
            system_instruction=system_instruction,
        )
        self._chat = self._model.start_chat(history=[])

    def send(self, message: str) -> str:
        """Trimite un mesaj și returnează răspunsul text."""
        if not message or not message.strip():
            raise ValueError("Mesajul nu poate fi gol")
        return self._chat.send_message(message).text or ""

    def reset(self, history: List[Dict]) -> None:
        """Resetează sesiunea de chat cu istoricul dat."""
        self._chat = self._model.start_chat(history=history)
