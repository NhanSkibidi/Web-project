from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_reader
from app.db.session import get_db
from app.models.user import User
from app.schemas.loan import LoanCreate, LoanResponse
from app.crud.loan_service import create_online_loan, cancel_online_loan

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.post("/online", response_model=LoanResponse, status_code=201)
def create_loan(
    data: LoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    """Độc giả gửi yêu cầu mượn sách online. Yêu cầu Bearer token (vai trò READER)."""
    return create_online_loan(db, current_user.id, data.book_isbns)


@router.patch("/{loan_id}/cancel", response_model=LoanResponse)
def cancel_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    """Độc giả hủy yêu cầu mượn của chính mình (chỉ khi PENDING). Yêu cầu Bearer token (vai trò READER)."""
    return cancel_online_loan(db, loan_id, current_user.id)
