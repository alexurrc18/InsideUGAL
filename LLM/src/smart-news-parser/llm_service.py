import sys
import os
import json
import logging
import asyncio
from datetime import datetime
from pydantic import ValidationError
from parser_schemas import ExtractedAnnouncementInfo

# Add modul-marius/functions to path to import llm_functions
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "modul-marius", "functions")))
from llm_functions import _call

logger = logging.getLogger("smart-news-parser")

class LLMService:
    def __init__(self):
        # Configuration is now handled centrally in llm_functions
        pass

    async def extract_announcement_info(self, text: str) -> ExtractedAnnouncementInfo:
        return await asyncio.to_thread(self._extract_sync, text)

    def _extract_sync(self, text: str) -> ExtractedAnnouncementInfo:
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        prompt = (
            "Esti un expert in analiza de text academic pentru Universitatea 'Dunarea de Jos' din Galati (UGAL).\n"
            f"DATA CURENTA: {now}\n\n"
            "MISIUNE:\n"
            "Extrage date structurate REALE din anuntul oferit. Returneaza STRICT un obiect JSON valabil.\n"
            "NU folosi placeholder-e. Daca o informatie lipseste complet, pune null sau lista vida []. NU include text in afara de JSON.\n\n"
            "Cheile necesare:\n"
            "- materie_sau_subiect: string (ex: 'Hackathon', 'Decontare Transport')\n"
            "- entitate_sursa: string sau null (ex: 'Rectorat', 'ACIEE')\n"
            "- tip_eveniment: string ('proiect', 'laborator', 'partial', 'colocviu', 'examen', 'concurs', 'internship', 'bursa', 'voluntariat', 'oportunitate', 'cazare', 'anunt_general', 'administrativ', 'admitere')\n"
            "- urgenta_estimata: string ('scazuta', 'medie', 'ridicata')\n"
            "- public_tinta: lista de stringuri\n"
            "- deadline_absolut: string sau null (ISO 8601 YYYY-MM-DDTHH:MM:SS) - calculeaza din text raportat la data curenta.\n"
            "- locatie: string sau null\n"
            "- rezumat_notificare: string (pentru push notification pe telefon: scurt, uman, direct la subiect, maxim 1-2 propozitii, FARA fraze robotice gen 'Anuntul detaliaza' sau 'Acest document')\n"
            "- actiuni_extrase: lista de stringuri\n"
            "- penalizari_sau_reguli: lista de stringuri\n"
            "- linkuri_utile: lista de stringuri\n"
            "- taguri_cheie: lista de stringuri (EXTRAGE DOAR 2-4 TAGURI ESENTIALE, nu aglomera lista!)\n\n"
            f"Analizeaza acum urmatorul anunt:\n{text}"
        )

        try:
            raw_text = _call(prompt, function_name="extract_announcement_info")
            
            # Use regex to find the JSON object within the text, ignoring conversational wrappers
            import re
            json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if json_match:
                raw_text = json_match.group(0)

            if not raw_text:
                raise ValueError("LLM returned an empty response.")
                
            result_dict = json.loads(raw_text)

            # Normalize data before Pydantic validation
            if not result_dict.get('materie_sau_subiect'):
                result_dict['materie_sau_subiect'] = "Nespecificat"
            valid_types = ['proiect', 'laborator', 'partial', 'colocviu', 'examen', 'concurs', 'internship', 'bursa', 'voluntariat', 'oportunitate', 'cazare', 'anunt_general', 'administrativ', 'admitere']
            if result_dict.get('tip_eveniment') not in valid_types:
                result_dict['tip_eveniment'] = "anunt_general"
            if not result_dict.get('urgenta_estimata'):
                result_dict['urgenta_estimata'] = "medie"
            if not result_dict.get('rezumat_notificare'):
                result_dict['rezumat_notificare'] = "Anunt important"
                
            for list_field in ['public_tinta', 'actiuni_extrase', 'taguri_cheie', 'penalizari_sau_reguli', 'linkuri_utile']:
                if result_dict.get(list_field) is None:
                    result_dict[list_field] = []

            result_obj = ExtractedAnnouncementInfo(**result_dict)
            return result_obj

        except Exception as e:
            logger.error(f"Eroare LLMService: {str(e)}")
            raise e
