from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.book_copy import BookCopiesCreate, BookCopyResponse
from app.crud.book_copies import create_copy

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
