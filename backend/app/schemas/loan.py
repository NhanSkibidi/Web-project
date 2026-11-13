from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class LoanCreate(BaseModel):
    """Độc giả tạo yêu cầu mượn online: danh sách ISBN (1–5 cuốn)."""
    book_isbns: list[str] = Field(min_length=1, max_length=5)


class LoanUpdate(BaseModel):
    """Cập nhật phiếu mượn (dùng chung / tương thích ngược)."""
    status: str | None = None
    reject_reason: str | None = None


class LoanApprove(BaseModel):
    """Thủ thư duyệt phiếu mượn."""
    pass


class LoanReject(BaseModel):
    """Thủ thư từ chối phiếu mượn kèm lý do."""
    reject_reason: str = Field(min_length=1, max_length=500)


class HandoverCopyItem(BaseModel):
    """Mỗi cuốn giao: ISBN + mã bản sao cụ thể (quét/nhập mã cuốn)."""
    book_isbn: str
    copy_code: str  # mã bản sao (vd: BC-9786040000019-01)


class LoanHandover(BaseModel):
    """Thủ thư giao sách: danh sách bản sao cụ thể cho từng đầu sách."""
    copies: list[HandoverCopyItem] = Field(min_length=1, max_length=5)


# ── Response schemas ───────────────────────────────────────────

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

    loan_items: list[LoanItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
