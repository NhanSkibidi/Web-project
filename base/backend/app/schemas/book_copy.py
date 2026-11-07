from datetime import date, datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict


class BookCopyCreate(BaseModel):
    book_isbn: str
    copy_code: str
    shelf_location: str
    imported_at: date
    condition: Literal["MỚI", "CŨ", "HỎNG"] = "MỚI"
    status: Literal[
        "AVAILABLE",
        "BORROWED",
        "RESERVED",
        "LOST",
        "DAMAGED",
        "DISPOSED"
    ] = "AVAILABLE"


class BookCopyUpdate(BaseModel):
    shelf_location: str | None = None
    condition: Literal["MỚI", "CŨ", "HỎNG"] | None = None
    status: Literal[
        "AVAILABLE",
        "BORROWED",
        "RESERVED",
        "LOST",
        "DAMAGED",
        "DISPOSED"
    ] | None = None


class BookCopyResponse(BaseModel):
    id: int
    book_isbn: str
    copy_code: str
    shelf_location: str
    imported_at: date
    condition: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
