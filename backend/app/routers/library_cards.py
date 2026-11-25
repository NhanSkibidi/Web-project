"""API Quản lý Độc giả & Thẻ thư viện dành cho Thủ thư và Quản trị viên."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_librarian
from app.crud.library_card import (
    extend_library_card,
    get_reader_card_detail,
    lock_or_unlock_card,
    search_readers_and_cards,
    sync_all_expired_cards,
)
from app.db.session import get_db
from app.models.library_card import LibraryCard
from app.models.user import User
from app.schemas.library_card import (
    CardExtendRequest,
    CardLockUnlockRequest,
    ReaderCardDetailOut,
    ReaderCardSearchResponse,
)

router = APIRouter(prefix="/library-cards", tags=["LibraryCards & Readers"])
readers_router = APIRouter(prefix="/readers", tags=["LibraryCards & Readers"])


def _get_card_or_404(db: Session, card_id: int) -> LibraryCard:
    card = db.query(LibraryCard).filter(LibraryCard.id == card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thẻ thư viện id={card_id}",
        )
    return card


# ==============================================================================
# 1. TÌM KIẾM ĐỘC GIẢ THEO TÊN / MÃ THẺ / SĐT & QUÉT THẺ QUÁ HẠN
# ==============================================================================
@router.get("", response_model=ReaderCardSearchResponse)
@readers_router.get("", response_model=ReaderCardSearchResponse)
def list_and_search_readers(
    q: str | None = Query(None, description="Tìm theo tên độc giả, mã thẻ (LC-xxxx), SĐT hoặc email"),
    keyword: str | None = Query(None, description="Từ khóa tìm kiếm (tương đương q)"),
    status: str | None = Query(None, description="Lọc theo trạng thái thẻ: ACTIVE, EXPIRED, LOCKED"),
    card_type: str | None = Query(None, description="Lọc theo hạng thẻ: STANDARD, STUDENT, VIP"),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_librarian),
):
    """
    Thủ thư tìm độc giả theo tên, mã thẻ (`card_code`), số điện thoại hoặc email.
    Tự động kiểm tra và chuyển các thẻ hết hạn sang trạng thái `EXPIRED`.
    """
    search_kw = q if q is not None else keyword
    return search_readers_and_cards(
        db=db,
        keyword=search_kw,
        status_filter=status,
        card_type_filter=card_type,
    )


@router.post("/check-expired")
def check_and_expire_cards(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_librarian),
):
    """Quét và tự động chuyển tất cả thẻ quá hạn đang ACTIVE sang EXPIRED."""
    updated_count = sync_all_expired_cards(db)
    return {
        "message": (
            f"Đã kiểm tra và tự động chuyển {updated_count} thẻ quá hạn sang EXPIRED"
            if updated_count > 0
            else "Tất cả thẻ ACTIVE đều đang còn hạn sử dụng"
        ),
        "auto_expired_count": updated_count,
    }


# ==============================================================================
# 2. XEM CHI TIẾT ĐỘC GIẢ & THẺ THƯ VIỆN
# ==============================================================================
@router.get("/by-code/{card_code}", response_model=ReaderCardDetailOut)
def get_card_detail_by_code(
    card_code: str,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_librarian),
):
    """Xem chi tiết độc giả & thẻ theo mã thẻ (VD: LC-0001). Tự chuyển EXPIRED nếu hết hạn."""
    return get_reader_card_detail(db, card_code=card_code)


@router.get("/{card_id}", response_model=ReaderCardDetailOut)
def get_card_detail_by_id(
    card_id: int,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_librarian),
):
    """Xem chi tiết độc giả & thẻ theo card_id. Tự chuyển EXPIRED nếu hết hạn."""
    return get_reader_card_detail(db, card_id=card_id)


@readers_router.get("/{reader_id}", response_model=ReaderCardDetailOut)
def get_reader_detail_by_id(
    reader_id: int,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_librarian),
):
    """Xem chi tiết độc giả & thẻ theo reader_id. Tự chuyển EXPIRED nếu hết hạn."""
    return get_reader_card_detail(db, reader_id=reader_id)


# ==============================================================================
# 3. GIA HẠN THẺ THƯ VIỆN
# ==============================================================================
@router.post("/{card_id}/extend", response_model=ReaderCardDetailOut)
def extend_card_by_id(
    card_id: int,
    payload: CardExtendRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_librarian),
):
    """Thủ thư gia hạn thẻ thư viện (tự động kích hoạt lại ACTIVE nếu thẻ đang EXPIRED)."""
    card = _get_card_or_404(db, card_id)
    return extend_library_card(
        db=db,
        card=card,
        months=payload.months,
        new_expiry_date=payload.new_expiry_date,
        card_type=payload.card_type,
        reason=payload.reason,
        performed_by=staff.id,
    )


# ==============================================================================
# 4. KHOÁ / MỞ KHOÁ THẺ THƯ VIỆN KÈM LÝ DO BẮT BUỘC
# ==============================================================================
@router.post("/{card_id}/lock", response_model=ReaderCardDetailOut)
def lock_card_by_id(
    card_id: int,
    payload: CardLockUnlockRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_librarian),
):
    """Thủ thư khóa thẻ thư viện kèm lý do bắt buộc."""
    card = _get_card_or_404(db, card_id)
    return lock_or_unlock_card(
        db=db,
        card=card,
        action="LOCK",
        reason=payload.reason,
        performed_by=staff.id,
    )


@router.post("/{card_id}/unlock", response_model=ReaderCardDetailOut)
def unlock_card_by_id(
    card_id: int,
    payload: CardLockUnlockRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_librarian),
):
    """Thủ thư mở khóa thẻ thư viện kèm lý do (nếu thẻ đã quá hạn sẽ chuyển về EXPIRED)."""
    card = _get_card_or_404(db, card_id)
    return lock_or_unlock_card(
        db=db,
        card=card,
        action="UNLOCK",
        reason=payload.reason,
        performed_by=staff.id,
    )
