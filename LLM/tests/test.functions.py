from LLM.functions.llm_functions import extract_text_from_pdf, generate_summary, generate_quiz

pdf_path = "test.pdf"

text = extract_text_from_pdf("PAW_curs_1.pdf")
print("=== TEXT EXTRAS ===")
print(text[:500])

print("\n=== REZUMAT ===")
print(generate_summary(text))

print("\n=== QUIZ ===")
quiz = generate_quiz(text)
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
