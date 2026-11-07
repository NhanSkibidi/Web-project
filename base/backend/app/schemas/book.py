from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BookCreate(BaseModel):
    isbn: str
    title: str
    category_id: int
    publisher_id: int
    publish_year: int | None = None
    page_count: int | None = None
    language: str = "Tiếng Việt"
    description: str | None = None
    cover_image: str | None = None
    price: Decimal = 0


class BookUpdate(BaseModel):
    title: str | None = None
    category_id: int | None = None
    publisher_id: int | None = None
    publish_year: int | None = None
    page_count: int | None = None
    language: str | None = None
    description: str | None = None
    cover_image: str | None = None
    price: Decimal | None = None


class BookResponse(BaseModel):
    isbn: str
    title: str
    category_id: int
    publisher_id: int
    publish_year: int | None
    page_count: int | None
    language: str
    description: str | None
    cover_image: str | None
    price: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
