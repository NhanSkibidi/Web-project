from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.loan import BookLoanHistoryResponse
from app.crud.loan_service import get_book_loan_history
from app.crud.book import get_book_by_isbn
from app.db.session import get_db

router = APIRouter(prefix="/loans_item", tags=["loans_item"])

@router.get("/{isbn}/loan-history", response_model=BookLoanHistoryResponse)
def get_book_loan_history_api(isbn: str, db: Session = Depends(get_db)):
    book = get_book_by_isbn(db=db, isbn=isbn)

    if not book:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy đầu sách"
        )

    result = get_book_loan_history(db=db, isbn=isbn)

    items = []

    for loan_item, loan, user, copy in result:
        items.append({
            "loan_code": loan.code,
            "borrower_name": user.full_name,
            "copy_code": copy.copy_code if copy else None,
            "borrow_date": loan.borrowed_at,
            "due_date": loan_item.due_date or loan.due_date,
            "return_date": loan_item.return_date,
            "status": loan.status.value
        })

    return {
        "isbn": isbn,
        "total": len(items),
        "items": items
    }