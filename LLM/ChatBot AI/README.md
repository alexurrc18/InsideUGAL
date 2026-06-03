# 🤖 Asistent AI Desktop Next-Gen (Integrare OpenRouter & RAG)

## 📖 Introducere și Viziune Generală

**Asistentul AI Desktop Next-Gen** este mult mai mult decât un simplu client de chat; este un ecosistem conversațional inteligent, complet autonom, conceput pentru a rula nativ pe sistemul de operare Windows/Linux. Construit în Python, proiectul a fost dezvoltat pornind de la o nevoie clară: **democratizarea accesului la modele de limbaj de top (LLMs) printr-o interfață desktop premium, privată și lipsită de limitările sau distragerile unui browser web.**

Ceea ce face acest bot cu adevărat special este **arhitectura sa hibridă**. În loc să se bazeze exclusiv pe cunoștințele pre-antrenate ale unui model generic din cloud, aplicația aduce inteligența artificială "acasă", ancorând-o în realitatea utilizatorului:

1. **Memoria Instituțională (Sistemul RAG):** Printr-o bază de date vectorială locală (ChromaDB), bot-ul deține cunoștințe specifice despre mediul universitar (Universitatea „Dunărea de Jos” din Galați - UGAL). El poate consulta instantaneu regulamente, orare, informații despre facultăți sau cantină, oferind răspunsuri hiper-personalizate și documentate, eliminând complet "halucinațiile" tipice modelelor AI.
2. **Puterea de Calcul din Cloud (OpenRouter):** După ce își extrage contextul local, asistentul pasează sarcina de formulare și raționament logic către cele mai avansate modele de limbaj disponibile prin gateway-ul OpenRouter, garantând răspunsuri de o calitate excepțională, rapid și eficient.
3. **Productivitate Multimodală:** Asistentul nu se limitează doar la text. El este un "analist de date" care poate citi documente atașate local (`.txt`, `.py`, `.csv`, etc.) și un "creator de conținut" capabil să genereze imagini la cerere (via Pollinations.ai), toate integrate fluid în același fir de discuție.

Din punct de vedere vizual, aplicația setează un nou standard pentru proiectele Python. Cu o interfață bazată pe `CustomTkinter`, designul profund, în nuanțe "Dark Mode", elementele vizuale fluide și managementul organic al erorilor (fără crash-uri, fără blocaje) creează o experiență de utilizare care rivalizează cu aplicațiile comerciale de top. 

---

## ✨ Funcționalități Principale

- **Interfață Grafică Modernă și Fluidă (CustomTkinter):** Design "Dark Mode" premium, colțuri rotunjite, scroll nativ (fără bare inestetice vizibile) și redimensionare dinamică a bulelor de chat la milimetru. Textul răspunsurilor lungi se adaptează perfect, fără trunchieri sau spații goale, oferind opțiunea de selectare și copiere.
- **Procesare Asincronă Totală (Non-Blocking):** Decuplarea absolută a proceselor grele (apeluri API, interogări RAG, descărcări de imagini) de interfața grafică. Aplicația rămâne perfect responsivă (nu ia freeze) în timp ce "gândește" sau comunică cu serverele externe.
- **Sistem RAG Integrat (Retrieval-Augmented Generation):** "Creierul" local al bot-ului. Înainte de a răspunde, aplicația interoghează automat baza de date vectorială pentru a oferi informații exacte, actualizate și specifice contextului UGAL.
- **Analiză de Documente și Atașamente:** Sistem vizual elegant, de tip "chip" extern, pentru încărcarea documentelor locale. Conținutul fișierelor este extras în fundal și injectat automat în contextul modelului AI, permițând rezumarea, depanarea sau analiza datelor.
- **Generare de Imagini AI Nativă:** Prin integrarea API-ului minimal Pollinations.ai, utilizatorul poate cere direct generarea unei ilustrații. Imaginea este descărcată, redimensionată optim pe plan local și afișată direct în fluxul conversației (cu un buton discret pentru salvare pe disc).
- **Management Inteligent al Sesiunilor:** Persistență granulară a conversațiilor. Sesiunile sunt salvate automat în fișiere `.json` individuale, iar bara laterală (Sidebar) organizează și grupează istoric în funcție de momentul temporal ("Astăzi", "Ieri", "Ultimele 7 zile").
- **Securitate la Nivel de Mediu (Izolarea Cheilor):** Implementare `python-dotenv` pentru a menține credențialele API (ex: cheia OpenRouter) strict în memoria volatilă a sistemului de operare, eliminând total riscul expunerii acestora în codul sursă.

---

## 🏗️ Arhitectura Sistemului

Sistemul este guvernat de un model arhitectural curat și modular, împărțit în patru mari componente:

1. **Modulul de Prezentare (`ChatApp`):** Construit peste `CustomTkinter`. Controlează layout-ul responsiv, preluarea input-ului (inclusiv scurtături de tastatură), maparea avansată a evenimentelor de redimensionare și afișarea elementelor grafice (bule de chat, imagini, loading spinners).
2. **Modulul de Comunicație (`LLMClient`):** Interfața de rețea. Interceptează intențiile, aplică istoricul sesiunii (pentru menținerea contextului conversațional) și inițiază conexiuni HTTPS sigure cu endpoint-urile cloud.
3. **Nucleul RAG (`RAGEngine`):** Motorul de căutare semantică. Analizează intenția utilizatorului (query), caută în `ChromaDB` documentele relevante folosind tehnici de `embedding` și creează un context de tip "ground truth" (adevăr absolut) care este atașat invizibil la prompt-ul final.
4. **Parsare și Prompting (`PromptBuilder` & `OutputParser`):** Arhitecții de text. Formatează datele brute primite de la server, corectează eventualele anomalii de sintaxă markdown și aplică instrucțiunile de sistem care dau "personalitatea" bot-ului.

---

## 🚀 Instalare și Configurare

### 1. Precondiții
- Python 3.10+ instalat pe sistem.
- Un mediu virtual activat (recomandat).
- Baza de date vectorială (ChromaDB) pre-populată în directorul specificat de `RAGEngine`.

### 2. Instalarea pachetelor necesare
La prima rulare, scriptul este configurat să instaleze automat majoritatea pachetelor lipsă (folosind un helper intern). Alternativ, poți instala dependințele manual:
```bash
pip install customtkinter pillow requests python-dotenv google-genai