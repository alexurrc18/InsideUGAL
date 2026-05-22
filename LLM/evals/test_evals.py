"""
Eval suite minimă — 20 perechi (input, expected_property).
Rulează înainte de fiecare deploy LLM: pytest evals/ -v

Nu testează output exact, ci proprietăți ale răspunsului.
"""
import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "modul-marius"))

from functions.llm_functions import answer_question, generate_summary, generate_quiz

PDF_ID = "eval_paw"

pytestmark = pytest.mark.eval


# ════════════════════════════════════════════════════════
# answer_question — 10 proprietăți
# ════════════════════════════════════════════════════════

class TestAnswerQuestion:

    def test_raspuns_nu_este_gol(self):
        result = answer_question("Ce este PAW?", PDF_ID)
        assert len(result.strip()) > 0

    def test_raspuns_are_minim_20_caractere(self):
        result = answer_question("Ce este PAW?", PDF_ID)
        assert len(result) >= 20

    def test_raspuns_nu_contine_refuz_ai_engleza(self):
        result = answer_question("Ce este PAW?", PDF_ID)
        assert "as an ai" not in result.lower()
        assert "i'm sorry" not in result.lower()
        assert "i cannot" not in result.lower()

    def test_raspuns_nu_contine_markdown_cod(self):
        result = answer_question("Ce este PAW?", PDF_ID)
        assert "```" not in result

    def test_raspuns_nu_depaseste_lungime_maxima(self):
        result = answer_question("Ce este PAW?", PDF_ID)
        assert len(result) <= 5000

    def test_raspuns_are_spatii(self):
        # Text coerent conține spații — nu e un string compact fără sens
        result = answer_question("Ce este PAW?", PDF_ID)
        assert " " in result

    def test_intrebare_fara_raspuns_in_material(self):
        # Întrebare complet irelevantă față de material
        result = answer_question("Care este prețul unui bilet la metrou în Tokyo?", PDF_ID)
        assert "nu se regaseste" in result.lower()

    def test_acelasi_prompt_returneaza_acelasi_raspuns_din_cache(self):
        r1 = answer_question("Descrie arhitectura PAW.", PDF_ID)
        r2 = answer_question("Descrie arhitectura PAW.", PDF_ID)
        assert r1 == r2  # al doilea vine din cache

    def test_raspuns_diferit_pentru_intrebari_diferite(self):
        # Intrebare despre material vs intrebare complet irelevanta (returneaza "not found")
        r_material = answer_question("Descrie conceptele principale din materialul de curs.", PDF_ID)
        r_irelevanata = answer_question("Care este prețul unui bilet la metrou în Tokyo?", PDF_ID)
        assert r_material != r_irelevanata

    def test_raspuns_nu_contine_json_brut(self):
        result = answer_question("Ce este PAW?", PDF_ID)
        assert not result.strip().startswith("{")
        assert not result.strip().startswith("[")


# ════════════════════════════════════════════════════════
# generate_summary — 5 proprietăți
# ════════════════════════════════════════════════════════

class TestGenerateSummary:

    def test_rezumat_nu_este_gol(self):
        result = generate_summary(PDF_ID)
        assert len(result.strip()) > 0

    def test_rezumat_are_minim_100_caractere(self):
        result = generate_summary(PDF_ID)
        assert len(result) >= 100

    def test_rezumat_nu_contine_markdown_cod(self):
        result = generate_summary(PDF_ID)
        assert "```" not in result

    def test_rezumat_nu_contine_refuz_ai(self):
        result = generate_summary(PDF_ID)
        assert "as an ai" not in result.lower()

    def test_rezumat_este_concis(self):
        result = generate_summary(PDF_ID)
        assert len(result) <= 10000


# ════════════════════════════════════════════════════════
# generate_quiz — 5 proprietăți
# ════════════════════════════════════════════════════════

class TestGenerateQuiz:

    def test_quiz_are_minim_5_intrebari(self):
        result = generate_quiz(PDF_ID)
        assert len(result) >= 5

    def test_fiecare_intrebare_are_variante_abcd(self):
        result = generate_quiz(PDF_ID)
        for q in result:
            assert set(q["variante"].keys()) == {"A", "B", "C", "D"}

    def test_raspuns_corect_este_valid(self):
        result = generate_quiz(PDF_ID)
        for q in result:
            assert q["raspuns_corect"] in {"A", "B", "C", "D"}

    def test_fiecare_intrebare_are_text_suficient(self):
        result = generate_quiz(PDF_ID)
        for q in result:
            assert len(q["intrebare"]) >= 10

    def test_nu_exista_intrebari_duplicate(self):
        result = generate_quiz(PDF_ID)
        intrebari = [q["intrebare"] for q in result]
        assert len(intrebari) == len(set(intrebari))
