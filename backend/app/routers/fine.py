from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.fine import (
    FineResponse,
    ReportIssueRequest,
    FinePayRequest,
    FineWaiveRequest,
    UnpaidCheckResponse,
)
from app.crud.fine import (
    get_unpaid_fines_summary,
    report_damage_or_lost,
    pay_fine,
    waive_fine,
    list_fines,
)

router = APIRouter(prefix="/fines", tags=["Fines"])


@router.get("", response_model=list[FineResponse])
def get_all_fines(
    user_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Lấy danh sách các khoản phạt (có thể lọc theo user_id hoặc status)."""
    return list_fines(db, user_id=user_id, status=status, skip=skip, limit=limit)


@router.get("/unpaid-check/{user_id}", response_model=UnpaidCheckResponse)
def check_user_unpaid_fines(user_id: int, db: Session = Depends(get_db)):
    """Kiểm tra độc giả có khoản phạt chưa thanh toán (dùng cho module Mượn)."""
    return get_unpaid_fines_summary(db, user_id=user_id)


@router.post("/report-issue")
def report_damaged_or_lost_book(
    payload: ReportIssueRequest,
    db: Session = Depends(get_db),
):
    """Báo sách hỏng hoặc báo mất sách: tự động tính phạt theo giá bìa của sách."""
    return report_damage_or_lost(
        db,
        issue_type=payload.issue_type,
        book_copy_id=payload.book_copy_id,
        copy_code=payload.copy_code,
        note=payload.note,
    )


@router.post("/{fine_id}/pay", response_model=FineResponse)
def pay_user_fine(
    fine_id: int,
    payload: FinePayRequest | None = None,
    db: Session = Depends(get_db),
):
    """Thủ thư thu tiền phạt: chuyển trạng thái sang PAID."""
    collected_by = payload.collected_by if payload else None
    return pay_fine(db, fine_id=fine_id, collected_by=collected_by)


@router.post("/{fine_id}/waive", response_model=FineResponse)
def waive_user_fine(
    fine_id: int,
    payload: FineWaiveRequest,
    db: Session = Depends(get_db),
):
    """Thủ thư miễn giảm khoản phạt kèm lý do: chuyển trạng thái sang WAIVED."""
    return waive_fine(
        db,
        fine_id=fine_id,
        waive_reason=payload.waive_reason,
        waived_by=payload.waived_by,
    )
