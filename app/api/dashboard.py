from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db  # Corectat pe baza importului tău din Base
from app.models.models import (  # Corectat calea exactă către modele
    Announcement,
    Complaint,
    Profile,
)

# Notă: Dacă linterul încă se plânge de schema, asigură-te că fișierul dashboard.py
# există în folderul app/schemas/. Dacă se numește altfel, modifică doar linia de mai jos:
# Înlocuiește vechiul import cu calea reală:
from app.models.schemas import DashboardStatsResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Obține statisticile agregate pentru dashboard în funcție de rolul utilizatorului.
    Funcția este sincronă (def) pentru a evita blocarea event-loop-ului de către SQLAlchemy.
    """
    # 1. Rezolvare Bug Autorizare: Căutăm profilul în tabelul 'profiles' folosind ID-ul de la Supabase
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profilul utilizatorului nu a fost găsit în baza de date locală.",
        )

    user_role = profile.role

    # Structura de bază a răspunsului
    stats = {"total_users": 0, "complaints_stats": {}, "recent_announcements": []}

    # 2. Optimizare Performanță: Agregare direct în Postgres (Group By + Count)
    # Evităm aducerea tuturor înregistrărilor în memorie.
    if user_role == "STUDENT":
        # Studenții își văd doar propriile sesizări grupate după status
        complaints_data = (
            db.query(Complaint.status, func.count(Complaint.id))
            .filter(Complaint.user_id == current_user.id)
            .group_by(Complaint.status)
            .all()
        )
        # Transformăm rezultatul din [('in_lucru', 2)] în {'in_lucru': 2}
        stats["complaints_stats"] = {
            status.value if hasattr(status, "value") else status: count
            for status, count in complaints_data
        }
        stats["total_users"] = 0  # Studenții nu au dreptul să vadă numărul total de utilizatori

    elif user_role in ["HEAD_ADMIN", "HEAD_FACULTATI", "PROFESOR"]:
        # Administratorii și Profesorii văd numărul total de utilizatori din sistem
        stats["total_users"] = db.query(Profile).count()

        # Și statisticile globale pentru absolut toate sesizările
        complaints_data = (
            db.query(Complaint.status, func.count(Complaint.id))
            .group_by(Complaint.status)
            .all()
        )
        stats["complaints_stats"] = {
            status.value if hasattr(status, "value") else status: count
            for status, count in complaints_data
        }

    # 3. Adăugarea ultimelor 3 anunțuri (valabil pentru toată lumea)
    announcements = (
        db.query(Announcement)
        .order_by(Announcement.created_at.desc())
        .limit(3)
        .all()
    )

    stats["recent_announcements"] = [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "type": a.type.value if hasattr(a.type, "value") else a.type,
            "created_at": a.created_at,
        }
        for a in announcements
    ]

    return stats