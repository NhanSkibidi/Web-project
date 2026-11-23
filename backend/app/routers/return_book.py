from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_librarian
from app.crud.return_book import (
    get_today_return_summary,
    lookup_copy_for_return,
    return_entire_loan,
    return_single_book_copy,
)
from app.db.session import get_db
from app.schemas.return_book import (
    ReturnBulkRequest,
    ReturnItemRequest,
    ReturnItemResponse,
)
from app.services.email_service import send_reservation_ready_email

router = APIRouter(
    prefix="/returns",
    tags=["ReturnBook"],
    dependencies=[Depends(require_librarian)],
)


@router.get("/lookup/{copy_code}")
def lookup_return_item(
    copy_code: str,
    db: Session = Depends(get_db),
):
    """Tra cứu bản sao đang mượn để hiển thị thông tin độc giả, hạn trả và tiền phạt dự kiến tại quầy."""
    return lookup_copy_for_return(db, copy_code=copy_code)


@router.get("/today-summary")
def read_today_return_summary(db: Session = Depends(get_db)):
    """Lấy số lượt trả sách và tiền phạt đã thu trong ngày hôm nay."""
    return get_today_return_summary(db)


@router.post("/item", response_model=ReturnItemResponse)
def return_one_item(
    payload: ReturnItemRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    email_queue: list[dict] = []
    result = return_single_book_copy(
        db,
        book_copy_id=payload.book_copy_id,
        copy_code=payload.copy_code,
        barcode=payload.barcode,
        email_queue=email_queue,
    )
    for mail_args in email_queue:
        background_tasks.add_task(send_reservation_ready_email, **mail_args)
    return result


@router.post("/loan")
def return_full_loan(
    payload: ReturnBulkRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    email_queue: list[dict] = []
    result = return_entire_loan(
        db,
        loan_id=payload.loan_id,
        email_queue=email_queue,
    )
    for mail_args in email_queue:
        background_tasks.add_task(send_reservation_ready_email, **mail_args)
    return result
