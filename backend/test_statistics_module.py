r"""
Kiểm thử tự động cho Task T3CFF62: [Thống kê] Dashboard thống kê thư viện.
Chạy: .\.venv\Scripts\python.exe backend/test_statistics_module.py
"""
import os
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.session import Base, get_db
from app.main import app
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.Category import Category
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

    u1 = User(id=1, email="sv1@ks25.edu.vn", password_hash="x", full_name="Nguyễn Văn An", role=UserRole.READER, status=UserStatus.ACTIVE)
    u2 = User(id=2, email="sv2@ks25.edu.vn", password_hash="x", full_name="Trần Thị Bình", role=UserRole.READER, status=UserStatus.ACTIVE)
    u_lib = User(id=10, email="lib@ks25.edu.vn", password_hash="x", full_name="Thủ thư Trực quầy", role=UserRole.LIBRARIAN, status=UserStatus.ACTIVE)
    db.add_all([u1, u2, u_lib])
    db.commit()

    c1 = LibraryCard(card_code="LC-001", reader_id=1, card_type=CardType.STUDENT, issue_date=date.today() - timedelta(days=30), expiry_date=date.today() + timedelta(days=300), status=CardStatus.ACTIVE)
    c2 = LibraryCard(card_code="LC-002", reader_id=2, card_type=CardType.STUDENT, issue_date=date.today() - timedelta(days=30), expiry_date=date.today() + timedelta(days=300), status=CardStatus.ACTIVE)
    cat_it = Category(id=1, name="Công nghệ Thông tin")
    cat_eco = Category(id=2, name="Kinh tế & Quản trị")
    pub = Publisher(id=1, name="NXB Giáo dục")
    db.add_all([c1, c2, cat_it, cat_eco, pub])
    db.commit()

    b1 = Book(isbn="ISBN-IT-1", title="Cấu trúc Dữ liệu & Giải thuật", category_id=1, publisher_id=1, price=120000.0)
    b2 = Book(isbn="ISBN-IT-2", title="Clean Architecture", category_id=1, publisher_id=1, price=180000.0)
    b3 = Book(isbn="ISBN-ECO-1", title="Marketing Căn bản", category_id=2, publisher_id=1, price=95000.0)
    db.add_all([b1, b2, b3])
    db.commit()

    cp1 = BookCopy(id=1, book_isbn="ISBN-IT-1", copy_code="CP-IT-1A", shelf_location="Kệ A1", imported_at=date.today(), condition="MỚI", status="BORROWED")
    cp2 = BookCopy(id=2, book_isbn="ISBN-IT-1", copy_code="CP-IT-1B", shelf_location="Kệ A1", imported_at=date.today(), condition="MỚI", status="AVAILABLE")
    cp3 = BookCopy(id=3, book_isbn="ISBN-IT-2", copy_code="CP-IT-2A", shelf_location="Kệ A2", imported_at=date.today(), condition="MỚI", status="AVAILABLE")
    cp4 = BookCopy(id=4, book_isbn="ISBN-ECO-1", copy_code="CP-ECO-1A", shelf_location="Kệ B1", imported_at=date.today(), condition="MỚI", status="DAMAGED")
    db.add_all([cp1, cp2, cp3, cp4])
    db.commit()

    now = datetime.now()

    # Loan 1: Mượn 10 ngày trước, đã trả 2 ngày trước (sách b1)
    l1 = Loan(id=1, user_id=1, borrow_type=BorrowType.ONLINE, status=LoanStatus.RETURNED, created_at=now - timedelta(days=10), borrowed_at=now - timedelta(days=10), due_date=now + timedelta(days=4))
    db.add(l1)
    db.flush()
    db.add(LoanItem(id=1, loan_id=1, book_isbn="ISBN-IT-1", copy_id=2, due_date=now + timedelta(days=4), return_date=now - timedelta(days=2)))

    # Loan 2: Mượn 20 ngày trước, quá hạn 6 ngày, chưa trả (sách b1)
    l2 = Loan(id=2, user_id=2, borrow_type=BorrowType.WALK_IN, status=LoanStatus.BORROWED, created_at=now - timedelta(days=20), borrowed_at=now - timedelta(days=20), due_date=now - timedelta(days=6))
    db.add(l2)
    db.flush()
    db.add(LoanItem(id=2, loan_id=2, book_isbn="ISBN-IT-1", copy_id=1, due_date=now - timedelta(days=6), return_date=None))

    # Loan 3: Mượn hôm nay (sách b3)
    l3 = Loan(id=3, user_id=1, borrow_type=BorrowType.WALK_IN, status=LoanStatus.BORROWED, created_at=now, borrowed_at=now, due_date=now + timedelta(days=14))
    db.add(l3)
    db.flush()
    db.add(LoanItem(id=3, loan_id=3, book_isbn="ISBN-ECO-1", copy_id=4, due_date=now + timedelta(days=14), return_date=None))

    # Tiền phạt: 1 khoản PAID 50.000đ thu hôm nay, 1 khoản UNPAID 24.000đ
    f1 = Fine(user_id=1, loan_id=1, book_copy_id=2, fine_type="QUÁ HẠN", amount=50000.0, status="PAID", collected_at=now)
    f2 = Fine(user_id=2, loan_id=2, book_copy_id=1, fine_type="HỎNG", amount=24000.0, status="UNPAID")
    db.add_all([f1, f2])
    db.commit()
    db.close()


LIB_HEADERS = {}
READER_HEADERS = {}


def init_auth_headers():
    global LIB_HEADERS, READER_HEADERS
    LIB_HEADERS = {"Authorization": f"Bearer {create_access_token(10)}"}
    READER_HEADERS = {"Authorization": f"Bearer {create_access_token(1)}"}


def test_rbac_enforcement():
    print("[TEST 0] RBAC: Chưa đăng nhập -> 401; READER -> 403 ...")
    assert client.get("/api/statistics/dashboard?period=month").status_code == 401
    assert client.get("/api/statistics/dashboard?period=month", headers=READER_HEADERS).status_code == 403
    assert client.get("/api/statistics/borrowing-trend?period=week", headers=READER_HEADERS).status_code == 403
    print(" -> PASSED (401/403 enforced)!")


def test_dashboard_endpoint():
    print("[TEST 1] GET /api/statistics/dashboard?period=month&group_by=day ...")
    res = client.get("/api/statistics/dashboard?period=month&group_by=day", headers=LIB_HEADERS)
    assert res.status_code == 200, res.text
    data = res.json()

    s = data["summary"]
    assert s["total_books"] == 3
    assert s["total_copies"] == 4
    assert s["available_copies"] == 2
    assert s["borrowed_copies"] == 1
    assert s["damaged_or_lost_copies"] == 1
    assert s["loans_in_period"] == 3
    assert s["overdue_books_count"] == 1
    assert s["collected_fines_amount"] == 50000.0
    assert s["collected_fines_count"] == 1
    assert s["unpaid_fines_amount"] == 24000.0

    # Top books: ISBN-IT-1 có 2 lượt mượn -> xếp #1
    top = data["top_borrowed_books"]
    assert len(top) >= 2
    assert top[0]["isbn"] == "ISBN-IT-1"
    assert top[0]["borrow_count"] == 2

    # Popular categories: Công nghệ Thông tin xếp #1 với 2 lượt mượn
    cats = data["popular_categories"]
    assert cats[0]["category_name"] == "Công nghệ Thông tin"
    assert cats[0]["borrow_count"] == 2

    # Trend theo ngày: 30 điểm
    assert len(data["borrowing_trend"]) == 30
    assert sum(p["borrow_count"] for p in data["borrowing_trend"]) == 3
    assert sum(p["fine_collected"] for p in data["borrowing_trend"]) == 50000.0
    print(" -> PASSED!")


def test_group_by_month_and_custom_range():
    print("[TEST 2] GET /api/statistics/dashboard (custom start_date/end_date & group_by=month) ...")
    start = (date.today() - timedelta(days=60)).isoformat()
    end = date.today().isoformat()
    res = client.get(
        f"/api/statistics/dashboard?start_date={start}&end_date={end}&group_by=month",
        headers=LIB_HEADERS,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["group_by"] == "month"
    assert len(data["borrowing_trend"]) >= 2
    assert sum(p["borrow_count"] for p in data["borrowing_trend"]) == 3
    print(" -> PASSED!")


def test_invalid_date_range():
    print("[TEST 3] GET /api/statistics/dashboard với start_date > end_date -> 400 ...")
    res = client.get(
        "/api/statistics/dashboard?start_date=2026-12-31&end_date=2026-01-01",
        headers=LIB_HEADERS,
    )
    assert res.status_code == 400
    print(" -> PASSED!")


def test_granular_endpoints():
    print("[TEST 4] Testing /borrowing-trend, /top-books, /popular-categories, /fines-summary ...")
    assert client.get("/api/statistics/borrowing-trend?period=week", headers=LIB_HEADERS).status_code == 200
    assert client.get("/api/statistics/top-books?period=month&limit=5", headers=LIB_HEADERS).status_code == 200
    assert client.get("/api/statistics/popular-categories?period=month", headers=LIB_HEADERS).status_code == 200
    r_fine = client.get("/api/statistics/fines-summary?period=month", headers=LIB_HEADERS)
    assert r_fine.status_code == 200
    assert r_fine.json()["collected_amount"] == 50000.0
    print(" -> PASSED!")


if __name__ == "__main__":
    try:
        setup_database()
        init_auth_headers()
        test_rbac_enforcement()
        test_dashboard_endpoint()
        test_group_by_month_and_custom_range()
        test_invalid_date_range()
        test_granular_endpoints()
        print("\n========================================================")
        print(" ALL 5 TEST SUITES PASSED 100% FOR TASK T3CFF62!")
        print("========================================================")
    finally:
        app.dependency_overrides.clear()
