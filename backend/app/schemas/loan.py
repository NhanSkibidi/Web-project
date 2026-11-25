from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class LoanCreate(BaseModel):
    book_isbns: list[str] = Field(min_length=1)


class LoanUpdate(BaseModel):
    status: str | None = None
    reject_reason: str | None = None


class LoanApprove(BaseModel):
    pass


class LoanReject(BaseModel):
    reject_reason: str = Field(min_length=1, max_length=500)


class HandoverCopyItem(BaseModel):
    book_isbn: str
    copy_code: str  


class LoanHandover(BaseModel):
    copies: list[HandoverCopyItem] = Field(min_length=1, max_length=5)

class LoanItemResponse(BaseModel):
    id: int
    loan_id: int
    book_isbn: str
    copy_id: int | None
    due_date: datetime | None
    renewal_count: int
    return_date: datetime | None

    model_config = ConfigDict(from_attributes=True)

class LoanResponse(BaseModel):
    id: int
    user_id: int
    processed_by: int | None
    borrow_type: str
    status: str
    reject_reason: str | None
    created_at: datetime
    borrowed_at: datetime | None
    due_date: datetime | None
    code: str | None = None

    loan_items: list[LoanItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

class CounterBorrowValidateRequest(BaseModel):
    """Yêu cầu kiểm tra điều kiện mượn tại quầy."""
    card_code: str
    barcodes: list[str] = Field(default_factory=list)


class ConditionItem(BaseModel):
    """Một mục điều kiện trong checklist kiểm tra."""
    code: str
    label: str
    passed: bool
    mandatory: bool = True
    message: str



class CounterBorrowValidateResponse(BaseModel):
    """Kết quả kiểm tra realtime 7 điều kiện mượn tại quầy."""
    can_borrow: bool
    conditions: list[ConditionItem]


class CounterBorrowCreateRequest(BaseModel):
    """Yêu cầu tạo phiếu mượn tại quầy."""
    card_code: str
    barcodes: list[str] = Field(min_length=1, max_length=5)
    librarian_id: int | None = None


class ReaderLookupResponse(BaseModel):
    """Thông tin độc giả tra cứu qua mã thẻ."""
    reader_id: int
    user_id: int
    card_code: str
    full_name: str
    student_id: str
    faculty: str
    card_status: str
    expiry_date: str | None
    borrowing_count: int
    max_borrow_books: int
    credit_score: int
    unpaid_fine: float


class CopyLookupResponse(BaseModel):
    """Thông tin bản sao sách tra cứu qua mã vạch."""
    id: int
    barcode: str
    copy_code: str
    book_isbn: str
    title: str
    author: str
    location: str
    shelf_location: str
    status: str


class CounterBorrowReceiptBook(BaseModel):
    copy_id: int
    barcode: str
    title: str
    isbn: str
    location: str
    due_date: str


class CounterBorrowReceiptResponse(BaseModel):
    """Dữ liệu chi tiết phiếu mượn tại quầy phục vụ in ấn biên lai."""
    id: int
    code: str
    borrow_type: str
    status: str
    borrowed_at: str
    due_date: str
    librarian_name: str
    reader_name: str
    reader_student_id: str
    reader_faculty: str
    reader_card_code: str
    books: list[CounterBorrowReceiptBook]

class BookLoanHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    loan_code: str
    borrower_name: str
    copy_code: str | None
    borrow_date: datetime
    due_date: datetime | None
    return_date: datetime | None
    status: str


class BookLoanHistoryResponse(BaseModel):
    isbn: str
    total: int
    items: list[BookLoanHistoryItem]


# ── SCHEMAS CHO GIA HẠN SÁCH (RENEWAL) ──────────────────────────

class RenewalRequest(BaseModel):
    """Yêu cầu gia hạn 1 cuốn sách đang mượn."""
    user_id: int | None = Field(
        default=None,
        description="ID độc giả tự gia hạn (None nếu thủ thư gia hạn hộ)"
    )
    librarian_id: int | None = Field(
        default=None,
        description="ID thủ thư gia hạn hộ (None nếu độc giả tự gia hạn)"
    )


class RenewalResponse(BaseModel):
    """Kết quả gia hạn sách thành công."""
    loan_item_id: int
    loan_id: int
    loan_code: str
    book_isbn: str
    book_title: str
    copy_code: str | None
    renewal_count: int
    max_renewals: int
    old_due_date: str
    new_due_date: str
    renewed_by: str
    message: str


class LoanRenewalResponse(BaseModel):
    """Kết quả gia hạn toàn bộ phiếu mượn."""
    loan_id: int
    loan_code: str
    renewed_count: int
    max_renewals: int
    old_due_date: str
    new_due_date: str
    renewed_by: str
    message: str
    items: list[RenewalResponse] = []



# ── SCHEMAS CHO TASK T3CFF48: DANH SÁCH QUÁ HẠN & NHẮC TRẢ SÁCH ───────

class OverdueLoanItem(BaseModel):
    """Thông tin chi tiết một cuốn sách quá hạn."""
    loan_id: int
    loan_code: str
    loan_item_id: int
    user_id: int
    reader_name: str
    reader_email: str | None = None
    reader_phone: str | None = None
    card_code: str | None = None
    student_id: str | None = None
    faculty: str | None = None
    book_isbn: str
    book_title: str
    copy_id: int | None = None
    copy_code: str | None = None
    borrowed_at: str | None = None
    due_date: str
    days_overdue: int
    estimated_fine: float
    reminded_count: int = 0
    last_reminded_at: str | None = None

    model_config = ConfigDict(from_attributes=True)


class OverdueListResponse(BaseModel):
    """Danh sách các phiếu/cuốn sách quá hạn và tổng tiền phạt ước tính."""
    total: int
    total_fine: float
    items: list[OverdueLoanItem]


class DueSoonLoanItem(BaseModel):
    """Thông tin sách sắp đến hạn trong vòng 2 ngày."""
    loan_id: int
    loan_code: str
    loan_item_id: int
    user_id: int
    reader_name: str
    reader_email: str | None = None
    reader_phone: str | None = None
    card_code: str | None = None
    student_id: str | None = None
    book_isbn: str
    book_title: str
    copy_id: int | None = None
    copy_code: str | None = None
    borrowed_at: str | None = None
    due_date: str
    days_remaining: int
    status_label: str

    model_config = ConfigDict(from_attributes=True)


class DueSoonListResponse(BaseModel):
    """Danh sách các phiếu/cuốn sách sắp đến hạn."""
    total: int
    items: list[DueSoonLoanItem]


class InAppNotificationItem(BaseModel):
    """Một thông báo in-app cho độc giả / người dùng."""
    id: int
    user_id: int
    loan_id: int | None = None
    loan_code: str | None = None
    loan_item_id: int | None = None
    title: str
    message: str
    type: str  # OVERDUE, DUE_SOON, REMINDER, SYSTEM
    is_read: bool
    created_at: str
    time_ago: str | None = None

    model_config = ConfigDict(from_attributes=True)


class InAppNotificationListResponse(BaseModel):
    """Danh sách thông báo in-app và số lượng chưa đọc."""
    unread_count: int
    total: int
    items: list[InAppNotificationItem]


class RemindLoanRequest(BaseModel):
    """Yêu cầu gửi nhắc nhở cho phiếu mượn."""
    librarian_id: int | None = None
    message: str | None = None


class RemindLoanResponse(BaseModel):
    """Kết quả gửi nhắc nhở."""
    loan_id: int
    user_id: int
    reader_name: str
    reader_email: str | None = None
    sent_count: int
    message: str


# ── SCHEMAS CHO LỊCH SỬ MƯỢN TRẢ ĐỘC GIẢ (T3CFA8B) ─────────────

class LoanHistoryItemOut(BaseModel):
    """Chi tiết 1 cuốn sách trong lịch sử mượn trả (từ module Mượn)."""
    id: int
    loan_id: int
    book_isbn: str
    book_title: str
    author_name: str | None = None
    cover_image: str | None = None
    copy_id: int | None = None
    copy_code: str | None = None
    copy_status: str | None = None
    shelf_location: str | None = None
    due_date: datetime | None = None
    renewal_count: int = 0
    return_date: datetime | None = None
    is_overdue: bool = False
    overdue_days: int = 0
    estimated_fine: float = 0.0
    has_waiting_reservation: bool = False


class LoanHistoryOut(BaseModel):
    """Chi tiết phiếu mượn kèm lịch sử mượn trả cho trang chi tiết độc giả."""
    id: int
    code: str | None = None
    user_id: int
    reader_name: str | None = None
    reader_email: str | None = None
    reader_phone: str | None = None
    card_code: str | None = None
    card_status: str | None = None
    reader_holding_count: int = 0
    reader_max_borrow: int = 5
    processed_by: int | None = None
    borrow_type: str
    status: str
    reject_reason: str | None = None
    created_at: datetime
    borrowed_at: datetime | None = None
    due_date: datetime | None = None
    loan_items: list[LoanHistoryItemOut] = []
