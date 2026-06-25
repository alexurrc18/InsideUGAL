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

import httpx
from pydantic import BaseModel
from PIL import Image as PILImage

from parser_schemas import ExtractedAnnouncementInfo
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-generator-v2")


# ─────────────────────────────────────────────────────────────────────────────
# Mapare facultate/sursa → fisier banner pre-generat (placeholder 16:9)
# ─────────────────────────────────────────────────────────────────────────────
FACULTY_ASSET_MAP: dict[str, str] = {
    "aciee":                        "banner_aciee.jpg",
    "automatica":                   "banner_aciee.jpg",
    "calculatoare":                 "banner_aciee.jpg",
    "electric":                     "banner_aciee.jpg",
    "electronic":                   "banner_aciee.jpg",
    "arhitectura navala":           "banner_arhi_navala.jpg",
    "nave":                         "banner_arhi_navala.jpg",
    "educatie fizica":              "banner_educatie_fizica_sport.jpg",
    "sport":                        "banner_educatie_fizica_sport.jpg",
    "feaa":                         "banner_feaa.jpg",
    "economi":                      "banner_feaa.jpg",
    "afaceri":                      "banner_feaa.jpg",
    "inginerie":                    "banner_inginerie.jpg",
    "medicina":                     "banner_medicina.jpg",
    "farmaci":                      "banner_medicina.jpg",
    "sia":                          "banner_sia.jpg",
    "alimente":                     "banner_sia.jpg",
    "alimentar":                    "banner_sia.jpg",
    "universitate":                 "banner_universitate.jpg",
    "rectorat":                     "banner_universitate.jpg",
    "dunarea de jos":               "banner_universitate.jpg",
    "ugal":                         "banner_universitate.jpg",
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
        # ── HF API key ──────────────────────────────────────────────────────
        # Folosim httpx direct (deja in requirements) in loc de AsyncInferenceClient
        # pentru a evita dependinta de aiohttp care cauzeaza erori in Docker.
        self.hf_api_key = hf_api_key or os.getenv("HUGGINGFACE_API_KEY")

        # ── Modele ───────────────────────────────────────────────────────────
        self.hf_text_model_id = "meta-llama/Llama-3.3-70B-Instruct"
        self.flux_model_id    = "black-forest-labs/FLUX.1-schnell"

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
        self.assets_dir.mkdir(parents=True, exist_ok=True)  # creeaza daca nu exista
        # Folder separat pentru bannere generate (nu amestecam cu cele pre-fabricate)
        self.generated_dir = Path(__file__).parent / "assets" / "generated"
        self.generated_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Assets dir: {self.assets_dir}")

    # ─────────────────────────────────────────────────────────────────────────
    # Generator de prompt vizual optimizat pentru Grok Imagine
    # ─────────────────────────────────────────────────────────────────────────
    def _build_base_prompt(self, info: ExtractedAnnouncementInfo, has_building_ref: bool) -> str:
        """
        Construieste un prompt concret, specific si detaliat direct din contextul
        anuntului, fara a depinde de un LLM text intermediar.
        Optimizat specific pentru Grok Imagine (obiecte concrete > descriptori abstracti).
        """
        tip_val = info.tip_eveniment.value if hasattr(info.tip_eveniment, "value") else str(info.tip_eveniment)
        tags_lower = [t.lower() for t in info.taguri_cheie]
        subject_lower = info.materie_sau_subiect.lower()

        # ── Detectare tematici cheie din taguri + subiect + rezumat ──────────
        rezumat_lower = (info.rezumat_notificare or "").lower()
        combined = " ".join(tags_lower + [subject_lower, rezumat_lower])

        is_tech = any(k in combined for k in [
            "it", "tech", "programming", "programare", "software", "hardware",
            "calculator", "cod", "code", "hackathon", "web", "ai", "database",
            "retea", "cybersecurity", "informatica", "electronica", "robotica"])
        is_ai = any(k in combined for k in [
            "ai", "inteligenta artificiala", "intelligence", "machine learning",
            "neural", "deep learning", "ml"])
        is_sport = any(k in combined for k in [
            "sport", "fotbal", "baschet", "volei", "tenis", "atletism", "natatie",
            "handbal", "rugby", "box", "karate", "judo", "fitness", "gym", "competitie sportiva"])
        is_transport = any(k in combined for k in [
            "transport", "decontare", "bilet", "tren", "autobuz", "metrou",
            "naveta", "calatorie", "tramvai", "microbus"])
        is_conference = any(k in combined for k in [
            "conferinta", "simpozion", "seminar", "workshop", "webinar",
            "prezentare", "congress", "forum"])
        is_master = any(k in combined for k in [
            "master", "masterat", "postuniversitar", "studii avansate"])
        is_phd = any(k in combined for k in [
            "doctorat", "phd", "cercetare", "teza", "teză", "stiinta"])
        is_lab = tip_val in ("laborator", "proiect")
        is_opportunity = tip_val == "oportunitate" or any(k in combined for k in [
            "oportunitate", "opportunity", "grant", "finantare europeana", "erasmus",
            "mobilitate", "schimb", "international"])
        is_general = tip_val in ("anunt_general", "administrativ")
        is_contest = tip_val in ("concurs",) or any(k in combined for k in [
            "hackathon", "concurs", "competition", "olimpiada", "campionat"])
        is_scholarship = tip_val == "bursa" or any(k in combined for k in [
            "bursa", "scholarship", "grant academic", "finantare studii", "ajutor social"])
        # Sub-tipuri de bursa (detectate din combined care include si rezumatul)
        is_eu_funded = any(k in combined for k in [
            "european", "fond social", "fonduri europene", "smis", "cofinantat",
            "uniunea europeana", "programul educatie", "erasmus+", "ue ", "eu ",
            "program operational", "uefiscdi"])
        is_social_scholarship = any(k in combined for k in [
            "social", "dezavantaj", "medii dezavantajate", "grupuri vulnerabile",
            "abandon", "venit redus", "suport social"])
        is_merit_scholarship = any(k in combined for k in [
            "merit", "performanta", "performanță", "rezultate", "olimpiada",
            "excelen", "top ", "premiu academic"])
        is_internship = tip_val == "internship" or any(k in combined for k in [
            "internship", "practica", "stagiu", "job", "angajare", "cariera"])
        is_volunteer = tip_val == "voluntariat"
        is_housing = tip_val == "cazare"
        is_exam = tip_val in ("examen", "partial", "colocviu")
        is_admission = tip_val == "admitere"

        # ── Selectie obiecte vizuale si stil ─────────────────────────────────
        if is_contest and is_tech:
            focal_objects = (
                "a gleaming silver and gold competition trophy standing tall in the center, "
                "a sleek open ultrabook laptop with a vivid colorful code editor on screen, "
                "floating holographic 3D circuit board fragments and glowing microchips"
            )
            if is_ai:
                focal_objects += ", glowing neural network node connections spreading outward"
            color_scheme = "deep midnight navy to electric cyan gradient, vivid purple accent lighting"
            style = (
                "premium esports / tech competition aesthetic, "
                "dramatic cinematic rim lighting, 3D glassmorphism floating panels, "
                "subtle particle effects and light streaks, vibrant yet sophisticated"
            )
        elif is_contest and is_sport:
            focal_objects = (
                "a large gleaming gold sports trophy in the center, "
                "dynamic abstract motion-blur athletic shapes, "
                "floating medal and star elements"
            )
            color_scheme = "vibrant orange to deep red gradient, golden accent highlights"
            style = "premium sports competition aesthetic, energetic dynamic lighting, bold composition"
        elif is_contest:
            focal_objects = (
                "a gleaming metallic trophy as the centerpiece, "
                "elegant podium steps (1st, 2nd, 3rd), floating gold stars and confetti"
            )
            color_scheme = "deep purple to electric blue gradient, golden accent highlights"
            style = "premium competition aesthetic, dramatic spotlight lighting, glassmorphism"
        elif is_scholarship:
            if is_eu_funded:
                # Bursa finantata din fonduri UE (Fond Social European, SMIS, Erasmus+ etc.)
                focal_objects = (
                    "a large, prominent ceramic piggy bank as the central hero element, "
                    "with a small EU flag (deep blue rectangle with a circle of twelve golden stars) "
                    "painted elegantly on its side, "
                    "softly floating golden coins surrounding it, "
                    "a subtle glowing upward arrow suggesting social mobility"
                )
                color_scheme = "deep EU institutional blue (#003399) to warm gold gradient, European palette"
                style = (
                    "premium European social program aesthetic, "
                    "clean institutional design with a warm hopeful tone, "
                    "soft diffused lighting, polished ceramic surface on piggy bank"
                )
            elif is_social_scholarship:
                # Bursa sociala fara branding UE explicit
                focal_objects = (
                    "a large friendly ceramic piggy bank as the clear central element, "
                    "surrounded by gently floating golden coins and warm glowing heart icons, "
                    "a subtle rising pathway of warm light beneath it suggesting opportunity"
                )
                color_scheme = "warm amber to soft teal gradient, supportive hopeful palette"
                style = (
                    "modern social support / student welfare aesthetic, "
                    "warm empathetic lighting, clean and uplifting design"
                )
            elif is_merit_scholarship:
                # Bursa de merit / performanta
                focal_objects = (
                    "a gleaming open diploma scroll tied with a golden ribbon in the center, "
                    "elegant laurel wreath branches framing it, "
                    "floating gold star medals and shining coins"
                )
                color_scheme = "deep royal navy to rich warm gold gradient, prestige academic palette"
                style = (
                    "premium academic excellence aesthetic, "
                    "classical meets modern design, regal polished surfaces, soft spotlight"
                )
            else:
                # Bursa generica (tip neclar)
                focal_objects = (
                    "a large ceramic piggy bank as the central element, "
                    "elegant floating golden coins around it, "
                    "a subtle glowing document with a golden seal in the background"
                )
                color_scheme = "deep navy to warm gold gradient, sophisticated financial palette"
                style = "premium academic finance aesthetic, polished surfaces, soft ambient light"
        elif is_transport:
            focal_objects = (
                "a sleek modern train or bus stylized silhouette, "
                "floating ticket stubs with holographic shimmer, "
                "abstract road or rail track lines fading into the horizon"
            )
            color_scheme = "deep royal blue to vibrant teal gradient, motion-blur accent streaks"
            style = "modern transport / mobility aesthetic, clean dynamic design, speed lines"
        elif is_internship:
            focal_objects = (
                "a sleek modern office desk setup with dual monitors displaying dashboards, "
                "a professional briefcase, floating geometric career-ladder icon"
            )
            color_scheme = "clean navy to warm amber gradient"
            style = "premium corporate professional aesthetic, minimal clean design, soft office lighting"
        elif is_conference:
            focal_objects = (
                "an elegant speaker podium with a glowing microphone, "
                "abstract audience silhouettes as geometric shapes (no faces), "
                "floating speech-bubble and lightbulb icons"
            )
            color_scheme = "deep charcoal to rich teal gradient, warm stage spotlight accent"
            style = "premium academic / corporate conference aesthetic, dramatic stage lighting"
        elif is_volunteer:
            focal_objects = (
                "interconnected glowing stylized hand-shapes forming a circle "
                "(abstract, no wrists or bodies), "
                "floating heart icons and star elements, warm community glow"
            )
            color_scheme = "warm coral to teal gradient, uplifting vibrant palette"
            style = "modern community / social impact aesthetic, warm hopeful lighting"
        elif is_housing:
            focal_objects = (
                "a cozy modern apartment building facade (stylized architectural), "
                "a warm glowing window at night, floating key icon"
            )
            color_scheme = "warm amber and deep blue night-sky gradient"
            style = "modern residential premium aesthetic, warm cozy lighting"
        elif is_exam:
            focal_objects = (
                "an elegant open hardcover book with softly glowing pages, "
                "a sleek digital countdown timer / clock, "
                "floating geometric knowledge symbols"
            )
            color_scheme = "deep royal blue to silver gradient, calm focused palette"
            style = "premium academic aesthetic, clean minimal design, soft focused lighting"
        elif is_admission or is_master:
            focal_objects = (
                "a grand stylized university gateway arch with golden trim, "
                "a floating diploma scroll tied with a ribbon, "
                "a glowing pathway of light leading through the gate"
            )
            color_scheme = "golden sunrise gradient on deep blue sky"
            style = "inspiring premium academic aesthetic, aspirational cinematic lighting"
        elif is_phd:
            focal_objects = (
                "floating scientific formula symbols and molecular structures, "
                "an elegant open research journal, "
                "abstract glowing data visualization spheres"
            )
            color_scheme = "deep space blue to vibrant violet gradient"
            style = "premium scientific / research aesthetic, cosmic depth, clean precision"
        elif is_lab or is_tech:
            focal_objects = (
                "a sleek laptop with code on screen, "
                "floating 3D gear and tool icons, "
                "abstract circuit-board pattern in the background"
            )
            color_scheme = "dark slate to electric green-blue gradient"
            style = "modern tech lab aesthetic, clean precision, subtle glow effects"
        elif is_opportunity:
            focal_objects = (
                "a bright glowing open doorway in the center, "
                "abstract ascending arrow and star elements, "
                "Erasmus-style subtle map-globe silhouette"
            )
            color_scheme = "warm gold sunrise to deep blue sky gradient"
            style = "premium aspirational aesthetic, hopeful cinematic lighting"
        elif is_general or is_sport:
            if is_sport:
                focal_objects = (
                    "dynamic abstract athletic motion shapes, "
                    "a stylized sports field overhead view, "
                    "floating trophy and medal icons"
                )
                color_scheme = "vibrant orange-red to deep navy gradient"
                style = "bold energetic sports aesthetic, dynamic diagonal composition"
            else:
                focal_objects = (
                    "a stylized university crest emblem, "
                    "floating geometric shapes: squares, circles, triangles in harmony, "
                    "abstract light rays spreading outward"
                )
                color_scheme = "deep navy to vibrant teal gradient"
                style = "premium modern academic aesthetic, professional clean design"
        else:
            # Ultimate fallback — still themed, not fully abstract
            focal_objects = (
                "floating elegant geometric shapes — hexagons, circles, triangles — "
                "in a harmonious arrangement suggesting knowledge and growth, "
                "a subtle glowing orb centerpiece"
            )
            color_scheme = "deep navy to electric indigo gradient"
            style = "premium modern university aesthetic, professional clean design, soft ambient glow"


        # ── Instructiune compozitie si negativi ───────────────────────────────
        building_note = (
            "The background should be abstract/atmospheric with NO buildings drawn, "
            "as a real building photo will be overlaid. "
        ) if has_building_ref else ""

        prompt = (
            f"Ultra-premium wide 16:9 panoramic banner image. "
            f"Main visual elements: {focal_objects}. "
            f"Color scheme: {color_scheme}. "
            f"Art style: {style}. "
            f"{building_note}"
            f"Composition: all main elements centered horizontally, "
            f"generous atmospheric empty space at top and bottom for text overlay. "
            f"NO text, NO words, NO letters, NO numbers anywhere in the image. "
            f"NO human faces, NO human bodies, NO hands. "
            f"Hyperdetailed, professional digital art, 8K quality rendering."
        )
        return prompt

    async def _generate_prompt(self, info: ExtractedAnnouncementInfo, has_building_ref: bool) -> str:
        """
        Genereaza promptul vizual final pentru Grok:
        1. Construieste un prompt template concret (sigur, consistent)
        2. Incearca sa il imbunatateasca cu GPT-4o-mini via OpenRouter (optional)
        3. Returneaza template-ul direct daca LLM-ul nu e disponibil
        """
        base_prompt = self._build_base_prompt(info, has_building_ref)
        logger.info(f"Prompt template construit: {base_prompt[:100]}...")

        # ── Enhancing optional cu GPT-4o-mini (adauga nuante specifice) ──────
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key:
            try:
                import requests as req
                tip_val = info.tip_eveniment.value if hasattr(info.tip_eveniment, "value") else str(info.tip_eveniment)
                enhance_system = (
                    "You are a Grok Imagine prompt specialist. "
                    "You will receive a base image prompt for a university event banner. "
                    "Your task: REFINE and ENHANCE it by adding 1-2 highly specific visual details "
                    "that match the actual event subject. Keep ALL existing elements. "
                    "Do NOT add text, faces, or make it abstract. Keep it concrete and visual. "
                    "Output ONLY the enhanced prompt, max 200 words."
                )
                enhance_user = (
                    f"Event: {info.materie_sau_subiect} (type: {tip_val})\n"
                    f"Tags: {', '.join(info.taguri_cheie)}\n"
                    f"Summary: {info.rezumat_notificare}\n\n"
                    f"Base prompt to enhance:\n{base_prompt}"
                )
                r = req.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openrouter_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "openai/gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": enhance_system},
                            {"role": "user", "content": enhance_user}
                        ],
                        "max_tokens": 250,
                        "temperature": 0.6,
                    },
                    timeout=15,
                )
                r.raise_for_status()
                enhanced = r.json()["choices"][0]["message"]["content"].strip()
                # Validare minima: promptul trebuie sa fie mai lung de 50 chars si sa nu fie gol
                if len(enhanced) > 50:
                    logger.info(f"Prompt enhanced via GPT-4o-mini: {enhanced[:100]}...")
                    return enhanced
            except Exception as e:
                logger.warning(f"GPT-4o-mini enhance a esuat ({e}). Folosim template direct.")

        return base_prompt



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
                
            # Daca e direct base64 string
            if "base64," in content:
                b64_data = content.split("base64,")[1]
            else:
                b64_data = content
                
            # Curățăm caracterele de la final (ex. paranteza de markdown ')')
            # NOTA: re este importat la nivel de modul, NU reimportam local (cauzeaza UnboundLocalError)
            b64_data = re.sub(r'[^a-zA-Z0-9+/=]', '', b64_data)
                
            try:
                image_data = base64.b64decode(b64_data)
                return PILImage.open(io.BytesIO(image_data)).convert("RGBA")
            except Exception as e:
                logger.warning(f"Eroare procesare base64: {e}")
                
            logger.warning("Nu am gasit URL sau Base64 in raspunsul OpenRouter pentru imagine.")
            return None
        except Exception as e:
            logger.warning(f"OpenRouter image generation a esuat: {e}")
            return None

    async def _generate_with_flux(self, prompt: str) -> PILImage.Image:
        """Fallback: genereaza imagine cu FLUX.1-schnell via HuggingFace Inference API.
        Folosim requests (sync) via asyncio.to_thread pentru a evita bug-ul anyio/httpx
        cu DNS-ul pe Windows / Python 3.14.
        """
        if not self.hf_api_key:
            raise ValueError("HUGGINGFACE_API_KEY lipseste — fallback FLUX dezactivat.")
        logger.info("Generare FLUX.1-schnell (fara referinta vizuala) via requests...")
        safe_prompt = prompt + " DO NOT generate any text, words, or letters in the image."
        hf_key = self.hf_api_key
        flux_model = self.flux_model_id

        def _flux_sync() -> bytes:
            import requests as req
            r = req.post(
                f"https://api-inference.huggingface.co/models/{flux_model}",
                headers={
                    "Authorization": f"Bearer {hf_key}",
                    "Content-Type": "application/json",
                },
                json={"inputs": safe_prompt, "parameters": {"width": 1024, "height": 576}},
                timeout=120,
            )
            r.raise_for_status()
            return r.content

        import asyncio
        raw_bytes = await asyncio.to_thread(_flux_sync)
        return PILImage.open(io.BytesIO(raw_bytes)).convert("RGBA")

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
            url = self.supabase.storage.from_("images").get_public_url(file_name)
            if "supabase-kong:8000" in url:
                url = url.replace("supabase-kong:8000", "localhost:8004")
            return url
        except Exception as e:
            logger.error(f"Eroare upload Supabase: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # Metodă publică principală
    # ─────────────────────────────────────────────────────────────────────────
    def _resolve_premade_banner(self, info: ExtractedAnnouncementInfo) -> Path | None:
        """
        Rezolva bannerul pre-facut din assets dupa urmatoarea logica:
        1. Daca sursa (entitate_sursa) contine un keyword de facultate → banner_[facultate].jpg
        2. Daca e cazare → banner_camin.jpg
        3. Daca e administrativ sau anunt_general FARA facultate identificata → banner_universitate.jpg
        4. Daca e administrativ sau anunt_general CU facultate → banner_[facultate].jpg (din FACULTY_ASSET_MAP)
        5. Altfel → None (se genereaza AI)
        """
        tip = str(getattr(info, 'tip_eveniment', '') or '').lower()
        source = (info.entitate_sursa or "").lower()
        is_admin_type = tip in ("administrativ", "anunt_general")

        # 1. Incercam sa gasim bannerul de facultate din sursa
        matched_filename = None
        for keyword, filename in FACULTY_ASSET_MAP.items():
            if keyword in source:
                matched_filename = filename
                break

        if matched_filename:
            # Facultate identificata — folosim bannerul ei
            file_path = self.assets_dir / matched_filename
            return file_path if file_path.exists() else None

        # 2. Cazare → banner dedicat
        if tip == "cazare":
            file_path = self.assets_dir / "banner_camin.jpg"
            return file_path if file_path.exists() else None

        # 3. Administrativ / anunt_general fara facultate specifica → banner universitate
        if is_admin_type:
            file_path = self.assets_dir / "banner_universitate.jpg"
            return file_path if file_path.exists() else None

        # 4. Altfel: nici un banner pre-facut potrivit → se va genera AI
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
            # Tipuri care cer generare AI tematica (nu placeholder din assets)
            # anunt_general si administrativ sunt EXCLUSE intentionat — merg la _resolve_premade_banner
            thematic_types = [
                'concurs', 'hackathon', 'party', 'bursa', 'internship',
                'voluntariat', 'oportunitate', 'admitere', 'examen',
                'partial', 'colocviu', 'proiect', 'laborator'
            ]
            is_thematic = (
                any(t in str(info.tip_eveniment).lower() for t in thematic_types)
                or any(t in str(info.materie_sau_subiect).lower() for t in thematic_types)
            )
            
            if not is_thematic:
                premade_banner = self._resolve_premade_banner(info)
                if premade_banner:
                    logger.info(f"Folosim bannerul predefinit perfect pentru {info.entitate_sursa}: {premade_banner.name}")
                    image = PILImage.open(premade_banner).convert("RGB")
                    image_bytes = self._pil_to_bytes(image)
                    public_url  = self._upload_to_storage(image_bytes)
                    
                    base64_fallback = None
                    if not public_url:
                        base64_fallback = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode("utf-8")
                        
                    return ImageGenerationResult(
                        success=True,
                        image_url=public_url,
                        image_base64=base64_fallback,
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
            
            base64_fallback = None
            if not public_url:
                base64_fallback = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode("utf-8")
            
            # Salvare locala optionala (nu blocheaza raspunsul daca da eroare)
            try:
                local_save_path = self.generated_dir / f"generated_banner_{uuid.uuid4().hex[:8]}.jpg"
                image.convert("RGB").save(local_save_path, "JPEG")
            except Exception as save_err:
                logger.warning(f"Salvare locala esuata (ignorata): {save_err}")

            return ImageGenerationResult(
                success=True,
                image_url=public_url,
                image_base64=base64_fallback,
                error_message=None,
                used_image_to_image=used_image_to_image,
                used_flux_fallback=used_flux_fallback
            )
        except Exception as e:
            logger.error(f"Eroare FATALA la generare banner: {e}", exc_info=True)
            return ImageGenerationResult(success=False, image_url=None, error_message=str(e))
