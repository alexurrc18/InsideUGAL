import requests
import json

OLLAMA_URL = "http://localhost:11434/api/chat"

class LLMClient:
    def __init__(self, api_key=None, model_name="mistral:7b",
                 system_instruction="", generation_config=None):
        self.model = model_name
        self.system_instruction = system_instruction
        self.history = []

    def reset(self, formatted_history=None):
        self.history = formatted_history or []

    def send(self, text: str) -> str:
        self.history.append({"role": "user", "content": text})

        messages = []
        if self.system_instruction:
            messages.append({"role": "system", "content": self.system_instruction})
        messages += self.history

        response = requests.post(OLLAMA_URL, json={
            "model": self.model,
            "messages": messages,
            "stream": False,
        }, timeout=120)

        if response.status_code != 200:
            raise Exception(f"Ollama error {response.status_code}: {response.text}")

        data = response.json()
        reply = data["message"]["content"]
        self.history.append({"role": "assistant", "content": reply})
        return reply
