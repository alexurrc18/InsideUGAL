import json
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException, status

LANGUAGE_CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "translation_languages.json"


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


def pretranslate_languages() -> tuple[str, ...]:
    configured_languages = _language_config().get("announcement_pretranslate_languages", [])
    if not isinstance(configured_languages, list):
        return ()

    supported_languages = supported_translation_languages()
    default_language = normalize_language(None)
    return tuple(
        language
        for language in (str(item).strip().lower() for item in configured_languages)
        if language and language != default_language and language in supported_languages
    )


def announcement_pretranslate_languages() -> tuple[str, ...]:
    return pretranslate_languages()


def validate_translation_language(lang: str | None) -> str:
    language_code = normalize_language(lang)
    if language_code not in supported_translation_languages():
        supported = ", ".join(sorted(supported_translation_languages()))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Limba '{language_code}' nu este suportata pentru traducere. Limbi acceptate: {supported}.",
        )
    return language_code
