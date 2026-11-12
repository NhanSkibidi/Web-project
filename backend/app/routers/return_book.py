from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.return_book import (
    ReturnItemRequest,
    ReturnBulkRequest,
    ReturnItemResponse,
)
from app.crud.return_book import return_single_book_copy, return_entire_loan

router = APIRouter(prefix="/returns", tags=["Trả sách"])


@router.post("/item", response_model=ReturnItemResponse)
def return_one_item(payload: ReturnItemRequest, db: Session = Depends(get_db)):
    return return_single_book_copy(
        db,
        book_copy_id=payload.book_copy_id,
        copy_code=payload.copy_code,
        barcode=payload.barcode,
    )


@router.post("/loan")
def return_full_loan(payload: ReturnBulkRequest, db: Session = Depends(get_db)):
    return return_entire_loan(db, loan_id=payload.loan_id)
