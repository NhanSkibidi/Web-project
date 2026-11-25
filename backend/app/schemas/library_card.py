"""Schema cho LibraryCard và Quản lý Độc giả & Thẻ thư viện."""
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.library_card import CardStatus, CardType


class LibraryCardBase(BaseModel):
    card_code: str = Field(min_length=1, max_length=20, examples=["LC-0001"])
    reader_id: int = Field(examples=[4])
    card_type: CardType = CardType.STANDARD
    issue_date: date = Field(examples=["2026-01-01"])
    expiry_date: date = Field(examples=["2027-01-01"])
    max_borrow_books: int = Field(default=5, ge=1, le=50, examples=[5])
    status: CardStatus = CardStatus.ACTIVE

    @model_validator(mode="after")
    def check_dates(self):
        # Ngày hết hạn phải sau ngày cấp
        if self.expiry_date <= self.issue_date:
            raise ValueError("expiry_date (ngày hết hạn) phải sau issue_date (ngày cấp)")
        return self


class LibraryCardOut(LibraryCardBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


# ---------- Schema phục vụ Nghiệp vụ Thủ thư quản lý Độc giả & Thẻ ----------
class CardExtendRequest(BaseModel):
    """Yêu cầu gia hạn thẻ thư viện."""

    months: int = Field(default=12, ge=1, le=60, description="Số tháng gia hạn thêm (mặc định 12 tháng)")
    new_expiry_date: date | None = Field(default=None, description="Hoặc chỉ định ngày hết hạn cụ thể")
    card_type: CardType | None = Field(default=None, description="Đổi hạng thẻ khi gia hạn (nếu có)")
    reason: str | None = Field(
        default="Gia hạn thẻ thư viện định kỳ",
        max_length=500,
        description="Ghi chú / lý do gia hạn",
    )


class CardLockUnlockRequest(BaseModel):
    """Yêu cầu khoá hoặc mở khoá thẻ thư viện kèm lý do bắt buộc."""

    reason: str = Field(
        min_length=3,
        max_length=500,
        description="Lý do khoá thẻ hoặc mở khoá thẻ (bắt buộc tối thiểu 3 ký tự)",
        examples=["Độc giả báo mất thẻ thư viện", "Độc giả đã hoàn tất nộp phạt quá hạn"],
    )


class CardActionLogOut(BaseModel):
    """Lịch sử thao tác trên thẻ (Gia hạn, Khoá/Mở thẻ, Tự động hết hạn)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    card_id: int
    reader_id: int
    action: str
    old_status: str | None = None
    new_status: str
    reason: str | None = None
    old_expiry_date: date | None = None
    new_expiry_date: date | None = None
    performed_by: int | None = None
    performer_name: str | None = None
    created_at: datetime


class ReaderCardSummaryOut(BaseModel):
    """Thông tin tóm tắt Độc giả & Thẻ dùng trong danh sách tra cứu của Thủ thư."""

    reader_id: int
    full_name: str
    email: str
    phone: str | None = None
    user_status: str

    card_id: int | None = None
    card_code: str | None = None
    card_type: CardType | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    max_borrow_books: int = 5
    card_status: CardStatus | None = None
    days_remaining: int | None = None
    lock_reason: str | None = None

    borrowed_count: int = 0
    pending_count: int = 0
    overdue_count: int = 0
    unpaid_fine_amount: float = 0.0


class ReaderCardDetailOut(ReaderCardSummaryOut):
    """Thông tin chi tiết Độc giả & Thẻ thư viện."""

    created_at: datetime | None = None
    unpaid_fines_count: int = 0
    recent_loans: list[dict[str, Any]] = []
    unpaid_fines: list[dict[str, Any]] = []
    card_logs: list[CardActionLogOut] = []


class ReaderCardSearchResponse(BaseModel):
    """Kết quả tìm kiếm danh sách độc giả & thẻ kèm thống kê."""

    items: list[ReaderCardSummaryOut]
    total: int
    active_count: int
    expired_count: int
    locked_count: int
    auto_expired_now: int = 0
