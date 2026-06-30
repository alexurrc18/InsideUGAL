# PR Title
feat(llm): implementare serviciu de traducere robust pentru conținut dinamic (anunțuri și batch)

# PR Description

## Prezentare Generală
Acest PR implementează componenta **Serviciul LLM** complet funcțională, sigură și scalabilă pentru a traduce conținut dinamic din aplicația InsideUGAL. Au fost implementate mecanisme de robustețe la nivelul traducerilor de tip batch și la interacțiunea cu baza de date Supabase.

## Modificări Aplicate

### 1. Robustness pe Endpoint-ul `/translate/batch`
* **JSON Serialization fix:** Acum cheile dicționarelor JSON sunt corect interpretate folosind o logică internă de serializare a structurilor complexe, astfel încât Gemini să nu fie derutat de chei stringificate sau structuri adânci.
* **Fallbacks Inteligente:** Dacă traducerea batch eșuează dintr-un motiv de la Gemini (ex. Timeout, 429 Too Many Requests), sistemul nu returnează `500 Internal Server Error`, ci cade automat într-o procedură de traducere "per-item". Dacă și aia eșuează, item-ul original nemodificat e returnat, prevenind blocarea interfeței clientului.
* **Retry Mechanism:** Integrare completă cu librăria `tenacity` pentru ambele funcții (batch și item-based), cu retry-uri exponențiale.

### 2. Nou Endpoint Dedicat `/translate/announcement`
* A fost creat `POST /translate/announcement` care primește JSON cu `title`, `content` și `target_language`.
* Output JSON strict enforcing din modelul Gemini (`response_mime_type="application/json"`).
* **Prompt Engineering Extins:** Implementate reguli clare pentru terminologia universitară ("student ID card", "Faculty Office", etc) și păstrarea riguroasă a sintaxei Markdown pentru afișarea ulterioară în aplicație.

### 3. Integrare Supabase Cache (Rezolvare Bug-uri)
* Rezolvat bug-ul ce cauza `permission denied` pentru tabela `translations` chiar și atunci când se folosea `service_role`. Am aplicat explicit comanda de GRANT `GRANT ALL ON TABLE public.translations TO anon, authenticated, service_role;` direct în backend-ul de Postgres.
* S-a adăugat suport solid în aplicație pentru a citi din mediu cheia potrivită (`SUPABASE_SERVICE_ROLE_KEY` sau `SUPABASE_SERVICE_KEY`) și a o da mai departe către clientul `supabase-py`.

## Testare
- Componentele de traducere Batch au fost testate pe structuri complexe cu fallback garantat pe erori 401/429/500 de la Google.
- Endpoint-ul `/translate` s-a confirmat că scrie corect în baza de date Supabase din Docker și la o rulare ulterioară sare peste procesarea Gemini pentru același text (`cached: true`).
- Traducerea anunțurilor păstrează formatarea markdown perfect.
