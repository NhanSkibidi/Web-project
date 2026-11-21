"""CRUD & Nghiệp vụ quản lý Độc giả và Thẻ thư viện dành cho Thủ thư / Admin."""
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.Book import Book
from app.models.card_action_log import CardActionLog
from app.models.fine import Fine
from app.models.library_card import CardStatus, CardType, LibraryCard
from app.models.loan import Loan, LoanStatus
from app.models.loan_item import LoanItem
from app.models.user import User, UserRole

MAX_BOOKS_BY_TYPE = {
    CardType.STANDARD: 5,
    CardType.STUDENT: 3,
    CardType.VIP: 10,
}


def _add_months(source_date: date, months: int) -> date:
    """Cộng thêm số tháng vào một ngày (xử lý an toàn cho ngày cuối tháng như 29/2, 31/...)."""
    month = source_date.month - 1 + months
    year = source_date.year + month // 12
    month = month % 12 + 1
    days_in_month = [
        31,
        29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ][month - 1]
    day = min(source_date.day, days_in_month)
    return date(year, month, day)


def sync_card_expiration(
    db: Session,
    card: LibraryCard | None,
    commit: bool = True,
) -> bool:
    """
    Kiểm tra 1 thẻ thư viện: nếu thẻ đang ACTIVE mà expiry_date < hôm nay
    thì tự động chuyển trạng thái sang EXPIRED và ghi log.
    Trả về True nếu thẻ vừa được chuyển sang EXPIRED.
    """
    if not card:
        return False

    today = date.today()
    if card.status == CardStatus.ACTIVE and card.expiry_date and card.expiry_date < today:
        old_status = card.status.value if isinstance(card.status, CardStatus) else str(card.status)
        card.status = CardStatus.EXPIRED
        log = CardActionLog(
            card_id=card.id,
            reader_id=card.reader_id,
            action="AUTO_EXPIRE",
            old_status=old_status,
            new_status=CardStatus.EXPIRED.value,
            reason=f"Thẻ tự động chuyển EXPIRED khi kiểm tra (Hạn: {card.expiry_date.isoformat()})",
            old_expiry_date=card.expiry_date,
            new_expiry_date=card.expiry_date,
            performed_by=None,
        )
        db.add(log)
        if commit:
            db.commit()
            db.refresh(card)
        return True

    return False


def sync_all_expired_cards(db: Session) -> int:
    """
    Quét toàn bộ các thẻ đang ở trạng thái ACTIVE nhưng đã quá ngày hết hạn,
    tự động chuyển sang EXPIRED. Trả về số lượng thẻ vừa được chuyển.
    """
    today = date.today()
    overdue_cards = (
        db.query(LibraryCard)
        .filter(
            LibraryCard.status == CardStatus.ACTIVE,
            LibraryCard.expiry_date < today,
        )
        .all()
    )

    if not overdue_cards:
        return 0

    for card in overdue_cards:
        sync_card_expiration(db, card, commit=False)

    db.commit()
    return len(overdue_cards)


def _get_latest_lock_reason(db: Session, card_id: int) -> str | None:
    """Lấy lý do thao tác gần nhất (đặc biệt là lý do khoá/mở thẻ)."""
    latest_log = (
        db.query(CardActionLog)
        .filter(CardActionLog.card_id == card_id)
        .order_by(CardActionLog.id.desc())
        .first()
    )
    return latest_log.reason if latest_log else None


def _build_reader_summary(db: Session, reader: User, card: LibraryCard | None) -> dict:
    """Tổng hợp dữ liệu tóm tắt của 1 độc giả & thẻ."""
    today = date.today()
    now = datetime.now()

    days_remaining = None
    lock_reason = None
    if card:
        if card.expiry_date:
            days_remaining = (card.expiry_date - today).days
        lock_reason = _get_latest_lock_reason(db, card.id)

    borrowed_count = (
        db.query(func.count(LoanItem.id))
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.user_id == reader.id,
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
        )
        .scalar()
        or 0
    )

    pending_count = (
        db.query(func.count(LoanItem.id))
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.user_id == reader.id,
            Loan.status == LoanStatus.PENDING,
        )
        .scalar()
        or 0
    )

    overdue_count = (
        db.query(func.count(LoanItem.id))
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.user_id == reader.id,
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date < now,
        )
        .scalar()
        or 0
    )

    unpaid_fine_amount = (
        db.query(func.coalesce(func.sum(Fine.amount), 0.0))
        .filter(
            Fine.user_id == reader.id,
            Fine.status == "UNPAID",
            Fine.amount > 0,
        )
        .scalar()
        or 0.0
    )

    user_status_str = reader.status.value if hasattr(reader.status, "value") else str(reader.status)

    return {
        "reader_id": reader.id,
        "full_name": reader.full_name,
        "email": reader.email,
        "phone": reader.phone,
        "user_status": user_status_str,
        "card_id": card.id if card else None,
        "card_code": card.card_code if card else None,
        "card_type": card.card_type if card else None,
        "issue_date": card.issue_date if card else None,
        "expiry_date": card.expiry_date if card else None,
        "max_borrow_books": card.max_borrow_books if card else 5,
        "card_status": card.status if card else None,
        "days_remaining": days_remaining,
        "lock_reason": lock_reason,
        "borrowed_count": int(borrowed_count),
        "pending_count": int(pending_count),
        "overdue_count": int(overdue_count),
        "unpaid_fine_amount": round(float(unpaid_fine_amount), 2),
    }


def search_readers_and_cards(
    db: Session,
    keyword: str | None = None,
    status_filter: str | None = None,
    card_type_filter: str | None = None,
) -> dict:
    """
    Tìm kiếm độc giả & thẻ theo:
    - Tên độc giả (full_name)
    - Mã thẻ (card_code, VD: LC-0001)
    - Số điện thoại (phone)
    - Email (email)
    Tự động chuyển các thẻ quá hạn sang EXPIRED trước khi trả kết quả.
    """
    auto_expired_now = sync_all_expired_cards(db)

    # Lấy toàn bộ độc giả (READER)
    readers_query = db.query(User).filter(User.role == UserRole.READER).order_by(User.id.asc())
    readers = readers_query.all()

    all_summaries = []
    active_count = 0
    expired_count = 0
    locked_count = 0

    for reader in readers:
        card = (
            db.query(LibraryCard)
            .filter(LibraryCard.reader_id == reader.id)
            .order_by(LibraryCard.id.desc())
            .first()
        )
        if card:
            sync_card_expiration(db, card, commit=True)
            if card.status == CardStatus.ACTIVE:
                active_count += 1
            elif card.status == CardStatus.EXPIRED:
                expired_count += 1
            elif card.status == CardStatus.LOCKED:
                locked_count += 1

        summary = _build_reader_summary(db, reader, card)
        all_summaries.append(summary)

    # Áp dụng bộ lọc từ khoá (Tên / Mã thẻ / SĐT / Email)
    filtered = all_summaries
    if keyword and keyword.strip():
        kw = keyword.strip().lower()
        filtered = [
            item
            for item in filtered
            if kw in (item["full_name"] or "").lower()
            or kw in (item["card_code"] or "").lower()
            or kw in (item["phone"] or "").lower()
            or kw in (item["email"] or "").lower()
        ]

    # Lọc theo trạng thái thẻ (ACTIVE / EXPIRED / LOCKED)
    if status_filter and status_filter.strip():
        st = status_filter.strip().upper()
        filtered = [
            item
            for item in filtered
            if item["card_status"] and (
                (item["card_status"].value if hasattr(item["card_status"], "value") else str(item["card_status"])) == st
            )
        ]

    # Lọc theo hạng thẻ (STANDARD / STUDENT / VIP)
    if card_type_filter and card_type_filter.strip():
        ct = card_type_filter.strip().upper()
        filtered = [
            item
            for item in filtered
            if item["card_type"] and (
                (item["card_type"].value if hasattr(item["card_type"], "value") else str(item["card_type"])) == ct
            )
        ]

    return {
        "items": filtered,
        "total": len(filtered),
        "active_count": active_count,
        "expired_count": expired_count,
        "locked_count": locked_count,
        "auto_expired_now": auto_expired_now,
    }


def get_reader_card_detail(
    db: Session,
    reader_id: int | None = None,
    card_id: int | None = None,
    card_code: str | None = None,
) -> dict:
    """
    Xem chi tiết Độc giả & Thẻ thư viện (theo reader_id, card_id hoặc card_code).
    Tự động kiểm tra và chuyển trạng thái EXPIRED nếu thẻ đã quá hạn.
    """
    card: LibraryCard | None = None
    reader: User | None = None

    if card_id is not None:
        card = db.query(LibraryCard).filter(LibraryCard.id == card_id).first()
        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thẻ thư viện")
        reader = db.query(User).filter(User.id == card.reader_id).first()
    elif card_code is not None:
        card = (
            db.query(LibraryCard)
            .filter(func.lower(LibraryCard.card_code) == card_code.strip().lower())
            .first()
        )
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy thẻ thư viện có mã '{card_code}'",
            )
        reader = db.query(User).filter(User.id == card.reader_id).first()
    elif reader_id is not None:
        reader = db.query(User).filter(User.id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy độc giả")
        card = (
            db.query(LibraryCard)
            .filter(LibraryCard.reader_id == reader.id)
            .order_by(LibraryCard.id.desc())
            .first()
        )
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thiếu thông tin định danh độc giả/thẻ")

    if not reader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản độc giả")

    # Tự động chuyển EXPIRED nếu quá hạn khi kiểm tra
    if card:
        sync_card_expiration(db, card, commit=True)

    summary = _build_reader_summary(db, reader, card)

    # Lấy danh sách phiếu mượn gần đây của độc giả
    loans = (
        db.query(Loan)
        .filter(Loan.user_id == reader.id)
        .order_by(Loan.id.desc())
        .limit(10)
        .all()
    )
    recent_loans = []
    for ln in loans:
        items_info = []
        for li in ln.loan_items:
            book = db.query(Book).filter(Book.isbn == li.book_isbn).first()
            items_info.append({
                "loan_item_id": li.id,
                "book_isbn": li.book_isbn,
                "book_title": book.title if book else li.book_isbn,
                "copy_id": li.copy_id,
                "due_date": li.due_date,
                "return_date": li.return_date,
            })
        recent_loans.append({
            "loan_id": ln.id,
            "borrow_type": ln.borrow_type.value if hasattr(ln.borrow_type, "value") else str(ln.borrow_type),
            "status": ln.status.value if hasattr(ln.status, "value") else str(ln.status),
            "created_at": ln.created_at,
            "borrowed_at": ln.borrowed_at,
            "due_date": ln.due_date,
            "items": items_info,
        })

    # Lấy danh sách khoản phạt chưa thanh toán
    fines = (
        db.query(Fine)
        .filter(Fine.user_id == reader.id, Fine.status == "UNPAID", Fine.amount > 0)
        .order_by(Fine.id.desc())
        .all()
    )
    unpaid_fines = [
        {
            "id": f.id,
            "loan_id": f.loan_id,
            "book_copy_id": f.book_copy_id,
            "fine_type": f.fine_type,
            "amount": f.amount,
            "status": f.status,
            "created_at": f.created_at,
        }
        for f in fines
    ]

    # Lấy lịch sử thao tác thẻ (Gia hạn, Khoá/Mở thẻ, Tự động hết hạn)
    logs_out = []
    if card:
        logs = (
            db.query(CardActionLog)
            .filter(CardActionLog.card_id == card.id)
            .order_by(CardActionLog.id.desc())
            .limit(20)
            .all()
        )
        for lg in logs:
            performer_name = None
            if lg.performed_by:
                staff = db.query(User).filter(User.id == lg.performed_by).first()
                if staff:
                    performer_name = staff.full_name
            logs_out.append({
                "id": lg.id,
                "card_id": lg.card_id,
                "reader_id": lg.reader_id,
                "action": lg.action,
                "old_status": lg.old_status,
                "new_status": lg.new_status,
                "reason": lg.reason,
                "old_expiry_date": lg.old_expiry_date,
                "new_expiry_date": lg.new_expiry_date,
                "performed_by": lg.performed_by,
                "performer_name": performer_name or "Hệ thống tự động",
                "created_at": lg.created_at,
            })

    return {
        **summary,
        "created_at": reader.created_at,
        "unpaid_fines_count": len(unpaid_fines),
        "recent_loans": recent_loans,
        "unpaid_fines": unpaid_fines,
        "card_logs": logs_out,
    }


def extend_library_card(
    db: Session,
    card: LibraryCard,
    months: int = 12,
    new_expiry_date: date | None = None,
    card_type: CardType | None = None,
    reason: str | None = None,
    performed_by: int | None = None,
) -> dict:
    """
    Gia hạn thẻ thư viện cho độc giả:
    - Nếu thẻ đang bị LOCKED -> từ chối, yêu cầu mở khoá thẻ trước.
    - Nếu thẻ còn hạn -> cộng thêm `months` vào `expiry_date` hiện tại.
    - Nếu thẻ đã hết hạn -> cộng thêm `months` tính từ ngày hôm nay (`date.today()`).
    - Tự động chuyển trạng thái từ EXPIRED về ACTIVE khi gia hạn.
    """
    sync_card_expiration(db, card, commit=False)

    if card.status == CardStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thẻ thư viện đang bị khóa. Vui lòng mở khóa thẻ trước khi gia hạn.",
        )

    today = date.today()
    old_expiry = card.expiry_date
    old_status = card.status.value if hasattr(card.status, "value") else str(card.status)

    if new_expiry_date is not None:
        if new_expiry_date <= today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ngày hết hạn mới phải sau ngày hôm nay",
            )
        target_expiry = new_expiry_date
    else:
        base_date = card.expiry_date if (card.expiry_date and card.expiry_date >= today) else today
        target_expiry = _add_months(base_date, months)

    if card_type is not None:
        card.card_type = card_type
        card.max_borrow_books = MAX_BOOKS_BY_TYPE.get(card_type, card.max_borrow_books)

    card.expiry_date = target_expiry
    card.status = CardStatus.ACTIVE

    note_text = (reason or "").strip() or f"Gia hạn thẻ thêm {months} tháng (đến {target_expiry.isoformat()})"
    log = CardActionLog(
        card_id=card.id,
        reader_id=card.reader_id,
        action="EXTEND",
        old_status=old_status,
        new_status=CardStatus.ACTIVE.value,
        reason=note_text,
        old_expiry_date=old_expiry,
        new_expiry_date=target_expiry,
        performed_by=performed_by,
    )
    db.add(log)
    db.commit()
    db.refresh(card)

    return get_reader_card_detail(db, card_id=card.id)


def lock_or_unlock_card(
    db: Session,
    card: LibraryCard,
    action: str,
    reason: str,
    performed_by: int | None = None,
) -> dict:
    """
    Khoá (LOCK) hoặc Mở khoá (UNLOCK) thẻ thư viện kèm lý do bắt buộc.
    Khi mở khoá (UNLOCK), nếu thẻ đã quá ngày hết hạn thì tự chuyển sang EXPIRED.
    """
    clean_reason = (reason or "").strip()
    if len(clean_reason) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập lý do khóa/mở khóa thẻ rõ ràng (tối thiểu 3 ký tự)",
        )

    act = action.strip().upper()
    old_status = card.status.value if hasattr(card.status, "value") else str(card.status)
    today = date.today()

    if act == "LOCK":
        if card.status == CardStatus.LOCKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thẻ thư viện này đã ở trạng thái khóa",
            )
        card.status = CardStatus.LOCKED
        new_status_str = CardStatus.LOCKED.value
    elif act == "UNLOCK":
        if card.status != CardStatus.LOCKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thẻ thư viện này hiện không bị khóa",
            )
        # Khi mở thẻ, kiểm tra hạn sử dụng: nếu đã quá hạn thì chuyển sang EXPIRED
        if card.expiry_date is None or card.expiry_date < today:
            card.status = CardStatus.EXPIRED
        else:
            card.status = CardStatus.ACTIVE
        new_status_str = card.status.value
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hành động không hợp lệ (chỉ chấp nhận LOCK hoặc UNLOCK)",
        )

    log = CardActionLog(
        card_id=card.id,
        reader_id=card.reader_id,
        action=act,
        old_status=old_status,
        new_status=new_status_str,
        reason=clean_reason,
        old_expiry_date=card.expiry_date,
        new_expiry_date=card.expiry_date,
        performed_by=performed_by,
    )
    db.add(log)
    db.commit()
    db.refresh(card)

    return get_reader_card_detail(db, card_id=card.id)
