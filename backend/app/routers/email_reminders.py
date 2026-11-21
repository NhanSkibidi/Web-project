"""
Router gửi Email nhắc hạn trả sách & thông báo đặt trước sẵn sàng (Task Bonus T3D003D).
Sử dụng FastAPI BackgroundTasks để gửi SMTP không chặn (non-blocking) phản hồi HTTP.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud.loan_service import get_due_soon_loans, get_overdue_loans
from app.db.session import get_db
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.reservation import Reservation
from app.models.user import User
from app.services.email_service import (
    send_due_soon_reminder_email,
    send_email_smtp,
    send_overdue_reminder_email,
    send_reservation_ready_email,
)

router = APIRouter(prefix="/emails", tags=["Email Reminders (Bonus)"])


class TestEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str = "[UniLib KS25] Kiểm tra kết nối SMTP Gmail"
    message: str = "Hệ thống gửi email tự động UniLib KS25 qua Gmail SMTP đã hoạt động thành công!"


@router.get("/status")
def get_smtp_status():
    """Kiểm tra trạng thái cấu hình SMTP (Gmail App Password hoặc chế độ Dry-Run)."""
    return {
        "smtp_configured": settings.smtp_configured,
        "mode": "smtp" if settings.smtp_configured else "dry_run",
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_user": settings.SMTP_USER or "(chưa cấu hình trong .env)",
        "from_name": settings.SMTP_FROM_NAME,
    }


@router.post("/remind-overdue")
def trigger_overdue_emails(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Quét toàn bộ sách quá hạn và xếp hàng gửi email nhắc trả chạy nền (BackgroundTasks).
    """
    overdue_data = get_overdue_loans(db, limit=500)
    items = overdue_data.get("items", [])
    queued = 0

    for item in items:
        email = item.get("reader_email")
        if not email:
            continue
        background_tasks.add_task(
            send_overdue_reminder_email,
            to_email=email,
            reader_name=item["reader_name"],
            loan_code=item["loan_code"],
            book_title=item["book_title"],
            due_date=item["due_date"],
            days_overdue=item["days_overdue"],
            estimated_fine=item["estimated_fine"],
        )
        queued += 1

    return {
        "queued_emails": queued,
        "total_overdue_items": len(items),
        "mode": "smtp" if settings.smtp_configured else "dry_run",
        "message": f"Đã xếp hàng gửi {queued} email cảnh báo quá hạn chạy nền bằng BackgroundTasks.",
    }


@router.post("/remind-due-soon")
def trigger_due_soon_emails(
    background_tasks: BackgroundTasks,
    days: int = Query(default=2, ge=1, le=7, description="Số ngày sắp đến hạn (mặc định 2 ngày)"),
    db: Session = Depends(get_db),
):
    """
    Quét toàn bộ sách sắp đến hạn trong vòng `days` ngày và gửi email nhắc trả chạy nền.
    """
    due_soon_data = get_due_soon_loans(db, days=days, limit=500)
    items = due_soon_data.get("items", [])
    queued = 0

    for item in items:
        email = item.get("reader_email")
        if not email:
            continue
        background_tasks.add_task(
            send_due_soon_reminder_email,
            to_email=email,
            reader_name=item["reader_name"],
            loan_code=item["loan_code"],
            book_title=item["book_title"],
            due_date=item["due_date"],
            days_remaining=item["days_remaining"],
        )
        queued += 1

    return {
        "queued_emails": queued,
        "total_due_soon_items": len(items),
        "days_window": days,
        "mode": "smtp" if settings.smtp_configured else "dry_run",
        "message": f"Đã xếp hàng gửi {queued} email nhắc hạn (trong {days} ngày) chạy nền bằng BackgroundTasks.",
    }


@router.post("/notify-reservation-ready/{reservation_id}")
def trigger_reservation_ready_email(
    reservation_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Gửi email thông báo sách đặt trước đã sẵn sàng cho độc giả (chạy nền BackgroundTasks).
    """
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đặt trước")

    reader = db.query(User).filter(User.id == reservation.user_id).first()
    if not reader or not reader.email:
        raise HTTPException(status_code=400, detail="Độc giả không có địa chỉ email hợp lệ")

    book = db.query(Book).filter(Book.isbn == reservation.book_isbn).first()
    copy = db.query(BookCopy).filter(BookCopy.id == reservation.copy_id).first() if reservation.copy_id else None

    deadline_dt = reservation.pickup_deadline or (datetime.now() + timedelta(hours=48))
    deadline_str = deadline_dt.strftime("%d/%m/%Y %H:%M")

    background_tasks.add_task(
        send_reservation_ready_email,
        to_email=reader.email,
        reader_name=reader.full_name,
        book_title=book.title if book else reservation.book_isbn,
        copy_code=copy.copy_code if copy else "Đang giữ tại quầy",
        pickup_deadline=deadline_str,
    )

    return {
        "reservation_id": reservation.id,
        "to_email": reader.email,
        "reader_name": reader.full_name,
        "book_title": book.title if book else reservation.book_isbn,
        "pickup_deadline": deadline_str,
        "mode": "smtp" if settings.smtp_configured else "dry_run",
        "message": f"Đã xếp hàng gửi email báo sách đặt trước sẵn sàng tới {reader.email}.",
    }


@router.post("/test")
def send_test_email(
    payload: TestEmailRequest,
    background_tasks: BackgroundTasks,
):
    """Gửi 1 email thử nghiệm chạy nền bằng BackgroundTasks để kiểm tra cấu hình Gmail SMTP."""
    html = f"<p>{payload.message}</p><p><em>Thời điểm gửi: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</em></p>"
    background_tasks.add_task(
        send_email_smtp,
        to_email=str(payload.to_email),
        subject=payload.subject,
        html_body=html,
        text_body=payload.message,
    )
    return {
        "queued": True,
        "to_email": str(payload.to_email),
        "mode": "smtp" if settings.smtp_configured else "dry_run",
        "message": "Đã đưa email kiểm tra vào hàng đợi BackgroundTasks.",
    }
