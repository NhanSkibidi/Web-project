from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.book_copy import BookCopiesCreate, BookCopyUpdate
from app.models.BookCopy import BookCopy
from app.models.Book import Book
from app.crud.copy_status_log import change_copy_status
from app.crud.reservation import assign_copy_to_next_waiting_reservation_in_tx
from app.models.CopyStatusLog import CopyStatusLog


def create_copy(book_copies: BookCopiesCreate, db: Session):
    book = db.query(Book).filter(
        Book.isbn == book_copies.book_isbn,
        Book.is_deleted == False  # noqa: E712
    ).first()

    if book is None:
        return "Book not found"

    existing_count = db.query(BookCopy).filter(BookCopy.book_isbn == book.isbn).count()
    new_copies = []
    codes = []
    
    for i, copy in enumerate(book_copies.copies):
        code = copy.copy_code.strip() if copy.copy_code else ""
        if not code:
            seq = existing_count + i + 1
            code = f"BC-{book.isbn}-{seq:02d}"
            # Đảm bảo mã sinh ra không bị trùng
            while db.query(BookCopy).filter(BookCopy.copy_code == code).first():
                seq += 1
                code = f"BC-{book.isbn}-{seq:02d}"
        codes.append(code)
        
        copy_dict = copy.model_dump()
        copy_dict["copy_code"] = code
        new_book_copy = BookCopy(book_isbn=book.isbn, **copy_dict)
        new_copies.append(new_book_copy)

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

    db.add_all(new_copies)
    db.flush()
    for copy in new_copies:
        if copy.status == "AVAILABLE":
            assign_copy_to_next_waiting_reservation_in_tx(
                db,
                copy,
                reason_prefix="Bản sao mới nhập giữ cho độc giả đặt trước",
            )
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


def update_book_copy(db: Session, book_copy_id: int, data: BookCopyUpdate):
    copy = db.query(BookCopy).filter(BookCopy.id == book_copy_id).first()
    if not copy:
        return None
    if data.status is not None and data.status != copy.status:
        change_copy_status(
            db=db,
            book_copy_id=book_copy_id,
            new_status=data.status,
            reason="Cập nhật trạng thái từ thủ thư",
            auto_commit=False
        )
    if data.shelf_location is not None:
        copy.shelf_location = data.shelf_location
    if data.condition is not None:
        copy.condition = data.condition
    db.flush()
    if copy.status == "AVAILABLE":
        assign_copy_to_next_waiting_reservation_in_tx(
            db,
            copy,
            reason_prefix="Bản sao khả dụng trở lại giữ cho độc giả đặt trước",
        )
    db.commit()
    db.refresh(copy)
    return copy
