# PR Title
feat(llm): implementare serviciu de traducere pentru conținut dinamic (anunțuri)

# PR Description

## Prezentare Generală
Acest PR implementează componenta **Serviciul LLM** necesară pentru traducerea automată a conținutului dinamic (titlu și text anunțuri), rezolvând complet punctul „1. Serviciul LLM” din issue-ul de arhitectură pentru traduceri.

## Modificări Aplicate
* **Endpoint Dedicat pentru Anunțuri:** A fost creat endpoint-ul `POST /translate/announcement` care primește un JSON cu `title`, `content` și `target_language`.
* **Output Structurat:** Modelul Gemini a fost instruit să returneze un format JSON strict, respectând structura cerută: `{ "translated_title": "...", "translated_content": "..." }`.
* **Prompt Optimizat și Exact:** 
  * Au fost adăugate reguli stricte pentru menținerea unui ton oficial, academic și pentru utilizarea corectă a terminologiei universitare și juridice (ex. *Faculty Office*, *student ID card*, *water transport*, *certified true copy*, sensul exact al reducerii de 90%).
  * S-a impus păstrarea formatării originale (paragrafe, sintaxă markdown, linkuri și newline-uri) prin instrucțiuni critice în prompt.
* **Reziliență și Fiabilitate:** 
  * Limita `max_output_tokens` a fost extinsă la 8192 pentru a preveni trunchierea răspunsurilor la anunțurile foarte lungi.
  * A fost adăugat un mecanism de retry (folosind `tenacity` cu exponential backoff) pe apelurile către LLM pentru a preveni erorile de tip HTTP 500 cauzate de timeout-uri sau limitări ale API-ului Gemini.
* **Separarea Responsabilităților:** Modificările legate de middleware-ul din FastAPI și cache-ul din Supabase au fost eliminate din acest branch, asigurând astfel că echipa de Backend își poate implementa corect propria logică de caching și rutare pe `/announcements/`.

## Testare
- Endpoint-ul a fost testat cu texte administrative lungi și complexe, validând menținerea formatării markdown și a preciziei traducerii.
- S-au validat scenariile de retry și răspunsurile JSON structurate corect.
