from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class LoanCreate(BaseModel):
    book_isbns: list[str] = Field(min_length=1, max_length=5)

class LoanItemResponse(BaseModel):
    id: int
    loan_id: int
    book_isbn: str
    copy_id: int | None
    due_date: datetime | None
    renewal_count: int
    return_date: datetime | None

    model_config = ConfigDict(from_attributes=True)


class LoanUpdate(BaseModel):
    status: str
    reject_reason: str | None = None


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
