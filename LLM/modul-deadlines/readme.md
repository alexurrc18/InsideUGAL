# 🚀 4. Instalare și Rulare Locală

Pentru a porni microserviciul pe mașina ta locală de dezvoltare, urmează următorii pași din terminalul VS Code:

### 📂 Navighează în folderul modulului

```bash
cd LLM/modul-deadlines
```

### 📦 Instalează dependențele necesare

```bash
pip install -r requirements.txt
```

### 🔐 Configurarea variabilelor de mediu

Creează un fișier numit `.env` în rădăcina acestui folder și adaugă cheia ta secretă obținută din Google AI Studio:

```env
GEMINI_API_KEY=Arunca_Aici_Cheia_Ta_Secretă
```

### ▶️ Pornirea serverului API

Rulează scriptul principal:

```bash
python main.py
```

---

# 🔌 5. Utilizare API și Documentație Interactivă

Odată pornit serverul, FastAPI generează automat o documentație interactivă completă (Swagger UI).

### 🌐 Interfața de testare directă în browser

```text
http://127.0.0.1:8000/docs
```

### 📡 Endpoint Principal

```http
POST /api/v1/extract-tasks
```

---

## 📥 Exemplu de Corp Request (JSON transmis de Frontend)

```json
{
  "text": "Salutare. Nu uitati ca saptamana viitoare pe 27 Mai este deadline-ul la IP. Proiectele se fac in echipe de maxim 3. Cine nu aduce diagrama UML are -2 puncte."
}
```

---

## 📤 Exemplu de Răspuns (JSON generat de Gemini v2.0 Mobile-Ready)

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

# 📈 6. Planuri de Îmbunătățire (Roadmap Viitor)

- [ ] Integrarea unei conexiuni directe cu baza de date globală a aplicației pentru salvarea automată a task-urilor în tabela de task management.

- [ ] Adăugarea unui modul de parsare de fișiere PDF pentru a extrage cerințele direct din fișierul de laborator încărcat de profesor.

- [ ] Optimizarea sistemului de prompt prin tehnici de Few-Shot Prompting pentru o acuratețe sporită pe textele cu un jargon academic specific universității.
