import json
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

course_material = """
Fotosinteza este procesul prin care plantele folosesc lumina solara, apa si dioxidul de carbon
pentru a produce glucoza si oxigen. Acest proces are loc in cloroplaste, organite care contin
clorofila. Ecuatia generala a fotosintezei este:
6CO2 + 6H2O + lumina → C6H12O6 + 6O2.
Fotosinteza are doua etape: reactiile luminoase si ciclul Calvin.
"""

prompt = f"""Genereaza 5 intrebari quiz bazate pe materialul de mai jos.
Returneaza DOAR un JSON valid, fara alt text, in acest format exact:
[
  {{
    "intrebare": "...",
    "variante": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
    "raspuns_corect": "A"
  }}
]

Material:
{course_material}
"""

response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": prompt}]
)

raw = response.choices[0].message.content.strip()
if raw.startswith("```"):
    raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

questions = json.loads(raw)

score = 0
for i, q in enumerate(questions):
    print(f"\nIntrebarea {i+1}: {q['intrebare']}")
    for litera, text in q["variante"].items():
        print(f"  {litera}) {text}")

    raspuns = input("Raspunsul tau (A/B/C/D): ").strip().upper()

    if raspuns == q["raspuns_corect"]:
        print("Corect!")
        score += 1
    else:
        print(f"Gresit. Raspunsul corect era: {q['raspuns_corect']}) {q['variante'][q['raspuns_corect']]}")

print(f"\nScor final: {score}/{len(questions)}")
