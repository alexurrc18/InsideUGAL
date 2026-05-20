🎓 Campus AI — Platformă Inteligentă pentru Universități
O platformă web completă care digitalizează și inteligentizează viața academică — pentru studenți, profesori și administrație.

📋 Descriere
Campus AI este o aplicație web full-stack care centralizează toate aspectele vieții universitare într-o singură platformă inteligentă. Integrează funcționalități de gestionare academică (orar, note, examene), comunicare (chat, anunțuri, events), și un strat avansat de Inteligență Artificială (LLM, RAG, Fine-tuning) care personalizează experiența fiecărui utilizator și automatizează procese repetitive.

🚀 Funcționalități Principale
👨‍🎓 Pentru Studenți
Orar personalizat — vizualizare săptămânală/lunară a cursurilor
Note și examene — urmărire în timp real a rezultatelor academice
Burse și dosare — gestionare documente și aplicații pentru burse
Chat — comunicare directă cu colegi și profesori
Events & Anunțuri — calendar de activități pe campus
Asistent AI — răspunde la întrebări despre cursuri, regulamente, examene
Recomandări personalizate — cursuri opționale, events, grupuri de studiu
👨‍🏫 Pentru Profesori
Gestionare cursuri — materiale, teme, prezențe
Catalog note — introducere și gestionare note studenți
Comunicare — anunțuri, mesaje, feedback
Analiză AI — detectează studenți în dificultate bazat pe pattern-uri
🏛️ Pentru Administrație
Gestionare studenți și profesori — date complete, istoric academic
Rapoarte automate — statistici, situații școlare, predicții
Predicție AI — identifică studenți cu risc de abandon
Dashboard analytics — vizualizare date instituționale în timp real
🧠 Componente AI
LLM (Large Language Model) — GPT-4
Asistent conversațional pentru studenți
Răspunde la întrebări despre regulamente, cursuri, examene
Generează rezumate de materiale academice
Oferă feedback personalizat la teme
RAG (Retrieval Augmented Generation)
Indexează automat toate documentele universitare (regulamente, syllabus, materiale)
Asistentul AI răspunde bazat pe documentele reale ale universității
Actualizare automată când apar documente noi
Fine-tuning
Model antrenat specific pe terminologia și contextul universitar românesc
Îmbunătățește precizia răspunsurilor în timp
Adaptat la specificul fiecărei universități
Analiză Predictivă
Detectează studenți cu risc de abandon sau eșec academic
Recomandări personalizate de cursuri opționale
Predicție rezultate examene bazată pe pattern-uri istorice
🛠️ Tehnologii Folosite
Frontend
Tehnologie	Rol
React	Interfața utilizatorului
TailwindCSS	Styling modern și responsive
Framer Motion	Animații și tranziții
Recharts	Grafice și statistici
Axios	Comunicare cu backend-ul
React Query	Gestionarea stării datelor
Socket.io Client	Notificări și chat în timp real
Backend
Tehnologie	Rol
Node.js + Express	Server și API REST
Socket.io	Chat și notificări în timp real
JWT	Autentificare și autorizare
Bull + Redis	Procesare joburi în fundal
Multer	Upload fișiere și documente
Nodemailer	Trimitere emailuri automate
AI Service
Tehnologie	Rol
Python + FastAPI	Microserviciu AI
LangChain	Orchestrare LLM + RAG
OpenAI GPT-4	Model principal de limbaj
sentence-transformers	Generare embeddings
ChromaDB	Vector database pentru RAG
PyMuPDF	Parsare documente PDF
OpenAI Fine-tuning API	Antrenare model custom
Baze de Date
Tehnologie	Rol
PostgreSQL	Date structurate principale
ChromaDB	Vectori pentru RAG
Redis	Cache și job queue
DevOps
Tehnologie	Rol
Docker + Docker Compose	Containerizare completă
GitHub Actions	CI/CD automat
GitHub	Versionare și colaborare echipă
📁 Structura Proiectului
campus-ai/
├── frontend/                 # React App
│   ├── src/
│   │   ├── components/       # Componente reutilizabile
│   │   ├── pages/            # Pagini principale
│   │   ├── hooks/            # Custom hooks
│   │   ├── context/          # State management
│   │   └── services/         # API calls
│   └── package.json
│
├── backend/                  # Node.js Server
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── controllers/      # Business logic
│   │   ├── models/           # Database models
│   │   ├── middleware/        # Auth, validation
│   │   └── services/         # External services
│   └── package.json
│
├── ai-service/               # Python AI Service
│   ├── main.py               # FastAPI app
│   ├── rag/                  # RAG pipeline
│   ├── llm/                  # LLM integration
│   ├── fine_tuning/          # Fine-tuning scripts
│   └── requirements.txt
│
├── database/
│   ├── migrations/           # SQL migrations
│   └── seeds/                # Date inițiale
│
├── docker-compose.yml
└── README.md
⚙️ Instalare și Rulare
Prerequisite
Node.js >= 18
Python >= 3.10
Docker + Docker Compose
PostgreSQL
Redis
1. Clonează repository-ul
git clone https://github.com/username/campus-ai.git
cd campus-ai
2. Configurare variabile de mediu
# Backend
cp backend/.env.example backend/.env
# Completează: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, REDIS_URL

# AI Service
cp ai-service/.env.example ai-service/.env
# Completează: OPENAI_API_KEY, CHROMA_HOST
3. Rulare cu Docker
docker-compose up --build
4. Rulare manuală (development)
Frontend:

cd frontend
npm install
npm run dev
Backend:

cd backend
npm install
npm run dev
AI Service:

cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
🗄️ Schema Bază de Date (principală)
users           — studenți, profesori, admini
courses         — cursuri, syllabus, materiale
enrollments     — înregistrări studenți la cursuri
grades          — note și rezultate examene
schedules       — orar cursuri și examene
events          — evenimente pe campus
announcements   — anunțuri oficiale
messages        — chat între utilizatori
documents       — fișiere și materiale uploadate
ai_sessions     — istoricul conversațiilor cu AI
🔄 Workflow Principal AI
Student întreabă asistentul AI
          ↓
FastAPI primește cererea
          ↓
LangChain interoghează ChromaDB (RAG)
          ↓
Găsește documente relevante (regulamente, syllabus)
          ↓
GPT-4 Fine-tuned generează răspuns
          ↓
Răspuns personalizat trimis studentului
👥 Echipă și Contribuții
Modul	Responsabilitate
Frontend	Interfață React, design, UX
Backend	API Node.js, autentificare, WebSocket
AI Service	LLM, RAG, Fine-tuning, Python
Database	Schema SQL, migrații, optimizări
DevOps	Docker, CI/CD, deployment
✅ Cerințe Bifate
Cerință	Cum e acoperită
🏢 Mediu Muncă	Aplicație reală, complexă, profesională
👥 Echipă	Module independente clare per persoană
📦 Proiect în echipă	Un produs complet livrat împreună
🌱 Un pic din toate	React, Node, Python, SQL, AI, Docker
✨ LLM	GPT-4 pentru asistent și analiză
⚙️ Workflow	Pipeline complet de la input la output
🔍 RAG	LangChain + ChromaDB pe documente universitare
🎯 Fine-tuning	Model antrenat pe context universitar românesc
🧠 Gândire de la bază	Arhitectură construită de echipă de la zero
📅 Plan de Implementare
Săptămâna	Obiectiv
1	Setup proiect, autentificare, baza de date
2	Module orar, note, examene
3	Chat, anunțuri, events
4	Integrare OpenAI API, asistent de bază
5	RAG pe documente universitare
6	Fine-tuning + analiză predictivă
📄 Licență
MIT License — liber de utilizat și modificat.

Dezvoltat în cadrul programului de practică @ Thecon Galați
