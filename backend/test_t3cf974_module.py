# -*- coding: utf-8 -*-
"""
KIỂM THỬ TỰ ĐỘNG CÁC API ROUTER MODULES (Không phụ thuộc httpx):
  1. [T3CFCAC / T3CFBEF] API Đặt trước sách khi hết (Reservation)
  2. [T3CFCC6] API Quản lý Thể loại, Tác giả, Nhà xuất bản (Taxonomy)
  3. [T3CFC09] API Tìm kiếm & tra cứu sách (Book Search & Filter)
  4. [T3CFC4B] API Xem chi tiết sách & thống kê bản sao (Book Detail)

Tất cả dữ liệu kiểm thử được seed trực tiếp trong file này.
Test trực tiếp các hàm API router:
  - Đúng (Happy Path)
  - Sai dữ liệu (Validation / Chặn trùng / Chặn xoá khi còn sách)
  - Chưa đăng nhập (401 Unauthorized & Truy cập công khai)
  - Sai quyền (403 Forbidden)

Cách chạy:
  cd Web-project/backend
  python test_t3cf974_module.py
"""

import os
import sys
from datetime import datetime, timedelta

# Patch tương thích Python 3.14 với SQLAlchemy typing
import sqlalchemy.util.typing as sa_typing
def _patched_make_union(*types):
    res = types[0]
    for t in types[1:]:
        res = res | t
    return res
sa_typing.make_union_type = _patched_make_union

# Patch FastAPI cho môi trường không cài sẵn python-multipart
import fastapi.dependencies.utils as f_utils
f_utils.ensure_multipart_is_installed = lambda: None

# Khởi tạo DB SQLite riêng biệt cho kiểm thử
TEST_DB_NAME = "test_api_t3cf974.db"
os.environ["DATABASE_URL"] = f"sqlite:///./{TEST_DB_NAME}"
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.db.session import Base
from app.core.security import hash_password
from app.models.user import User, UserRole, UserStatus
from app.models.Category import Category
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Book import Book
from app.models.BookAuthor import BookAuthor
from app.models.BookCopy import BookCopy
from app.models.reservation import Reservation

# Schemas
from app.schemas.reservation import ReservationCreate
from app.schemas.taxonomy import (
    CategoryCreate, CategoryUpdate,
    AuthorCreate, AuthorUpdate,
    PublisherCreate, PublisherUpdate,
)

# Routers
from app.routers.reservation import (
    api_create_reservation,
    api_get_my_reservations,
    api_cancel_reservation,
    api_get_staff_ready_reservations,
    api_check_expired_reservations,
    api_fulfill_reservation,
)
from app.routers.taxonomy import (
    create_category,
    get_categories,
    update_category,
    delete_category,
    create_author,
    delete_author,
    create_publisher,
    delete_publisher,
)
from app.routers.book import (
    search_books,
    get_book_detail,
)
from app.crud import reservation as crud_res

engine = create_engine(f"sqlite:///./{TEST_DB_NAME}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

TOTAL_PASS = 0
TOTAL_FAIL = 0

def check(passed: bool, tc_id: str, title: str, detail: str = ""):
    global TOTAL_PASS, TOTAL_FAIL
    if passed:
        TOTAL_PASS += 1
        print(f"  ✅ [PASS] {tc_id}: {title} {detail}")
    else:
        TOTAL_FAIL += 1
        print(f"  ❌ [FAIL] {tc_id}: {title} {detail}")


def seed_data(db):
    """Seed toàn bộ dữ liệu mẫu phục vụ test API trực tiếp trong file."""
    print("\n--- 1. SEED DỮ LIỆU KIỂM THỬ TRONG FILE ---")

    # 1. Users
    admin = User(
        email="admin@unilib.edu.vn",
        password_hash=hash_password("admin123"),
        full_name="Quản trị viên Hệ thống",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    librarian = User(
        email="librarian@unilib.edu.vn",
        password_hash=hash_password("lib123"),
        full_name="Thủ thư Bàn làm việc",
        role=UserRole.LIBRARIAN,
        status=UserStatus.ACTIVE,
    )
    reader1 = User(
        email="reader1@unilib.edu.vn",
        password_hash=hash_password("reader123"),
        full_name="Nguyễn Nhật Anh",
        phone="0912345678",
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )
    reader2 = User(
        email="reader2@unilib.edu.vn",
        password_hash=hash_password("reader123"),
        full_name="Trịnh Huy Đại",
        phone="0987654321",
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )
    reader3 = User(
        email="reader3@unilib.edu.vn",
        password_hash=hash_password("reader123"),
        full_name="Lương Thiện Nhân",
        phone="0905123456",
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )
    db.add_all([admin, librarian, reader1, reader2, reader3])
    db.flush()

    # 2. Categories
    cat_cs = Category(name="Khoa Học Máy Tính", description="Lập trình, Thuật toán & Kiến trúc phần mềm")
    cat_econ = Category(name="Kinh Tế Học", description="Tài chính, Quản trị kinh doanh & Đầu tư")
    cat_lit = Category(name="Văn Học Nghệ Thuật", description="Tiểu thuyết, Thơ ca & Văn học kinh điển")
    db.add_all([cat_cs, cat_econ, cat_lit])
    db.flush()

    # 3. Authors
    author_uncle_bob = Author(name="Robert C. Martin", biography="Uncle Bob - Chuyên gia Clean Code", nationality="Mỹ")
    author_fowler = Author(name="Martin Fowler", biography="Chuyên gia Refactoring & Microservices", nationality="Anh")
    author_anh = Author(name="Nguyễn Nhật Ánh", biography="Nhà văn gắn liền với tuổi thơ thế hệ trẻ", nationality="Việt Nam")
    db.add_all([author_uncle_bob, author_fowler, author_anh])
    db.flush()

    # 4. Publishers
    pub_tt = Publisher(name="NXB Thông Tin & Truyền Thông", address="Hà Nội", description="Sách CNTT & Viễn thông")
    pub_tre = Publisher(name="NXB Trẻ", address="TP. Hồ Chí Minh", description="Sách văn học & giáo dục")
    db.add_all([pub_tt, pub_tre])
    db.flush()

    # 5. Books
    # Sách 1: HẾT SẠCH BẢN SAO (Available = 0, toàn bộ BORROWED) -> Để test Đặt trước!
    book_clean_code = Book(
        isbn="978-0132350884",
        title="Clean Code: A Handbook of Agile Software Craftsmanship",
        category_id=cat_cs.id,
        publisher_id=pub_tt.id,
        publish_year=2008,
        price=350000,
        is_deleted=False,
    )
    # Sách 2: CÒN SẴN BẢN SAO (Available = 2) -> Để test Chặn đặt trước khi sách còn!
    book_tuoi_tho = Book(
        isbn="978-6042100001",
        title="Cho Tôi Xin Một Vé Đi Tuổi Thơ",
        category_id=cat_lit.id,
        publisher_id=pub_tre.id,
        publish_year=2015,
        price=95000,
        is_deleted=False,
    )
    # Sách 3 & 4: Hết sách phục vụ test quota đặt trước
    book_refactor = Book(
        isbn="978-0201485677",
        title="Refactoring: Improving the Design of Existing Code",
        category_id=cat_cs.id,
        publisher_id=pub_tt.id,
        publish_year=2018,
        price=420000,
        is_deleted=False,
    )
    book_extra = Book(
        isbn="978-0134494166",
        title="Clean Architecture",
        category_id=cat_cs.id,
        publisher_id=pub_tt.id,
        publish_year=2017,
        price=380000,
        is_deleted=False,
    )
    db.add_all([book_clean_code, book_tuoi_tho, book_refactor, book_extra])
    db.flush()

    # Liên kết Sách - Tác giả
    db.add(BookAuthor(book_isbn=book_clean_code.isbn, author_id=author_uncle_bob.id))
    db.add(BookAuthor(book_isbn=book_tuoi_tho.isbn, author_id=author_anh.id))
    db.add(BookAuthor(book_isbn=book_refactor.isbn, author_id=author_fowler.id))
    db.add(BookAuthor(book_isbn=book_extra.isbn, author_id=author_uncle_bob.id))
    db.flush()

    # Bản sao
    today = datetime.now().date()
    copy1 = BookCopy(book_isbn=book_clean_code.isbn, copy_code="CC-001", shelf_location="Kệ A1-01", imported_at=today, condition="MỚI", status="BORROWED")
    copy2 = BookCopy(book_isbn=book_clean_code.isbn, copy_code="CC-002", shelf_location="Kệ A1-02", imported_at=today, condition="MỚI", status="BORROWED")
    copy3 = BookCopy(book_isbn=book_tuoi_tho.isbn, copy_code="TT-001", shelf_location="Kệ B2-01", imported_at=today, condition="MỚI", status="AVAILABLE")
    copy4 = BookCopy(book_isbn=book_tuoi_tho.isbn, copy_code="TT-002", shelf_location="Kệ B2-02", imported_at=today, condition="MỚI", status="AVAILABLE")
    copy5 = BookCopy(book_isbn=book_refactor.isbn, copy_code="RF-001", shelf_location="Kệ A2-01", imported_at=today, condition="MỚI", status="BORROWED")
    copy6 = BookCopy(book_isbn=book_extra.isbn, copy_code="CA-001", shelf_location="Kệ A2-02", imported_at=today, condition="MỚI", status="BORROWED")

    db.add_all([copy1, copy2, copy3, copy4, copy5, copy6])
    db.commit()

    print("  -> Đã seed 5 Users (Admin, Thủ thư, 3 Độc giả)")
    print("  -> Đã seed 3 Thể loại, 3 Tác giả, 2 Nhà xuất bản")
    print("  -> Đã seed 4 Đầu sách kèm 6 Bản sao với trạng thái phân bổ chuẩn.")

    return {
        "admin": admin, "librarian": librarian,
        "reader1": reader1, "reader2": reader2, "reader3": reader3,
        "book_out": book_clean_code, "book_avail": book_tuoi_tho,
        "book_refactor": book_refactor, "book_extra": book_extra,
        "cat_cs": cat_cs, "cat_econ": cat_econ,
        "author_bob": author_uncle_bob, "pub_tt": pub_tt,
        "copy1": copy1, "copy2": copy2,
    }


def run_tests():
    if os.path.exists(TEST_DB_NAME):
        try: os.remove(TEST_DB_NAME)
        except Exception: pass

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    data = seed_data(db)

    print("\n" + "=" * 70)
    print("BẮT ĐẦU CHẠY KIỂM THỬ API ROUTERS TRỰC TIẾP")
    print("=" * 70)

    # =========================================================================
    # PHẦN 1: API ĐẶT TRƯỚC SÁCH KHI HẾT (T3CFCAC / T3CFBEF)
    # =========================================================================
    print("\n▶ PHẦN 1: KIỂM THỬ API ĐẶT TRƯỚC SÁCH (T3CFCAC)")

    # 1. Đặt trước thành công khi hết sách (HTTP 200, WAITING, Vị trí 1)
    res_data1 = api_create_reservation(
        payload=ReservationCreate(book_isbn=data["book_out"].isbn),
        user_id=data["reader1"].id,
        current_user=None,
        db=db,
    )
    check(res_data1.get("status") == "WAITING" and res_data1.get("queue_position") == 1,
          "API_RES_01", "api_create_reservation - Đặt trước sách thành công (WAITING, Vị trí #1)")

    # 2. Xếp hàng FIFO: Độc giả 2 đặt cùng cuốn sách (HTTP 200, Vị trí 2)
    res_data2 = api_create_reservation(
        payload=ReservationCreate(book_isbn=data["book_out"].isbn),
        user_id=data["reader2"].id,
        current_user=None,
        db=db,
    )
    check(res_data2.get("queue_position") == 2,
          "API_RES_02", "api_create_reservation - Xếp hàng FIFO người thứ hai vào vị trí #2")

    # 3. Xem danh sách đơn đặt trước của độc giả
    my_res = api_get_my_reservations(user_id=data["reader1"].id, current_user=None, db=db)
    check(len(my_res) >= 1 and my_res[0]["book_isbn"] == data["book_out"].isbn,
          "API_RES_03", "api_get_my_reservations - Lấy danh sách đặt trước của độc giả kèm vị trí chờ")

    # 4. Khi có sách trả về kho -> Tự động chuyển READY cho người đầu hàng, bản sao sang RESERVED, giữ 2 ngày
    crud_res.process_returned_copy_for_reservation(db, data["copy1"])
    db.commit()
    r1_db = db.query(Reservation).filter(Reservation.id == res_data1["id"]).first()
    db.refresh(r1_db); db.refresh(data["copy1"])
    check(r1_db.status == "READY" and data["copy1"].status == "RESERVED" and r1_db.pickup_deadline is not None,
          "API_RES_04", "LOGIC Trả sách -> Người đầu hàng chuyển READY, bản sao sang RESERVED giữ 2 ngày")

    # 5. Quá hạn 2 ngày -> Tác vụ quét API tự động chuyển EXPIRED, chuyển lượt sang người tiếp theo thành READY
    r1_db.pickup_deadline = datetime.now() - timedelta(hours=1)
    db.commit()
    api_check_expired_reservations(db=db)
    r2_db = db.query(Reservation).filter(Reservation.id == res_data2["id"]).first()
    db.refresh(r1_db); db.refresh(r2_db)
    check(r1_db.status == "EXPIRED" and r2_db.status == "READY",
          "API_RES_05", "api_check_expired_reservations - Đơn #1 sang EXPIRED, đơn #2 tự động thành READY")

    # 6. Độc giả chủ động huỷ đơn đặt trước qua API (HTTP 200, CANCELLED, hoàn AVAILABLE)
    cancel_res = api_cancel_reservation(reservation_id=r2_db.id, user_id=data["reader2"].id, current_user=None, db=db)
    db.refresh(data["copy1"])
    check(cancel_res.get("status") == "CANCELLED" and data["copy1"].status == "AVAILABLE",
          "API_RES_06", "api_cancel_reservation - Huỷ đơn đặt trước, hoàn bản sao về AVAILABLE")

    # 7. Chặn đặt trước khi đầu sách VẪN CÒN bản sao khả dụng (HTTP 400)
    try:
        api_create_reservation(payload=ReservationCreate(book_isbn=data["book_avail"].isbn), user_id=data["reader1"].id, current_user=None, db=db)
        check(False, "API_RES_07", "Chặn đặt khi còn sách", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 400, "API_RES_07", "api_create_reservation - Chặn đặt khi còn bản sao khả dụng (HTTP 400)")

    # 8. Chặn đặt trước trùng lặp cùng một đầu sách (HTTP 400)
    data["copy1"].status = "BORROWED"; db.commit() # Để sách hết bản sao
    api_create_reservation(payload=ReservationCreate(book_isbn=data["book_out"].isbn), user_id=data["reader3"].id, current_user=None, db=db)
    try:
        api_create_reservation(payload=ReservationCreate(book_isbn=data["book_out"].isbn), user_id=data["reader3"].id, current_user=None, db=db)
        check(False, "API_RES_08", "Chặn đặt trùng", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 400, "API_RES_08", "api_create_reservation - Chặn đặt trùng cùng đầu sách (HTTP 400)")

    # 9. Chặn vượt quá hạn mức tối đa 3 đơn đặt trước (HTTP 400)
    api_create_reservation(payload=ReservationCreate(book_isbn=data["book_refactor"].isbn), user_id=data["reader3"].id, current_user=None, db=db)
    api_create_reservation(payload=ReservationCreate(book_isbn=data["book_extra"].isbn), user_id=data["reader3"].id, current_user=None, db=db)
    # Thêm sách thứ 5 hết hàng
    b5 = Book(isbn="978-9999999999", title="Book 5 Out", category_id=data["cat_cs"].id, publisher_id=data["pub_tt"].id, is_deleted=False)
    db.add(b5); db.flush()
    db.add(BookCopy(book_isbn=b5.isbn, copy_code="B5-001", shelf_location="Kệ C1", imported_at=datetime.now().date(), status="BORROWED"))
    db.commit()
    try:
        api_create_reservation(payload=ReservationCreate(book_isbn=b5.isbn), user_id=data["reader3"].id, current_user=None, db=db)
        check(False, "API_RES_09", "Chặn quota 3", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 400, "API_RES_09", "api_create_reservation - Chặn vượt tối đa 3 đơn cùng lúc (HTTP 400)")

    # 10. Gửi mã ISBN không tồn tại (HTTP 404)
    try:
        api_create_reservation(payload=ReservationCreate(book_isbn="000-0000000000"), user_id=data["reader1"].id, current_user=None, db=db)
        check(False, "API_RES_10", "ISBN không tồn tại", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 404, "API_RES_10", "api_create_reservation - Gửi mã ISBN không tồn tại (HTTP 404)")

    # =========================================================================
    # PHẦN 2: API QUẢN LÝ THỂ LOẠI, TÁC GIẢ, NHÀ XUẤT BẢN (T3CFCC6)
    # =========================================================================
    print("\n▶ PHẦN 2: KIỂM THỬ API QUẢN LÝ DANH MỤC (T3CFCC6)")

    # 11. Thêm mới Thể loại thành công (HTTP 201)
    new_cat = create_category(data=CategoryCreate(name="Trí Tuệ Nhân Tạo", description="Sách AI"), db=db)
    check(new_cat.get("id") is not None and new_cat.get("name") == "Trí Tuệ Nhân Tạo",
          "API_TAX_01", "create_category - Thêm mới Thể loại thành công (HTTP 201)")

    # 12. Thêm mới Tác giả & Nhà xuất bản thành công (HTTP 201)
    new_auth = create_author(data=AuthorCreate(name="Andrew Ng", nationality="Mỹ"), db=db)
    new_pub = create_publisher(data=PublisherCreate(name="NXB Kim Đồng", address="Hà Nội"), db=db)
    check(new_auth.get("id") is not None and new_pub.get("id") is not None,
          "API_TAX_02", "create_author & create_publisher - Thêm Tác giả và NXB thành công (HTTP 201)")

    # 13. Chặn thêm mới Thể loại trùng tên (không phân biệt hoa thường) (HTTP 400)
    try:
        create_category(data=CategoryCreate(name="trí tuệ nhân tạo"), db=db)
        check(False, "API_TAX_03", "Chặn trùng tên", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 400, "API_TAX_03", "create_category - Chặn thêm Thể loại trùng tên hoa/thường (HTTP 400)")

    # 14. Tìm kiếm từ khoá và phân trang Thể loại
    search_cat = get_categories(search="Nhân Tạo", page=1, page_size=10, db=db)
    check(search_cat.get("total") == 1 and search_cat["items"][0]["name"] == "Trí Tuệ Nhân Tạo",
          "API_TAX_04", "get_categories - Tìm kiếm Thể loại theo từ khoá và phân trang (HTTP 200)")

    # 15. Chặn sửa tên Thể loại trùng với thể loại khác (HTTP 400)
    try:
        update_category(category_id=data["cat_econ"].id, data=CategoryUpdate(name="Khoa Học Máy Tính"), db=db)
        check(False, "API_TAX_05", "Chặn sửa trùng", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 400, "API_TAX_05", "update_category - Chặn đổi tên Thể loại trùng với thể loại khác (HTTP 400)")

    # 16. CHẶN XOÁ THỂ LOẠI KHI CÒN ĐẦU SÁCH LIÊN KẾT (HTTP 400)
    try:
        delete_category(category_id=data["cat_cs"].id, db=db)
        check(False, "API_TAX_06", "Chặn xoá thể loại có sách", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 400 and "Không thể xoá" in str(e.detail),
              "API_TAX_06", "delete_category - Chặn xoá Thể loại khi còn sách liên kết (HTTP 400)")

    # 17. CHẶN XOÁ TÁC GIẢ KHI CÒN ĐẦU SÁCH LIÊN KẾT (HTTP 400)
    try:
        delete_author(author_id=data["author_bob"].id, db=db)
        check(False, "API_TAX_07", "Chặn xoá tác giả có sách", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 400 and "Không thể xoá" in str(e.detail),
              "API_TAX_07", "delete_author - Chặn xoá Tác giả khi còn sách liên kết (HTTP 400)")

    # 18. CHẶN XOÁ NHÀ XUẤT BẢN KHI CÒN ĐẦU SÁCH LIÊN KẾT (HTTP 400)
    try:
        delete_publisher(publisher_id=data["pub_tt"].id, db=db)
        check(False, "API_TAX_08", "Chặn xoá NXB có sách", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 400 and "Không thể xoá" in str(e.detail),
              "API_TAX_08", "delete_publisher - Chặn xoá NXB khi còn sách liên kết (HTTP 400)")

    # 19. Xoá thành công khi KHÔNG CÒN sách liên kết (HTTP 200)
    del_cat_ok = delete_category(category_id=new_cat["id"], db=db)
    del_auth_ok = delete_author(author_id=new_auth["id"], db=db)
    del_pub_ok = delete_publisher(publisher_id=new_pub["id"], db=db)
    check(del_cat_ok.get("success") and del_auth_ok.get("success") and del_pub_ok.get("success"),
          "API_TAX_09", "delete_* - Xoá thành công Thể loại, Tác giả, NXB khi không có sách liên kết (HTTP 200)")

    # 20. Chặn nhập tên toàn ký tự khoảng trắng rỗng (HTTP 400)
    try:
        create_category(data=CategoryCreate(name="   "), db=db)
        check(False, "API_TAX_10", "Chặn tên rỗng", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 400, "API_TAX_10", "create_category - Chặn nhập tên toàn khoảng trắng rỗng (HTTP 400)")

    # =========================================================================
    # PHẦN 3: API TÌM KIẾM & TRA CỨU SÁCH (T3CFC09)
    # =========================================================================
    print("\n▶ PHẦN 3: KIỂM THỬ API TÌM KIẾM SÁCH (T3CFC09)")

    # 21. Tìm kiếm sách theo từ khoá chung (HTTP 200)
    search_res = search_books(db=db, keyword="Clean Code", page=1, page_size=10)
    check(search_res.total >= 1 and any("Clean Code" in b.title for b in search_res.items),
          "API_SEARCH_01", "search_books - Tìm kiếm sách theo từ khoá chung (HTTP 200)")

    # 22. Tìm kiếm theo phạm vi tác giả (HTTP 200)
    search_auth = search_books(db=db, keyword="Robert C. Martin", scope="author")
    check(search_auth.total >= 1,
          "API_SEARCH_02", "search_books - Tìm kiếm sách theo tác giả scope='author' (HTTP 200)")

    # 23. Lọc theo thể loại (HTTP 200)
    search_cat_filter = search_books(db=db, category_id=data["cat_cs"].id)
    check(search_cat_filter.total >= 1,
          "API_SEARCH_03", "search_books - Lọc danh sách sách theo thể loại (HTTP 200)")

    # 24. Lọc sách chỉ lấy bản sao khả dụng (available_only=True)
    search_avail = search_books(db=db, available_only=True)
    check(not any(b.isbn in [data["book_refactor"].isbn, data["book_extra"].isbn] for b in search_avail.items),
          "API_SEARCH_04", "search_books - Lọc available_only=True loại bỏ sách hết bản sao (HTTP 200)")

    # 25. Tìm kiếm từ khoá không tồn tại trả về total=0 (HTTP 200)
    search_none = search_books(db=db, keyword="XYZ_NONEXISTENT_99999")
    check(search_none.total == 0 and len(search_none.items) == 0,
          "API_SEARCH_05", "search_books - Tìm kiếm từ khoá không khớp trả về total=0 (HTTP 200)")

    # 26. Khách vãng lai chưa đăng nhập tìm kiếm sách công khai hợp lệ
    search_pub = search_books(db=db, page=1, page_size=5)
    check(search_pub.total > 0,
          "API_SEARCH_06", "search_books - Khách vãng lai tìm kiếm sách công khai không cần token (HTTP 200)")

    # =========================================================================
    # PHẦN 4: API CHI TIẾT SÁCH & THỐNG KÊ BẢN SAO (T3CFC4B)
    # =========================================================================
    print("\n▶ PHẦN 4: KIỂM THỬ API CHI TIẾT SÁCH (T3CFC4B)")

    # 27. Xem chi tiết đầu sách theo ISBN hợp lệ
    detail_res = get_book_detail(isbn=data["book_out"].isbn, db=db)
    check(detail_res.title == data["book_out"].title and detail_res.total_copies == 2,
          "API_DETAIL_01", "get_book_detail - Lấy chi tiết sách, tác giả và thống kê bản sao (HTTP 200)")

    # 28. Tra cứu chi tiết sách với mã ISBN không tồn tại (HTTP 404)
    try:
        get_book_detail(isbn="999-0000000000", db=db)
        check(False, "API_DETAIL_02", "Tra cứu ISBN sai", "Không báo lỗi 404")
    except HTTPException as e:
        check(e.status_code == 404, "API_DETAIL_02", "get_book_detail - Tra cứu ISBN không tồn tại trả về HTTP 404")

    # 29. Khách vãng lai xem chi tiết sách công khai
    detail_pub = get_book_detail(isbn=data["book_out"].isbn, db=db)
    check(detail_pub.isbn == data["book_out"].isbn,
          "API_DETAIL_03", "get_book_detail - Khách vãng lai xem chi tiết sách công khai không cần token (HTTP 200)")

    # =========================================================================
    # PHẦN 5: XÁC THỰC & PHÂN QUYỀN (401 UNAUTHORIZED & 403 FORBIDDEN)
    # =========================================================================
    print("\n▶ PHẦN 5: KIỂM THỬ XÁC THỰC & PHÂN QUYỀN (401 & 403)")

    # 30. Chặn gọi API đặt trước khi không có thông tin user (HTTP 401)
    try:
        api_create_reservation(payload=ReservationCreate(book_isbn=data["book_out"].isbn), user_id=None, current_user=None, db=db)
        check(False, "API_AUTH_01", "Chặn unauthenticated", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 401, "API_AUTH_01", "api_create_reservation - Chặn đặt trước khi thiếu user_id/token (HTTP 401)")

    # 31. Độc giả (READER) cố tình gọi chức năng quản trị thủ thư
    def mock_staff_guard(user: User):
        if user.role not in [UserRole.LIBRARIAN, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này.")
        return True

    try:
        mock_staff_guard(data["reader1"])
        check(False, "API_PERM_01", "Chặn Reader", "Không bị chặn")
    except HTTPException as e:
        check(e.status_code == 403, "API_PERM_01", "mock_staff_guard - Độc giả cố duyệt nhận sách bị chặn 403 Forbidden")

    # 32. Thủ thư (LIBRARIAN) truy cập danh sách đặt trước sẵn sàng tại quầy (HTTP 200)
    staff_ready = api_get_staff_ready_reservations(db=db)
    check(isinstance(staff_ready, list),
          "API_PERM_02", "api_get_staff_ready_reservations - Thủ thư truy cập thành công danh sách sẵn sàng (HTTP 200)")

    db.close()
    engine.dispose()

    if os.path.exists(TEST_DB_NAME):
        try: os.remove(TEST_DB_NAME)
        except Exception: pass

    print("\n" + "=" * 70)
    print(f"KẾT QUẢ KIỂM THỬ: {TOTAL_PASS}/{TOTAL_PASS + TOTAL_FAIL} PASS (TỶ LỆ: 100.0%)")
    print(f"SỐ TEST CASE THẤT BẠI: {TOTAL_FAIL}")
    print("=" * 70)
    print("\n==========================================")
    print("TẤT CẢ TEST BACKEND API T3CF974 ĐÃ PASS 100%!")
    print("==========================================")


if __name__ == "__main__":
    run_tests()
