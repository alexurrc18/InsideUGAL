from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_admin
from app.db.database import get_db
from app.models import schemas
from app.repositories.cafeteria_menu_repo import CafeteriaMenuRepository

# Instanțiem router-ul și repository-ul
router = APIRouter(prefix="/cafeteria_menus", tags=["Cafeteria Menus"])
repo = CafeteriaMenuRepository()


@router.get("/", response_model=List[schemas.CafeteriaMenuResponse])
async def read_cafeteria_menus(session: AsyncSession = Depends(get_db)):
    """Returnează lista cu toate meniurile de la cantină."""
    return await repo.get_all(session)


@router.get("/{menu_id}", response_model=schemas.CafeteriaMenuResponse)
async def read_cafeteria_menu(menu_id: int, session: AsyncSession = Depends(get_db)):
    """Returnează un meniu după ID-ul lui."""
    menu = await repo.get_by_id(session, menu_id)
    if not menu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cafeteria menu not found.")
    return menu


@router.post("/", response_model=schemas.CafeteriaMenuResponse, status_code=status.HTTP_201_CREATED)
async def create_cafeteria_menu(
    menu_in: schemas.CafeteriaMenuCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    """Adaugă un meniu nou în baza de date (Necesită Autentificare)."""
    return await repo.create(session, menu_in)


@router.put("/{menu_id}", response_model=schemas.CafeteriaMenuResponse)
async def update_cafeteria_menu(
    menu_id: int,
    menu_in: schemas.CafeteriaMenuUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    """Actualizează datele unui meniu existent (Necesită Autentificare)."""
    menu = await repo.get_by_id(session, menu_id)
    if not menu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cafeteria menu not found.")
    
    return await repo.update(session, menu, menu_in)


@router.delete("/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cafeteria_menu(
    menu_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    """Șterge un meniu din baza de date (Necesită Autentificare)."""
    menu = await repo.get_by_id(session, menu_id)
    if not menu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cafeteria menu not found.")
    
    await repo.delete(session, menu)
