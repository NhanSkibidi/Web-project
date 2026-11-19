"""
Kiểm thử tự động toàn diện cho chức năng Đặt trước sách khi hết (T3CFCAC).
Chạy: python test_reservation.py
"""
import os
import sys
from datetime import datetime, timedelta

# Patch compatibility for Python 3.14 if needed
import typing
try:
    import sqlalchemy.util.typing as sa_typing
    sa_typing.make_union_type = lambda *types: typing.Union[tuple(types)] if len(types) > 1 else types[0]
except Exception:
    pass

os.environ["DATABASE_URL"] = "sqlite:///./test_reservation.db"
if os.path.exists("test_reservation.db"):
    try:
        os.remove("test_reservation.db")
    except Exception:
        pass

from app.db.session import SessionLocal, Base, engine
from app.models.user import User, UserRole, UserStatus
from app.models.library_card import LibraryCard, CardStatus, CardType
from app.models.Category import Category
from app.models.Publisher import Publisher
from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.reservation import Reservation, ReservationStatus
from app.models.loan import Loan, LoanStatus, BorrowType
from app.models.loan_item import LoanItem
from app.schemas.reservation import ReservationCreate
from app.crud.reservation import (
    create_reservation,
    get_user_reservations,
    get_ready_reservations_for_staff,
    cancel_reservation,
    check_and_expire_reservations,
    process_returned_copy_for_reservation,
)
from app.routers.reservation import (
    api_create_reservation,
    api_get_my_reservations,
    api_get_staff_ready_reservations,
    api_cancel_reservation,
    api_check_expired_reservations,
)
from app.crud.return_book import return_single_book_copy


def run_all_tests():
    print("=" * 60)
    print("BẮT ĐẦU KIỂM THỬ ĐẶT TRƯỚC SÁCH KHI HẾT (T3CFCAC)")
    print("=" * 60)

    # Đảm bảo schema có bảng reservations
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Chuẩn bị dữ liệu mẫu
        cat = db.query(Category).first()
        if not cat:
            cat = Category(name="Công nghệ thông tin")
            db.add(cat)
            db.flush()

        pub = db.query(Publisher).first()
        if not pub:
            pub = Publisher(name="NXB Bách Khoa")
            db.add(pub)
            db.flush()

        # Tạo 3 độc giả test
        readers = []
        for i in range(1, 5):
            email = f"reader_res_{i}@test.com"
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    email=email,
                    password_hash="hash",
                    full_name=f"Độc Giả Test {i}",
                    role=UserRole.READER,
                    status=UserStatus.ACTIVE,
                )
                db.add(u)
                db.flush()
            readers.append(u)

        # Tạo đầu sách test 1 (đang hết sách - 1 bản sao duy nhất bị mượn)
        test_isbn_out = "978-TEST-OUT-01"
        book_out = db.query(Book).filter(Book.isbn == test_isbn_out).first()
        if not book_out:
            book_out = Book(
                isbn=test_isbn_out,
                title="Sách Test Đã Hết (Toàn bộ đang được mượn)",
                category_id=cat.id,
                publisher_id=pub.id,
            )
            db.add(book_out)
            db.flush()

        # Tạo 1 bản sao bị BORROWED
        copy_code_out = "CP-TEST-OUT-01"
        copy_out = db.query(BookCopy).filter(BookCopy.copy_code == copy_code_out).first()
        if not copy_out:
            copy_out = BookCopy(
                book_isbn=test_isbn_out,
                copy_code=copy_code_out,
                shelf_location="Kệ A1 - Tầng 1",
                imported_at=datetime.now().date(),
                condition="MỚI",
                status="BORROWED",
            )
            db.add(copy_out)
            db.flush()
        else:
            copy_out.status = "BORROWED"
            db.flush()

        # Tạo đầu sách test 2 (vẫn CÒN bản sao AVAILABLE)
        test_isbn_avail = "978-TEST-AVAIL-01"
        book_avail = db.query(Book).filter(Book.isbn == test_isbn_avail).first()
        if not book_avail:
            book_avail = Book(
                isbn=test_isbn_avail,
                title="Sách Test Vẫn Còn (Không được đặt trước)",
                category_id=cat.id,
                publisher_id=pub.id,
            )
            db.add(book_avail)
            db.flush()

        copy_code_avail = "CP-TEST-AVAIL-01"
        copy_avail = db.query(BookCopy).filter(BookCopy.copy_code == copy_code_avail).first()
        if not copy_avail:
            copy_avail = BookCopy(
                book_isbn=test_isbn_avail,
                copy_code=copy_code_avail,
                shelf_location="Kệ B2 - Tầng 2",
                imported_at=datetime.now().date(),
                condition="MỚI",
                status="AVAILABLE",
            )
            db.add(copy_avail)
            db.flush()
        else:
            copy_avail.status = "AVAILABLE"
            db.flush()

        # Xóa các reservation cũ của test books
        db.query(Reservation).filter(Reservation.book_isbn.in_([test_isbn_out, test_isbn_avail])).delete(synchronize_session=False)
        db.commit()

        # -------------------------------------------------------------
        # TEST 1: Không được đặt trước nếu sách VẪN CÒN bản sao khả dụng
        # -------------------------------------------------------------
        print("\n[TEST 1] Đặt trước sách khi VẪN CÒN bản sao khả dụng...")
        try:
            create_reservation(db, user_id=readers[0].id, book_isbn=test_isbn_avail)
            assert False, "Lẽ ra phải chặn khi sách còn bản sao!"
        except Exception as e:
            print(f"  -> Bị chặn chính xác: {e.detail}")
            assert "khả dụng" in str(e.detail)

        # -------------------------------------------------------------
        # TEST 2: Đặt trước thành công khi sách ĐÃ HẾT bản sao (FIFO)
        # -------------------------------------------------------------
        print("\n[TEST 2] Độc giả 1 và Độc giả 2 đặt trước đầu sách đã hết...")
        res1 = create_reservation(db, user_id=readers[0].id, book_isbn=test_isbn_out)
        print(f"  -> Reader 1 đặt thành công ID #{res1['id']}, Status: {res1['status']}, Vị trí hàng chờ: #{res1['queue_position']}")
        assert res1["status"] == "WAITING"
        assert res1["queue_position"] == 1

        res2 = create_reservation(db, user_id=readers[1].id, book_isbn=test_isbn_out)
        print(f"  -> Reader 2 đặt thành công ID #{res2['id']}, Status: {res2['status']}, Vị trí hàng chờ: #{res2['queue_position']}")
        assert res2["status"] == "WAITING"
        assert res2["queue_position"] == 2

        # -------------------------------------------------------------
        # TEST 3: Chặn đặt trùng lặp cùng một đầu sách
        # -------------------------------------------------------------
        print("\n[TEST 3] Kiểm tra chặn đặt trùng lặp...")
        try:
            create_reservation(db, user_id=readers[0].id, book_isbn=test_isbn_out)
            assert False, "Lẽ ra phải chặn đặt trùng!"
        except Exception as e:
            print(f"  -> Bị chặn chính xác: {e.detail}")
            assert "đang hiệu lực" in str(e.detail)

        # -------------------------------------------------------------
        # TEST 4: Chặn khi vượt quá tối đa 3 lượt/người
        # -------------------------------------------------------------
        print("\n[TEST 4] Kiểm tra giới hạn tối đa 3 lượt/người...")
        # Tạo thêm 2 đầu sách hết khác
        extra_isbns = ["978-TEST-EXTRA-01", "978-TEST-EXTRA-02", "978-TEST-EXTRA-03"]
        for isbn in extra_isbns:
            b = db.query(Book).filter(Book.isbn == isbn).first()
            if not b:
                b = Book(isbn=isbn, title=f"Sách Extra {isbn}", category_id=cat.id, publisher_id=pub.id)
                db.add(b)
                db.flush()
            # Xóa các reservation cũ nếu có
            db.query(Reservation).filter(Reservation.book_isbn == isbn).delete(synchronize_session=False)
        db.commit()

        # Reader 1 đặt thêm cuốn 2 và cuốn 3
        res_extra1 = create_reservation(db, user_id=readers[0].id, book_isbn=extra_isbns[0])
        res_extra2 = create_reservation(db, user_id=readers[0].id, book_isbn=extra_isbns[1])
        print(f"  -> Reader 1 đã đặt tổng cộng 3 cuốn đang WAITING.")

        # Thử đặt cuốn thứ 4
        try:
            create_reservation(db, user_id=readers[0].id, book_isbn=extra_isbns[2])
            assert False, "Lẽ ra phải chặn khi đặt quá 3 cuốn!"
        except Exception as e:
            print(f"  -> Bị chặn chính xác khi vượt quá 3 lượt: {e.detail}")
            assert "tối đa 3 đầu sách" in str(e.detail)

        # Huỷ 2 cuốn extra để dọn dẹp
        cancel_reservation(db, res_extra1["id"], user_id=readers[0].id)
        cancel_reservation(db, res_extra2["id"], user_id=readers[0].id)

        # -------------------------------------------------------------
        # TEST 5: Khi có cuốn được trả -> Người đầu hàng chuyển READY, giữ 2 ngày, bản sao sang RESERVED
        # -------------------------------------------------------------
        print("\n[TEST 5] Mô phỏng trả sách -> Chuyển người đầu hàng sang READY...")
        # Tạo phiếu mượn tương ứng để trả sách
        loan = Loan(
            user_id=readers[3].id,
            borrow_type=BorrowType.WALK_IN,
            status=LoanStatus.BORROWED,
            borrowed_at=datetime.now() - timedelta(days=5),
            due_date=datetime.now() + timedelta(days=2),
        )
        db.add(loan)
        db.flush()
        loan_item = LoanItem(
            loan_id=loan.id,
            book_isbn=test_isbn_out,
            copy_id=copy_out.id,
            due_date=datetime.now() + timedelta(days=2),
        )
        db.add(loan_item)
        db.commit()

        # Thực hiện trả cuốn copy_out
        ret_result = return_single_book_copy(db, book_copy_id=copy_out.id)
        print(f"  -> Trả sách thành công: {ret_result['message']}")

        # Kiểm tra trạng thái bản sao sách
        db.refresh(copy_out)
        print(f"  -> Trạng thái bản sao sau khi trả: {copy_out.status} (Kỳ vọng: RESERVED)")
        assert copy_out.status == "RESERVED"

        # Kiểm tra lượt đặt trước của Reader 1 (đầu hàng)
        r1_record = db.query(Reservation).filter(Reservation.id == res1["id"]).first()
        print(f"  -> Reader 1 (đầu hàng): Status={r1_record.status}, CopyID={r1_record.copy_id}, Deadline={r1_record.pickup_deadline}")
        assert r1_record.status == "READY"
        assert r1_record.copy_id == copy_out.id
        assert r1_record.pickup_deadline is not None
        # Kiểm tra giữ 2 ngày
        expected_deadline = datetime.now() + timedelta(days=2)
        diff_hours = abs((r1_record.pickup_deadline - expected_deadline).total_seconds()) / 3600
        assert diff_hours < 1, "Hạn lấy sách phải là 2 ngày kể từ khi trả!"

        # Kiểm tra Reader 2 vẫn đang WAITING
        r2_record = db.query(Reservation).filter(Reservation.id == res2["id"]).first()
        assert r2_record.status == "WAITING"

        # -------------------------------------------------------------
        # TEST 6: Trang thủ thư xem danh sách READY cần chuẩn bị
        # -------------------------------------------------------------
        print("\n[TEST 6] Thủ thư xem danh sách READY...")
        staff_ready = get_ready_reservations_for_staff(db)
        found_ready = any(r["id"] == res1["id"] for r in staff_ready)
        print(f"  -> Số lượng đơn READY thủ thư nhìn thấy: {len(staff_ready)}, Có đơn của Reader 1: {found_ready}")
        assert found_ready

        # -------------------------------------------------------------
        # TEST 7: Quá hạn 2 ngày -> Chuyển sang EXPIRED và nhường cho người tiếp theo (Reader 2 -> READY)
        # -------------------------------------------------------------
        print("\n[TEST 7] Kiểm tra quá hạn 2 ngày chuyển người tiếp theo...")
        # Giả lập Reader 1 bị quá hạn lấy sách (hạn là 1 giờ trước)
        r1_record.pickup_deadline = datetime.now() - timedelta(hours=1)
        db.commit()

        # Quét quá hạn
        expired_count = check_and_expire_reservations(db)
        print(f"  -> Số đơn quá hạn đã quét và xử lý: {expired_count}")
        assert expired_count >= 1

        db.refresh(r1_record)
        db.refresh(r2_record)
        db.refresh(copy_out)

        print(f"  -> Reader 1 sau khi quá hạn: Status={r1_record.status} (Kỳ vọng: EXPIRED)")
        print(f"  -> Reader 2 sau khi được nhường: Status={r2_record.status} (Kỳ vọng: READY)")
        print(f"  -> Bản sao sách: Status={copy_out.status} (Kỳ vọng: RESERVED)")

        assert r1_record.status == "EXPIRED"
        assert r2_record.status == "READY"
        assert r2_record.copy_id == copy_out.id
        assert copy_out.status == "RESERVED"

        # -------------------------------------------------------------
        # TEST 8: Độc giả huỷ đặt trước khi đang READY -> Nhường sách / Trở về AVAILABLE
        # -------------------------------------------------------------
        print("\n[TEST 8] Reader 2 huỷ đặt trước khi đang READY...")
        cancel_reservation(db, reservation_id=res2["id"], user_id=readers[1].id)

        db.refresh(r2_record)
        db.refresh(copy_out)
        print(f"  -> Reader 2 sau khi huỷ: Status={r2_record.status} (Kỳ vọng: CANCELLED)")
        print(f"  -> Bản sao sách sau khi không còn ai chờ: Status={copy_out.status} (Kỳ vọng: AVAILABLE)")
        assert r2_record.status == "CANCELLED"
        assert copy_out.status == "AVAILABLE"

        # -------------------------------------------------------------
        # TEST 9: Kiểm tra các API Router endpoints
        # -------------------------------------------------------------
        print("\n[TEST 9] Kiểm tra các API Router endpoints...")
        # Đặt lại copy_out thành BORROWED để test API
        copy_out.status = "BORROWED"
        db.commit()

        # API: Đặt trước
        post_res = api_create_reservation(
            payload=ReservationCreate(book_isbn=test_isbn_out),
            user_id=readers[0].id,
            current_user=None,
            db=db,
        )
        new_res_id = post_res["id"]
        print(f"  -> Router api_create_reservation: Thành công ID #{new_res_id}, status={post_res['status']}")

        # API: Danh sách của tôi
        my_list = api_get_my_reservations(user_id=readers[0].id, current_user=None, db=db)
        print(f"  -> Router api_get_my_reservations: Thành công ({len(my_list)} đơn)")
        assert any(r["id"] == new_res_id for r in my_list)

        # API: Huỷ
        cancel_res = api_cancel_reservation(reservation_id=new_res_id, user_id=readers[0].id, current_user=None, db=db)
        print(f"  -> Router api_cancel_reservation: Thành công huỷ ID #{new_res_id}")

        # API: Quét quá hạn
        expired_res = api_check_expired_reservations(db=db)
        print(f"  -> Router api_check_expired_reservations: {expired_res['message']}")

        print("\n" + "=" * 60)
        print("TẤT CẢ CÁC BÀI TEST T3CFCAC ĐÃ VƯỢT QUA 100% HOÀN HẢO!")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    run_all_tests()
