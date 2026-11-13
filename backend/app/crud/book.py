import math
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, distinct
from datetime import datetime

from app.models.Book import Book
from app.models.BookAuthor import BookAuthor
from app.models.Author import Author
from app.models.BookCopy import BookCopy
from app.models.Category import Category
from app.models.Publisher import Publisher
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

def get_book_by_isbn(db: Session, isbn: str):
    book = (
        db.query(Book)
        .options(
            joinedload(Book.category),
            joinedload(Book.publisher),
            joinedload(Book.book_authors).joinedload(BookAuthor.author),
            joinedload(Book.copies)
        )
        .filter(Book.isbn == isbn)
        .first()
    )

    if not book:
        return None

    total_copies = len(book.copies)

    available_copies = 0
    for copy in book.copies:
        if copy.status == "AVAILABLE":
            available_copies += 1

    authors = []
    for ba in book.book_authors:
        if ba.author:
            authors.append(ba.author)

    return {
        "book": book,
        "total_copies": total_copies,
        "available_copies": available_copies,
        "authors": authors
    }

def create_book(db: Session, book_data):
    if not book_data.isbn.isdigit() or len(book_data.isbn) not in (10, 13):
        raise ValueError("ISBN phải gồm 10 hoặc 13 chữ số")

    if book_data.publish_year is not None:
        if book_data.publish_year < 1 or book_data.publish_year > datetime.now().year:
            raise ValueError("Năm xuất bản không hợp lệ")

    existing_book = db.query(Book).filter(
        Book.isbn == book_data.isbn).first()

    if existing_book:
        raise ValueError("ISBN đã tồn tại")

    category = db.query(Category).filter(
        Category.id == book_data.category_id).first()

    if not category:
        raise ValueError("Không tìm thấy thể loại")

    publisher = db.query(Publisher).filter(
        Publisher.id == book_data.publisher_id).first()

    if not publisher:
        raise ValueError("Không tìm thấy nhà xuất bản")

    authors = db.query(Author).filter(
        Author.id.in_(book_data.author_ids)).all()

    if len(authors) != len(set(book_data.author_ids)):
        raise ValueError("Có tác giả không tồn tại")

    book = Book(**book_data.model_dump(exclude={"author_ids"}))

    db.add(book)
    db.flush()

    for author in authors:
        book_author = BookAuthor(
            book_isbn=book.isbn,
            author_id=author.id
        )
        db.add(book_author)

    db.commit()
    db.refresh(book)

    return book, authors

def update_book(db: Session, isbn: str, book_data):
    book = (
        db.query(Book)
        .options(
            joinedload(Book.category),
            joinedload(Book.publisher),
            joinedload(Book.book_authors).joinedload(BookAuthor.author),
            joinedload(Book.copies)
        )
        .filter(Book.isbn == isbn)
        .first()
    )

    if not book:
        return None

    data = book_data.model_dump(exclude_unset=True)
    author_ids = data.pop("author_ids", None)

    if "publish_year" in data and data["publish_year"] is not None:
        if data["publish_year"] < 1 or data["publish_year"] > datetime.now().year:
            raise ValueError("Năm xuất bản không hợp lệ")

    if "category_id" in data:
        if data["category_id"] is None:
            raise ValueError("Thể loại không được để trống")

        category = db.query(Category).filter(
            Category.id == data["category_id"]).first()

        if not category:
            raise ValueError("Không tìm thấy thể loại")

    if "publisher_id" in data:
        if data["publisher_id"] is None:
            raise ValueError("Nhà xuất bản không được để trống")

        publisher = db.query(Publisher).filter(
            Publisher.id == data["publisher_id"]).first()

        if not publisher:
            raise ValueError("Không tìm thấy nhà xuất bản")

    if author_ids is not None:
        authors = db.query(Author).filter(
            Author.id.in_(author_ids)).all()

        if len(authors) != len(set(author_ids)):
            raise ValueError("Có tác giả không tồn tại")

        book.book_authors.clear()

        for author in authors:
            book.book_authors.append(
                BookAuthor(author=author))

    for key, value in data.items():
        setattr(book, key, value)

    db.commit()
    db.refresh(book)

    authors = []
    for ba in book.book_authors:
        if ba.author:
            authors.append(ba.author)

    total_copies = len(book.copies)

    available_copies = 0
    for copy in book.copies:
        if copy.status == "AVAILABLE":
            available_copies += 1

    return {
        "book": book,
        "authors": authors,
        "total_copies": total_copies,
        "available_copies": available_copies
    }

def delete_book(db: Session, isbn: str):
    book = db.query(Book).filter(Book.isbn == isbn).first()

    if not book:
        return None

    has_copies = db.query(BookCopy).filter(
        BookCopy.book_isbn == isbn
    ).first()

    has_borrowing_history = (
        db.query(LoanItem)
        .join(LoanItem.copy)
        .filter(BookCopy.book_isbn == isbn)
        .first()
    )

    if has_copies or has_borrowing_history:
        book.is_deleted = True
        db.commit()
        return "hidden"

    db.delete(book)
    db.commit()

    return "deleted"