from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Header
from sqlalchemy.orm import Session

from app.core.dependencies import require_librarian
from app.db.session import get_db
from app.models.user import User
from app.schemas.reservation import (
    ReservationCreate,
    ReservationResponse,
)
from app.crud.reservation import (
    create_reservation,
    get_user_reservations,
    get_ready_reservations_for_staff,
    cancel_reservation,
    check_and_expire_reservations,
    fulfill_reservation,
)

router = APIRouter(prefix="/reservations", tags=["Reservations"])


def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Lấy user từ Bearer token nếu có, hoặc trả về None nếu không có header."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        from app.core.security import decode_access_token
        user_id = decode_access_token(token)
        if user_id:
            return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        pass
    return None


@router.post("", response_model=ReservationResponse)
@router.post("/", response_model=ReservationResponse)
def api_create_reservation(
    payload: ReservationCreate,
    user_id: Optional[int] = Query(None, description="ID độc giả nếu không gửi kèm JWT Token"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Độc giả đặt trước một đầu sách đã hết (tối đa 3 lượt/người, FIFO theo thời gian).
    """
    effective_user_id = current_user.id if current_user else (payload.user_id or user_id)
    if not effective_user_id:
        raise HTTPException(
            status_code=401,
            detail="Vui lòng đăng nhập hoặc cung cấp user_id để đặt trước tài liệu.",
        )

    isbn = payload.get_book_isbn()
    if not isbn:
        raise HTTPException(status_code=400, detail="Cần cung cấp book_isbn hoặc book_id để đặt trước")

    return create_reservation(db, user_id=effective_user_id, book_isbn=isbn)


@router.get("/my", response_model=List[ReservationResponse])
def api_get_my_reservations(
    user_id: Optional[int] = Query(None, description="ID độc giả nếu không gửi JWT"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Danh sách các lượt đặt trước của độc giả kèm vị trí hàng chờ (Queue position) và hạn đến lấy.
    """
    effective_user_id = current_user.id if current_user else user_id
    if not effective_user_id:
        raise HTTPException(
            status_code=401,
            detail="Vui lòng đăng nhập hoặc truyền tham số user_id để xem danh sách đặt trước.",
        )

    return get_user_reservations(db, user_id=effective_user_id)


@router.get("/staff/ready", response_model=List[ReservationResponse], dependencies=[Depends(require_librarian)])
def api_get_staff_ready_reservations(
    db: Session = Depends(get_db),
):
    """
    Dành cho Thủ thư: Xem danh sách các lượt đặt trước trạng thái READY cần chuẩn bị sách tại quầy.
    """
    return get_ready_reservations_for_staff(db)


@router.post("/{reservation_id}/cancel", response_model=ReservationResponse)
@router.delete("/{reservation_id}", response_model=ReservationResponse)
def api_cancel_reservation(
    reservation_id: int,
    user_id: Optional[int] = Query(None, description="ID độc giả muốn huỷ lượt"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Độc giả hoặc Thủ thư huỷ lượt đặt trước.
    Nếu lượt đang ở trạng thái READY thì bản sao sẽ tự động được chuyển cho người tiếp theo hoặc về AVAILABLE.
    """
    effective_user_id = current_user.id if current_user else user_id
    # Nếu là ADMIN hoặc LIBRARIAN thì không ép kiểm tra chủ sở hữu
    if current_user and current_user.role in ["ADMIN", "LIBRARIAN"]:
        effective_user_id = None

    return cancel_reservation(db, reservation_id=reservation_id, user_id=effective_user_id)


@router.post("/{reservation_id}/fulfill", response_model=ReservationResponse, dependencies=[Depends(require_librarian)])
def api_fulfill_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
):
    """
    Dành cho Thủ thư: Xác nhận độc giả đã đến nhận sách tại quầy (chuyển trạng thái sang FULFILLED).
    """
    return fulfill_reservation(db, reservation_id=reservation_id)


@router.post("/check-expired", dependencies=[Depends(require_librarian)])
def api_check_expired_reservations(
    db: Session = Depends(get_db),
):
    """
    Tác vụ quét và xử lý các lượt READY quá hạn 2 ngày chưa đến lấy:
    Chuyển sang EXPIRED và tự động nhường sách cho người tiếp theo trong hàng chờ.
    """
    count = check_and_expire_reservations(db)
    return {
        "status": "SUCCESS",
        "expired_count": count,
        "message": f"Đã quét và xử lý chuyển lượt cho {count} yêu cầu quá hạn lấy sách.",
    }
