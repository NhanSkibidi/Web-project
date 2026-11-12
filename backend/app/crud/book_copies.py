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
