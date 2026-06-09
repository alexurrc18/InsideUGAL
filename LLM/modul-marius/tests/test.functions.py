import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
from functions.llm_functions import load_pdf_into_rag, generate_summary

pdf_path = os.path.join(os.path.dirname(__file__), "..", "pdfs", "PAW_curs_1.pdf")
pdf_id = "PAW_curs_1"

print("=== INCARCARE PDF IN RAG ===")
chunks, language = load_pdf_into_rag(pdf_path, pdf_id)
print(f"PDF impartit in {len(chunks)} chunk-uri, limba: {language}")

print("\n=== REZUMAT ===")
print(generate_summary(pdf_id, language))
