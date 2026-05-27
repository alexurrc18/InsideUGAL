# 🧠 InsideUGAL - Smart Task Extractor (LLM Module)

![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blueviolet)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![Version](https://img.shields.io/badge/Version-2.1.0--Multi--Source-orange)

## 📌 Descriere

Acest microserviciu face parte din platforma **InsideUGAL** și utilizează inteligența artificială (Google Gemini) pentru a extrage date structurate din anunțurile academice. Versiunea **2.1.0 (Multi-Source Ready)** este capabilă să identifice sursa anunțului (Facultate vs. Universitate), publicul țintă și locațiile fizice sau virtuale menționate.

---

## ✨ Funcționalități Cheie

- **Detectare Sursă:** Identifică dacă anunțul vine de la o facultate specifică (ex: ACIEE, FSEAA, SIA) sau de la Rectoratul UGAL (Directia Camine, Social, etc.).
- **Public Țintă:** Determină grupurile de studenți vizate (ex: "Anul 1", "Masteranzi", "Toți studenții").
- **Extracție Locație:** Identifică săli, corpuri de clădire (ex: "B21", "Corp D"), platforme online (Teams, Moodle) sau puncte de interes (Secretariat).
- **Recunoaștere Evenimente:** Clasifică anunțurile în categorii precum proiecte, laboratoare, examene, concursuri sau anunțuri administrative.
- **Calcul Inteligent Deadline:** Transformă termenele relative (ex: "până vineri", "în perioada 1-7") în date calendaristice precise raportate la momentul curent.
- **Optimizare Mobile:** Generează rezumate scurte (max 80 caractere) potrivite pentru notificările Push.

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
cd InsideUGAL/LLM/modul-deadlines
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

### Exemplu Răspuns (v2.1.0)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "data_generare": "2026-05-27T14:30:00.000000",
  "materie_sau_subiect": "Concurs Severin Bumbaru",
  "entitate_sursa": "UGAL General",
  "tip_eveniment": "concurs",
  "urgenta_estimata": "scazuta",
  "public_tinta": ["Toti studentii"],
  "locatie": "Online",
  "deadline_absolut": "2026-03-20 23:59",
  "rezumat_notificare": "Inscrieri Concurs Severin Bumbaru pana pe 20.03",
  "taskuri_extrase": ["Inscriere la concurs"],
  "penalizari_sau_reguli": ["Inscrierea se face online"],
  "linkuri_utile": ["https://www.concurssbumbaru.ugal.ro/"],
  "taguri_cheie": ["Concurs", "IT", "UGAL"]
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
