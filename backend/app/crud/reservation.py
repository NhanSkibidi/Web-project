from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.reservation import Reservation, ReservationStatus
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.user import User


def format_reservation_response(db: Session, res: Reservation) -> dict:
    """Format đối tượng Reservation thành dict giàu thông tin phục vụ UI."""
    book = db.query(Book).filter(Book.isbn == res.book_isbn).first()
    reader = db.query(User).filter(User.id == res.user_id).first()
    copy = db.query(BookCopy).filter(BookCopy.id == res.copy_id).first() if res.copy_id else None

    # Tính vị trí hàng chờ nếu đang ở trạng thái WAITING
    queue_pos = None
    if res.status == "WAITING":
        queue_pos = (
            db.query(Reservation)
            .filter(
                Reservation.book_isbn == res.book_isbn,
                Reservation.status == "WAITING",
                Reservation.reserved_at <= res.reserved_at,
            )
            .count()
        )

    # Lấy thông tin vị trí kệ sách
    shelf = "Quầy thủ thư (Sách đặt trước)"
    if copy:
        shelf = f"Kệ {getattr(copy, 'shelf_number', 'A')} - Tầng 1"

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
        "book_author": getattr(book, "author", "Không rõ tác giả") if book else "",
        "book_cover": getattr(book, "cover_image", "") if book else "",
        "user_name": getattr(reader, "full_name", getattr(reader, "email", "Độc giả")) if reader else "Độc giả",
        "user_email": getattr(reader, "email", "") if reader else "",
        "student_id": getattr(reader, "student_id", getattr(reader, "code", "")) if reader else "",
        "copy_barcode": getattr(copy, "barcode", getattr(copy, "copy_code", "")) if copy else "",
        "copy_code": getattr(copy, "copy_code", "") if copy else "",
        "shelf_location": shelf,
    }


def create_reservation(db: Session, user_id: int, book_isbn: str) -> dict:
    """Độc giả đặt trước đầu sách khi đã hết bản sao (tối đa 3 lượt/người, FIFO)."""
    clean_isbn = book_isbn.strip()
    book = db.query(Book).filter(Book.isbn == clean_isbn).first()
    if not book:
        raise HTTPException(status_code=404, detail="Không tìm thấy đầu sách với mã ISBN này")

    # 1. Kiểm tra sách đã hết bản sao khả dụng chưa
    available_copies = (
        db.query(BookCopy)
        .filter(BookCopy.book_isbn == clean_isbn, BookCopy.status == "AVAILABLE")
        .count()
    )
    if available_copies > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Đầu sách '{book.title}' hiện vẫn còn {available_copies} bản sao khả dụng tại thư viện. Bạn có thể mượn trực tiếp mà không cần đặt trước.",
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


def get_ready_reservations_for_staff(db: Session) -> List[dict]:
    """Thủ thư xem danh sách các lượt đặt trước READY cần chuẩn bị sách tại quầy."""
    # Tự động quét các đơn quá hạn
    check_and_expire_reservations(db)

    ready_list = (
        db.query(Reservation)
        .filter(Reservation.status == "READY")
        .order_by(Reservation.pickup_deadline.asc())
        .all()
    )
    return [format_reservation_response(db, r) for r in ready_list]


def cancel_reservation(db: Session, reservation_id: int, user_id: Optional[int] = None) -> dict:
    """Huỷ đặt trước. Nếu đang READY thì chuyển bản sao cho người tiếp theo hoặc về AVAILABLE."""
    res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
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
    book_isbn = res.book_isbn

    # Đổi trạng thái sang CANCELLED
    res.status = "CANCELLED"
    res.copy_id = None
    res.pickup_deadline = None

    # Nếu đang READY mà huỷ, giải phóng bản sao cho người tiếp theo
    if old_status == "READY" and old_copy_id:
        copy = db.query(BookCopy).filter(BookCopy.id == old_copy_id).first()
        if copy:
            # Tìm người tiếp theo trong hàng chờ
            next_res = (
                db.query(Reservation)
                .filter(
                    Reservation.book_isbn == book_isbn,
                    Reservation.status == "WAITING",
                )
                .order_by(Reservation.reserved_at.asc())
                .first()
            )
            if next_res:
                next_res.status = "READY"
                next_res.copy_id = copy.id
                next_res.pickup_deadline = datetime.now() + timedelta(days=2)
                copy.status = "RESERVED"
            else:
                copy.status = "AVAILABLE"

    db.commit()
    db.refresh(res)
    return format_reservation_response(db, res)


def process_returned_copy_for_reservation(db: Session, copy: BookCopy) -> Optional[Reservation]:
    """Khi có cuốn sách được trả về kho, kiểm tra người đầu hàng chuyển READY và giữ 2 ngày."""
    if not copy:
        return None

    # Tìm độc giả đầu hàng đang chờ (FIFO)
    next_res = (
        db.query(Reservation)
        .filter(
            Reservation.book_isbn == copy.book_isbn,
            Reservation.status == "WAITING",
        )
        .order_by(Reservation.reserved_at.asc())
        .first()
    )

    if next_res:
        # Chuyển người đầu hàng sang READY, giữ sách 2 ngày, bản sao thành RESERVED
        next_res.status = "READY"
        next_res.copy_id = copy.id
        next_res.pickup_deadline = datetime.now() + timedelta(days=2)
        copy.status = "RESERVED"
        return next_res
    else:
        # Không có ai chờ, trả sách về AVAILABLE
        copy.status = "AVAILABLE"
        return None


def check_and_expire_reservations(db: Session) -> int:
    """Quá hạn 2 ngày chưa đến lấy: Chuyển sang EXPIRED và chuyển sách cho người tiếp theo."""
    now = datetime.now()
    expired_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.status == "READY",
            Reservation.pickup_deadline.isnot(None),
            Reservation.pickup_deadline < now,
        )
        .all()
    )

    count = 0
    for res in expired_reservations:
        copy_id = res.copy_id
        book_isbn = res.book_isbn

        # Đánh dấu quá hạn
        res.status = "EXPIRED"
        res.copy_id = None
        count += 1

        if copy_id:
            copy = db.query(BookCopy).filter(BookCopy.id == copy_id).first()
            if copy:
                # Chuyển cho người tiếp theo trong hàng chờ
                next_res = (
                    db.query(Reservation)
                    .filter(
                        Reservation.book_isbn == book_isbn,
                        Reservation.status == "WAITING",
                    )
                    .order_by(Reservation.reserved_at.asc())
                    .first()
                )
                if next_res:
                    next_res.status = "READY"
                    next_res.copy_id = copy.id
                    next_res.pickup_deadline = now + timedelta(days=2)
                    copy.status = "RESERVED"
                else:
                    copy.status = "AVAILABLE"

    if count > 0:
        db.commit()

    return count


def fulfill_reservation(db: Session, reservation_id: int) -> dict:
    """Thủ thư xác nhận đã giao sách đặt trước cho độc giả tại quầy (chuyển sang FULFILLED)."""
    res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đặt trước")

    if res.status != "READY":
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ có thể giao sách cho yêu cầu ở trạng thái READY (hiện tại là '{res.status}')",
        )

    res.status = "FULFILLED"
    db.commit()
    db.refresh(res)
    return format_reservation_response(db, res)
