"""Router API Thống kê thư viện (Task T3CFF62)."""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud.statistics import (
    get_dashboard_statistics,
    get_top_borrowed_books,
    resolve_date_range,
)
from app.core.dependencies import require_librarian
from app.db.session import get_db
from app.schemas.statistics import (
    DashboardStatisticsResponse,
    TopBorrowedBookItem,
)

router = APIRouter(
    prefix="/statistics",
    tags=["Statistics"],
    dependencies=[Depends(require_librarian)],
)


@router.get("/dashboard", response_model=DashboardStatisticsResponse)
def dashboard_statistics(
    period: str | None = Query(
        default="month",
        description="Khoảng thời gian nhanh: today | week | month | year | custom",
    ),
    start_date: date | None = Query(default=None, description="Ngày bắt đầu (YYYY-MM-DD)"),
    end_date: date | None = Query(default=None, description="Ngày kết thúc (YYYY-MM-DD)"),
    group_by: str = Query(
        default="day",
        pattern="^(day|month)$",
        description="Gom nhóm biểu đồ lượt mượn: day | month",
    ),
    db: Session = Depends(get_db),
):
    """
    API tổng hợp toàn bộ dữ liệu cho Dashboard thống kê thư viện:
    - KPI tổng quan (đầu sách, bản sao, lượt mượn, số sách quá hạn, tiền phạt đã thu).
    - Biểu đồ lượt mượn & trả sách theo ngày/tháng.
    - Top sách mượn nhiều nhất trong kỳ.
    - Thể loại phổ biến nhất.
    """
    return get_dashboard_statistics(
        db,
        period=period,
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
    )


@router.get("/top-books", response_model=list[TopBorrowedBookItem])
def top_books(
    period: str | None = Query(default="month"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    limit: int = Query(default=8, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Top sách được mượn nhiều nhất trong khoảng thời gian chọn."""
    start_d, end_d, _ = resolve_date_range(period, start_date, end_date)
    return get_top_borrowed_books(db, start_d, end_d, limit=limit)
