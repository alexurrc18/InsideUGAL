# ⚙️ InsideUGAL - Backend API

Acesta este nucleul aplicației **InsideUGAL**, responsabil de logica de business, gestionarea datelor și autentificarea utilizatorilor în cadrul platformei academice.

---

## 🛠️ Stack Tehnologic
- **Runtime:** Python 3.10+
- **Framework:** FastAPI
- **Bază de Date:** SQLite (pentru dezvoltare) / PostgreSQL (pentru producție)
- **ORM:** SQLAlchemy
- **Validare:** Pydantic

---

## 🚀 Instalare și Configurare

### 1. Cerințe preliminare
- Python 3.10+
- Git instalat

### 2. Pași pentru rulare
```bash
# 1. Navighează în folderul proiectului
cd InsideUGAL

# 2. Instalează dependențele
pip install -r backend/requirements.txt

# 3. Pornește serverul
uvicorn app.main:app --reload --port 8000
```

### 3. Verificare
```bash
curl http://localhost:8000/health
# Response: {"status": "healthy"}
```

---

## 📊 Structura Bazei de Date

| Tabel | Descriere |
|-------|-----------|
| users | Utilizatori (studenți, profesori, admini) |
| students | Profiluri studenți cu legătură la user |
| professors | Profiluri profesori cu legătură la user |
| faculties | Facultăți/universități |
| courses | Cursuri cu profesor și facultate |
| enrollments | Legătură M:N studenți-cursuri cu note |
| announcements | Anunțuri cu suport pin și expirare |