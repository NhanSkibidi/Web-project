"""
Loan Service – xử lý nghiệp vụ mượn sách.

Quy định:
  - Tối đa 5 cuốn / lần mượn
  - Thời hạn mượn: 14 ngày
  - Gia hạn tối đa 1 lần, mỗi lần +7 ngày
"""
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, UserRole, UserStatus
from app.models.library_card import LibraryCard, CardStatus
from app.models.loan import Loan, LoanStatus, BorrowType
from app.models.loan_item import LoanItem
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.fine import Fine
from app.crud.copy_status_log import change_copy_status

# ── Quy định mượn ──────────────────────────────────────────────
MAX_BORROW_BOOKS = 5       # tối đa 5 cuốn
BORROW_DAYS = 14           # mượn 14 ngày
MAX_RENEWALS = 1           # gia hạn tối đa 1 lần
RENEWAL_DAYS = 7           # mỗi lần gia hạn +7 ngày


# ── Helpers kiểm tra điều kiện mượn ────────────────────────────

def check_library_card(db: Session, user_id: int) -> LibraryCard:
    """Kiểm tra thẻ thư viện còn hạn và đang hoạt động."""
    card = (
        db.query(LibraryCard)
        .filter(LibraryCard.reader_id == user_id)
        .order_by(LibraryCard.id.desc())
        .first()
    )

    if not card:
        raise HTTPException(
            status_code=400,
            detail="Độc giả chưa có thẻ thư viện",
        )

    if card.status != CardStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail="Thẻ thư viện không hoạt động",
        )

    if card.expiry_date is None or card.expiry_date < datetime.now().date():
        raise HTTPException(
            status_code=400,
            detail="Thẻ thư viện đã hết hạn",
        )

    return card


def check_overdue_books(db: Session, user_id: int) -> None:
    """Không cho mượn nếu đang có sách quá hạn."""
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
    """Không cho mượn nếu đang nợ phạt chưa thanh toán."""
    unpaid = (
        db.query(Fine)
        .filter(
            Fine.user_id == user_id,
            Fine.status == "UNPAID",
            Fine.amount > 0,
        )
        .first()
    )

    if unpaid:
        raise HTTPException(
            status_code=400,
            detail="Bạn đang có khoản phạt chưa thanh toán",
        )


def check_borrow_limit(
    db: Session,
    user_id: int,
    requested_count: int,
) -> None:
    """Tổng sách (đang mượn + đang chờ duyệt + yêu cầu mới) ≤ MAX_BORROW_BOOKS."""
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

    if total > MAX_BORROW_BOOKS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Vượt giới hạn mượn tối đa {MAX_BORROW_BOOKS} cuốn. "
                f"Hiện tại: {borrowed_count} đang mượn, {pending_count} chờ duyệt, "
                f"yêu cầu thêm {requested_count} cuốn."
            ),
        )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1) Độc giả gửi yêu cầu mượn online
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def create_online_loan(
    db: Session,
    user_id: int,
    book_isbns: list[str],
) -> Loan:
    """
    Độc giả gửi yêu cầu mượn online.
    - Kiểm tra tài khoản, thẻ, sách quá hạn, nợ phạt, giới hạn mượn.
    - Chọn bản sao AVAILABLE cho mỗi đầu sách → đặt RESERVED.
    - Tạo phiếu mượn trạng thái PENDING.
    """
    try:
        # Validate input
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

        if len(book_isbns) > MAX_BORROW_BOOKS:
            raise HTTPException(
                status_code=400,
                detail=f"Một lần mượn tối đa {MAX_BORROW_BOOKS} cuốn",
            )

        # Kiểm tra user
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy độc giả")

        if user.role != UserRole.READER:
            raise HTTPException(
                status_code=403,
                detail="Chỉ độc giả mới được gửi yêu cầu mượn",
            )

        if user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=403,
                detail="Tài khoản độc giả đã bị khóa",
            )

        # Kiểm tra điều kiện mượn
        check_library_card(db, user_id)
        check_overdue_books(db, user_id)
        check_unpaid_fines(db, user_id)
        check_borrow_limit(db, user_id, len(book_isbns))

        # Chọn bản sao cho mỗi đầu sách
        selected_copies: list[BookCopy] = []

        for isbn in book_isbns:
            book = db.query(Book).filter(Book.isbn == isbn).first()

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

        # Tạo phiếu mượn
        loan = Loan(
            user_id=user_id,
            borrow_type=BorrowType.ONLINE,
            status=LoanStatus.PENDING,
        )
        db.add(loan)
        db.flush()

        # Tạo loan items + đặt bản sao RESERVED
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2) Độc giả huỷ yêu cầu mượn (chỉ khi PENDING)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def cancel_online_loan(
    db: Session,
    loan_id: int,
    user_id: int,
) -> Loan:
    """
    Huỷ yêu cầu mượn khi chưa được duyệt (PENDING).
    Trả lại bản sao từ RESERVED → AVAILABLE.
    """
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

        # Trả lại bản sao
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3) Thủ thư duyệt phiếu mượn  (PENDING → APPROVED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def approve_loan(
    db: Session,
    loan_id: int,
    librarian_id: int,
) -> Loan:
    """
    Thủ thư duyệt phiếu mượn.
    PENDING → APPROVED, ghi nhận thủ thư duyệt.
    """
    try:
        # Kiểm tra quyền thủ thư
        librarian = db.query(User).filter(User.id == librarian_id).first()
        if not librarian:
            raise HTTPException(status_code=404, detail="Không tìm thấy thủ thư")

        if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thủ thư hoặc admin mới được duyệt phiếu",
            )

        # Lấy phiếu mượn
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

        # Duyệt phiếu
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4) Thủ thư từ chối phiếu mượn  (PENDING → REJECTED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def reject_loan(
    db: Session,
    loan_id: int,
    librarian_id: int,
    reject_reason: str,
) -> Loan:
    """
    Thủ thư từ chối phiếu mượn kèm lý do.
    PENDING → REJECTED, trả lại bản sao RESERVED → AVAILABLE.
    """
    try:
        # Kiểm tra quyền thủ thư
        librarian = db.query(User).filter(User.id == librarian_id).first()
        if not librarian:
            raise HTTPException(status_code=404, detail="Không tìm thấy thủ thư")

        if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thủ thư hoặc admin mới được từ chối phiếu",
            )

        # Lấy phiếu mượn
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

        # Trả lại bản sao đã RESERVED
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

        # Từ chối phiếu
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5) Thủ thư giao sách  (APPROVED → BORROWED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def handover_loan(
    db: Session,
    loan_id: int,
    librarian_id: int,
    copies_data: list[dict],
) -> Loan:
    """
    Thủ thư giao sách cho độc giả.

    - Phiếu phải ở trạng thái APPROVED.
    - Thủ thư nhập/quét mã bản sao (copy_code) cho từng đầu sách.
    - Mỗi bản sao được chuyển sang BORROWED bằng hàm change_copy_status
      (module Bản sao) trong cùng 1 transaction.
    - Tính hạn trả: borrowed_at + 14 ngày.

    Parameters
    ----------
    copies_data : list[dict]
        Mỗi phần tử: {"book_isbn": "...", "copy_code": "BC-..."}
    """
    try:
        # Kiểm tra quyền thủ thư
        librarian = db.query(User).filter(User.id == librarian_id).first()
        if not librarian:
            raise HTTPException(status_code=404, detail="Không tìm thấy thủ thư")

        if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thủ thư hoặc admin mới được giao sách",
            )

        # Lấy phiếu mượn
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

        # Lấy danh sách loan_items
        loan_items = (
            db.query(LoanItem)
            .filter(LoanItem.loan_id == loan.id)
            .all()
        )

        # Tạo dict ISBN → loan_item để tra nhanh
        item_by_isbn: dict[str, LoanItem] = {}
        for item in loan_items:
            item_by_isbn[item.book_isbn] = item

        # Validate: số bản sao giao phải khớp số đầu sách trong phiếu
        if len(copies_data) != len(loan_items):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Phiếu có {len(loan_items)} đầu sách, "
                    f"nhưng bạn giao {len(copies_data)} bản sao"
                ),
            )

        # Validate và gán bản sao cụ thể cho từng item
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

            # Tìm bản sao theo copy_code
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

            # Bản sao phải AVAILABLE hoặc RESERVED (đã reserve lúc tạo phiếu online)
            if copy.status not in ("AVAILABLE", "RESERVED"):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Bản sao '{copy_code}' đang ở trạng thái '{copy.status}', "
                        f"không thể giao cho mượn"
                    ),
                )

            # Chuyển bản sao sang BORROWED bằng hàm của module Bản sao
            # auto_commit=False để nằm trong cùng transaction
            change_copy_status(db, copy.id, "BORROWED", auto_commit=False)

            # Gán bản sao vào loan_item + tính hạn trả
            loan_item.copy_id = copy.id
            loan_item.due_date = due_date

        # Cập nhật phiếu mượn
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



# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3) Thủ thư duyệt phiếu mượn  (PENDING → APPROVED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def approve_loan(
    db: Session,
    loan_id: int,
    librarian_id: int,
) -> Loan:
    """
    Thủ thư duyệt phiếu mượn.
    PENDING → APPROVED, ghi nhận thủ thư duyệt.
    """
    try:
        # Kiểm tra quyền thủ thư
        librarian = db.query(User).filter(User.id == librarian_id).first()
        if not librarian:
            raise HTTPException(status_code=404, detail="Không tìm thấy thủ thư")

        if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thủ thư hoặc admin mới được duyệt phiếu",
            )

        # Lấy phiếu mượn
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

        # Duyệt phiếu
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4) Thủ thư từ chối phiếu mượn  (PENDING → REJECTED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def reject_loan(
    db: Session,
    loan_id: int,
    librarian_id: int,
    reject_reason: str,
) -> Loan:
    """
    Thủ thư từ chối phiếu mượn kèm lý do.
    PENDING → REJECTED, trả lại bản sao RESERVED → AVAILABLE.
    """
    try:
        # Kiểm tra quyền thủ thư
        librarian = db.query(User).filter(User.id == librarian_id).first()
        if not librarian:
            raise HTTPException(status_code=404, detail="Không tìm thấy thủ thư")

        if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thủ thư hoặc admin mới được từ chối phiếu",
            )

        # Lấy phiếu mượn
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

        # Trả lại bản sao đã RESERVED
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

        # Từ chối phiếu
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5) Thủ thư giao sách  (APPROVED → BORROWED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def handover_loan(
    db: Session,
    loan_id: int,
    librarian_id: int,
    copies_data: list[dict],
) -> Loan:
    """
    Thủ thư giao sách cho độc giả.

    - Phiếu phải ở trạng thái APPROVED.
    - Thủ thư nhập/quét mã bản sao (copy_code) cho từng đầu sách.
    - Mỗi bản sao được chuyển sang BORROWED bằng hàm change_copy_status
      (module Bản sao) trong cùng 1 transaction.
    - Tính hạn trả: borrowed_at + 14 ngày.

    Parameters
    ----------
    copies_data : list[dict]
        Mỗi phần tử: {"book_isbn": "...", "copy_code": "BC-..."}
    """
    try:
        # Kiểm tra quyền thủ thư
        librarian = db.query(User).filter(User.id == librarian_id).first()
        if not librarian:
            raise HTTPException(status_code=404, detail="Không tìm thấy thủ thư")

        if librarian.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thủ thư hoặc admin mới được giao sách",
            )

        # Lấy phiếu mượn
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

        # Lấy danh sách loan_items
        loan_items = (
            db.query(LoanItem)
            .filter(LoanItem.loan_id == loan.id)
            .all()
        )

        # Tạo dict ISBN → loan_item để tra nhanh
        item_by_isbn: dict[str, LoanItem] = {}
        for item in loan_items:
            item_by_isbn[item.book_isbn] = item

        # Validate: số bản sao giao phải khớp số đầu sách trong phiếu
        if len(copies_data) != len(loan_items):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Phiếu có {len(loan_items)} đầu sách, "
                    f"nhưng bạn giao {len(copies_data)} bản sao"
                ),
            )

        # Validate và gán bản sao cụ thể cho từng item
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

            # Tìm bản sao theo copy_code
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

            # Bản sao phải AVAILABLE hoặc RESERVED (đã reserve lúc tạo phiếu online)
            if copy.status not in ("AVAILABLE", "RESERVED"):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Bản sao '{copy_code}' đang ở trạng thái '{copy.status}', "
                        f"không thể giao cho mượn"
                    ),
                )

            # Chuyển bản sao sang BORROWED bằng hàm của module Bản sao
            # auto_commit=False để nằm trong cùng transaction
            change_copy_status(db, copy.id, "BORROWED", auto_commit=False)

            # Gán bản sao vào loan_item + tính hạn trả
            loan_item.copy_id = copy.id
            loan_item.due_date = due_date

        # Cập nhật phiếu mượn
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