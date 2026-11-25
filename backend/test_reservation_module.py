# -*- coding: utf-8 -*-
"""
Kiểm thử tự động toàn diện cho Module Đặt trước và Danh mục sách:
  1. Đặt trước sách khi hết (Reservation)
  2. Quản lý Thể loại, Tác giả, Nhà xuất bản (Taxonomy)
  3. Tìm kiếm & lọc sách (Book Search)
  4. Chi tiết sách & thống kê bản sao (Book Detail)

Chạy: python test_reservation_module.py
"""
import os
import sys
from datetime import date, datetime, timedelta

# Patch Python 3.14 & multipart
import sqlalchemy.util.typing as sa_typing
sa_typing.make_union_type = lambda *t: t[0] if len(t) == 1 else t[0] | t[1]
import fastapi.dependencies.utils as f_utils
f_utils.ensure_multipart_is_installed = lambda: None

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
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

from app.schemas.reservation import ReservationCreate
from app.schemas.taxonomy import CategoryCreate, CategoryUpdate, AuthorCreate, PublisherCreate
from app.routers.reservation import (
    api_create_reservation, api_get_my_reservations, api_cancel_reservation,
    api_check_expired_reservations,
)
from app.routers.taxonomy import (
    create_category, get_categories, update_category, delete_category,
    create_author, delete_author, create_publisher, delete_publisher,
)
from app.routers.book import search_books, get_book_detail
from app.crud import reservation as crud_res

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = Session()

    # 1. Users
    u_admin = User(id=1, email="admin@ks25.edu.vn", password_hash=hash_password("123"), full_name="Admin", role=UserRole.ADMIN, status=UserStatus.ACTIVE)
    u_lib = User(id=2, email="lib@ks25.edu.vn", password_hash=hash_password("123"), full_name="Thủ thư", role=UserRole.LIBRARIAN, status=UserStatus.ACTIVE)
    r1 = User(id=3, email="r1@ks25.edu.vn", password_hash=hash_password("123"), full_name="Nhật Anh", role=UserRole.READER, status=UserStatus.ACTIVE)
    r2 = User(id=4, email="r2@ks25.edu.vn", password_hash=hash_password("123"), full_name="Huy Đại", role=UserRole.READER, status=UserStatus.ACTIVE)
    r3 = User(id=5, email="r3@ks25.edu.vn", password_hash=hash_password("123"), full_name="Thiện Nhân", role=UserRole.READER, status=UserStatus.ACTIVE)
    db.add_all([u_admin, u_lib, r1, r2, r3]); db.commit()

    # 2. Taxonomy
    cat_it = Category(id=1, name="Công nghệ Thông tin", description="Sách CNTT")
    cat_eco = Category(id=2, name="Kinh tế Học", description="Sách Kinh tế")
    auth_bob = Author(id=1, name="Robert C. Martin", nationality="Mỹ")
    auth_anh = Author(id=2, name="Nguyễn Nhật Ánh", nationality="Việt Nam")
    pub_tt = Publisher(id=1, name="NXB Thông Tin", address="Hà Nội")
    pub_tre = Publisher(id=2, name="NXB Trẻ", address="TP.HCM")
    db.add_all([cat_it, cat_eco, auth_bob, auth_anh, pub_tt, pub_tre]); db.commit()

    # 3. Books & Copies
    b_out = Book(isbn="978-01", title="Clean Code", category_id=1, publisher_id=1, price=350000.0)
    b_avail = Book(isbn="978-02", title="Cho Tôi Xin Một Vé", category_id=2, publisher_id=2, price=95000.0)
    b_ref = Book(isbn="978-03", title="Refactoring", category_id=1, publisher_id=1, price=420000.0)
    b_arch = Book(isbn="978-04", title="Clean Architecture", category_id=1, publisher_id=1, price=380000.0)
    db.add_all([b_out, b_avail, b_ref, b_arch]); db.commit()

    db.add_all([BookAuthor(book_isbn="978-01", author_id=1), BookAuthor(book_isbn="978-02", author_id=2)])
    today = date.today()
    c1 = BookCopy(id=1, book_isbn="978-01", copy_code="CC-1", shelf_location="Kệ A1", imported_at=today, status="BORROWED")
    c2 = BookCopy(id=2, book_isbn="978-01", copy_code="CC-2", shelf_location="Kệ A1", imported_at=today, status="BORROWED")
    c3 = BookCopy(id=3, book_isbn="978-02", copy_code="TT-1", shelf_location="Kệ B1", imported_at=today, status="AVAILABLE")
    c4 = BookCopy(id=4, book_isbn="978-03", copy_code="RF-1", shelf_location="Kệ A2", imported_at=today, status="BORROWED")
    c5 = BookCopy(id=5, book_isbn="978-04", copy_code="CA-1", shelf_location="Kệ A2", imported_at=today, status="BORROWED")
    db.add_all([c1, c2, c3, c4, c5]); db.commit()

    return db, {"admin": u_admin, "lib": u_lib, "r1": r1, "r2": r2, "r3": r3, "c1": c1}


def test_reservation_module(db, users):
    print("\n--- 1. TEST MODULE ĐẶT TRƯỚC SÁCH (T3CFCAC) ---")

    # 1.1 Đặt trước thành công khi hết sách (WAITING, Vị trí 1)
    res1 = api_create_reservation(payload=ReservationCreate(book_isbn="978-01"), user_id=users["r1"].id, current_user=None, db=db)
    assert res1["status"] == "WAITING" and res1["queue_position"] == 1
    print("✓ Đặt trước thành công khi hết sách: Status=WAITING, Vị trí #1")

    # 1.2 Hàng chờ FIFO: Độc giả 2 đặt cùng sách -> Vị trí 2
    res2 = api_create_reservation(payload=ReservationCreate(book_isbn="978-01"), user_id=users["r2"].id, current_user=None, db=db)
    assert res2["queue_position"] == 2
    print("✓ Xếp hàng FIFO: Độc giả 2 tự động vào vị trí #2")

    # 1.3 Lấy danh sách đặt trước cá nhân
    my_res = api_get_my_reservations(user_id=users["r1"].id, current_user=None, db=db)
    assert len(my_res) >= 1 and my_res[0]["book_isbn"] == "978-01"
    print("✓ Lấy danh sách đặt trước cá nhân thành công:", len(my_res), "đơn")

    # 1.4 Trả sách -> Người đầu chuyển READY, copy chuyển RESERVED giữ 2 ngày
    users["c1"].status = "AVAILABLE"
    crud_res.assign_copy_to_next_waiting_reservation_in_tx(db, users["c1"]); db.commit()
    r1_db = db.query(Reservation).filter(Reservation.id == res1["id"]).first()
    db.refresh(r1_db); db.refresh(users["c1"])
    assert r1_db.status == "READY" and users["c1"].status == "RESERVED" and r1_db.pickup_deadline is not None
    print("✓ Trả sách: Đơn #1 chuyển READY, sách giữ RESERVED 2 ngày")

    # 1.5 Quá hạn 2 ngày -> Tự chuyển EXPIRED và nhường cho người tiếp theo
    r1_db.pickup_deadline = datetime.now() - timedelta(hours=1); db.commit()
    api_check_expired_reservations(db=db)
    r2_db = db.query(Reservation).filter(Reservation.id == res2["id"]).first()
    db.refresh(r1_db); db.refresh(r2_db)
    assert r1_db.status == "EXPIRED" and r2_db.status == "READY"
    print("✓ Quá hạn 2 ngày: Đơn #1 thành EXPIRED, đơn #2 tự chuyển sang READY")

    # 1.6 Huỷ đặt trước -> CANCELLED, sách hoàn AVAILABLE
    cancel_res = api_cancel_reservation(reservation_id=r2_db.id, user_id=users["r2"].id, current_user=None, db=db)
    db.refresh(users["c1"])
    assert cancel_res["status"] == "CANCELLED" and users["c1"].status == "AVAILABLE"
    print("✓ Huỷ đặt trước thành công: Status=CANCELLED, sách hoàn AVAILABLE")

    # 1.7 Chặn đặt trước khi sách còn bản sao (400)
    try:
        api_create_reservation(payload=ReservationCreate(book_isbn="978-02"), user_id=users["r1"].id, current_user=None, db=db)
        assert False
    except HTTPException as e:
        assert e.status_code == 400
        print("✓ Chặn đặt khi sách còn sẵn thành công (HTTP 400):", e.detail)

    # 1.8 Chặn đặt trùng cuốn sách (400)
    users["c1"].status = "BORROWED"; db.commit()
    api_create_reservation(payload=ReservationCreate(book_isbn="978-01"), user_id=users["r3"].id, current_user=None, db=db)
    try:
        api_create_reservation(payload=ReservationCreate(book_isbn="978-01"), user_id=users["r3"].id, current_user=None, db=db)
        assert False
    except HTTPException as e:
        assert e.status_code == 400
        print("✓ Chặn đặt trước trùng lặp thành công (HTTP 400):", e.detail)

    # 1.9 Chặn vượt hạn mức 3 cuốn (400)
    api_create_reservation(payload=ReservationCreate(book_isbn="978-03"), user_id=users["r3"].id, current_user=None, db=db)
    api_create_reservation(payload=ReservationCreate(book_isbn="978-04"), user_id=users["r3"].id, current_user=None, db=db)
    b5 = Book(isbn="978-05", title="Book 5", category_id=1, publisher_id=1); db.add(b5); db.flush()
    db.add(BookCopy(id=6, book_isbn="978-05", copy_code="B5-1", shelf_location="Kệ C1", imported_at=date.today(), status="BORROWED")); db.commit()
    try:
        api_create_reservation(payload=ReservationCreate(book_isbn="978-05"), user_id=users["r3"].id, current_user=None, db=db)
        assert False
    except HTTPException as e:
        assert e.status_code == 400
        print("✓ Chặn vượt quá quota 3 cuốn thành công (HTTP 400):", e.detail)

    # 1.10 ISBN không tồn tại (404) & Chưa đăng nhập (401)
    try:
        api_create_reservation(payload=ReservationCreate(book_isbn="000-00"), user_id=users["r1"].id, current_user=None, db=db)
        assert False
    except HTTPException as e:
        assert e.status_code == 404
        print("✓ Chặn ISBN không tồn tại thành công (HTTP 404)")

    try:
        api_create_reservation(payload=ReservationCreate(book_isbn="978-01"), user_id=None, current_user=None, db=db)
        assert False
    except HTTPException as e:
        assert e.status_code == 401
        print("✓ Chặn chưa đăng nhập thành công (HTTP 401)")


def test_taxonomy_module(db):
    print("\n--- 2. TEST MODULE QUẢN LÝ DANH MỤC (T3CFCC6) ---")

    # 2.1 Thêm mới Thể loại, Tác giả, NXB (201)
    new_cat = create_category(data=CategoryCreate(name="Trí Tuệ Nhân Tạo", description="Sách AI"), db=db)
    new_auth = create_author(data=AuthorCreate(name="Andrew Ng", nationality="Mỹ"), db=db)
    new_pub = create_publisher(data=PublisherCreate(name="NXB Kim Đồng", address="Hà Nội"), db=db)
    assert new_cat["id"] and new_auth["id"] and new_pub["id"]
    print("✓ Thêm mới Thể loại, Tác giả, NXB thành công (HTTP 201)")

    # 2.2 Chặn trùng tên thể loại (400)
    try:
        create_category(data=CategoryCreate(name="trí tuệ nhân tạo"), db=db)
        assert False
    except HTTPException as e:
        assert e.status_code == 400
        print("✓ Chặn trùng tên thể loại thành công (HTTP 400)")

    # 2.3 Tìm kiếm & phân trang
    search_cat = get_categories(search="Nhân Tạo", page=1, page_size=10, db=db)
    assert search_cat["total"] == 1 and search_cat["items"][0]["name"] == "Trí Tuệ Nhân Tạo"
    print("✓ Tìm kiếm & phân trang danh mục thành công (Total: 1)")

    # 2.4 Chặn sửa trùng tên thể loại khác (400)
    try:
        update_category(category_id=2, data=CategoryUpdate(name="Công nghệ Thông tin"), db=db)
        assert False
    except HTTPException as e:
        assert e.status_code == 400
        print("✓ Chặn đổi sửa trùng tên thể loại khác thành công (HTTP 400)")

    # 2.5 Chặn xoá Thể loại / Tác giả / NXB khi còn sách liên kết (400)
    for func, target_id in [(delete_category, 1), (delete_author, 1), (delete_publisher, 1)]:
        try:
            func(target_id, db=db)
            assert False
        except HTTPException as e:
            assert e.status_code == 400 and "Không thể xoá" in str(e.detail)
    print("✓ Chặn xoá Thể loại, Tác giả, NXB khi còn sách liên kết thành công (HTTP 400)")

    # 2.6 Xoá thành công khi không còn sách liên kết & Chặn tên rỗng
    assert delete_category(new_cat["id"], db=db)["success"]
    assert delete_author(new_auth["id"], db=db)["success"]
    assert delete_publisher(new_pub["id"], db=db)["success"]
    print("✓ Xoá thành công danh mục khi không có sách liên kết (HTTP 200)")

    try:
        create_category(data=CategoryCreate(name="   "), db=db)
        assert False
    except HTTPException as e:
        assert e.status_code == 400
        print("✓ Chặn nhập tên rỗng khoảng trắng thành công (HTTP 400)")


def test_book_search_and_detail(db):
    print("\n--- 3. TEST MODULE TÌM KIẾM & CHI TIẾT SÁCH (T3CFC09 & T3CFC4B) ---")

    # Helper gọi an toàn cho router search
    def call_search(**kwargs):
        defaults = dict(keyword=None, scope="all", category_id=None, category_ids=None,
                        author_id=None, publisher_id=None, publish_year=None,
                        languages=None, shelf_locations=None, available_only=False,
                        sort_by="created_at", sort_order="desc", page=1, page_size=10)
        defaults.update(kwargs)
        return search_books(db=db, **defaults)

    # 3.1 Tìm kiếm theo từ khoá chung & theo tác giả
    s1 = call_search(keyword="Clean Code")
    assert s1.total >= 1 and any("Clean Code" in b.title for b in s1.items)
    s2 = call_search(keyword="Robert C. Martin", scope="author")
    assert s2.total >= 1
    print("✓ Tìm kiếm theo từ khoá chung & phạm vi tác giả thành công")

    # 3.2 Lọc theo thể loại & lọc available_only
    s3 = call_search(category_id=1)
    assert s3.total >= 1
    s4 = call_search(available_only=True)
    assert not any(b.isbn in ["978-03", "978-04"] for b in s4.items)
    print("✓ Lọc theo thể loại & available_only thành công")

    # 3.3 Tìm từ khoá không khớp & Truy cập công khai
    assert call_search(keyword="XYZ_NONEXISTENT").total == 0
    assert call_search(page=1, page_size=5).total > 0
    print("✓ Xử lý từ khoá không khớp & truy cập công khai thành công")

    # 3.4 Chi tiết sách & ISBN không tồn tại
    d1 = get_book_detail(isbn="978-01", db=db)
    assert d1.title == "Clean Code" and d1.total_copies == 2
    try:
        get_book_detail(isbn="999-99", db=db)
        assert False
    except HTTPException as e:
        assert e.status_code == 404
    print("✓ Xem chi tiết sách & chặn ISBN không tồn tại thành công (HTTP 200 / 404)")


if __name__ == "__main__":
    db, users = setup_db()
    test_reservation_module(db, users)
    test_taxonomy_module(db)
    test_book_search_and_detail(db)
    db.close()
    engine.dispose()
    print("\n==========================================")
    print("✓ TẤT CẢ TEST API MODULE ĐÃ PASS 100%!")
    print("==========================================")
