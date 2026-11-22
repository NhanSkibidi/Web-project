"""
Kiểm thử toàn diện chức năng Gia hạn sách (Renewal) cho cả Độc giả và Thủ thư.
Chạy: python test_renewal_full.py
"""
import os
import sys
from datetime import datetime, timedelta

# Thiết lập database SQLite tạm thời cho test
os.environ["DATABASE_URL"] = "sqlite:///./backend/test_renewal.db"
sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import engine, Base, SessionLocal
from app.models.user import User
from app.models.Book import Book
from app.models.Category import Category
from app.models.Publisher import Publisher
from app.models.BookCopy import BookCopy
from app.models.loan import Loan, LoanStatus, BorrowType
from app.models.loan_item import LoanItem
from app.models.reservation import Reservation

client = TestClient(app)


def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Tạo thể loại và nhà xuất bản
        cat = Category(id=1, name="Công nghệ thông tin")
        pub = Publisher(id=1, name="NXB Giáo dục")
        db.add_all([cat, pub])
        db.commit()

        # Tạo user độc giả và thủ thư
        reader = User(
            id=1,
            full_name="Nguyễn Văn A",
            email="vana.nguyen@univ.edu.vn",
            password_hash="fakehash",
            role="READER",
            status="ACTIVE",
        )
        reader2 = User(
            id=2,
            full_name="Trần Thị B",
            email="thib.tran@univ.edu.vn",
            password_hash="fakehash",
            role="READER",
            status="ACTIVE",
        )
        librarian = User(
            id=99,
            full_name="Trịnh Huy Đại",
            email="thuthu@ks25.edu.vn",
            password_hash="fakehash",
            role="LIBRARIAN",
            status="ACTIVE",
        )
        db.add_all([reader, reader2, librarian])

        # Tạo sách
        book1 = Book(
            isbn="978-604-01",
            title="Cấu trúc Dữ liệu & Giải thuật",
            category_id=1,
            publisher_id=1,
        )
        book2 = Book(
            isbn="978-604-02",
            title="Lập trình Web với FastAPI",
            category_id=1,
            publisher_id=1,
        )
        db.add_all([book1, book2])
        db.commit()

        # Tạo bản sao
        now = datetime.now()
        copy1 = BookCopy(
            id=1,
            book_isbn="978-604-01",
            copy_code="BC-001",
            shelf_location="Kệ A1",
            imported_at=now.date(),
            status="BORROWED",
        )
        copy2 = BookCopy(
            id=2,
            book_isbn="978-604-02",
            copy_code="BC-002",
            shelf_location="Kệ B2",
            imported_at=now.date(),
            status="BORROWED",
        )
        db.add_all([copy1, copy2])
        db.commit()

        # Tạo phiếu mượn BORROWED còn hạn (due_date = now + 5 ngày)
        now = datetime.now()
        loan = Loan(
            id=1,
            user_id=1,
            borrow_type=BorrowType.ONLINE,
            status=LoanStatus.BORROWED,
            created_at=now - timedelta(days=9),
            borrowed_at=now - timedelta(days=9),
            due_date=now + timedelta(days=5),
        )
        db.add(loan)
        db.commit()

        item1 = LoanItem(
            id=1,
            loan_id=1,
            book_isbn="978-604-01",
            copy_id=1,
            due_date=now + timedelta(days=5),
            renewal_count=0,
        )
        item2 = LoanItem(
            id=2,
            loan_id=1,
            book_isbn="978-604-02",
            copy_id=2,
            due_date=now + timedelta(days=5),
            renewal_count=0,
        )
        db.add_all([item1, item2])
        db.commit()

        print("[SETUP] Khởi tạo dữ liệu SQLite thành công.")
    finally:
        db.close()


def test_all_renewal_cases():
    setup_db()
    db = SessionLocal()
    try:
        print("\n=== BẮT ĐẦU KIỂM THỬ GIA HẠN SÁCH ===")

        # ── TEST 1: Độc giả tự gia hạn 1 cuốn (+7 ngày) ──
        print("\n[TEST 1] Độc giả tự gia hạn cuốn sách lần đầu (+7 ngày)...")
        res = client.patch(
            "/api/loans/items/1/renew",
            json={"user_id": 1},
        )
        assert res.status_code == 200, f"Lỗi {res.status_code}: {res.text}"
        data = res.json()
        assert data["renewal_count"] == 1
        assert data["max_renewals"] == 1
        assert "Độc giả tự gia hạn" in data["renewed_by"]
        print(f"  ✓ Thành công: {data['message']}")

        # ── TEST 2: Độc giả thử gia hạn lần 2 -> Bị từ chối (400) ──
        print("\n[TEST 2] Thử gia hạn lần 2 cho cùng cuốn sách...")
        res2 = client.patch(
            "/api/loans/items/1/renew",
            json={"user_id": 1},
        )
        assert res2.status_code == 400
        print(f"  ✓ Từ chối chính xác: {res2.json()['detail']}")

        # ── TEST 3: Độc giả khác cố gia hạn phiếu không phải của mình -> 403 ──
        print("\n[TEST 3] Độc giả khác (user_id=2) cố gia hạn sách của user_id=1...")
        res3 = client.patch(
            "/api/loans/items/2/renew",
            json={"user_id": 2},
        )
        assert res3.status_code == 403
        print(f"  ✓ Chặn quyền chính xác (403): {res3.json()['detail']}")

        # ── TEST 4: Chặn khi có người đặt trước (WAITING / READY) -> 409 ──
        print("\n[TEST 4] Chặn gia hạn khi có người đặt trước...")
        # Tạo đặt trước cho book2
        resv = Reservation(
            user_id=2,
            book_isbn="978-604-02",
            status="WAITING",
        )
        db.add(resv)
        db.commit()

        res4 = client.patch(
            "/api/loans/items/2/renew",
            json={"user_id": 1},
        )
        assert res4.status_code == 409
        print(f"  ✓ Chặn đặt trước chính xác (409): {res4.json()['detail']}")

        # Xóa đặt trước để test tiếp
        db.delete(resv)
        db.commit()

        # ── TEST 5: Thủ thư gia hạn hộ thành công ──
        print("\n[TEST 5] Thủ thư gia hạn hộ cho độc giả...")
        res5 = client.patch(
            "/api/loans/items/2/renew",
            json={"librarian_id": 99},
        )
        assert res5.status_code == 200
        data5 = res5.json()
        assert data5["renewal_count"] == 1
        assert "Trịnh Huy Đại" in data5["renewed_by"]
        print(f"  ✓ Thủ thư gia hạn hộ thành công: {data5['renewed_by']}")

        # ── TEST 6: Sách đã quá hạn -> Bị từ chối ──
        print("\n[TEST 6] Chặn gia hạn khi sách đã quá hạn...")
        item1 = db.query(LoanItem).filter(LoanItem.id == 1).first()
        item1.due_date = datetime.now() - timedelta(days=3)
        item1.renewal_count = 0  # reset renewal_count để kiểm tra điều kiện quá hạn
        db.commit()

        res6 = client.patch(
            "/api/loans/items/1/renew",
            json={"librarian_id": 99},
        )
        assert res6.status_code == 400
        assert "quá hạn" in res6.json()["detail"]
        print(f"  ✓ Chặn quá hạn chính xác: {res6.json()['detail']}")

        # ── TEST 7: Thủ thư gia hạn toàn bộ phiếu mượn (renew_entire_loan) ──
        print("\n[TEST 7] Thủ thư gia hạn toàn bộ phiếu mượn qua /api/loans/{id}/renew...")
        # Tạo phiếu mới với 2 cuốn chưa gia hạn
        loan2 = Loan(
            id=2,
            user_id=1,
            borrow_type=BorrowType.ONLINE,
            status=LoanStatus.BORROWED,
            created_at=datetime.now() - timedelta(days=5),
            borrowed_at=datetime.now() - timedelta(days=5),
            due_date=datetime.now() + timedelta(days=9),
        )
        db.add(loan2)
        db.commit()

        item3 = LoanItem(
            id=3,
            loan_id=2,
            book_isbn="978-604-01",
            copy_id=1,
            due_date=datetime.now() + timedelta(days=9),
            renewal_count=0,
        )
        db.add(item3)
        db.commit()

        res7 = client.patch(
            "/api/loans/2/renew",
            json={"librarian_id": 99},
        )
        assert res7.status_code == 200
        data7 = res7.json()
        assert data7["renewed_count"] == 1
        assert "Thủ thư Trịnh Huy Đại" in data7["renewed_by"]
        print(f"  ✓ Gia hạn toàn bộ phiếu thành công: {data7['message']}")

        print("\n=== TOÀN BỘ 7/7 TEST CASES GIA HẠN SÁCH ĐỀU PASS! ===")

    finally:
        db.close()
        if os.path.exists("./backend/test_renewal.db"):
            try:
                os.remove("./backend/test_renewal.db")
            except Exception:
                pass


if __name__ == "__main__":
    test_all_renewal_cases()
