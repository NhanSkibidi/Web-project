from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import taxonomy as crud_tax
from app.schemas.taxonomy import (
    CategoryCreate, CategoryUpdate, CategoryResponse, CategoryPaginatedResponse,
    AuthorCreate, AuthorUpdate, AuthorResponse, AuthorPaginatedResponse,
    PublisherCreate, PublisherUpdate, PublisherResponse, PublisherPaginatedResponse,
    TaxonomyStatsResponse
)

router = APIRouter(tags=["Danh mục: Thể loại, Tác giả, Nhà xuất bản"])


# ==============================================================================
# 1. CATEGORIES ENDPOINTS
# ==============================================================================

@router.get("/categories", response_model=CategoryPaginatedResponse)
def get_categories(
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc mô tả thể loại"),
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    page_size: int = Query(10, ge=1, le=100, description="Số bản ghi trên mỗi trang"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách thể loại có tìm kiếm, phân trang và đếm số sách liên kết."""
    items, total, total_pages = crud_tax.get_categories(
        db, search=search, page=page, page_size=page_size
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/categories/all", response_model=List[CategoryResponse])
def get_all_categories(db: Session = Depends(get_db)):
    """Lấy tất cả thể loại (dùng cho các dropdown select)."""
    return crud_tax.get_all_categories_raw(db)


@router.get("/categories/{category_id}", response_model=CategoryResponse)
def get_category_by_id(category_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết một thể loại theo ID."""
    cat = crud_tax.get_category_by_id(db, category_id)
    # Đếm số sách
    from app.models.Book import Book
    books_count = db.query(Book).filter(Book.category_id == cat.id, Book.is_deleted == False).count()
    return {
        "id": cat.id,
        "name": cat.name,
        "description": cat.description,
        "created_at": cat.created_at,
        "updated_at": cat.updated_at,
        "books_count": books_count
    }


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    """Thêm thể loại mới (tên không được trùng)."""
    return crud_tax.create_category(db, data)


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, data: CategoryUpdate, db: Session = Depends(get_db)):
    """Cập nhật thể loại (tên không được trùng với thể loại khác)."""
    return crud_tax.update_category(db, category_id, data)


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Xoá thể loại (chặn xoá nếu vẫn còn đầu sách liên kết và báo lỗi rõ ràng)."""
    return crud_tax.delete_category(db, category_id)


# ==============================================================================
# 2. AUTHORS ENDPOINTS
# ==============================================================================

@router.get("/authors", response_model=AuthorPaginatedResponse)
def get_authors(
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên, tiểu sử hoặc quốc tịch"),
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    page_size: int = Query(10, ge=1, le=100, description="Số bản ghi trên mỗi trang"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách tác giả có tìm kiếm, phân trang và đếm số sách liên kết."""
    items, total, total_pages = crud_tax.get_authors(
        db, search=search, page=page, page_size=page_size
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/authors/all", response_model=List[AuthorResponse])
def get_all_authors(db: Session = Depends(get_db)):
    """Lấy tất cả tác giả (dùng cho dropdown select khi thêm sách)."""
    return crud_tax.get_all_authors_raw(db)


@router.get("/authors/{author_id}", response_model=AuthorResponse)
def get_author_by_id(author_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết tác giả theo ID."""
    author = crud_tax.get_author_by_id(db, author_id)
    from app.models.BookAuthor import BookAuthor
    from app.models.Book import Book
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


@router.post("/authors", response_model=AuthorResponse, status_code=status.HTTP_201_CREATED)
def create_author(data: AuthorCreate, db: Session = Depends(get_db)):
    """Thêm tác giả mới (tên không được trùng)."""
    return crud_tax.create_author(db, data)


@router.put("/authors/{author_id}", response_model=AuthorResponse)
def update_author(author_id: int, data: AuthorUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin tác giả (tên không được trùng)."""
    return crud_tax.update_author(db, author_id, data)


@router.delete("/authors/{author_id}")
def delete_author(author_id: int, db: Session = Depends(get_db)):
    """Xoá tác giả (chặn xoá nếu vẫn còn đầu sách liên kết và báo lỗi rõ ràng)."""
    return crud_tax.delete_author(db, author_id)


# ==============================================================================
# 3. PUBLISHERS ENDPOINTS
# ==============================================================================

@router.get("/publishers", response_model=PublisherPaginatedResponse)
def get_publishers(
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên, địa chỉ hoặc mô tả NXB"),
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    page_size: int = Query(10, ge=1, le=100, description="Số bản ghi trên mỗi trang"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách nhà xuất bản có tìm kiếm, phân trang và đếm số sách liên kết."""
    items, total, total_pages = crud_tax.get_publishers(
        db, search=search, page=page, page_size=page_size
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/publishers/all", response_model=List[PublisherResponse])
def get_all_publishers(db: Session = Depends(get_db)):
    """Lấy tất cả NXB (dùng cho dropdown select)."""
    return crud_tax.get_all_publishers_raw(db)


@router.get("/publishers/{publisher_id}", response_model=PublisherResponse)
def get_publisher_by_id(publisher_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết nhà xuất bản theo ID."""
    pub = crud_tax.get_publisher_by_id(db, publisher_id)
    from app.models.Book import Book
    books_count = db.query(Book).filter(Book.publisher_id == pub.id, Book.is_deleted == False).count()
    return {
        "id": pub.id,
        "name": pub.name,
        "address": pub.address,
        "description": pub.description,
        "created_at": pub.created_at,
        "updated_at": pub.updated_at,
        "books_count": books_count
    }


@router.post("/publishers", response_model=PublisherResponse, status_code=status.HTTP_201_CREATED)
def create_publisher(data: PublisherCreate, db: Session = Depends(get_db)):
    """Thêm nhà xuất bản mới (tên không được trùng)."""
    return crud_tax.create_publisher(db, data)


@router.put("/publishers/{publisher_id}", response_model=PublisherResponse)
def update_publisher(publisher_id: int, data: PublisherUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin nhà xuất bản (tên không được trùng)."""
    return crud_tax.update_publisher(db, publisher_id, data)


@router.delete("/publishers/{publisher_id}")
def delete_publisher(publisher_id: int, db: Session = Depends(get_db)):
    """Xoá nhà xuất bản (chặn xoá nếu vẫn còn đầu sách liên kết và báo lỗi rõ ràng)."""
    return crud_tax.delete_publisher(db, publisher_id)


# ==============================================================================
# 4. TAXONOMY STATS
# ==============================================================================

@router.get("/taxonomy/stats", response_model=TaxonomyStatsResponse)
def get_taxonomy_stats(db: Session = Depends(get_db)):
    """Lấy số liệu thống kê tổng thể loại, tác giả, NXB và đầu sách."""
    return crud_tax.get_taxonomy_stats(db)
