from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.dependencies import bearer_scheme, get_current_user
from app.crud.loan_service import (
    approve_loan,
    cancel_online_loan,
    create_online_loan,
    get_loans_history,
    handover_loan,
    reject_loan,
)
from app.db.session import get_db
from app.schemas.loan import LoanCreate, LoanHandover, LoanHistoryOut, LoanReject, LoanResponse

router = APIRouter(prefix="/loans", tags=["Loans"])


def _resolve_user_id(
    explicit_id: int | None,
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> int:
    """Ưu tiên lấy ID từ query param explicit_id nếu có, hoặc tự giải mã từ JWT Bearer Token."""
    if explicit_id is not None:
        return explicit_id
    if credentials is not None:
        user = get_current_user(credentials=credentials, db=db)
        return user.id
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Vui lòng đăng nhập (Bearer Token) hoặc cung cấp user_id/librarian_id",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get("", response_model=list[LoanHistoryOut])
def list_loans(
    user_id: int | None = Query(None, description="Lọc lịch sử mượn trả theo ID độc giả"),
    status: str | None = Query(None, description="Lọc theo trạng thái phiếu: PENDING, APPROVED, BORROWED, RETURNED, REJECTED, CANCELLED"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Lấy danh sách & lịch sử mượn trả sách từ module Mượn."""
    return get_loans_history(db=db, user_id=user_id, status_filter=status, limit=limit)


@router.get("/user/{user_id}", response_model=list[LoanHistoryOut])
def list_loans_by_user(
    user_id: int,
    status: str | None = Query(None, description="Lọc theo trạng thái phiếu"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Lấy toàn bộ lịch sử mượn trả của một độc giả cụ thể (dùng cho trang Chi tiết độc giả)."""
    return get_loans_history(db=db, user_id=user_id, status_filter=status, limit=limit)


@router.post("/online", response_model=LoanResponse, status_code=201)
def create_loan(
    data: LoanCreate,
    user_id: int | None = Query(None, description="ID độc giả (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_user_id = _resolve_user_id(user_id, credentials, db)
    return create_online_loan(db, resolved_user_id, data.book_isbns)


@router.patch("/{loan_id}/cancel", response_model=LoanResponse)
def cancel_loan(
    loan_id: int,
    user_id: int | None = Query(None, description="ID độc giả (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_user_id = _resolve_user_id(user_id, credentials, db)
    return cancel_online_loan(db, loan_id, resolved_user_id)


@router.patch("/{loan_id}/approve", response_model=LoanResponse)
def approve(
    loan_id: int,
    librarian_id: int | None = Query(None, description="ID thủ thư (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_lib_id = _resolve_user_id(librarian_id, credentials, db)
    return approve_loan(db, loan_id, resolved_lib_id)


@router.patch("/{loan_id}/reject", response_model=LoanResponse)
def reject(
    loan_id: int,
    data: LoanReject,
    librarian_id: int | None = Query(None, description="ID thủ thư (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_lib_id = _resolve_user_id(librarian_id, credentials, db)
    return reject_loan(db, loan_id, resolved_lib_id, data.reject_reason)


@router.post("/{loan_id}/handover", response_model=LoanResponse)
def handover(
    loan_id: int,
    data: LoanHandover,
    librarian_id: int | None = Query(None, description="ID thủ thư (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_lib_id = _resolve_user_id(librarian_id, credentials, db)
    copies_data = [item.model_dump() for item in data.copies]
    return handover_loan(db, loan_id, resolved_lib_id, copies_data)
