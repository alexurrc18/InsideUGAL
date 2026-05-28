# 🧠 InsideUGAL - Smart Task Extractor (LLM Module)

![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blueviolet)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![Version](https://img.shields.io/badge/Version-2.2.0--Smart--Logic-orange)

## 📌 Descriere

Acest microserviciu face parte din platforma **InsideUGAL** și utilizează inteligența artificială (Google Gemini) pentru a extrage date structurate din anunțurile academice. Versiunea **2.2.0 (Smart Logic)** introduce suport extins pentru oportunități de carieră și o logică avansată de calcul pentru termene limită.

---

## ✨ Funcționalități Cheie

- **Detectare Sursă:** Identifică automat entitatea emitentă (Rectorat, Facultăți, Companii partenere).
- **Recunoaștere Evenimente (Extinsă):** Clasifică anunțurile în categorii: proiecte, laboratoare, examene, **internships, burse, voluntariat, cazare**, concursuri sau administrativ.
- **Logică Inteligentă Deadline (v2.2):** 
  - Gestionează date relative (ex: "până vineri").
  - Rezolvă contradicții (alege termenul cel mai urgent).
  - Corectează erori de an (ex: corecție automată din 2024 în viitorul apropiat).
  - Returnează `null` pentru anunțuri fără termen limită (fără placeholders).
- **Public Țintă & Locație:** Extracție precisă a grupurilor vizate și a locațiilor (fizice sau digitale).
- **Optimizare Mobile:** Rezumate telegrafice (max 80 caractere) pentru notificări Push.

---

## 🛠️ Tehnologii Utilizate

- **Limbaj:** Python 3.11+
- **Framework API:** FastAPI
- **LLM:** Google Gemini 2.5 Flash
- **Validare Date:** Pydantic v2
- **Testare:** Pytest & Asyncio

---

## 🚀 Instalare și Rulare Locală

### 1. Clonare și Navigare

```bash
cd InsideUGAL/LLM/smart-news-parser
```

### 2. Instalare Dependențe

```bash
pip install -r requirements.txt
```

### 3. Configurare Variabile de Mediu

Creează un fișier `.env` în root-ul `LLM`:

```env
GEMINI_API_KEY=Cheia_Ta_De_La_Google_AI_Studio
```

### 4. Pornire Server

```bash
python main.py
```

Serverul va rula la `http://127.0.0.1:8000`.

---

## 🔌 Utilizare API

### Endpoint Principal

- **POST** `/api/v1/extract-tasks`

### Exemplu Request

```json
{
  "text": "Înscrierea participanților la Concursul Severin Bumbaru se face până pe 20 martie 2026 pe site-ul concursului."
}
```

### Exemplu Răspuns (v2.2.0)

```json
{
  "id": "9b80f3a5-9daf-4e5a-875a-5be75d604503",
  "data_generare": "2026-05-28T10:30:00.000000",
  "materie_sau_subiect": "Internship Liberty - Scoala de vara",
  "entitate_sursa": "LIBERTY Galati",
  "tip_eveniment": "internship",
  "urgenta_estimata": "scazuta",
  "public_tinta": ["Studenti", "Proaspeti absolventi"],
  "locatie": null,
  "deadline_absolut": "2027-04-30 23:59",
  "rezumat_notificare": "Internship Liberty 'Scoala de vara' 2024. Aplica pana pe 30 aprilie.",
  "taskuri_extrase": ["Aplica la programul de internship"],
  "penalizari_sau_reguli": [],
  "linkuri_utile": ["https://www.libertysteelgroup.com"],
  "taguri_cheie": ["Internship", "Cariera", "Liberty"]
}
```

---

## 🧪 Testare

Pentru a rula testele unitare:

```bash
pytest test_main.py
```

Pentru a testa cu anunțuri reale din UGAL:

```bash
python test_real_announcements.py
```

---

_Dezvoltat pentru proiectul InsideUGAL - Universitatea "Dunărea de Jos" din Galați._
