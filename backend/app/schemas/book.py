from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

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
    price: Decimal = Field(default=Decimal(0), ge=0)
    author_ids: List[int] = Field(default_factory=list)


class BookUpdate(BaseModel):
    title: str | None = None
    category_id: int | None = None
    publisher_id: int | None = None
    publish_year: int | None = None
    page_count: int | None = None
    language: str | None = None
    description: str | None = None
    cover_image: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    author_ids: List[int] | None = None


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
    shelf_location: Optional[str] = None
    borrowed_copies: int = 0
    reserved_copies: int = 0
    lost_copies: int = 0
    damage_copies: int = 0
    disposed_copies: int = 0

    model_config = ConfigDict(from_attributes=True)


class BookPaginationResponse(BaseModel):
    items: List[BookSearchItem]
    total: int
    page: int
    page_size: int
    total_pages: int
