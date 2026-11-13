from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.BookCopy import BookCopy
from app.models.CopyStatusLog import CopyStatusLog

VALID_TRANSITIONS = {
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
    *,
    auto_commit: bool = True,
) -> BookCopy:
    new_status = new_status.upper()

    book_copy = db.query(BookCopy).filter(BookCopy.id == book_copy_id).first()
    if not book_copy:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản sao")

    current_status = book_copy.status

    if new_status not in VALID_TRANSITIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Trạng thái '{new_status}' không hợp lệ",
        )

    if new_status not in VALID_TRANSITIONS[current_status]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Không thể chuyển bản sao từ '{current_status}' sang '{new_status}'"
            ),
        )

    log = CopyStatusLog(
        book_copy_id=book_copy.id,
        old_status=current_status,
        new_status=new_status,
    )
    db.add(log)

    book_copy.status = new_status

    if auto_commit:
        db.commit()
        db.refresh(book_copy)

    return book_copy
