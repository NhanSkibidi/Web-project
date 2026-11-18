"""Schema cho LibraryCard."""
from datetime import date, datetime

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


class LibraryCardCreate(LibraryCardBase):
    """Dữ liệu FE gửi lên khi CẤP thẻ mới."""


class LibraryCardUpdate(BaseModel):
    """Dữ liệu FE gửi lên khi SỬA thẻ. Trường nào không gửi thì giữ nguyên."""

    card_type: CardType | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    max_borrow_books: int | None = Field(default=None, ge=1, le=50)
    status: CardStatus | None = None


class LibraryCardOut(LibraryCardBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
