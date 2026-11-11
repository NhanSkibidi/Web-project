from sqlalchemy.orm import Session
from app.models.BookCopy import BookCopy


def change_copy_status(
    db: Session,
    book_copy_id: int,
    new_status: str
):
    valid_transitions = {
        "AVAILABLE": ["BORROWED", "RESERVED", "LOST", "DAMAGED", "DISPOSED"],
        "BORROWED": ["AVAILABLE", "LOST", "DAMAGED"],
        "RESERVED": ["AVAILABLE", "BORROWED", "LOST", "DAMAGED"],
        "LOST": ["AVAILABLE", "DISPOSED"],
        "DAMAGED": ["AVAILABLE", "DISPOSED"],
        "DISPOSED": []
    }

    book_copy = db.query(BookCopy).filter(BookCopy.id == book_copy_id).first()

    if book_copy is None:
        return "This copy was not found"

    current_status = book_copy.status

    if new_status.upper() not in valid_transitions:
        return "invalid status"

    if new_status.upper() not in valid_transitions[current_status]:
        return "change to failed status"

    try:
        book_copy.status = new_status.upper()

        db.commit()
        db.refresh(book_copy)

        return book_copy
    except Exception:
        db.rollback()
        raise
