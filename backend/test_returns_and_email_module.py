"""
Kiểm thử tự động cho Module Trả sách (T3CFEDE), Kiểm tra nợ phạt (T3CFEF8) và Email nhắc hạn (T3D003D).
Chạy: .\\.venv\\Scripts\\python.exe backend/test_returns_and_email_module.py
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
from app.models.reservation import Reservation
from app.models.user import User, UserRole, UserStatus
from app.services.email_service import (
    send_due_soon_reminder_email,
    send_reservation_ready_email,
)

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

    lib = User(
        id=1,
        email="lib@unilib.edu.vn",
        password_hash=hash_password("123456"),
        full_name="Trịnh Huy Đại",
        role=UserRole.LIBRARIAN,
        status=UserStatus.ACTIVE,
    )
    r1 = User(
        id=2,
        email="docgia1@unilib.edu.vn",
        password_hash=hash_password("123456"),
        full_name="Nguyễn Văn An",
        phone="0901111222",
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )
    r2 = User(
        id=3,
        email="docgia2@unilib.edu.vn",
        password_hash=hash_password("123456"),
        full_name="Trần Thị Bình",
        phone="0903333444",
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )
    db.add_all([lib, r1, r2])
    db.commit()

    c1 = LibraryCard(
        card_code="LC-001",
        reader_id=r1.id,
        card_type=CardType.STUDENT,
        issue_date=date.today() - timedelta(days=30),
        expiry_date=date.today() + timedelta(days=300),
        max_borrow_books=5,
        status=CardStatus.ACTIVE,
    )
    c2 = LibraryCard(
        card_code="LC-002",
        reader_id=r2.id,
        card_type=CardType.STUDENT,
        issue_date=date.today() - timedelta(days=30),
        expiry_date=date.today() + timedelta(days=300),
        max_borrow_books=5,
        status=CardStatus.ACTIVE,
    )
    cat = Category(id=1, name="Khoa học máy tính")
    pub = Publisher(id=1, name="NXB Bách Khoa")
    db.add_all([c1, c2, cat, pub])
    db.commit()

    b1 = Book(isbn="ISBN-01", title="Cấu trúc Dữ liệu", category_id=1, publisher_id=1, price=100000.0)
    b2 = Book(isbn="ISBN-02", title="Hệ điều hành", category_id=1, publisher_id=1, price=150000.0)
    db.add_all([b1, b2])
    db.commit()

    today = date.today()
    cp1 = BookCopy(id=1, book_isbn="ISBN-01", copy_code="CP-01", shelf_location="Kệ A1", imported_at=today, status="BORROWED")
    cp2 = BookCopy(id=2, book_isbn="ISBN-02", copy_code="CP-02", shelf_location="Kệ A2", imported_at=today, status="BORROWED")
    cp3 = BookCopy(id=3, book_isbn="ISBN-01", copy_code="CP-03", shelf_location="Kệ A1", imported_at=today, status="BORROWED")
    cp4 = BookCopy(id=4, book_isbn="ISBN-02", copy_code="CP-04", shelf_location="Kệ A2", imported_at=today, status="AVAILABLE")
    cp5 = BookCopy(id=5, book_isbn="ISBN-01", copy_code="CP-05", shelf_location="Kệ A1", imported_at=today, status="BORROWED")
    db.add_all([cp1, cp2, cp3, cp4, cp5])
    db.commit()

    now = datetime.now()

    # Phiếu 99 (CANCELLED cũ của r2) từng giữ cp1 và còn return_date=None -> KHÔNG được bốc nhầm khi trả!
    l_cancelled = Loan(
        id=99,
        user_id=r2.id,
        borrow_type=BorrowType.ONLINE,
        status=LoanStatus.CANCELLED,
        created_at=now - timedelta(days=25),
    )
    db.add(l_cancelled)
    db.commit()
    db.add(LoanItem(id=99, loan_id=99, book_isbn="ISBN-01", copy_id=1, due_date=None, return_date=None))

    # Phiếu 1 của r1: cp1 quá hạn 4 ngày (test loan_item.due_date=None, fallback loan.due_date) + cp2 đúng hạn
    l1 = Loan(
        id=1,
        user_id=r1.id,
        processed_by=lib.id,
        borrow_type=BorrowType.WALK_IN,
        status=LoanStatus.BORROWED,
        created_at=now - timedelta(days=18),
        borrowed_at=now - timedelta(days=18),
        due_date=now - timedelta(days=4),
    )
    db.add(l1)
    db.commit()
    db.add_all([
        LoanItem(id=1, loan_id=1, book_isbn="ISBN-01", copy_id=1, due_date=None),
        LoanItem(id=2, loan_id=1, book_isbn="ISBN-02", copy_id=2, due_date=now + timedelta(days=1)),
    ])

    # Phiếu 2 của r1: cp3 (ISBN-01) có đặt trước WAITING của r2; cp5 cho test trả cả phiếu
    l2 = Loan(
        id=2,
        user_id=r1.id,
        processed_by=lib.id,
        borrow_type=BorrowType.WALK_IN,
        status=LoanStatus.BORROWED,
        created_at=now - timedelta(days=5),
        borrowed_at=now - timedelta(days=5),
        due_date=now + timedelta(days=9),
    )
    db.add(l2)
    db.commit()
    db.add_all([
        LoanItem(id=3, loan_id=2, book_isbn="ISBN-01", copy_id=3, due_date=now + timedelta(days=9)),
        LoanItem(id=4, loan_id=2, book_isbn="ISBN-01", copy_id=5, due_date=now + timedelta(days=9)),
    ])

    # Đặt trước WAITING của r2 cho ISBN-01
    res_wait = Reservation(id=1, user_id=r2.id, book_isbn="ISBN-01", status="WAITING")
    db.add(res_wait)
    db.commit()
    db.close()


def run_tests():
    setup_database()
    lib_headers = {"Authorization": f"Bearer {create_access_token(1)}"}
    reader1_headers = {"Authorization": f"Bearer {create_access_token(2)}"}
    reader2_headers = {"Authorization": f"Bearer {create_access_token(3)}"}

    print("[TEST 1] RBAC & Lookup /api/returns/lookup/{copy_code}...")
    assert client.get("/api/returns/lookup/CP-01").status_code == 401
    assert client.get("/api/returns/lookup/CP-01", headers=reader1_headers).status_code == 403
    assert client.get("/api/returns/lookup/UNKNOWN-99", headers=lib_headers).status_code == 404
    assert client.get("/api/returns/lookup/CP-04", headers=lib_headers).status_code == 400

    lk = client.get("/api/returns/lookup/CP-01", headers=lib_headers)
    assert lk.status_code == 200, lk.text
    lk_data = lk.json()
    assert lk_data["overdue_days"] == 4
    assert lk_data["overdue_fine_amount"] == 8000.0
    assert lk_data["user"]["full_name"] == "Nguyễn Văn An"
    assert len(lk_data["other_borrowed_items"]) == 1
    assert lk_data["other_borrowed_items"][0]["copy_code"] == "CP-02"
    print(" -> Lookup PASSED!")

    print("[TEST 2] Trả lẻ /api/returns/item: quá hạn + đặt trước atomic + CopyStatusLog...")
    assert client.post("/api/returns/item", json={"copy_code": "CP-01"}, headers=reader1_headers).status_code == 403

    # Trả CP-01 -> có phạt quá hạn 8.000đ AND tự chuyển cho reservation WAITING #1 -> RESERVED / READY!
    ret1 = client.post("/api/returns/item", json={"copy_code": "CP-01"}, headers=lib_headers)
    assert ret1.status_code == 200, ret1.text
    r1_json = ret1.json()
    assert r1_json["fine_id"] is not None
    assert r1_json["overdue_fine_amount"] == 8000.0
    assert r1_json["reservation_notified"] is True
    assert r1_json["reserved_for_reader"] == "Trần Thị Bình"
    fine_id_created = r1_json["fine_id"]

    db = TestingSessionLocal()
    cp1_db = db.query(BookCopy).filter(BookCopy.copy_code == "CP-01").first()
    assert cp1_db.status == "RESERVED"
    res1_db = db.query(Reservation).filter(Reservation.id == 1).first()
    assert res1_db.status == "READY" and res1_db.copy_id == cp1_db.id
    logs = db.query(CopyStatusLog).filter(CopyStatusLog.book_copy_id == cp1_db.id).all()
    assert [lg.new_status for lg in logs] == ["AVAILABLE", "RESERVED"]
    db.close()

    # Trả CP-02 đúng hạn -> loan 1 hoàn tất RETURNED
    ret2 = client.post("/api/returns/item", json={"copy_code": "CP-02"}, headers=lib_headers)
    assert ret2.status_code == 200, ret2.text
    assert ret2.json()["fine_id"] is None
    assert ret2.json()["reservation_notified"] is False
    print(" -> Single return & reservation promotion PASSED!")

    print("[TEST 3] Trả cả phiếu /api/returns/loan (chặn CANCELLED -> 400) & today-summary...")
    bad_bulk = client.post("/api/returns/loan", json={"loan_id": 99}, headers=lib_headers)
    assert bad_bulk.status_code == 400, bad_bulk.text
    bulk = client.post("/api/returns/loan", json={"loan_id": 2}, headers=lib_headers)
    assert bulk.status_code == 200, bulk.text
    assert bulk.json()["returned_count"] == 2
    assert bulk.json()["status"] == "RETURNED"

    summary = client.get("/api/returns/today-summary", headers=lib_headers)
    assert summary.status_code == 200
    assert summary.json()["returned_today_count"] == 4
    print(" -> Bulk return & today-summary PASSED!")

    print("[TEST 4] Kiểm tra has_unpaid_fines() chặn mượn online cho đến khi nộp phạt...")
    # r1 đang có fine_id_created (8.000đ UNPAID) -> tạo phiếu mượn online mới phải bị 400
    r_block = client.post(
        "/api/loans/online",
        json={"book_isbns": ["ISBN-02"]},
        headers=reader1_headers,
    )
    assert r_block.status_code == 400, r_block.text
    assert "phạt" in r_block.json()["detail"].lower()

    # Thanh toán khoản phạt -> mượn lại được (201)
    r_pay = client.post(
        f"/api/fines/{fine_id_created}/pay",
        json={"payment_method": "TIỀN MẶT"},
        headers=lib_headers,
    )
    assert r_pay.status_code == 200
    r_allow = client.post(
        "/api/loans/online",
        json={"book_isbns": ["ISBN-02"]},
        headers=reader1_headers,
    )
    assert r_allow.status_code == 201, r_allow.text
    print(" -> has_unpaid_fines() blocking & unblocking PASSED!")

    print("[TEST 5] RBAC & Endpoints /api/emails/* (T3D003D) + HTML escaping...")
    assert client.get("/api/emails/status").status_code == 401
    assert client.get("/api/emails/status", headers=reader2_headers).status_code == 403
    assert client.post("/api/emails/remind-due-soon", headers=reader2_headers).status_code == 403
    assert client.post("/api/emails/notify-reservation-ready/1", headers=reader2_headers).status_code == 403

    assert client.get("/api/emails/status", headers=lib_headers).status_code == 200
    assert client.post("/api/emails/remind-due-soon?days=2", headers=lib_headers).status_code == 200
    assert client.post("/api/emails/notify-reservation-ready/1", headers=lib_headers).status_code == 200

    # Dry-run HTML escape sanity
    d1 = send_due_soon_reminder_email("a@b.c", "<img onerror=1>", "PM-1", "Book", "22/11/2026", 1)
    d2 = send_reservation_ready_email("a@b.c", "<b>User</b>", "Book", "CP-1", "24/11/2026 10:00")
    assert d1["sent"] is True and d2["sent"] is True
    print(" -> Email RBAC & endpoints PASSED!")

    print("\n==========================================================")
    print(" ALL TESTS PASSED 100% FOR T3CFEDE, T3CFEF8 & T3D003D!")
    print("==========================================================")


if __name__ == "__main__":
    try:
        run_tests()
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
