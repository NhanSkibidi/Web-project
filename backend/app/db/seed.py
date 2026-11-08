"""Tạo dữ liệu mẫu: 1 Admin, 2 thủ thư, 20 độc giả (mỗi độc giả 1 thẻ thư viện).

Cách chạy (trong thư mục backend/, đã bật môi trường ảo):
    python -m app.db.seed

Chạy lại nhiều lần vẫn an toàn: nếu DB đã có user thì bỏ qua, không thêm trùng.
Muốn làm lại từ đầu: xoá dữ liệu 2 bảng library_cards, users rồi chạy lại.
"""
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models  # noqa: F401 - để SQLAlchemy biết các bảng
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.library_card import CardStatus, CardType, LibraryCard
from app.models.user import User, UserRole, UserStatus

# Mật khẩu của tài khoản mẫu (chỉ dùng khi học/dev)
ADMIN_PASSWORD = "Admin@123"
LIBRARIAN_PASSWORD = "Thuthu@123"
READER_PASSWORD = "Docgia@123"

# 20 tên độc giả
READER_NAMES = [
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thị Dung",
    "Hoàng Văn Em", "Vũ Thị Phương", "Đặng Quốc Huy", "Bùi Thị Lan",
    "Ngô Minh Khoa", "Đỗ Thị Mai", "Dương Văn Nam", "Lý Thị Oanh",
    "Phan Đức Phúc", "Trịnh Thị Quỳnh", "Võ Văn Sơn", "Đinh Thị Thảo",
    "Mai Anh Tuấn", "Hồ Thị Uyên", "Cao Văn Vinh", "Tạ Thị Yến",
]

# Số sách được mượn tối đa theo từng loại thẻ
MAX_BOOKS = {CardType.STANDARD: 5, CardType.STUDENT: 3, CardType.VIP: 10}


def seed_users(db: Session) -> list[User]:
    """Thêm 1 admin + 2 thủ thư + 20 độc giả. Trả về danh sách độc giả."""
    db.add(User(
        email="admin@library.com", password_hash=hash_password(ADMIN_PASSWORD),
        full_name="Quản Trị Viên", phone="0900000001",
        role=UserRole.ADMIN, status=UserStatus.ACTIVE,
    ))

    for i in range(1, 3):  # i = 1, 2
        db.add(User(
            email=f"thuthu{i}@library.com", password_hash=hash_password(LIBRARIAN_PASSWORD),
            full_name=f"Thủ Thư {i}", phone=f"090000010{i}",
            role=UserRole.LIBRARIAN, status=UserStatus.ACTIVE,
        ))

    readers = []
    for i, name in enumerate(READER_NAMES, start=1):  # i = 1..20
        reader = User(
            email=f"docgia{i:02d}@library.com",  # docgia01, docgia02, ... docgia20
            password_hash=hash_password(READER_PASSWORD),
            full_name=name, phone=f"09123456{i:02d}",
            role=UserRole.READER,
            # Độc giả cuối cùng bị khoá để có dữ liệu thử chức năng khoá/mở khoá
            status=UserStatus.LOCKED if i == 20 else UserStatus.ACTIVE,
        )
        db.add(reader)
        readers.append(reader)

    db.flush()  # gửi INSERT xuống DB để các user có id (cần id để tạo thẻ)
    return readers


def seed_cards(db: Session, readers: list[User]) -> None:
    """Mỗi độc giả 1 thẻ thư viện."""
    today = date.today()
    card_types = [CardType.STANDARD, CardType.STUDENT, CardType.VIP]

    for i, reader in enumerate(readers, start=1):
        card_type = card_types[(i - 1) % 3]  # lần lượt STANDARD, STUDENT, VIP, ...
        issue_date = today - timedelta(days=30)
        expiry_date = issue_date + timedelta(days=365)
        status = CardStatus.ACTIVE

        if i == 19:  # thẻ đã hết hạn: cấp từ 2 năm trước, hết hạn 1 năm trước
            issue_date = today - timedelta(days=730)
            expiry_date = issue_date + timedelta(days=365)
            status = CardStatus.EXPIRED
        elif i == 20:  # thẻ bị khoá (cùng độc giả bị khoá tài khoản)
            status = CardStatus.LOCKED

        db.add(LibraryCard(
            card_code=f"LC-{i:04d}",  # LC-0001, LC-0002, ...
            reader_id=reader.id,
            card_type=card_type,
            issue_date=issue_date,
            expiry_date=expiry_date,
            max_borrow_books=MAX_BOOKS[card_type],
            status=status,
        ))


def run_seed(db: Session) -> None:
    # Nếu đã có user rồi thì không thêm nữa (tránh lỗi trùng email)
    if db.scalar(select(func.count()).select_from(User)) > 0:
        print("[SEED] Bảng users đã có dữ liệu -> bỏ qua.")
        return

    readers = seed_users(db)
    seed_cards(db, readers)
    db.commit()
    print("[SEED] Xong: 1 admin, 2 thủ thư, 20 độc giả, 20 thẻ thư viện.")
    print(f"[SEED] Admin: admin@library.com / {ADMIN_PASSWORD}")
    print(f"[SEED] Thủ thư: thuthu1@library.com / {LIBRARIAN_PASSWORD}")
    print(f"[SEED] Độc giả: docgia01@library.com ... docgia20@library.com / {READER_PASSWORD}")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)  # đảm bảo bảng đã được tạo
    with SessionLocal() as session:
        run_seed(session)
