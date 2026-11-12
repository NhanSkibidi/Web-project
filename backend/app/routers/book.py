from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.crud.book import get_books_paginated
from app.schemas.book import BookPaginationResponse, BookSearchItem

router = APIRouter(prefix="/books", tags=["Books"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/search", response_model=BookPaginationResponse)
def search_books(
    db: Session = Depends(get_db),
    keyword: Optional[str] = Query(None, description="Tìm theo tên sách, ISBN, hoặc tên tác giả"),
    category_id: Optional[int] = Query(None, description="Lọc theo thể loại"),
    author_id: Optional[int] = Query(None, description="Lọc theo tác giả"),
    publisher_id: Optional[int] = Query(None, description="Lọc theo nhà xuất bản"),
    publish_year: Optional[int] = Query(None, description="Lọc theo năm xuất bản"),
    available_only: bool = Query(False, description="Chỉ lấy sách còn bản sao có thể mượn"),
    sort_by: str = Query("created_at", regex="^(created_at|title|publish_year|price)$", description="Trường cần sắp xếp"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Thứ tự sắp xếp: asc hoặc desc"),
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Số sách mỗi trang"),
):
    """
    API tìm kiếm và tra cứu sách. Không yêu cầu đăng nhập.
    """
    books, total, total_pages = get_books_paginated(
        db=db,
        keyword=keyword,
        category_id=category_id,
        author_id=author_id,
        publisher_id=publisher_id,
        publish_year=publish_year,
        available_only=available_only,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )

    items = []
    for b in books:
        total_copies = len(b.copies) if b.copies else 0
        available_copies = (
            sum(1 for c in b.copies if getattr(c, "status", None) == "AVAILABLE")
            if b.copies
            else 0
        )
        authors = [ba.author for ba in b.book_authors if ba.author] if b.book_authors else []

        items.append(
            BookSearchItem(
                isbn=b.isbn,
                title=b.title,
                publish_year=b.publish_year,
                page_count=b.page_count,
                language=b.language,
                description=b.description,
                cover_image=b.cover_image,
                price=b.price,
                category=b.category,
                publisher=b.publisher,
                authors=authors,
                total_copies=total_copies,
                available_copies=available_copies,
            )
        )

    return BookPaginationResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )