import math
from typing import Optional, Tuple, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.models.Category import Category
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Book import Book
from app.models.BookAuthor import BookAuthor
from app.schemas.taxonomy import (
    CategoryCreate, CategoryUpdate,
    AuthorCreate, AuthorUpdate,
    PublisherCreate, PublisherUpdate
)


# ==============================================================================
# 1. QUẢN LÝ THỂ LOẠI (CATEGORIES)
# ==============================================================================

def get_categories(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10
) -> Tuple[List[Dict[str, Any]], int, int]:
    """Lấy danh sách thể loại có tìm kiếm, phân trang và đếm số đầu sách liên kết."""
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 10

    # Subquery đếm số đầu sách còn hiệu lực (chưa bị xoá mềm)
    book_count_subq = (
        db.query(
            Book.category_id,
            func.count(Book.isbn).label("books_count")
        )
        .filter(Book.is_deleted == False)
        .group_by(Book.category_id)
        .subquery()
    )

    query = (
        db.query(
            Category,
            func.coalesce(book_count_subq.c.books_count, 0).label("books_count")
        )
        .outerjoin(book_count_subq, Category.id == book_count_subq.c.category_id)
    )

    if search and search.strip():
        kw = f"%{search.strip()}%"
        query = query.filter(
            Category.name.ilike(kw) | (Category.description.ilike(kw))
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    records = (
        query.order_by(Category.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for cat, books_count in records:
        items.append({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at,
            "books_count": int(books_count)
        })

    return items, total, total_pages


def get_all_categories_raw(db: Session) -> List[Dict[str, Any]]:
    """Lấy toàn bộ danh sách thể loại (dùng cho dropdown select)."""
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "books_count": 0
        }
        for c in categories
    ]


def get_category_by_id(db: Session, category_id: int) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thể loại với ID #{category_id}."
        )
    return category


def create_category(db: Session, data: CategoryCreate) -> Dict[str, Any]:
    name_clean = data.name.strip()
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên thể loại không được để trống."
        )

    # Kiểm tra trùng tên thể loại (không phân biệt hoa thường)
    existing = (
        db.query(Category)
        .filter(func.lower(Category.name) == func.lower(name_clean))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Thể loại '{name_clean}' đã tồn tại trong hệ thống. Vui lòng chọn tên khác."
        )

    category = Category(
        name=name_clean,
        description=data.description.strip() if data.description else None
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
        "books_count": 0
    }


def update_category(db: Session, category_id: int, data: CategoryUpdate) -> Dict[str, Any]:
    category = get_category_by_id(db, category_id)

    if data.name is not None:
        name_clean = data.name.strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên thể loại không được để trống."
            )
        # Kiểm tra trùng tên với bản ghi khác
        existing = (
            db.query(Category)
            .filter(
                func.lower(Category.name) == func.lower(name_clean),
                Category.id != category_id
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tên thể loại '{name_clean}' đã tồn tại ở bản ghi khác. Vui lòng chọn tên khác."
            )
        category.name = name_clean

    if data.description is not None:
        category.description = data.description.strip() if data.description.strip() else None

    db.commit()
    db.refresh(category)

    # Đếm số sách hiện tại
    books_count = (
        db.query(Book)
        .filter(Book.category_id == category.id, Book.is_deleted == False)
        .count()
    )

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
        "books_count": books_count
    }


def delete_category(db: Session, category_id: int) -> Dict[str, Any]:
    category = get_category_by_id(db, category_id)

    # RÀNG BUỘC NGHIỆP VỤ: Không xoá khi còn đầu sách liên kết (báo lỗi rõ)
    linked_books_count = (
        db.query(Book)
        .filter(Book.category_id == category_id, Book.is_deleted == False)
        .count()
    )

    if linked_books_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xoá thể loại '{category.name}' vì vẫn còn {linked_books_count} đầu sách đang thuộc thể loại này. Vui lòng chuyển các đầu sách sang thể loại khác trước khi xoá."
        )

    cat_name = category.name
    db.delete(category)
    db.commit()

    return {
        "success": True,
        "message": f"Đã xoá thành công thể loại '{cat_name}' (ID #{category_id})."
    }


# ==============================================================================
# 2. QUẢN LÝ TÁC GIẢ (AUTHORS)
# ==============================================================================

def get_authors(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10
) -> Tuple[List[Dict[str, Any]], int, int]:
    """Lấy danh sách tác giả có tìm kiếm, phân trang và đếm số đầu sách liên kết."""
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 10

    # Subquery đếm số đầu sách hợp lệ mà tác giả tham gia viết
    author_books_subq = (
        db.query(
            BookAuthor.author_id,
            func.count(distinct(BookAuthor.book_isbn)).label("books_count")
        )
        .join(Book, BookAuthor.book_isbn == Book.isbn)
        .filter(Book.is_deleted == False)
        .group_by(BookAuthor.author_id)
        .subquery()
    )

    query = (
        db.query(
            Author,
            func.coalesce(author_books_subq.c.books_count, 0).label("books_count")
        )
        .outerjoin(author_books_subq, Author.id == author_books_subq.c.author_id)
    )

    if search and search.strip():
        kw = f"%{search.strip()}%"
        query = query.filter(
            Author.name.ilike(kw) |
            (Author.biography.ilike(kw)) |
            (Author.nationality.ilike(kw))
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    records = (
        query.order_by(Author.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for author, books_count in records:
        items.append({
            "id": author.id,
            "name": author.name,
            "biography": author.biography,
            "nationality": author.nationality,
            "created_at": author.created_at,
            "updated_at": author.updated_at,
            "books_count": int(books_count)
        })

    return items, total, total_pages


def get_all_authors_raw(db: Session) -> List[Dict[str, Any]]:
    """Lấy toàn bộ tác giả không phân trang (dùng cho dropdown)."""
    authors = db.query(Author).order_by(Author.name.asc()).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "biography": a.biography,
            "nationality": a.nationality,
            "created_at": a.created_at,
            "updated_at": a.updated_at,
            "books_count": 0
        }
        for a in authors
    ]


def get_author_by_id(db: Session, author_id: int) -> Author:
    author = db.query(Author).filter(Author.id == author_id).first()
    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tác giả với ID #{author_id}."
        )
    return author


def create_author(db: Session, data: AuthorCreate) -> Dict[str, Any]:
    name_clean = data.name.strip()
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên tác giả không được để trống."
        )

    # Kiểm tra trùng tên tác giả
    existing = (
        db.query(Author)
        .filter(func.lower(Author.name) == func.lower(name_clean))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tác giả '{name_clean}' đã tồn tại trong hệ thống. Vui lòng kiểm tra lại."
        )

    author = Author(
        name=name_clean,
        biography=data.biography.strip() if data.biography else None,
        nationality=data.nationality.strip() if data.nationality else None
    )
    db.add(author)
    db.commit()
    db.refresh(author)

    return {
        "id": author.id,
        "name": author.name,
        "biography": author.biography,
        "nationality": author.nationality,
        "created_at": author.created_at,
        "updated_at": author.updated_at,
        "books_count": 0
    }


def update_author(db: Session, author_id: int, data: AuthorUpdate) -> Dict[str, Any]:
    author = get_author_by_id(db, author_id)

    if data.name is not None:
        name_clean = data.name.strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên tác giả không được để trống."
            )
        existing = (
            db.query(Author)
            .filter(
                func.lower(Author.name) == func.lower(name_clean),
                Author.id != author_id
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tên tác giả '{name_clean}' đã tồn tại ở bản ghi khác."
            )
        author.name = name_clean

    if data.biography is not None:
        author.biography = data.biography.strip() if data.biography.strip() else None

    if data.nationality is not None:
        author.nationality = data.nationality.strip() if data.nationality.strip() else None

    db.commit()
    db.refresh(author)

    books_count = (
        db.query(BookAuthor)
        .join(Book, BookAuthor.book_isbn == Book.isbn)
        .filter(BookAuthor.author_id == author.id, Book.is_deleted == False)
        .count()
    )

    return {
        "id": author.id,
        "name": author.name,
        "biography": author.biography,
        "nationality": author.nationality,
        "created_at": author.created_at,
        "updated_at": author.updated_at,
        "books_count": books_count
    }


def delete_author(db: Session, author_id: int) -> Dict[str, Any]:
    author = get_author_by_id(db, author_id)

    # RÀNG BUỘC NGHIỆP VỤ: Không xoá khi còn đầu sách liên kết (báo lỗi rõ)
    linked_books_count = (
        db.query(BookAuthor)
        .join(Book, BookAuthor.book_isbn == Book.isbn)
        .filter(BookAuthor.author_id == author_id, Book.is_deleted == False)
        .count()
    )

    if linked_books_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xoá tác giả '{author.name}' vì vẫn còn {linked_books_count} đầu sách liên kết tác giả này đứng tên. Vui lòng cập nhật lại thông tin sách trước khi xoá."
        )

    author_name = author.name
    # Xoá các liên kết rác nếu có (chỉ nếu sách đã bị xoá hoàn toàn)
    db.query(BookAuthor).filter(BookAuthor.author_id == author_id).delete()
    db.delete(author)
    db.commit()

    return {
        "success": True,
        "message": f"Đã xoá thành công tác giả '{author_name}' (ID #{author_id})."
    }


# ==============================================================================
# 3. QUẢN LÝ NHÀ XUẤT BẢN (PUBLISHERS)
# ==============================================================================

def get_publishers(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10
) -> Tuple[List[Dict[str, Any]], int, int]:
    """Lấy danh sách nhà xuất bản có tìm kiếm, phân trang và đếm số đầu sách liên kết."""
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 10

    pub_books_subq = (
        db.query(
            Book.publisher_id,
            func.count(Book.isbn).label("books_count")
        )
        .filter(Book.is_deleted == False)
        .group_by(Book.publisher_id)
        .subquery()
    )

    query = (
        db.query(
            Publisher,
            func.coalesce(pub_books_subq.c.books_count, 0).label("books_count")
        )
        .outerjoin(pub_books_subq, Publisher.id == pub_books_subq.c.publisher_id)
    )

    if search and search.strip():
        kw = f"%{search.strip()}%"
        query = query.filter(
            Publisher.name.ilike(kw) |
            (Publisher.address.ilike(kw)) |
            (Publisher.description.ilike(kw))
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    records = (
        query.order_by(Publisher.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for pub, books_count in records:
        items.append({
            "id": pub.id,
            "name": pub.name,
            "address": pub.address,
            "description": pub.description,
            "created_at": pub.created_at,
            "updated_at": pub.updated_at,
            "books_count": int(books_count)
        })

    return items, total, total_pages


def get_all_publishers_raw(db: Session) -> List[Dict[str, Any]]:
    """Lấy toàn bộ NXB không phân trang (dùng cho dropdown)."""
    publishers = db.query(Publisher).order_by(Publisher.name.asc()).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "address": p.address,
            "description": p.description,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "books_count": 0
        }
        for p in publishers
    ]


def get_publisher_by_id(db: Session, publisher_id: int) -> Publisher:
    publisher = db.query(Publisher).filter(Publisher.id == publisher_id).first()
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy nhà xuất bản với ID #{publisher_id}."
        )
    return publisher


def create_publisher(db: Session, data: PublisherCreate) -> Dict[str, Any]:
    name_clean = data.name.strip()
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên nhà xuất bản không được để trống."
        )

    existing = (
        db.query(Publisher)
        .filter(func.lower(Publisher.name) == func.lower(name_clean))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nhà xuất bản '{name_clean}' đã tồn tại trong hệ thống. Vui lòng chọn tên khác."
        )

    publisher = Publisher(
        name=name_clean,
        address=data.address.strip() if data.address else None,
        description=data.description.strip() if data.description else None
    )
    db.add(publisher)
    db.commit()
    db.refresh(publisher)

    return {
        "id": publisher.id,
        "name": publisher.name,
        "address": publisher.address,
        "description": publisher.description,
        "created_at": publisher.created_at,
        "updated_at": publisher.updated_at,
        "books_count": 0
    }


def update_publisher(db: Session, publisher_id: int, data: PublisherUpdate) -> Dict[str, Any]:
    publisher = get_publisher_by_id(db, publisher_id)

    if data.name is not None:
        name_clean = data.name.strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên nhà xuất bản không được để trống."
            )
        existing = (
            db.query(Publisher)
            .filter(
                func.lower(Publisher.name) == func.lower(name_clean),
                Publisher.id != publisher_id
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tên nhà xuất bản '{name_clean}' đã tồn tại ở bản ghi khác."
            )
        publisher.name = name_clean

    if data.address is not None:
        publisher.address = data.address.strip() if data.address.strip() else None

    if data.description is not None:
        publisher.description = data.description.strip() if data.description.strip() else None

    db.commit()
    db.refresh(publisher)

    books_count = (
        db.query(Book)
        .filter(Book.publisher_id == publisher.id, Book.is_deleted == False)
        .count()
    )

    return {
        "id": publisher.id,
        "name": publisher.name,
        "address": publisher.address,
        "description": publisher.description,
        "created_at": publisher.created_at,
        "updated_at": publisher.updated_at,
        "books_count": books_count
    }


def delete_publisher(db: Session, publisher_id: int) -> Dict[str, Any]:
    publisher = get_publisher_by_id(db, publisher_id)

    # RÀNG BUỘC NGHIỆP VỤ: Không xoá khi còn đầu sách liên kết (báo lỗi rõ)
    linked_books_count = (
        db.query(Book)
        .filter(Book.publisher_id == publisher_id, Book.is_deleted == False)
        .count()
    )

    if linked_books_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xoá nhà xuất bản '{publisher.name}' vì vẫn còn {linked_books_count} đầu sách thuộc NXB này. Vui lòng chuyển thông tin sách sang NXB khác trước khi xoá."
        )

    pub_name = publisher.name
    db.delete(publisher)
    db.commit()

    return {
        "success": True,
        "message": f"Đã xoá thành công nhà xuất bản '{pub_name}' (ID #{publisher_id})."
    }


# ==============================================================================
# 4. THỐNG KÊ TỔNG QUAN
# ==============================================================================

def get_taxonomy_stats(db: Session) -> Dict[str, int]:
    total_categories = db.query(Category).count()
    total_authors = db.query(Author).count()
    total_publishers = db.query(Publisher).count()
    total_books = db.query(Book).filter(Book.is_deleted == False).count()

    return {
        "total_categories": total_categories,
        "total_authors": total_authors,
        "total_publishers": total_publishers,
        "total_books": total_books
    }
