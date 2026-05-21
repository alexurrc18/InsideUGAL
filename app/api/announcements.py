from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import models, schemas


router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.post("/", response_model=schemas.AnnouncementInDB, status_code=status.HTTP_201_CREATED)
def create_announcement(
    announcement: schemas.AnnouncementCreate,
    created_by: int,
    db: Session = Depends(get_db),
):
    creator = db.query(models.User).filter(models.User.id == created_by).first()
    if not creator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator user not found.",
        )

    db_announcement = models.Announcement(
        **announcement.model_dump(),
        created_by=created_by,
        created_at=datetime.now(timezone.utc),
    )
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
