import sys, os
import pytest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from output_parser import OutputParser


class TestOutputParser:
    def test_parse_raspuns_valid(self):
        parser = OutputParser()
        result = parser.parse("Fotosinteza este un proces biochimic.")
        assert result == "Fotosinteza este un proces biochimic."

    def test_parse_elimina_spatii_marginale(self):
        parser = OutputParser()
        result = parser.parse("  răspuns cu spații  ")
        assert result == "răspuns cu spații"

    def test_parse_string_gol_ridica_eroare(self):
        parser = OutputParser()
        with pytest.raises(ValueError):
            parser.parse("")

    def test_parse_doar_spatii_ridica_eroare(self):
        parser = OutputParser()
        with pytest.raises(ValueError):
            parser.parse("   ")

    def test_parse_none_ridica_eroare(self):
        parser = OutputParser()
        with pytest.raises((ValueError, AttributeError)):
            parser.parse(None)

    def test_parse_pastreaza_continutul_complet(self):
        parser = OutputParser()
        text = "Linie 1\nLinie 2\nLinie 3"
        assert parser.parse(text) == text
