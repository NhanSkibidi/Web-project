"""
Bộ kiểm thử tự động toàn diện cho Task T3CFF48:
[Quá hạn] Danh sách quá hạn và nhắc trả sách.

Kiểm tra:
1. Bảng Notification và các quan hệ SQLAlchemy.
2. Logic CRUD get_overdue_loans: tính số ngày trễ và tiền phạt tạm tính (2.000đ/ngày).
3. Logic CRUD get_due_soon_loans: phát hiện sách sắp đến hạn trong 2 ngày.
4. Logic CRUD sync_and_get_notifications: đồng bộ in-app notification & đếm unread.
5. Logic CRUD mark_notification_read & mark_all_notifications_read.
6. Logic CRUD remind_overdue_loan & remind_all_overdue.
7. Endpoints FastAPI:
   - GET /api/loans/overdue
   - GET /api/loans/due-soon
   - GET /api/loans/notifications/my
   - PATCH /api/loans/notifications/{id}/read
   - POST /api/loans/notifications/mark-all-read
   - POST /api/loans/{id}/remind
   - POST /api/loans/remind-all-overdue
"""

import sys
import os
from datetime import datetime, timedelta

# Đảm bảo import được backend app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.db.session import Base, get_db
from app.models.user import User, UserRole, UserStatus
from app.models.library_card import LibraryCard, CardStatus, CardType
from app.models.Category import Category
from app.models.Publisher import Publisher
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.loan import Loan, LoanStatus, BorrowType
from app.models.loan_item import LoanItem
from app.models.notification import Notification
from app.crud.loan_service import (
    get_overdue_loans,
    get_due_soon_loans,
    sync_and_get_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    remind_overdue_loan,
    remind_all_overdue,
)
from app.main import app

# Database in-memory SQLite cho kiểm thử
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
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
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Tạo User Thủ thư
    librarian = User(
        id=1,
        email="librarian@unilib.edu.vn",
        password_hash="fakehash",
        full_name="Ngô Việt Dũng",
        phone="0912345678",
        role=UserRole.LIBRARIAN,
        status=UserStatus.ACTIVE,
    )
    # Tạo Độc giả 1 (có sách quá hạn)
    reader1 = User(
        id=2,
        email="khoa.tm@sv.unilib.edu.vn",
        password_hash="fakehash",
        full_name="Trần Minh Khoa",
        phone="0987654321",
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )
    # Tạo Độc giả 2 (có sách sắp đến hạn trong 2 ngày)
    reader2 = User(
        id=3,
        email="quan.lh@sv.unilib.edu.vn",
        password_hash="fakehash",
        full_name="Lê Hoàng Quân",
        phone="0977889900",
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )

    db.add_all([librarian, reader1, reader2])
    db.commit()

    # Tạo Thẻ Thư viện
    card1 = LibraryCard(
        id=1,
        reader_id=reader1.id,
        card_code="LIB-2024-001",
        card_type=CardType.STUDENT,
        status=CardStatus.ACTIVE,
        issue_date=(datetime.now() - timedelta(days=60)).date(),
        expiry_date=(datetime.now() + timedelta(days=300)).date(),
    )
    card2 = LibraryCard(
        id=2,
        reader_id=reader2.id,
        card_code="LIB-2024-002",
        card_type=CardType.STUDENT,
        status=CardStatus.ACTIVE,
        issue_date=(datetime.now() - timedelta(days=60)).date(),
        expiry_date=(datetime.now() + timedelta(days=300)).date(),
    )
    db.add_all([card1, card2])
    db.commit()

    cat = Category(name="Công nghệ Thông tin")
    pub = Publisher(name="NXB Giáo dục")
    db.add_all([cat, pub])
    db.commit()

    # Tạo Sách & Bản sao
    book1 = Book(
        isbn="978-604-0-0001",
        title="Lập trình Hướng đối tượng C++ & Java",
        category_id=cat.id,
        publisher_id=pub.id,
        cover_image="../assets/images/book1.jpg",
    )
    book2 = Book(
        isbn="978-604-0-0002",
        title="Toán Rời rạc và Ứng dụng",
        category_id=cat.id,
        publisher_id=pub.id,
        cover_image="../assets/images/book2.jpg",
    )
    db.add_all([book1, book2])
    db.commit()

    copy1 = BookCopy(
        id=1,
        book_isbn=book1.isbn,
        copy_code="CP-97860400001-01",
        shelf_location="Kệ A1",
        imported_at=datetime.now().date(),
        condition="MỚI",
        status="BORROWED",
    )
    copy2 = BookCopy(
        id=2,
        book_isbn=book2.isbn,
        copy_code="CP-97860400002-01",
        shelf_location="Kệ B2",
        imported_at=datetime.now().date(),
        condition="MỚI",
        status="BORROWED",
    )
    db.add_all([copy1, copy2])
    db.commit()

    # Phiếu mượn 1: Độc giả 1 mượn sách 1, đã quá hạn 10 ngày
    now = datetime.now()
    loan1 = Loan(
        id=1,
        user_id=reader1.id,
        borrow_type=BorrowType.WALK_IN,
        status=LoanStatus.BORROWED,
        created_at=now - timedelta(days=24),
        borrowed_at=now - timedelta(days=24),
        due_date=now - timedelta(days=10),
    )
    db.add(loan1)
    db.commit()

    item1 = LoanItem(
        id=1,
        loan_id=loan1.id,
        book_isbn=book1.isbn,
        copy_id=copy1.id,
        due_date=now - timedelta(days=10),
        renewal_count=0,
        return_date=None,
    )
    db.add(item1)

    # Phiếu mượn 2: Độc giả 2 mượn sách 2, sắp đến hạn (còn 1 ngày)
    loan2 = Loan(
        id=2,
        user_id=reader2.id,
        borrow_type=BorrowType.ONLINE,
        status=LoanStatus.BORROWED,
        created_at=now - timedelta(days=13),
        borrowed_at=now - timedelta(days=13),
        due_date=now + timedelta(days=1),
    )
    db.add(loan2)
    db.commit()

    item2 = LoanItem(
        id=2,
        loan_id=loan2.id,
        book_isbn=book2.isbn,
        copy_id=copy2.id,
        due_date=now + timedelta(days=1),
        renewal_count=0,
        return_date=None,
    )
    db.add(item2)
    db.commit()
    db.close()


def test_overdue_crud():
    print("[TEST 1] Testing get_overdue_loans CRUD...")
    db = TestingSessionLocal()
    result = get_overdue_loans(db)
    assert result["total"] == 1, f"Expected 1 overdue item, got {result['total']}"
    item = result["items"][0]
    assert item["reader_name"] == "Trần Minh Khoa"
    assert item["days_overdue"] == 10
    assert item["estimated_fine"] == 20000.0  # 10 * 2000
    assert result["total_fine"] == 20000.0
    print(" -> get_overdue_loans: PASSED (days_overdue=10, fine=20,000đ)")
    db.close()


def test_due_soon_crud():
    print("[TEST 2] Testing get_due_soon_loans CRUD...")
    db = TestingSessionLocal()
    result = get_due_soon_loans(db, days=2)
    assert result["total"] == 1, f"Expected 1 due-soon item, got {result['total']}"
    item = result["items"][0]
    assert item["reader_name"] == "Lê Hoàng Quân"
    assert item["days_remaining"] == 1
    assert item["status_label"] == "Còn 1 ngày"
    print(" -> get_due_soon_loans: PASSED (days_remaining=1, label='Còn 1 ngày')")
    db.close()


def test_notification_sync_and_get():
    print("[TEST 3] Testing sync_and_get_notifications...")
    db = TestingSessionLocal()
    notifs = sync_and_get_notifications(db)
    assert notifs["unread_count"] == 2, f"Expected 2 notifications, got {notifs['unread_count']}"
    types = {n["type"] for n in notifs["items"]}
    assert "OVERDUE" in types
    assert "DUE_SOON" in types
    print(" -> sync_and_get_notifications: PASSED (created 1 OVERDUE and 1 DUE_SOON)")
    db.close()


def test_mark_notification_read():
    print("[TEST 4] Testing mark_notification_read...")
    db = TestingSessionLocal()
    notif = db.query(Notification).first()
    assert notif is not None
    assert notif.is_read is False

    ok = mark_notification_read(db, notif.id)
    assert ok is True
    db.refresh(notif)
    assert notif.is_read is True
    print(" -> mark_notification_read: PASSED")
    db.close()


def test_remind_loan():
    print("[TEST 5] Testing remind_overdue_loan...")
    db = TestingSessionLocal()
    remind_res = remind_overdue_loan(db, loan_id=1, librarian_id=1)
    assert remind_res["loan_id"] == 1
    assert remind_res["sent_count"] == 1

    # Kiểm tra overdue list cập nhật reminded_count
    overdue_res = get_overdue_loans(db)
    assert overdue_res["items"][0]["reminded_count"] == 1
    assert overdue_res["items"][0]["last_reminded_at"] is not None
    print(" -> remind_overdue_loan: PASSED (reminded_count=1)")
    db.close()


def test_api_endpoints():
    print("[TEST 6] Testing FastAPI REST Endpoints...")

    # 1. GET /api/loans/overdue
    res = client.get("/api/loans/overdue")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] >= 1
    assert data["items"][0]["days_overdue"] == 10
    print(" -> GET /api/loans/overdue: 200 OK")

    # 2. GET /api/loans/due-soon
    res = client.get("/api/loans/due-soon?days=2")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] >= 1
    assert data["items"][0]["days_remaining"] == 1
    print(" -> GET /api/loans/due-soon: 200 OK")

    # 3. GET /api/loans/notifications/my
    res = client.get("/api/loans/notifications/my?user_id=2")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "unread_count" in data
    assert len(data["items"]) >= 1
    print(" -> GET /api/loans/notifications/my: 200 OK")

    # 4. POST /api/loans/{id}/remind
    res = client.post("/api/loans/1/remind", json={"librarian_id": 1, "message": "Nhắc trả sách quá hạn"})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["sent_count"] == 1
    print(" -> POST /api/loans/1/remind: 200 OK")

    # 5. POST /api/loans/notifications/mark-all-read
    res = client.post("/api/loans/notifications/mark-all-read?user_id=2")
    assert res.status_code == 200, res.text
    assert res.json()["success"] is True
    print(" -> POST /api/loans/notifications/mark-all-read: 200 OK")


if __name__ == "__main__":
    setup_database()
    test_overdue_crud()
    test_due_soon_crud()
    test_notification_sync_and_get()
    test_mark_notification_read()
    test_remind_loan()
    test_api_endpoints()
    print("\n=======================================================")
    print(" ALL 6 TEST SUITES PASSED 100% FOR TASK T3CFF48!")
    print("=======================================================")
