import os
import asyncio
import base64
from dotenv import load_dotenv
from llm_service import LLMService
from image_service import ImageService

async def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    local_env_path = os.path.join(current_dir, ".env")
    load_dotenv(dotenv_path=local_env_path, override=True)
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    hf_key = os.getenv("HUGGINGFACE_API_KEY")
    
    from schemas import ExtractedAnnouncementInfo, TipEveniment, NivelUrgenta
    
    # Mocking pasul 1 pentru a evita limita de spam de la Google (apelam o singura data Gemini)
    print("--------------------------------------------------")
    print("1. Folosim un JSON pre-generat pentru a nu mai irosi o cerere API...")
    print("--------------------------------------------------")
    extracted_info = ExtractedAnnouncementInfo(
        materie_sau_subiect="Hackathon dezvoltare web",
        entitate_sursa="ACIEE",
        tip_eveniment=TipEveniment.CONCURS,
        urgenta_estimata=NivelUrgenta.RIDICATA,
        public_tinta=["Studenti ACIEE", "Echipe de maxim 4 studenti"],
        deadline_absolut="2026-06-10T23:59:00Z",
        locatie="Secretariat ACIEE",
        rezumat_notificare="Inscrieri Hackathon ACIEE pana pe 10 iunie - premiu internship",
        actiuni_extrase=["Formeaza o echipa de maxim 4 studenti", "Inscrie echipa la secretariat"],
        penalizari_sau_reguli=["Echipele trebuie sa aiba maxim 4 studenti"],
        linkuri_utile=[],
        taguri_cheie=["Hackathon", "Dezvoltare Web", "IT", "Laborator Informatica"]
    )
    
    print("\n--------------------------------------------------")
    print("2. Rulam image-generator (Generare Banner)...")
    print("--------------------------------------------------")
    img_service = ImageService(hf_api_key=hf_key)
    img_result = await img_service.generate_announcement_banner(extracted_info)
    
    if img_result.success:
        print("\n✅ Succes la generare imagine!")
        base64_data = img_result.image_base64.split(",")[1]
        current_dir = os.path.dirname(os.path.abspath(__file__))
        save_path = os.path.join(current_dir, "test_hackathon.jpg")
        with open(save_path, "wb") as f:
            f.write(base64.b64decode(base64_data))
        print(f"📸 Imaginea finala a fost salvata ca: {save_path}")
    else:
        print("\n❌ Eroare la generarea imaginii:", img_result.error_message)

if __name__ == "__main__":
    asyncio.run(main())
