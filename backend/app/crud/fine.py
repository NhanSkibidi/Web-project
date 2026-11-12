from datetime import datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.fine import Fine
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.loan import Loan
from app.models.loan_item import LoanItem
from app.schemas.fine import FINE_PER_DAY, RATE_DAMAGED, RATE_LOST


def has_unpaid_fines(db: Session, user_id: int) -> bool:
    """Hàm dùng chung cho module Mượn: Kiểm tra độc giả có khoản phạt chưa trả không."""
    unpaid = (
        db.query(Fine.id)
        .filter(
            Fine.user_id == user_id,
            Fine.status == "UNPAID",
            Fine.amount > 0,
        )
        .first()
    )
    return unpaid is not None


def get_unpaid_fines_summary(db: Session, user_id: int) -> dict:
    """Tổng hợp số lượng và tổng số tiền phạt chưa thanh toán của độc giả."""
    fines = (
        db.query(Fine)
        .filter(
            Fine.user_id == user_id,
            Fine.status == "UNPAID",
            Fine.amount > 0,
        )
        .all()
    )
    total_amount = sum(float(f.amount or 0) for f in fines)
    return {
        "user_id": user_id,
        "has_unpaid": len(fines) > 0,
        "unpaid_count": len(fines),
        "total_unpaid_amount": round(total_amount, 2),
    }


def calculate_overdue_days_and_amount(
    due_date: datetime | None, return_date: datetime | None = None
) -> tuple[int, float]:
    """Tính số ngày quá hạn và tiền phạt quá hạn (2.000đ/ngày)."""
    if not due_date:
        return 0, 0.0

    target_return = return_date or datetime.now(timezone.utc)
    return_day = target_return.date() if hasattr(target_return, "date") else target_return
    due_day = due_date.date() if hasattr(due_date, "date") else due_date

    if return_day > due_day:
        overdue_days = (return_day - due_day).days
        amount = float(overdue_days * FINE_PER_DAY)
        return overdue_days, amount

    return 0, 0.0


def create_overdue_fine_if_applicable(
    db: Session,
    loan: Loan,
    loan_item: LoanItem,
    return_time: datetime | None = None,
) -> Fine | None:
    """Tự động tạo khoản phạt quá hạn nếu sách được trả muộn hơn due_date."""
    now = return_time or datetime.now(timezone.utc)
    overdue_days, amount = calculate_overdue_days_and_amount(loan_item.due_date, now)

    if overdue_days > 0 and amount > 0:
        fine = Fine(
            user_id=loan.user_id,
            loan_id=loan.id,
            book_copy_id=loan_item.copy_id,
            fine_type="QUÁ HẠN",
            amount=amount,
            status="UNPAID",
        )
        db.add(fine)
        return fine

    return None


def report_damage_or_lost(
    db: Session,
    issue_type: str,
    book_copy_id: int | None = None,
    copy_code: str | None = None,
    note: str | None = None,
) -> dict:
    """Báo hỏng hoặc báo mất sách: tính tiền phạt theo giá sách và tạo khoản phạt.
    - Hỏng: phạt 50% giá sách, chuyển bản sao sang DAMAGED.
    - Mất: phạt 100% giá sách, chuyển bản sao sang LOST, hoàn tất mượn cho cuốn đó.
    """
    normalized_type = issue_type.strip().upper()
    if normalized_type in ["HỎNG", "HONG", "DAMAGED"]:
        fine_type = "HỎNG"
        rate = RATE_DAMAGED
        new_copy_status = "DAMAGED"
    elif normalized_type in ["MẤT", "MAT", "LOST"]:
        fine_type = "MẤT"
        rate = RATE_LOST
        new_copy_status = "LOST"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại sự cố không hợp lệ. Chọn 'HỎNG' hoặc 'MẤT'",
        )

    # Tìm bản sao sách
    query = db.query(BookCopy)
    if book_copy_id is not None:
        copy = query.filter(BookCopy.id == book_copy_id).first()
    elif copy_code is not None:
        copy = query.filter(BookCopy.copy_code == copy_code).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cần cung cấp book_copy_id hoặc copy_code",
        )

    if not copy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bản sao sách",
        )

    # Tìm lượt mượn đang diễn ra của bản sao này
    loan_item = (
        db.query(LoanItem)
        .filter(LoanItem.copy_id == copy.id, LoanItem.return_date.is_(None))
        .first()
    )

    if not loan_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cuốn sách '{copy.copy_code}' hiện không nằm trong phiếu mượn nào chưa trả",
        )

    loan = db.query(Loan).filter(Loan.id == loan_item.loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiếu mượn tương ứng",
        )

    # Lấy thông tin đầu sách để lấy giá sách
    book = db.query(Book).filter(Book.isbn == copy.book_isbn).first()
    book_price = float(book.price) if (book and book.price is not None) else 0.0

    fine_amount = round(book_price * rate, 2)
    now = datetime.now(timezone.utc)

    # Cập nhật trạng thái bản sao và ghi nhận kết thúc lượt mượn
    copy.status = new_copy_status
    loan_item.return_date = now

    # Tạo bản ghi phạt
    fine = Fine(
        user_id=loan.user_id,
        loan_id=loan.id,
        book_copy_id=copy.id,
        fine_type=fine_type,
        amount=fine_amount,
        status="UNPAID",
        waive_reason=f"Ghi chú: {note}" if note else None,
    )
    db.add(fine)

    # Kiểm tra xem toàn bộ sách trong phiếu đã được trả/xử lý hết chưa
    remaining = (
        db.query(LoanItem)
        .filter(
            LoanItem.loan_id == loan.id,
            LoanItem.id != loan_item.id,
            LoanItem.return_date.is_(None),
        )
        .count()
    )
    if remaining == 0:
        loan.status = "RETURNED"

    db.commit()
    db.refresh(fine)
    db.refresh(copy)

    return {
        "message": f"Đã ghi nhận sách {fine_type.lower()} và tạo khoản phạt thành công",
        "fine_id": fine.id,
        "fine_type": fine_type,
        "amount": fine.amount,
        "book_title": book.title if book else copy.book_isbn,
        "copy_code": copy.copy_code,
        "copy_status": copy.status,
        "status": fine.status,
    }


def pay_fine(db: Session, fine_id: int, collected_by: int | None = None) -> Fine:
    """Thủ thư thu tiền phạt: chuyển trạng thái sang PAID."""
    fine = db.query(Fine).filter(Fine.id == fine_id).first()
    if not fine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy khoản phạt",
        )

    if fine.status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoản phạt này đã được thanh toán trước đó",
        )

    fine.status = "PAID"
    fine.collected_at = datetime.now(timezone.utc)
    fine.collected_by = collected_by

    db.commit()
    db.refresh(fine)
    return fine


def waive_fine(
    db: Session, fine_id: int, waive_reason: str, waived_by: int | None = None
) -> Fine:
    """Thủ thư / Quản trị viên miễn giảm tiền phạt kèm lý do."""
    fine = db.query(Fine).filter(Fine.id == fine_id).first()
    if not fine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy khoản phạt",
        )

    if fine.status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoản phạt đã thanh toán, không thể miễn",
        )

    fine.status = "WAIVED"
    fine.waive_reason = waive_reason
    fine.collected_by = waived_by
    fine.collected_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(fine)
    return fine


def list_fines(
    db: Session,
    user_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Fine]:
    """Lấy danh sách các khoản phạt."""
    query = db.query(Fine)
    if user_id is not None:
        query = query.filter(Fine.user_id == user_id)
    if status is not None:
        query = query.filter(Fine.status == status.upper())
    return query.order_by(Fine.id.desc()).offset(skip).limit(limit).all()

