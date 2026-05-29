class OutputParser:
    def parse(self, raw: str) -> str:
        if not raw:
            return "(răspuns gol)"
        return raw.strip()
