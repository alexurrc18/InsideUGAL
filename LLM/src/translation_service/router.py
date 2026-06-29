from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel, Field
from supabase import Client, create_client
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger("translation-service")

GEMINI_MODEL = os.getenv("TRANSLATION_GEMINI_MODEL", "gemini-2.5-flash-lite")


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=15000)
    target_language: str = Field(..., min_length=2, max_length=10)


class TranslateResponse(BaseModel):
    source_text: str
    target_language: str
    translated_text: str
    cached: bool
    provider: str


class BatchTranslateRequest(BaseModel):
    translations: Any = Field(..., description="JSON object or array with Romanian text values.")
    target_language: str = Field(..., min_length=2, max_length=10)


class BatchTranslateResponse(BaseModel):
    target_language: str
    translations: Any
    cached_items: int
    translated_items: int
    provider: str


class AnnouncementTranslateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=1000)
    content: str = Field(..., min_length=1, max_length=15000)
    target_language: str = Field(..., min_length=2, max_length=10)


class AnnouncementTranslateResponse(BaseModel):
    translated_title: str
    translated_content: str


class TranslationService:
    def __init__(self) -> None:
        raw_key = os.getenv("GEMINI_API_KEY", "").strip().strip("'").strip('"')
        if not raw_key:
            raise ValueError("GEMINI_API_KEY este necesar pentru TranslationService.")

        self.client = genai.Client(api_key=raw_key)
        self.provider = f"gemini:{GEMINI_MODEL}"
        self.supabase = self._create_supabase_client()

    def _create_supabase_client(self) -> Client | None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_KEY")
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
        )

        if not supabase_url or not supabase_key:
            logger.warning("Supabase credentials missing. Translation cache disabled.")
            return None

        return create_client(supabase_url, supabase_key)

    def get_cached_translation(self, text: str, target_language: str) -> str | None:
        if not self.supabase:
            return None

        try:
            response = (
                self.supabase.table("translations")
                .select("translated_text")
                .eq("source_text", text)
                .eq("target_language", target_language)
                .limit(1)
                .execute()
            )
            if response.data:
                return response.data[0]["translated_text"]
        except Exception as exc:
            logger.warning("Translation cache read failed: %s", exc)

        return None

    def save_translation(self, text: str, target_language: str, translated_text: str) -> None:
        if not self.supabase:
            return

        try:
            self.supabase.table("translations").upsert(
                {
                    "source_text": text,
                    "target_language": target_language,
                    "translated_text": translated_text,
                },
                on_conflict="source_text,target_language",
            ).execute()
        except Exception as exc:
            logger.warning("Translation cache write failed: %s", exc)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ValueError, Exception)),
        reraise=True,
    )
    def translate_text_uncached(self, text: str, target_language: str) -> str:
        prompt = (
            f"Translate the following Romanian university administrative text to {target_language}.\n"
            "Rules:\n"
            "- Maintain an official, formal, academic tone throughout.\n"
            "- Use precise university/higher-education terminology:\n"
            "  * 'student' → university student equivalent (NOT pupil/schoolboy)\n"
            "  * 'carnet de student' / 'carnet student' → 'student ID card' or 'student card' (NOT 'student pass' or 'student booklet')\n"
            "  * 'legitimatie de transport' / 'legitimatie pentru reducere la transport' → 'student transport discount card' (NOT 'transport pass' or 'reduction pass')\n"
            "  * 'secretariat facultate' → 'Faculty Office' or 'Faculty Administration Office'\n"
            "  * 'transport naval' / 'transport pe apa' → 'water transport' or 'inland water transport' (NOT 'ferry transport')\n"
            "  * 'conform cu originalul' / 'conform originalului' → use the standard certified-copy phrase in the target language (in English: 'Certified true copy'; in German: 'Beglaubigte Kopie'; in French: 'Copie certifiée conforme')\n"
            "  * when a subscription is purchased 'cu valoarea de 90% din pretul intreg' it means the student benefits from a 90% DISCOUNT and pays only 10% — translate the economic meaning correctly (e.g. 'with a 90% discount' or 'at 10% of the full fare'), NOT 'at 90% of the full price'\n"
            "- Use consistent terminology throughout the text (do not alternate between synonyms for the same concept).\n"
            "- Do NOT translate proper nouns, brand names or commercial names (e.g. 'PLUS NOMINALE').\n"
            "- Do NOT produce word-for-word literal translations; prefer natural phrasing used in official documents of the target language.\n"
            "- Preserve all numbers, percentages, dates, article references and legal citations exactly as they appear.\n"
            "Return only the translated text, no explanations, no markdown, no quotes.\n"
            f"Text: {text}"
        )
        response = self.client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=8192,
            ),
        )
        translated = (response.text or "").strip()
        if not translated:
            raise ValueError("Gemini returned an empty translation.")
        return self._strip_wrapping_quotes(translated)

    def translate_many_uncached(self, items: dict[str, str], target_language: str) -> dict[str, str]:
        if not items:
            return {}

        payload = json.dumps(items, ensure_ascii=False)
        prompt = (
            f"Translate every Romanian string value in this JSON object to {target_language}.\n"
            "Rules:\n"
            "- Maintain an official, formal, academic tone.\n"
            "- Use precise university terminology for the target language.\n"
            "- Do NOT translate proper nouns, brand names or commercial names.\n"
            "- Use consistent terminology throughout (do not alternate between synonyms).\n"
            "- Preserve all numbers, percentages, dates and legal citations exactly.\n"
            "Return only a valid JSON object with the same keys and translated string values. "
            "No explanations, no markdown, no quotes around the whole response.\n"
            f"JSON: {payload}"
        )
        response = self.client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=8192,
                response_mime_type="application/json",
            ),
        )
        raw = (response.text or "").strip()
        if not raw:
            raise ValueError("Gemini returned an empty batch translation.")

        translated = json.loads(raw)
        if not isinstance(translated, dict):
            raise ValueError("Gemini batch translation did not return a JSON object.")

        return {key: str(translated[key]).strip() for key in items if key in translated}

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ValueError, Exception)),
        reraise=True,
    )
    def translate_announcement_uncached(self, title: str, content: str, target_language: str) -> dict[str, str]:
        payload = json.dumps({"title": title, "content": content}, ensure_ascii=False)
        prompt = (
            f"Translate the title and content of this university announcement to {target_language}.\n"
            "Rules:\n"
            "- Maintain an official, formal, academic tone.\n"
            "- Use precise university terminology.\n"
            "- CRITICAL: Preserve the original formatting EXACTLY, including all paragraphs, markdown syntax, links, and newlines.\n"
            "- Do NOT translate proper nouns or brand names.\n"
            "Return only a valid JSON object with the keys 'translated_title' and 'translated_content' containing the translated strings. "
            "No explanations, no markdown formatting block quotes around the response.\n"
            f"JSON: {payload}"
        )
        response = self.client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=8192,
                response_mime_type="application/json",
            ),
        )
        raw = (response.text or "").strip()
        if not raw:
            raise ValueError("Gemini returned an empty announcement translation.")
        
        translated = json.loads(raw)
        return translated

    def translate_announcement(self, title: str, content: str, target_language: str) -> AnnouncementTranslateResponse:
        normalized_language = self._normalize_language(target_language)
        translated = self.translate_announcement_uncached(title, content, normalized_language)
        return AnnouncementTranslateResponse(
            translated_title=str(translated.get("translated_title", "")).strip(),
            translated_content=str(translated.get("translated_content", "")).strip()
        )

    def translate(self, text: str, target_language: str) -> TranslateResponse:
        normalized_language = self._normalize_language(target_language)
        cached = self.get_cached_translation(text, normalized_language)
        if cached is not None:
            return TranslateResponse(
                source_text=text,
                target_language=normalized_language,
                translated_text=cached,
                cached=True,
                provider=self.provider,
            )

        translated = self.translate_text_uncached(text, normalized_language)
        self.save_translation(text, normalized_language, translated)
        return TranslateResponse(
            source_text=text,
            target_language=normalized_language,
            translated_text=translated,
            cached=False,
            provider=self.provider,
        )

    def translate_batch(self, data: Any, target_language: str) -> BatchTranslateResponse:
        normalized_language = self._normalize_language(target_language)
        string_paths = self._flatten_string_values(data)
        translated_by_path: dict[tuple[str, ...], str] = {}
        misses: dict[str, str] = {}
        cached_items = 0

        for path, text in string_paths.items():
            cached = self.get_cached_translation(text, normalized_language)
            if cached is None:
                misses[self._path_key(path)] = text
            else:
                translated_by_path[path] = cached
                cached_items += 1

        translated_items = 0
        if misses:
            translated_misses = self.translate_many_uncached(misses, normalized_language)
            for path_key, original in misses.items():
                translated = translated_misses.get(path_key)
                if translated is None:
                    translated = self.translate_text_uncached(original, normalized_language)
                path = tuple(json.loads(path_key))
                translated_by_path[path] = translated
                self.save_translation(original, normalized_language, translated)
                translated_items += 1

        result = self._apply_translations(data, translated_by_path)
        return BatchTranslateResponse(
            target_language=normalized_language,
            translations=result,
            cached_items=cached_items,
            translated_items=translated_items,
            provider=self.provider,
        )

    def _flatten_string_values(self, value: Any, path: tuple[str, ...] = ()) -> dict[tuple[str, ...], str]:
        if isinstance(value, str):
            return {path: value}
        if isinstance(value, dict):
            result: dict[tuple[str, ...], str] = {}
            for key, child in value.items():
                result.update(self._flatten_string_values(child, (*path, str(key))))
            return result
        if isinstance(value, list):
            result = {}
            for index, child in enumerate(value):
                result.update(self._flatten_string_values(child, (*path, str(index))))
            return result
        return {}

    def _apply_translations(self, value: Any, translated_by_path: dict[tuple[str, ...], str], path: tuple[str, ...] = ()) -> Any:
        if isinstance(value, str):
            return translated_by_path.get(path, value)
        if isinstance(value, dict):
            return {
                key: self._apply_translations(child, translated_by_path, (*path, str(key)))
                for key, child in value.items()
            }
        if isinstance(value, list):
            return [
                self._apply_translations(child, translated_by_path, (*path, str(index)))
                for index, child in enumerate(value)
            ]
        return value

    @staticmethod
    def _path_key(path: tuple[str, ...]) -> str:
        return json.dumps(path, ensure_ascii=False)

    @staticmethod
    def _normalize_language(target_language: str) -> str:
        lang = target_language.strip().lower()
        # ISO 639-1 code mapping for common languages to help the LLM
        iso_map = {
            "ro": "Romanian",
            "en": "English",
            "fr": "French",
            "es": "Spanish",
            "de": "German",
            "it": "Italian",
            "hu": "Hungarian",
            "tr": "Turkish",
            "ru": "Russian",
            "uk": "Ukrainian",
            "zh": "Chinese",
            "ja": "Japanese",
            "ar": "Arabic",
            "bg": "Bulgarian",
            "el": "Greek"
        }
        return iso_map.get(lang, lang)

    @staticmethod
    def _strip_wrapping_quotes(text: str) -> str:
        if len(text) >= 2 and text[0] == text[-1] and text[0] in {'"', "'"}:
            return text[1:-1].strip()
        return text


translation_service = TranslationService()
router = APIRouter(tags=["Translations"])


@router.post("/translate", response_model=TranslateResponse)
def translate(request: TranslateRequest) -> TranslateResponse:
    try:
        return translation_service.translate(request.text, request.target_language)
    except Exception as exc:
        logger.error("Translation failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Translation failed.") from exc


@router.post("/translate/batch", response_model=BatchTranslateResponse)
def translate_batch(request: BatchTranslateRequest) -> BatchTranslateResponse:
    try:
        return translation_service.translate_batch(request.translations, request.target_language)
    except Exception as exc:
        logger.error("Batch translation failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Batch translation failed.") from exc


@router.post("/translate/announcement", response_model=AnnouncementTranslateResponse)
def translate_announcement(request: AnnouncementTranslateRequest) -> AnnouncementTranslateResponse:
    try:
        return translation_service.translate_announcement(
            request.title, request.content, request.target_language
        )
    except Exception as exc:
        logger.error("Announcement translation failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Announcement translation failed.") from exc
