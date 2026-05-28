import os
import json
import logging
from datetime import datetime
from google import genai
from google.genai import types
from schemas import GeminiTaskOutput, ExtractedTaskResponse

logger = logging.getLogger("smart-task-extractor-mobile")

class LLMService:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model_id = 'gemini-2.5-flash'

    async def extract_tasks(self, text: str) -> ExtractedTaskResponse:
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        prompt_system = (
            "Esti un expert in analiza de text academic pentru Universitatea 'Dunarea de Jos' din Galati (UGAL).\n"
            f"DATA CURENTA: {now}\n\n"
            "MISIUNE:\n"
            "Extrage date structurate din anunturi care pot veni de pe site-ul Universitatii (UGAL general) sau de pe site-urile facultatilor (ex: ACIEE, FSEAA, SIA, Medicina, Litere).\n\n"
            "REGULI DE ANALIZA:\n"
            "1. ENTITATE SURSA: Identifica cine a postat. Daca e de pe site-ul mare UGAL, pune 'UGAL General' sau departamentul (ex: 'Rectorat', 'Directia Camine', 'Social'). Daca e de facultate, pune acronimul corect: 'ACIEE' (Automatica, Calculatoare), 'FSEAA' (Economice), 'SIA' (Alimentatie), 'Inginerie' (Mecanica, etc.), 'Arhitectura Navala', 'FMF' (Medicina), 'Litere', 'FDSA' (Drept).\n"
            "2. PUBLIC TINTA: Extrage cine trebuie sa actioneze (ex: ['Studenti Licenta', 'Anul 1', 'Masteranzi', 'Toti studentii']).\n"
            "3. TIP EVENIMENT: Alege strict din: 'proiect', 'laborator', 'partial', 'colocviu', 'examen', 'concurs', 'anunt_general', 'administrativ'.\n"
            "4. LOCATIE: Identifica sali (ex: 'B21', 'AN010'), corpuri (ex: 'Corp D', 'Sediul central'), platforme (ex: 'Online', 'Teams', 'Moodle') sau secretariatele facultatilor.\n"
            "5. DEADLINE: Calculeaza data exacta raportata la DATA CURENTA. Daca scrie 'pana pe 20 martie', pune '2026-03-20 23:59'. Daca scrie 'perioada 1-7 ale lunii', calculeaza deadline-ul pt luna curenta/viitoare (ex: daca azi e 27 mai, deadline-ul e 07 iunie).\n"
            "6. REZUMAT: Max 80 caractere, stil telegrafic, fara introduceri inutile. Exemplu: 'Deadline proiect IP - 15.06, echipe de 3'.\n"
            "7. PENALIZARI/REGULI: Extrage reguli importante (ex: 'Echipe de max 3', 'Decontare doar cu bon original', 'Conform cu originalul + semnat').\n\n"
            "EXEMPLU SURSA FACULTATE (ACIEE):\n"
            "Text: 'Salutare, am pus pe moodle cerintele pt proiectul la IP. deadline 15 iunie ora 23. echipe de 2.'\n"
            "Output: {\"materie_sau_subiect\": \"Ingineria Programarii\", \"entitate_sursa\": \"ACIEE\", \"tip_eveniment\": \"proiect\", \"public_tinta\": [\"Studenti curs IP\"], \"locatie\": \"Moodle\", \"deadline_absolut\": \"2026-06-15 23:00\", \"rezumat_notificare\": \"Deadline Proiect IP - 15.06 pe Moodle\"}\n\n"
            "EXEMPLU ADMINISTRATIV (UGAL):\n"
            "Text: 'Directia Camine anunta: studentii care doresc subventie de cazare sa depuna cererile la parterul corpului D pana pe 30 mai.'\n"
            "Output: {\"materie_sau_subiect\": \"Subventie Cazare\", \"entitate_sursa\": \"Directia Camine\", \"tip_eveniment\": \"administrativ\", \"public_tinta\": [\"Studenti la camin\"], \"locatie\": \"Corp D, Parter\", \"deadline_absolut\": \"2026-05-30 23:59\", \"rezumat_notificare\": \"Cereri subventie cazare pana pe 30.05\"}\n"
        )

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_id,
                contents=f"{prompt_system}\n\nAnalizeaza acum urmatorul anunt:\n{text}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GeminiTaskOutput,
                    temperature=0.1
                ),
            )

            if hasattr(response, 'parsed') and isinstance(response.parsed, GeminiTaskOutput):
                result_dict = response.parsed.model_dump()
            else:
                # Fallback pt cazul in care 'parsed' nu e disponibil direct
                raw_text = response.text
                if raw_text.startswith("```json"):
                    raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                result_dict = json.loads(raw_text)

            return ExtractedTaskResponse(**result_dict)

        except Exception as e:
            logger.error(f"Eroare LLMService: {str(e)}")
            raise e
