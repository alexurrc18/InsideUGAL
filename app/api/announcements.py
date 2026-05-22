from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import models, schemas


router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.post("/", response_model=schemas.AnnouncementInDB, status_code=status.HTTP_201_CREATED)
def create_announcement(
    announcement: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
):
    creator = db.query(models.User).filter(models.User.id == announcement.created_by).first()
    if not creator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator user not found.",
        )

    db_announcement = models.Announcement(**announcement.model_dump())
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)
    return db_announcement


@router.get("/", response_model=list[schemas.AnnouncementInDB])
def list_announcements(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Announcement).offset(skip).limit(limit).all()


@router.get("/{announcement_id}", response_model=schemas.AnnouncementInDB)
def get_announcement(announcement_id: int, db: Session = Depends(get_db)):
    db_announcement = (
        db.query(models.Announcement)
        .filter(models.Announcement.id == announcement_id)
        .first()
    )
    if not db_announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )
    return db_announcement


@router.put("/{announcement_id}", response_model=schemas.AnnouncementInDB)
def update_announcement(
    announcement_id: int,
    announcement: schemas.AnnouncementUpdate,
    db: Session = Depends(get_db),
):
    db_announcement = (
        db.query(models.Announcement)
        .filter(models.Announcement.id == announcement_id)
        .first()
    )
    if not db_announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )

    update_data = announcement.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_announcement, field, value)

    db.commit()
    db.refresh(db_announcement)
    return db_announcement


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(announcement_id: int, db: Session = Depends(get_db)):
    db_announcement = (
        db.query(models.Announcement)
        .filter(models.Announcement.id == announcement_id)
        .first()
    )
    if not db_announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )

    db.delete(db_announcement)
    db.commit()
    return None
