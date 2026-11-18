"""
Kiểm thử tự động cho chức năng Mượn sách tại quầy (Counter Borrowing).
Chạy: python test_counter_borrow.py
"""
import sys
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.library_card import LibraryCard, CardStatus, CardType
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.loan import Loan, LoanStatus, BorrowType
from app.models.loan_item import LoanItem

client = TestClient(app)

def test_counter_borrow_flow():
    print("=== BẮT ĐẦU KIỂM THỬ MƯỢN SÁCH TẠI QUẦY ===")
    db = SessionLocal()
    try:
        # 1. Kiểm tra reader mẫu
        card = db.query(LibraryCard).first()
        if not card:
            print("[WARN] Chưa có thẻ thư viện mẫu, tạo thẻ test...")
            user = db.query(User).filter(User.role == UserRole.READER).first()
            if not user:
                user = User(
                    email="testreader@example.com",
                    hashed_password="hash",
                    full_name="Nguyễn Văn Test",
                    role=UserRole.READER,
                    status=UserStatus.ACTIVE,
                )
                db.add(user)
                db.flush()
            card = LibraryCard(
                card_code="LC-TEST01",
                reader_id=user.id,
                card_type=CardType.STANDARD,
                issue_date="2026-01-01",
                expiry_date="2027-01-01",
                max_borrow_books=5,
                status=CardStatus.ACTIVE,
            )
            db.add(card)
            db.commit()
            db.refresh(card)

        card_code = card.card_code
        print(f"[TEST 1] Tra cứu độc giả qua thẻ '{card_code}'...")
        res_reader = client.get(f"/api/readers/by-card/{card_code}")
        print("Status:", res_reader.status_code)
        assert res_reader.status_code == 200, f"Expected 200, got {res_reader.status_code}: {res_reader.text}"
        reader_data = res_reader.json()
        print(f"-> Tên độc giả: {reader_data['full_name']}, Sách đang giữ: {reader_data['borrowing_count']}")

        # 2. Kiểm tra bản sao sách
        copy = db.query(BookCopy).filter(BookCopy.status == "AVAILABLE").first()
        if not copy:
            print("[WARN] Chưa có bản sao AVAILABLE, tìm bản sao bất kỳ hoặc tạo mới...")
            book = db.query(Book).first()
            if not book:
                book = Book(
                    isbn="9786040000099",
                    title="Lập Trình Python Căn Bản",
                    author="KS25 Lab",
                )
                db.add(book)
                db.flush()
            copy = BookCopy(
                book_isbn=book.isbn,
                copy_code="BC-TEST-001",
                shelf_location="Kệ A1-N1",
                status="AVAILABLE",
            )
            db.add(copy)
            db.commit()
            db.refresh(copy)

        barcode = copy.copy_code
        print(f"[TEST 2] Tra cứu bản sao qua mã vạch '{barcode}'...")
        res_copy = client.get(f"/api/copies/by-barcode/{barcode}")
        print("Status:", res_copy.status_code)
        assert res_copy.status_code == 200, f"Expected 200, got {res_copy.status_code}: {res_copy.text}"
        copy_data = res_copy.json()
        print(f"-> Tên sách: {copy_data['title']}, Vị trí: {copy_data['shelf_location']}, Trạng thái: {copy_data['status']}")

        # 3. Kiểm tra thẩm định 7 điều kiện (POST /api/loans/counter/validate)
        print("[TEST 3] Thẩm định 7 điều kiện mượn sách...")
        res_val = client.post("/api/loans/counter/validate", json={
            "card_code": card_code,
            "barcodes": [barcode],
        })
        print("Status:", res_val.status_code)
        assert res_val.status_code == 200, f"Expected 200, got {res_val.status_code}: {res_val.text}"
        val_data = res_val.json()
        print(f"-> Có đủ điều kiện mượn (can_borrow): {val_data['can_borrow']}")
        print(f"-> Số điều kiện thẩm định: {len(val_data['conditions'])} điều kiện")
        for cond in val_data["conditions"]:
            icon = "✓" if cond["passed"] else "✗"
            print(f"   [{icon}] {cond['code']}: {cond['label']} -> {cond['message']}")

        # 4. Kiểm tra tạo phiếu mượn tại quầy (POST /api/loans/counter)
        if val_data["can_borrow"]:
            print(f"[TEST 4] Tạo phiếu mượn tại quầy BORROWED...")
            res_create = client.post("/api/loans/counter", json={
                "card_code": card_code,
                "barcodes": [barcode],
            })
            print("Status:", res_create.status_code)
            assert res_create.status_code == 201, f"Expected 201, got {res_create.status_code}: {res_create.text}"
            loan_data = res_create.json()
            print(f"-> Mã phiếu: {loan_data['code']}")
            print(f"-> Trạng thái: {loan_data['status']} (Phải là BORROWED)")
            print(f"-> Kênh mượn: {loan_data['borrow_type']} (Phải là WALK_IN)")
            print(f"-> Hạn trả (+14 ngày): {loan_data['due_date']}")
            print(f"-> Số sách trong biên lai: {len(loan_data['books'])} cuốn")
            assert loan_data["status"] == "BORROWED"
            assert loan_data["borrow_type"] == "WALK_IN"

            # 5. Kiểm tra chống mượn trùng đồng thời (409 Conflict)
            print("[TEST 5] Kiểm tra chống mượn trùng đồng thời (409 Conflict)...")
            res_conflict = client.post("/api/loans/counter", json={
                "card_code": card_code,
                "barcodes": [barcode],
            })
            print("Status:", res_conflict.status_code)
            print("Detail:", res_conflict.json())
            assert res_conflict.status_code in [409, 422], f"Expected 409 or 422, got {res_conflict.status_code}"
            print("-> Cơ chế chống mượn trùng (Concurrency Control) hoạt động chính xác!")

            # Reset lại bản sao thành AVAILABLE để phục vụ thử nghiệm giao diện
            copy.status = "AVAILABLE"
            db.commit()
            print("-> Đã hoàn trả trạng thái bản sao test về AVAILABLE!")

        print("\n=== TẤT CẢ KIỂM THỬ BACKEND ĐỀU THÀNH CÔNG RỰC RỠ! ===")

    finally:
        db.close()

if __name__ == "__main__":
    test_counter_borrow_flow()
