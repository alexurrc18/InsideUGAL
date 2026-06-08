import os
import json
import logging
from datetime import datetime
from huggingface_hub import AsyncInferenceClient
from schemas import ExtractedAnnouncementInfo
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("smart-news-parser")

class LLMService:
    def __init__(self, hf_api_key: str):
        if not hf_api_key:
            raise ValueError("HUGGINGFACE_API_KEY este obligatoriu pentru LLMService.")
        self.hf_client = AsyncInferenceClient(token=hf_api_key)
        self.model_id = 'meta-llama/Meta-Llama-3-8B-Instruct'
        self._cache = {}

    @retry(
        stop=stop_after_attempt(3), 
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    async def extract_announcement_info(self, text: str) -> ExtractedAnnouncementInfo:
        text_key = text.strip().lower()
        if text_key in self._cache:
            logger.info("✅ Rezultat gasit in cache. Se returneaza fara apel AI.")
            cached_data = self._cache[text_key].model_dump()
            return ExtractedAnnouncementInfo(**cached_data)

        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        prompt_system = (
            "Esti un expert in analiza de text academic pentru Universitatea 'Dunarea de Jos' din Galati (UGAL).\n"
            f"DATA CURENTA: {now}\n\n"
            "MISIUNE:\n"
            "Extrage date structurate REALE din anuntul oferit. Returneaza STRICT un obiect JSON valabil.\n"
            "NU folosi placeholder-e. Daca o informatie lipseste complet, pune null sau lista vida []. NU include text in afara de JSON.\n\n"
            "Cheile necesare (valori implicite):\n"
            "- materie_sau_subiect: string (Deduce subiectul principal, ex: 'Hackathon Web', 'Decontare Transport', 'Baze de Date'. NU pune null!)\n"
            "- entitate_sursa: string sau null (ex: 'Rectorat', 'ACIEE')\n"
            "- tip_eveniment: string ('proiect', 'laborator', 'partial', 'colocviu', 'examen', 'concurs', 'internship', 'bursa', 'voluntariat', 'oportunitate', 'cazare', 'anunt_general', 'administrativ')\n"
            "- urgenta_estimata: string ('scazuta', 'medie', 'ridicata')\n"
            "- public_tinta: lista de stringuri (ex: ['Studenti Anul 1'])\n"
            "- deadline_absolut: string sau null (ISO 8601 YYYY-MM-DDTHH:MM:SS) - calculeaza din text raportat la data curenta.\n"
            "- locatie: string sau null\n"
            "- rezumat_notificare: string\n"
            "- actiuni_extrase: lista de stringuri\n"
            "- taguri_cheie: lista de stringuri\n"
            "- penalizari_sau_reguli: lista de stringuri\n"
        )

        try:
            messages = [
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": f"Analizeaza acum urmatorul anunt:\n{text}"}
            ]
            
            response = await self.hf_client.chat_completion(
                model="meta-llama/Llama-3.3-70B-Instruct",
                messages=messages,
                max_tokens=1024,
                temperature=0.1
            )
            
            raw_text = response.choices[0].message.content.strip()
            
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
            if not result_dict.get('entitate_sursa'):
                result_dict['entitate_sursa'] = "UGAL"
            if not result_dict.get('rezumat_notificare'):
                result_dict['rezumat_notificare'] = "Anunt important"
            if not result_dict.get('tip_eveniment'):
                result_dict['tip_eveniment'] = "anunt_general"
            if not result_dict.get('urgenta_estimata'):
                result_dict['urgenta_estimata'] = "medie"
                
            for list_field in ['public_tinta', 'actiuni_extrase', 'taguri_cheie', 'penalizari_sau_reguli', 'linkuri_utile']:
                if result_dict.get(list_field) is None:
                    result_dict[list_field] = []

            result_obj = ExtractedAnnouncementInfo(**result_dict)
            self._cache[text_key] = result_obj
            return result_obj

        except Exception as e:
            logger.error(f"Eroare LLMService: {str(e)}")
            raise e
