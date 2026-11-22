import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.book import (
    create_book,
    delete_book,
    get_book_by_isbn,
    get_books_paginated,
    update_book,
    update_book_cover,
)
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.Category import Category
from app.schemas.book import BookCreate, BookPaginationResponse, BookSearchItem, BookUpdate

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("/facets")
def get_book_facets(db: Session = Depends(get_db)):
    """Trả về bộ đếm bộ lọc (Thể loại, Vị trí kệ, Ngôn ngữ) cho sidebar trang tra cứu sách."""
    cat_rows = (
        db.query(Category.id, Category.name, func.count(Book.isbn))
        .outerjoin(Book, (Book.category_id == Category.id) & (Book.is_deleted == False))  # noqa: E712
        .group_by(Category.id, Category.name)
        .order_by(func.count(Book.isbn).desc(), Category.name.asc())
        .all()
    )
    shelf_rows = (
        db.query(BookCopy.shelf_location, func.count(distinct(BookCopy.book_isbn)))
        .join(Book, (Book.isbn == BookCopy.book_isbn) & (Book.is_deleted == False))  # noqa: E712
        .group_by(BookCopy.shelf_location)
        .order_by(BookCopy.shelf_location.asc())
        .all()
    )
    lang_rows = (
        db.query(Book.language, func.count(Book.isbn))
        .filter(Book.is_deleted == False)  # noqa: E712
        .group_by(Book.language)
        .order_by(func.count(Book.isbn).desc())
        .all()
    )
    return {
        "categories": [{"id": r[0], "name": r[1], "count": int(r[2])} for r in cat_rows if r[2] > 0],
        "shelves": [{"name": r[0], "count": int(r[1])} for r in shelf_rows if r[0]],
        "languages": [{"name": r[0], "count": int(r[1])} for r in lang_rows if r[0]],
    }


@router.get("/search", response_model=BookPaginationResponse)
def search_books(
    db: Session = Depends(get_db),
    keyword: Optional[str] = Query(None, description="Tìm theo tên sách, ISBN, hoặc tên tác giả"),
    scope: str = Query("all", pattern="^(all|title|author|isbn|category)$", description="Phạm vi tìm kiếm"),
    category_id: Optional[int] = Query(None, description="Lọc theo 1 thể loại"),
    category_ids: Optional[str] = Query(None, description="Lọc nhiều thể loại (cách nhau bằng dấu phẩy)"),
    author_id: Optional[int] = Query(None, description="Lọc theo tác giả"),
    publisher_id: Optional[int] = Query(None, description="Lọc theo nhà xuất bản"),
    publish_year: Optional[int] = Query(None, description="Lọc theo năm xuất bản"),
    languages: Optional[str] = Query(None, description="Lọc theo ngôn ngữ (cách nhau bằng dấu phẩy)"),
    shelf_locations: Optional[str] = Query(None, description="Lọc theo vị trí kệ (cách nhau bằng dấu phẩy)"),
    available_only: bool = Query(False, description="Chỉ lấy sách còn bản sao có thể mượn"),
    sort_by: str = Query("created_at", pattern="^(created_at|title|publish_year|price)$", description="Trường cần sắp xếp"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Thứ tự sắp xếp: asc hoặc desc"),
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    page_size: int = Query(12, ge=1, le=100, description="Số sách mỗi trang"),
):
    """
    API tìm kiếm và tra cứu sách. Không yêu cầu đăng nhập.
    """
    parsed_cat_ids = [int(x) for x in category_ids.split(",") if x.strip().isdigit()] if isinstance(category_ids, str) else None
    parsed_langs = [x.strip() for x in languages.split(",") if x.strip()] if isinstance(languages, str) else None
    parsed_shelves = [x.strip() for x in shelf_locations.split(",") if x.strip()] if isinstance(shelf_locations, str) else None

    actual_kw = keyword if isinstance(keyword, str) else None
    actual_sc = scope if isinstance(scope, str) else "all"
    actual_cat_id = category_id if isinstance(category_id, int) else None
    actual_auth_id = author_id if isinstance(author_id, int) else None
    actual_pub_id = publisher_id if isinstance(publisher_id, int) else None
    actual_year = publish_year if isinstance(publish_year, int) else None
    actual_avail = bool(available_only) if isinstance(available_only, bool) else False
    actual_sort = sort_by if isinstance(sort_by, str) else "created_at"
    actual_order = sort_order if isinstance(sort_order, str) else "desc"
    actual_p = page if isinstance(page, int) else 1
    actual_ps = page_size if isinstance(page_size, int) else 12

    books, total, total_pages = get_books_paginated(
        db=db,
        keyword=actual_kw,
        scope=actual_sc,
        category_id=actual_cat_id,
        category_ids=parsed_cat_ids,
        author_id=actual_auth_id,
        publisher_id=actual_pub_id,
        publish_year=actual_year,
        languages=parsed_langs,
        shelf_locations=parsed_shelves,
        available_only=actual_avail,
        sort_by=actual_sort,
        sort_order=actual_order,
        page=actual_p,
        page_size=actual_ps,
    )

    items = []
    for b in books:
        copies = b.copies or []
        total_copies = len(copies)
        available_copies = sum(1 for c in copies if getattr(c, "status", None) == "AVAILABLE")
        borrowed_copies = sum(1 for c in copies if getattr(c, "status", None) == "BORROWED")
        reserved_copies = sum(1 for c in copies if getattr(c, "status", None) == "RESERVED")
        lost_copies = sum(1 for c in copies if getattr(c, "status", None) == "LOST")
        damage_copies = sum(1 for c in copies if getattr(c, "status", None) == "DAMAGED")
        disposed_copies = sum(1 for c in copies if getattr(c, "status", None) == "DISPOSED")
        shelf_location = copies[0].shelf_location if copies else None
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
                shelf_location=shelf_location,
                borrowed_copies=borrowed_copies,
                reserved_copies=reserved_copies,
                lost_copies=lost_copies,
                damage_copies=damage_copies,
                disposed_copies=disposed_copies,
            )
        )

    return BookPaginationResponse(
        items=items,
        total=total,
        page=actual_p,
        page_size=actual_ps,
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
        available_copies=result["available_copies"],
        shelf_location=book.copies[0].shelf_location if book.copies else None,
        borrowed_copies=result["borrowed_copies"],
        reserved_copies=result["reserved_copies"],
        lost_copies=result["lost_copies"],
        damage_copies=result["damage_copies"],
        disposed_copies=result["disposed_copies"],
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
            available_copies=result["available_copies"],
            shelf_location=book.copies[0].shelf_location if book.copies else None,
        )

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

@router.post("/{isbn}/cover", status_code = status.HTTP_200_OK)
async def upload_book_cover(
    isbn: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    book = get_book_by_isbn(db, isbn)

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đầu sách"
        )

    # Đọc file và kiểm tra dung lượng
    content = await file.read(5 * 1024 * 1024 + 1)

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Dung lượng ảnh không được vượt quá 5MB"
        )

    # Kiểm tra định dạng ảnh bằng chữ ký file
    if content.startswith(b"\xff\xd8\xff"):
        extension = ".jpg"
    elif content.startswith(b"\x89PNG\r\n\x1a\n"):
        extension = ".png"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận ảnh JPG hoặc PNG"
        )

    # Tạo thư mục lưu ảnh
    upload_dir = Path(__file__).resolve().parents[2] / "uploads" / "book_covers"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Tạo tên file theo ISBN
    filename = f"{isbn}{extension}"
    file_path = upload_dir / filename

    # Lưu ảnh
    with open(file_path, "wb") as f:
        f.write(content)

    # Đường dẫn lưu trong database
    cover_image = f"/uploads/book_covers/{filename}"

    update_book_cover(db, isbn, cover_image)

    return {
        "message": "Upload ảnh bìa thành công",
        "cover_image": cover_image
    }