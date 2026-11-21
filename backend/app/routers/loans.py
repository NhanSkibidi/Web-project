from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.loan import (
    LoanCreate,
    LoanResponse,
    LoanReject,
    LoanHandover,
    CounterBorrowValidateRequest,
    CounterBorrowValidateResponse,
    CounterBorrowCreateRequest,
    CounterBorrowReceiptResponse,
    ReaderLookupResponse,
    CopyLookupResponse,
    RenewalRequest,
    RenewalResponse,
    OverdueListResponse,
    DueSoonListResponse,
    InAppNotificationListResponse,
    RemindLoanRequest,
    RemindLoanResponse,
)
from app.crud.loan_service import (
    create_online_loan,
    cancel_online_loan,
    approve_loan,
    reject_loan,
    handover_loan,
    get_reader_by_card,
    get_copy_by_barcode,
    validate_counter_borrow,
    create_counter_loan,
    renew_loan_item,
    get_overdue_loans,
    get_due_soon_loans,
    sync_and_get_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    remind_overdue_loan,
    remind_all_overdue,
)

router = APIRouter(prefix="/loans", tags=["Loans"])
readers_router = APIRouter(prefix="/readers", tags=["Readers"])
copies_router = APIRouter(prefix="/copies", tags=["Copies"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── API TRA CỨU ĐỘC GIẢ (READERS) ──────────────────────────────

@readers_router.get("/by-card/{card_code}", response_model=ReaderLookupResponse)
def lookup_reader_by_card(card_code: str, db: Session = Depends(get_db)):
    """Tra cứu độc giả theo mã thẻ thư viện (nhập hoặc quét mã)."""
    return get_reader_by_card(db, card_code)


@router.get("/readers/by-card/{card_code}", response_model=ReaderLookupResponse)
def lookup_reader_by_card_alias(card_code: str, db: Session = Depends(get_db)):
    """Alias cho tra cứu độc giả."""
    return get_reader_by_card(db, card_code)


# ── API TRA CỨU BẢN SAO SÁCH (COPIES) ──────────────────────────

@copies_router.get("/by-barcode/{barcode}", response_model=CopyLookupResponse)
def lookup_copy_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """Tra cứu bản sao sách theo mã vạch / copy_code."""
    return get_copy_by_barcode(db, barcode)


@router.get("/copies/by-barcode/{barcode}", response_model=CopyLookupResponse)
def lookup_copy_by_barcode_alias(barcode: str, db: Session = Depends(get_db)):
    """Alias cho tra cứu bản sao sách."""
    return get_copy_by_barcode(db, barcode)


# ── API MƯỢN SÁCH TẠI QUẦY (COUNTER BORROWING) ─────────────────

@router.post("/counter/validate", response_model=CounterBorrowValidateResponse)
def validate_counter(
    data: CounterBorrowValidateRequest,
    db: Session = Depends(get_db),
):
    """
    Kiểm tra 7 điều kiện mượn sách tại quầy (realtime checklist):
    - CARD_VALID, READER_ALLOWED, LIMIT_NOT_EXCEEDED (<=3),
    - BOOK_EXISTS, COPY_AVAILABLE, NO_RESTRICTION, HAS_BOOKS.
    """
    return validate_counter_borrow(db, data.card_code, data.barcodes)


@router.post("/counter", response_model=CounterBorrowReceiptResponse, status_code=201)
def create_counter(
    data: CounterBorrowCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Tạo phiếu mượn sách trực tiếp tại quầy trong 1 transaction an toàn:
    - Trạng thái phiếu: BORROWED ngay lập tức (không qua PENDING).
    - Hạn trả: +14 ngày.
    - Cập nhật bản sao sang BORROWED và tăng số sách độc giả đang giữ.
    - Chống mượn trùng đồng thời (409 COPY_NOT_AVAILABLE).
    - Trả về payload đầy đủ để in biên lai mượn sách.
    """
    return create_counter_loan(
        db,
        card_code=data.card_code,
        barcodes=data.barcodes,
        librarian_id=data.librarian_id,
    )


# ── API QUY TRÌNH MƯỢN ONLINE HIỆN CÓ ──────────────────────────

@router.post("/online", response_model=LoanResponse, status_code=201)
def create_loan(
    data: LoanCreate,
    user_id: int,
    db: Session = Depends(get_db),
):
    return create_online_loan(db, user_id, data.book_isbns)


@router.patch("/{loan_id}/cancel", response_model=LoanResponse)
def cancel_loan(
    loan_id: int,
    user_id: int,
    db: Session = Depends(get_db),
):
    return cancel_online_loan(db, loan_id, user_id)


@router.patch("/{loan_id}/approve", response_model=LoanResponse)
def approve(
    loan_id: int,
    librarian_id: int,
    db: Session = Depends(get_db),
):
    return approve_loan(db, loan_id, librarian_id)


@router.patch("/{loan_id}/reject", response_model=LoanResponse)
def reject(
    loan_id: int,
    librarian_id: int,
    data: LoanReject,
    db: Session = Depends(get_db),
):
    return reject_loan(db, loan_id, librarian_id, data.reject_reason)


@router.post("/{loan_id}/handover", response_model=LoanResponse)
def handover(
    loan_id: int,
    librarian_id: int,
    data: LoanHandover,
    db: Session = Depends(get_db),
):
    copies_data = [item.model_dump() for item in data.copies]
    return handover_loan(db, loan_id, librarian_id, copies_data)


# ── API GIA HẠN SÁCH (RENEWAL) ──────────────────────────────────

@router.patch("/items/{loan_item_id}/renew", response_model=RenewalResponse)
def renew_item(
    loan_item_id: int,
    data: RenewalRequest,
    db: Session = Depends(get_db),
):
    """
    Gia hạn 1 cuốn sách đang mượn thêm 7 ngày.
    Điều kiện:
    - Cuốn sách chưa quá hạn (due_date >= hôm nay).
    - Chưa gia hạn quá 1 lần (renewal_count < MAX_RENEWALS).
    - Đầu sách không có ai đặt trước (reservations WAITING/READY).
    - Phiếu mượn ở trạng thái BORROWED và cuốn sách chưa trả.
    Hỗ trợ cả độc giả tự gia hạn (truyền user_id) và thủ thư gia hạn hộ (truyền librarian_id).
    """
    return renew_loan_item(
        db,
        loan_item_id=loan_item_id,
        user_id=data.user_id,
        librarian_id=data.librarian_id,
    )


# ── API TASK T3CFF48: QUÁ HẠN, SẮP ĐẾN HẠN & NHẮC TRẢ SÁCH ─────────

@router.get("/overdue", response_model=OverdueListResponse)
def get_overdue(
    user_id: int | None = Query(default=None, description="Lọc theo ID độc giả"),
    search: str | None = Query(default=None, description="Tìm theo tên độc giả, email, tựa sách, mã vạch..."),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách các phiếu mượn / cuốn sách đang bị quá hạn.
    - Tính số ngày quá hạn và tiền phạt tạm tính theo quy chuẩn KS25 (2.000 đ/ngày).
    - Ưu tiên hiển thị phiếu quá hạn lâu nhất lên đầu.
    """
    return get_overdue_loans(db, user_id=user_id, search=search, skip=skip, limit=limit)


@router.get("/due-soon", response_model=DueSoonListResponse)
def get_due_soon(
    user_id: int | None = Query(default=None, description="Lọc theo ID độc giả"),
    days: int = Query(default=2, ge=1, le=7, description="Số ngày sắp đến hạn (mặc định 2 ngày)"),
    search: str | None = Query(default=None, description="Tìm theo tên độc giả, tựa sách, mã vạch..."),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách các cuốn sách sắp đến hạn trong vòng `days` ngày (mặc định 2 ngày).
    - Trả về nhãn trạng thái thân thiện: "Hôm nay (hết hạn)", "Còn 1 ngày", "Còn 2 ngày".
    """
    return get_due_soon_loans(db, user_id=user_id, days=days, search=search, skip=skip, limit=limit)


@router.get("/notifications/my", response_model=InAppNotificationListResponse)
@notifications_router.get("/my", response_model=InAppNotificationListResponse)
def get_my_notifications(
    user_id: int | None = Query(default=None, description="ID độc giả (None: lấy tất cả hoặc hệ thống)"),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách thông báo in-app cho chuông thông báo trên topbar header.
    Tự động đồng bộ và sinh thông báo nhắc nhở cho các sách quá hạn và sắp đến hạn.
    """
    return sync_and_get_notifications(db, user_id=user_id, limit=limit)


@router.patch("/notifications/{notification_id}/read")
@notifications_router.patch("/{notification_id}/read")
def read_notification(
    notification_id: int,
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Đánh dấu một thông báo là đã đọc."""
    success = mark_notification_read(db, notification_id, user_id=user_id)
    return {"success": success, "notification_id": notification_id}


@router.post("/notifications/mark-all-read")
@notifications_router.post("/mark-all-read")
def mark_all_read(
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Đánh dấu toàn bộ thông báo in-app là đã đọc."""
    count = mark_all_notifications_read(db, user_id=user_id)
    return {"success": True, "updated_count": count}


@router.post("/{loan_id}/remind", response_model=RemindLoanResponse)
def remind_reader(
    loan_id: int,
    data: RemindLoanRequest,
    db: Session = Depends(get_db),
):
    """
    Thủ thư gửi thông báo in-app nhắc trả sách quá hạn cho độc giả của phiếu mượn.
    """
    return remind_overdue_loan(
        db,
        loan_id=loan_id,
        librarian_id=data.librarian_id,
        custom_message=data.message,
    )


@router.post("/remind-all-overdue")
def remind_all(
    librarian_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Thủ thư gửi thông báo in-app nhắc nhở hàng loạt đến tất cả độc giả đang có sách quá hạn.
    """
    return remind_all_overdue(db, librarian_id=librarian_id)

