import math
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, distinct

from app.models.Book import Book
from app.models.BookAuthor import BookAuthor
from app.models.Author import Author
from app.models.BookCopy import BookCopy


def get_books_paginated(
    db: Session,
    keyword: Optional[str] = None,
    category_id: Optional[int] = None,
    author_id: Optional[int] = None,
    publisher_id: Optional[int] = None,
    publish_year: Optional[int] = None,
    available_only: bool = False,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 10,
) -> Tuple[List[Book], int, int]:
    """
    Truy vấn danh sách sách có tìm kiếm từ khoá, lọc nhiều tiêu chí, sắp xếp và phân trang.
    """
    query = db.query(Book)

    # Join các bảng liên quan để tìm kiếm và lọc
    query = (
        query.outerjoin(Book.category)
        .outerjoin(Book.publisher)
        .outerjoin(Book.book_authors)
        .outerjoin(BookAuthor.author)
    )

    # 1. Tìm theo từ khoá (tên sách, ISBN, tên tác giả)
    if keyword:
        kw = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                Book.title.ilike(kw),
                Book.isbn.ilike(kw),
                Author.name.ilike(kw),
            )
        )

    # 2. Lọc theo thể loại, NXB, năm xuất bản, tác giả
    if category_id:
        query = query.filter(Book.category_id == category_id)
    if publisher_id:
        query = query.filter(Book.publisher_id == publisher_id)
    if publish_year:
        query = query.filter(Book.publish_year == publish_year)
    if author_id:
        query = query.filter(Author.id == author_id)

    # Lọc sách còn bản sao có thể mượn (AVAILABLE)
    if available_only:
        query = query.join(Book.copies).filter(BookCopy.status == "AVAILABLE")

    # Đếm tổng số đầu sách khớp điều kiện
    total = query.with_entities(func.count(distinct(Book.isbn))).scalar() or 0

    # 3. Sắp xếp
    sort_column = getattr(Book, sort_by, Book.created_at)
    if sort_order.lower() == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # 4. Phân trang và tải trước các bảng quan hệ (eager loading)
    offset = (page - 1) * page_size
    books = (
        query.with_entities(Book)
        .distinct()
        .options(
            joinedload(Book.category),
            joinedload(Book.publisher),
            joinedload(Book.book_authors).joinedload(BookAuthor.author),
            joinedload(Book.copies),
        )
        .offset(offset)
        .limit(page_size)
        .all()
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return books, total, total_pages