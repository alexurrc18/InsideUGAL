# 🧠 Documentație Modul LLM — Proiect insideUGAL

Acest folder conține arhitectura și codul pentru **Asistentul Virtual bazat pe Inteligență Artificială (LLM)** al aplicației **insideUGAL**.

Rolul acestui modul este de a transforma o simplă listă cu meniul cantinei într-o experiență interactivă pentru studenții Universității „Dunărea de Jos” din Galați.

---

# 🎯 1. Viziunea Modulului

Pe parcursul acestui stagiu de practică, echipa de LLM are ca scop dezvoltarea unui asistent inteligent care va fi integrat în aplicația finală.

## Funcționalități vizate pe termen lung

### 🥗 Recomandări Inteligente
Asistentul va filtra meniul în funcție de bugetul studentului.

Exemple:
- *„Am 15 lei, ce pot mânca?”*
- *„Care este cel mai ieftin meniu?”*

---

### ⚠️ Atenție la Alergeni
Botul va avertiza utilizatorii cu privire la alergeni precum:
- gluten
- lactoză
- ouă

Exemplu:
- *„Sunt alergic la ouă. Ce pot mânca?”*

---

### 🔌 Integrare Backend (API)
Scriptul actual va fi transformat într-un microserviciu folosind tehnologii precum:

- FastAPI
- REST API
- JSON responses

Acesta va putea comunica direct cu aplicația Android/Web.

---

### 🗄️ Bază de date dinamică (RAG)
În versiunea finală, AI-ul nu va avea meniul scris direct în cod.

Meniul va fi încărcat:
- dintr-o bază de date;
- din fișiere `.json`;
- sau prin API-ul backend-ului.

---

# 🚀 2. Stadiul Curent — Prototip în Terminal

În acest moment există un prototip funcțional care rulează în terminal și utilizează API-ul oficial **Google Gemini (`gemini-2.5-flash`)** pentru simularea comportamentului asistentului.

Prototipul include:
- meniu de test;
- personalitate configurată;
- reguli stricte de comportament;
- memorie conversațională de bază.

---

# 🛠️ Tehnologii Folosite

| Tehnologie | Rol |
|---|---|
| Python 3.12+ | Limbaj principal |
| uv | Management medii virtuale și pachete |
| google-genai | SDK oficial Google Gemini |
| python-dotenv | Gestionarea cheilor API |

---

# 💻 3. Cum testezi chatbot-ul local

Dacă ești coleg de echipă și vrei să testezi logica asistentului, urmează pașii de mai jos.

> ⚠️ Vei avea nevoie de o cheie API privată Google Gemini.

---

## Pasul 1 — Pregătirea mediului

Deschide terminalul în folderul proiectului și rulează:

```bash
uv venv
uv pip install google-genai python-dotenv
```

---

## Pasul 2 — Configurarea cheii API

În proiect există fișierul:

```plaintext
.env.example
```

### Creează o copie:

```plaintext
.env
```

Deschide fișierul `.env` și adaugă cheia ta API:

```env
GEMINI_API_KEY=AIzaSy_cheia_ta_secreta_aici
```

> ⚠️ Fișierul `.env` NU trebuie urcat pe GitHub.

---

## Pasul 3 — Pornirea asistentului

Rulează scriptul folosind `uv`:

```bash
uv run ceva.py
```

---

# 🧪 4. Scenarii de Testare

Pentru validarea comportamentului AI-ului, testează următoarele scenarii direct în terminal.

---

## ✅ Testul 1 — Funcționalitate de bază & prețuri

### Input utilizator
```plaintext
Salut! Dacă iau meniul vegetarian și o salată, câți bani îmi trebuie?
```

### Comportament așteptat
Botul trebuie:
- să citească meniul;
- să calculeze totalul;
- să răspundă politicos.

### Rezultat așteptat
```plaintext
18.00 lei
```

---

## ✅ Testul 2 — Memorie și context

### Input utilizator
```plaintext
Dar ciorba de pui cât costă?
```

Apoi:

```plaintext
Calculează-mi totalul pentru toate cele 3 de până acum
```

### Comportament așteptat
Botul trebuie să țină minte:
- meniul vegetarian;
- salata;
- ciorba de pui.

### Rezultat final
```plaintext
26.50 lei
```

---

## ✅ Testul 3 — Guardrails / Restricții

### Input utilizator
```plaintext
Ajută-mă să scriu un cod în C++
```

sau

```plaintext
Cine a câștigat al doilea război mondial?
```

### Comportament așteptat
Botul trebuie să refuze politicos și să amintească faptul că rolul său este exclusiv legat de cantina UGAL.

---

## ✅ Testul 4 — Gestionarea alergenilor

### Input utilizator
```plaintext
Ciorba de pui are ou? Sunt alergic.
```

### Comportament așteptat
Botul trebuie să avertizeze utilizatorul că:
- ciorba a la grec conține ou și smântână.

---

## ✅ Testul 5 — Ieșirea din aplicație

### Input utilizator
```plaintext
exit
```

sau

```plaintext
iesire
```

### Comportament așteptat
Programul:
- închide conversația;
- oprește execuția în siguranță.

---

# ⚠️ 5. Reguli Interne pentru Echipă

## 🔒 Securitatea Datelor
NICIODATĂ nu faceți commit la fișierul `.env`.

Orice cheie API publică detectată pe GitHub este dezactivată automat de Google.

---

## 🔄 Actualizări
Dacă adăugați pachete noi (ex: FastAPI), actualizați:
- comenzile de instalare;
- această documentație.

---

## 📝 Modificarea Meniului
Orice schimbare a meniului de test se face modificând variabila:

```python
personalitate_si_meniu
```

din scriptul principal.

---

# 📂 Structură Recomandată

```plaintext
llm/
│
├── ceva.py
├── README.md
├── .env.example
├── requirements.txt
│
└── data/
    └── meniu.json
```

---

# 🔮 Roadmap

## Etapa 1
- [x] Prototip terminal
- [x] Integrare Gemini API
- [x] Memorie conversațională
- [x] Guardrails

## Etapa 2
- [ ] Integrare FastAPI
- [ ] Endpoint REST
- [ ] Meniu din JSON
- [ ] Logging conversații

## Etapa 3
- [ ] Integrare Android/Web
- [ ] Sistem RAG complet
- [ ] Istoric conversații
- [ ] Recomandări personalizate

---

# 👨‍💻 insideUGAL — Modul LLM

Dezvoltat în cadrul stagiului de practică pentru proiectul:

**insideUGAL**  
Universitatea „Dunărea de Jos” din Galați