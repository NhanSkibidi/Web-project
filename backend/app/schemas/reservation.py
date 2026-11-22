from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, ConfigDict


class ReservationBase(BaseModel):
    user_id: Optional[int] = None
    book_isbn: Optional[str] = None
    book_id: Optional[Union[str, int]] = None

    def get_book_isbn(self) -> str:
        return str(self.book_isbn or self.book_id or "").strip()


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    status: Optional[str] = None
    pickup_deadline: Optional[datetime] = None
    copy_id: Optional[int] = None


class ReservationResponse(BaseModel):
    id: int
    user_id: int
    book_isbn: str
    book_id: Optional[Union[str, int]] = None
    reserved_at: datetime
    status: str
    pickup_deadline: Optional[datetime] = None
    copy_id: Optional[int] = None

    # Thông tin bổ trợ phục vụ giao diện (UI)
    queue_position: Optional[int] = None
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    book_cover: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    student_id: Optional[str] = None
    copy_barcode: Optional[str] = None
    copy_code: Optional[str] = None
    shelf_location: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
