from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, ConfigDict


class ReservationBase(BaseModel):
    user_id: int
    book_isbn: Optional[str] = None
    book_id: Optional[Union[str, int]] = None

    def get_book_isbn(self) -> str:
        return str(self.book_isbn or self.book_id or "")


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    status: Optional[str] = None
    pickup_deadline: Optional[datetime] = None
    copy_id: Optional[int] = None


class ReservationResponse(BaseModel):
    id: int
    user_id: int
    book_isbn: Optional[str] = None
    book_id: Optional[Union[str, int]] = None
    reserved_at: datetime
    status: str
    pickup_deadline: Optional[datetime] = None
    copy_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
