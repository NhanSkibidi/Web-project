from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.fine import Fine
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.loan import Loan
from app.models.loan_item import LoanItem
from app.schemas.fine import FINE_PER_DAY, RATE_DAMAGED, RATE_LOST


def has_unpaid_fines(db: Session, user_id: int) -> bool:
    """Kiểm tra độc giả có khoản phạt nào chưa thanh toán hay không."""
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
    """Lấy tổng hợp tiền phạt chưa thanh toán của độc giả."""
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
    """Tính số ngày quá hạn và tiền phạt (2.000đ/ngày)."""
    if not due_date:
        return 0, 0.0

    now = return_date or datetime.now()
    return_day = now.date() if isinstance(now, datetime) else now
    due_day = due_date.date() if isinstance(due_date, datetime) else due_date

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
    """Tự động tạo khoản phạt quá hạn nếu sách trả muộn hơn hạn."""
    now = return_time or datetime.now()
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
    """Báo hỏng hoặc mất sách: tính tiền phạt theo giá bìa sách."""
    t = issue_type.strip().upper()
    if t in ["HỎNG", "HONG", "DAMAGED"]:
        fine_type = "HỎNG"
        rate = RATE_DAMAGED
        new_copy_status = "DAMAGED"
    elif t in ["MẤT", "MAT", "LOST"]:
        fine_type = "MẤT"
        rate = RATE_LOST
        new_copy_status = "LOST"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại sự cố không hợp lệ. Vui lòng chọn 'HỎNG' hoặc 'MẤT'",
        )

    # 1. Tìm bản sao sách
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

    # 2. Tìm lượt mượn chưa trả của cuốn sách này
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
            detail="Không tìm thấy phiếu mượn",
        )

    # 3. Lấy giá sách để tính phạt
    book = db.query(Book).filter(Book.isbn == copy.book_isbn).first()
    book_price = float(book.price) if (book and book.price is not None) else 0.0
    fine_amount = round(book_price * rate, 2)
    now = datetime.now()

    # 4. Cập nhật bản sao và ngày trả của lượt mượn
    copy.status = new_copy_status
    loan_item.return_date = now

    # 5. Tạo khoản phạt mới
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

    # 6. Kiểm tra xem phiếu mượn đã hoàn thành hết sách chưa
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
    """Thủ thư thu tiền phạt: đổi trạng thái sang PAID."""
    fine = db.query(Fine).filter(Fine.id == fine_id).first()
    if not fine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy khoản phạt",
        )

    if fine.status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoản phạt này đã được thanh toán",
        )

    fine.status = "PAID"
    fine.collected_at = datetime.now()
    fine.collected_by = collected_by

    db.commit()
    db.refresh(fine)
    return fine


def waive_fine(
    db: Session, fine_id: int, waive_reason: str, waived_by: int | None = None
) -> Fine:
    """Thủ thư miễn giảm tiền phạt kèm lý do."""
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
    fine.collected_at = datetime.now()

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
        query = query.filter(Fine.status == status.strip().upper())
    return query.order_by(Fine.id.desc()).offset(skip).limit(limit).all()
