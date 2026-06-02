import os
import base64
import logging
from google import genai
from google.genai import types
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-generator")

class ImageGenerationResult(BaseModel):
    success: bool
    image_base64: str | None = None
    error_message: str | None = None

class ImageService:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.text_model_id = 'gemini-3.5-flash'
        self.image_model_id = 'imagen-4.0-fast-generate-001'

    async def generate_announcement_banner(self, announcement_text: str) -> ImageGenerationResult:
        try:
            # 1. Transform text to visual prompt using Gemini 3.5 Flash
            prompt_system = (
                "You are an expert prompt engineer for Imagen 4.0. "
                "Transform the following university announcement into an english prompt for an image generation model. "
                "The image must be a photorealistic cinematic shot (buildings, environments, objects, campus life, technology). "
                "CRITICAL: Do NOT include humans or faces. Human generation is blocked by safety filters. Focus on the environment and objects. "
                "CRITICAL: The image must NOT contain any text, letters, or numbers. "
                "Output ONLY the prompt string, nothing else."
            )
            
            prompt_refiner = await self.client.aio.models.generate_content(
                model=self.text_model_id,
                contents=f"Announcement: {announcement_text}",
                config=types.GenerateContentConfig(
                    system_instruction=prompt_system,
                    temperature=0.7
                )
            )
            
            refined_prompt = prompt_refiner.text.strip()
            logger.info(f"🎨 Refined Prompt: {refined_prompt}")

            # 2. Generate Image with Imagen 4.0
            result = await self.client.aio.models.generate_images(
                model=self.image_model_id,
                prompt=refined_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio='16:9',
                    output_mime_type='image/jpeg',
                    person_generation='DONT_ALLOW' # Previne erorile de siguranta
                )
            )

            if not result.generated_images:
                return ImageGenerationResult(success=False, error_message="Nu s-au putut genera imagini.")
                
            generated_image = result.generated_images[0]
            image_bytes = generated_image.image.image_bytes
            
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
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("❌ EROARE: GEMINI_API_KEY nu a fost gasit in .env")
            return
            
        print("🚀 Testare ImageService (Imagen 4.0 Fast)...")
        service = ImageService(api_key=api_key)
        
        test_text = "Internship la ING Hubs Romania! Cautam pasionati de Java, .NET si DevOps. Aplicati pana pe 15 Iunie."
        response = await service.generate_announcement_banner(test_text)
        
        if response.success:
            print("✅ SUCCES! Imaginea a fost generata cu succes.")
            print(f"Base64 (primele 100 caractere): {response.image_base64[:100]}...")
        else:
            print(f"❌ EROARE: {response.error_message}")

    asyncio.run(test())
