class PromptBuilder:
    def build(self) -> str:
        return "Ești un asistent AI util și prietenos. Răspunde clar și concis în limba română."

    def format_history(self, saved_history: list) -> list:
        result = []
        for entry in saved_history:
            role = entry.get("role", "user")
            text = entry.get("text", "")
            # Ollama folosește "assistant" în loc de "model"
            if role == "model":
                role = "assistant"
            result.append({"role": role, "content": text})
        return result
