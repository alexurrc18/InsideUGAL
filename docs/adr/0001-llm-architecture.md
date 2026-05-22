# ADR 0001: Arhitectură Modulară și Decuplată pentru Integrarea Agenților LLM (InsideUGAL)

**Status:** Propus
**Data:** 22 Mai 2026
**Autori:** CosminG1412 & Echipa LLM

## 1. Context și Problemă

În cadrul dezvoltării platformei InsideUGAL, echipa LLM a dezvoltat trei funcționalități fundamentale bazate pe modele de limbaj, fiecare adresând o problemă distinctă a experienței studențești:

1. **Smart Task Extractor (Modul Deadlines):** Transformarea anunțurilor academice brute în date structurate (obiecte JSON rigide) pentru popularea automată a calendarului.
2. **Canteen Chatbot (Modul Cantină / AiBot):** Asistent conversațional cu memorie pe termen scurt, optimizat pentru interogarea dinamică a meniului zilnic/săptămânal prin tehnici RAG.
3. **PDF Quiz Generator (Modul Marius):** Generator automat de evaluări și chestionare bazat pe parsarea statică și analiza cursurilor în format PDF încărcate de utilizator.

S-a ridicat propunerea de a fuziona aceste trei componente într-o singură funcție globală de tip monolit LLM, în încercarea de a centraliza apelurile API. Trebuie evaluat dacă o astfel de unificare este fezabilă din punct de vedere al performanței, configurării hyperparametrilor și mentenanței codului.

## 2. Decizie

S-a decis menținerea unei **arhitecturi complet decuplate (Multi-Agent)**, organizată sub formă de module independente (microservicii) în directorul `LLM/`. Fiecare modul își gestionează propriul framework, logică de business și configurare a modelului de bază (Google Gemini):

- **Modulul A (Task Extractor):** API asincron în FastAPI, configurat deterministic (`temperature=0.1`) cu validare strictă prin scheme Pydantic.
- **Modulul B (Canteen Chatbot):** Serviciu conversațional axat pe flexibilitate și fluiditate (`temperature=0.7`), integrând stocare locală/vectorială a contextului și management al istoricului sesiunii.
- **Modulul C (PDF Quiz Generator):** Serviciu specializat în procesare batch (Heavy Parsing), optimizat pentru extragerea de concepte educaționale și generare de itemi de evaluare.

## 3. Alternative Luate în Considerare

- **Monolitul LLM Global:** Această abordare a fost respinsă. Constrângerea unui chatbot flexibil și a unui generator de quiz-uri din PDF-uri voluminoase să împartă același mediu de rulare și aceiași parametri cu un extractor deterministic de JSON ar duce la conflicte majore de optimizare. S-ar încălca _Single Responsibility Principle_ (SRP), iar erorile dintr-un modul ar bloca întreaga componentă AI a aplicației.

## 4. Argumentație Tehnică și Matrice de Performanță

Designul modular este critic deoarece hyperparametrii și cerințele de latență sunt complet opuse:

| Metrică                       | Smart Task Extractor             | Canteen Chatbot                | PDF Quiz Generator                           |
| :---------------------------- | :------------------------------- | :----------------------------- | :------------------------------------------- |
| **Model Generativ**           | Gemini 2.5 Flash                 | Gemini 2.5 Flash               | Gemini 2.5 Flash                             |
| **Configurație Creativitate** | Strictă (`temperature=0.1`)      | Naturală (`temperature=0.7`)   | Echilibrată (`temperature=0.3`)              |
| **Tip Output Răspuns**        | Strict JSON (Pydantic Schema)    | Text liber / Conversațional    | Structură de test (Întrebări/Răspunsuri)     |
| **Latență Estimata (p95)**    | **Foarte mică (~1.5s)**          | Medie (~3s - dependent de RAG) | Mare (~5-10s - dependent de dimensiunea PDF) |
| **Strategie Context**         | Zero-Shot (doar textul introdus) | RAG dinamic (Meniu actualizat) | In-Context (Parsare fișier static)           |

**Concluzie:** Împachetarea acestor 3 profile computaționale radical diferite într-un singur serviciu ar degrada latența modulului de Task Extractor și ar complica inutil mentenanța codului.

## 5. Consecințe

- **Pozitive:**
  - **Izolarea Defecțiunilor:** Blocarea procesării unui PDF masiv în modulul de Quiz nu va afecta viteza cu care un student își generează un card de deadline.
  - **Ușurință în Integrare:** Frontend-ul (Next.js) poate interoga separat endpoint-urile dedicate, optimizând timpii de încărcare prin loading-state-uri asincrone specifice.
  - **Testabilitate Curată:** Permite o acoperire de peste 80% prin unit tests specifice fiecărei logici de business, utilizând mock-uri LLM dedicate.
- **Negative:**
  - Necesită administrarea independentă a dependențelor în interiorul directoarelor dedicate din `LLM/`.
