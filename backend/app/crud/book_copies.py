from sqlalchemy.orm import Session
from app.schemas.book_copy import BookCopiesCreate
from app.models.BookCopy import BookCopy
from app.models.Book import Book


def create_copy(book_copies: BookCopiesCreate, db: Session):
    book = db.query(Book).filter(
        Book.isbn == book_copies.book_isbn
    ).first()

    if book is None:
        return "Book not found"

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