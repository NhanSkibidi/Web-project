from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class LoanCreate(BaseModel):
    book_isbns: list[str] = Field(min_length=1, max_length=5)


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


# ── SCHEMAS CHO MƯỢN SÁCH TẠI QUẦY (COUNTER BORROWING) ─────────

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

