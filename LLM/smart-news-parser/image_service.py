import os
import base64
import logging
import io
from huggingface_hub import AsyncInferenceClient
from pydantic import BaseModel
from schemas import ExtractedAnnouncementInfo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-generator")

class ImageGenerationResult(BaseModel):
    success: bool
    image_base64: str | None = None
    error_message: str | None = None

class ImageService:
    def __init__(self, hf_api_key: str | None = None):
        self.hf_client = AsyncInferenceClient(token=hf_api_key)
        self.hf_text_model_id = 'meta-llama/Llama-3.3-70B-Instruct'
        self.hf_model_id = "black-forest-labs/FLUX.1-schnell"

    async def generate_announcement_banner(self, info: ExtractedAnnouncementInfo) -> ImageGenerationResult:
        try:
            # 1. Transform structured data to visual prompt using HF LLM
            prompt_system = (
                "You are an expert prompt engineer for an image generation model. "
                "Transform the following structured university announcement data into an english prompt for a text-to-image model. "
                "CRITICAL INSTRUCTION 1: The generated image MUST strongly visually represent the semantic meaning of the CURRENT announcement data provided. "
                "Analyze the 'Tags', 'Subject', and 'Summary'. Choose ONE OR TWO simple thematic objects that strictly match the context (e.g., a laptop or code symbols for a Hackathon, a piggy bank for a Scholarship, a microscope for a Lab). Choose the object dynamically based on the current JSON. "
                "CRITICAL INSTRUCTION 2: Do NOT clutter the image. Keep the composition extremely simple and clean. "
                "CRITICAL INSTRUCTION 3: DYNAMICALLY ADAPT THE ART STYLE based on the announcement type: "
                "- For exciting events (e.g., Hackathons, Internships, Tech Jobs): Use a 'cool, modern, futuristic, neon, vibrant 3D render, or cyberpunk' aesthetic to capture students' attention. "
                "- For formal/administrative events (e.g., Scholarships, Dorms, Exams, Admissions): Use a 'premium high-quality 3D icon, rich vibrant colors, elegant corporate design, professional and polished' aesthetic. Do NOT use simple thin line art or boring sketches. "
                "Do NOT make it photorealistic. "
                "CRITICAL INSTRUCTION 4: Do NOT include human faces or people. "
                "Output ONLY the prompt string, nothing else."
            )
            
            announcement_context = (
                f"Event Type: {info.tip_eveniment.value if hasattr(info.tip_eveniment, 'value') else info.tip_eveniment}\n"
                f"Subject: {info.materie_sau_subiect}\n"
                f"Source Entity: {info.entitate_sursa}\n"
                f"Tags: {', '.join(info.taguri_cheie)}\n"
                f"Summary: {info.rezumat_notificare}"
            )
            
            messages = [
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": f"Announcement Data:\n{announcement_context}"}
            ]
            
            prompt_refiner = await self.hf_client.chat_completion(
                model=self.hf_text_model_id,
                messages=messages,
                max_tokens=256,
                temperature=0.7
            )
            
            refined_prompt = prompt_refiner.choices[0].message.content.strip()
            logger.info(f"🎨 Refined Prompt: {refined_prompt}")

            # 2. Generate Image with Hugging Face (Stable Diffusion) via official SDK
            logger.info("⏳ Se generează imaginea prin Hugging Face (SDK Oficial)...")
            
            image = await self.hf_client.text_to_image(
                prompt=refined_prompt,
                negative_prompt="text, letters, alphabet, numbers, words, typography, logo, watermark, signature, blurry, distorted, deformed, messy, bad anatomy, bad proportions, low quality, ugly artifacts, photorealistic, realistic, cluttered, busy, too many objects, complex background, chaotic, thin line art, uncolored, sketch, boring",
                model=self.hf_model_id,
                width=1024,
                height=576 # Aproximativ 16:9
            )
            
            # Conversie din PIL Image in Bytes
            buffered = io.BytesIO()
            image.save(buffered, format="JPEG")
            image_bytes = buffered.getvalue()
            
            # Encodare in Base64
            base64_encoded = base64.b64encode(image_bytes).decode('utf-8')
            
            return ImageGenerationResult(
                success=True, 
                image_base64=f"data:image/jpeg;base64,{base64_encoded}"
            )

        except Exception as e:
            logger.error(f"❌ Eroare la generarea imaginii: {e}")
            return ImageGenerationResult(success=False, error_message=str(e))

if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    
    async def test():
        current_dir = os.path.dirname(os.path.abspath(__file__))
        local_env_path = os.path.join(current_dir, ".env")
        load_dotenv(dotenv_path=local_env_path, override=True)
        
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        hf_api_key = os.getenv("HUGGINGFACE_API_KEY") # Optional, dar recomandat
        if not gemini_api_key:
            print("❌ EROARE: GEMINI_API_KEY nu a fost gasit in .env")
            return
            
        print("🚀 Testare ImageService (Hugging Face - SDXL)...")
        service = ImageService(gemini_api_key=gemini_api_key, hf_api_key=hf_api_key)
        
        # Test mock data
        from schemas import TipEveniment, NivelUrgenta
        from datetime import datetime
        
        test_info = ExtractedAnnouncementInfo(
            materie_sau_subiect="Internship ING Bank",
            entitate_sursa="ING Hubs Romania",
            tip_eveniment=TipEveniment.INTERNSHIP,
            urgenta_estimata=NivelUrgenta.MEDIE,
            public_tinta=["Studenti"],
            deadline_absolut=datetime.now(),
            locatie=None,
            rezumat_notificare="Aplica pentru internshipul ING pana pe 15 Iunie.",
            actiuni_extrase=["Aplica"],
            taguri_cheie=["Java", "DevOps", "Banca", "Tech"]
        )
        
        response = await service.generate_announcement_banner(test_info)
        
        if response.success:
            print("✅ SUCCES! Imaginea a fost generata cu succes.")
            print(f"Base64 (primele 100 caractere): {response.image_base64[:100]}...")
            
            # Salvam poza fizic pentru vizualizare rapida in folderul smart-news-parser
            try:
                base64_data = response.image_base64.split(",")[1]
                current_dir = os.path.dirname(os.path.abspath(__file__))
                save_path = os.path.join(current_dir, "test_banner.jpg")
                with open(save_path, "wb") as f:
                    f.write(base64.b64decode(base64_data))
                print(f"🖼️ POZA E GATA! A fost salvata in: {save_path}")
            except Exception as e:
                print(f"Eroare la salvarea pozei pe disc: {e}")
        else:
            print(f"❌ EROARE: {response.error_message}")

    asyncio.run(test())
