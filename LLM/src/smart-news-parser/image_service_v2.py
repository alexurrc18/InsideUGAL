"""
image_service_v2.py
===================
InsideUGAL v2.0 – Image Service cu OpenRouter (Grok-Imagine) + FLUX fallback

Flow v2.0:
    1. LLM-ul de extragere a generat deja JSON-ul anunțului.
    2. Dacă anunțul este pur administrativ și există o clădire setată în assets (ex. `assets/buildings/[facultate]/banner_[facultate].png`), se folosește acel banner direct.
    3. Dacă anunțul este mai general/dinamic, LLM-ul generează un prompt vizual bazat pe contextul JSON.
    4. Se generează o imagine via OpenRouter (`x-ai/grok-imagine-image-quality`).
    5. Dacă OpenRouter pică sau nu e disponibil, se face fallback pe HuggingFace cu `FLUX.1-schnell`.
    6. Se face auto-crop (tăiere) forțat la 16:9, iar apoi conversie la JPEG pentru a evita erori de canal alpha (RGBA).
    7. Banner-ul rezultat se uploadează în Supabase și se returnează URL-ul public.

Variabile de mediu necesare (.env):
    OPENROUTER_API_KEY    — pentru Grok-Imagine (sau alte modele de generare de imagini de pe OpenRouter)
    HUGGINGFACE_API_KEY   — pentru generare prompt (Llama 3) și pentru fallback generare imagini (FLUX)
    SUPABASE_URL          — pentru upload banner
    SUPABASE_SERVICE_KEY  — pentru autentificare upload Supabase
"""

import os
import base64
import logging
import io
import re
import uuid
from pathlib import Path

from huggingface_hub import AsyncInferenceClient
from huggingface_hub.errors import HfHubHTTPError
from pydantic import BaseModel
from PIL import Image as PILImage, ImageOps

from parser_schemas import ExtractedAnnouncementInfo
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-generator-v2")


# ─────────────────────────────────────────────────────────────────────────────
# Mapare facultate → folder asset (poze color originale)
# ─────────────────────────────────────────────────────────────────────────────
FACULTY_ASSET_MAP: dict[str, str] = {
    "inginerie":    "inginerie",
    "aciee":        "aciee",
    "automatica":   "aciee",
    "calculatoare": "aciee",
    "medicina":     "medicina",
    "drept":        "drept",
    "economica":    "economica",
    "litere":       "litere",
}

CANNY_SUFFIX = "_canny"


# ─────────────────────────────────────────────────────────────────────────────
# Schema rezultat
# ─────────────────────────────────────────────────────────────────────────────
class ImageGenerationResult(BaseModel):
    success: bool
    image_url: str | None = None           # URL public din Supabase Storage (primar)
    image_base64: str | None = None        # Fallback base64 daca Supabase nu e configurat
    error_message: str | None = None
    used_image_to_image: bool = False
    used_flux_fallback: bool = False


class ImageServiceV2:
    def __init__(
        self,
        hf_api_key: str | None = None,
        assets_dir: str | None = None,
    ):
        # ── HF client ───────────────────────────────────────────────────────
        self.hf_api_key = hf_api_key or os.getenv("HUGGINGFACE_API_KEY")
        self.hf_client = AsyncInferenceClient(token=self.hf_api_key) if self.hf_api_key else None

        # ── Modele ───────────────────────────────────────────────────────────
        self.hf_text_model_id = "meta-llama/Llama-3.3-70B-Instruct"
        self.flux_model_id    = "black-forest-labs/FLUX.1-schnell"
        self.img2img_model_id = "stabilityai/stable-diffusion-xl-base-1.0"

        # ── Supabase Storage ─────────────────────────────────────────────────
        self.supabase = None
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        if supabase_url and supabase_key:
            try:
                from supabase import create_client
                self.supabase: Client | None = create_client(supabase_url, supabase_key)
                logger.info("✅ Supabase Storage configurat pentru upload bannere.")
            except ImportError:
                logger.warning("supabase package lipsește — upload Storage dezactivat.")
        else:
            logger.warning("Supabase credentials lipsa — bannere returnate ca base64 (fallback local).")

        # ── Assets ───────────────────────────────────────────────────────────
        self.assets_dir = Path(assets_dir) if assets_dir else Path(__file__).parent / "assets" / "buildings"
        logger.info(f"Assets dir: {self.assets_dir}")

    # ─────────────────────────────────────────────────────────────────────────
    # Detectare poză originală (color) pentru facultate
    # ─────────────────────────────────────────────────────────────────────────
    async def _generate_prompt(self, info: ExtractedAnnouncementInfo, has_building_ref: bool) -> str:
        building_instruction = (
            "Because a real photo of the university building will be overlaid later, the background MUST NOT contain any drawn buildings. "
            "Generate ONLY a beautiful, thematic, abstract or environmental background related to the subject, leaving space for an overlay. "
        ) if has_building_ref else ""

        prompt_system = (
            "You are an expert art director and prompt engineer. "
            "Transform the following university announcement into an English image prompt. "
            "INSTRUCTION 1: Visually represent the announcement's meaning using modern, premium graphic design concepts. "
            "Include 1-2 clear, recognizable thematic objects STRICTLY RELATED to the announcement's actual core subject (e.g., stylized sleek train/bus tickets for 'transportation', elegant premium coins, sleek credit cards, or a clean ceramic piggy-bank for 'scholarships/money', elegant 3D microchips for 'hardware'). DO NOT use generic academic clichés like books, pens, or graduation caps unless the announcement is literally about graduation or the library. Integrate the objects elegantly into the background. Ensure these objects are highly detailed, richly colored, and visually striking. Avoid making them look like blank, boring shapes. "
            "INSTRUCTION 2: Incorporate specific nuances from the text ONLY IF they are highly relevant. If the announcement EXPLICITLY mentions specific funding or sources (e.g., EU social grants, European funds), incorporate subtle related symbols (e.g., an elegant EU flag motif). DO NOT add any country flags (like the Romanian flag) or EU flags randomly. For general events like Hackathons, keep the design strictly tech-focused without any flags or geopolitical symbols. "
            "INSTRUCTION 3: Keep the composition clean, highly aesthetic, and professional. "
            f"{building_instruction}"
            "INSTRUCTION 4: Adapt art style: "
            "Exciting events (Hackathons, Contests) → 'modern tech-art, elegant dynamic lighting, sleek and vibrant but balanced colors, subtle 3D glassmorphism, energetic yet professional'. Use vibrant accents (like cyan or purple) but keep the overall tone sophisticated. "
            "Formal/Administrative events (Transportation, Exams, Grants) → 'sophisticated, premium academic aesthetic, beautiful soft ambient lighting, smooth vibrant corporate gradients (e.g. deep blues, warm golds, or elegant purples), subtle 3D symbolic icons gently floating. Very polished and visually striking but clean and professional. DO NOT use neon, glowing sci-fi elements, or futuristic cyberpunk lighting here.' "
            "INSTRUCTION 5: The final image will be heavily cropped to a 16:9 widescreen ratio. You MUST compose the image panoramically, centering all important focal objects horizontally and leaving generous empty atmospheric space at the top and bottom so nothing gets cut off. "
            "No photorealism. No human faces. "
            "Output ONLY the prompt string."
        )

        announcement_context = (
            f"Event Type: {info.tip_eveniment.value if hasattr(info.tip_eveniment, 'value') else info.tip_eveniment}\n"
            f"Subject: {info.materie_sau_subiect}\n"
            f"Source: {info.entitate_sursa}\n"
            f"Tags: {', '.join(info.taguri_cheie)}\n"
            f"Summary: {info.rezumat_notificare}"
        )

        if not self.hf_client:
            return f"University event banner for {info.materie_sau_subiect}, modern design, vibrant colors"

        result = await self.hf_client.chat_completion(
            model=self.hf_text_model_id,
            messages=[
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": f"Announcement:\n{announcement_context}"}
            ],
            max_tokens=256,
            temperature=0.7
        )
        return result.choices[0].message.content.strip()

    # ─────────────────────────────────────────────────────────────────────────
    # Generare cu image-to-image via HF
    # ─────────────────────────────────────────────────────────────────────────
    async def _generate_with_openrouter(self, prompt: str) -> PILImage.Image | None:
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_key:
            return None
            
        logger.info("Incercam generarea imaginii via OpenRouter (Grok-Imagine/Nano Banana)...")
        # Adaugam instructiuni explicite sa nu genereze text aiurea
        safe_prompt = prompt + " DO NOT generate any text, words, or letters in the image. Keep it purely visual without any typography."
        
        try:
            import requests
            import base64
            
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "x-ai/grok-imagine-image-quality",
                    "messages": [
                        {
                            "role": "user",
                            "content": safe_prompt
                        }
                    ]
                },
                timeout=60
            )
            response.raise_for_status()
            data = response.json()
            
            # OpenRouter typically returns the image URL in the content if it's an image model
            # Or it might return base64.
            # Let's check how OpenRouter returns images for grok-imagine.
            msg = data['choices'][0]['message']
            content = msg.get('content')
            
            # Grok imagine might return the image in a special 'images' array:
            if not content and 'images' in msg and len(msg['images']) > 0:
                img_obj = msg['images'][0]
                if 'image_url' in img_obj and 'url' in img_obj['image_url']:
                    content = img_obj['image_url']['url']
            
            if not content:
                logger.warning("Continutul (content) returnat de OpenRouter este gol (None).")
                return None
            
            # If it's a URL (markdown or plain)
            url_match = re.search(r'(https?://[^\s)\]]+)', content)
            if url_match:
                img_url = url_match.group(1)
                img_resp = requests.get(img_url)
                img_resp.raise_for_status()
                return PILImage.open(io.BytesIO(img_resp.content)).convert("RGBA")
                
            # If it's base64 encoded
            if "base64," in content:
                b64_data = content.split("base64,")[1].split()[0]
                b64_data += "=" * ((4 - len(b64_data) % 4) % 4)
                image_data = base64.b64decode(b64_data)
                return PILImage.open(io.BytesIO(image_data)).convert("RGBA")
                
            logger.warning("Nu am gasit URL sau Base64 in raspunsul OpenRouter pentru imagine.")
            return None
        except Exception as e:
            logger.warning(f"OpenRouter image generation a esuat: {e}")
            return None

    async def _generate_with_flux(self, prompt: str) -> PILImage.Image:
        if not self.hf_client:
            raise ValueError("HUGGINGFACE_API_KEY lipsește.")
        logger.info("Generare FLUX.1-schnell (fără referință vizuală)...")
        return await self.hf_client.text_to_image(
            prompt=prompt,
            model=self.flux_model_id,
            width=1024,
            height=576,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Overlay Advanced (Transparent & Administrative adaptiv)
    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _crop_to_16_9(image: PILImage.Image) -> PILImage.Image:
        target_ratio = 16.0 / 9.0
        img_ratio = image.width / image.height

        if abs(img_ratio - target_ratio) < 0.01:
            return image

        if img_ratio > target_ratio:
            new_width = int(target_ratio * image.height)
            offset = (image.width - new_width) // 2
            crop_box = (offset, 0, offset + new_width, image.height)
        else:
            new_height = int(image.width / target_ratio)
            offset = (image.height - new_height) // 2
            crop_box = (0, offset, image.width, offset + new_height)

        return image.crop(crop_box)

    @staticmethod
    def _pil_to_bytes(image: PILImage.Image) -> bytes:
        buf = io.BytesIO()
        image.convert("RGB").save(buf, format="JPEG", quality=90)
        return buf.getvalue()

    # ─────────────────────────────────────────────────────────────────────────
    # Upload Supabase Storage
    # ─────────────────────────────────────────────────────────────────────────
    def _upload_to_storage(self, image_bytes: bytes) -> str | None:
        if not self.supabase:
            return None
        try:
            file_name = f"banners/{uuid.uuid4()}.jpg"
            self.supabase.storage.from_("images").upload(
                path=file_name,
                file=image_bytes,
                file_options={"content-type": "image/jpeg"}
            )
            return self.supabase.storage.from_("images").get_public_url(file_name)
        except Exception as e:
            logger.error(f"Eroare upload Supabase: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # Metodă publică principală
    # ─────────────────────────────────────────────────────────────────────────
    def _resolve_premade_banner(self, info: ExtractedAnnouncementInfo) -> Path | None:
        source = (info.entitate_sursa or "").lower()
        matched_folder = None
        for keyword, folder_name in FACULTY_ASSET_MAP.items():
            if keyword in source:
                matched_folder = folder_name
                break
        
        if not matched_folder:
            return None
            
        folder_path = self.assets_dir / matched_folder
        if not folder_path.exists():
            return None
            
        # Cautam o imagine gata facuta de Gemini (ex: contine 'banner' sau e singura de acolo)
        all_images = sorted([
            f for f in folder_path.iterdir()
            if f.suffix.lower() in {".png", ".jpg", ".jpeg"}
        ])
        
        for img in all_images:
            if "banner" in img.name.lower():
                return img
        
        # Daca nu are banner in nume dar exista, o returnam pe prima daca e format 16:9 (presupunem)
        if all_images:
            return all_images[0]
            
        return None

    async def generate_announcement_banner(
        self,
        info: ExtractedAnnouncementInfo,
    ) -> ImageGenerationResult:
        used_image_to_image = False
        used_flux_fallback  = False
        
        try:
            # 1. Verificam daca e un anunt administrativ/simplu care ar trebui sa foloseasca bannerul prefacut
            # Daca e hackathon, party, concurs, ignoram poza cladirii fallback si generam ceva tematic.
            thematic_types = ['concurs', 'hackathon', 'party', 'voluntariat', 'oportunitate']
            is_thematic = any(t in str(info.tip_eveniment).lower() for t in thematic_types) or any(t in str(info.materie_sau_subiect).lower() for t in thematic_types)
            
            if not is_thematic:
                premade_banner = self._resolve_premade_banner(info)
                if premade_banner:
                    logger.info(f"Folosim bannerul predefinit perfect pentru {info.entitate_sursa}: {premade_banner.name}")
                    image = PILImage.open(premade_banner).convert("RGB")
                    image_bytes = self._pil_to_bytes(image)
                    public_url  = self._upload_to_storage(image_bytes)
                    return ImageGenerationResult(
                        success=True,
                        image_url=public_url,
                        image_base64=None,
                        error_message=None,
                        used_image_to_image=False,
                        used_flux_fallback=False
                    )

            # 2. Generam un banner complet tematic cu OpenRouter (Grok) sau FLUX
            prompt = await self._generate_prompt(info, has_building_ref=False)
            logger.info(f"Prompt pentru AI: {prompt}")

            # 3. Generare cu OpenRouter Grok
            image = await self._generate_with_openrouter(prompt)
            if not image:
                # 4. Fallback la FLUX HF
                logger.info("Facem fallback la FLUX.1 pe HuggingFace...")
                image = await self._generate_with_flux(prompt)
                used_flux_fallback = True

            if not isinstance(image, PILImage.Image):
                raise ValueError(f"Tip neașteptat: {type(image)}")

            image = self._crop_to_16_9(image)
            image_bytes = self._pil_to_bytes(image)
            public_url  = self._upload_to_storage(image_bytes)
            
            local_save_path = self.assets_dir / f"generated_banner_{uuid.uuid4().hex[:8]}.jpg"
            image.convert("RGB").save(local_save_path, "JPEG")

            return ImageGenerationResult(
                success=True,
                image_url=public_url,
                image_base64=None,
                error_message=None,
                used_image_to_image=used_image_to_image,
                used_flux_fallback=used_flux_fallback
            )
        except Exception as e:
            logger.error(f"Eroare FATALA la generare banner: {e}", exc_info=True)
            return ImageGenerationResult(success=False, image_url=None, error_message=str(e))
