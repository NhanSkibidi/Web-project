from datetime import datetime
from pydantic import BaseModel, ConfigDict

class LoanItemCreate(BaseModel):
    book_id: int

class LoanItemResponse(BaseModel):
    id: int
    loan_id: int
    book_id: int
    copy_id: int | None
    due_date: datetime | None
    renewal_count: int
    return_date: datetime | None

    model_config = ConfigDict(from_attributes=True)