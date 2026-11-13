from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.loan import LoanCreate, LoanResponse, LoanReject, LoanHandover
from app.crud.loan_service import (
    create_online_loan,
    cancel_online_loan,
    approve_loan,
    reject_loan,
    handover_loan,
)

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.post("/online", response_model=LoanResponse, status_code=201)
def create_loan(
    data: LoanCreate,
    user_id: int,
    db: Session = Depends(get_db),
):
    """Độc giả gửi yêu cầu mượn sách online."""
    return create_online_loan(db, user_id, data.book_isbns)


@router.patch("/{loan_id}/cancel", response_model=LoanResponse)
def cancel_loan(
    loan_id: int,
    user_id: int,
    db: Session = Depends(get_db),
):
    """Độc giả huỷ yêu cầu mượn khi chưa được duyệt."""
    return cancel_online_loan(db, loan_id, user_id)


@router.patch("/{loan_id}/approve", response_model=LoanResponse)
def approve(
    loan_id: int,
    librarian_id: int,
    db: Session = Depends(get_db),
):
    """Thủ thư duyệt phiếu mượn (PENDING -> APPROVED)."""
    return approve_loan(db, loan_id, librarian_id)


@router.patch("/{loan_id}/reject", response_model=LoanResponse)
def reject(
    loan_id: int,
    librarian_id: int,
    data: LoanReject,
    db: Session = Depends(get_db),
):
    """Thủ thư từ chối phiếu mượn kèm lý do (PENDING -> REJECTED)."""
    return reject_loan(db, loan_id, librarian_id, data.reject_reason)


@router.post("/{loan_id}/handover", response_model=LoanResponse)
def handover(
    loan_id: int,
    librarian_id: int,
    data: LoanHandover,
    db: Session = Depends(get_db),
):
    """
    Thủ thư giao sách: chọn bản sao cụ thể (nhập/quét mã cuốn),
    chuyển bản sao sang BORROWED bằng hàm của module Bản sao trong transaction,
    tính hạn trả (APPROVED -> BORROWED).
    """
    copies_data = [item.model_dump() for item in data.copies]
    return handover_loan(db, loan_id, librarian_id, copies_data)
