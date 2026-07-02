from dataclasses import dataclass
import logging
from asyncio import sleep
from typing import Any

from fastapi.encoders import jsonable_encoder
from sqlalchemy import Column, DateTime, Integer, MetaData, String, Table, Text, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.translation_languages import pretranslate_languages, validate_translation_language
from app.api.translation_utils import translate_payload
from app.db.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TranslationCacheConfig:
    table_name: str
    source_table: str
    id_column: str
    id_sql_type: str
    fields: tuple[str, ...]


FACULTY_TRANSLATION = TranslationCacheConfig(
    table_name="faculty_translations",
    source_table="faculties",
    id_column="faculty_id",
    id_sql_type="INTEGER",
    fields=("name", "description", "address"),
)

FACILITY_TRANSLATION = TranslationCacheConfig(
    table_name="facility_translations",
    source_table="facilities",
    id_column="facility_id",
    id_sql_type="INTEGER",
    fields=("name", "description"),
)

LOCATION_TRANSLATION = TranslationCacheConfig(
    table_name="location_translations",
    source_table="locations",
    id_column="location_id",
    id_sql_type="INTEGER",
    fields=("name",),
)

CATEGORY_TRANSLATION = TranslationCacheConfig(
    table_name="category_translations",
    source_table="categories",
    id_column="category_id",
    id_sql_type="INTEGER",
    fields=("name",),
)

PRODUCT_CATEGORY_TRANSLATION = TranslationCacheConfig(
    table_name="product_category_translations",
    source_table="product_categories",
    id_column="category_id",
    id_sql_type="INTEGER",
    fields=("name",),
)

PRODUCT_TRANSLATION = TranslationCacheConfig(
    table_name="product_translations",
    source_table="products",
    id_column="product_id",
    id_sql_type="INTEGER",
    fields=("name", "description"),
)

CITY_GUIDE_CATEGORY_TRANSLATION = TranslationCacheConfig(
    table_name="city_guide_category_translations",
    source_table="city_guide_categories",
    id_column="category_id",
    id_sql_type="VARCHAR(100)",
    fields=("title", "description"),
)

CITY_GUIDE_ITEM_TRANSLATION = TranslationCacheConfig(
    table_name="city_guide_item_translations",
    source_table="city_guide_items",
    id_column="item_id",
    id_sql_type="INTEGER",
    fields=("title", "address"),
)

COMPLAINT_TRANSLATION = TranslationCacheConfig(
    table_name="complaint_translations",
    source_table="complaints",
    id_column="complaint_id",
    id_sql_type="INTEGER",
    fields=("title", "description"),
)

NOTIFICATION_TRANSLATION = TranslationCacheConfig(
    table_name="notification_translations",
    source_table="notifications",
    id_column="notification_id",
    id_sql_type="INTEGER",
    fields=("title", "body"),
)


def _id_column_type(config: TranslationCacheConfig) -> Integer | String:
    if config.id_sql_type.startswith("VARCHAR"):
        return String(100)
    return Integer()


def _translation_table(config: TranslationCacheConfig) -> Table:
    return Table(
        config.table_name,
        MetaData(),
        Column(config.id_column, _id_column_type(config), nullable=False),
        Column("language_code", String(10), nullable=False),
        Column("field_name", String(100), nullable=False),
        Column("translated_text", Text(), nullable=False),
        Column("updated_at", DateTime(timezone=True), nullable=False),
        schema="public",
    )


def _source_table(config: TranslationCacheConfig) -> Table:
    return Table(
        config.source_table,
        MetaData(),
        Column("id", _id_column_type(config), nullable=False),
        *(Column(field, Text()) for field in config.fields),
        schema="public",
    )


async def translate_with_model_cache(
    payload: Any,
    lang: str | None,
    session: AsyncSession,
    config: TranslationCacheConfig,
    *,
    refresh_existing: bool = False,
) -> Any:
    language_code = validate_translation_language(lang)
    if language_code == "ro":
        return payload

    encoded_payload: Any
    if isinstance(payload, dict) or (
        isinstance(payload, list) and all(isinstance(item, dict) for item in payload)
    ):
        encoded_payload = payload
    else:
        encoded_payload = jsonable_encoder(payload)
    is_list = isinstance(encoded_payload, list)
    items: list[dict[str, Any]]
    if isinstance(encoded_payload, list):
        items = [item for item in encoded_payload if isinstance(item, dict)]
    elif isinstance(encoded_payload, dict):
        items = [encoded_payload]
    else:
        items = []
    if not items:
        return encoded_payload

    entity_ids = [item.get("id") for item in items if item.get("id") is not None]
    if not entity_ids:
        return encoded_payload

    cached_by_entity: dict[Any, dict[str, str]] = {}
    translation_table = _translation_table(config)
    if not refresh_existing:
        entity_column = translation_table.c[config.id_column]
        query = (
            select(
                entity_column.label("entity_id"),
                translation_table.c.field_name,
                translation_table.c.translated_text,
            )
            .where(translation_table.c.language_code == language_code)
            .where(entity_column.in_(entity_ids))
        )
        result = await session.execute(query)
        for row in result.mappings():
            cached_by_entity.setdefault(row["entity_id"], {})[row["field_name"]] = row["translated_text"]

    missing_payloads: list[dict[str, str]] = []
    missing_items: list[tuple[dict[str, Any], list[str]]] = []
    for item in items:
        entity_id = item.get("id")
        cached_fields = cached_by_entity.get(entity_id, {})
        missing_fields = []
        for field in config.fields:
            value = item.get(field)
            if not isinstance(value, str) or not value.strip():
                continue
            cached_value = cached_fields.get(field)
            if cached_value is not None:
                item[field] = cached_value
            else:
                missing_fields.append(field)

        if missing_fields:
            missing_payloads.append({field: item[field] for field in missing_fields})
            missing_items.append((item, missing_fields))

    if missing_payloads:
        translated_payloads = await translate_payload(
            missing_payloads,
            language_code,
            fields=set(config.fields),
        )
        if isinstance(translated_payloads, list):
            for (item, missing_fields), translated_item in zip(missing_items, translated_payloads):
                if not isinstance(translated_item, dict):
                    continue
                entity_id = item.get("id")
                for field in missing_fields:
                    translated_value = translated_item.get(field)
                    if not isinstance(translated_value, str):
                        continue
                    item[field] = translated_value
                    await _save_field_translation(session, config, entity_id, language_code, field, translated_value)
            await session.commit()

    return encoded_payload if is_list else encoded_payload


async def pretranslate_model_cache(
    entity_id: Any,
    config: TranslationCacheConfig,
    *,
    refresh_existing: bool = False,
    languages: tuple[str, ...] | None = None,
) -> None:
    languages = pretranslate_languages() if languages is None else languages
    if not languages:
        return

    async with AsyncSessionLocal() as session:
        source_table = _source_table(config)
        columns = [source_table.c.id, *(source_table.c[field] for field in config.fields)]
        result = await session.execute(
            select(*columns).where(source_table.c.id == entity_id)
        )
        row = result.mappings().first()
        if row is None:
            logger.warning(
                "Could not pretranslate %s %s: source row was not found.",
                config.source_table,
                entity_id,
            )
            return

        payload = {"id": row["id"]}
        payload.update({field: row[field] for field in config.fields})
        for language_code in languages:
            try:
                await translate_with_model_cache(
                    payload.copy(),
                    language_code,
                    session,
                    config,
                    refresh_existing=refresh_existing,
                )
            except Exception as exc:
                logger.warning(
                    "Pretranslation failed for %s %s in %s: %s",
                    config.source_table,
                    entity_id,
                    language_code,
                    exc,
                )
            await sleep(0)


async def _save_field_translation(
    session: AsyncSession,
    config: TranslationCacheConfig,
    entity_id: Any,
    language_code: str,
    field_name: str,
    translated_text: str,
) -> None:
    translation_table = _translation_table(config)
    insert_stmt = pg_insert(translation_table).values(
        {
            config.id_column: entity_id,
            "language_code": language_code,
            "field_name": field_name,
            "translated_text": translated_text,
        }
    )
    upsert_stmt = insert_stmt.on_conflict_do_update(
        index_elements=[
            translation_table.c[config.id_column],
            translation_table.c.language_code,
            translation_table.c.field_name,
        ],
        set_={
            "translated_text": insert_stmt.excluded.translated_text,
            "updated_at": func.now(),
        },
    )
    await session.execute(upsert_stmt)
