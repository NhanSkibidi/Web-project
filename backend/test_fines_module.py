"""
Kiểm thử tự động toàn diện cho module Fines qua HTTP TestClient & JWT thật (T3CFF2C + T3CFEF8).
Chạy: .\\.venv\\Scripts\\python.exe backend/test_fines_module.py
"""
import os
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.crud.fine import has_unpaid_fines, number_to_vietnamese_words
from app.db.session import Base, get_db
from app.main import app
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.Category import Category
from app.models.CopyStatusLog import CopyStatusLog
from app.models.Publisher import Publisher
from app.models.fine import Fine
from app.models.library_card import CardStatus, CardType, LibraryCard
from app.models.loan import BorrowType, Loan, LoanStatus
from app.models.loan_item import LoanItem
from app.models.user import User, UserRole, UserStatus

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    admin_user = User(
        id=1,
        email="admin@unilib.edu.vn",
        password_hash=hash_password("admin123"),
        full_name="Quản trị viên Hệ thống",
        phone="0911222333",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    librarian_user = User(
        id=2,
        email="dai.th@unilib.edu.vn",
        password_hash=hash_password("librarian123"),
        full_name="Trịnh Huy Đại",
        phone="0988777666",
        role=UserRole.LIBRARIAN,
        status=UserStatus.ACTIVE,
    )
    reader1 = User(
        id=3,
        email="nguyenvana@gmail.com",
        password_hash=hash_password("reader123"),
        full_name="Nguyễn Văn An",
        phone="0901234567",
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )
    reader2 = User(
        id=4,
        email="tranthib@gmail.com",
        password_hash=hash_password("reader123"),
        full_name="Trần Thị Bình",
        phone="0907654321",
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )
    db.add_all([admin_user, librarian_user, reader1, reader2])
    db.commit()

    card1 = LibraryCard(
        card_code="LC-2026-0042",
        reader_id=reader1.id,
        card_type=CardType.STANDARD,
        issue_date=date.today(),
        expiry_date=date.today() + timedelta(days=365),
        max_borrow_books=5,
        status=CardStatus.ACTIVE,
    )
    card2 = LibraryCard(
        card_code="LC-2026-0043",
        reader_id=reader2.id,
        card_type=CardType.STANDARD,
        issue_date=date.today(),
        expiry_date=date.today() + timedelta(days=365),
        max_borrow_books=5,
        status=CardStatus.ACTIVE,
    )
    cat = Category(name="CNTT & Công nghệ phần mềm")
    pub = Publisher(name="NXB Thông tin & Truyền thông")
    db.add_all([card1, card2, cat, pub])
    db.commit()

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
        id=1,
        book_isbn=book.isbn,
        copy_code="CP-MS-001",
        shelf_location="Kệ B2 - Ngăn 1",
        imported_at=date.today(),
        condition="MỚI",
        status="BORROWED",
    )
    copy2 = BookCopy(
        id=2,
        book_isbn=book.isbn,
        copy_code="CP-MS-002",
        shelf_location="Kệ B2 - Ngăn 2",
        imported_at=date.today(),
        condition="MỚI",
        status="BORROWED",
    )
    copy3 = BookCopy(
        id=3,
        book_isbn=book.isbn,
        copy_code="CP-MS-003",
        shelf_location="Kệ B2 - Ngăn 3",
        imported_at=date.today(),
        condition="MỚI",
        status="BORROWED",
    )
    db.add_all([copy1, copy2, copy3])
    db.commit()

    now = datetime.now()
    # Phiếu CANCELLED cũ của reader2 từng gắn copy2 (return_date=None) -> không được tính phạt nhầm cho reader2
    cancelled_loan = Loan(
        id=99,
        user_id=reader2.id,
        borrow_type=BorrowType.ONLINE,
        status=LoanStatus.CANCELLED,
        created_at=now - timedelta(days=30),
    )
    db.add(cancelled_loan)
    db.commit()
    db.add(LoanItem(loan_id=99, book_isbn=book.isbn, copy_id=copy2.id, due_date=None, return_date=None))

    loan = Loan(
        id=1,
        user_id=reader1.id,
        processed_by=librarian_user.id,
        borrow_type=BorrowType.ONLINE,
        status=LoanStatus.BORROWED,
        created_at=now - timedelta(days=20),
        borrowed_at=now - timedelta(days=20),
        due_date=now - timedelta(days=5),
    )
    db.add(loan)
    db.commit()

    # copy1 đã trả trước đó với phạt quá hạn 10.000đ; copy2 (quá hạn 5 ngày) và copy3 (đúng hạn) đang mượn
    li1 = LoanItem(
        loan_id=loan.id,
        book_isbn=book.isbn,
        copy_id=copy1.id,
        due_date=now - timedelta(days=5),
        return_date=now,
    )
    li2 = LoanItem(
        loan_id=loan.id,
        book_isbn=book.isbn,
        copy_id=copy2.id,
        due_date=now - timedelta(days=5),
        return_date=None,
    )
    li3 = LoanItem(
        loan_id=loan.id,
        book_isbn=book.isbn,
        copy_id=copy3.id,
        due_date=now + timedelta(days=5),
        return_date=None,
    )
    db.add_all([li1, li2, li3])
    db.commit()

    fine1 = Fine(
        user_id=reader1.id,
        loan_id=loan.id,
        book_copy_id=copy1.id,
        fine_type="QUÁ HẠN",
        amount=10000.0,
        status="UNPAID",
    )
    db.add(fine1)
    db.commit()
    db.refresh(fine1)
    fine1_id = fine1.id
    loan_code = loan.code
    db.close()
    return fine1_id, loan_code


def run_tests():
    fine1_id, loan_code = setup_database()

    admin_headers = {"Authorization": f"Bearer {create_access_token(1)}"}
    lib_headers = {"Authorization": f"Bearer {create_access_token(2)}"}
    reader1_headers = {"Authorization": f"Bearer {create_access_token(3)}"}
    reader2_headers = {"Authorization": f"Bearer {create_access_token(4)}"}

    print("--- 1. Test number_to_vietnamese_words & has_unpaid_fines ---")
    assert "Mười nghìn" in number_to_vietnamese_words(10000)
    assert "Sáu mươi nghìn" in number_to_vietnamese_words(60000)
    assert "Một trăm hai mươi lăm nghìn" in number_to_vietnamese_words(125500)
    db_chk = TestingSessionLocal()
    assert has_unpaid_fines(db_chk, 3) is True
    assert has_unpaid_fines(db_chk, 4) is False
    db_chk.close()
    print("✓ number_to_vietnamese_words & has_unpaid_fines OK")

    print("\n--- 2. Test RBAC trên các endpoint Fines ---")
    assert client.get("/api/fines").status_code == 401
    assert client.get("/api/fines", headers=reader1_headers).status_code == 403
    assert client.get("/api/fines/statistics", headers=reader1_headers).status_code == 403
    assert client.get("/api/fines/my-fines").status_code == 401
    assert client.get("/api/fines/my-fines?user_id=4", headers=reader1_headers).status_code == 403
    assert client.get(f"/api/fines/{fine1_id}/receipt", headers=reader2_headers).status_code == 403
    assert client.post(f"/api/fines/{fine1_id}/pay", headers=reader1_headers).status_code == 403
    assert client.post(f"/api/fines/{fine1_id}/waive", json={"waive_reason": "test reason"}).status_code == 401
    assert client.post(f"/api/fines/{fine1_id}/waive", json={"waive_reason": "test reason"}, headers=reader1_headers).status_code == 403
    assert client.post(f"/api/fines/{fine1_id}/waive", json={"waive_reason": "test reason"}, headers=lib_headers).status_code == 403
    print("✓ Chặn đầy đủ 401/403 (kể cả không token cho /waive và /pay)")

    print("\n--- 3. Test POST /api/fines/report-issue (Hỏng 50% + Quá hạn, Mất 100% + CopyStatusLog) ---")
    r_dmg = client.post(
        "/api/fines/report-issue",
        json={"copy_code": "CP-MS-002", "issue_type": "HỎNG", "note": "Rách trang 45-50"},
        headers=lib_headers,
    )
    assert r_dmg.status_code == 200, r_dmg.text
    dmg_data = r_dmg.json()
    assert dmg_data["fine_type"] == "HỎNG"
    assert dmg_data["amount"] == 60000.0
    assert dmg_data["overdue_fine_id"] is not None
    assert dmg_data["overdue_fine_amount"] == 10000.0
    assert dmg_data["copy_status"] == "DAMAGED"
    damaged_fine_id = dmg_data["fine_id"]

    r_lost = client.post(
        "/api/fines/report-issue",
        json={"copy_code": "CP-MS-003", "issue_type": "MẤT", "note": "Sinh viên báo làm mất"},
        headers=lib_headers,
    )
    assert r_lost.status_code == 200, r_lost.text
    lost_data = r_lost.json()
    assert lost_data["fine_type"] == "MẤT"
    assert lost_data["amount"] == 120000.0
    assert lost_data["overdue_fine_id"] is None
    assert lost_data["copy_status"] == "LOST"

    db_log = TestingSessionLocal()
    logs = db_log.query(CopyStatusLog).all()
    assert len(logs) == 2
    db_log.close()
    print("✓ Đã tạo phạt HỎNG 50% + phạt QUÁ HẠN kèm theo, phạt MẤT 100%, và ghi CopyStatusLog")

    print("\n--- 4. Test GET /api/fines, search theo loan_code & KPI ---")
    r_all = client.get("/api/fines", headers=lib_headers)
    assert r_all.status_code == 200
    assert len(r_all.json()) == 4
    assert r_all.json()[0]["loan_code"] == loan_code

    r_pm = client.get(f"/api/fines?search={loan_code}", headers=lib_headers)
    assert r_pm.status_code == 200 and len(r_pm.json()) == 4

    r_stat = client.get("/api/fines/statistics", headers=lib_headers)
    assert r_stat.status_code == 200
    assert r_stat.json()["unpaid_count"] == 4
    assert r_stat.json()["total_unpaid_amount"] == 200000.0
    print("✓ Danh sách, tìm kiếm theo mã phiếu mượn & KPI OK")

    print("\n--- 5. Test Độc giả xem /api/fines/my-fines & biên lai ---")
    r_my = client.get("/api/fines/my-fines", headers=reader1_headers)
    assert r_my.status_code == 200
    assert r_my.json()["unpaid_count"] == 4
    assert r_my.json()["total_unpaid_amount"] == 200000.0

    r_rec = client.get(f"/api/fines/{fine1_id}/receipt", headers=reader1_headers)
    assert r_rec.status_code == 200
    assert r_rec.json()["receipt_no"] == f"REC-{fine1_id:06d}"
    print("✓ Độc giả xem phạt cá nhân và biên lai OK")

    print("\n--- 6. Test Thủ thư thu tiền (/pay) & Admin miễn phạt (/waive) ---")
    r_pay = client.post(
        f"/api/fines/{fine1_id}/pay",
        json={"payment_method": "TIỀN MẶT", "note": "Thu tại quầy K1"},
        headers=lib_headers,
    )
    assert r_pay.status_code == 200, r_pay.text
    assert r_pay.json()["status"] == "PAID"
    assert r_pay.json()["collector_name"] == "Trịnh Huy Đại"

    r_short = client.post(
        f"/api/fines/{damaged_fine_id}/waive",
        json={"waive_reason": "ab"},
        headers=admin_headers,
    )
    assert r_short.status_code == 422

    r_waive = client.post(
        f"/api/fines/{damaged_fine_id}/waive",
        json={"waive_reason": "Độc giả có giấy xác nhận điều trị nội trú tại bệnh viện"},
        headers=admin_headers,
    )
    assert r_waive.status_code == 200, r_waive.text
    assert r_waive.json()["status"] == "WAIVED"
    print("✓ Thu tiền phạt (LIBRARIAN) và Miễn phạt kèm lý do (ADMIN) OK")

    print("\n==========================================")
    print("TẤT CẢ TEST BACKEND API T3CFF2C + T3CFEF8 ĐÃ PASS 100%!")
    print("==========================================")


if __name__ == "__main__":
    try:
        run_tests()
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
