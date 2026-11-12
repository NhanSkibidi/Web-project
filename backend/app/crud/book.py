import math
from datetime import datetime, timedelta
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, distinct

from app.models.Book import Book
from app.models.BookAuthor import BookAuthor
from app.models.Author import Author
from app.models.BookCopy import BookCopy
from app.models.loan import Loan
from app.models.loan_item import LoanItem


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


def get_book_detail(db: Session, isbn: str) -> Optional[Book]:
    """
    Lấy chi tiết 1 đầu sách theo ISBN kèm danh mục, NXB, tác giả và danh sách bản sao (Task T3CFC4B).
    """
    return (
        db.query(Book)
        .options(
            joinedload(Book.category),
            joinedload(Book.publisher),
            joinedload(Book.book_authors).joinedload(BookAuthor.author),
            joinedload(Book.copies),
        )
        .filter(Book.isbn == isbn)
        .first()
    )


def get_new_arrivals(db: Session, limit: int = 10) -> List[Book]:
    """
    Lấy danh sách sách mới nhập nhất (Task T3CFC4B).
    """
    return (
        db.query(Book)
        .options(
            joinedload(Book.category),
            joinedload(Book.publisher),
            joinedload(Book.book_authors).joinedload(BookAuthor.author),
            joinedload(Book.copies),
        )
        .order_by(Book.created_at.desc())
        .limit(limit)
        .all()
    )


def get_top_borrowed_books(
    db: Session, days: int = 30, limit: int = 10
) -> List[Tuple[Book, int]]:
    """
    Lấy top sách được mượn nhiều nhất trong N ngày qua (mặc định 30 ngày) (Task T3CFC4B).
    Trả về danh sách tuple (Book, borrow_count).
    """
    since_date = datetime.now() - timedelta(days=days)

    # Đếm số lượt mượn theo book_isbn trong bảng loan_items + loans
    subquery = (
        db.query(
            LoanItem.book_isbn.label("book_isbn"),
            func.count(LoanItem.id).label("borrow_count"),
        )
        .join(Loan, Loan.id == LoanItem.loan_id)
        .filter(
            or_(
                Loan.borrowed_at >= since_date,
                and_(Loan.borrowed_at.is_(None), Loan.created_at >= since_date),
            )
        )
        .group_by(LoanItem.book_isbn)
        .order_by(func.count(LoanItem.id).desc())
        .limit(limit)
        .all()
    )

    results: List[Tuple[Book, int]] = []
    found_isbns = set()

    for item in subquery:
        book = get_book_detail(db, item.book_isbn)
        if book:
            results.append((book, int(item.borrow_count)))
            found_isbns.add(book.isbn)

    # Nếu dữ liệu mượn chưa đủ 'limit', bổ sung thêm các sách khác với count=0 để đảm bảo API trả đủ sách
    if len(results) < limit:
        remaining_limit = limit - len(results)
        other_books = (
            db.query(Book)
            .options(
                joinedload(Book.category),
                joinedload(Book.publisher),
                joinedload(Book.book_authors).joinedload(BookAuthor.author),
                joinedload(Book.copies),
            )
            .filter(~Book.isbn.in_(found_isbns) if found_isbns else True)
            .order_by(Book.created_at.desc())
            .limit(remaining_limit)
            .all()
        )
        for b in other_books:
            results.append((b, 0))

    return results


def get_related_books_by_category(
    db: Session, category_id: int, exclude_isbn: Optional[str] = None, limit: int = 10
) -> List[Book]:
    """
    Lấy danh sách sách cùng thể loại (Task T3CFC4B).
    """
    query = (
        db.query(Book)
        .options(
            joinedload(Book.category),
            joinedload(Book.publisher),
            joinedload(Book.book_authors).joinedload(BookAuthor.author),
            joinedload(Book.copies),
        )
        .filter(Book.category_id == category_id)
    )

    if exclude_isbn:
        query = query.filter(Book.isbn != exclude_isbn)

    return query.order_by(Book.created_at.desc()).limit(limit).all()
