import os
from copy import deepcopy
from typing import Any

import httpx
from fastapi import HTTPException, status
from fastapi.encoders import jsonable_encoder

from app.api.translation_languages import normalize_language as _normalize_language
from app.api.translation_languages import validate_translation_language

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")
LLM_TRANSLATION_TIMEOUT_SECONDS = float(os.getenv("LLM_TRANSLATION_TIMEOUT_SECONDS", "120"))

DEFAULT_TRANSLATABLE_FIELDS = {
    "title",
    "content",
    "description",
    "name",
    "address",
    "body",
    "location_name",
}


def normalize_language(lang: str | None) -> str:
    return _normalize_language(lang)


def should_translate(lang: str | None) -> bool:
    return validate_translation_language(lang) != "ro"


def _extract_translatable(value: Any, fields: set[str]) -> tuple[Any, bool]:
    if isinstance(value, list):
        extracted_items = []
        has_any = False
        for item in value:
            extracted, has_text = _extract_translatable(item, fields)
            extracted_items.append(extracted if has_text else {})
            has_any = has_any or has_text
        return extracted_items, has_any

    if isinstance(value, dict):
        extracted_dict: dict[str, Any] = {}
        has_any = False
        for key, child in value.items():
            if key in fields and isinstance(child, str) and child.strip():
                extracted_dict[key] = child
                has_any = True
                continue

            extracted, has_text = _extract_translatable(child, fields)
            if has_text:
                extracted_dict[key] = extracted
                has_any = True

        return extracted_dict, has_any

    return None, False


def _merge_translated(original: Any, translated: Any) -> Any:
    if isinstance(original, list):
        if not isinstance(translated, list):
            return original
        merged_items = []
        for index, item in enumerate(original):
            translated_item = translated[index] if index < len(translated) else None
            merged_items.append(_merge_translated(item, translated_item))
        return merged_items

    if isinstance(original, dict):
        if not isinstance(translated, dict):
            return original
        merged_dict = dict(original)
        for key, translated_child in translated.items():
            if key in merged_dict:
                merged_dict[key] = _merge_translated(merged_dict[key], translated_child)
        return merged_dict

    if isinstance(original, str) and isinstance(translated, str):
        return translated

    return original


async def translate_payload(
    payload: Any,
    lang: str | None,
    *,
    fields: set[str] | None = None,
) -> Any:
    language_code = validate_translation_language(lang)
    if language_code == "ro":
        return payload

    encoded_payload = jsonable_encoder(payload)
    translatable_fields = fields or DEFAULT_TRANSLATABLE_FIELDS
    extracted_payload, has_text = _extract_translatable(encoded_payload, translatable_fields)
    if not has_text:
        return encoded_payload

    timeout = httpx.Timeout(LLM_TRANSLATION_TIMEOUT_SECONDS, connect=10.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/translate/batch",
                json={
                    "translations": extracted_payload,
                    "target_language": language_code,
                },
            )
            response.raise_for_status()
            translated_payload = response.json()["translations"]
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Traducere eșuată: {exc.response.text if exc.response else str(exc)}",
        ) from exc
    except (httpx.RequestError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviciul LLM nu este disponibil pentru traducere.",
        ) from exc

    return _merge_translated(deepcopy(encoded_payload), translated_payload)
