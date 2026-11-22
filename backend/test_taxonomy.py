"""
Kiểm thử toàn diện module Taxonomy: Quản lý Thể loại, Tác giả, Nhà xuất bản (Task T3CFCC6)
Yêu cầu bài toán:
1. Thêm/sửa/xoá thể loại, tác giả, NXB
2. Tên không trùng (Unique validation cả khi create và update)
3. Tìm kiếm theo từ khoá & Phân trang (page, page_size)
4. KHÔNG XOÁ KHI CÒN ĐẦU SÁCH LIÊN KẾT (báo lỗi rõ ràng)
5. Xoá thành công khi không còn sách liên kết
"""

import os
import sys

# Patch tương thích Python 3.14 với SQLAlchemy typing
import sqlalchemy.util.typing as sa_typing
def _patched_make_union(*types):
    res = types[0]
    for t in types[1:]:
        res = res | t
    return res
sa_typing.make_union_type = _patched_make_union

# Dùng SQLite file để test độc lập
TEST_DB_FILE = "test_taxonomy.db"
os.environ["DATABASE_URL"] = f"sqlite:///./{TEST_DB_FILE}"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.db.session import Base
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
from app.crud import taxonomy as crud_tax

engine = create_engine(f"sqlite:///./{TEST_DB_FILE}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def setup_database():
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass
    Base.metadata.create_all(bind=engine)
    print("-> Đã khởi tạo cấu trúc database test.")


def run_tests():
    setup_database()
    db = TestingSessionLocal()

    print("\n" + "=" * 60)
    print("BẮT ĐẦU KIỂM THỬ MODULE THỂ LOẠI, TÁC GIẢ, NXB (T3CFCC6)")
    print("=" * 60)

    # -------------------------------------------------------------
    # PHẦN 1: KIỂM THỬ THỂ LOẠI (CATEGORIES)
    # -------------------------------------------------------------
    print("\n[TEST 1.1] Tạo mới thể loại & chặn tên trùng lặp...")
    cat1_data = CategoryCreate(name="Khoa Học Máy Tính", description="Sách về lập trình, thuật toán")
    cat1 = crud_tax.create_category(db, cat1_data)
    assert cat1["id"] is not None
    assert cat1["name"] == "Khoa Học Máy Tính"
    print(f"  -> Tạo thành công thể loại ID #{cat1['id']}: {cat1['name']}")

    # Thử tạo trùng lặp (kể cả khác chữ hoa/thường)
    try:
        crud_tax.create_category(db, CategoryCreate(name="khoa học máy tính"))
        assert False, "Lỗi: Không được phép tạo trùng tên thể loại!"
    except HTTPException as e:
        assert e.status_code == 400
        print(f"  -> Chặn trùng tên chính xác: {e.detail}")

    # Tạo thêm thể loại thứ 2
    cat2 = crud_tax.create_category(db, CategoryCreate(name="Kinh Tế Học", description="Sách tài chính, quản trị"))
    print(f"  -> Tạo thêm thể loại ID #{cat2['id']}: {cat2['name']}")

    print("\n[TEST 1.2] Cập nhật thể loại...")
    updated_cat = crud_tax.update_category(db, cat1["id"], CategoryUpdate(description="Mô tả cập nhật mới"))
    assert updated_cat["description"] == "Mô tả cập nhật mới"
    print("  -> Cập nhật mô tả thành công.")

    # Thử cập nhật tên trùng với cat2
    try:
        crud_tax.update_category(db, cat1["id"], CategoryUpdate(name="Kinh Tế Học"))
        assert False, "Lỗi: Không được phép sửa tên trùng thể loại khác!"
    except HTTPException as e:
        assert e.status_code == 400
        print(f"  -> Chặn đổi tên trùng chính xác: {e.detail}")

    print("\n[TEST 1.3] Tìm kiếm và phân trang thể loại...")
    items, total, total_pages = crud_tax.get_categories(db, search="máy tính", page=1, page_size=10)
    assert total == 1
    assert items[0]["name"] == "Khoa Học Máy Tính"
    print(f"  -> Tìm kiếm ra {total} bản ghi phù hợp.")

    # -------------------------------------------------------------
    # PHẦN 2: KIỂM THỬ TÁC GIẢ (AUTHORS)
    # -------------------------------------------------------------
    print("\n[TEST 2.1] Tạo mới tác giả & chặn trùng tên...")
    author1_data = AuthorCreate(name="Robert C. Martin", biography="Uncle Bob - Chuyên gia phần mềm", nationality="USA")
    author1 = crud_tax.create_author(db, author1_data)
    assert author1["id"] is not None
    print(f"  -> Tạo thành công tác giả ID #{author1['id']}: {author1['name']}")

    try:
        crud_tax.create_author(db, AuthorCreate(name="robert c. martin"))
        assert False, "Lỗi: Phải chặn trùng tên tác giả!"
    except HTTPException as e:
        assert e.status_code == 400
        print(f"  -> Chặn trùng tên tác giả chính xác: {e.detail}")

    author2 = crud_tax.create_author(db, AuthorCreate(name="Martin Fowler", nationality="UK"))
    print(f"  -> Tạo thêm tác giả ID #{author2['id']}: {author2['name']}")

    # -------------------------------------------------------------
    # PHẦN 3: KIỂM THỬ NHÀ XUẤT BẢN (PUBLISHERS)
    # -------------------------------------------------------------
    print("\n[TEST 3.1] Tạo mới NXB & chặn trùng tên...")
    pub1_data = PublisherCreate(name="NXB Thông Tin & Truyền Thông", address="Hà Nội", description="NXB uy tín")
    pub1 = crud_tax.create_publisher(db, pub1_data)
    assert pub1["id"] is not None
    print(f"  -> Tạo thành công NXB ID #{pub1['id']}: {pub1['name']}")

    try:
        crud_tax.create_publisher(db, PublisherCreate(name="nxb thông tin & truyền thông"))
        assert False, "Lỗi: Phải chặn trùng tên NXB!"
    except HTTPException as e:
        assert e.status_code == 400
        print(f"  -> Chặn trùng tên NXB chính xác: {e.detail}")

    pub2 = crud_tax.create_publisher(db, PublisherCreate(name="NXB Giáo Dục", address="Hà Nội"))
    print(f"  -> Tạo thêm NXB ID #{pub2['id']}: {pub2['name']}")

    # -------------------------------------------------------------
    # PHẦN 4: KIỂM THỬ CHẶN XOÁ KHI CÒN ĐẦU SÁCH LIÊN KẾT (CỐT LÕI)
    # -------------------------------------------------------------
    print("\n[TEST 4.1] Tạo đầu sách liên kết với cat1, author1, pub1...")
    test_book = Book(
        isbn="978-0132350884",
        title="Clean Code: A Handbook of Agile Software Craftsmanship",
        category_id=cat1["id"],
        publisher_id=pub1["id"],
        publish_year=2008,
        price=350000,
        is_deleted=False
    )
    db.add(test_book)
    db.flush()

    # Thêm liên kết sách - tác giả
    ba = BookAuthor(book_isbn=test_book.isbn, author_id=author1["id"])
    db.add(ba)
    db.commit()
    print("  -> Đã tạo cuốn sách liên kết thành công.")

    print("\n[TEST 4.2] Chặn xoá Thể loại khi còn sách liên kết...")
    try:
        crud_tax.delete_category(db, cat1["id"])
        assert False, "Lỗi: Không được phép xoá thể loại khi còn sách!"
    except HTTPException as e:
        assert e.status_code == 400
        assert "1 đầu sách" in e.detail
        print(f"  -> Chặn xoá thể loại chính xác: {e.detail}")

    print("\n[TEST 4.3] Chặn xoá Tác giả khi còn sách liên kết...")
    try:
        crud_tax.delete_author(db, author1["id"])
        assert False, "Lỗi: Không được phép xoá tác giả khi còn sách!"
    except HTTPException as e:
        assert e.status_code == 400
        assert "1 đầu sách" in e.detail
        print(f"  -> Chặn xoá tác giả chính xác: {e.detail}")

    print("\n[TEST 4.4] Chặn xoá NXB khi còn sách liên kết...")
    try:
        crud_tax.delete_publisher(db, pub1["id"])
        assert False, "Lỗi: Không được phép xoá NXB khi còn sách!"
    except HTTPException as e:
        assert e.status_code == 400
        assert "1 đầu sách" in e.detail
        print(f"  -> Chặn xoá NXB chính xác: {e.detail}")

    # -------------------------------------------------------------
    # PHẦN 5: KIỂM THỬ XOÁ THÀNH CÔNG KHI KHÔNG CÒN SÁCH LIÊN KẾT
    # -------------------------------------------------------------
    print("\n[TEST 5.1] Xoá các mục KHÔNG có sách liên kết...")
    res_del_cat = crud_tax.delete_category(db, cat2["id"])
    assert res_del_cat["success"] is True
    print(f"  -> Xoá thể loại cat2 thành công: {res_del_cat['message']}")

    res_del_auth = crud_tax.delete_author(db, author2["id"])
    assert res_del_auth["success"] is True
    print(f"  -> Xoá tác giả author2 thành công: {res_del_auth['message']}")

    res_del_pub = crud_tax.delete_publisher(db, pub2["id"])
    assert res_del_pub["success"] is True
    print(f"  -> Xoá NXB pub2 thành công: {res_del_pub['message']}")

    # -------------------------------------------------------------
    # PHẦN 6: KIỂM THỬ THỐNG KÊ (TAXONOMY STATS)
    # -------------------------------------------------------------
    print("\n[TEST 6.1] Kiểm tra API thống kê tổng quan...")
    stats = crud_tax.get_taxonomy_stats(db)
    assert stats["total_categories"] == 1
    assert stats["total_authors"] == 1
    assert stats["total_publishers"] == 1
    assert stats["total_books"] == 1
    print(f"  -> Thống kê chính xác: {stats}")

    db.close()
    print("\n" + "=" * 60)
    print("TẤT CẢ CÁC BÀI TEST T3CFCC6 ĐÃ VƯỢT QUA 100% HOÀN HẢO!")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()
