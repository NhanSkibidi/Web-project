
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class ReservationCreate(BaseModel):
    user_id: int
    book_id: int


class ReservationResponse(BaseModel):
    id: int
    user_id: int
    book_id: int
    reserved_at: datetime
    status: str
    pickup_deadline: Optional[datetime] = None
    copy_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
