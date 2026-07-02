from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import Column, Integer, MetaData, String, Table, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.announcements import pretranslate_announcement
from app.api.auth_deps import require_roles
from app.api.model_translation_cache import (
    CATEGORY_TRANSLATION,
    CITY_GUIDE_CATEGORY_TRANSLATION,
    CITY_GUIDE_ITEM_TRANSLATION,
    COMPLAINT_TRANSLATION,
    FACILITY_TRANSLATION,
    FACULTY_TRANSLATION,
    LOCATION_TRANSLATION,
    NOTIFICATION_TRANSLATION,
    PRODUCT_CATEGORY_TRANSLATION,
    PRODUCT_TRANSLATION,
    TranslationCacheConfig,
    pretranslate_model_cache,
)
from app.api.translation_languages import pretranslate_languages, validate_translation_language
from app.db.database import get_db
from app.models import schemas

router = APIRouter(prefix="/translation-backfill", tags=["Translation Backfill"])

manage_translation_backfill = require_roles(schemas.UserRole.HEAD_ADMIN)

BACKFILL_TABLES: dict[str, TranslationCacheConfig | None] = {
    "announcements": None,
    "faculties": FACULTY_TRANSLATION,
    "facilities": FACILITY_TRANSLATION,
    "locations": LOCATION_TRANSLATION,
    "categories": CATEGORY_TRANSLATION,
    "product_categories": PRODUCT_CATEGORY_TRANSLATION,
    "products": PRODUCT_TRANSLATION,
    "city_guide_categories": CITY_GUIDE_CATEGORY_TRANSLATION,
    "city_guide_items": CITY_GUIDE_ITEM_TRANSLATION,
    "complaints": COMPLAINT_TRANSLATION,
    "notifications": NOTIFICATION_TRANSLATION,
}


def _source_id_column(config: TranslationCacheConfig | None) -> Column[Any]:
    if config is not None and config.id_sql_type.startswith("VARCHAR"):
        return Column("id", String(100), nullable=False)
    return Column("id", Integer(), nullable=False)


def _source_table(table_name: str, config: TranslationCacheConfig | None) -> Table:
    source_table_name = "announcements" if config is None else config.source_table
    return Table(
        source_table_name,
        MetaData(),
        _source_id_column(config),
        schema="public",
    )


def _backfill_languages(lang: str | None) -> tuple[str, ...]:
    if lang is None:
        return pretranslate_languages()

    language_code = validate_translation_language(lang)
    return () if language_code == "ro" else (language_code,)


@router.post("/{table_name}", status_code=status.HTTP_202_ACCEPTED)
async def backfill_table_translations(
    table_name: str,
    background_tasks: BackgroundTasks,
    lang: str | None = Query(default=None, description="Optional single language code to backfill."),
    refresh_existing: bool = Query(default=False, description="Regenerate translations that already exist."),
    session: AsyncSession = Depends(get_db),
    profile=Depends(manage_translation_backfill),
):
    config = BACKFILL_TABLES.get(table_name)
    if table_name not in BACKFILL_TABLES:
        supported_tables = ", ".join(sorted(BACKFILL_TABLES))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tabela '{table_name}' nu este suportata pentru backfill. Tabele acceptate: {supported_tables}.",
        )

    languages = _backfill_languages(lang)
    if not languages:
        return {"scheduled": 0, "table": table_name, "languages": []}

    source_table = _source_table(table_name, config)
    result = await session.execute(select(source_table.c.id))
    entity_ids = list(result.scalars().all())

    for entity_id in entity_ids:
        if table_name == "announcements":
            background_tasks.add_task(pretranslate_announcement, entity_id, refresh_existing, languages)
        else:
            if config is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Configuratia de backfill lipseste pentru tabela ceruta.",
                )
            background_tasks.add_task(
                pretranslate_model_cache,
                entity_id,
                config,
                refresh_existing=refresh_existing,
                languages=languages,
            )

    return {
        "scheduled": len(entity_ids),
        "table": table_name,
        "languages": list(languages),
    }
