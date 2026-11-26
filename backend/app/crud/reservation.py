from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.dependencies import check_card_can_borrow
from app.crud.copy_status_log import change_copy_status
from app.crud.fine import has_unpaid_fines
from app.models.reservation import Reservation, ReservationStatus
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.CopyStatusLog import CopyStatusLog
from app.models.library_card import LibraryCard
from app.models.loan import BorrowType, Loan, LoanStatus
from app.models.loan_item import LoanItem
from app.models.notification import Notification
from app.models.user import User, UserRole, UserStatus

RESERVATION_HOLD_HOURS = 48
BORROW_DAYS = 14
DEFAULT_MAX_BORROW_BOOKS = 5


def format_reservation_response(
    db: Session,
    res: Reservation,
    loan: Optional[Loan] = None,
) -> dict:
    """Format đối tượng Reservation thành dict giàu thông tin phục vụ UI."""
    book = db.query(Book).filter(Book.isbn == res.book_isbn).first()
    reader = db.query(User).filter(User.id == res.user_id).first()
    copy = db.query(BookCopy).filter(BookCopy.id == res.copy_id).first() if res.copy_id else None

    # Tính vị trí hàng chờ nếu đang ở trạng thái WAITING (FIFO theo thời gian)
    queue_pos = None
    if res.status == "WAITING":
        queue_pos = (
            db.query(Reservation)
            .filter(
                Reservation.book_isbn == res.book_isbn,
                Reservation.status == "WAITING",
                (Reservation.reserved_at < res.reserved_at)
                | ((Reservation.reserved_at == res.reserved_at) & (Reservation.id <= res.id)),
            )
            .count()
        )

    # Lấy danh sách tên tác giả từ quan hệ book_authors (tránh đọc nhầm thuộc tính đơn book.author)
    author_name = "Không rõ tác giả"
    if book:
        names = [
            ba.author.name
            for ba in (getattr(book, "book_authors", None) or [])
            if getattr(ba, "author", None) and getattr(ba.author, "name", None)
        ]
        if names:
            author_name = ", ".join(names)

    # Lấy thông tin vị trí kệ sách
    shelf = "Quầy thủ thư (Sách đặt trước)"
    if copy and getattr(copy, "shelf_location", None):
        shelf = copy.shelf_location
    elif book:
        first_copy = next(iter(getattr(book, "copies", None) or []), None)
        if first_copy and getattr(first_copy, "shelf_location", None):
            shelf = first_copy.shelf_location

    copy_code = getattr(copy, "copy_code", "") if copy else ""
    copy_barcode = getattr(copy, "barcode", copy_code) if copy else ""

    return {
        "id": res.id,
        "user_id": res.user_id,
        "book_isbn": res.book_isbn,
        "book_id": res.book_isbn,
        "reserved_at": res.reserved_at,
        "status": res.status,
        "pickup_deadline": res.pickup_deadline,
        "copy_id": res.copy_id,
        "queue_position": queue_pos,
        "book_title": getattr(book, "title", "Không rõ nhan đề") if book else "Không rõ nhan đề",
        "book_author": author_name,
        "book_cover": getattr(book, "cover_image", "") if book else "",
        "user_name": getattr(reader, "full_name", getattr(reader, "email", "Độc giả")) if reader else "Độc giả",
        "user_email": getattr(reader, "email", "") if reader else "",
        "student_id": getattr(reader, "student_id", getattr(reader, "code", "")) if reader else "",
        "copy_barcode": copy_barcode,
        "copy_code": copy_code,
        "shelf_location": shelf,
        "loan_id": loan.id if loan else None,
        "loan_code": loan.code if loan else None,
    }


def assign_copy_to_next_waiting_reservation_in_tx(
    db: Session,
    copy: Optional[BookCopy],
    reason_prefix: str = "Giữ sách cho độc giả đặt trước",
    now: Optional[datetime] = None,
) -> Optional[dict]:
    """
    Trong cùng transaction: nếu bản sao đang AVAILABLE và có độc giả WAITING đặt trước đầu sách này,
    gán bản sao cho người đứng đầu hàng chờ (FIFO), chuyển bản sao -> RESERVED, đơn -> READY (48h)
    và tạo thông báo in-app. Không tự commit.
    """
    if not copy or copy.status != "AVAILABLE":
        return None

    now = now or datetime.now()
    next_res = (
        db.query(Reservation)
        .filter(
            Reservation.book_isbn == copy.book_isbn,
            Reservation.status == "WAITING",
        )
        .order_by(Reservation.reserved_at.asc(), Reservation.id.asc())
        .with_for_update()
        .first()
    )
    if not next_res:
        return None

    deadline = now + timedelta(hours=RESERVATION_HOLD_HOURS)
    next_res.status = "READY"
    next_res.copy_id = copy.id
    next_res.pickup_deadline = deadline
    copy.status = "RESERVED"

    db.add(
        CopyStatusLog(
            book_copy_id=copy.id,
            old_status="AVAILABLE",
            new_status="RESERVED",
            reason=f"{reason_prefix} #{next_res.id}",
        )
    )

    reader = db.query(User).filter(User.id == next_res.user_id).first()
    book = db.query(Book).filter(Book.isbn == copy.book_isbn).first()
    book_title = book.title if book else copy.book_isbn
    deadline_str = deadline.strftime("%d/%m/%Y %H:%M")

    db.add(
        Notification(
            user_id=next_res.user_id,
            title=f"Sách đặt trước đã sẵn sàng: {book_title}",
            message=(
                f"Đơn đặt trước #DT-{next_res.id:04d} cho cuốn '{book_title}' "
                f"(bản sao {copy.copy_code}) đã sẵn sàng tại quầy. "
                f"Vui lòng đến nhận trước {deadline_str} (giữ trong 48 giờ)."
            ),
            type="RESERVATION_READY",
            is_read=False,
        )
    )

    return {
        "reservation_id": next_res.id,
        "to_email": reader.email if (reader and reader.email) else None,
        "reader_name": reader.full_name if reader else f"Độc giả #{next_res.user_id}",
        "book_title": book_title,
        "copy_code": copy.copy_code,
        "pickup_deadline": deadline_str,
    }


def _append_ready_email_if_applicable(email_queue: Optional[list[dict]], res_info: Optional[dict]) -> None:
    if email_queue is not None and res_info and res_info.get("to_email"):
        email_queue.append({
            "to_email": res_info["to_email"],
            "reader_name": res_info["reader_name"],
            "book_title": res_info["book_title"],
            "copy_code": res_info["copy_code"],
            "pickup_deadline": res_info["pickup_deadline"],
        })


def expire_overdue_reservations_in_tx(
    db: Session,
    book_isbn: Optional[str] = None,
    now: Optional[datetime] = None,
    email_queue: Optional[list[dict]] = None,
) -> int:
    """Quét các lượt READY quá hạn 48h (không tự commit), chuyển EXPIRED và nhường bản sao."""
    now = now or datetime.now()
    query = db.query(Reservation).filter(
        Reservation.status == "READY",
        Reservation.pickup_deadline.isnot(None),
        Reservation.pickup_deadline < now,
    )
    if book_isbn:
        query = query.filter(Reservation.book_isbn == book_isbn)

    expired_reservations = query.with_for_update().all()
    count = 0
    for res in expired_reservations:
        copy_id = res.copy_id
        res.status = "EXPIRED"
        res.copy_id = None
        count += 1

        if copy_id:
            copy = (
                db.query(BookCopy)
                .filter(BookCopy.id == copy_id)
                .with_for_update()
                .first()
            )
            if copy and copy.status == "RESERVED":
                copy.status = "AVAILABLE"
                db.add(
                    CopyStatusLog(
                        book_copy_id=copy.id,
                        old_status="RESERVED",
                        new_status="AVAILABLE",
                        reason=f"Hết hạn giữ chỗ đơn đặt trước #{res.id}",
                    )
                )
                db.flush()
                res_info = assign_copy_to_next_waiting_reservation_in_tx(
                    db,
                    copy,
                    reason_prefix=f"Chuyển lượt từ đơn quá hạn #{res.id} sang đặt trước",
                    now=now,
                )
                _append_ready_email_if_applicable(email_queue, res_info)
        db.flush()

    return count


def promote_available_copies_for_waiting_in_tx(
    db: Session,
    book_isbn: Optional[str] = None,
    now: Optional[datetime] = None,
    email_queue: Optional[list[dict]] = None,
) -> int:
    """Đồng bộ/tự chữa: nếu còn bản sao AVAILABLE trong khi đang có người WAITING, giữ ngay cho người xếp hàng."""
    now = now or datetime.now()
    waiting_isbns_query = db.query(Reservation.book_isbn).filter(Reservation.status == "WAITING")
    if book_isbn:
        waiting_isbns_query = waiting_isbns_query.filter(Reservation.book_isbn == book_isbn)
    waiting_isbns = [row[0] for row in waiting_isbns_query.distinct().all()]

    promoted = 0
    for isbn in waiting_isbns:
        avail_copies = (
            db.query(BookCopy)
            .filter(BookCopy.book_isbn == isbn, BookCopy.status == "AVAILABLE")
            .order_by(BookCopy.id.asc())
            .with_for_update()
            .all()
        )
        for copy in avail_copies:
            res_info = assign_copy_to_next_waiting_reservation_in_tx(
                db,
                copy,
                reason_prefix="Tự động giữ bản sao khả dụng cho đặt trước",
                now=now,
            )
            if not res_info:
                break
            _append_ready_email_if_applicable(email_queue, res_info)
            promoted += 1
            db.flush()

    return promoted


def create_reservation(db: Session, user_id: int, book_isbn: str) -> dict:
    """Độc giả đặt trước đầu sách khi đã hết bản sao khả dụng (tối đa 3 lượt/người, FIFO)."""
    clean_isbn = book_isbn.strip()
    book = db.query(Book).filter(Book.isbn == clean_isbn, Book.is_deleted == False).first()  # noqa: E712
    if not book:
        raise HTTPException(status_code=404, detail="Không tìm thấy đầu sách với mã ISBN này")

    # Đồng bộ trạng thái đặt trước quá hạn / bản sao khả dụng đang chờ
    expired_cnt = expire_overdue_reservations_in_tx(db, book_isbn=clean_isbn)
    healed_cnt = promote_available_copies_for_waiting_in_tx(db, book_isbn=clean_isbn)
    if expired_cnt > 0 or healed_cnt > 0:
        db.commit()

    # 1. Kiểm tra đầu sách có bản sao vật lý trong kho và đã hết bản khả dụng chưa
    total_copies = (
        db.query(BookCopy)
        .filter(BookCopy.book_isbn == clean_isbn)
        .count()
    )
    if total_copies == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Đầu sách '{book.title}' hiện chưa có bản sao vật lý nào trong kho, chưa thể mượn hoặc đặt trước.",
        )

    available_copies = (
        db.query(BookCopy)
        .filter(BookCopy.book_isbn == clean_isbn, BookCopy.status == "AVAILABLE")
        .count()
    )
    waiting_count = (
        db.query(Reservation)
        .filter(Reservation.book_isbn == clean_isbn, Reservation.status == "WAITING")
        .count()
    )
    effective_available = max(0, available_copies - waiting_count)
    if effective_available > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Đầu sách '{book.title}' hiện vẫn còn {effective_available} bản sao khả dụng tại thư viện. Bạn có thể mượn trực tiếp mà không cần đặt trước.",
        )

    # 2. Kiểm tra giới hạn: Độc giả chỉ được đặt trước tối đa 3 đầu sách cùng lúc
    active_count = (
        db.query(Reservation)
        .filter(
            Reservation.user_id == user_id,
            Reservation.status.in_(["WAITING", "READY"]),
        )
        .count()
    )
    if active_count >= 3:
        raise HTTPException(
            status_code=400,
            detail="Mỗi độc giả chỉ được đặt trước tối đa 3 đầu sách cùng lúc. Vui lòng huỷ hoặc hoàn thành các lượt trước đó.",
        )

    # 3. Kiểm tra không đặt trùng lặp cùng 1 đầu sách
    existing = (
        db.query(Reservation)
        .filter(
            Reservation.user_id == user_id,
            Reservation.book_isbn == clean_isbn,
            Reservation.status.in_(["WAITING", "READY"]),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Bạn đã có một yêu cầu đặt trước đang hiệu lực cho cuốn '{book.title}'.",
        )

    # 4. Tạo bản ghi đặt trước mới
    new_res = Reservation(
        user_id=user_id,
        book_isbn=clean_isbn,
        reserved_at=datetime.now(),
        status="WAITING",
        pickup_deadline=None,
        copy_id=None,
    )
    db.add(new_res)
    db.commit()
    db.refresh(new_res)

    return format_reservation_response(db, new_res)


def get_user_reservations(db: Session, user_id: int) -> List[dict]:
    """Lấy danh sách tất cả các lượt đặt trước của độc giả kèm vị trí hàng chờ và hạn lấy."""
    # Tự động quét và cập nhật các đơn quá hạn trước khi trả về
    check_and_expire_reservations(db)

    reservations = (
        db.query(Reservation)
        .filter(Reservation.user_id == user_id)
        .order_by(Reservation.reserved_at.desc())
        .all()
    )
    return [format_reservation_response(db, r) for r in reservations]


def get_active_reservations_for_staff(
    db: Session,
    status_filter: Optional[ReservationStatus] = None,
    include_history: bool = False,
) -> List[dict]:
    """Thủ thư xem danh sách đặt trước (mặc định READY/WAITING; hỗ trợ lọc theo 5 trạng thái ReservationStatus hoặc lấy kèm lịch sử)."""
    check_and_expire_reservations(db)

    if status_filter is not None:
        target_status = status_filter.value if isinstance(status_filter, ReservationStatus) else str(status_filter).upper()
        query = db.query(Reservation).filter(Reservation.status == target_status)
        if target_status == ReservationStatus.READY.value:
            rows = query.order_by(Reservation.pickup_deadline.asc(), Reservation.id.asc()).all()
        elif target_status == ReservationStatus.WAITING.value:
            rows = query.order_by(Reservation.reserved_at.asc(), Reservation.id.asc()).all()
        else:
            rows = query.order_by(Reservation.reserved_at.desc(), Reservation.id.desc()).all()
        return [format_reservation_response(db, r) for r in rows]

    ready_list = (
        db.query(Reservation)
        .filter(Reservation.status == ReservationStatus.READY.value)
        .order_by(Reservation.pickup_deadline.asc(), Reservation.id.asc())
        .all()
    )
    waiting_list = (
        db.query(Reservation)
        .filter(Reservation.status == ReservationStatus.WAITING.value)
        .order_by(Reservation.reserved_at.asc(), Reservation.id.asc())
        .all()
    )
    combined = ready_list + waiting_list

    if include_history:
        history_list = (
            db.query(Reservation)
            .filter(
                Reservation.status.in_([
                    ReservationStatus.FULFILLED.value,
                    ReservationStatus.EXPIRED.value,
                    ReservationStatus.CANCELLED.value,
                ])
            )
            .order_by(Reservation.reserved_at.desc(), Reservation.id.desc())
            .all()
        )
        combined.extend(history_list)

    return [format_reservation_response(db, r) for r in combined]


def cancel_reservation(
    db: Session,
    reservation_id: int,
    user_id: Optional[int] = None,
    email_queue: Optional[list[dict]] = None,
) -> dict:
    """Huỷ đặt trước. Nếu đang READY thì chuyển bản sao cho người tiếp theo hoặc về AVAILABLE."""
    res = db.query(Reservation).filter(Reservation.id == reservation_id).with_for_update().first()
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đặt trước")

    if user_id is not None and res.user_id != user_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền huỷ yêu cầu đặt trước của người khác")

    if res.status not in ["WAITING", "READY"]:
        raise HTTPException(
            status_code=400,
            detail=f"Không thể huỷ yêu cầu đặt trước ở trạng thái '{res.status}'",
        )

    old_copy_id = res.copy_id
    old_status = res.status

    # Đổi trạng thái sang CANCELLED
    res.status = "CANCELLED"
    res.copy_id = None
    res.pickup_deadline = None

    # Nếu đang READY mà huỷ, giải phóng bản sao cho người tiếp theo
    if old_status == "READY" and old_copy_id:
        copy = db.query(BookCopy).filter(BookCopy.id == old_copy_id).with_for_update().first()
        if copy and copy.status == "RESERVED":
            copy.status = "AVAILABLE"
            db.add(
                CopyStatusLog(
                    book_copy_id=copy.id,
                    old_status="RESERVED",
                    new_status="AVAILABLE",
                    reason=f"Hủy đơn đặt trước #{res.id}",
                )
            )
            db.flush()
            res_info = assign_copy_to_next_waiting_reservation_in_tx(
                db,
                copy,
                reason_prefix=f"Chuyển lượt từ đơn hủy #{res.id} sang đặt trước",
            )
            _append_ready_email_if_applicable(email_queue, res_info)

    db.commit()
    db.refresh(res)
    return format_reservation_response(db, res)


def check_and_expire_reservations(
    db: Session,
    email_queue: Optional[list[dict]] = None,
) -> int:
    """Quá hạn 2 ngày chưa đến lấy: Chuyển sang EXPIRED và chuyển sách cho người tiếp theo."""
    expired_count = expire_overdue_reservations_in_tx(db, email_queue=email_queue)
    promoted_count = promote_available_copies_for_waiting_in_tx(db, email_queue=email_queue)

    if expired_count > 0 or promoted_count > 0:
        db.commit()

    return expired_count


def fulfill_reservation(
    db: Session,
    reservation_id: int,
    librarian_id: Optional[int] = None,
) -> dict:
    """Thủ thư xác nhận đã giao sách đặt trước cho độc giả tại quầy (chuyển sang FULFILLED và tạo phiếu mượn BORROWED)."""
    now = datetime.now()
    res = (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id)
        .with_for_update()
        .first()
    )
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đặt trước")

    if res.status != "READY":
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ có thể giao sách cho yêu cầu ở trạng thái READY (hiện tại là '{res.status}')",
        )

    # Nếu đơn READY đã quá hạn 48h thì tự động expire & chuyển lượt thay vì giao nhầm
    if res.pickup_deadline and res.pickup_deadline < now:
        expire_overdue_reservations_in_tx(db, book_isbn=res.book_isbn, now=now)
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Đơn đặt trước đã quá hạn 48 giờ giữ sách và đã được hệ thống chuyển lượt cho người kế tiếp.",
        )

    reader = db.query(User).filter(User.id == res.user_id).first()
    if not reader:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản độc giả")
    if reader.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Tài khoản độc giả đã bị khóa, không thể giao sách")

    card = None
    if reader.role == UserRole.READER:
        card = check_card_can_borrow(db, reader.id)
    else:
        existing_card = (
            db.query(LibraryCard)
            .filter(LibraryCard.reader_id == reader.id)
            .order_by(LibraryCard.id.desc())
            .first()
        )
        if existing_card:
            card = check_card_can_borrow(db, reader.id)

    overdue_item = (
        db.query(LoanItem)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.user_id == reader.id,
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date < now,
        )
        .first()
    )
    if overdue_item:
        raise HTTPException(status_code=400, detail="Độc giả đang có sách quá hạn chưa trả, không thể nhận thêm sách")

    if has_unpaid_fines(db, reader.id):
        raise HTTPException(status_code=400, detail="Độc giả đang có khoản phạt chưa thanh toán")

    max_limit = card.max_borrow_books if (card and card.max_borrow_books) else DEFAULT_MAX_BORROW_BOOKS
    holding_count = (
        db.query(func.count(LoanItem.id))
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.user_id == reader.id,
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
        )
        .scalar()
    ) or 0
    if holding_count + 1 > max_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Độc giả đang mượn {holding_count}/{max_limit} cuốn, đã đạt giới hạn mượn tối đa.",
        )

    copy = None
    if res.copy_id:
        copy = (
            db.query(BookCopy)
            .filter(BookCopy.id == res.copy_id)
            .with_for_update()
            .first()
        )
    else:
        copy = (
            db.query(BookCopy)
            .filter(BookCopy.book_isbn == res.book_isbn, BookCopy.status == "AVAILABLE")
            .with_for_update()
            .first()
        )

    if not copy or copy.status not in ("RESERVED", "AVAILABLE"):
        raise HTTPException(
            status_code=400,
            detail="Không tìm thấy bản sao hợp lệ đang giữ cho đơn đặt trước này",
        )

    due_date = now + timedelta(days=BORROW_DAYS)
    loan = Loan(
        user_id=reader.id,
        processed_by=librarian_id,
        borrow_type=BorrowType.WALK_IN,
        status=LoanStatus.BORROWED,
        borrowed_at=now,
        due_date=due_date,
    )
    db.add(loan)
    db.flush()

    loan_item = LoanItem(
        loan_id=loan.id,
        book_isbn=res.book_isbn,
        copy_id=copy.id,
        due_date=due_date,
    )
    db.add(loan_item)

    change_copy_status(
        db,
        copy.id,
        "BORROWED",
        reason=f"Giao sách cho đơn đặt trước #{res.id}",
        auto_commit=False,
    )

    res.copy_id = copy.id
    res.status = "FULFILLED"
    db.commit()
    db.refresh(res)
    db.refresh(loan)
    return format_reservation_response(db, res, loan=loan)
