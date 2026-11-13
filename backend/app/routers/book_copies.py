from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.book_copy import BookCopiesCreate, BookCopyResponse
from app.crud.book_copies import create_copy, get_book_copies, get_copy_by_code

router = APIRouter(prefix="/book_copies", tags=["BookCopies"])


@router.post("", response_model=list[BookCopyResponse], status_code=status.HTTP_201_CREATED)
def create_book_copies(book_copies: BookCopiesCreate, db: Session = Depends(get_db)):
    new_copies = create_copy(book_copies=book_copies, db=db)
    if new_copies == "Book not found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tồn tại mã đầu sách này"
        )
    return new_copies

@router.get("/code/{copy_code}", response_model=BookCopyResponse)
def get_book_copy_by_code(copy_code: str, db: Session = Depends(get_db)):
    book_copy = get_copy_by_code(db, copy_code)

    if not book_copy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bản sao"
        )

    return book_copy

@router.get("", response_model=list[BookCopyResponse])
def get_book_copies_api(
    book_isbn: str | None = None,
    status: str | None = None,
    shelf_location: str | None = None,
    db: Session = Depends(get_db)
):
    return get_book_copies(
        db=db,
        book_isbn=book_isbn,
        status=status,
        shelf_location=shelf_location
    )