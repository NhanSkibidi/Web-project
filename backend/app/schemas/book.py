from datetime import datetime
from decimal import Decimal
from typing import List, Optional

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


class AuthorSummary(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class CategorySummary(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class PublisherSummary(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class BookCopySummary(BaseModel):
    id: int
    copy_code: str
    shelf_location: str
    condition: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class BookSearchItem(BaseModel):
    isbn: str
    title: str
    publish_year: Optional[int] = None
    page_count: Optional[int] = None
    language: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    price: Decimal
    category: Optional[CategorySummary] = None
    publisher: Optional[PublisherSummary] = None
    authors: List[AuthorSummary] = []
    total_copies: int
    available_copies: int

    model_config = ConfigDict(from_attributes=True)


class BookPaginationResponse(BaseModel):
    items: List[BookSearchItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class BookDetailResponse(BaseModel):
    """
    Schema chi tiết đầu sách kèm số cuốn còn và vị trí kệ (Task T3CFC4B).
    """
    isbn: str
    title: str
    category_id: int
    publisher_id: int
    publish_year: Optional[int] = None
    page_count: Optional[int] = None
    language: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    price: Decimal
    created_at: datetime
    updated_at: datetime
    category: Optional[CategorySummary] = None
    publisher: Optional[PublisherSummary] = None
    authors: List[AuthorSummary] = []
    total_copies: int
    available_copies: int
    shelf_locations: List[str] = []
    copies: List[BookCopySummary] = []

    model_config = ConfigDict(from_attributes=True)


class TopBorrowedBookItem(BaseModel):
    """
    Schema top sách mượn nhiều trong 30 ngày (Task T3CFC4B).
    """
    isbn: str
    title: str
    publish_year: Optional[int] = None
    page_count: Optional[int] = None
    language: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    price: Decimal
    category: Optional[CategorySummary] = None
    publisher: Optional[PublisherSummary] = None
    authors: List[AuthorSummary] = []
    total_copies: int
    available_copies: int
    borrow_count: int

    model_config = ConfigDict(from_attributes=True)
