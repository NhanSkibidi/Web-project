from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Literal

from app.core.dependencies import bearer_scheme, get_current_user, require_librarian
from app.models.user import User, UserRole
from app.services.email_service import (
    send_due_soon_reminder_email,
    send_overdue_reminder_email,
)
from app.crud.loan_service import (
    approve_loan,
    cancel_online_loan,
    create_counter_loan,
    create_online_loan,
    get_copy_by_barcode,
    get_due_soon_loans,
    get_loans_history,
    get_overdue_loans,
    get_reader_by_card,
    handover_loan,
    mark_all_notifications_read,
    mark_notification_read,
    reject_loan,
    remind_all_overdue,
    remind_overdue_loan,
    renew_loan,
    renew_loan_item,
    sync_and_get_notifications,
    validate_counter_borrow,
)
from app.db.session import get_db
from app.schemas.loan import (
    CopyLookupResponse,
    CounterBorrowCreateRequest,
    CounterBorrowReceiptResponse,
    CounterBorrowValidateRequest,
    CounterBorrowValidateResponse,
    DueSoonListResponse,
    InAppNotificationListResponse,
    LoanCreate,
    LoanHandover,
    LoanHistoryOut,
    LoanReject,
    LoanResponse,
    OverdueListResponse,
    ReaderLookupResponse,
    RemindLoanRequest,
    RemindLoanResponse,
    RenewalRequest,
    RenewalResponse,
    LoanRenewalResponse,
)

router = APIRouter(prefix="/loans", tags=["Loans"])


def _resolve_user_id(
    explicit_id: int | None,
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> int:
    """Ưu tiên lấy ID từ query param explicit_id nếu có, hoặc tự giải mã từ JWT Bearer Token."""
    if explicit_id is not None:
        return explicit_id
    if credentials is not None:
        user = get_current_user(credentials=credentials, db=db)
        return user.id
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Vui lòng đăng nhập (Bearer Token) hoặc cung cấp user_id/librarian_id",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ── API LỊCH SỬ MƯỢN TRẢ (DÙNG CHO TRANG CHI TIẾT ĐỘC GIẢ) ────
@router.get("", response_model=list[LoanHistoryOut])
def list_loans(
    user_id: int | None = Query(None, description="Lọc lịch sử mượn trả theo ID độc giả"),
    status: Literal["PENDING", "APPROVED", "BORROWED", "RETURNED", "REJECTED", "CANCELLED"] | None = Query(None, description="Lọc theo trạng thái phiếu"),
    borrow_type: Literal["ONLINE", "COUNTER"] | None = Query(None, description="Lọc theo hình thức mượn"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Lấy danh sách & lịch sử mượn trả sách từ module Mượn."""
    return get_loans_history(db=db, user_id=user_id, status_filter=status, limit=limit, borrow_type=borrow_type)


@router.get("/readers/by-card/{card_code}", response_model=ReaderLookupResponse)
def lookup_reader_by_card_alias(
    card_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian)
):
    return get_reader_by_card(
        db,
        card_code,
        current_user.id
    )


@router.get("/copies/by-barcode/{copycode}", response_model=CopyLookupResponse)
def lookup_copy_by_barcode_alias(
    copycode: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian)
):
    return get_copy_by_barcode(
        db=db,
        copycode=copycode,
        librarian_id=current_user.id
    )

@router.post("/counter/validate", response_model=CounterBorrowValidateResponse)
def validate_counter(
    data: CounterBorrowValidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian)
):
    return validate_counter_borrow(
        db,
        data.card_code,
        data.barcodes,
        current_user.id
    )


@router.post("/counter", response_model=CounterBorrowReceiptResponse, status_code=201)
def create_counter(
    data: CounterBorrowCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian)
):
    return create_counter_loan(
        db,
        card_code=data.card_code,
        barcodes=data.barcodes,
        librarian_id=current_user.id,
    )

@router.post("/online", response_model=LoanResponse, status_code=201)
def create_loan(
    data: LoanCreate,
    user_id: int | None = Query(None, description="ID độc giả (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_user_id = _resolve_user_id(user_id, credentials, db)
    return create_online_loan(db, resolved_user_id, data.book_isbns)


@router.patch("/{loan_id}/cancel", response_model=LoanResponse)
def cancel_loan(
    loan_id: int,
    user_id: int | None = Query(None, description="ID độc giả (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_user_id = _resolve_user_id(user_id, credentials, db)
    return cancel_online_loan(db, loan_id, resolved_user_id)


@router.patch("/{loan_id}/approve", response_model=LoanResponse)
def approve(
    loan_id: int,
    librarian_id: int | None = Query(None, description="ID thủ thư (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_lib_id = _resolve_user_id(librarian_id, credentials, db)
    return approve_loan(db, loan_id, resolved_lib_id)


@router.patch("/{loan_id}/reject", response_model=LoanResponse)
def reject(
    loan_id: int,
    data: LoanReject,
    librarian_id: int | None = Query(None, description="ID thủ thư (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_lib_id = _resolve_user_id(librarian_id, credentials, db)
    return reject_loan(db, loan_id, resolved_lib_id, data.reject_reason)


@router.post("/{loan_id}/handover", response_model=LoanResponse)
def handover(
    loan_id: int,
    data: LoanHandover,
    librarian_id: int | None = Query(None, description="ID thủ thư (tự lấy từ JWT nếu không truyền)"),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    resolved_lib_id = _resolve_user_id(librarian_id, credentials, db)
    copies_data = [item.model_dump() for item in data.copies]
    return handover_loan(db, loan_id, resolved_lib_id, copies_data)

@router.patch("/items/{loan_item_id}/renew", response_model=RenewalResponse)
def renew_item(
    loan_item_id: int,
    data: RenewalRequest,
    db: Session = Depends(get_db),
):
    return renew_loan_item(
        db,
        loan_item_id=loan_item_id,
        user_id=data.user_id,
        librarian_id=data.librarian_id,
    )


@router.patch("/{loan_id}/renew", response_model=LoanRenewalResponse)
def renew_entire_loan(
    loan_id: int,
    data: RenewalRequest,
    db: Session = Depends(get_db),
):
    return renew_loan(
        db,
        loan_id=loan_id,
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
    _staff: User = Depends(require_librarian),
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
    _staff: User = Depends(require_librarian),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách các cuốn sách sắp đến hạn trong vòng `days` ngày (mặc định 2 ngày).
    - Trả về nhãn trạng thái thân thiện: "Hôm nay (hết hạn)", "Còn 1 ngày", "Còn 2 ngày".
    """
    return get_due_soon_loans(db, user_id=user_id, days=days, search=search, skip=skip, limit=limit)


@router.get("/notifications/my", response_model=InAppNotificationListResponse)
def get_my_notifications(
    user_id: int | None = Query(default=None, description="ID độc giả (tự mặc định là tài khoản đang đăng nhập)"),
    limit: int = Query(default=30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách thông báo in-app cho chuông thông báo trên topbar header.
    Mặc định chỉ lấy thông báo cá nhân của tài khoản đang đăng nhập (kể cả Admin/Thủ thư).
    """
    if current_user.role == UserRole.READER:
        if user_id is not None and user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Độc giả chỉ được xem thông báo của chính mình",
            )
        target_user_id = current_user.id
    else:
        target_user_id = user_id if user_id is not None else current_user.id

    return sync_and_get_notifications(db, user_id=target_user_id, limit=limit)


@router.patch("/notifications/{notification_id}/read")
def read_notification(
    notification_id: int,
    user_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đánh dấu một thông báo cá nhân là đã đọc."""
    target_user_id = (
        current_user.id
        if current_user.role == UserRole.READER or user_id is None
        else user_id
    )
    success = mark_notification_read(db, notification_id, user_id=target_user_id)
    return {"success": success, "notification_id": notification_id}


@router.post("/notifications/mark-all-read")
def mark_all_read(
    user_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đánh dấu toàn bộ thông báo cá nhân là đã đọc."""
    target_user_id = (
        current_user.id
        if current_user.role == UserRole.READER or user_id is None
        else user_id
    )
    count = mark_all_notifications_read(db, user_id=target_user_id)
    return {"success": True, "updated_count": count}


@router.post("/{loan_id}/remind", response_model=RemindLoanResponse)
def remind_reader(
    loan_id: int,
    data: RemindLoanRequest,
    background_tasks: BackgroundTasks,
    staff_user: User = Depends(require_librarian),
    db: Session = Depends(get_db),
):
    """
    Thủ thư gửi thông báo in-app + email SMTP chạy nền nhắc trả sách quá hạn/sắp đến hạn cho độc giả.
    """
    result = remind_overdue_loan(
        db,
        loan_id=loan_id,
        librarian_id=staff_user.id,
        custom_message=data.message,
    )
    # Tích hợp gửi Email chạy nền qua FastAPI BackgroundTasks (Task T3D003D)
    if result.get("reader_email"):
        overdue_items = get_overdue_loans(db, user_id=result["user_id"]).get("items", [])
        matched = [i for i in overdue_items if i["loan_id"] == loan_id]
        if matched:
            first = matched[0]
            background_tasks.add_task(
                send_overdue_reminder_email,
                to_email=result["reader_email"],
                reader_name=result["reader_name"],
                loan_code=first["loan_code"],
                book_title=first["book_title"],
                due_date=first["due_date"],
                days_overdue=first["days_overdue"],
                estimated_fine=first["estimated_fine"],
            )
        else:
            due_soon_items = get_due_soon_loans(db, days=7, user_id=result["user_id"]).get("items", [])
            matched_due = [i for i in due_soon_items if i["loan_id"] == loan_id]
            if matched_due:
                first_due = matched_due[0]
                background_tasks.add_task(
                    send_due_soon_reminder_email,
                    to_email=result["reader_email"],
                    reader_name=result["reader_name"],
                    loan_code=first_due["loan_code"],
                    book_title=first_due["book_title"],
                    due_date=first_due["due_date"],
                    days_remaining=first_due["days_remaining"],
                )
    return result


@router.post("/remind-all-overdue")
def remind_all(
    background_tasks: BackgroundTasks,
    staff_user: User = Depends(require_librarian),
    db: Session = Depends(get_db),
):
    """
    Thủ thư gửi thông báo in-app + email SMTP hàng loạt chạy nền đến tất cả độc giả quá hạn.
    """
    result = remind_all_overdue(db, librarian_id=staff_user.id)
    overdue_items = get_overdue_loans(db, limit=500).get("items", [])
    queued_emails = 0
    for item in overdue_items:
        if item.get("reader_email"):
            background_tasks.add_task(
                send_overdue_reminder_email,
                to_email=item["reader_email"],
                reader_name=item["reader_name"],
                loan_code=item["loan_code"],
                book_title=item["book_title"],
                due_date=item["due_date"],
                days_overdue=item["days_overdue"],
                estimated_fine=item["estimated_fine"],
            )
            queued_emails += 1
    result["queued_emails"] = queued_emails
    return result

