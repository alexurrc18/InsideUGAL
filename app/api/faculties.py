from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import models, schemas


router = APIRouter(prefix="/faculties", tags=["faculties"])


@router.post("/", response_model=schemas.FacultyInDB, status_code=status.HTTP_201_CREATED)
def create_faculty(faculty: schemas.FacultyCreate, db: Session = Depends(get_db)):
    db_faculty = models.Faculty(**faculty.model_dump())
    db.add(db_faculty)
    db.commit()
    db.refresh(db_faculty)
    return db_faculty


@router.get("/", response_model=list[schemas.FacultyInDB])
def list_faculties(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Faculty).offset(skip).limit(limit).all()


@router.get("/{faculty_id}", response_model=schemas.FacultyInDB)
def get_faculty(faculty_id: int, db: Session = Depends(get_db)):
    db_faculty = db.query(models.Faculty).filter(models.Faculty.id == faculty_id).first()
    if not db_faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found.",
        )
    return db_faculty
