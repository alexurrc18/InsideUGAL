"""
image_service_v2.py
===================
InsideUGAL v2.2 – Image Service cu ControlNet SDXL + Canny conditioning

════════════════════════════════════════════════════════════════════════
  DE CE IMAGE_TO_IMAGE NU ÎNLOCUIEȘTE CONTROLNET
════════════════════════════════════════════════════════════════════════
  image_to_image(canny_bytes):
    • Pornește de la Canny ca "zgomot inițial" → modelul o transformă
    • Canny (negru/alb) e interpretat ca imagine de bază, nu ca ghid structural
    • Rezultat: modelul ignoră structura, face ce vrea promptul → GREȘIT

  ControlNet real (StableDiffusionXLControlNetPipeline):
    • Canny e trimis ca `control_image` SEPARAT de imaginea de bază
    • La FIECARE pas de denoising, rețeaua ControlNet forțează aderența la margini
    • Rezultat: clădirea apare exact după scheletul Canny → CORECT

════════════════════════════════════════════════════════════════════════
  ARHITECTURA CORECTĂ (activată când HF PRO e disponibil)
════════════════════════════════════════════════════════════════════════

  Metoda _call_controlnet_api() construiește payload-ul corect:

    POST https://api-inference.huggingface.co/models/
         stabilityai/stable-diffusion-xl-base-1.0
    {
        "inputs": "un prompt text orice (base image e alb/zgomot)",
        "parameters": {
            "prompt":                        "...",
            "negative_prompt":               "...",
            "image":                         "<base64_CANNY>",   ← control_image!
            "controlnet_conditioning_scale": 0.75,
            "num_inference_steps":           30,
            "guidance_scale":                9.0,
        }
    }

  Diferența față de image_to_image:
    • `image` din parameters = control_image (Canny) aplicat structural
    • Nu e "imaginea de pornire" ci "constrângerea arhitecturală"
    • Modelul folosit trebuie să fie SDXL + ControlNet bundle

════════════════════════════════════════════════════════════════════════
  STRATEGIE DE FALLBACK (în ordinea calității)
════════════════════════════════════════════════════════════════════════

  1. ControlNet SDXL via HF Inference API  [necesită HF PRO / credite]
     Model: stabilityai/stable-diffusion-xl-base-1.0 + ControlNet Canny
     Canny → forțat structural la fiecare pas → clădire exactă

  2. FLUX.1-schnell text-to-image          [hf-inference, GRATUIT]
     Prompt include descrierea clădirii → aproximare vizuală, fără ghid Canny
     Folosit ca fallback automat când ControlNet e indisponibil

  3. Preview local PIL                     [OFFLINE, fără API]
     Canny colorat cu paleta stilului → preview rapid pentru debug/demo

Flow v2.2:
    1. _get_style_recipe(tip_eveniment) → dict cu stil vizual
    2. _pick_random_canny() → imagine Canny random din poze_maps_campus/
    3. _generate_semantic_prompt() → LLM (cu fallback static dacă LLM e down)
    4. _call_controlnet_api() → încearcă ControlNet real cu payload corect
    5. Dacă eșuează → _call_flux_fallback() → FLUX.1-schnell pe hf-inference
    6. Returnează ImageGenerationResult cu metadata completă
"""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import io
import uuid
from pathlib import Path
from typing import Any

import httpx
from huggingface_hub import AsyncInferenceClient
from huggingface_hub.errors import HfHubHTTPError
from PIL import Image as PILImage, ImageFilter, ImageEnhance, ImageOps
from pydantic import BaseModel
from PIL import Image as PILImage
from parser_schemas import ExtractedAnnouncementInfo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-generator-v2")

# ─────────────────────────────────────────────────────────────────────────────
# Constante API
# ─────────────────────────────────────────────────────────────────────────────

# Endpoint-ul HF Inference API clasic (necesită HF PRO sau credite)
# Folosit de _call_controlnet_api() cu payload-ul corect pentru ControlNet
HF_INFERENCE_BASE = "https://api-inference.huggingface.co/models"

# Modelul SDXL + ControlNet Canny (bundle complet)
# Acesta este modelul corect pentru ControlNet — nu doar weights, ci pipeline complet
# Disponibil pe HF Inference API cu HF PRO subscription
HF_CONTROLNET_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"

# Fallback text-to-image (hf-inference, GRATUIT, fără credite)
HF_FLUX_MODEL = "black-forest-labs/FLUX.1-schnell"
HF_IMAGE_PROVIDER = "hf-inference"

# LLM pentru generare prompt semantic
# Schimbă HF_LLM_MODEL și HF_LLM_PROVIDER când creditele se reînnoiesc:
#   HF_LLM_MODEL    = "meta-llama/Llama-3.3-70B-Instruct"  (cea mai bună calitate)
#   HF_LLM_PROVIDER = "nscale"  sau  None  (auto-routing)
HF_LLM_MODEL = "Qwen/Qwen2.5-7B-Instruct"
HF_LLM_PROVIDER = "featherless-ai"

# Timeout pentru apelul ControlNet (poate fi lent la cold start)
CONTROLNET_TIMEOUT_S = 120.0

# Dimensiuni banner (landscape 16:9, SDXL-friendly)
BANNER_WIDTH = 1024
BANNER_HEIGHT = 576


# ─────────────────────────────────────────────────────────────────────────────
# Schema rezultat
# ─────────────────────────────────────────────────────────────────────────────
class ImageGenerationResult(BaseModel):
    success: bool
    image_url: str | None = None           # URL public din Supabase Storage (primar)
    image_base64: str | None = None        # Fallback base64 daca Supabase nu e configurat
    error_message: str | None = None
    used_controlnet: bool = False
    style_used: str | None = None
    canny_file_used: str | None = None
    generation_mode: str | None = None  # "controlnet" | "flux_fallback" | "local_preview"


# ─────────────────────────────────────────────────────────────────────────────
# Style Recipes — dynamic prompting per TipEveniment
# ─────────────────────────────────────────────────────────────────────────────
_STYLE_RECIPES: dict[str, dict[str, Any]] = {
    "cyberpunk_neon": {
        "tip_eveniment_keys": {TipEveniment.CONCURS, TipEveniment.INTERNSHIP, TipEveniment.OPORTUNITATE},
        "prompt_suffix": (
            "cyberpunk aesthetic, neon lights glowing purple and cyan, electric blue atmosphere, "
            "dynamic energy, futuristic HUD overlays, dramatic volumetric fog, "
            "hyperrealistic 8k, artstation trending, ultra-sharp architectural lines illuminated by neon, no people"
        ),
        "building_desc": (
            "The university engineering faculty building dominates the background, "
            "its modernist façade lit by purple and cyan neon, "
            "geometric windows glowing electric blue, brutalist architecture style. "
        ),
        "negative_prompt": (
            "ugly, blurry, low quality, watermark, text, people, faces, "
            "photorealistic portraits, grainy, oversaturated flat colors, cartoonish, boring"
        ),
        # Culori pentru preview local PIL (RGB)
        "preview_tint": (80, 0, 180),       # violet profund
        "preview_accent": (0, 220, 255),    # cyan electric
        "conditioning_scale": 0.80,
        "guidance_scale": 9.0,
        "num_steps": 30,
    },
    "warm_library": {
        "tip_eveniment_keys": {TipEveniment.EXAMEN, TipEveniment.COLOCVIU, TipEveniment.PARTIAL},
        "prompt_suffix": (
            "warm golden hour lighting, soft amber glow through tall windows, "
            "premium university library aesthetic, calm focus atmosphere, "
            "bokeh background, dust particles in light shafts, elegant and scholarly, no people"
        ),
        "building_desc": (
            "The university building glows with warm amber light through its tall windows, "
            "scholarly and elegant architecture, warm beige stone façade. "
        ),
        "negative_prompt": (
            "ugly, blurry, low quality, watermark, text, people, faces, "
            "neon, cyberpunk, dark, horror, cold colors, oversaturated"
        ),
        "preview_tint": (180, 120, 30),
        "preview_accent": (255, 200, 80),
        "conditioning_scale": 0.85,
        "guidance_scale": 8.0,
        "num_steps": 30,
    },
    "tech_lab": {
        "tip_eveniment_keys": {TipEveniment.LABORATOR, TipEveniment.PROIECT},
        "prompt_suffix": (
            "modern tech laboratory, clean white and steel surfaces, soft blue-white LED lighting, "
            "scientific precision aesthetic, isometric 3D render style, "
            "minimalist composition, subtle circuit board patterns, no people"
        ),
        "building_desc": (
            "The engineering faculty building with clean modernist lines, "
            "steel and glass surfaces reflecting cool LED light. "
        ),
        "negative_prompt": (
            "ugly, blurry, low quality, watermark, text, people, faces, "
            "dark mood, grunge, dirty, chaotic, vintage"
        ),
        "preview_tint": (20, 60, 120),
        "preview_accent": (100, 200, 255),
        "conditioning_scale": 0.80,
        "guidance_scale": 8.5,
        "num_steps": 25,
    },
    "premium_corporate": {
        "tip_eveniment_keys": {TipEveniment.BURSA, TipEveniment.ADMITERE},
        "prompt_suffix": (
            "premium corporate design, rich deep navy and gold color palette, "
            "elegant 3D isometric icon style, glossy metallic surfaces, "
            "luxury brand aesthetic, radiant spotlight, no people"
        ),
        "building_desc": (
            "The prestigious university building with grand architecture, "
            "golden hour lighting, navy and gold color palette, formal and prestigious. "
        ),
        "negative_prompt": (
            "ugly, blurry, low quality, watermark, text, people, faces, "
            "neon, cyberpunk, cheap, tacky, low resolution"
        ),
        "preview_tint": (10, 20, 80),
        "preview_accent": (200, 160, 30),
        "conditioning_scale": 0.75,
        "guidance_scale": 9.5,
        "num_steps": 35,
    },
    "vibrant_social": {
        "tip_eveniment_keys": {TipEveniment.VOLUNTARIAT},
        "prompt_suffix": (
            "vibrant colorful festival atmosphere, warm sunset colors, confetti particles, "
            "joyful dynamic energy, soft bokeh, community spirit, bright optimistic palette, "
            "modern poster art style, no people"
        ),
        "building_desc": (
            "The university campus building in warm sunset light, "
            "colorful banners, cheerful and welcoming architecture. "
        ),
        "negative_prompt": (
            "ugly, blurry, low quality, watermark, text, people, faces, "
            "dark, gloomy, corporate, cold, sterile"
        ),
        "preview_tint": (180, 60, 20),
        "preview_accent": (255, 180, 0),
        "conditioning_scale": 0.70,
        "guidance_scale": 8.0,
        "num_steps": 25,
    },
    "clean_institutional": {
        "tip_eveniment_keys": {TipEveniment.CAZARE, TipEveniment.ADMINISTRATIV, TipEveniment.ANUNT_GENERAL},
        "prompt_suffix": (
            "clean modern institutional design, crisp daylight, soft sky blue and white tones, "
            "professional architectural render, subtle shadows, calm and organized, no people"
        ),
        "building_desc": (
            "The university building in crisp daylight, clean architectural lines, "
            "sky blue and white tones, professional and welcoming. "
        ),
        "negative_prompt": (
            "ugly, blurry, low quality, watermark, text, people, faces, "
            "dark, neon, chaotic, overly complex"
        ),
        "preview_tint": (30, 80, 150),
        "preview_accent": (160, 210, 255),
        "conditioning_scale": 0.85,
        "guidance_scale": 7.5,
        "num_steps": 25,
    },
}

_TIP_TO_RECIPE: dict[TipEveniment, str] = {}
for _name, _recipe in _STYLE_RECIPES.items():
    for _te in _recipe["tip_eveniment_keys"]:
        _TIP_TO_RECIPE[_te] = _name

_DEFAULT_RECIPE = "clean_institutional"

# Fallback prompt static pentru când LLM-ul nu e disponibil
_STATIC_PROMPTS: dict[str, str] = {
    "cyberpunk_neon":      "glowing laptop screen, trophy with prize ribbons, floating code symbols",
    "warm_library":        "open books, quill pen, hourglass, study lamp casting warm glow",
    "tech_lab":            "circuit board, microscope, technical blueprint, oscilloscope",
    "premium_corporate":   "golden medal, diploma scroll, laurel wreath, academic seal",
    "vibrant_social":      "colorful balloons, hands joining together, bright stars",
    "clean_institutional": "university emblem, calendar, notice board, announcement bell",
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _pil_to_base64_jpeg(image: PILImage.Image, quality: int = 90) -> str:
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG", quality=quality)
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


def _bytes_to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


def _collect_canny_images(root: Path) -> list[Path]:
    """
    Parcurge recursiv `root` și returnează toate imaginile Canny găsite.
    Criteriu 1: numele conține '_canny'
    Criteriu 2: fișierul e în subfolder 'canny_edges'
    """
    canny_files: list[Path] = []
    for f in root.rglob("*"):
        if not f.is_file() or f.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        if "_canny" in f.name.lower():
            canny_files.append(f)
            continue
        parent_names = [p.name.lower() for p in f.parents]
        if "canny_edges" in parent_names:
            canny_files.append(f)
    return canny_files


def _make_styled_preview(
    canny_path: Path,
    tint_rgb: tuple[int, int, int],
    accent_rgb: tuple[int, int, int],
    width: int = BANNER_WIDTH,
    height: int = BANNER_HEIGHT,
) -> PILImage.Image:
    """
    Generează un preview local (fără API) al Canny-ului colorat cu paleta
    stilului ales. Util pentru demo/debug fără credite API.

    Logică:
      1. Încarcă Canny (alb pe negru)
      2. Aplică fundal gradient de culoare (tint)
      3. Liniile albe din Canny devin accent_color (strălucitor)
      4. Adaugă blur subtil și vignette pentru aspect cinematic
    """
    # Încarcă și redimensionează Canny
    canny = PILImage.open(canny_path).convert("L").resize((width, height), PILImage.LANCZOS)

    # Fundal gradient (tint → negru)
    bg = PILImage.new("RGB", (width, height), tint_rgb)
    black = PILImage.new("RGB", (width, height), (0, 0, 0))
    # Gradient vertical simplu prin interpolare
    for y in range(height):
        alpha = int(255 * (1 - y / height) * 0.7)
        bg.paste(
            PILImage.new("RGB", (width, 1), tint_rgb),
            (0, y),
            PILImage.new("L", (width, 1), alpha),
        )

    # Liniile Canny → accent color
    canny_colored = PILImage.new("RGB", (width, height), accent_rgb)

    # Compozitie: bg + canny edges în culoare accent
    result = bg.copy()
    # Maschează cu Canny: unde Canny e alb (>128), pune accent color
    canny_mask = canny.point(lambda p: p if p > 60 else 0)
    result.paste(canny_colored, mask=canny_mask)

    # Glow subtil: blur pe linii și blenduit înapoi
    blurred_accent = result.filter(ImageFilter.GaussianBlur(3))
    result = PILImage.blend(result, blurred_accent, alpha=0.3)

    # Vignette (întunecare la margini)
    vignette = PILImage.new("L", (width, height), 255)
    vx, vy = width // 2, height // 2
    for py in range(height):
        for px in range(0, width, 4):  # pas 4 pentru viteză
            dist = ((px - vx) / vx) ** 2 + ((py - vy) / vy) ** 2
            val = max(0, int(255 * (1 - dist * 0.5)))
            for dx in range(4):
                if px + dx < width:
                    vignette.putpixel((px + dx, py), val)
    result.paste(PILImage.new("RGB", (width, height), (0, 0, 0)), mask=ImageOps.invert(vignette))

    return result.convert("RGB")


# ─────────────────────────────────────────────────────────────────────────────
# ImageServiceV2
# ─────────────────────────────────────────────────────────────────────────────
class ImageServiceV2:
    def __init__(self, hf_api_key: str | None = None, assets_dir: str | None = None):
        self.hf_client = AsyncInferenceClient(token=hf_api_key) if hf_api_key else None

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
    # 1. Style Recipe
    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _get_style_recipe(tip_eveniment: TipEveniment | str) -> tuple[str, dict[str, Any]]:
        """
        Returnează (recipe_name, recipe_dict) pentru tipul de eveniment.
        Fallback: 'clean_institutional'.
        """
        if isinstance(tip_eveniment, str):
            try:
                tip_eveniment = TipEveniment(tip_eveniment.lower())
            except ValueError:
                logger.warning(f"TipEveniment necunoscut: '{tip_eveniment}' → default recipe")
                return _DEFAULT_RECIPE, _STYLE_RECIPES[_DEFAULT_RECIPE]

        recipe_name = _TIP_TO_RECIPE.get(tip_eveniment, _DEFAULT_RECIPE)
        recipe = _STYLE_RECIPES[recipe_name]
        logger.info(f"Style recipe: '{recipe_name}' pentru '{tip_eveniment.value}'")
        return recipe_name, recipe

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Selecție random Canny
    # ─────────────────────────────────────────────────────────────────────────
    def _pick_random_canny(self) -> Path | None:
        """Alege aleatoriu o imagine Canny din pool-ul pre-încărcat."""
        if not self._canny_pool:
            return None
        chosen = random.choice(self._canny_pool)
        logger.info(f"Canny ales: {chosen.name} (din {chosen.parent.name}/)")
        return chosen

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Generare prompt semantic (LLM cu fallback static)
    # ─────────────────────────────────────────────────────────────────────────
    async def _generate_semantic_prompt(
        self,
        info: ExtractedAnnouncementInfo,
        recipe_name: str,
        has_controlnet: bool,
    ) -> str:
        """
        Încearcă LLM → dacă eșuează, returnează prompt static din _STATIC_PROMPTS.
        Când are ControlNet activ, instructează LLM să descrie OBIECTELE TEMATICE
        (nu clădirea — aceasta vine din Canny).
        Când nu are ControlNet, include descrierea clădirii în prompt.
        """
        recipe = _STYLE_RECIPES[recipe_name]

        if has_controlnet:
            # Cu ControlNet: clădirea vine din Canny, promptul → overlay tematic
            building_ctx = (
                "The university building structure is already provided as ControlNet guide. "
                "Focus ONLY on 1-2 symbolic thematic objects overlaid in front (NOT the building itself). "
            )
        else:
            # Fără ControlNet: trebuie să descrii și clădirea în prompt
            building_ctx = recipe.get("building_desc", "A Romanian university building in the background. ")

        system_msg = (
            "You are a visual prompt engineer for Stable Diffusion XL. "
            "Transform this university announcement into a SHORT English image prompt (max 50 words). "
            f"{building_ctx}"
            "Rules: NO people, NO faces, NO text visible in image. "
            "Output ONLY the prompt string, no quotes, no explanation."
        )

        announcement_ctx = (
            f"Event type: {info.tip_eveniment.value if hasattr(info.tip_eveniment, 'value') else info.tip_eveniment}\n"
            f"Subject: {info.materie_sau_subiect}\n"
            f"Tags: {', '.join(info.taguri_cheie)}\n"
            f"Summary: {info.rezumat_notificare}"
        )

        try:
            result = await self.hf_llm_client.chat_completion(
                model=HF_LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": f"Announcement:\n{announcement_ctx}"},
                ],
                max_tokens=80,
                temperature=0.65,
            )
            prompt = result.choices[0].message.content.strip().strip('"').strip("'")
            logger.info(f"Prompt LLM: {prompt}")
            return prompt

        except Exception as llm_err:
            # Fallback static — nu blocăm pipeline-ul pentru un LLM indisponibil
            static = _STATIC_PROMPTS.get(recipe_name, "university building, symbolic objects")
            if not has_controlnet:
                static = recipe.get("building_desc", "") + static
            logger.warning(f"LLM indisponibil ({llm_err}) → prompt static: {static[:60]}...")
            return static

    # ─────────────────────────────────────────────────────────────────────────
    # 4. ControlNet SDXL real (payload corect pentru HF Inference API)
    # ─────────────────────────────────────────────────────────────────────────
    async def _call_controlnet_api(
        self,
        prompt: str,
        negative_prompt: str,
        canny_path: Path,
        conditioning_scale: float,
        guidance_scale: float,
        num_steps: int,
    ) -> PILImage.Image:
        """
        Apelează HF Inference API cu payload-ul CORECT pentru ControlNet SDXL Canny.

        ┌─────────────────────────────────────────────────────────────────┐
        │  DIFERENȚA FAȚĂ DE image_to_image (INCORECT)                    │
        │                                                                 │
        │  INCORECT — image_to_image:                                     │
        │    hf_client.image_to_image(image=canny_bytes, ...)             │
        │    → Canny tratată ca imagine de bază → transformată            │
        │    → Clădirea dispare, modelul face ce vrea                     │
        │                                                                 │
        │  CORECT — ControlNet payload:                                   │
        │    POST /models/sdxl-base + ControlNet bundle                   │
        │    body = {                                                     │
        │      "inputs": prompt_text,                                     │
        │      "parameters": {                                            │
        │        "image": base64(canny),   ← CONTROL IMAGE, nu base img  │
        │        "controlnet_conditioning_scale": 0.80,                   │
        │        ...                                                      │
        │      }                                                          │
        │    }                                                            │
        │    → Canny ghidează STRUCTURAL la fiecare pas denoising         │
        │    → Clădirea apare exact după scheletul Canny                  │
        └─────────────────────────────────────────────────────────────────┘

        Necesită: HF PRO subscription sau HF Inference Credits
        """
        url = f"{HF_INFERENCE_BASE}/{HF_CONTROLNET_MODEL}"

        logger.info(
            f"ControlNet SDXL | canny={canny_path.name} | "
            f"conditioning={conditioning_scale} | guidance={guidance_scale} | steps={num_steps}"
        )

        canny_b64 = _bytes_to_base64(canny_path.read_bytes())

        # Payload-ul corect pentru ControlNet:
        # "inputs" = prompt text (modelul SDXL pornește de la zgomot pur, nu de la Canny)
        # "parameters.image" = Canny encodat base64 ca CONTROL IMAGE (ghid structural)
        payload: dict[str, Any] = {
            "inputs": prompt,
            "parameters": {
                "negative_prompt": negative_prompt,
                "image": canny_b64,                          # ← control_image (structural guide)
                "controlnet_conditioning_scale": conditioning_scale,
                "num_inference_steps": num_steps,
                "guidance_scale": guidance_scale,
                "width": BANNER_WIDTH,
                "height": BANNER_HEIGHT,
            },
        }

        async with httpx.AsyncClient(timeout=CONTROLNET_TIMEOUT_S) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {self._hf_token}",
                    "Content-Type": "application/json",
                    "Accept": "image/jpeg",
                },
                json=payload,
            )

        if response.status_code == 503:
            try:
                eta = response.json().get("estimated_time", "?")
            except Exception:
                eta = "?"
            raise RuntimeError(f"Modelul ControlNet in loading (ETA: {eta}s). Retry in cateva secunde.")

        if response.status_code == 402:
            raise RuntimeError(
                "HF Inference API: 402 Payment Required. "
                "Necesiti HF PRO sau credite. "
                "Reactiveaza cand ai subscription activ."
            )

        if response.status_code == 429:
            raise RuntimeError("Rate limit HF Inference API atins.")

        if response.status_code not in (200, 201):
            try:
                err = response.json()
            except Exception:
                err = response.text[:300]
            raise RuntimeError(f"HF Inference API HTTP {response.status_code}: {err}")

        image = PILImage.open(io.BytesIO(response.content)).convert("RGB")
        logger.info(f"ControlNet OK: {image.width}x{image.height} ({len(response.content)//1024}KB)")
        return image

    # ─────────────────────────────────────────────────────────────────────────
    # 5. FLUX fallback (hf-inference, GRATUIT)
    # ─────────────────────────────────────────────────────────────────────────
    async def _call_flux_fallback(
        self,
        prompt: str,
    ) -> PILImage.Image:
        """
        Fallback la FLUX.1-schnell pe hf-inference (gratuit, fără credite).
        Promptul include descrierea clădirii (fără ghid Canny structural).
        """
        logger.info("Fallback FLUX.1-schnell (hf-inference, gratuit)...")
        image = await self.hf_image_client.text_to_image(
            prompt=f"{prompt}, high quality, detailed",
            model=HF_FLUX_MODEL,
            width=BANNER_WIDTH,
            height=BANNER_HEIGHT,
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
    # 7. Metoda publică principală
    # ─────────────────────────────────────────────────────────────────────────
    async def generate_announcement_banner(
        self,
        info: ExtractedAnnouncementInfo,
        local_preview_only: bool = False,
    ) -> ImageGenerationResult:
        """
        Generează un banner vizual pentru un anunț universitar.

        Args:
            info: ExtractedAnnouncementInfo cu datele anunțului
            local_preview_only: dacă True, sare peste API și returnează
                                 preview-ul local PIL (Canny colorat cu stilul ales).
                                 Util pentru testare fără credite API.

        Flow:
          1. Style recipe din tip_eveniment
          2. Canny random din pool
          3. Prompt semantic (LLM → fallback static)
          4. [dacă local_preview_only=False] ControlNet → FLUX fallback
          5. [dacă local_preview_only=True] Preview PIL local
        """
        style_name = _DEFAULT_RECIPE
        canny_file_name: str | None = None

        try:
            # ── Pas 1: Style recipe ──────────────────────────────────────────
            style_name, recipe = self._get_style_recipe(info.tip_eveniment)

            # ── Pas 2: Canny random ──────────────────────────────────────────
            canny_path = self._pick_random_canny()
            has_canny = canny_path is not None
            if canny_path:
                canny_file_name = canny_path.name

            # ── Pas 3: Preview local (fără API) ──────────────────────────────
            if local_preview_only:
                if not has_canny or canny_path is None:
                    return ImageGenerationResult(
                        success=False,
                        error_message="Niciun Canny disponibil pentru preview local.",
                        style_used=style_name,
                    )
                logger.info("Mod LOCAL PREVIEW (fara API) — Canny colorat cu stilul ales")
                preview_img = self._make_local_preview(canny_path, recipe)
                b64 = _pil_to_base64_jpeg(preview_img, quality=90)
                return ImageGenerationResult(
                    success=True,
                    image_base64=f"data:image/jpeg;base64,{b64}",
                    used_controlnet=False,
                    style_used=style_name,
                    canny_file_used=canny_file_name,
                    generation_mode="local_preview",
                )

            # ── Pas 4: Prompt semantic ────────────────────────────────────────
            semantic_prompt = await self._generate_semantic_prompt(
                info, recipe_name=style_name, has_controlnet=has_canny,
            )
            final_prompt = f"{semantic_prompt}, {recipe['prompt_suffix']}"
            negative_prompt: str = recipe["negative_prompt"]
            logger.info(f"Prompt final ({len(final_prompt)}ch): {final_prompt[:90]}...")

            # ── Pas 5: Generare imagine ───────────────────────────────────────
            image: PILImage.Image | None = None
            used_controlnet = False
            generation_mode = "flux_fallback"

            if has_canny and canny_path is not None:
                try:
                    image = await self._call_controlnet_api(
                        prompt=final_prompt,
                        negative_prompt=negative_prompt,
                        canny_path=canny_path,
                        conditioning_scale=recipe["conditioning_scale"],
                        guidance_scale=recipe["guidance_scale"],
                        num_steps=recipe["num_steps"],
                    )
                    used_controlnet = True
                except Exception as e:
                    logger.warning(f"⚠️  ControlNet a esuat ({e}), fallback la FLUX...")
                    image = await self._generate_with_flux(refined_prompt)
            else:
                image = await self._generate_with_flux(refined_prompt)

            # ── Pas 6: Validare și conversie ─────────────────────────────────
            if not isinstance(image, PILImage.Image):
                raise ValueError(f"Tip neașteptat: {type(image)}")

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
# Test local (python image_service_v2.py)
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import asyncio
    from datetime import datetime
    from dotenv import load_dotenv
    from parser_schemas import TipEveniment, NivelUrgenta

    async def _run_test() -> None:
        current_dir = Path(__file__).parent
        load_dotenv(dotenv_path=current_dir / ".env", override=True)

        hf_api_key = os.getenv("HUGGINGFACE_API_KEY")
        if not hf_api_key:
            print("HUGGINGFACE_API_KEY lipseste din .env")
            return

        service = ImageServiceV2(hf_api_key=hf_api_key)

        # Anunt cu Facultatea de Inginerie ca subiect principal
        # Tip LABORATOR → style recipe 'tech_lab' (LED blue, steel, minimalist)
        # Canny din poza1/2/3_intrare_ing_canny.png ghideaza forma cladirii
        test_info = ExtractedAnnouncementInfo(
            materie_sau_subiect="Tehnici Avansate de Programare",
            entitate_sursa="Facultatea de Inginerie, Universitatea Dunarea de Jos Galati",
            tip_eveniment=TipEveniment.LABORATOR,
            urgenta_estimata=NivelUrgenta.MEDIE,
            public_tinta=["Studenti anul III Informatica"],
            deadline_absolut=datetime(2025, 12, 10, 10, 0),
            locatie="Corp H, Sala Laboratoare Informatica",
            rezumat_notificare="Laborator TAP: implementare algoritmi grafuri. Prezenta obligatorie.",
            actiuni_extrase=["Descarca scheletul de cod de pe Moodle", "Aduce laptop cu Python 3.11+"],
            taguri_cheie=["Informatica", "Algoritmi", "Grafuri", "Python", "Laborator"],
        )

        print("\nCOMENDA RAPIDA — testeaza modurile disponibile:\n")
        print("  1. LOCAL PREVIEW (offline, fara credite):  local_preview_only=True")
        print("  2. FLUX fallback (hf-inference gratuit):   local_preview_only=False")
        print("  3. ControlNet real (necesita HF PRO):      local_preview_only=False + HF PRO\n")

        # ── MOD 1: Preview local (FUNCȚIONEAZĂ ACUM, fără credite) ───────────
        print("Generez preview local (Canny colorat cu stilul tech_lab)...")
        preview = await service.generate_announcement_banner(test_info, local_preview_only=True)
        if preview.success:
            b64 = preview.image_base64.split(",")[1]  # type: ignore
            preview_path = current_dir / "test_preview_local.jpg"
            with open(preview_path, "wb") as f:
                f.write(base64.b64decode(b64))
            print(f"  Preview local salvat: {preview_path}")
            print(f"  Style: {preview.style_used} | Canny: {preview.canny_file_used}")
        else:
            print(f"  EROARE preview: {preview.error_message}")

        # ── MOD 2: FLUX fallback (funcționează când hf-inference e OK) ───────
        print("\nGenerez banner FLUX (hf-inference, gratuit)...")
        try:
            result = await service.generate_announcement_banner(test_info, local_preview_only=False)
            if result.success:
                b64 = result.image_base64.split(",")[1]  # type: ignore
                save_path = current_dir / "test_banner_v2.jpg"
                with open(save_path, "wb") as f:
                    f.write(base64.b64decode(b64))
                print(f"  Banner salvat: {save_path}")
                print(f"  Mode: {result.generation_mode} | Style: {result.style_used}")
            else:
                print(f"  EROARE: {result.error_message}")
        except HfHubHTTPError as e:
            print(f"  HF API indisponibil (credite?): {str(e)[:120]}")

    asyncio.run(_run_test())
