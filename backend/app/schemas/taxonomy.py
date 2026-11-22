from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# -------------------------------------------------------------
# CATEGORY SCHEMAS
# -------------------------------------------------------------
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Tên thể loại (duy nhất)")
    description: Optional[str] = Field(None, description="Mô tả thể loại")


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    books_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class CategoryPaginatedResponse(BaseModel):
    items: List[CategoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# -------------------------------------------------------------
# AUTHOR SCHEMAS
# -------------------------------------------------------------
class AuthorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Tên tác giả (duy nhất)")
    biography: Optional[str] = Field(None, description="Tiểu sử tác giả")
    nationality: Optional[str] = Field(None, max_length=100, description="Quốc tịch")


class AuthorCreate(AuthorBase):
    pass


class AuthorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    biography: Optional[str] = None
    nationality: Optional[str] = None


class AuthorResponse(BaseModel):
    id: int
    name: str
    biography: Optional[str] = None
    nationality: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    books_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AuthorPaginatedResponse(BaseModel):
    items: List[AuthorResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# -------------------------------------------------------------
# PUBLISHER SCHEMAS
# -------------------------------------------------------------
class PublisherBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Tên nhà xuất bản (duy nhất)")
    address: Optional[str] = Field(None, max_length=255, description="Địa chỉ")
    description: Optional[str] = Field(None, description="Thông tin thêm")


class PublisherCreate(PublisherBase):
    pass


class PublisherUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = None
    description: Optional[str] = None


class PublisherResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    books_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class PublisherPaginatedResponse(BaseModel):
    items: List[PublisherResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# -------------------------------------------------------------
# STATS SCHEMA
# -------------------------------------------------------------
class TaxonomyStatsResponse(BaseModel):
    total_categories: int
    total_authors: int
    total_publishers: int
    total_books: int
