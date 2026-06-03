import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import DailyMenu, Product
from app.models.schemas import DailyMenuCreate, DailyMenuUpdate
from app.repositories.daily_menu_repo import DailyMenuRepository


@pytest.fixture
def repo() -> DailyMenuRepository:
    return DailyMenuRepository()


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.add = MagicMock()

    async def refresh_side_effect(obj, attrs=None):
        if getattr(obj, "id", None) is None:
            obj.id = 1

    session.commit = AsyncMock()
    session.refresh = AsyncMock(side_effect=refresh_side_effect)
    session.delete = AsyncMock()
    return session


@pytest.fixture
def menu() -> DailyMenu:
    menu = DailyMenu(id=1, day_of_week=1)
    return menu


@pytest.fixture
def product() -> Product:
    return Product(id=1, name="Pizza", description="", quantity="1", price=10.0)


@pytest.mark.asyncio
async def test_get_all_returns_all_menus(repo: DailyMenuRepository, mock_session: AsyncMock, menu: DailyMenu) -> None:
    mock_result = MagicMock()
    mock_result.scalars.return_value.unique.return_value.all.return_value = [menu]
    mock_session.execute.return_value = mock_result

    result = await repo.get_all(mock_session)

    assert result == [menu]
    mock_session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_all_filters_by_day_of_week(repo: DailyMenuRepository, mock_session: AsyncMock, menu: DailyMenu) -> None:
    mock_result = MagicMock()
    mock_result.scalars.return_value.unique.return_value.all.return_value = [menu]
    mock_session.execute.return_value = mock_result

    result = await repo.get_all(mock_session, day_of_week=1)

    assert result == [menu]
    called_query = mock_session.execute.call_args[0][0]
    assert called_query.whereclause is not None


@pytest.mark.asyncio
async def test_get_all_empty_result(repo: DailyMenuRepository, mock_session: AsyncMock) -> None:
    mock_result = MagicMock()
    mock_result.scalars.return_value.unique.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    result = await repo.get_all(mock_session)

    assert result == []


@pytest.mark.asyncio
async def test_get_by_id_found(repo: DailyMenuRepository, mock_session: AsyncMock, menu: DailyMenu) -> None:
    mock_result = MagicMock()
    mock_result.scalars.return_value.unique.return_value.first.return_value = menu
    mock_session.execute.return_value = mock_result

    result = await repo.get_by_id(mock_session, 1)

    assert result == menu


@pytest.mark.asyncio
async def test_get_by_id_not_found(repo: DailyMenuRepository, mock_session: AsyncMock) -> None:
    mock_result = MagicMock()
    mock_result.scalars.return_value.unique.return_value.first.return_value = None
    mock_session.execute.return_value = mock_result

    result = await repo.get_by_id(mock_session, 999)

    assert result is None


@pytest.mark.asyncio
async def test_load_products_success(repo: DailyMenuRepository, mock_session: AsyncMock, product: Product) -> None:
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [product]
    mock_session.execute.return_value = mock_result

    result = await repo._load_products(mock_session, [1])

    assert result == [product]
    mock_session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_load_products_empty_ids(repo: DailyMenuRepository, mock_session: AsyncMock) -> None:
    result = await repo._load_products(mock_session, [])

    assert result == []
    mock_session.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_load_products_raises_on_missing(repo: DailyMenuRepository, mock_session: AsyncMock) -> None:
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    with pytest.raises(ValueError, match="Products not found: \\[1\\]"):
        await repo._load_products(mock_session, [1])


@pytest.mark.asyncio
async def test_load_products_raises_on_partial_missing(repo: DailyMenuRepository, mock_session: AsyncMock) -> None:
    found_product = Product(id=1, name="Pizza", description="", quantity="1", price=10.0)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [found_product]
    mock_session.execute.return_value = mock_result

    with pytest.raises(ValueError, match="Products not found: \\[2\\]"):
        await repo._load_products(mock_session, [1, 2])


@pytest.mark.asyncio
async def test_create_menu_success(repo: DailyMenuRepository, mock_session: AsyncMock, product: Product) -> None:
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [product]
    mock_session.execute.return_value = mock_result

    schema = DailyMenuCreate(day_of_week=1, product_ids=[1])

    with patch.object(repo, "_load_products", return_value=[product]) as mock_load:
        result = await repo.create(mock_session, schema)

    assert isinstance(result, DailyMenu)
    assert result.day_of_week == 1
    assert result.products == [product]

    added_obj = mock_session.add.call_args[0][0]
    assert isinstance(added_obj, DailyMenu)
    assert added_obj.day_of_week == 1

    mock_load.assert_called_once_with(mock_session, [1])
    mock_session.commit.assert_awaited_once()
    mock_session.refresh.assert_awaited_once_with(added_obj, ["products"])


@pytest.mark.asyncio
async def test_create_menu_raises_on_missing_products(repo: DailyMenuRepository, mock_session: AsyncMock) -> None:
    schema = DailyMenuCreate(day_of_week=1, product_ids=[999])

    with patch.object(repo, "_load_products", side_effect=ValueError("Products not found: [999]")):
        with pytest.raises(ValueError, match="Products not found"):
            await repo.create(mock_session, schema)

    mock_session.add.assert_not_called()
    mock_session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_menu_new_products(repo: DailyMenuRepository, mock_session: AsyncMock, menu: DailyMenu, product: Product) -> None:
    db_menu = DailyMenu(id=1, day_of_week=1)
    schema = DailyMenuUpdate(day_of_week=2, product_ids=[1])

    with patch.object(repo, "_load_products", return_value=[product]) as mock_load:
        result = await repo.update(mock_session, db_menu, schema)

    assert result is db_menu
    assert db_menu.day_of_week == 2
    mock_load.assert_called_once_with(mock_session, [1])
    mock_session.commit.assert_awaited_once()
    mock_session.refresh.assert_awaited_once_with(db_menu, ["products"])


@pytest.mark.asyncio
async def test_update_menu_excludes_unset_fields(repo: DailyMenuRepository, mock_session: AsyncMock, menu: DailyMenu) -> None:
    db_menu = DailyMenu(id=1, day_of_week=1)
    schema = DailyMenuUpdate()

    result = await repo.update(mock_session, db_menu, schema)

    assert result is db_menu
    mock_session.commit.assert_awaited_once()
    mock_session.refresh.assert_awaited_once_with(db_menu, ["products"])


@pytest.mark.asyncio
async def test_update_menu_without_products(repo: DailyMenuRepository, mock_session: AsyncMock, menu: DailyMenu) -> None:
    db_menu = DailyMenu(id=1, day_of_week=1)
    schema = DailyMenuUpdate(day_of_week=3)

    result = await repo.update(mock_session, db_menu, schema)

    assert result is db_menu
    assert db_menu.day_of_week == 3
    mock_session.commit.assert_awaited_once()
    mock_session.refresh.assert_awaited_once_with(db_menu, ["products"])
