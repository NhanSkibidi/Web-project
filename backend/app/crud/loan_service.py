from datetime import datetime
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

MAX_BORROW_BOOKS = 5      
BORROW_DAYS = 14           
MAX_RENEWALS = 1           
RENEWAL_DAYS = 7           

# Hàm kiểm tra thẻ hợp lệ để mượn (dùng chung logic từ app.core.dependencies)
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
            Loan.status == LoanStatus.PENDING,
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

        if len(book_isbns) > MAX_BORROW_BOOKS:
            raise HTTPException(
                status_code=400,
                detail=f"Một lần mượn tối đa {MAX_BORROW_BOOKS} cuốn",
            )

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

        card = check_library_card(db, user_id)
        check_overdue_books(db, user_id)
        check_unpaid_fines(db, user_id)
        check_borrow_limit(db, user_id, len(book_isbns), card=card)

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