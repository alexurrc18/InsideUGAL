import json
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException, status

LANGUAGE_CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "translation_languages.json"


@lru_cache
def _language_config() -> dict[str, list[str] | str]:
    with LANGUAGE_CONFIG_PATH.open(encoding="utf-8") as file:
        return json.load(file)


def normalize_language(lang: str | None) -> str:
    default_language = str(_language_config().get("default_language", "ro"))
    return lang.strip().lower() if lang else default_language


def supported_translation_languages() -> set[str]:
    languages = _language_config().get("supported_languages", ["ro"])
    if not isinstance(languages, list):
        return {"ro"}
    return {str(language).strip().lower() for language in languages if str(language).strip()}


def validate_translation_language(lang: str | None) -> str:
    language_code = normalize_language(lang)
    if language_code not in supported_translation_languages():
        supported = ", ".join(sorted(supported_translation_languages()))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported translation language '{language_code}'. Supported languages: {supported}.",
        )
    return language_code
