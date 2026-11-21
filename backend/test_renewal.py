"""
Kiểm thử tự động cho chức năng Gia hạn sách (Renewal).
Chạy: python test_renewal.py
"""
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from app.main import app
from app.db.session import SessionLocal
from app.models.loan import Loan, LoanStatus, BorrowType
from app.models.loan_item import LoanItem
from app.models.BookCopy import BookCopy
from app.models.reservation import Reservation

client = TestClient(app)


def test_renewal_flow():
    print("=== BẮT ĐẦU KIỂM THỬ GIA HẠN SÁCH ===\n")
    db = SessionLocal()
    try:
        # Tìm 1 loan_item đang mượn, chưa trả, chưa gia hạn
        item = (
            db.query(LoanItem)
            .join(Loan, LoanItem.loan_id == Loan.id)
            .filter(
                Loan.status == LoanStatus.BORROWED,
                LoanItem.return_date.is_(None),
                LoanItem.renewal_count == 0,
            )
            .first()
        )

        if not item:
            print("[SKIP] Không tìm thấy loan_item phù hợp để test gia hạn.")
            print("       Cần có 1 phiếu BORROWED, cuốn chưa trả, chưa gia hạn.")
            return

        loan = db.query(Loan).filter(Loan.id == item.loan_id).first()
        print(f"[INFO] Phiếu mượn: #{loan.id} ({loan.code}), Trạng thái: {loan.status.value}")
        print(f"[INFO] Mục mượn ID: {item.id}, ISBN: {item.book_isbn}, Hạn trả: {item.due_date}")
        print(f"[INFO] Số lần gia hạn hiện tại: {item.renewal_count}")
        print()

        # ── TEST 1: Gia hạn thành công (lần đầu, +7 ngày) ──
        print("[TEST 1] Gia hạn cuốn sách lần đầu (+7 ngày)...")
        old_due = item.due_date
        res = client.patch(
            f"/api/loans/items/{item.id}/renew",
            json={"user_id": loan.user_id},
        )
        print(f"  Status: {res.status_code}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print(f"  → Mã phiếu: {data['loan_code']}")
        print(f"  → Sách: {data['book_title']}")
        print(f"  → Hạn trả cũ: {data['old_due_date']}")
        print(f"  → Hạn trả mới: {data['new_due_date']}")
        print(f"  → Lần gia hạn: {data['renewal_count']}/{data['max_renewals']}")
        print(f"  → Người gia hạn: {data['renewed_by']}")
        print(f"  → Thông báo: {data['message']}")
        assert data["renewal_count"] == 1
        print("  ✓ Gia hạn lần 1 thành công!")
        print()

        # ── TEST 2: Gia hạn lần 2 → Phải bị từ chối (vượt giới hạn) ──
        print("[TEST 2] Thử gia hạn lần 2 (phải bị từ chối do vượt giới hạn 1 lần)...")
        res2 = client.patch(
            f"/api/loans/items/{item.id}/renew",
            json={"user_id": loan.user_id},
        )
        print(f"  Status: {res2.status_code}")
        assert res2.status_code == 400, f"Expected 400, got {res2.status_code}: {res2.text}"
        print(f"  → Lý do từ chối: {res2.json()['detail']}")
        print("  ✓ Từ chối đúng: đã gia hạn tối đa 1 lần!")
        print()

        # ── TEST 3: Thử gia hạn loan_item không tồn tại ──
        print("[TEST 3] Thử gia hạn loan_item_id=999999 (không tồn tại)...")
        res3 = client.patch(
            "/api/loans/items/999999/renew",
            json={"user_id": loan.user_id},
        )
        print(f"  Status: {res3.status_code}")
        assert res3.status_code == 404, f"Expected 404, got {res3.status_code}: {res3.text}"
        print(f"  → Lý do: {res3.json()['detail']}")
        print("  ✓ Trả về 404 chính xác!")
        print()

        # ── TEST 4: Thử gia hạn khi có đặt trước (nếu kiểm tra được) ──
        print("[TEST 4] Kiểm tra chặn gia hạn khi có đặt trước (reservation)...")
        # Reset lại renewal_count để test tiếp
        db.refresh(item)
        item.renewal_count = 0
        db.commit()

        # Tạo reservation WAITING cho cùng đầu sách
        test_reservation = Reservation(
            user_id=loan.user_id + 1 if loan.user_id > 0 else 1,
            book_isbn=item.book_isbn,
            status="WAITING",
        )
        db.add(test_reservation)
        db.commit()
        db.refresh(test_reservation)

        res4 = client.patch(
            f"/api/loans/items/{item.id}/renew",
            json={"user_id": loan.user_id},
        )
        print(f"  Status: {res4.status_code}")
        assert res4.status_code == 409, f"Expected 409, got {res4.status_code}: {res4.text}"
        print(f"  → Lý do: {res4.json()['detail']}")
        print("  ✓ Từ chối đúng: đầu sách có người đặt trước!")

        # Dọn dẹp reservation test
        db.delete(test_reservation)
        db.commit()
        print()

        # ── TEST 5: Thủ thư gia hạn hộ ──
        print("[TEST 5] Thủ thư gia hạn hộ (không cần user_id, chỉ cần librarian_id)...")
        res5 = client.patch(
            f"/api/loans/items/{item.id}/renew",
            json={"librarian_id": loan.processed_by or 1},
        )
        print(f"  Status: {res5.status_code}")
        assert res5.status_code == 200, f"Expected 200, got {res5.status_code}: {res5.text}"
        data5 = res5.json()
        print(f"  → Người gia hạn: {data5['renewed_by']}")
        print(f"  → Lần gia hạn: {data5['renewal_count']}/{data5['max_renewals']}")
        print("  ✓ Thủ thư gia hạn hộ thành công!")
        print()

        # Reset trạng thái test (trả lại due_date ban đầu)
        db.refresh(item)
        item.renewal_count = 0
        item.due_date = old_due
        db.commit()
        print("[CLEANUP] Đã khôi phục trạng thái ban đầu cho loan_item.")

        print("\n=== TẤT CẢ KIỂM THỬ GIA HẠN SÁCH ĐỀU THÀNH CÔNG! ===")

    finally:
        db.close()


if __name__ == "__main__":
    test_renewal_flow()
