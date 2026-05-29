import os
import sys
import uuid
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify, send_from_directory
from functions.llm_functions import load_pdf_into_rag, generate_summary, generate_quiz, answer_question
import supabase_logger

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), "static"))

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
METADATA_FILE = os.path.join(os.path.dirname(__file__), "pdfs_metadata.json")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def load_metadata():
    if not os.path.exists(METADATA_FILE):
        return []
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_metadata(data):
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.route("/")
def index():
    return send_from_directory(os.path.join(os.path.dirname(__file__), "static"), "index.html")


@app.route("/pdfs", methods=["GET"])
def get_pdfs():
    return jsonify(load_metadata())


@app.route("/pdfs/<pdf_id>", methods=["DELETE"])
def delete_pdf(pdf_id):
    metadata = load_metadata()
    metadata = [p for p in metadata if p["pdf_id"] != pdf_id]
    save_metadata(metadata)
    pdf_path = os.path.join(UPLOAD_FOLDER, f"{pdf_id}.pdf")
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    return jsonify({"ok": True})


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
        _, language = load_pdf_into_rag(pdf_path, pdf_id)
        with ThreadPoolExecutor(max_workers=2) as pool:
            f_summary = pool.submit(generate_summary, pdf_id, language)
            f_quiz = pool.submit(generate_quiz, pdf_id, language)
            summary = f_summary.result()
            quiz = f_quiz.result()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    metadata = load_metadata()
    metadata.insert(0, {
        "pdf_id": pdf_id,
        "filename": file.filename,
        "uploaded_at": datetime.utcnow().isoformat(),
        "language": language,
        "summary": summary,
        "quiz": quiz,
    })
    save_metadata(metadata)

    return jsonify({"summary": summary, "quiz": quiz, "pdf_id": pdf_id, "filename": file.filename})


@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get("question", "").strip()
    pdf_id = data.get("pdf_id", "").strip()
    if not question or not pdf_id:
        return jsonify({"error": "Intrebare sau pdf_id lipsa"}), 400
    metadata = load_metadata()
    pdf_meta = next((p for p in metadata if p["pdf_id"] == pdf_id), {})
    language = pdf_meta.get("language", "ro")
    try:
        answer = answer_question(question, pdf_id, language)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    supabase_logger.log_question(pdf_id, question, answer)
    return jsonify({"answer": answer})


@app.route("/score", methods=["POST"])
def save_score():
    data = request.get_json()
    pdf_id = data.get("pdf_id", "").strip()
    correct = data.get("correct")
    total = data.get("total")
    if not pdf_id or correct is None or total is None:
        return jsonify({"error": "Date incomplete"}), 400
    supabase_logger.log_quiz_score(pdf_id, int(correct), int(total))
    return jsonify({"ok": True})


if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    app.run(debug=debug_mode, port=5000)
