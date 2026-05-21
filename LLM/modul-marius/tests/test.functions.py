import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from functions.llm_functions import load_pdf_into_rag, generate_summary, generate_quiz

pdf_path = os.path.join(os.path.dirname(__file__), "..", "pdfs", "PAW_curs_1.pdf")
pdf_id = "PAW_curs_1"

print("=== INCARCARE PDF IN RAG ===")
chunks = load_pdf_into_rag(pdf_path, pdf_id)
print(f"PDF impartit in {len(chunks)} chunk-uri si stocat in vector DB.")

print("\n=== REZUMAT ===")
print(generate_summary(pdf_id))

print("\n=== QUIZ ===")
quiz = generate_quiz(pdf_id)
score = 0
for i, q in enumerate(quiz):
    print(f"\nIntrebarea {i+1}: {q['intrebare']}")
    for litera, varianta in q['variante'].items():
        print(f"   {litera}) {varianta}")

    raspuns = input("Raspunsul tau (A/B/C/D): ").strip().upper()

    if raspuns == q['raspuns_corect']:
        print("Corect!")
        score += 1
    else:
        print(f"Gresit. Raspunsul corect era: {q['raspuns_corect']}) {q['variante'][q['raspuns_corect']]}")
        print(f"Explicatie: {q['explicatie']}")

print(f"\nScor final: {score}/{len(quiz)}")
