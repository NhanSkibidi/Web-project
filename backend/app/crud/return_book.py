from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.CopyStatusLog import CopyStatusLog
from app.models.fine import Fine
from app.models.library_card import LibraryCard
from app.models.loan import Loan, LoanStatus
from app.models.loan_item import LoanItem
from app.models.reservation import Reservation
from app.models.user import User
from app.crud.fine import (
    calculate_overdue_days_and_amount,
    create_overdue_fine_if_applicable,
)
from app.crud.reservation import assign_copy_to_next_waiting_reservation_in_tx


def _promote_next_reservation_in_tx(
    db: Session,
    copy: BookCopy,
    now: datetime,
) -> dict | None:
    """
    Trong cùng transaction trả sách: nếu có độc giả đang WAITING đặt trước đầu sách này,
    chuyển bản sao sang RESERVED và cập nhật Reservation sang READY (hạn 48h). Không tự commit.
    """
    return assign_copy_to_next_waiting_reservation_in_tx(
        db,
        copy,
        reason_prefix="Giữ sách cho độc giả đặt trước",
        now=now,
    )


def lookup_copy_for_return(db: Session, copy_code: str) -> dict:
    """Tra cứu bản sao đang mượn kèm thông tin phiếu mượn, độc giả, quá hạn và sách mượn cùng phiếu."""
    code = (copy_code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Mã bản sao không được để trống")

    copy = db.query(BookCopy).filter(BookCopy.copy_code == code).first()
    if not copy:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy bản sao có mã '{code}'")

    loan_item = (
        db.query(LoanItem)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.status == LoanStatus.BORROWED,
            LoanItem.copy_id == copy.id,
            LoanItem.return_date.is_(None),
        )
        .order_by(LoanItem.id.desc())
        .first()
    )
    if not loan_item:
        raise HTTPException(
            status_code=400,
            detail=f"Ấn bản '{copy.copy_code}' hiện không nằm trong phiếu mượn nào chưa trả (trạng thái: {copy.status})",
        )

    loan = db.query(Loan).filter(Loan.id == loan_item.loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu mượn gắn với bản sao")

    reader = db.query(User).filter(User.id == loan.user_id).first()
    book = db.query(Book).filter(Book.isbn == copy.book_isbn).first()
    card = (
        db.query(LibraryCard)
        .filter(LibraryCard.reader_id == loan.user_id)
        .order_by(LibraryCard.id.desc())
        .first()
    )

    now = datetime.now()
    eff_due = loan_item.due_date or loan.due_date
    overdue_days, overdue_fine = calculate_overdue_days_and_amount(eff_due, now)

    other_rows = (
        db.query(LoanItem)
        .filter(
            LoanItem.loan_id == loan.id,
            LoanItem.id != loan_item.id,
            LoanItem.return_date.is_(None),
        )
        .all()
    )
    other_borrowed_items = []
    for other in other_rows:
        other_copy = db.query(BookCopy).filter(BookCopy.id == other.copy_id).first() if other.copy_id else None
        other_book = db.query(Book).filter(Book.isbn == other.book_isbn).first()
        other_due = other.due_date or loan.due_date
        o_days, o_fine = calculate_overdue_days_and_amount(other_due, now)
        other_borrowed_items.append({
            "loan_item_id": other.id,
            "copy_id": other.copy_id,
            "copy_code": other_copy.copy_code if other_copy else other.book_isbn,
            "book_isbn": other.book_isbn,
            "book_title": other_book.title if other_book else other.book_isbn,
            "book_price": float(other_book.price) if (other_book and other_book.price is not None) else 0.0,
            "shelf_location": other_copy.shelf_location if other_copy else "Kệ tổng",
            "due_date": other_due.isoformat() if other_due else None,
            "is_overdue": o_days > 0,
            "overdue_days": o_days,
            "overdue_fine_amount": o_fine,
        })

    librarian_name = loan.librarian.full_name if loan.librarian else "Quầy trực"
    return {
        "copy_id": copy.id,
        "copy_code": copy.copy_code,
        "book_isbn": copy.book_isbn,
        "book_title": book.title if book else copy.book_isbn,
        "book_price": float(book.price) if (book and book.price is not None) else 0.0,
        "shelf_location": copy.shelf_location or "Kệ tổng",
        "copy_status": copy.status,
        "condition": copy.condition,
        "is_borrowed": True,
        "loan_id": loan.id,
        "loan_code": f"#{loan.code}",
        "loan_item_id": loan_item.id,
        "borrowed_at": (loan.borrowed_at or loan.created_at).isoformat() if (loan.borrowed_at or loan.created_at) else None,
        "due_date": eff_due.isoformat() if eff_due else None,
        "is_overdue": overdue_days > 0,
        "overdue_days": overdue_days,
        "overdue_fine_amount": overdue_fine,
        "librarian_name": librarian_name,
        "user": {
            "id": reader.id if reader else loan.user_id,
            "full_name": reader.full_name if reader else f"Độc giả #{loan.user_id}",
            "card_code": card.card_code if card else None,
            "student_id": card.card_code if card else f"USER-{loan.user_id}",
            "email": reader.email if reader else "",
            "phone": reader.phone if reader else "",
            "card_status": (
                card.status.value if (card and hasattr(card.status, "value")) else (str(card.status) if card else "UNKNOWN")
            ),
        },
        "other_borrowed_items": other_borrowed_items,
    }


def get_today_return_summary(db: Session) -> dict:
    """Thống kê nhanh số lượt trả sách và tiền phạt đã thu trong ngày hôm nay."""
    now = datetime.now()
    start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0)
    returned_today = (
        db.query(func.count(LoanItem.id))
        .filter(LoanItem.return_date.isnot(None), LoanItem.return_date >= start_of_day)
        .scalar()
        or 0
    )
    fines_collected = (
        db.query(func.coalesce(func.sum(Fine.amount), 0.0))
        .filter(Fine.status == "PAID", Fine.collected_at.isnot(None), Fine.collected_at >= start_of_day)
        .scalar()
        or 0.0
    )
    return {
        "returned_today_count": int(returned_today),
        "fines_collected_today": float(fines_collected),
    }


def return_single_book_copy(
    db: Session,
    book_copy_id: int | None = None,
    copy_code: str | None = None,
    barcode: str | None = None,
    email_queue: list[dict] | None = None,
):
    code = copy_code or barcode
    query = db.query(BookCopy)
    if book_copy_id is not None:
        copy = query.filter(BookCopy.id == book_copy_id).first()
    elif code is not None:
        copy = query.filter(BookCopy.copy_code == code.strip()).first()
    else:
        raise HTTPException(
            status_code=400, detail="Cần cung cấp book_copy_id hoặc copy_code"
        )

    if not copy:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản sao sách")

    loan_item = (
        db.query(LoanItem)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.status == LoanStatus.BORROWED,
            LoanItem.copy_id == copy.id,
            LoanItem.return_date.is_(None),
        )
        .order_by(LoanItem.id.desc())
        .first()
    )

    if not loan_item:
        raise HTTPException(
            status_code=400,
            detail="Cuốn sách này không nằm trong phiếu mượn nào chưa trả",
        )

    try:
        now = datetime.now()
        old_status = copy.status
        loan_item.return_date = now
        copy.status = "AVAILABLE"

        db.add(
            CopyStatusLog(
                book_copy_id=copy.id,
                old_status=old_status,
                new_status="AVAILABLE",
                reason="Trả sách tại quầy",
            )
        )

        loan = db.query(Loan).filter(Loan.id == loan_item.loan_id).first()
        fine = None
        if loan:
            fine = create_overdue_fine_if_applicable(db, loan, loan_item, now)
            remaining_items = (
                db.query(LoanItem)
                .filter(
                    LoanItem.loan_id == loan.id,
                    LoanItem.id != loan_item.id,
                    LoanItem.return_date.is_(None),
                )
                .count()
            )
            if remaining_items == 0:
                loan.status = LoanStatus.RETURNED

        # Chuyển bản sao cho độc giả đặt trước (nếu có) trong CÙNG 1 transaction
        res_info = _promote_next_reservation_in_tx(db, copy, now)

        db.commit()
        db.refresh(loan_item)
        db.refresh(copy)
        if fine:
            db.refresh(fine)

        if res_info and res_info.get("to_email") and email_queue is not None:
            email_queue.append({
                "to_email": res_info["to_email"],
                "reader_name": res_info["reader_name"],
                "book_title": res_info["book_title"],
                "copy_code": res_info["copy_code"],
                "pickup_deadline": res_info["pickup_deadline"],
            })

        msg = "Trả sách thành công"
        if fine:
            msg += " (có phát sinh phạt quá hạn)"
        if res_info:
            msg += f" — Đã giữ sách cho độc giả đặt trước ({res_info['reader_name']})"

        return {
            "loan_item_id": loan_item.id,
            "copy_id": copy.id,
            "book_copy_id": copy.id,
            "copy_code": copy.copy_code,
            "return_date": loan_item.return_date,
            "returned_at": loan_item.return_date,
            "status": "RETURNED",
            "message": msg,
            "fine_id": fine.id if fine else None,
            "overdue_fine_amount": fine.amount if fine else 0.0,
            "reservation_notified": bool(res_info),
            "reserved_for_reader": res_info["reader_name"] if res_info else None,
        }
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cơ sở dữ liệu: {str(error)}")


def return_entire_loan(
    db: Session,
    loan_id: int,
    email_queue: list[dict] | None = None,
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu mượn")

    if loan.status != LoanStatus.BORROWED:
        st_val = loan.status.value if hasattr(loan.status, "value") else str(loan.status)
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ có thể trả phiếu đang mượn (trạng thái hiện tại: {st_val})",
        )

    items = (
        db.query(LoanItem)
        .filter(LoanItem.loan_id == loan_id, LoanItem.return_date.is_(None))
        .all()
    )

    if not items:
        raise HTTPException(
            status_code=400, detail="Tất cả sách trong phiếu này đã được trả trước đó"
        )

    try:
        now = datetime.now()
        fines_created = []
        promoted_readers = []
        pending_emails = []

        for item in items:
            item.return_date = now
            copy = None
            if item.copy_id:
                copy = db.query(BookCopy).filter(BookCopy.id == item.copy_id).first()
                if copy:
                    old_status = copy.status
                    copy.status = "AVAILABLE"
                    db.add(
                        CopyStatusLog(
                            book_copy_id=copy.id,
                            old_status=old_status,
                            new_status="AVAILABLE",
                            reason=f"Trả toàn bộ phiếu #{loan.code}",
                        )
                    )
            fine = create_overdue_fine_if_applicable(db, loan, item, now)
            if fine:
                fines_created.append(fine)
            if copy:
                res_info = _promote_next_reservation_in_tx(db, copy, now)
                if res_info:
                    promoted_readers.append(res_info["reader_name"])
                    if res_info.get("to_email"):
                        pending_emails.append({
                            "to_email": res_info["to_email"],
                            "reader_name": res_info["reader_name"],
                            "book_title": res_info["book_title"],
                            "copy_code": res_info["copy_code"],
                            "pickup_deadline": res_info["pickup_deadline"],
                        })

        loan.status = LoanStatus.RETURNED
        db.commit()

        for f in fines_created:
            db.refresh(f)
        if email_queue is not None:
            email_queue.extend(pending_emails)

        total_fine = sum(f.amount for f in fines_created)
        return {
            "message": "Đã trả toàn bộ sách trong phiếu thành công",
            "loan_id": loan_id,
            "returned_count": len(items),
            "status": "RETURNED",
            "fines_created_count": len(fines_created),
            "fine_ids": [f.id for f in fines_created],
            "total_fines_amount": total_fine,
            "reservations_notified": len(promoted_readers),
        }
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cơ sở dữ liệu: {str(error)}")
