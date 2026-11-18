"""Kiểm thử tự động toàn diện cho module Fines (T3CFF2C) không cần httpx."""
import os
import sys

sys.path.insert(0, os.path.abspath("backend"))
os.environ["DATABASE_URL"] = "sqlite:///./test_fines.db"

from datetime import datetime, date, timedelta
from app.db.session import Base, engine, SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.library_card import LibraryCard, CardType, CardStatus
from app.models.Category import Category
from app.models.Publisher import Publisher
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.loan import Loan
from app.models.loan_item import LoanItem
from app.models.fine import Fine
from app.core.security import hash_password
from app.schemas.fine import FinePayRequest, FineWaiveRequest
from app.crud.fine import (
    number_to_vietnamese_words,
    list_fines_detailed,
    get_fine_detail,
    get_fine_statistics,
    generate_fine_receipt,
    get_my_fines,
)
from app.routers.fine import (
    get_all_fines,
    get_fines_kpi_statistics,
    get_reader_my_fines,
    pay_user_fine,
    waive_user_fine,
    get_fine_receipt_data,
)
from fastapi import HTTPException

# Tạo schema trên SQLite
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# 1. Tạo Users: Admin, Librarian, Reader
admin_user = User(
    email="admin@unilib.edu.vn",
    password_hash=hash_password("admin123"),
    full_name="Quản trị viên Hệ thống",
    phone="0911222333",
    role=UserRole.ADMIN,
    status=UserStatus.ACTIVE,
)
librarian_user = User(
    email="dai.th@unilib.edu.vn",
    password_hash=hash_password("librarian123"),
    full_name="Trịnh Huy Đại",
    phone="0988777666",
    role=UserRole.LIBRARIAN,
    status=UserStatus.ACTIVE,
)
reader_user = User(
    email="nguyenvana@gmail.com",
    password_hash=hash_password("reader123"),
    full_name="Nguyễn Văn An",
    phone="0901234567",
    role=UserRole.READER,
    status=UserStatus.ACTIVE,
)
db.add_all([admin_user, librarian_user, reader_user])
db.commit()

# Thẻ thư viện cho độc giả
card = LibraryCard(
    card_code="LC-2026-0042",
    reader_id=reader_user.id,
    card_type=CardType.STANDARD,
    issue_date=date.today(),
    expiry_date=date.today() + timedelta(days=365),
    max_borrow_books=5,
    status=CardStatus.ACTIVE,
)
db.add(card)

cat = Category(name="CNTT & Công nghệ phần mềm")
pub = Publisher(name="NXB Thông tin & Truyền thông")
db.add_all([cat, pub])
db.commit()

# Sách và bản sao
book = Book(
    isbn="978-604-0-12345-6",
    title="Thiết kế Kiến trúc Microservices Hiện đại",
    category_id=cat.id,
    publisher_id=pub.id,
    price=120000.0,
    publish_year=2024,
)
db.add(book)
db.commit()

copy1 = BookCopy(
    book_isbn=book.isbn,
    copy_code="CP-MS-001",
    shelf_location="Kệ B2 - Ngăn 1",
    imported_at=date.today(),
    condition="MỚI",
    status="BORROWED",
)
copy2 = BookCopy(
    book_isbn=book.isbn,
    copy_code="CP-MS-002",
    shelf_location="Kệ B2 - Ngăn 2",
    imported_at=date.today(),
    condition="MỚI",
    status="AVAILABLE",
)
db.add_all([copy1, copy2])
db.commit()

# Phiếu mượn
loan = Loan(
    user_id=reader_user.id,
    processed_by=librarian_user.id,
    borrow_type="ONLINE",
    status="BORROWED",
    borrowed_at=datetime.now() - timedelta(days=20),
    due_date=datetime.now() - timedelta(days=5),
)
db.add(loan)
db.commit()

loan_item = LoanItem(
    loan_id=loan.id,
    book_isbn=book.isbn,
    copy_id=copy1.id,
    due_date=datetime.now() - timedelta(days=5),
)
db.add(loan_item)
db.commit()

# Khoản phạt 1: Quá hạn 5 ngày = 10.000đ
fine1 = Fine(
    user_id=reader_user.id,
    loan_id=loan.id,
    book_copy_id=copy1.id,
    fine_type="QUÁ HẠN",
    amount=10000.0,
    status="UNPAID",
)
# Khoản phạt 2: Hỏng sách 50% = 60.000đ
fine2 = Fine(
    user_id=reader_user.id,
    loan_id=loan.id,
    book_copy_id=copy2.id,
    fine_type="HỎNG",
    amount=60000.0,
    status="UNPAID",
)
db.add_all([fine1, fine2])
db.commit()

print("--- 1. Test Number to Vietnamese Words ---")
w1 = number_to_vietnamese_words(10000)
w2 = number_to_vietnamese_words(60000)
w3 = number_to_vietnamese_words(125500)
print("10.000 ->", w1)
print("60.000 ->", w2)
print("125.500 ->", w3)
assert "Mười nghìn" in w1

print("\n--- 2. Test get_all_fines (Danh sách chi tiết) ---")
all_fines = get_all_fines(db=db)
assert len(all_fines) == 2
print(f"Tổng số khoản phạt nhận được: {len(all_fines)}")
assert all_fines[0]["user_name"] == "Nguyễn Văn An"
assert all_fines[0]["card_code"] == "LC-2026-0042"
assert all_fines[0]["book_title"] == "Thiết kế Kiến trúc Microservices Hiện đại"
print("✓ Fields kiểm tra đầy đủ:", all_fines[0]["copy_code"], all_fines[0]["amount"], all_fines[0]["status"])

print("\n--- 3. Test Lọc và Tìm kiếm ---")
res_search = get_all_fines(search="Nguyễn", db=db)
assert len(res_search) == 2
res_type = get_all_fines(fine_type="HỎNG", db=db)
assert len(res_type) == 1
assert res_type[0]["fine_type"] == "HỎNG"
print("✓ Tìm kiếm theo từ khóa và lọc loại phạt hoạt động chuẩn xác")

print("\n--- 4. Test get_fines_kpi_statistics (KPI Dashboard) ---")
stat = get_fines_kpi_statistics(db=db)
print("Thống kê KPI:", stat)
assert stat["total_fines_count"] == 2
assert stat["unpaid_count"] == 2
assert stat["total_unpaid_amount"] == 70000.0

print("\n--- 5. Test get_reader_my_fines (Độc giả xem phạt cá nhân) ---")
my_data = get_reader_my_fines(user_id=reader_user.id, current_user=reader_user, db=db)
print("Khoản phạt cá nhân:", my_data["user_name"], "- Số tiền nợ:", my_data["total_unpaid_amount"])
assert my_data["user_id"] == reader_user.id
assert len(my_data["fines"]) == 2

print("\n--- 6. Test pay_user_fine (Thủ thư thu tiền phạt) ---")
paid_fine = pay_user_fine(
    fine_id=fine1.id,
    payload=FinePayRequest(payment_method="TIỀN MẶT", note="Thu trực tiếp tại quầy K1"),
    current_user=librarian_user,
    db=db,
)
assert paid_fine["status"] == "PAID"
assert paid_fine["collector_name"] == "Trịnh Huy Đại"
print("✓ Thu tiền phạt thành công:", paid_fine["id"], paid_fine["status"], paid_fine["collector_name"])

print("\n--- 7. Test get_fine_receipt_data (In biên lai thu tiền) ---")
receipt = get_fine_receipt_data(fine_id=fine1.id, db=db)
print("Biên lai phát hành:", receipt["receipt_no"])
print("Độc giả:", receipt["reader_name"], "- Mã thẻ:", receipt["reader_card_code"])
print("Số tiền:", receipt["amount"], "VNĐ - Bằng chữ:", receipt["amount_in_words"])
assert receipt["receipt_no"] == f"REC-{fine1.id:06d}"
assert "Mười nghìn" in receipt["amount_in_words"]
assert receipt["collector_name"] == "Trịnh Huy Đại"

print("\n--- 8. Test waive_user_fine (Admin miễn phạt kèm lý do) ---")
# Thử dùng user reader để miễn phạt -> Phải bị từ chối 403 Forbidden
try:
    waive_user_fine(
        fine_id=fine2.id,
        payload=FineWaiveRequest(waive_reason="Lý do cá nhân"),
        current_user=reader_user,
        db=db,
    )
    assert False, "Cần phải chặn Reader miễn phạt"
except HTTPException as e:
    assert e.status_code == 403
    print("✓ Chặn quyền reader thành công:", e.detail)

# Miễn phạt thành công bởi Admin
waived_fine = waive_user_fine(
    fine_id=fine2.id,
    payload=FineWaiveRequest(waive_reason="Độc giả có giấy xác nhận điều trị nội trú tại bệnh viện"),
    current_user=admin_user,
    db=db,
)
assert waived_fine["status"] == "WAIVED"
assert "bệnh viện" in waived_fine["waive_reason"]
print("✓ Admin miễn phạt kèm lý do thành công:", waived_fine["status"], "-", waived_fine["waive_reason"])

db.close()
engine.dispose()
if os.path.exists("test_fines.db"):
    try:
        os.remove("test_fines.db")
    except Exception:
        pass

print("\n==========================================")
print("TẤT CẢ TEST BACKEND API T3CFF2C ĐÃ PASS 100%!")
print("==========================================")
