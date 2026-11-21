from datetime import date, datetime
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.fine import Fine
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.library_card import LibraryCard
from app.models.loan import Loan, LoanStatus
from app.models.loan_item import LoanItem
from app.models.user import User
from app.schemas.fine import FINE_PER_DAY, RATE_DAMAGED, RATE_LOST


def number_to_vietnamese_words(n: float | int) -> str:
    """Chuyển đổi số tiền VNĐ sang chữ tiếng Việt chuẩn cho biên lai."""
    amount = int(round(float(n)))
    if amount <= 0:
        return "Không đồng"

    units = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]

    def read_three_digits(num: int, is_highest: bool = False) -> str:
        hundred = num // 100
        ten = (num % 100) // 10
        unit = num % 10
        res = []

        if hundred > 0 or not is_highest:
            res.append(f"{units[hundred]} trăm")

        if ten > 1:
            res.append(f"{units[ten]} mươi")
            if unit == 1:
                res.append("mốt")
            elif unit == 4:
                res.append("tư")
            elif unit == 5:
                res.append("lăm")
            elif unit > 0:
                res.append(units[unit])
        elif ten == 1:
            res.append("mười")
            if unit == 5:
                res.append("lăm")
            elif unit > 0:
                res.append(units[unit])
        elif ten == 0:
            if unit > 0:
                if hundred > 0 or not is_highest:
                    res.append("lẻ")
                res.append(units[unit])

        return " ".join(res)

    scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"]
    groups = []
    temp = amount
    while temp > 0:
        groups.append(temp % 1000)
        temp //= 1000

    words = []
    for i in range(len(groups) - 1, -1, -1):
        g = groups[i]
        if g > 0:
            part = read_three_digits(g, is_highest=(i == len(groups) - 1))
            words.append(part)
            if scales[i]:
                words.append(scales[i])

    result = " ".join(words).strip()
    if not result:
        return "Không đồng"
    return result[0].upper() + result[1:] + " đồng chẵn"


def fine_to_detail_dict(fine: Fine) -> dict:
    """Biến đổi đối tượng Fine thành dictionary chi tiết kèm thông tin độc giả và sách."""
    user = fine.user
    card_code = None
    if user and user.library_cards:
        cards = sorted(user.library_cards, key=lambda c: c.id, reverse=True)
        if cards:
            card_code = cards[0].card_code

    book_copy = fine.book_copy
    book = book_copy.book if (book_copy and book_copy.book) else None
    collector = fine.collector

    return {
        "id": fine.id,
        "user_id": fine.user_id,
        "user_name": user.full_name if user else f"Độc giả #{fine.user_id}",
        "user_email": user.email if user else "",
        "user_phone": user.phone if user else "",
        "card_code": card_code or "Chưa cấp",
        "loan_id": fine.loan_id,
        "book_copy_id": fine.book_copy_id,
        "copy_code": book_copy.copy_code if book_copy else "N/A",
        "book_title": book.title if book else (book_copy.book_isbn if book_copy else "Không xác định"),
        "book_isbn": book_copy.book_isbn if book_copy else "N/A",
        "book_price": float(book.price) if (book and book.price is not None) else 0.0,
        "fine_type": fine.fine_type,
        "amount": float(fine.amount or 0.0),
        "status": fine.status,
        "collected_by": fine.collected_by,
        "collector_name": collector.full_name if collector else None,
        "collected_at": fine.collected_at,
        "waive_reason": fine.waive_reason,
        "created_at": fine.created_at,
    }


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
    if not loan_item.copy_id:
        return None

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

    book = db.query(Book).filter(Book.isbn == copy.book_isbn).first()
    book_price = float(book.price) if (book and book.price is not None) else 0.0
    fine_amount = round(book_price * rate, 2)
    now = datetime.now()

    copy.status = new_copy_status
    loan_item.return_date = now

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
        loan.status = LoanStatus.RETURNED

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


def pay_fine(
    db: Session,
    fine_id: int,
    collected_by: int | None = None,
    payment_method: str | None = "TIỀN MẶT",
    note: str | None = None,
) -> Fine:
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
            detail="Khoản phạt này đã được thanh toán trước đó",
        )

    if fine.status == "WAIVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoản phạt này đã được miễn, không thể thu tiền",
        )

    fine.status = "PAID"
    fine.collected_at = datetime.now()
    fine.collected_by = collected_by
    if note or payment_method:
        extra_note = f"PT: {payment_method or 'TIỀN MẶT'}" + (f" | {note}" if note else "")
        fine.waive_reason = (f"{fine.waive_reason} | {extra_note}") if fine.waive_reason else extra_note

    db.commit()
    db.refresh(fine)
    return fine


def waive_fine(
    db: Session,
    fine_id: int,
    waive_reason: str,
    waived_by: int | None = None,
) -> Fine:
    """Quản trị viên miễn giảm tiền phạt kèm lý do bắt buộc."""
    reason_clean = (waive_reason or "").strip()
    if not reason_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lý do miễn phạt là bắt buộc và không được để trống",
        )

    fine = db.query(Fine).filter(Fine.id == fine_id).first()
    if not fine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy khoản phạt",
        )

    if fine.status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoản phạt đã thanh toán, không thể miễn giảm",
        )

    if fine.status == "WAIVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoản phạt đã được miễn giảm trước đó",
        )

    fine.status = "WAIVED"
    fine.waive_reason = reason_clean
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
    """Lấy danh sách các khoản phạt cơ bản (cho router cũ)."""
    query = db.query(Fine)
    if user_id is not None:
        query = query.filter(Fine.user_id == user_id)
    if status is not None and status.strip().upper() != "ALL":
        query = query.filter(Fine.status == status.strip().upper())
    return query.order_by(Fine.id.desc()).offset(skip).limit(limit).all()


def list_fines_detailed(
    db: Session,
    user_id: int | None = None,
    status: str | None = None,
    fine_type: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[dict]:
    """Lấy danh sách khoản phạt chi tiết kèm tìm kiếm đa năng và lọc."""
    query = (
        db.query(Fine)
        .outerjoin(User, Fine.user_id == User.id)
        .outerjoin(BookCopy, Fine.book_copy_id == BookCopy.id)
        .outerjoin(Book, BookCopy.book_isbn == Book.isbn)
        .outerjoin(LibraryCard, LibraryCard.reader_id == User.id)
    )

    if user_id is not None:
        query = query.filter(Fine.user_id == user_id)

    if isinstance(status, str) and status.strip().upper() != "ALL":
        query = query.filter(Fine.status == status.strip().upper())

    if isinstance(fine_type, str) and fine_type.strip().upper() != "ALL":
        query = query.filter(Fine.fine_type.ilike(f"%{fine_type.strip()}%"))

    if isinstance(search, str) and search.strip():
        term = f"%{search.strip()}%"
        # Tìm theo: ID phạt, tên độc giả, email, sđt, mã thẻ, mã bản sao, tựa sách
        query = query.filter(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
                User.phone.ilike(term),
                LibraryCard.card_code.ilike(term),
                BookCopy.copy_code.ilike(term),
                Book.title.ilike(term),
                Book.isbn.ilike(term),
            )
        )

    fines = query.distinct().order_by(Fine.id.desc()).offset(skip).limit(limit).all()
    return [fine_to_detail_dict(f) for f in fines]


def get_fine_detail(db: Session, fine_id: int) -> dict:
    """Lấy thông tin chi tiết của một khoản phạt."""
    fine = db.query(Fine).filter(Fine.id == fine_id).first()
    if not fine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy khoản phạt với ID #{fine_id}",
        )
    return fine_to_detail_dict(fine)


def get_fine_statistics(db: Session) -> dict:
    """Thống kê tổng quan số liệu tiền phạt (phục vụ KPI và báo cáo)."""
    fines = db.query(Fine).all()

    total_fines_count = len(fines)
    unpaid_count = 0
    total_unpaid_amount = 0.0
    paid_count = 0
    total_paid_today = 0.0
    waived_count = 0

    today = date.today()

    for f in fines:
        amt = float(f.amount or 0.0)
        st = (f.status or "").upper()
        if st == "UNPAID":
            unpaid_count += 1
            total_unpaid_amount += amt
        elif st == "PAID":
            paid_count += 1
            if f.collected_at:
                c_date = f.collected_at.date() if isinstance(f.collected_at, datetime) else f.collected_at
                if c_date == today:
                    total_paid_today += amt
        elif st == "WAIVED":
            waived_count += 1

    return {
        "total_fines_count": total_fines_count,
        "total_unpaid_amount": round(total_unpaid_amount, 2),
        "unpaid_count": unpaid_count,
        "paid_count": paid_count,
        "total_paid_today": round(total_paid_today, 2),
        "waived_count": waived_count,
    }


def generate_fine_receipt(db: Session, fine_id: int) -> dict:
    """Tạo dữ liệu in ấn biên lai thu tiền phạt chuẩn thư viện."""
    fine = db.query(Fine).filter(Fine.id == fine_id).first()
    if not fine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy khoản phạt với ID #{fine_id}",
        )

    detail = fine_to_detail_dict(fine)
    amount = float(fine.amount or 0.0)

    # Đọc phương thức thanh toán & ghi chú từ waive_reason nếu có
    note = fine.waive_reason or ""
    payment_method = "TIỀN MẶT"
    if "PT:" in note:
        parts = note.split("PT:")
        if len(parts) > 1:
            payment_method = parts[1].split("|")[0].strip()

    receipt_no = f"REC-{fine.id:06d}"
    words = number_to_vietnamese_words(amount)

    collector_role = "Thủ thư ca trực"
    if fine.collector and hasattr(fine.collector, "role"):
        collector_role = getattr(fine.collector.role, "value", str(fine.collector.role))

    return {
        "receipt_no": receipt_no,
        "fine_id": fine.id,
        "created_at": fine.created_at,
        "collected_at": fine.collected_at or fine.created_at,
        "reader_name": detail["user_name"],
        "reader_card_code": detail["card_code"],
        "reader_phone": detail["user_phone"],
        "reader_email": detail["user_email"],
        "book_title": detail["book_title"],
        "copy_code": detail["copy_code"],
        "book_isbn": detail["book_isbn"],
        "fine_type": fine.fine_type,
        "amount": amount,
        "amount_in_words": words,
        "payment_method": payment_method,
        "status": fine.status,
        "collector_name": detail["collector_name"] or "Thủ thư tiếp nhận",
        "collector_role": collector_role,
        "waive_reason": fine.waive_reason,
        "note": note,
    }


def get_my_fines(db: Session, user_id: int) -> dict:
    """Lấy danh sách các khoản phạt của độc giả cá nhân."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin độc giả",
        )

    card_code = None
    if user.library_cards:
        cards = sorted(user.library_cards, key=lambda c: c.id, reverse=True)
        if cards:
            card_code = cards[0].card_code

    fines = (
        db.query(Fine)
        .filter(Fine.user_id == user_id)
        .order_by(Fine.id.desc())
        .all()
    )

    detail_list = [fine_to_detail_dict(f) for f in fines]
    unpaid_list = [f for f in detail_list if f["status"] == "UNPAID"]
    total_unpaid = sum(f["amount"] for f in unpaid_list)

    return {
        "user_id": user.id,
        "user_name": user.full_name,
        "card_code": card_code or "Chưa cấp",
        "total_unpaid_amount": round(total_unpaid, 2),
        "unpaid_count": len(unpaid_list),
        "fines": detail_list,
    }
