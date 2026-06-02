import asyncio
import os
import json
from dotenv import load_dotenv
from llm_service import LLMService

async def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    local_env_path = os.path.join(current_dir, ".env")
    load_dotenv(dotenv_path=local_env_path, override=True)
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print('Error: GEMINI_API_KEY not found')
        return
    
    api_key = api_key.strip().strip("'").strip('"')
    service = LLMService(api_key=api_key)
    
    text = """Admitere 2025
Facultatea de Automatică, Calculatoare, Inginerie Electrică şi Electronică îți oferă cunoștințe și competențe tehnice inginerești la nivelul tuturor ciclurilor de învățământ superior (licență, masterat și doctorat) și la nivel de calitate compatibil cu al universităților tehnice din țară și străinătate.Ne găseşti şi pe
Facebook: @faciee (https://www.facebook.com/faciee/) şiInstagram: @facultate_aciee (https://www.instagram.com/facultate_aciee/)Youtube: Facultatea ACIEE Galati (Facultatea ACIEE Galati - YouTube) Pentru a intra în contact cu noi te rugăm să ne scrii la adresa admitere.faciee@ugal.ro sau să ne suni la numărul: 0336 130 236"""
    
    try:
        result = await service.extract_announcement_info(text)
        print(result.model_dump_json(indent=2))
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    asyncio.run(main())
