from datetime import datetime
from pydantic import BaseModel

FINE_PER_DAY = 2000
RATE_DAMAGED = 0.5
RATE_LOST = 1.0


class FineBase(BaseModel):
    user_id: int
    loan_id: int
    book_copy_id: int
    fine_type: str
    amount: float = 0.0
    status: str = "UNPAID"
    collected_by: int = None
    collected_at: datetime = None
    waive_reason: str = None


class FineCreate(FineBase):
    pass


class FineResponse(FineBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
