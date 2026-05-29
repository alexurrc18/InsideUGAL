import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from prompt_builder import PromptBuilder, SYSTEM_INSTRUCTION


class TestPromptBuilder:
    def test_build_returneaza_system_instruction(self):
        pb = PromptBuilder()
        assert pb.build() == SYSTEM_INSTRUCTION

    def test_build_custom_instruction(self):
        pb = PromptBuilder("Ești un robot.")
        assert pb.build() == "Ești un robot."

    def test_format_history_gol(self):
        pb = PromptBuilder()
        assert pb.format_history([]) == []

    def test_format_history_converteste_corect(self):
        pb = PromptBuilder()
        history = [
            {"role": "user",  "text": "Salut"},
            {"role": "model", "text": "Bună ziua!"},
        ]
        result = pb.format_history(history)
        assert result == [
            {"role": "user",  "parts": ["Salut"]},
            {"role": "model", "parts": ["Bună ziua!"]},
        ]

    def test_format_history_pastreaza_rolurile(self):
        pb = PromptBuilder()
        history = [{"role": "user", "text": "test"}]
        result = pb.format_history(history)
        assert result[0]["role"] == "user"

    def test_format_history_nu_pierde_mesaje(self):
        pb = PromptBuilder()
        history = [{"role": "user", "text": f"mesaj {i}"} for i in range(10)]
        result = pb.format_history(history)
        assert len(result) == 10
