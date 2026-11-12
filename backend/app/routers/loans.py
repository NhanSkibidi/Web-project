from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.loan import LoanCreate, LoanResponse
from app.crud.loan_service import create_online_loan, cancel_online_loan

router = APIRouter(prefix="/loans", tags=["Loans"])

@router.post("/online", response_model=LoanResponse, status_code=201)
def create_loan(
    data: LoanCreate,
    user_id: int,                          
    db: Session = Depends(get_db),
):
    return create_online_loan(db, user_id, data.book_isbns)


@router.patch("/{loan_id}/cancel", response_model=LoanResponse)
def cancel_loan(
    loan_id: int,
    user_id: int,                         
    db: Session = Depends(get_db),
):
    return cancel_online_loan(db, loan_id, user_id)
