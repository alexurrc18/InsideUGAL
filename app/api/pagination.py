from math import ceil
from typing import TypeVar

from fastapi import Query

from app.models.schemas import PaginatedResponse

T = TypeVar("T")


class PaginationParams:
    def __init__(
        self,
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=500),
    ) -> None:
        self.page = page
        self.size = size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


def paginated_response(items: list[T], total: int, pagination: PaginationParams) -> PaginatedResponse[T]:
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        size=pagination.size,
        total_pages=ceil(total / pagination.size) if total else 0,
    )
