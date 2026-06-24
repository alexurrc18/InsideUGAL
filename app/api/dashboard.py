from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.auth import get_current_user
from pydantic import BaseModel
from typing import Dict, List
from sqlalchemy import func
# Corectăm importul aici:
from app.models.models import Profile, Complaint, Announcement

class DashboardStatsResponse(BaseModel):
    total_users: int
    complaints_stats: Dict[str, int]
    recent_announcements: List[dict]

router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["Dashboard"]
)

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 1. Total utilizatori
    total_users = 0
    if current_user.role in ['HEAD_ADMIN', 'HEAD_FACULTATI']:
        total_users = db.query(func.count(Profile.id)).scalar()

    # 2. Statistici sesizări
    complaint_query = db.query(Complaint.status, func.count(Complaint.id))
    if current_user.role == 'STUDENT':
        complaint_query = complaint_query.filter(Complaint.user_id == current_user.id)
    
    complaints_data = complaint_query.group_by(Complaint.status).all()
    complaints_stats = {status: count for status, count in complaints_data}

    # 3. Ultimele 3 anunțuri
    announcements_query = db.query(Announcement).order_by(Announcement.created_at.desc()).limit(3)
    recent = [{"title": a.title, "date": a.created_at} for a in announcements_query.all()]

    return {
        "total_users": total_users,
        "complaints_stats": complaints_stats,
        "recent_announcements": recent
    }