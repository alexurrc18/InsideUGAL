class PromptBuilder:
    def build(self) -> str:
        # O instrucțiune de fier (System Prompt) care interzice „halucinațiile” în alte limbi
        return (
            "Ești un asistent AI profesionist, util și prietenos. "
            "REGULĂ STRICTĂ: Trebuie să răspunzi EXCLUSIV în limba română, folosind o gramatică impecabilă, "
            "indiferent de limba în care ești întrebat. Sub nicio formă nu vei folosi caractere chinezești, "
            "cuvinte inventate sau alte limbi. Fii clar, logic, natural și concis."
        )

    def format_history(self, saved_history: list) -> list:
        result = []
        for entry in saved_history:
            role = entry.get("role", "user")
            text = entry.get("text", "")

            result.append({"role": role, "content": text})
        return result
