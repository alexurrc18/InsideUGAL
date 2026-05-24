# ⚙️ Backend API - InsideUGAL

Acest modul reprezintă nucleul logic al platformei, dezvoltat în **FastAPI**. Acesta acționează ca un intermediar între baza de date Supabase și interfețele de utilizator (Frontend Dashboard și Aplicația Mobilă).

## 🔧 Funcționalități și Endpoint-uri API

### 🍴 Modulul Cantină
* **Nomenclator**: Endpoint-uri pentru gestionarea produselor, prețurilor și valorilor nutriționale.
* **Meniu Zilnic**: Logica de business pentru planificarea și servirea meniului săptămânal.

### ⚠️ Sistem de Sesizări (Ticketing)
* **Procesare Status**: Gestionarea tranzițiilor de stare pentru sesizări (`Nou` -> `În lucru` -> `Rezolvat`).
* **Validare**: Verificarea datelor primite de la studenți înainte de salvarea în baza de date.

### 📍 Servicii Geospațiale
* **API Locații**: Servirea coordonatelor GPS și a detaliilor despre clădirile din campus către modulul de Hartă.

## 🛠️ Stack Tehnic
* **Framework**: FastAPI
* **Limbaj**: Python 3.10+
* **Validare Date**: Pydantic
* **Database Client**: Supabase-py (PostgreSQL)
* **Server**: Uvicorn
