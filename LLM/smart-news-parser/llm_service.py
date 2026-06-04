import os
import json
import logging
from datetime import datetime
from google import genai
from google.genai import types
from schemas import GeminiAnnouncementInfo, ExtractedAnnouncementInfo
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("smart-news-parser")

class LLMService:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model_id = 'gemini-3.5-flash'
        self._cache = {}

    @retry(
        stop=stop_after_attempt(3), 
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    async def extract_announcement_info(self, text: str) -> ExtractedAnnouncementInfo:
        # Verificare in cache pentru a economisi timp si request-uri
        text_key = text.strip().lower()
        if text_key in self._cache:
            logger.info("✅ Rezultat gasit in cache. Se returneaza fara apel AI.")
            # Returnam o copie ca sa ne asiguram ca ID-ul si data_generare se recalculeaza sau raman sigure, 
            # desi pt simplitate putem returna fix obiectul generat (insa ExtractedAnnouncementInfo isi genereaza singur UUID-ul la instantiere)
            cached_data = self._cache[text_key].model_dump()
            return ExtractedAnnouncementInfo(**cached_data)

        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        prompt_system = (
            "Esti un expert in analiza de text academic pentru Universitatea 'Dunarea de Jos' din Galati (UGAL).\n"
            f"DATA CURENTA: {now}\n\n"
            "MISIUNE:\n"
            "Extrage date structurate REALE din anuntul oferit. NU folosi placeholder-e precum 'string', 'n/a' sau valori default din schema. Daca o informatie lipseste complet, pune null sau lista vida [].\n\n"
            "REGULI DE ANALIZA:\n"
            "1. ENTITATE SURSA: Identifica cine a postat (ex: 'Rectorat', 'ACIEE', 'FSEAA', 'Directia Camine').\n"
            "2. PUBLIC TINTA: Cine trebuie sa actioneze (ex: ['Studenti Anul 1', 'Masteranzi']).\n"
            "3. TIP EVENIMENT: Alege strict din: 'proiect', 'laborator', 'partial', 'colocviu', 'examen', 'concurs', 'internship', 'bursa', 'voluntariat', 'oportunitate', 'cazare', 'anunt_general', 'administrativ'.\n"
            "4. LOCATIE: Sali, corpuri sau platforme (ex: 'B21', 'Moodle', 'Secretariat ACIEE').\n"
            "5. DEADLINE (REGULI STRICTE):\n"
            "   - Daca exista o data clara (ex: '30 mai'), calculeaza YYYY-MM-DD 23:59.\n"
            "   - Daca exista o data si o ora (ex: '15 iunie ora 14'), calculeaza YYYY-MM-DD 14:00.\n"
            "   - DATE RELATIVE: Daca scrie 'pana vineri', calculeaza data primei zile de vineri care urmeaza dupa DATA CURENTA.\n"
            "   - LIPSA DATA: Daca anuntul NU mentioneaza niciun termen limita sau perioada, pune obligatoriu null.\n"
            "   - CONTRADICTII: Daca apar doua date diferite pentru aceeasi actiune, alege data cea mai apropiata de DATA CURENTA (cea mai urgenta) si mentioneaza conflictul in 'penalizari_sau_reguli'.\n"
            "   - AN TRECUT: Daca anuntul mentioneaza un an trecut (ex: 2024) dar suntem in 2026, presupune ca este o greseala de editare si calculeaza pentru anul curent sau viitor astfel incat deadline-ul sa fie in viitor.\n"
            "6. REZUMAT: Max 80 caractere, stil telegrafic.\n\n"
            "EXEMPLU REZULTAT:\n"
            "Text: 'Vino la Internship la Liberty! Depune CV pana pe 30 mai.'\n"
            "JSON: {\"materie_sau_subiect\": \"Internship Liberty\", \"entitate_sursa\": \"Liberty Galati\", \"tip_eveniment\": \"internship\", \"public_tinta\": [\"Toti studentii\"], \"deadline_absolut\": \"2026-05-30 23:59\", \"rezumat_notificare\": \"Internship Liberty - depunere CV pana pe 30.05\", \"actiuni_extrase\": [\"Depune CV\"], \"taguri_cheie\": [\"Cariera\", \"Liberty\"]}"
        )

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_id,
                contents=f"Analizeaza acum urmatorul anunt:\n{text}",
                config=types.GenerateContentConfig(
                    system_instruction=prompt_system,
                    response_mime_type="application/json",
                    response_schema=GeminiAnnouncementInfo,
                    temperature=0.1
                ),
            )

            if hasattr(response, 'parsed') and isinstance(response.parsed, GeminiAnnouncementInfo):
                result_dict = response.parsed.model_dump()
            else:
                # Fallback pt cazul in care 'parsed' nu e disponibil direct
                raw_text = response.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()
                result_dict = json.loads(raw_text)

            # Validare anti-placeholders
            for key, value in result_dict.items():
                if value == "string":
                    result_dict[key] = None
                if isinstance(value, list) and "string" in value:
                    result_dict[key] = [v for v in value if v != "string"]

            result_obj = ExtractedAnnouncementInfo(**result_dict)
            self._cache[text_key] = result_obj
            return result_obj

        except Exception as e:
            logger.error(f"Eroare LLMService: {str(e)}")
            raise e