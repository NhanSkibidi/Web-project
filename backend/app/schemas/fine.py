from datetime import datetime
from pydantic import BaseModel

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


class ReportIssueRequest(BaseModel):
    book_copy_id: int | None = None
    copy_code: str | None = None
    issue_type: str  # HỎNG hoặc MẤT
    note: str | None = None


class FinePayRequest(BaseModel):
    collected_by: int | None = None


class FineWaiveRequest(BaseModel):
    waive_reason: str
    waived_by: int | None = None


class UnpaidCheckResponse(BaseModel):
    user_id: int
    has_unpaid: bool
    unpaid_count: int
    total_unpaid_amount: float
