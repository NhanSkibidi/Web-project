from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.BookCopy import BookCopy
from app.models.CopyStatusLog import CopyStatusLog


VALID_TRANSITIONS: dict[str, list[str]] = {
    "AVAILABLE": ["BORROWED", "RESERVED", "LOST", "DAMAGED", "DISPOSED"],
    "BORROWED":  ["AVAILABLE", "LOST", "DAMAGED"],
    "RESERVED":  ["AVAILABLE", "BORROWED", "LOST", "DAMAGED"],
    "LOST":      ["AVAILABLE", "DISPOSED"],
    "DAMAGED":   ["AVAILABLE", "DISPOSED"],
    "DISPOSED":  [],
}


def change_copy_status(
    db: Session,
    book_copy_id: int,
    new_status: str,
) -> BookCopy:
    """Thay đổi trạng thái bản sao sách theo quy tắc chuyển đổi hợp lệ."""
    book_copy = db.query(BookCopy).filter(BookCopy.id == book_copy_id).first()

    if book_copy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy bản sao sách id={book_copy_id}",
        )

    new_status_upper = new_status.upper()

    if new_status_upper not in VALID_TRANSITIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái '{new_status}' không hợp lệ",
        )

    current_status = book_copy.status
    if new_status_upper not in VALID_TRANSITIONS.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Không thể chuyển từ '{current_status}' sang '{new_status_upper}'"
            ),
        )

    try:
        log = CopyStatusLog(
            book_copy_id=book_copy.id,
            old_status=current_status,
            new_status=new_status_upper,
        )
        db.add(log)
        book_copy.status = new_status_upper
        db.commit()
        db.refresh(book_copy)
        return book_copy
    except Exception:
        db.rollback()
        raise
