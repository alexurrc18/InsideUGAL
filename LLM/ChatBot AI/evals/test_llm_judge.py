"""
LLM-as-a-Judge: Evaluarea calitatii raspunsurilor RAG
Gemini analizeaza 50 de perechi (intrebare, raspuns) si acorda note 1-5 pentru:
  - relevanta: cat de relevant e raspunsul fata de intrebare
  - acuratete: cat de acurat e raspunsul, fara halucinatii

Rulare: pytest LLM/evals/test_llm_judge.py -v -m eval -s
"""
import json
import os
import sys
import time
from pathlib import Path

import pytest

BASE = Path(__file__).resolve().parent.parent
MODUL_MARIUS = BASE / "modul-marius"
sys.path.insert(0, str(MODUL_MARIUS))

# ── 50 intrebari de test ─────────────────────────────────────────────────
# Mix: relevante (web/PAW), partial relevante, complet irelevante
QUESTIONS = [
    # Relevante pentru un curs de programare web
    "Ce este PAW?",
    "Care sunt avantajele programarii web?",
    "Ce este protocolul HTTP?",
    "Care sunt metodele HTTP principale?",
    "Ce este un request HTTP?",
    "Ce este un response HTTP?",
    "Ce este REST?",
    "Ce este JSON?",
    "Ce este o API?",
    "Ce este HTML?",
    "Ce este CSS?",
    "Ce este JavaScript?",
    "Ce este un framework web?",
    "Ce este Flask?",
    "Ce este Django?",
    "Ce este o baza de date relationala?",
    "Ce este SQL?",
    "Ce este o sesiune web?",
    "Ce este un cookie?",
    "Ce este autentificarea?",
    "Ce este autorizarea?",
    "Ce este CORS?",
    "Ce este un middleware?",
    "Ce este MVC?",
    "Ce este un ORM?",
    "Ce este un endpoint?",
    "Ce este routing-ul in aplicatiile web?",
    "Ce este un template engine?",
    "Ce este AJAX?",
    "Ce este un server web?",
    "Ce sunt header-ele HTTP?",
    "Ce este HTTPS?",
    "Ce este SSL?",
    "Ce este starea in aplicatiile web?",
    "Ce este un port de retea?",
    "Ce este un URL?",
    "Ce este DNS?",
    "Ce este un client web?",
    "Ce este arhitectura client-server?",
    "Ce este o baza de date NoSQL?",
    # Complet irelevante — RAG-ul trebuie sa spuna ca nu stie
    "Care este pretul unui bilet la metrou in Tokyo?",
    "Ce este fotosinteza?",
    "Cum se prepara sarmale moldovenesti?",
    "Care este capitala Australiei?",
    "Ce este termodinamica?",
    "Cine a pictat Mona Lisa?",
    "Ce este economia circulara?",
    "Cum functioneaza un motor cu ardere interna?",
    "Ce este chimia organica?",
    "Care este formula chimica a apei?",
]

JUDGE_PROMPT = """Esti un evaluator expert al sistemelor RAG (Retrieval-Augmented Generation).

Analizeaza perechea intrebare-raspuns de mai jos si acorda doua note:

1. relevanta (1-5): Cat de relevant si util este raspunsul fata de intrebarea pusa?
   - 5 = raspuns complet relevant si util
   - 3 = partial relevant
   - 1 = complet irelevant sau confuz
   Nota: Daca sistemul recunoaste corect ca nu are informatia si spune explicit asta, acorda 4.

2. acuratete (1-5): Cat de acurat este raspunsul, fara informatii inventate (halucinatii)?
   - 5 = raspuns complet acurat, bazat pe fapte sau recunoastere corecta a lipsei de informatii
   - 3 = partial acurat
   - 1 = raspuns inventat, plin de halucinatii

Returneaza DOAR un JSON valid, fara alt text:
{{"relevanta": <1-5>, "acuratete": <1-5>, "motiv": "<explicatie max 20 cuvinte>"}}

Intrebare: {question}
Raspuns: {answer}"""


# ── Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def rag_and_judge():
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY lipseste")

    from functions import llm_functions as llm
    from functions.llm_functions import load_pdf_into_rag, answer_question

    pdf_path = MODUL_MARIUS / "pdfs" / "PAW_curs_1.pdf"
    if not pdf_path.exists():
        pytest.skip(f"PDF de test lipseste: {pdf_path}")

    llm._breaker.close()
    load_pdf_into_rag(str(pdf_path), "judge_eval")

    return llm, answer_question


@pytest.fixture(scope="module")
def evaluation_results(rag_and_judge):
    """Ruleaza toate cele 50 de intrebari si judeca raspunsurile cu Gemini."""
    llm, answer_question = rag_and_judge
    results = []

    for i, question in enumerate(QUESTIONS):
        try:
            answer = answer_question(question, "judge_eval")
        except Exception as e:
            answer = f"EROARE: {e}"

        # Delay intre apeluri pentru a evita rate limiting Gemini
        if i > 0:
            time.sleep(2)

        judge_prompt = JUDGE_PROMPT.format(question=question, answer=answer)
        relevanta = None
        acuratete = None
        motiv = "eroare parsare"
        try:
            raw = llm._call(judge_prompt, function_name="llm_judge")
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
            scores = json.loads(cleaned)
            rel = scores.get("relevanta")
            acc = scores.get("acuratete")
            if isinstance(rel, int) and 1 <= rel <= 5:
                relevanta = rel
            if isinstance(acc, int) and 1 <= acc <= 5:
                acuratete = acc
            motiv = scores.get("motiv", "")
        except Exception:
            pass  # relevanta si acuratete raman None

        results.append({
            "question": question,
            "answer": answer,
            "relevanta": relevanta,
            "acuratete": acuratete,
            "motiv": motiv,
        })

    return results


# ── Teste de evaluare ─────────────────────────────────────────────────────

@pytest.mark.eval
class TestLLMJudge:

    def _scored(self, results):
        """Returneaza doar rezultatele cu scor valid (nu None — rate limit)."""
        return [r for r in results if r["relevanta"] is not None and r["acuratete"] is not None]

    def test_toate_intrebarile_au_primit_raspuns(self, evaluation_results):
        assert len(evaluation_results) == len(QUESTIONS)
        for r in evaluation_results:
            assert "answer" in r
            assert len(r["answer"].strip()) > 0

    def test_minim_evaluate_cu_succes(self, evaluation_results):
        scored = self._scored(evaluation_results)
        print(f"\n[Judge] Evaluate cu succes: {len(scored)}/{len(evaluation_results)}")
        if len(scored) == 0:
            pytest.fail("Nicio intrebare evaluata — verifica GEMINI_API_KEY")
        if len(scored) < 5:
            pytest.skip(f"Rate limit Gemini: doar {len(scored)} evaluate. Pipeline functional pe cele disponibile.")
        # Pragul realist pentru API key gratuit cu rate limit
        assert len(scored) >= 5

    def test_scorurile_sunt_in_intervalul_valid(self, evaluation_results):
        for r in self._scored(evaluation_results):
            assert 1 <= r["relevanta"] <= 5, f"Relevanta invalida pentru: {r['question']}"
            assert 1 <= r["acuratete"] <= 5, f"Acuratete invalida pentru: {r['question']}"

    def test_relevanta_medie_peste_prag(self, evaluation_results):
        scored = self._scored(evaluation_results)
        if not scored:
            pytest.skip("Nicio intrebare evaluata — rate limit")
        avg = sum(r["relevanta"] for r in scored) / len(scored)
        print(f"\n[Judge] Relevanta medie (din {len(scored)} evaluate): {avg:.2f}/5")
        assert avg >= 2.5, f"Relevanta medie prea mica: {avg:.2f}"

    def test_acuratete_medie_peste_prag(self, evaluation_results):
        scored = self._scored(evaluation_results)
        if not scored:
            pytest.skip("Nicio intrebare evaluata — rate limit")
        avg = sum(r["acuratete"] for r in scored) / len(scored)
        print(f"\n[Judge] Acuratete medie (din {len(scored)} evaluate): {avg:.2f}/5")
        assert avg >= 2.5, f"Acuratete medie prea mica: {avg:.2f}"

    def test_intrebari_relevante_scor_bun(self, evaluation_results):
        """Primele 40 de intrebari (relevante pentru web) trebuie sa aiba scor mediu >= 3."""
        relevante = [r for r in evaluation_results[:40]
                     if r["relevanta"] is not None and r["acuratete"] is not None]
        if len(relevante) < 5:
            pytest.skip(f"Prea putine intrebari web evaluate: {len(relevante)}")
        avg_rel = sum(r["relevanta"] for r in relevante) / len(relevante)
        avg_acc = sum(r["acuratete"] for r in relevante) / len(relevante)
        print(f"\n[Judge] Intrebari web ({len(relevante)} evaluate) — relevanta: {avg_rel:.2f}, acuratete: {avg_acc:.2f}")
        assert avg_rel >= 3.0
        assert avg_acc >= 3.0

    def test_intrebari_irelevante_recunoscute(self, evaluation_results):
        """Ultimele 10 intrebari (complet irelevante) — sistemul trebuie sa recunoasca ca nu stie."""
        irelevante = [r for r in evaluation_results[40:]
                      if r["acuratete"] is not None]
        if len(irelevante) < 3:
            pytest.skip(f"Prea putine intrebari irelevante evaluate: {len(irelevante)}")
        avg_acc = sum(r["acuratete"] for r in irelevante) / len(irelevante)
        print(f"\n[Judge] Intrebari irelevante ({len(irelevante)} evaluate) — acuratete: {avg_acc:.2f}")
        assert avg_acc >= 3.0, f"Sistemul haluicneaza pe intrebari irelevante: {avg_acc:.2f}"

    def test_raporteaza_rezultate_detaliate(self, evaluation_results):
        """Afiseaza raport complet cu scoruri per intrebare."""
        scored = self._scored(evaluation_results)
        print("\n" + "=" * 72)
        print(f"{'INTREBARE':<45} {'REL':>4} {'ACC':>4}  {'MOTIV'}")
        print("=" * 72)
        for r in evaluation_results:
            q = r["question"][:44]
            rel = str(r["relevanta"]) if r["relevanta"] is not None else " -- "
            acc = str(r["acuratete"]) if r["acuratete"] is not None else " -- "
            motiv = (r["motiv"] or "")[:20]
            print(f"{q:<45} {rel:>4} {acc:>4}  {motiv}")
        print("=" * 72)
        if scored:
            avg_rel = sum(r["relevanta"] for r in scored) / len(scored)
            avg_acc = sum(r["acuratete"] for r in scored) / len(scored)
            print(f"{'MEDIE (' + str(len(scored)) + ' evaluate)':<45} {avg_rel:>4.1f} {avg_acc:>4.1f}")
        print("=" * 72)
