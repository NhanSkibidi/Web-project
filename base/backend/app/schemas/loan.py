from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class LoanCreate(BaseModel):
    user_id: int
    borrow_type: str = "ONLINE"

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

    model_config = ConfigDict(from_attributes=True)