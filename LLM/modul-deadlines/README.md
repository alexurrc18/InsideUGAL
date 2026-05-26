# 🧠 InsideUGAL - Smart Task Extractor (LLM Module)

![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blueviolet)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![Version](https://img.shields.io/badge/Version-2.0.0--Mobile--Ready-orange)

## 📌 Descriere
Acest microserviciu face parte din platforma **InsideUGAL** și utilizează inteligența artificială (Google Gemini) pentru a extrage date structurate din anunțurile academice postate de profesori. Scopul este de a transforma un text liber într-un set de date clar, care poate fi utilizat pentru a genera notificări, calendare și task-uri automate pentru studenți.

Versiunea **2.0.0 (Mobile Ready)** este optimizată special pentru a servi aplicația mobilă și dashboard-ul principal, oferind metadate avansate precum nivelul de urgență și rezumate scurte pentru notificări push.

---

## ✨ Funcționalități Cheie
- **Extracție Inteligentă:** Identifică materia, tipul de eveniment (proiect, laborator, colocviu, etc.) și task-urile concrete.
- **Calculul Urgenței:** Determină automat prioritatea în funcție de proximitatea deadline-ului.
- **Optimizare Mobile:** Generează rezumate scurte (max 80 caractere) potrivite pentru notificările de pe telefon.
- **Detectare Link-uri:** Extrage automat URL-uri către Teams, GitHub sau alte resurse menționate în text.
- **Validare Pydantic:** Toate datele sunt validate riguros înainte de a fi trimise către frontend.

---

## 🛠️ Tehnologii Utilizate
- **Limbaj:** Python 3.11+
- **Framework API:** FastAPI
- **LLM:** Google Gemini 2.5 Flash (via `google-genai` SDK)
- **Validare Date:** Pydantic v2
- **Testare:** Pytest & Asyncio

---

## 🚀 Instalare și Rulare Locală

### 1. Clonare și Navigare
```bash
git clone https://github.com/alexurrc18/InsideUGAL.git
cd InsideUGAL/LLM/modul-deadlines
```

### 2. Instalare Dependențe
```bash
pip install -r requirements.txt
```

### 3. Configurare Variabile de Mediu
Creează un fișier `.env` în folderul curent:
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
  "text": "Salutare. Nu uitati ca saptamana viitoare pe 27 Mai este deadline-ul la IP. Proiectele se fac in echipe de maxim 3. Cine nu aduce diagrama UML are -2 puncte."
}
```

### Exemplu Răspuns (v2.0.0)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "data_generare": "2026-05-26T14:30:00.000000",
  "materie": "Ingineria Programarii",
  "tip_eveniment": "proiect",
  "urgenta_estimata": "medie",
  "taguri_cheie": ["UML", "IP", "Echipa"],
  "deadline_absolut": "2026-05-27 23:59",
  "dimensiune_echipa": 3,
  "rezumat_notificare": "Deadline Proiect IP pe 27.05 - Diagrama UML obligatorie",
  "taskuri_extrase": [
    "Realizarea proiectului la Ingineria Programarii",
    "Generarea diagramei UML"
  ],
  "penalizari_sau_reguli": [
    "Lipsa diagramei UML atrage o penalizare de -2 puncte."
  ],
  "linkuri_utile": []
}
```

---

## 🧪 Testare
Pentru a rula suita de teste automate:
```bash
pytest
```

---

## 📈 Roadmap
- [ ] Integrare cu baza de date globală Postgres.
- [ ] Suport pentru parsarea fișierelor PDF (cerințe de laborator).
- [ ] Tehnici de Few-Shot Prompting pentru o acuratețe sporită.

---
_Dezvoltat pentru proiectul InsideUGAL - Universitatea "Dunărea de Jos" din Galați._
