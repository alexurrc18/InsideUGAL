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

### Exemplu Real (Anunț Sesiune Restanțe - ACIEE)

**Text Brut:**

> "Sesiune de restanțe 6 - 24 aprilie 2026 În perioada 6-24 aprilie 2026 se organizează o sesiune de restanțe suplimentară pentru toți anii de studii, licență și masterat. Participarea studenților la această sesiune se va face pe bază de cerere, completând formularul: https://forms.gle/cJGdBd1k3Dr5eG8W9, până pe 24 martie, ora 12:00. Examenele restante se pot susține cu acordul cadrului didactic titular, cu plata taxei!"

**Output Gemini:**

```json
{
  "materie": "Sesiune Restanțe",
  "tip_eveniment": "anunt_general",
  "urgenta_estimata": "scazuta",
  "taguri_cheie": ["Restanțe", "Licență", "Masterat", "Taxă", "Formular"],
  "deadline_absolut": "2026-03-24 12:00",
  "dimensiune_echipa": null,
  "rezumat_notificare": "Anunt sesiune restanțe suplimentară licență și masterat în aprilie 2026.",
  "taskuri_extrase": [
    "Completează formularul de cerere pentru participare",
    "Obține acordul cadrului didactic titular",
    "Plătește taxa pentru examen"
  ],
  "penalizari_sau_reguli": [
    "Participarea se face pe bază de cerere",
    "Examenele se susțin cu acordul cadrului didactic titular",
    "Examenele se susțin cu plata taxei"
  ],
  "linkuri_utile": ["https://forms.gle/cJGdBd1k3Dr5eG8W9"],
  "id": "52315a72-d837-417b-b739-db273586a81a",
  "data_generare": "2026-05-26T10:52:46.424912"
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

## 🛠️ Ghid Integrare Backend & Database (Specificații Contract)

Această secțiune este dedicată echipei de **Backend** pentru a facilita salvarea datelor extrase în Postgres.

### 1. Schema SQL Sugerată

Pentru a păstra integritatea datelor, recomandăm următoarea structură de tabel:

```sql
-- Definire Enums pentru validare strictă
CREATE TYPE nivel_urgenta AS ENUM ('ridicata', 'medie', 'scazuta');
CREATE TYPE tip_eveniment AS ENUM ('proiect', 'laborator', 'partial', 'colocviu', 'anunt_general');

CREATE TABLE extracted_tasks (
    id UUID PRIMARY KEY,
    materie VARCHAR(255) NOT NULL,
    tip_eveniment tip_eveniment NOT NULL,
    urgenta_estimata nivel_urgenta NOT NULL,
    deadline_absolut TIMESTAMP WITHOUT TIME ZONE,
    rezumat_notificare VARCHAR(80) NOT NULL,
    dimensiune_echipa INTEGER,

    -- Utilizăm JSONB pentru flexibilitate și interogări rapide în liste
    taguri_cheie JSONB DEFAULT '[]',
    taskuri_extrase JSONB DEFAULT '[]',
    penalizari_sau_reguli JSONB DEFAULT '[]',
    linkuri_utile JSONB DEFAULT '[]',

    data_generare TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    text_sursa TEXT -- Recomandat pentru audit sau re-procesare
);
```

### 2. Note Implementare

- **Idempotentă:** Deși modulul generează un `id` (UUID), se recomandă ca backend-ul să verifice duplicatele pe baza unui hash al `text_sursa` dacă utilizatorii pot declanșa extracția manual de mai multe ori.
- **Tipuri de Date:** Câmpurile `taguri_cheie`, `taskuri_extrase`, `penalizari_sau_reguli` și `linkuri_utile` sunt returnate ca liste Python (`List[str]`). În Postgres, acestea se mapează cel mai bine pe `JSONB`.
- **Validare:** Valorile pentru `tip_eveniment` și `urgenta_estimata` sunt fixe. Orice adăugare de noi tipuri trebuie sincronizată între modelul Pydantic din `main.py` și tipurile `ENUM` din baza de date.

---

_Dezvoltat pentru proiectul InsideUGAL - Universitatea "Dunărea de Jos" din Galați._
