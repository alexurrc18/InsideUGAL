from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile
from app.db.database import get_db
from app.models.models import (
    Announcement,
    Complaint,
    Profile,
)
from app.models.schemas import DashboardStatsResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_profile=Depends(get_current_profile),
    session: AsyncSession = Depends(get_db),
):
    profile = current_profile
    user_role = profile.role

    stats = {"total_users": 0, "complaints_stats": {}, "recent_announcements": []}

    if user_role == "STUDENT":
        complaints_data = (
            await session.execute(
                select(Complaint.status, func.count(Complaint.id))
                .where(Complaint.user_id == str(profile.id))
                .group_by(Complaint.status)
            )
        )
        stats["complaints_stats"] = {
            status.value if hasattr(status, "value") else status: count
            for status, count in complaints_data.all()
        }
        stats["total_users"] = 0

    elif user_role in ["HEAD_ADMIN", "HEAD_FACULTATI", "PROFESOR"]:
        stats["total_users"] = (
            await session.execute(select(func.count()).select_from(Profile))
        ).scalar_one()

        complaints_data = (
            await session.execute(
                select(Complaint.status, func.count(Complaint.id))
                .group_by(Complaint.status)
            )
        )
        stats["complaints_stats"] = {
            status.value if hasattr(status, "value") else status: count
            for status, count in complaints_data.all()
        }

    announcements_result = await session.execute(
        select(Announcement)
        .order_by(Announcement.created_at.desc())
        .limit(3)
    )
    announcements = announcements_result.scalars().all()

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