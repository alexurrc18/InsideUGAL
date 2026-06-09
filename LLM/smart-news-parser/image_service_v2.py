"""
image_service_v2.py
===================
InsideUGAL v2.0 – Image Service cu ControlNet SDXL + Canny conditioning

Diferente fata de v1:
  - Modelul trece de la FLUX.1-schnell la SDXL + ControlNet Canny
  - generate_announcement_banner() accepta un parametru optional `faculty_id`
  - Pe baza `faculty_id`, serviciul incarca automat imaginea Canny corespunzatoare
  - Imaginea Canny este trimisa ca `image` (control image) catre HF Space
  - Fallback automat la FLUX (v1) daca nu exista Canny pentru facultatea respectiva

Structura asteptata pentru assets:
    smart-news-parser/
    └── assets/
        └── buildings/
            ├── inginerie/
            │   ├── img1_canny.png
            │   └── img2_canny.png
            ├── aciee/
            │   └── aciee_canny.png
            └── ... (alte facultati)

Flow v2.0:
    1. LLM (Llama-3.3-70B) genereaza prompt vizual din JSON anunt
    2. Se detecteaza facultatea din `entitate_sursa` sau `faculty_id` explicit
    3. Se incarca Canny-ul corespunzator din assets/
    4. Se trimite prompt + canny_image catre HF Space (StableDiffusionXLControlNetPipeline)
    5. Fallback la FLUX daca HF Space e down sau nu exista Canny
"""

import os
import base64
import logging
import io
from pathlib import Path
from huggingface_hub import AsyncInferenceClient
from huggingface_hub.errors import HfHubHTTPError
from pydantic import BaseModel
from PIL import Image as PILImage
from schemas import ExtractedAnnouncementInfo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-generator-v2")


# ─────────────────────────────────────────────────────────────────────────────
# Mapare facultate → folder Canny
# Adauga aici facultatile pe masura ce procesezi pozele
# ─────────────────────────────────────────────────────────────────────────────
FACULTY_CANNY_MAP: dict[str, str] = {
    # Cheile sunt substrings (lowercase) din entitate_sursa
    "inginerie":  "inginerie",
    "aciee":      "aciee",
    "automatica": "aciee",
    "calculatoare": "aciee",
    "medicina":   "medicina",
    "drept":      "drept",
    "economica":  "economica",
    "litere":     "litere",
    # fallback generic daca nu gasim nimic
}

# ─────────────────────────────────────────────────────────────────────────────
# Schema rezultat (identica cu v1 pentru compatibilitate backwards)
# ─────────────────────────────────────────────────────────────────────────────
class ImageGenerationResult(BaseModel):
    success: bool
    image_base64: str | None = None
    error_message: str | None = None
    used_controlnet: bool = False          # nou in v2 — util pentru logging/debug


class ImageServiceV2:
    def __init__(self, hf_api_key: str, assets_dir: str | None = None):
        if not hf_api_key:
            raise ValueError("HUGGINGFACE_API_KEY este obligatoriu pentru ImageServiceV2.")

        self.hf_client = AsyncInferenceClient(token=hf_api_key)

        # ── Modele ──────────────────────────────────────────────────────────
        self.hf_text_model_id   = "meta-llama/Llama-3.3-70B-Instruct"

        # Modelul ControlNet SDXL de pe HF Hub — folosit pentru image-to-image cu canny
        # Acesta este un Space public Gradio; apelul se face prin hf_client.image_to_image()
        self.controlnet_model_id = "diffusers/controlnet-canny-sdxl-1.0"

        # Fallback daca ControlNet nu e disponibil (v1 behavior)
        self.flux_model_id       = "black-forest-labs/FLUX.1-schnell"

        # ── Assets ──────────────────────────────────────────────────────────
        # Cauta assets/ relativ la fisierul curent daca nu e specificat explicit
        if assets_dir:
            self.assets_dir = Path(assets_dir)
        else:
            self.assets_dir = Path(__file__).parent / "assets" / "buildings"

        logger.info(f"📁 Assets dir: {self.assets_dir}")
        logger.info(f"🤖 ControlNet model: {self.controlnet_model_id}")
        logger.info(f"🔄 Fallback model: {self.flux_model_id}")

    # ─────────────────────────────────────────────────────────────────────────
    # Detectare Canny pe baza entitatii sursa
    # ─────────────────────────────────────────────────────────────────────────
    def _resolve_canny_path(self, info: ExtractedAnnouncementInfo) -> Path | None:
        """
        Cauta imaginea Canny potrivita pentru facultatea din anunt.
        Returneaza Path spre primul PNG gasit in folderul facultatii,
        sau None daca nu exista mapping sau fisiere.
        """
        source = (info.entitate_sursa or "").lower()

        matched_folder = None
        for keyword, folder_name in FACULTY_CANNY_MAP.items():
            if keyword in source:
                matched_folder = folder_name
                break

        if not matched_folder:
            logger.warning(f"⚠️  Nu am gasit mapping Canny pentru sursa: '{info.entitate_sursa}'")
            return None

        folder_path = self.assets_dir / matched_folder
        if not folder_path.exists():
            logger.warning(f"⚠️  Folder Canny inexistent: {folder_path}")
            return None

        # Ia primul fișier care se termină în _canny.png/jpg
        canny_files = sorted(
            [f for f in folder_path.iterdir() if f.suffix.lower() in {".png", ".jpg", ".jpeg"} and "_canny" in f.name.lower()]
        )
        if not canny_files:
            logger.warning(f"⚠️  Nicio imagine Canny in: {folder_path}")
            return None

        logger.info(f"✅ Canny gasit: {canny_files[0]}")
        return canny_files[0]

    # ─────────────────────────────────────────────────────────────────────────
    # Generare prompt vizual (identic cu v1)
    # ─────────────────────────────────────────────────────────────────────────
    async def _generate_prompt(self, info: ExtractedAnnouncementInfo, with_controlnet: bool) -> str:
        """
        Genereaza promptul text-to-image adaptat.
        Daca avem ControlNet activ, adaugam instructiuni pentru ca
        clădirea sa fie integrata ca fundal, nu subiect principal.
        """
        building_instruction = (
            "The university building appears prominently in the background, "
            "architectural details visible but not the main focus. "
        ) if with_controlnet else ""

        prompt_system = (
            "You are an expert prompt engineer for a ControlNet SDXL image generation model. "
            "Transform the following structured university announcement data into an English prompt. "
            "CRITICAL INSTRUCTION 1: The generated image MUST visually represent the semantic meaning of the announcement. "
            "Analyze the 'Tags', 'Subject', and 'Summary'. Choose ONE OR TWO simple thematic objects strictly matching the context "
            "(e.g., a laptop or code symbols for a Hackathon, a piggy bank for a Scholarship). "
            "CRITICAL INSTRUCTION 2: Keep the composition extremely simple and clean. "
            f"{building_instruction}"
            "CRITICAL INSTRUCTION 3: DYNAMICALLY ADAPT THE ART STYLE based on the announcement type: "
            "- Exciting events (Hackathons, Internships, Tech): 'cool, modern, futuristic, neon, vibrant, cyberpunk' aesthetic. "
            "- Formal events (Scholarships, Exams, Admissions): 'premium 3D icon, rich vibrant colors, elegant corporate design'. "
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

        result = await self.hf_client.chat_completion(
            model=self.hf_text_model_id,
            messages=messages,
            max_tokens=256,
            temperature=0.7
        )
        return result.choices[0].message.content.strip()

    # ─────────────────────────────────────────────────────────────────────────
    # Generare cu ControlNet SDXL
    # ─────────────────────────────────────────────────────────────────────────
    async def _generate_with_controlnet(
        self,
        prompt: str,
        canny_path: Path,
    ) -> PILImage.Image:
        """
        Apeleaza HF Inference API cu modelul ControlNet SDXL.
        Trimite imaginea Canny ca `image` de conditionare.

        Nota: HF Inference API pentru ControlNet foloseste image_to_image()
        cu modelul diffusers/controlnet-canny-sdxl-1.0.
        Controlnet strength default 0.8 — bun pentru fundal arhitectural.
        """
        with open(canny_path, "rb") as f:
            canny_bytes = f.read()

        logger.info(f"🏛️  Generare cu ControlNet SDXL (canny: {canny_path.name})...")

        image = await self.hf_client.image_to_image(
            image=canny_bytes,
            prompt=prompt,
            model=self.controlnet_model_id,
            strength=0.8,           # Cat de mult respecta structura Canny (0.0-1.0)
            width=1024,
            height=576,
        )
        return image

    # ─────────────────────────────────────────────────────────────────────────
    # Generare fallback FLUX (v1 behavior)
    # ─────────────────────────────────────────────────────────────────────────
    async def _generate_with_flux(self, prompt: str) -> PILImage.Image:
        logger.info("🔄 Fallback la FLUX.1-schnell (fara ControlNet)...")
        image = await self.hf_client.text_to_image(
            prompt=prompt,
            model=self.flux_model_id,
            width=1024,
            height=576,
        )
        return image

    # ─────────────────────────────────────────────────────────────────────────
    # PIL Image → base64 JPEG
    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _pil_to_base64(image: PILImage.Image) -> str:
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG", quality=90)
        return base64.b64encode(buffered.getvalue()).decode("utf-8")

    # ─────────────────────────────────────────────────────────────────────────
    # Metoda publica principala (drop-in replacement pentru v1)
    # ─────────────────────────────────────────────────────────────────────────
    async def generate_announcement_banner(
        self,
        info: ExtractedAnnouncementInfo,
    ) -> ImageGenerationResult:
        used_controlnet = False
        try:
            # 1. Detectam Canny-ul disponibil
            canny_path = self._resolve_canny_path(info)
            has_canny  = canny_path is not None

            # 2. Generare prompt adaptat
            refined_prompt = await self._generate_prompt(info, with_controlnet=has_canny)
            logger.info(f"🎨 Refined Prompt: {refined_prompt}")

            # 3. Generare imagine
            if has_canny:
                try:
                    image = await self._generate_with_controlnet(refined_prompt, canny_path)
                    used_controlnet = True
                except Exception as e:
                    logger.warning(f"⚠️  ControlNet a esuat ({e}), fallback la FLUX...")
                    image = await self._generate_with_flux(refined_prompt)
            else:
                image = await self._generate_with_flux(refined_prompt)

            # 4. Validare tip returnat
            if not isinstance(image, PILImage.Image):
                raise ValueError(f"HF a returnat tip neasteptat: {type(image)}")

            # 5. Conversie → base64
            base64_encoded = self._pil_to_base64(image)

            return ImageGenerationResult(
                success=True,
                image_base64=f"data:image/jpeg;base64,{base64_encoded}",
                used_controlnet=used_controlnet,
            )

        except HfHubHTTPError as e:
            logger.error(f"❌ Eroare HF API: {e}")
            raise e
        except Exception as e:
            logger.error(f"❌ Eroare generare banner: {e}")
            return ImageGenerationResult(success=False, error_message=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Test local (rulat direct: python image_service_v2.py)
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv

    async def test():
        current_dir = Path(__file__).parent
        load_dotenv(dotenv_path=current_dir / ".env", override=True)

        hf_api_key = os.getenv("HUGGINGFACE_API_KEY")
        if not hf_api_key:
            print("❌ HUGGINGFACE_API_KEY lipseste din .env")
            return

        # Assets dir pentru test: muta canny-urile tale aici
        # assets/buildings/aciee/img1_cleanup_canny.png
        assets_dir = current_dir / "assets" / "buildings"

        print("🚀 Testare ImageServiceV2 (ControlNet SDXL)...")
        service = ImageServiceV2(hf_api_key=hf_api_key, assets_dir=str(assets_dir))

        from schemas import TipEveniment, NivelUrgenta
        from datetime import datetime

        test_info = ExtractedAnnouncementInfo(
            materie_sau_subiect="Hackathon ACIEE 2025",
            entitate_sursa="Facultatea ACIEE",          # <-- trebuie sa matcheze FACULTY_CANNY_MAP
            tip_eveniment=TipEveniment.CONCURS,
            urgenta_estimata=NivelUrgenta.RIDICATA,
            public_tinta=["Studenti"],
            deadline_absolut=datetime.now(),
            locatie="Corp A, UGAL",
            rezumat_notificare="Hackathon organizat de ACIEE, premii mari!",
            actiuni_extrase=["Inscrie-te", "Formeaza echipa"],
            taguri_cheie=["Hackathon", "Tech", "Premii"]
        )

        response = await service.generate_announcement_banner(test_info)

        if response.success:
            mode = "ControlNet SDXL" if response.used_controlnet else "FLUX fallback"
            print(f"✅ SUCCES! Mod folosit: {mode}")

            # Salveaza rezultatul
            base64_data = response.image_base64.split(",")[1]
            save_path = current_dir / "test_banner_v2.jpg"
            with open(save_path, "wb") as f:
                f.write(base64.b64decode(base64_data))
            print(f"🖼️  Salvat in: {save_path}")
        else:
            print(f"❌ EROARE: {response.error_message}")

    asyncio.run(test())
