"""
image_service_v2.py
===================
InsideUGAL v2.0 – Image Service cu HF image-to-image + FLUX fallback

Flow v2.0:
    1. LLM (Llama-3.3-70B via HF) generează prompt vizual din JSON anunț
    2. Se detectează facultatea din `entitate_sursa`
    3. Se încarcă poza ORIGINALĂ (color, fără fundal) a clădirii din assets/
    4. Se trimite prompt + poză la HF Inference API (image-to-image cu SDXL)
    5. Fallback la FLUX.1-schnell (HF) text-to-image dacă poza lipsește sau eșuează

Structura assets (poze color curate, NU canny):
    smart-news-parser/
    └── assets/
        └── buildings/
            ├── inginerie/
            │   ├── img1_cleanup.png   ← poza originală după background removal
            │   └── img2_cleanup.png
            ├── aciee/
            │   └── corp_Y12.png
            └── ...

Variabile de mediu necesare (.env):
    HUGGINGFACE_API_KEY   — pentru LLM (Llama), SDXL image-to-image și FLUX fallback
    SUPABASE_URL          — optional, pentru upload banner
    SUPABASE_SERVICE_KEY  — optional
"""

import os
import base64
import logging
import io
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
        self.img2img_model_id = "stabilityai/stable-diffusion-xl-refiner-1.0"

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
    def _resolve_building_image(self, info: ExtractedAnnouncementInfo) -> Path | None:
        source = (info.entitate_sursa or "").lower()

        matched_folder = None
        for keyword, folder_name in FACULTY_ASSET_MAP.items():
            if keyword in source:
                matched_folder = folder_name
                break

        if not matched_folder:
            logger.warning(f"Nu am găsit mapping pentru: '{info.entitate_sursa}'")
            return None

        folder_path = self.assets_dir / matched_folder
        if not folder_path.exists():
            logger.warning(f"Folder inexistent: {folder_path}")
            return None

        all_images = sorted([
            f for f in folder_path.iterdir()
            if f.suffix.lower() in {".png", ".jpg", ".jpeg"}
            and CANNY_SUFFIX not in f.name.lower()
        ])

        if not all_images:
            logger.warning(f"Nicio poză color în: {folder_path}")
            return None

        preferred = [f for f in all_images if "cleanup" in f.name.lower() or "clean" in f.name.lower() or "corp" in f.name.lower()]
        chosen = preferred[0] if preferred else all_images[0]

        logger.info(f"✅ Poză clădire: {chosen.name}")
        return chosen

    # ─────────────────────────────────────────────────────────────────────────
    # Generare prompt via LLM
    # ─────────────────────────────────────────────────────────────────────────
    async def _generate_prompt(self, info: ExtractedAnnouncementInfo, has_building_ref: bool) -> str:
        building_instruction = (
            "A university building appears prominently, matching the structure of the provided image but harmonized with the new background. "
        ) if has_building_ref else ""

        prompt_system = (
            "You are an expert prompt engineer for an SDXL image generation model. "
            "Transform the following university announcement into an English image prompt. "
            "INSTRUCTION 1: Visually represent the announcement's meaning. "
            "Choose ONE OR TWO thematic objects (e.g. glowing laptop for Hackathon). "
            "INSTRUCTION 2: Keep composition modern and clean. "
            f"{building_instruction}"
            "INSTRUCTION 3: Adapt art style: "
            "Exciting events → 'neon cyberpunk, futuristic, vibrant'. "
            "Formal events → 'elegant, premium, corporate, polished'. "
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
    async def _generate_with_img2img(
        self,
        prompt: str,
        building_image_path: Path,
    ) -> PILImage.Image:
        logger.info(f"Generare image-to-image (ref: {building_image_path.name}, HF)...")
        
        # Incarcam poza local si ii punem un fundal alb (pentru transparente png)
        image = PILImage.open(building_image_path).convert("RGBA")
        background = PILImage.new("RGBA", image.size, (255, 255, 255, 255))
        alpha_composite = PILImage.alpha_composite(background, image)
        rgb_image = alpha_composite.convert("RGB")
        
        # Convert to bytes
        buf = io.BytesIO()
        rgb_image.save(buf, format="JPEG", quality=90)
        image_bytes = buf.getvalue()

        if not self.hf_client:
             raise ValueError("HUGGINGFACE_API_KEY lipsește.")

        # HF AsyncInferenceClient are image_to_image direct:
        # Folosim stabilityai/stable-diffusion-xl-refiner-1.0 care suporta nativ img2img foarte bine
        return await self.hf_client.image_to_image(
            prompt=prompt,
            image=image_bytes,
            model=self.img2img_model_id,
            # Parametrul de putere (0.0 = imaginea originala, 1.0 = zgomot complet)
            # 0.7-0.8 permite modelului sa adauge obiectele cerute si sa refaca fundalul
            # dar pastreaza structura generala a cladirii.
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Fallback FLUX via HF
    # ─────────────────────────────────────────────────────────────────────────
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
    # PIL → bytes JPEG
    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _pil_to_bytes(image: PILImage.Image) -> bytes:
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=90)
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
    async def generate_announcement_banner(
        self,
        info: ExtractedAnnouncementInfo,
    ) -> ImageGenerationResult:
        used_image_to_image = False
        used_flux_fallback  = False

        try:
            # 1. Detectăm poza color a clădirii
            building_path   = self._resolve_building_image(info)
            has_building    = building_path is not None

            # 2. Prompt adaptat
            prompt = await self._generate_prompt(info, has_building_ref=has_building)
            logger.info(f"Prompt: {prompt}")

            # 3. Generare
            if has_building:
                try:
                    image = await self._generate_with_img2img(prompt, building_path)
                    used_image_to_image = True
                except Exception as e:
                    logger.warning(f"image-to-image eșuat ({e}), fallback FLUX...")
                    image = await self._generate_with_flux(prompt)
                    used_flux_fallback = True
            else:
                image = await self._generate_with_flux(prompt)
                used_flux_fallback = True

            if not isinstance(image, PILImage.Image):
                raise ValueError(f"Tip neașteptat: {type(image)}")

            # 4. Bytes + storage
            image_bytes = self._pil_to_bytes(image)
            public_url  = self._upload_to_storage(image_bytes)

            if public_url:
                return ImageGenerationResult(
                    success=True, image_url=public_url,
                    used_image_to_image=used_image_to_image,
                    used_flux_fallback=used_flux_fallback,
                )
            else:
                b64 = base64.b64encode(image_bytes).decode("utf-8")
                return ImageGenerationResult(
                    success=True,
                    image_base64=f"data:image/jpeg;base64,{b64}",
                    used_image_to_image=used_image_to_image,
                    used_flux_fallback=used_flux_fallback,
                )

        except HfHubHTTPError as e:
            logger.error(f"HF API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Eroare generare: {e}")
            return ImageGenerationResult(success=False, error_message=str(e))
