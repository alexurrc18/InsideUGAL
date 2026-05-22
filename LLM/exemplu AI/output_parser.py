class OutputParser:
    def parse(self, raw: str) -> str:
        """Validează și curăță răspunsul LLM înainte să iasă spre UI."""
        if not raw or not raw.strip():
            raise ValueError("LLM a returnat un răspuns gol")
        return raw.strip()
