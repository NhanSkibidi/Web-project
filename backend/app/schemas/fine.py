from datetime import datetime
from pydantic import BaseModel, Field

FINE_PER_DAY = 2000
RATE_DAMAGED = 0.5
RATE_LOST = 1.0


class FineBase(BaseModel):
    user_id: int
    loan_id: int
    book_copy_id: int
    fine_type: str  # QUÁ HẠN, HỎNG, MẤT
    amount: float = 0.0
    status: str = "UNPAID"  # UNPAID, PAID, WAIVED
    collected_by: int | None = None
    collected_at: datetime | None = None
    waive_reason: str | None = None


class FineCreate(FineBase):
    pass


class FineResponse(FineBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FineDetailResponse(BaseModel):
    """Thông tin chi tiết khoản phạt kèm thông tin độc giả, ấn bản và người xử lý."""
    id: int
    user_id: int
    user_name: str | None = None
    user_email: str | None = None
    user_phone: str | None = None
    card_code: str | None = None
    loan_id: int
    loan_code: str | None = None
    book_copy_id: int
    copy_code: str | None = None
    book_title: str | None = None
    book_isbn: str | None = None
    book_price: float | None = 0.0
    fine_type: str
    amount: float = 0.0
    status: str
    collected_by: int | None = None
    collector_name: str | None = None
    collected_at: datetime | None = None
    waive_reason: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReportIssueRequest(BaseModel):
    book_copy_id: int | None = None
    copy_code: str | None = None
    issue_type: str  # HỎNG hoặc MẤT
    note: str | None = None


class FinePayRequest(BaseModel):
    collected_by: int | None = None
    payment_method: str | None = "TIỀN MẶT"  # TIỀN MẶT, CHUYỂN KHOẢN
    note: str | None = None


class FineWaiveRequest(BaseModel):
    waive_reason: str = Field(..., min_length=3, description="Lý do miễn phạt bắt buộc (tối thiểu 3 ký tự)")
    waived_by: int | None = None


class UnpaidCheckResponse(BaseModel):
    user_id: int
    has_unpaid: bool
    unpaid_count: int
    total_unpaid_amount: float


class FineStatisticsResponse(BaseModel):
    """Thống kê tổng quan phục vụ KPI thẻ và báo cáo quầy."""
    total_fines_count: int
    total_unpaid_amount: float
    unpaid_count: int
    paid_count: int
    total_paid_today: float
    waived_count: int


class FineReceiptResponse(BaseModel):
    """Dữ liệu chi tiết in biên lai thu tiền phạt chuẩn hóa."""
    receipt_no: str
    fine_id: int
    created_at: datetime
    collected_at: datetime | None = None
    reader_name: str
    reader_card_code: str | None = None
    reader_phone: str | None = None
    reader_email: str | None = None
    book_title: str
    copy_code: str
    book_isbn: str
    fine_type: str
    amount: float
    amount_in_words: str
    payment_method: str = "TIỀN MẶT"
    status: str
    collector_name: str | None = None
    collector_role: str | None = None
    waive_reason: str | None = None
    note: str | None = None


class MyFinesResponse(BaseModel):
    """Phản hồi danh sách khoản phạt cá nhân của độc giả."""
    user_id: int
    user_name: str
    card_code: str | None = None
    total_unpaid_amount: float
    unpaid_count: int
    fines: list[FineDetailResponse]
