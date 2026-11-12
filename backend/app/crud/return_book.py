from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.models.BookCopy import BookCopy
from app.models.loan import Loan
from app.models.loan_item import LoanItem


def return_single_book_copy(
    db: Session,
    book_copy_id: int | None = None,
    copy_code: str | None = None,
    barcode: str | None = None,
):
    code = copy_code or barcode
    query = db.query(BookCopy)
    if book_copy_id is not None:
        copy = query.filter(BookCopy.id == book_copy_id).first()
    elif code is not None:
        copy = query.filter(BookCopy.copy_code == code).first()
    else:
        raise HTTPException(
            status_code=400, detail="Cần cung cấp book_copy_id hoặc copy_code"
        )

    if not copy:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản sao sách")

    loan_item = (
        db.query(LoanItem)
        .filter(LoanItem.copy_id == copy.id, LoanItem.return_date.is_(None))
        .first()
    )

    if not loan_item:
        raise HTTPException(
            status_code=400,
            detail="Cuốn sách này không nằm trong phiếu mượn nào chưa trả",
        )

    try:
        now = datetime.now(timezone.utc)
        loan_item.return_date = now
        copy.status = "AVAILABLE"

        loan = db.query(Loan).filter(Loan.id == loan_item.loan_id).first()
        if loan:
            remaining_items = (
                db.query(LoanItem)
                .filter(
                    LoanItem.loan_id == loan.id,
                    LoanItem.id != loan_item.id,
                    LoanItem.return_date.is_(None),
                )
                .count()
            )
            if remaining_items == 0:
                loan.status = "RETURNED"

        db.commit()
        db.refresh(loan_item)
        db.refresh(copy)

        return {
            "loan_item_id": loan_item.id,
            "copy_id": copy.id,
            "book_copy_id": copy.id,
            "copy_code": copy.copy_code,
            "return_date": loan_item.return_date,
            "returned_at": loan_item.return_date,
            "status": "RETURNED",
            "message": "Trả sách thành công",
        }
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cơ sở dữ liệu: {str(error)}")


def return_entire_loan(db: Session, loan_id: int):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu mượn")

    items = (
        db.query(LoanItem)
        .filter(LoanItem.loan_id == loan_id, LoanItem.return_date.is_(None))
        .all()
    )

    if not items:
        raise HTTPException(
            status_code=400, detail="Tất cả sách trong phiếu này đã được trả trước đó"
        )

    try:
        now = datetime.now(timezone.utc)
        for item in items:
            item.return_date = now
            if item.copy_id:
                copy = db.query(BookCopy).filter(BookCopy.id == item.copy_id).first()
                if copy:
                    copy.status = "AVAILABLE"

        loan.status = "RETURNED"
        db.commit()
        return {
            "message": "Đã trả toàn bộ sách trong phiếu thành công",
            "loan_id": loan_id,
            "returned_count": len(items),
            "status": "RETURNED",
        }
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cơ sở dữ liệu: {str(error)}")
