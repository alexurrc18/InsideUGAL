import os
import base64
import logging
import requests
import asyncio
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
    def __init__(self, gemini_api_key: str, hf_api_key: str | None = None):
        self.client = genai.Client(api_key=gemini_api_key)
        self.text_model_id = 'gemini-3.5-flash'
        self.hf_api_key = hf_api_key
        # Model gratuit de la Hugging Face
        self.hf_model_url = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"

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

            # 2. Generate Image with Hugging Face (Stable Diffusion)
            headers = {}
            if self.hf_api_key:
                headers["Authorization"] = f"Bearer {self.hf_api_key}"
                
            payload = {
                "inputs": refined_prompt,
                "parameters": {
                    "width": 1024,
                    "height": 576  # Aproximativ 16:9
                }
            }
            
            # Executăm cererea sincronă într-un thread separat pentru a nu bloca asyncio
            def fetch_image():
                response = requests.post(self.hf_model_url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise Exception(f"HF API Error {response.status_code}: {response.text}")
                return response.content
                
            logger.info("⏳ Se generează imaginea prin Hugging Face...")
            image_bytes = await asyncio.to_thread(fetch_image)
            
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
        
        test_text = "Internship la ING Hubs Romania! Cautam pasionati de Java, .NET si DevOps. Aplicati pana pe 15 Iunie."
        response = await service.generate_announcement_banner(test_text)
        
        if response.success:
            print("✅ SUCCES! Imaginea a fost generata cu succes.")
            print(f"Base64 (primele 100 caractere): {response.image_base64[:100]}...")
        else:
            print(f"❌ EROARE: {response.error_message}")

    asyncio.run(test())
