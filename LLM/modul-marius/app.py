import os
import sys
import uuid
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify, send_from_directory
from functions.llm_functions import load_pdf_into_rag, generate_summary, generate_quiz, answer_question

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), "static"))

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/")
def index():
    return send_from_directory(os.path.join(os.path.dirname(__file__), "static"), "index.html")


@app.route("/upload", methods=["POST"])
def upload():
    if "pdf" not in request.files:
        return jsonify({"error": "Niciun fisier trimis"}), 400

    file = request.files["pdf"]
    if not file.filename.endswith(".pdf"):
        return jsonify({"error": "Fisierul trebuie sa fie PDF"}), 400

    pdf_id = str(uuid.uuid4())
    pdf_path = os.path.join(UPLOAD_FOLDER, f"{pdf_id}.pdf")
    file.save(pdf_path)

    try:
        load_pdf_into_rag(pdf_path, pdf_id)
        summary = generate_summary(pdf_id)
        quiz = generate_quiz(pdf_id)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"summary": summary, "quiz": quiz, "pdf_id": pdf_id})


@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get("question", "").strip()
    pdf_id = data.get("pdf_id", "").strip()
    if not question or not pdf_id:
        return jsonify({"error": "Intrebare sau pdf_id lipsa"}), 400
    try:
        answer = answer_question(question, pdf_id)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"answer": answer})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
