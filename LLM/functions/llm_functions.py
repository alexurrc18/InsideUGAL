import json
import os
import pdfplumber
import chromadb
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
chroma_client = chromadb.Client()


def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text


def chunk_text(text, chunk_size=500, overlap=50):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def store_in_vector_db(chunks, pdf_id):
    collection = chroma_client.get_or_create_collection(name=pdf_id)
    embeddings = embedding_model.encode(chunks).tolist()
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[f"{pdf_id}_chunk_{i}" for i in range(len(chunks))]
    )
    return collection


def query_relevant_chunks(query, pdf_id, n_results=5):
    collection = chroma_client.get_or_create_collection(name=pdf_id)
    query_embedding = embedding_model.encode([query]).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=n_results)
    return results["documents"][0]


def load_pdf_into_rag(pdf_path, pdf_id):
    text = extract_text_from_pdf(pdf_path)
    chunks = chunk_text(text)
    store_in_vector_db(chunks, pdf_id)
    return chunks


def generate_summary(pdf_id):
    chunks = query_relevant_chunks("rezumat general curs introducere concepte principale", pdf_id, n_results=8)
    context = "\n\n".join(chunks)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{
            "role": "user",
            "content": f"Fa un rezumat clar si concis al urmatorului material de curs, in romana:\n\n{context}"
        }]
    )
    return response.choices[0].message.content


def generate_quiz(pdf_id):
    chunks = query_relevant_chunks("concepte importante definitii exemple", pdf_id, n_results=10)
    context = "\n\n".join(chunks)
    nr_intrebari = min(10, max(5, len(chunks)))
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
{context}
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw)
