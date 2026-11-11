from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.models.BookCopy import BookCopy
from app.models.loan import Loan
from app.models.loan_item import LoanItem


def return_single_book_copy(
    db: Session, book_copy_id: int | None = None, barcode: str | None = None
):
    query = db.query(BookCopy)
    if book_copy_id is not None:
        copy = query.filter(BookCopy.id == book_copy_id).first()
    elif barcode is not None:
        copy = query.filter(BookCopy.barcode == barcode).first()
    else:
        raise HTTPException(
            status_code=400, detail="Cần cung cấp book_copy_id hoặc barcode"
        )

    if not copy:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản sao sách")

    loan_item = (
        db.query(LoanItem)
        .filter(LoanItem.book_copy_id == copy.id, LoanItem.returned_at.is_(None))
        .first()
    )

    if not loan_item:
        raise HTTPException(
            status_code=400,
            detail="Cuốn sách này không nằm trong phiếu mượn nào chưa trả",
        )

    try:
        now = datetime.now(timezone.utc)
        loan_item.returned_at = now
        loan_item.status = "RETURNED"
        copy.status = "AVAILABLE"

        loan = db.query(Loan).filter(Loan.id == loan_item.loan_id).first()
        if loan:
            remaining_items = (
                db.query(LoanItem)
                .filter(
                    LoanItem.loan_id == loan.id,
                    LoanItem.id != loan_item.id,
                    LoanItem.returned_at.is_(None),
                )
                .count()
            )
            if remaining_items == 0:
                loan.status = "COMPLETED"

        db.commit()
        db.refresh(loan_item)
        return loan_item
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cơ sở dữ liệu: {str(error)}")


def return_entire_loan(db: Session, loan_id: int):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu mượn")

    items = (
        db.query(LoanItem)
        .filter(LoanItem.loan_id == loan_id, LoanItem.returned_at.is_(None))
        .all()
    )

    if not items:
        raise HTTPException(
            status_code=400, detail="Tất cả sách trong phiếu này đã được trả trước đó"
        )

    try:
        now = datetime.now(timezone.utc)
        for item in items:
            item.returned_at = now
            item.status = "RETURNED"
            copy = db.query(BookCopy).filter(BookCopy.id == item.book_copy_id).first()
            if copy:
                copy.status = "AVAILABLE"

        loan.status = "COMPLETED"
        db.commit()
        return {
            "message": "Đã trả toàn bộ sách trong phiếu thành công",
            "loan_id": loan_id,
        }
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cơ sở dữ liệu: {str(error)}")
