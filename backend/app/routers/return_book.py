from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.crud.return_book import return_entire_loan, return_single_book_copy
from app.db.session import get_db
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.reservation import Reservation
from app.models.user import User
from app.schemas.return_book import (
    ReturnBulkRequest,
    ReturnItemRequest,
    ReturnItemResponse,
)
from app.services.email_service import send_reservation_ready_email

router = APIRouter(prefix="/returns", tags=["ReturnBook"])


def _notify_next_reservation_if_any(
    db: Session,
    copy_id: int | None,
    background_tasks: BackgroundTasks,
) -> None:
    """
    Khi 1 cuốn sách vừa được trả về AVAILABLE, kiểm tra hàng đợi đặt trước (WAITING).
    Nếu có độc giả đang chờ đầu sách đó -> giữ bản sao (RESERVED), chuyển đặt trước sang READY (hạn 48h)
    và đẩy email thông báo 'Sách đặt trước đã sẵn sàng' chạy nền bằng BackgroundTasks (Task T3D003D).
    """
    if not copy_id:
        return
    copy = db.query(BookCopy).filter(BookCopy.id == copy_id).first()
    if not copy or copy.status != "AVAILABLE":
        return

    next_res = (
        db.query(Reservation)
        .filter(
            Reservation.book_isbn == copy.book_isbn,
            Reservation.status == "WAITING",
        )
        .order_by(Reservation.reserved_at.asc())
        .first()
    )
    if not next_res:
        return

    deadline = datetime.now() + timedelta(hours=48)
    next_res.status = "READY"
    next_res.copy_id = copy.id
    next_res.pickup_deadline = deadline
    copy.status = "RESERVED"
    db.commit()

    reader = db.query(User).filter(User.id == next_res.user_id).first()
    book = db.query(Book).filter(Book.isbn == copy.book_isbn).first()
    if reader and reader.email:
        background_tasks.add_task(
            send_reservation_ready_email,
            to_email=reader.email,
            reader_name=reader.full_name,
            book_title=book.title if book else copy.book_isbn,
            copy_code=copy.copy_code,
            pickup_deadline=deadline.strftime("%d/%m/%Y %H:%M"),
        )


@router.post("/item", response_model=ReturnItemResponse)
def return_one_item(
    payload: ReturnItemRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    result = return_single_book_copy(
        db,
        book_copy_id=payload.book_copy_id,
        copy_code=payload.copy_code,
        barcode=payload.barcode,
    )
    _notify_next_reservation_if_any(db, result.get("copy_id"), background_tasks)
    return result


@router.post("/loan")
def return_full_loan(
    payload: ReturnBulkRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    from app.models.loan_item import LoanItem

    copy_ids = [
        row[0]
        for row in db.query(LoanItem.copy_id)
        .filter(LoanItem.loan_id == payload.loan_id, LoanItem.return_date.is_(None))
        .all()
        if row[0] is not None
    ]
    result = return_entire_loan(db, loan_id=payload.loan_id)
    for cid in copy_ids:
        _notify_next_reservation_if_any(db, cid, background_tasks)
    return result
