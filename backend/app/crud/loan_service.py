from datetime import datetime, timedelta, date

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.dependencies import check_card_can_borrow
from app.models.user import User, UserRole, UserStatus
from app.models.library_card import LibraryCard, CardStatus
from app.models.loan import Loan, LoanStatus, BorrowType
from app.models.loan_item import LoanItem
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.fine import Fine
from app.models.reservation import Reservation
from app.models.notification import Notification
from app.crud.copy_status_log import change_copy_status
from app.crud.fine import has_unpaid_fines

MAX_BORROW_BOOKS = 5       
MAX_COUNTER_BORROW_BOOKS = 5   # Giới hạn tối đa khi mượn tại quầy
BORROW_DAYS = 14               # Thời hạn mượn 14 ngày
MAX_RENEWALS = 1           
RENEWAL_DAYS = 7          
MAX_UNPAID_FINE = 50000        # Ngưỡng nợ phạt cho phép (VND)

check_library_card = check_card_can_borrow


def check_overdue_books(db: Session, user_id: int) -> None:
    overdue = (
        db.query(LoanItem)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.user_id == user_id,
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date < datetime.now(),
        )
        .first()
    )

    if overdue:
        raise HTTPException(
            status_code=400,
            detail="Bạn đang có sách quá hạn, vui lòng trả trước khi mượn mới",
        )


def check_unpaid_fines(db: Session, user_id: int) -> None:
    if has_unpaid_fines(db, user_id):
        raise HTTPException(
            status_code=400,
            detail="Bạn đang có khoản phạt chưa thanh toán",
        )


def check_borrow_limit(
    db: Session,
    user_id: int,
    requested_count: int,
    card: LibraryCard | None = None,
) -> None:
    # Dùng giới hạn từ thẻ nếu có, nếu không fallback về MAX_BORROW_BOOKS
    limit = card.max_borrow_books if card else MAX_BORROW_BOOKS

    borrowed_count = (
        db.query(func.count(LoanItem.id))
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.user_id == user_id,
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
        )
        .scalar()
    ) or 0

    pending_count = (
        db.query(func.count(LoanItem.id))
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.user_id == user_id,
            Loan.status.in_([LoanStatus.PENDING, LoanStatus.APPROVED]),
        )
        .scalar()
    ) or 0

    total = borrowed_count + pending_count + requested_count

    if total > limit:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Vượt giới hạn mượn tối đa {limit} cuốn. "
                f"Hiện tại: {borrowed_count} đang mượn, {pending_count} chờ duyệt, "
                f"yêu cầu thêm {requested_count} cuốn."
            ),
        )

def create_online_loan(
    db: Session,
    user_id: int,
    book_isbns: list[str],
) -> Loan:
    try:
        if not book_isbns:
            raise HTTPException(
                status_code=400,
                detail="Vui lòng chọn ít nhất một đầu sách",
            )

        book_isbns = [isbn.strip() for isbn in book_isbns]

        if any(not isbn for isbn in book_isbns):
            raise HTTPException(
                status_code=400,
                detail="ISBN không được để trống",
            )

        if len(book_isbns) != len(set(book_isbns)):
            raise HTTPException(
                status_code=400,
                detail="Không được chọn trùng đầu sách",
            )

        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng")

        if user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=403,
                detail="Tài khoản người dùng đã bị khóa",
            )

        if user.role == UserRole.READER:
            card = check_library_card(db, user_id)
        else:
            existing_card = (
                db.query(LibraryCard)
                .filter(LibraryCard.reader_id == user_id)
                .order_by(LibraryCard.id.desc())
                .first()
            )
            card = check_library_card(db, user_id) if existing_card else None

        check_overdue_books(db, user_id)
        check_unpaid_fines(db, user_id)
        check_borrow_limit(db, user_id, len(book_isbns), card=card)

        selected_copies: list[BookCopy] = []

        for isbn in book_isbns:
            book = db.query(Book).filter(Book.isbn == isbn, Book.is_deleted == False).first()  # noqa: E712

            if not book:
                raise HTTPException(
                    status_code=404,
                    detail=f"Không tìm thấy sách ISBN: {isbn}",
                )

            copy = (
                db.query(BookCopy)
                .filter(
                    BookCopy.book_isbn == isbn,
                    BookCopy.status == "AVAILABLE",
                )
                .with_for_update()
                .first()
            )

            if not copy:
                raise HTTPException(
                    status_code=400,
                    detail=f"Sách '{book.title}' hiện không còn bản sao có thể mượn",
                )

            selected_copies.append(copy)

        loan = Loan(
            user_id=user_id,
            borrow_type=BorrowType.ONLINE,
            status=LoanStatus.PENDING,
        )
        db.add(loan)
        db.flush()

        for copy in selected_copies:
            loan_item = LoanItem(
                loan_id=loan.id,
                book_isbn=copy.book_isbn,
                copy_id=copy.id,
            )
            db.add(loan_item)
            copy.status = "RESERVED"

        db.commit()
        db.refresh(loan)
        return loan

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

def cancel_online_loan(
    db: Session,
    loan_id: int,
    user_id: int,
) -> Loan:
    try:
        loan = (
            db.query(Loan)
            .filter(
                Loan.id == loan_id,
                Loan.user_id == user_id,
            )
            .with_for_update()
            .first()
        )

        if not loan:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy yêu cầu mượn sách",
            )

        if loan.borrow_type != BorrowType.ONLINE:
            raise HTTPException(
                status_code=400,
                detail="Chỉ được hủy yêu cầu mượn online",
            )

        if loan.status != LoanStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail="Chỉ được hủy yêu cầu khi chưa được duyệt (trạng thái PENDING)",
            )

        loan_items = (
            db.query(LoanItem)
            .filter(LoanItem.loan_id == loan.id)
            .all()
        )

        for item in loan_items:
            if item.copy_id:
                copy = (
                    db.query(BookCopy)
                    .filter(BookCopy.id == item.copy_id)
                    .with_for_update()
                    .first()
                )
                if copy and copy.status == "RESERVED":
                    copy.status = "AVAILABLE"

        loan.status = LoanStatus.CANCELLED

        db.commit()
        db.refresh(loan)
        return loan

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

def approve_loan(
    db: Session,
    loan_id: int,
    librarian_id: int,
) -> Loan:
    try:
        librarian = db.query(User).filter(User.id == librarian_id).first()
        if not librarian:
            raise HTTPException(status_code=404, detail="Không tìm thấy thủ thư")

        if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thủ thư hoặc admin mới được duyệt phiếu",
            )

        loan = (
            db.query(Loan)
            .filter(Loan.id == loan_id)
            .with_for_update()
            .first()
        )

        if not loan:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu mượn")

        if loan.status != LoanStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Chỉ duyệt được phiếu ở trạng thái PENDING (hiện tại: {loan.status.value})",
            )

        loan.status = LoanStatus.APPROVED
        loan.processed_by = librarian_id

        db.commit()
        db.refresh(loan)
        return loan

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

def reject_loan(
    db: Session,
    loan_id: int,
    librarian_id: int,
    reject_reason: str,
) -> Loan:
    try:
        librarian = db.query(User).filter(User.id == librarian_id).first()
        if not librarian:
            raise HTTPException(status_code=404, detail="Không tìm thấy thủ thư")

        if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thủ thư hoặc admin mới được từ chối phiếu",
            )

        loan = (
            db.query(Loan)
            .filter(Loan.id == loan_id)
            .with_for_update()
            .first()
        )

        if not loan:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu mượn")

        if loan.status != LoanStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Chỉ từ chối được phiếu ở trạng thái PENDING (hiện tại: {loan.status.value})",
            )

        loan_items = (
            db.query(LoanItem)
            .filter(LoanItem.loan_id == loan.id)
            .all()
        )

        for item in loan_items:
            if item.copy_id:
                copy = (
                    db.query(BookCopy)
                    .filter(BookCopy.id == item.copy_id)
                    .with_for_update()
                    .first()
                )
                if copy and copy.status == "RESERVED":
                    copy.status = "AVAILABLE"

        loan.status = LoanStatus.REJECTED
        loan.processed_by = librarian_id
        loan.reject_reason = reject_reason

        db.commit()
        db.refresh(loan)
        return loan

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

def handover_loan(
    db: Session,
    loan_id: int,
    librarian_id: int,
    copies_data: list[dict],
) -> Loan:
    try:
        librarian = db.query(User).filter(User.id == librarian_id).first()
        if not librarian:
            raise HTTPException(status_code=404, detail="Không tìm thấy thủ thư")

        if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thủ thư hoặc admin mới được giao sách",
            )
        
        loan = (
            db.query(Loan)
            .filter(Loan.id == loan_id)
            .with_for_update()
            .first()
        )

        if not loan:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu mượn")

        if loan.status != LoanStatus.APPROVED:
            raise HTTPException(
                status_code=400,
                detail=f"Chỉ giao sách được khi phiếu đã duyệt APPROVED (hiện tại: {loan.status.value})",
            )

        loan_items = (
            db.query(LoanItem)
            .filter(LoanItem.loan_id == loan.id)
            .all()
        )

        item_by_isbn: dict[str, LoanItem] = {}
        for item in loan_items:
            item_by_isbn[item.book_isbn] = item

        if len(copies_data) != len(loan_items):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Phiếu có {len(loan_items)} đầu sách, "
                    f"nhưng bạn giao {len(copies_data)} bản sao"
                ),
            )

        now = datetime.now()
        due_date = now + timedelta(days=BORROW_DAYS)

        for copy_info in copies_data:
            isbn = copy_info["book_isbn"]
            copy_code = copy_info["copy_code"]

            # Kiểm tra ISBN có trong phiếu không
            if isbn not in item_by_isbn:
                raise HTTPException(
                    status_code=400,
                    detail=f"ISBN '{isbn}' không có trong phiếu mượn này",
                )

            loan_item = item_by_isbn[isbn]

            copy = (
                db.query(BookCopy)
                .filter(
                    BookCopy.copy_code == copy_code,
                    BookCopy.book_isbn == isbn,
                )
                .with_for_update()
                .first()
            )

            if not copy:
                raise HTTPException(
                    status_code=404,
                    detail=f"Không tìm thấy bản sao mã '{copy_code}' cho sách ISBN '{isbn}'",
                )

            if copy.status not in ("AVAILABLE", "RESERVED"):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Bản sao '{copy_code}' đang ở trạng thái '{copy.status}', "
                        f"không thể giao cho mượn"
                    ),
                )
            
            change_copy_status(db, copy.id, "BORROWED", auto_commit=False)

            loan_item.copy_id = copy.id
            loan_item.due_date = due_date

        loan.status = LoanStatus.BORROWED
        loan.borrowed_at = now
        loan.due_date = due_date
        loan.processed_by = librarian_id

        db.commit()
        db.refresh(loan)
        return loan

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


def get_loans_history(
    db: Session,
    user_id: int | None = None,
    status_filter: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """
    Lấy danh sách lịch sử mượn trả từ module Mượn (lọc theo user_id và status).
    Dùng cho trang Chi tiết độc giả, bảng Độc giả & Phiếu mượn của tôi.
    """
    query = db.query(Loan).order_by(Loan.id.desc())

    if user_id is not None:
        query = query.filter(Loan.user_id == user_id)

    if status_filter and status_filter.strip():
        st = status_filter.strip().upper()
        try:
            query = query.filter(Loan.status == LoanStatus(st))
        except ValueError:
            return []

    loans = query.limit(limit).all()
    now = datetime.now()
    results: list[dict] = []

    for loan in loans:
        reader = db.query(User).filter(User.id == loan.user_id).first()
        items_out: list[dict] = []

        for li in loan.loan_items:
            book = db.query(Book).filter(Book.isbn == li.book_isbn).first()
            copy = db.query(BookCopy).filter(BookCopy.id == li.copy_id).first() if li.copy_id else None

            eff_due = li.due_date or loan.due_date
            is_overdue = False
            overdue_days = 0
            estimated_fine = 0.0

            if eff_due and li.return_date is None and loan.status == LoanStatus.BORROWED:
                if now.date() > eff_due.date():
                    is_overdue = True
                    overdue_days = (now.date() - eff_due.date()).days
                    estimated_fine = float(overdue_days * 2000)
            elif eff_due and li.return_date is not None:
                if li.return_date.date() > eff_due.date():
                    is_overdue = True
                    overdue_days = (li.return_date.date() - eff_due.date()).days
                    estimated_fine = float(overdue_days * 2000)

            items_out.append({
                "id": li.id,
                "loan_id": li.loan_id,
                "book_isbn": li.book_isbn,
                "book_title": book.title if book else li.book_isbn,
                "copy_id": li.copy_id,
                "copy_code": copy.copy_code if copy else None,
                "due_date": eff_due,
                "renewal_count": li.renewal_count or 0,
                "return_date": li.return_date,
                "is_overdue": is_overdue,
                "overdue_days": overdue_days,
                "estimated_fine": estimated_fine,
            })

        results.append({
            "id": loan.id,
            "user_id": loan.user_id,
            "reader_name": reader.full_name if reader else None,
            "processed_by": loan.processed_by,
            "borrow_type": loan.borrow_type.value if hasattr(loan.borrow_type, "value") else str(loan.borrow_type),
            "status": loan.status.value if hasattr(loan.status, "value") else str(loan.status),
            "reject_reason": loan.reject_reason,
            "created_at": loan.created_at,
            "borrowed_at": loan.borrowed_at,
            "due_date": loan.due_date,
            "loan_items": items_out,
        })

    return results


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6) Nghiệp vụ mượn sách trực tiếp tại quầy (Counter Borrowing)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def check_librarian_permission(db: Session, user_id: int):
    librarian = db.query(User).filter(User.id == user_id).first()

    if not librarian:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy người thực hiện"
        )

    if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
        raise HTTPException(
            status_code=403,
            detail="Chỉ thủ thư hoặc admin mới được thực hiện nghiệp vụ này"
        )

    return librarian

def get_reader_by_card(db: Session, card_code: str, librarian_id: int) -> dict:
    check_librarian_permission(db, librarian_id)
    """Tra cứu thông tin độc giả theo mã thẻ thư viện (chuẩn hóa trim, in hoa)."""
    code = card_code.strip().upper() if card_code else ""
    if not code:
        raise HTTPException(status_code=400, detail="Mã thẻ không được để trống")

    card = db.query(LibraryCard).filter(LibraryCard.card_code == code).first()
    if not card:
        raise HTTPException(status_code=404, detail="Không tìm thấy độc giả")

    user = card.reader
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản độc giả gắn với thẻ này")

    borrowing_count = (
        db.query(func.count(LoanItem.id))
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.user_id == user.id,
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
        )
        .scalar()
    ) or 0

    unpaid_fine = (
        db.query(func.sum(Fine.amount))
        .filter(Fine.user_id == user.id, Fine.status == "UNPAID")
        .scalar()
    ) or 0.0

    credit_score = 100
    if unpaid_fine > 0:
        credit_score = max(50, credit_score - 20)

    student_id = getattr(user, "phone", None) or f"2301{user.id:04d}"

    return {
        "reader_id": card.id,
        "user_id": user.id,
        "card_code": card.card_code,
        "full_name": user.full_name,
        "student_id": student_id,
        "faculty": "Khoa CNTT (K1)",
        "card_status": card.status.value if hasattr(card.status, "value") else str(card.status),
        "expiry_date": card.expiry_date.strftime("%Y-%m-%d") if card.expiry_date else None,
        "borrowing_count": borrowing_count,
        "max_borrow_books": MAX_COUNTER_BORROW_BOOKS,
        "credit_score": credit_score,
        "unpaid_fine": float(unpaid_fine),
    }


def get_copy_by_barcode(db: Session, copycode: str, librarian_id: int) -> dict:
    check_librarian_permission(db, librarian_id)
    """Tra cứu bản sao sách theo mã vạch / copy_code."""
    bc = copycode.strip() if copycode else ""
    if not bc:
        raise HTTPException(status_code=400, detail="Mã vạch không được để trống")

    copy = db.query(BookCopy).filter(BookCopy.copy_code == bc).first()
    if not copy:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy bản sao sách có mã vạch: {bc}")

    book = copy.book
    author_name = "Nhiều tác giả"
    if book and getattr(book, "book_authors", None) and len(book.book_authors) > 0:
        first_author = book.book_authors[0]
        if getattr(first_author, "author", None):
            author_name = first_author.author.name

    return {
        "id": copy.id,
        "barcode": copy.copy_code,
        "copy_code": copy.copy_code,
        "book_isbn": copy.book_isbn,
        "title": book.title if book else "Không xác định",
        "author": author_name,
        "location": copy.shelf_location,
        "shelf_location": copy.shelf_location,
        "status": copy.status,
    }


def validate_counter_borrow(
    db: Session,
    card_code: str,
    barcodes: list[str],
    librarian_id: int,
) -> dict:
    check_librarian_permission(db, librarian_id)
    """
    Kiểm tra 7 điều kiện mượn sách tại quầy (Nguồn duy nhất - Single Source of Truth).
    Mỗi điều kiện trả về: { code, label, passed, mandatory, message }.
    can_borrow = True khi toàn bộ điều kiện mandatory đều passed.
    """
    code = card_code.strip().upper() if card_code else ""
    clean_barcodes = [b.strip() for b in barcodes if b and b.strip()]
    unique_barcodes = list(dict.fromkeys(clean_barcodes))

    card = db.query(LibraryCard).filter(LibraryCard.card_code == code).first() if code else None
    user = card.reader if card else None

    # Lấy các bản sao trong kho
    found_copies = (
        db.query(BookCopy).filter(BookCopy.copy_code.in_(unique_barcodes)).all()
        if unique_barcodes
        else []
    )
    found_map = {cp.copy_code: cp for cp in found_copies}

    # Đếm số sách đang mượn
    borrowing_count = 0
    if user:
        borrowing_count = (
            db.query(func.count(LoanItem.id))
            .join(Loan, LoanItem.loan_id == Loan.id)
            .filter(
                Loan.user_id == user.id,
                Loan.status == LoanStatus.BORROWED,
                LoanItem.return_date.is_(None),
            )
            .scalar()
        ) or 0

    # Kiểm tra nợ phạt và sách quá hạn
    has_overdue = False
    unpaid_fines = 0.0
    if user:
        overdue_item = (
            db.query(LoanItem)
            .join(Loan, LoanItem.loan_id == Loan.id)
            .filter(
                Loan.user_id == user.id,
                Loan.status == LoanStatus.BORROWED,
                LoanItem.return_date.is_(None),
                LoanItem.due_date < datetime.now(),
            )
            .first()
        )
        has_overdue = overdue_item is not None
        unpaid_fines = float(
            db.query(func.sum(Fine.amount))
            .filter(Fine.user_id == user.id, Fine.status == "UNPAID")
            .scalar()
            or 0.0
        )

    conditions = []

    # 1. CARD_VALID: thẻ tồn tại, ACTIVE, chưa quá hạn thẻ
    card_exists = card is not None
    card_active = card.status == CardStatus.ACTIVE if card else False
    card_not_expired = (
        (card.expiry_date is None or card.expiry_date >= date.today()) if card else False
    )
    pass_card = card_exists and card_active and card_not_expired
    if not card_exists:
        card_msg = "Mã thẻ thư viện không tồn tại trong hệ thống"
    elif not card_active:
        card_msg = f"Thẻ thư viện đang ở trạng thái {card.status.value}"
    elif not card_not_expired:
        card_msg = f"Thẻ thư viện đã hết hạn từ ngày {card.expiry_date.strftime('%d/%m/%Y')}"
    else:
        card_msg = f"Thẻ hợp lệ (Hạn dùng: {card.expiry_date.strftime('%d/%m/%Y') if card.expiry_date else 'Vô thời hạn'})"

    conditions.append({
        "code": "CARD_VALID",
        "label": "Thẻ thư viện hợp lệ và còn hạn",
        "passed": pass_card,
        "mandatory": True,
        "message": card_msg,
    })

    # 2. READER_ALLOWED: độc giả không bị khóa quyền
    user_active = user is not None and user.status == UserStatus.ACTIVE
    pass_reader = card_exists and user_active
    reader_msg = "Tài khoản độc giả đủ quyền mượn sách" if pass_reader else (
        "Tài khoản độc giả đã bị khóa quyền mượn" if user else "Chưa xác định độc giả"
    )
    conditions.append({
        "code": "READER_ALLOWED",
        "label": "Quyền mượn của độc giả",
        "passed": pass_reader,
        "mandatory": True,
        "message": reader_msg,
    })

    # 3. LIMIT_NOT_EXCEEDED: số sách đang giữ + số sách mới <= giới hạn cho phép
    total_requested = len(unique_barcodes)
    total_books = borrowing_count + total_requested
    limit = card.max_borrow_books if (card and card.max_borrow_books) else MAX_BORROW_BOOKS
    pass_limit = total_books <= limit
    limit_msg = (
        f"Đang giữ {borrowing_count}, thêm {total_requested}, tối đa {limit} cuốn"
        if pass_limit
        else f"Vượt giới hạn: đang giữ {borrowing_count}, thêm {total_requested}, vượt mức tối đa {limit} cuốn"
    )
    conditions.append({
        "code": "LIMIT_NOT_EXCEEDED",
        "label": "Giới hạn số lượng sách mượn",
        "passed": pass_limit,
        "mandatory": True,
        "message": limit_msg,
    })

    # 4. BOOK_EXISTS: mọi mã vạch tồn tại
    missing_barcodes = [bc for bc in unique_barcodes if bc not in found_map]
    pass_exists = len(unique_barcodes) > 0 and len(missing_barcodes) == 0
    if len(unique_barcodes) == 0:
        exists_msg = "Chưa quét mã cuốn sách nào"
    elif len(missing_barcodes) > 0:
        exists_msg = f"Mã vạch không tồn tại: {', '.join(missing_barcodes)}"
    else:
        exists_msg = f"Tất cả {len(unique_barcodes)} mã vạch sách đều tồn tại trong kho"

    conditions.append({
        "code": "BOOK_EXISTS",
        "label": "Mã vạch sách tồn tại trong kho",
        "passed": pass_exists,
        "mandatory": True,
        "message": exists_msg,
    })

    # 5. COPY_AVAILABLE: mọi bản sao đang AVAILABLE
    unavailable = [
        f"{cp.copy_code} ({cp.status})"
        for cp in found_copies
        if cp.status != "AVAILABLE"
    ]
    pass_avail = len(unique_barcodes) > 0 and len(missing_barcodes) == 0 and len(unavailable) == 0
    if len(unique_barcodes) == 0:
        avail_msg = "Chưa có sách để kiểm tra tính sẵn sàng"
    elif len(unavailable) > 0:
        avail_msg = f"Sách không sẵn sàng mượn: {', '.join(unavailable)}"
    else:
        avail_msg = "Tất cả cuốn sách đều sẵn sàng trên giá (AVAILABLE)"

    conditions.append({
        "code": "COPY_AVAILABLE",
        "label": "Bản sao sẵn sàng cho mượn",
        "passed": pass_avail,
        "mandatory": True,
        "message": avail_msg,
    })

    # 6. NO_RESTRICTION: không có sách quá hạn và nợ phạt <= 50.000đ
    pass_restriction = (not has_overdue) and (unpaid_fines <= MAX_UNPAID_FINE)
    if has_overdue:
        restr_msg = "Độc giả đang có sách quá hạn chưa trả, không thể mượn thêm"
    elif unpaid_fines > MAX_UNPAID_FINE:
        restr_msg = f"Độc giả đang có nợ phạt {unpaid_fines:,.0f} đ vượt mức cho phép ({MAX_UNPAID_FINE:,.0f} đ)"
    else:
        restr_msg = "Không có sách quá hạn và không nợ phạt vi phạm"

    conditions.append({
        "code": "NO_RESTRICTION",
        "label": "Không có sách quá hạn hoặc nợ phạt",
        "passed": pass_restriction,
        "mandatory": True,
        "message": restr_msg,
    })

    # 7. HAS_BOOKS: có ít nhất 1 cuốn
    pass_has = len(unique_barcodes) >= 1
    has_msg = (
        f"Đã chọn {len(unique_barcodes)} cuốn sách để mượn"
        if pass_has
        else "Chưa chọn cuốn sách nào (Cần ít nhất 1 cuốn)"
    )
    conditions.append({
        "code": "HAS_BOOKS",
        "label": "Danh sách sách cần mượn",
        "passed": pass_has,
        "mandatory": True,
        "message": has_msg,
    })

    can_borrow = all(c["passed"] for c in conditions if c["mandatory"])
    return {
        "can_borrow": can_borrow,
        "conditions": conditions,
    }


def create_counter_loan(
    db: Session,
    card_code: str,
    barcodes: list[str],
    librarian_id: int,
) -> dict:
    """
    Tạo phiếu mượn tại quầy trực tiếp trong 1 transaction an toàn (all-or-nothing):
    1. Kiểm tra lại toàn bộ 7 điều kiện mượn ở server.
    2. Cập nhật bản sao AVAILABLE -> BORROWED (có điều kiện, chống mượn trùng đồng thời 409).
    3. Tạo phiếu Loan trạng thái BORROWED ngay lập tức, borrow_type = WALK_IN, hạn trả = +14 ngày.
    4. Trả về payload đầy đủ để in biên lai mượn sách.
    """
    try:
        librarian = check_librarian_permission(db, librarian_id)

        val = validate_counter_borrow(db, card_code, barcodes, librarian_id)
        if not val["can_borrow"]:
            err_details = [c["message"] for c in val["conditions"] if not c["passed"] and c["mandatory"]]
            raise HTTPException(
                status_code=422,
                detail=f"Điều kiện mượn không hợp lệ: {'; '.join(err_details)}",
            )

        code = card_code.strip().upper()
        clean_barcodes = [b.strip() for b in barcodes if b and b.strip()]
        unique_barcodes = list(dict.fromkeys(clean_barcodes))

        card = db.query(LibraryCard).filter(LibraryCard.card_code == code).first()
        if not card or not card.reader:
            raise HTTPException(status_code=404, detail="Không tìm thấy độc giả")

        user = card.reader

        # Khóa và kiểm tra lại trạng thái bản sao (chống mượn trùng đồng thời)
        copies = (
            db.query(BookCopy)
            .filter(BookCopy.copy_code.in_(unique_barcodes))
            .with_for_update()
            .all()
        )

        if len(copies) != len(unique_barcodes):
            raise HTTPException(
                status_code=400,
                detail="Một số mã vạch sách không tìm thấy trong cơ sở dữ liệu",
            )

        for copy in copies:
            if copy.status != "AVAILABLE":
                db.rollback()
                raise HTTPException(
                    status_code=409,
                    detail=f"Bản sao '{copy.copy_code}' vừa được mượn hoặc không còn sẵn sàng (COPY_NOT_AVAILABLE)",
                )

        # Xác định thủ thư phụ trách
        # librarian = None
        # if librarian_id:
        #     librarian = db.query(User).filter(User.id == librarian_id).first()
        # if not librarian:
        #     librarian = (
        #         db.query(User)
        #         .filter(User.role.in_([UserRole.LIBRARIAN, UserRole.ADMIN]))
        #         .first()
        #     )

        now = datetime.now()
        due = now + timedelta(days=BORROW_DAYS)

        # Tạo phiếu mượn BORROWED ngay lập tức
        loan = Loan(
            user_id=user.id,
            processed_by=librarian.id if librarian else None,
            borrow_type=BorrowType.WALK_IN,
            status=LoanStatus.BORROWED,
            borrowed_at=now,
            due_date=due,
        )
        db.add(loan)
        db.flush()

        books_receipt = []
        for copy in copies:
            loan_item = LoanItem(
                loan_id=loan.id,
                book_isbn=copy.book_isbn,
                copy_id=copy.id,
                due_date=due,
            )
            db.add(loan_item)
            change_copy_status(db, copy.id, "BORROWED", auto_commit=False)

            books_receipt.append({
                "copy_id": copy.id,
                "barcode": copy.copy_code,
                "title": copy.book.title if copy.book else "Không xác định",
                "isbn": copy.book_isbn,
                "location": copy.shelf_location,
                "due_date": due.strftime("%d/%m/%Y"),
            })

        db.commit()
        db.refresh(loan)

        student_id = getattr(user, "phone", None) or f"2301{user.id:04d}"

        return {
            "id": loan.id,
            "code": loan.code,
            "borrow_type": loan.borrow_type.value,
            "status": loan.status.value,
            "borrowed_at": now.strftime("%d/%m/%Y %H:%M"),
            "due_date": due.strftime("%d/%m/%Y"),
            "librarian_name": librarian.full_name if librarian else "Thủ thư ca trực",
            "reader_name": user.full_name,
            "reader_student_id": student_id,
            "reader_faculty": "Khoa CNTT (K1)",
            "reader_card_code": card.card_code,
            "books": books_receipt,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi hệ thống khi tạo phiếu mượn tại quầy: {str(e)}",
        )

def get_book_loan_history(db: Session, isbn: str):
    return (
        db.query(LoanItem, Loan, User, BookCopy)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .join(User, Loan.user_id == User.id)
        .outerjoin(BookCopy, LoanItem.copy_id == BookCopy.id)
        .filter(
            LoanItem.book_isbn == isbn,
            Loan.borrowed_at.isnot(None)
        )
        .order_by(Loan.borrowed_at.desc())
        .all()
    )


# ==============================================================================
#  GIA HẠN SÁCH (RENEWAL)
#  Quy tắc:
#   - Mỗi cuốn gia hạn tối đa MAX_RENEWALS lần (1 lần).
#   - Mỗi lần gia hạn cộng thêm RENEWAL_DAYS ngày (7 ngày) vào hạn trả hiện tại.
#   - Chỉ gia hạn được khi cuốn sách chưa quá hạn (due_date >= hôm nay).
#   - Không gia hạn được nếu đầu sách đó đang có người đặt trước (reservations WAITING/READY).
#   - Cả độc giả tự gia hạn hoặc thủ thư gia hạn hộ đều dùng chung API này.
# ==============================================================================

def renew_loan_item(
    db: Session,
    loan_item_id: int,
    user_id: int | None = None,
    librarian_id: int | None = None,
) -> dict:
    """
    Gia hạn 1 cuốn sách (loan_item) thêm 7 ngày.

    Parameters:
        db: SQLAlchemy Session
        loan_item_id: ID của dòng loan_items cần gia hạn
        user_id: ID độc giả tự gia hạn (None nếu thủ thư gia hạn hộ)
        librarian_id: ID thủ thư gia hạn hộ (None nếu độc giả tự gia hạn)

    Returns:
        dict chứa thông tin sau khi gia hạn thành công

    Raises:
        HTTPException 404: Không tìm thấy mục mượn
        HTTPException 400: Vi phạm điều kiện gia hạn
        HTTPException 409: Đầu sách đang có người đặt trước
    """
    try:
        # 1. Tìm loan_item
        item = db.query(LoanItem).filter(LoanItem.id == loan_item_id).first()
        if not item:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy mục mượn sách cần gia hạn",
            )

        # 2. Kiểm tra loan đang ở trạng thái BORROWED
        loan = db.query(Loan).filter(Loan.id == item.loan_id).first()
        if not loan or loan.status != LoanStatus.BORROWED:
            raise HTTPException(
                status_code=400,
                detail="Phiếu mượn không ở trạng thái đang mượn (BORROWED), không thể gia hạn",
            )

        # 3. Kiểm tra cuốn sách chưa trả (return_date phải NULL)
        if item.return_date is not None:
            raise HTTPException(
                status_code=400,
                detail="Cuốn sách này đã được trả, không thể gia hạn",
            )

        # 4. Kiểm tra quyền: nếu user_id được truyền, phải trùng với chủ phiếu
        if user_id is not None and loan.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền gia hạn phiếu mượn của người khác",
            )

        # 5. Kiểm tra số lần gia hạn chưa vượt giới hạn
        if item.renewal_count >= MAX_RENEWALS:
            raise HTTPException(
                status_code=400,
                detail=f"Cuốn sách này đã gia hạn {item.renewal_count}/{MAX_RENEWALS} lần, "
                       f"không thể gia hạn thêm",
            )

        # 6. Kiểm tra chưa quá hạn (due_date >= ngày hiện tại)
        now = datetime.now()
        if item.due_date and item.due_date < now:
            overdue_days = (now - item.due_date).days
            raise HTTPException(
                status_code=400,
                detail=f"Cuốn sách đã quá hạn {overdue_days} ngày, không thể gia hạn. "
                       f"Vui lòng trả sách và thanh toán phí phạt quá hạn.",
            )

        # 7. Kiểm tra không có ai đặt trước đầu sách đó (WAITING hoặc READY)
        has_reservation = (
            db.query(Reservation)
            .filter(
                Reservation.book_isbn == item.book_isbn,
                Reservation.status.in_(["WAITING", "READY"]),
            )
            .first()
        )
        if has_reservation:
            raise HTTPException(
                status_code=409,
                detail=f"Đầu sách '{item.book_isbn}' đang có độc giả khác đặt trước, "
                       f"không thể gia hạn. Vui lòng trả sách đúng hạn.",
            )

        # 8. Thực hiện gia hạn: cộng thêm RENEWAL_DAYS ngày vào due_date
        old_due_date = item.due_date
        new_due_date = item.due_date + timedelta(days=RENEWAL_DAYS) if item.due_date else now + timedelta(days=RENEWAL_DAYS)
        item.due_date = new_due_date
        item.renewal_count += 1

        # Cập nhật due_date trên phiếu Loan cha nếu tất cả item đều cùng hạn
        # (Nếu phiếu chỉ có 1 cuốn hoặc cuốn này có hạn trả xa nhất)
        all_items = db.query(LoanItem).filter(
            LoanItem.loan_id == loan.id,
            LoanItem.return_date.is_(None),
        ).all()
        max_due = max(
            (i.due_date for i in all_items if i.due_date),
            default=new_due_date,
        )
        loan.due_date = max_due

        db.commit()
        db.refresh(item)
        db.refresh(loan)

        # Lấy thông tin bổ sung cho response
        book_title = "Không xác định"
        copy_code_str = None
        if item.copy:
            copy_code_str = item.copy.copy_code
        if item.book:
            book_title = item.book.title

        # Xác định người thực hiện
        renewed_by = "Độc giả tự gia hạn"
        if librarian_id:
            lib_user = db.query(User).filter(User.id == librarian_id).first()
            if lib_user:
                renewed_by = f"Thủ thư {lib_user.full_name}"

        return {
            "loan_item_id": item.id,
            "loan_id": loan.id,
            "loan_code": loan.code,
            "book_isbn": item.book_isbn,
            "book_title": book_title,
            "copy_code": copy_code_str,
            "renewal_count": item.renewal_count,
            "max_renewals": MAX_RENEWALS,
            "old_due_date": old_due_date.strftime("%d/%m/%Y") if old_due_date else "—",
            "new_due_date": new_due_date.strftime("%d/%m/%Y"),
            "renewed_by": renewed_by,
            "message": f"Gia hạn thành công! Hạn trả mới: {new_due_date.strftime('%d/%m/%Y')} "
                       f"(+{RENEWAL_DAYS} ngày). Lần gia hạn {item.renewal_count}/{MAX_RENEWALS}.",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi hệ thống khi gia hạn sách: {str(e)}",
        )


def renew_loan(
    db: Session,
    loan_id: int,
    user_id: int | None = None,
    librarian_id: int | None = None,
) -> dict:
    try:
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy phiếu mượn #{loan_id}",
            )

        if loan.status != LoanStatus.BORROWED:
            raise HTTPException(
                status_code=400,
                detail=f"Phiếu mượn #{loan.code or loan.id} không ở trạng thái Đang mượn (BORROWED), không thể gia hạn",
            )

        if user_id is not None and loan.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền gia hạn phiếu mượn của người khác",
            )

        active_items = (
            db.query(LoanItem)
            .filter(LoanItem.loan_id == loan.id, LoanItem.return_date.is_(None))
            .all()
        )

        if not active_items:
            raise HTTPException(
                status_code=400,
                detail="Phiếu mượn này không có cuốn sách nào đang mượn để gia hạn",
            )

        now = datetime.now()
        results = []
        old_due = loan.due_date

        for item in active_items:
            # 1. Kiểm tra số lần gia hạn
            if item.renewal_count >= MAX_RENEWALS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Sách '{item.book.title if item.book else item.book_isbn}' đã gia hạn "
                           f"{item.renewal_count}/{MAX_RENEWALS} lần, không thể gia hạn thêm",
                )

            # 2. Kiểm tra quá hạn
            if item.due_date and item.due_date < now:
                overdue_days = (now - item.due_date).days
                raise HTTPException(
                    status_code=400,
                    detail=f"Sách '{item.book.title if item.book else item.book_isbn}' đã quá hạn "
                           f"{overdue_days} ngày, không thể gia hạn. Vui lòng hoàn trả tại quầy.",
                )

            # 3. Kiểm tra đặt trước
            has_res = (
                db.query(Reservation)
                .filter(
                    Reservation.book_isbn == item.book_isbn,
                    Reservation.status.in_(["WAITING", "READY"]),
                )
                .first()
            )
            if has_res:
                raise HTTPException(
                    status_code=409,
                    detail=f"Đầu sách '{item.book.title if item.book else item.book_isbn}' đang có độc giả khác đặt trước, "
                           f"không thể gia hạn.",
                )

        # Nếu tất cả các cuốn đều hợp lệ -> thực hiện gia hạn
        for item in active_items:
            old_item_due = item.due_date
            new_item_due = (item.due_date or now) + timedelta(days=RENEWAL_DAYS)
            item.due_date = new_item_due
            item.renewal_count += 1

            results.append({
                "loan_item_id": item.id,
                "loan_id": loan.id,
                "loan_code": loan.code or f"PM-{loan.id}",
                "book_isbn": item.book_isbn,
                "book_title": item.book.title if item.book else "Không xác định",
                "copy_code": item.copy.copy_code if item.copy else None,
                "renewal_count": item.renewal_count,
                "max_renewals": MAX_RENEWALS,
                "old_due_date": old_item_due.strftime("%d/%m/%Y") if old_item_due else "—",
                "new_due_date": new_item_due.strftime("%d/%m/%Y"),
                "renewed_by": f"Thủ thư {librarian_id}" if librarian_id else "Độc giả",
                "message": "Gia hạn thành công (+7 ngày)",
            })

        max_due = max((i.due_date for i in active_items if i.due_date), default=now + timedelta(days=RENEWAL_DAYS))
        loan.due_date = max_due

        db.commit()
        db.refresh(loan)

        renewed_by_str = "Độc giả tự gia hạn"
        if librarian_id:
            lib_user = db.query(User).filter(User.id == librarian_id).first()
            if lib_user:
                renewed_by_str = f"Thủ thư {lib_user.full_name}"
            else:
                renewed_by_str = f"Thủ thư (ID {librarian_id})"

        return {
            "loan_id": loan.id,
            "loan_code": loan.code or f"PM-{loan.id}",
            "renewed_count": len(results),
            "max_renewals": MAX_RENEWALS,
            "old_due_date": old_due.strftime("%d/%m/%Y") if old_due else "—",
            "new_due_date": max_due.strftime("%d/%m/%Y"),
            "renewed_by": renewed_by_str,
            "message": f"Gia hạn thành công {len(results)} cuốn sách (+{RENEWAL_DAYS} ngày)! Hạn trả mới: {max_due.strftime('%d/%m/%Y')}.",
            "items": results,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi hệ thống khi gia hạn phiếu mượn: {str(e)}",
        )
# ── LOGIC CHO TASK T3CFF48: DANH SÁCH QUÁ HẠN, SẮP ĐẾN HẠN & NHẮC TRẢ ────────

FINE_RATE_PER_DAY = 2000.0  # Quy định KS25: 2.000 đ/cuốn/ngày


def _format_time_ago(dt: datetime | None) -> str:
    """Format thời gian thân thiện (VD: 10 phút trước, 2 giờ trước, Hôm qua)."""
    if not dt:
        return "Vừa xong"
    diff = datetime.now() - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "Vừa xong"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} phút trước"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} giờ trước"
    days = hours // 24
    if days == 1:
        return "Hôm qua"
    if days < 30:
        return f"{days} ngày trước"
    return dt.strftime("%d/%m/%Y")


def get_overdue_loans(
    db: Session,
    user_id: int | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> dict:
    """
    Lấy danh sách các cuốn sách / phiếu mượn đang quá hạn.
    - Trạng thái phiếu: BORROWED.
    - Cuốn sách chưa trả: return_date IS NULL.
    - Hạn trả đã qua: due_date < now.
    - Tính số ngày quá hạn và tiền phạt tạm tính (2.000 đ/ngày).
    """
    now = datetime.now()

    query = (
        db.query(LoanItem, Loan, User, Book, BookCopy, LibraryCard)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .join(User, Loan.user_id == User.id)
        .outerjoin(Book, LoanItem.book_isbn == Book.isbn)
        .outerjoin(BookCopy, LoanItem.copy_id == BookCopy.id)
        .outerjoin(LibraryCard, LibraryCard.reader_id == User.id)
        .filter(
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date < now,
        )
    )

    if user_id:
        query = query.filter(Loan.user_id == user_id)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (User.full_name.ilike(search_term))
            | (User.email.ilike(search_term))
            | (Book.title.ilike(search_term))
            | (BookCopy.copy_code.ilike(search_term))
            | (LibraryCard.card_code.ilike(search_term))
        )

    rows = query.all()

    # Nhóm và tạo danh sách kết quả, loại bỏ duplicate nếu 1 user có nhiều thẻ thư viện
    seen_item_ids = set()
    items = []
    total_fine = 0.0

    for item, loan, user, book, copy, card in rows:
        if item.id in seen_item_ids:
            continue
        seen_item_ids.add(item.id)

        # Tính số ngày quá hạn
        due_d = item.due_date.date() if item.due_date else now.date()
        days_overdue = max(1, (now.date() - due_d).days)
        estimated_fine = float(days_overdue * FINE_RATE_PER_DAY)
        total_fine += estimated_fine

        # Đếm số lần đã gửi nhắc nhở cho phiếu này
        remind_count = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.loan_id == loan.id,
                Notification.type == "REMINDER",
            )
            .scalar()
            or 0
        )

        last_remind = (
            db.query(Notification.created_at)
            .filter(
                Notification.loan_id == loan.id,
                Notification.type == "REMINDER",
            )
            .order_by(Notification.created_at.desc())
            .first()
        )
        last_reminded_at = last_remind[0].strftime("%d/%m/%Y %H:%M") if last_remind else None

        items.append({
            "loan_id": loan.id,
            "loan_code": loan.code,
            "loan_item_id": item.id,
            "user_id": user.id,
            "reader_name": user.full_name,
            "reader_email": user.email,
            "reader_phone": user.phone,
            "card_code": card.card_code if card else f"LIB-{user.id:04d}",
            "student_id": f"2301{user.id:04d}",
            "faculty": "Công nghệ Thông tin",
            "book_isbn": item.book_isbn,
            "book_title": book.title if book else "Không xác định",
            "copy_id": item.copy_id,
            "copy_code": copy.copy_code if copy else None,
            "borrowed_at": loan.borrowed_at.strftime("%d/%m/%Y %H:%M") if loan.borrowed_at else None,
            "due_date": item.due_date.strftime("%d/%m/%Y") if item.due_date else "—",
            "days_overdue": days_overdue,
            "estimated_fine": estimated_fine,
            "reminded_count": remind_count,
            "last_reminded_at": last_reminded_at,
        })

    # Sắp xếp phiếu quá hạn lâu nhất lên đầu
    items.sort(key=lambda x: x["days_overdue"], reverse=True)

    total_count = len(items)
    paged_items = items[skip : skip + limit]

    return {
        "total": total_count,
        "total_fine": total_fine,
        "items": paged_items,
    }


def get_due_soon_loans(
    db: Session,
    user_id: int | None = None,
    days: int = 2,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> dict:
    """
    Lấy danh sách các cuốn sách / phiếu mượn sắp đến hạn trong vòng `days` ngày (mặc định 2 ngày).
    - Trạng thái phiếu: BORROWED.
    - Chưa trả: return_date IS NULL.
    - Hạn trả trong khoảng [bắt đầu hôm nay, cuối ngày hôm nay + days].
    """
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
    target_end = today_start + timedelta(days=days + 1)

    query = (
        db.query(LoanItem, Loan, User, Book, BookCopy, LibraryCard)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .join(User, Loan.user_id == User.id)
        .outerjoin(Book, LoanItem.book_isbn == Book.isbn)
        .outerjoin(BookCopy, LoanItem.copy_id == BookCopy.id)
        .outerjoin(LibraryCard, LibraryCard.reader_id == User.id)
        .filter(
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date >= today_start,
            LoanItem.due_date < target_end,
        )
    )

    if user_id:
        query = query.filter(Loan.user_id == user_id)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (User.full_name.ilike(search_term))
            | (User.email.ilike(search_term))
            | (Book.title.ilike(search_term))
            | (BookCopy.copy_code.ilike(search_term))
            | (LibraryCard.card_code.ilike(search_term))
        )

    rows = query.all()
    seen_item_ids = set()
    items = []

    for item, loan, user, book, copy, card in rows:
        if item.id in seen_item_ids:
            continue
        seen_item_ids.add(item.id)

        due_d = item.due_date.date() if item.due_date else now.date()
        days_remaining = (due_d - now.date()).days

        if days_remaining <= 0:
            status_label = "Hôm nay (hết hạn)"
        elif days_remaining == 1:
            status_label = "Còn 1 ngày"
        else:
            status_label = f"Còn {days_remaining} ngày"

        items.append({
            "loan_id": loan.id,
            "loan_code": loan.code,
            "loan_item_id": item.id,
            "user_id": user.id,
            "reader_name": user.full_name,
            "reader_email": user.email,
            "reader_phone": user.phone,
            "card_code": card.card_code if card else f"LIB-{user.id:04d}",
            "student_id": f"2301{user.id:04d}",
            "book_isbn": item.book_isbn,
            "book_title": book.title if book else "Không xác định",
            "copy_id": item.copy_id,
            "copy_code": copy.copy_code if copy else None,
            "borrowed_at": loan.borrowed_at.strftime("%d/%m/%Y %H:%M") if loan.borrowed_at else None,
            "due_date": item.due_date.strftime("%d/%m/%Y") if item.due_date else "—",
            "days_remaining": max(0, days_remaining),
            "status_label": status_label,
        })

    # Sắp xếp gần hết hạn nhất lên đầu
    items.sort(key=lambda x: x["days_remaining"])

    total_count = len(items)
    paged_items = items[skip : skip + limit]

    return {
        "total": total_count,
        "items": paged_items,
    }


def sync_and_get_notifications(
    db: Session,
    user_id: int | None = None,
    limit: int = 30,
) -> dict:
    """
    Tự động đồng bộ các thông báo quá hạn / sắp đến hạn và trả về danh sách thông báo in-app.
    - Quá hạn: tạo notification type='OVERDUE' (báo động đỏ).
    - Sắp đến hạn: tạo notification type='DUE_SOON' (báo động vàng).
    """
    now = datetime.now()

    # 1. Quét sách quá hạn để tạo thông báo nếu chưa có
    overdue_query = (
        db.query(LoanItem, Loan, Book)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .outerjoin(Book, LoanItem.book_isbn == Book.isbn)
        .filter(
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date < now,
        )
    )
    if user_id:
        overdue_query = overdue_query.filter(Loan.user_id == user_id)

    overdue_items = overdue_query.all()
    for item, loan, book in overdue_items:
        # Kiểm tra xem đã có thông báo quá hạn chưa đọc cho item này chưa
        existing = (
            db.query(Notification)
            .filter(
                Notification.user_id == loan.user_id,
                Notification.loan_item_id == item.id,
                Notification.type == "OVERDUE",
                Notification.is_read.is_(False),
            )
            .first()
        )
        days_overdue = max(1, (now.date() - item.due_date.date()).days) if item.due_date else 1
        est_fine = days_overdue * FINE_RATE_PER_DAY
        b_title = book.title if book else "Sách mượn"

        if not existing:
            new_notif = Notification(
                user_id=loan.user_id,
                loan_id=loan.id,
                loan_item_id=item.id,
                title=f"Quá hạn trả: {b_title}",
                message=f"Phiếu #{loan.code} đã quá hạn {days_overdue} ngày. Tiền phạt tạm tính: {est_fine:,.0f} đ. Vui lòng mang sách tới quầy thư viện để hoàn trả.",
                type="OVERDUE",
                is_read=False,
            )
            db.add(new_notif)

    # 2. Quét sách sắp đến hạn (trong 2 ngày)
    today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
    target_end = today_start + timedelta(days=3)
    due_soon_query = (
        db.query(LoanItem, Loan, Book)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .outerjoin(Book, LoanItem.book_isbn == Book.isbn)
        .filter(
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date >= today_start,
            LoanItem.due_date < target_end,
        )
    )
    if user_id:
        due_soon_query = due_soon_query.filter(Loan.user_id == user_id)

    due_soon_items = due_soon_query.all()
    for item, loan, book in due_soon_items:
        existing = (
            db.query(Notification)
            .filter(
                Notification.user_id == loan.user_id,
                Notification.loan_item_id == item.id,
                Notification.type == "DUE_SOON",
                Notification.is_read.is_(False),
            )
            .first()
        )
        days_left = (item.due_date.date() - now.date()).days if item.due_date else 0
        status_txt = "hôm nay" if days_left <= 0 else f"trong {days_left} ngày tới"
        b_title = book.title if book else "Sách mượn"

        if not existing:
            new_notif = Notification(
                user_id=loan.user_id,
                loan_id=loan.id,
                loan_item_id=item.id,
                title=f"Sắp đến hạn trả: {b_title}",
                message=f"Sách '{b_title}' (phiếu #{loan.code}) sẽ hết hạn {status_txt} ({item.due_date.strftime('%d/%m/%Y') if item.due_date else '—'}). Vui lòng gia hạn hoặc chuẩn bị trả sách.",
                type="DUE_SOON",
                is_read=False,
            )
            db.add(new_notif)

    db.commit()

    # 3. Lấy danh sách notifications
    notif_query = db.query(Notification)
    if user_id:
        notif_query = notif_query.filter(Notification.user_id == user_id)

    all_notifs = notif_query.order_by(Notification.created_at.desc()).limit(limit).all()

    unread_count_query = db.query(func.count(Notification.id)).filter(Notification.is_read.is_(False))
    if user_id:
        unread_count_query = unread_count_query.filter(Notification.user_id == user_id)
    unread_count = unread_count_query.scalar() or 0

    items_result = []
    for n in all_notifs:
        loan_code_val = None
        if n.loan:
            loan_code_val = n.loan.code

        items_result.append({
            "id": n.id,
            "user_id": n.user_id,
            "loan_id": n.loan_id,
            "loan_code": loan_code_val,
            "loan_item_id": n.loan_item_id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at.strftime("%d/%m/%Y %H:%M") if n.created_at else "—",
            "time_ago": _format_time_ago(n.created_at),
        })

    return {
        "unread_count": unread_count,
        "total": len(items_result),
        "items": items_result,
    }


def mark_notification_read(db: Session, notification_id: int, user_id: int | None = None) -> bool:
    """Đánh dấu một thông báo đã đọc."""
    query = db.query(Notification).filter(Notification.id == notification_id)
    if user_id:
        query = query.filter(Notification.user_id == user_id)
    notif = query.first()
    if not notif:
        return False
    notif.is_read = True
    db.commit()
    return True


def mark_all_notifications_read(db: Session, user_id: int | None = None) -> int:
    """Đánh dấu tất cả thông báo đã đọc."""
    query = db.query(Notification).filter(Notification.is_read.is_(False))
    if user_id:
        query = query.filter(Notification.user_id == user_id)
    updated = query.update({Notification.is_read: True})
    db.commit()
    return updated


def remind_overdue_loan(
    db: Session,
    loan_id: int,
    librarian_id: int | None = None,
    custom_message: str | None = None,
) -> dict:
    """
    Thủ thư gửi thông báo nhắc nhở trả sách cho độc giả của phiếu mượn.
    Tạo bản ghi Notification loại REMINDER.
    """
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu mượn")

    user = loan.user
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy độc giả của phiếu mượn này")

    lib_name = "Thủ thư"
    if librarian_id:
        lib = db.query(User).filter(User.id == librarian_id).first()
        if lib:
            lib_name = f"Thủ thư {lib.full_name}"

    now = datetime.now()
    is_overdue = any(
        li.return_date is None and (li.due_date or loan.due_date) and (li.due_date or loan.due_date) < now
        for li in (loan.loan_items or [])
    )

    if custom_message:
        msg = custom_message
    elif is_overdue:
        msg = (
            f"{lib_name} gửi lời nhắc: Phiếu mượn #{loan.code} của bạn có sách đã quá hạn. "
            f"Vui lòng mang sách đến quầy thư viện trả trong thời gian sớm nhất để tránh tiền phạt phát sinh (2.000 đ/ngày)."
        )
    else:
        msg = (
            f"{lib_name} gửi lời nhắc: Phiếu mượn #{loan.code} của bạn sắp đến hạn trả. "
            f"Vui lòng kiểm tra hạn trả, gia hạn trực tuyến (nếu đủ điều kiện) hoặc mang sách tới quầy trả đúng hạn."
        )

    title = (
        f"Nhắc nhở trả sách quá hạn — Phiếu #{loan.code}"
        if is_overdue
        else f"Nhắc nhở sắp đến hạn trả sách — Phiếu #{loan.code}"
    )

    notif = Notification(
        user_id=loan.user_id,
        loan_id=loan.id,
        title=title,
        message=msg,
        type="REMINDER",
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    return {
        "loan_id": loan.id,
        "user_id": loan.user_id,
        "reader_name": user.full_name,
        "reader_email": user.email,
        "sent_count": 1,
        "message": f"Đã gửi thông báo nhắc nhở thành công tới độc giả {user.full_name}!",
    }


def remind_all_overdue(db: Session, librarian_id: int | None = None) -> dict:
    """
    Gửi thông báo nhắc nhở hàng loạt tới tất cả độc giả đang có phiếu quá hạn.
    """
    now = datetime.now()
    overdue_loans = (
        db.query(Loan)
        .join(LoanItem, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date < now,
        )
        .distinct()
        .all()
    )

    sent_count = 0
    lib_name = "Thủ thư thư viện"
    if librarian_id:
        lib = db.query(User).filter(User.id == librarian_id).first()
        if lib:
            lib_name = f"Thủ thư {lib.full_name}"

    for loan in overdue_loans:
        msg = (
            f"{lib_name} gửi lời nhắc: Phiếu mượn #{loan.code} của bạn đang có sách quá hạn. "
            f"Vui lòng nhanh chóng hoàn trả sách tại thư viện để tránh phát sinh thêm phí phạt 2.000 đ/ngày."
        )
        notif = Notification(
            user_id=loan.user_id,
            loan_id=loan.id,
            title=f"Cảnh báo quá hạn trả sách — Phiếu #{loan.code}",
            message=msg,
            type="REMINDER",
            is_read=False,
        )
        db.add(notif)
        sent_count += 1

    db.commit()
    return {
        "sent_count": sent_count,
        "total_overdue_loans": len(overdue_loans),
        "message": f"Đã gửi thông báo nhắc nhở tự động đến {sent_count} phiếu mượn quá hạn thành công!",
    }
