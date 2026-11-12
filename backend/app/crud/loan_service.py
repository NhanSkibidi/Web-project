from datetime import date, datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User, UserRole, UserStatus
from app.models.library_card import LibraryCard, CardStatus
from app.models.loan import Loan
from app.models.loan_item import LoanItem
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.fine import Fine

def check_library_card(db: Session, user_id: int):
    card = (db.query(LibraryCard).filter(LibraryCard.reader_id == user_id).order_by(LibraryCard.id.desc()).first())

    if not card:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Độc giả chưa có thẻ thư viện"
        )

    if card.status != CardStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thẻ thư viện không hoạt động"
        )

    if card.expiry_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thẻ thư viện đã hết hạn"
        )

    return card

def check_overdue_books(db: Session, user_id: int):
    overdue = (db.query(LoanItem).join(Loan, LoanItem.loan_id == Loan.id).filter(
            Loan.user_id == user_id,
            Loan.status == "BORROWED",
            LoanItem.return_date.is_(None),
            LoanItem.due_date < datetime.now()
        )
        .first()
    )

    if overdue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đang có sách quá hạn"
        )

def check_unpaid_fines(db: Session, user_id: int):
    unpaid = (db.query(Fine).filter(Fine.user_id == user_id,Fine.status == "UNPAID",Fine.amount > 0).first())

    if unpaid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đang có khoản phạt chưa thanh toán"
        )

def check_borrow_limit(db: Session,user_id: int,card: LibraryCard,requested_count: int):
    borrowed_count = (db.query(func.count(LoanItem.id)).join(Loan, LoanItem.loan_id == Loan.id).filter(
        Loan.user_id == user_id,
        Loan.status == "BORROWED",
        LoanItem.return_date.is_(None)
    ).scalar())

    pending_count = (db.query(func.count(LoanItem.id)).join(Loan, LoanItem.loan_id == Loan.id).filter(
            Loan.user_id == user_id,
            Loan.status == "PENDING"
        )
        .scalar()
    )

    total = borrowed_count + pending_count + requested_count

    if total > card.max_borrow_books:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bạn đã vượt giới hạn mượn {card.max_borrow_books} cuốn sách"
        )

def create_online_loan(db: Session,user_id: int,book_isbns: list[str]):
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy độc giả"
            )

        if user.role != UserRole.READER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ độc giả mới được gửi yêu cầu mượn"
            )

        if user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản độc giả đã bị khóa"
            )

        if len(book_isbns) != len(set(book_isbns)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không được chọn trùng đầu sách"
            )

        card = check_library_card(db, user_id)

        check_overdue_books(db, user_id)

        check_unpaid_fines(db, user_id)

        check_borrow_limit(db,user_id,card,len(book_isbns))

        loan_items = []

        for isbn in book_isbns:
            book = db.query(Book).filter(Book.isbn == isbn).first()

            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy sách ISBN: {isbn}"
                )

            copy = (db.query(BookCopy).filter(BookCopy.book_isbn == isbn,BookCopy.status == "AVAILABLE").with_for_update().first())

            if not copy:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sách '{book.title}' hiện không còn cuốn có thể mượn"
                )

            loan_items.append(LoanItem(book_isbn=isbn,copy_id=copy.id))

            copy.status = "RESERVED"

        loan = Loan(user_id=user_id,borrow_type="ONLINE",status="PENDING")

        loan.loan_items = loan_items

        db.add(loan)
        db.commit()
        db.refresh(loan)

        return loan
    except Exception:
        db.rollback()
        raise

def cancel_online_loan(db: Session,loan_id: int,user_id: int):
    try:
        loan = (db.query(Loan).filter(Loan.id == loan_id,Loan.user_id == user_id).first())

        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy yêu cầu mượn sách"
            )

        if loan.borrow_type != "ONLINE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ được hủy yêu cầu mượn online"
            )

        if loan.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ được hủy yêu cầu khi chưa được duyệt"
            )

        for item in loan.loan_items:
            if item.copy_id:
                copy = (db.query(BookCopy).filter(BookCopy.id == item.copy_id).first())

                if copy and copy.status == "RESERVED":
                    copy.status = "AVAILABLE"

        loan.status = "CANCELLED"

        db.commit()
        db.refresh(loan)

        return loan
    except Exception:
        db.rollback()
        raise