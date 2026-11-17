from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.book_copy import BookCopiesCreate
from app.models.BookCopy import BookCopy
from app.models.Book import Book
from app.crud.copy_status_log import change_copy_status
from app.models.CopyStatusLog import CopyStatusLog


def create_copy(book_copies: BookCopiesCreate, db: Session):
    book = db.query(Book).filter(
        Book.isbn == book_copies.book_isbn,
        Book.is_deleted == False  # noqa: E712
    ).first()

    if book is None:
        return "Book not found"

    codes = [c.copy_code.strip() for c in book_copies.copies]
    if len(codes) != len(set(codes)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh sách bản sao chứa mã bản sao trùng lặp trong yêu cầu",
        )

    existing = db.query(BookCopy.copy_code).filter(BookCopy.copy_code.in_(codes)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã bản sao '{existing[0]}' đã tồn tại trong hệ thống",
        )

    new_copies = []
    for copy in book_copies.copies:
        new_book_copie = BookCopy(book_isbn=book.isbn, **copy.model_dump())
        new_copies.append(new_book_copie)

    db.add_all(new_copies)
    db.commit()
    for copy in new_copies:
        db.refresh(copy)

    return new_copies

def get_copy_by_code(db: Session, copy_code: str):
    return db.query(BookCopy).filter(
        BookCopy.copy_code == copy_code
    ).first()

def get_book_copies(
    db: Session,
    book_isbn: str | None = None,
    status: str | None = None,
    shelf_location: str | None = None
):
    query = db.query(BookCopy)

    if book_isbn:
        query = query.filter(BookCopy.book_isbn == book_isbn)

    if status:
        query = query.filter(BookCopy.status == status)

    if shelf_location:
        query = query.filter(BookCopy.shelf_location == shelf_location)

    return query.order_by(BookCopy.id).all()

def report_lost(db: Session, book_copy_id: int, reason: str):
    return change_copy_status(
        db=db,
        book_copy_id=book_copy_id,
        new_status="LOST",
        reason=reason
    )

def report_damaged(db: Session, book_copy_id: int, reason: str):
    return change_copy_status(
        db=db,
        book_copy_id=book_copy_id,
        new_status="DAMAGED",
        reason=reason
    )

def dispose_copy(db: Session, book_copy_id: int, reason: str):
    return change_copy_status(
        db=db,
        book_copy_id=book_copy_id,
        new_status="DISPOSED",
        reason=reason
    )

def get_copy_history(db: Session, book_copy_id: int):
    book_copy = db.query(BookCopy).filter(
        BookCopy.id == book_copy_id).first()

    if not book_copy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bản sao sách"
        )

    return db.query(CopyStatusLog).filter(
        CopyStatusLog.book_copy_id == book_copy_id
    ).order_by(
        CopyStatusLog.changed_at.asc(),
        CopyStatusLog.id.asc()
    ).all()