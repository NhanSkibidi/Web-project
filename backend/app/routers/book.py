from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from app.db.session import get_db
from app.crud.book import get_books_paginated, get_book_by_isbn, create_book, update_book, delete_book
from app.schemas.book import BookPaginationResponse, BookSearchItem, BookCreate, BookUpdate
from sqlalchemy.orm import Session

router = APIRouter(prefix="/books", tags=["Books"])

@router.get("/search", response_model=BookPaginationResponse)
def search_books(
    db: Session = Depends(get_db),
    keyword: Optional[str] = Query(None, description="Tìm theo tên sách, ISBN, hoặc tên tác giả"),
    category_id: Optional[int] = Query(None, description="Lọc theo thể loại"),
    author_id: Optional[int] = Query(None, description="Lọc theo tác giả"),
    publisher_id: Optional[int] = Query(None, description="Lọc theo nhà xuất bản"),
    publish_year: Optional[int] = Query(None, description="Lọc theo năm xuất bản"),
    available_only: bool = Query(False, description="Chỉ lấy sách còn bản sao có thể mượn"),
    sort_by: str = Query("created_at", pattern="^(created_at|title|publish_year|price)$", description="Trường cần sắp xếp"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Thứ tự sắp xếp: asc hoặc desc"),
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

@router.get("/{isbn}", response_model=BookSearchItem)
def get_book_detail(
    isbn: str,
    db: Session = Depends(get_db)
):
    result = get_book_by_isbn(db, isbn)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đầu sách"
        )

    book = result["book"]

    return BookSearchItem(
        isbn=book.isbn,
        title=book.title,
        publish_year=book.publish_year,
        page_count=book.page_count,
        language=book.language,
        description=book.description,
        cover_image=book.cover_image,
        price=book.price,
        category=book.category,
        publisher=book.publisher,
        authors=result["authors"],
        total_copies=result["total_copies"],
        available_copies=result["available_copies"]
    )

@router.post("", response_model=BookSearchItem, status_code=status.HTTP_201_CREATED)
def create_book_api(
    book_data: BookCreate,
    db: Session = Depends(get_db)
):
    try:
        book, authors = create_book(db, book_data)

        if not book:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạo đầu sách"
            )

        return BookSearchItem(
            isbn=book.isbn,
            title=book.title,
            publish_year=book.publish_year,
            page_count=book.page_count,
            language=book.language,
            description=book.description,
            cover_image=book.cover_image,
            price=book.price,
            category=book.category,
            publisher=book.publisher,
            authors=authors,
            total_copies=0,
            available_copies=0
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{isbn}", response_model=BookSearchItem, status_code = status.HTTP_200_OK)
def update_book_api(
    isbn: str,
    book_data: BookUpdate,
    db: Session = Depends(get_db)
):
    try:
        result = update_book(db, isbn, book_data)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy đầu sách")

        book = result["book"]

        return BookSearchItem(
            isbn=book.isbn,
            title=book.title,
            publish_year=book.publish_year,
            page_count=book.page_count,
            language=book.language,
            description=book.description,
            cover_image=book.cover_image,
            price=book.price,
            category=book.category,
            publisher=book.publisher,
            authors=result["authors"],
            total_copies=result["total_copies"],
            available_copies=result["available_copies"])

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e))

@router.delete("/{isbn}", status_code=status.HTTP_200_OK)
def delete_book_api(isbn: str, db: Session = Depends(get_db)):
    result = delete_book(db, isbn)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đầu sách")

    if result == "hidden":
        return {"message": "Đầu sách đã được ẩn"}

    return {"message": "Đầu sách đã được xóa"}