import os
import requests

class LLMClient:
    def __init__(self, model_name, system_instruction=""):
        self.model_name = model_name
        self.system_instruction = system_instruction
        self.messages = []
        
        # Preluăm cheia de OpenRouter în liniște
        self.api_key = os.environ.get("OPENROUTER_API_KEY", "").strip().strip("'").strip('"')

    def reset(self, history=None):
        self.messages = []
        if self.system_instruction:
            self.messages.append({"role": "system", "content": self.system_instruction})
        
        if history:
            for msg in history:
                if isinstance(msg, dict):
                    role = msg.get("role", "user")
                    if role == "model":
                        role = "assistant"
                    content = msg.get("text", msg.get("content", ""))
                    if content:
                        self.messages.append({"role": role, "content": content})

    def send(self, text):
        if not self.api_key:
             raise Exception("Cheia OPENROUTER_API_KEY lipsește din fișierul .env.")

        self.messages.append({"role": "user", "content": text})
        
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model_name,
            "messages": self.messages
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            reply = response.json()["choices"][0]["message"]["content"]
            self.messages.append({"role": "assistant", "content": reply})
            return reply
            
        except requests.exceptions.RequestException as e:
            if self.messages and self.messages[-1]["role"] == "user":
                self.messages.pop()
                
            error_msg = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    if "error" in error_data:
                        error_msg = error_data["error"].get("message", error_msg)
                except:
                    error_msg = e.response.text
            raise Exception(f"Eroare OpenRouter: {error_msg}")