import json
import os
import pdfplumber
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

def generate_summary(text):
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{
            "role": "user",
            "content": f"Fa un rezumat clar si concis al urmatorului material de curs, in romana:\n\n{text}"
        }]
    )
    return response.choices[0].message.content

def generate_quiz(text):
    nr_cuvinte = len(text.split())
    nr_intrebari = max(5, min(20, nr_cuvinte // 200))
    prompt = f"""Genereaza {nr_intrebari} intrebari quiz bazate pe materialul de mai jos.
Returneaza DOAR un JSON valid, fara alt text, in acest format exact:
[
  {{
    "intrebare": "...",
    "variante": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
    "raspuns_corect": "A",
    "explicatie": "Explicatie de ce raspunsul corect este corect."
  }}
]

Material:
{text}
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw)
