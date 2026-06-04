import sys, os
import pytest
from unittest.mock import MagicMock, patch
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from llm_client import LLMClient

FAKE_CONFIG = {"temperature": 0.9, "max_output_tokens": 2048}


def make_client():
    with patch("llm_client.genai.configure"), \
         patch("llm_client.genai.GenerativeModel") as MockModel:
        mock_chat = MagicMock()
        MockModel.return_value.start_chat.return_value = mock_chat
        client = LLMClient(
            api_key="test-key",
            model_name="gemini-2.5-flash",
            system_instruction="Ești un asistent.",
            generation_config=FAKE_CONFIG,
        )
        return client, mock_chat


class TestLLMClient:
    def test_send_returneaza_text(self):
        client, mock_chat = make_client()
        mock_chat.send_message.return_value.text = "Răspuns de test"
        result = client.send("Salut")
        assert result == "Răspuns de test"

    def test_send_apeleaza_send_message(self):
        client, mock_chat = make_client()
        mock_chat.send_message.return_value.text = "ok"
        client.send("mesaj test")
        mock_chat.send_message.assert_called_once_with("mesaj test")

    def test_send_mesaj_gol_ridica_eroare(self):
        client, _ = make_client()
        with pytest.raises(ValueError):
            client.send("")

    def test_send_mesaj_doar_spatii_ridica_eroare(self):
        client, _ = make_client()
        with pytest.raises(ValueError):
            client.send("   ")

    def test_reset_porneste_chat_nou_cu_history(self):
        with patch("llm_client.genai.configure"), \
             patch("llm_client.genai.GenerativeModel") as MockModel:
            mock_model_instance = MagicMock()
            MockModel.return_value = mock_model_instance
            mock_model_instance.start_chat.return_value = MagicMock()

            client = LLMClient("key", "model", "instruction", FAKE_CONFIG)
            history = [{"role": "user", "parts": ["Salut"]}]
            client.reset(history)

            mock_model_instance.start_chat.assert_called_with(history=history)

    def test_reset_history_goala(self):
        with patch("llm_client.genai.configure"), \
             patch("llm_client.genai.GenerativeModel") as MockModel:
            mock_model_instance = MagicMock()
            MockModel.return_value = mock_model_instance
            mock_model_instance.start_chat.return_value = MagicMock()

            client = LLMClient("key", "model", "instruction", FAKE_CONFIG)
            client.reset([])
            mock_model_instance.start_chat.assert_called_with(history=[])
