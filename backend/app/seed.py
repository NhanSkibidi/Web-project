"""Dữ liệu mẫu toàn diện cho hệ thống thư viện.

Bao gồm:
- Tài khoản: 1 Admin, 2 Thủ thư, 20 Độc giả (kèm 20 Thẻ thư viện)
- Danh mục sách: 10 Thể loại, 30 Tác giả, 5 Nhà xuất bản
- Kho sách: 60 Đầu sách và các Bản sao sách (BookCopy)

Cách chạy (trong thư mục backend/, đã kích hoạt môi trường ảo):
    python -m app.seed
hoặc:
    python app/seed.py
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models  # noqa: F401 - import để SQLAlchemy nhận diện đầy đủ các bảng
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.Author import Author
from app.models.Book import Book
from app.models.BookAuthor import BookAuthor
from app.models.BookCopy import BookCopy
from app.models.Category import Category
from app.models.Publisher import Publisher
from app.models.library_card import CardStatus, CardType, LibraryCard
from app.models.user import User, UserRole, UserStatus

# ==============================================================================
# 1. CẤU HÌNH & DỮ LIỆU TÀI KHOẢN (USERS & LIBRARY CARDS)
# ==============================================================================

ADMIN_PASSWORD = "Admin@123"
LIBRARIAN_PASSWORD = "Thuthu@123"
READER_PASSWORD = "Docgia@123"

READER_NAMES = [
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thị Dung",
    "Hoàng Văn Em", "Vũ Thị Phương", "Đặng Quốc Huy", "Bùi Thị Lan",
    "Ngô Minh Khoa", "Đỗ Thị Mai", "Dương Văn Nam", "Lý Thị Oanh",
    "Phan Đức Phúc", "Trịnh Thị Quỳnh", "Võ Văn Sơn", "Đinh Thị Thảo",
    "Mai Anh Tuấn", "Hồ Thị Uyên", "Cao Văn Vinh", "Tạ Thị Yến",
]

MAX_BOOKS = {CardType.STANDARD: 5, CardType.STUDENT: 3, CardType.VIP: 10}


# ==============================================================================
# 2. DỮ LIỆU DANH MỤC, TÁC GIẢ, NXB & SÁCH
# ==============================================================================

CATEGORIES = [
    "Công nghệ thông tin",
    "Văn học",
    "Kinh tế",
    "Kỹ năng sống",
    "Lịch sử",
    "Khoa học",
    "Tâm lý học",
    "Giáo dục",
    "Thiếu nhi",
    "Ngoại ngữ",
]

AUTHORS = [
    ("Nguyễn Nhật Ánh", "Nhà văn Việt Nam", "Việt Nam"),
    ("Nam Cao", "Nhà văn hiện thực", "Việt Nam"),
    ("Tô Hoài", "Nhà văn Việt Nam", "Việt Nam"),
    ("Xuân Diệu", "Nhà thơ Việt Nam", "Việt Nam"),
    ("Nguyễn Du", "Đại thi hào Việt Nam", "Việt Nam"),
    ("Nguyễn Huy Thiệp", "Nhà văn Việt Nam", "Việt Nam"),
    ("Dale Carnegie", "Tác giả sách kỹ năng", "Mỹ"),
    ("Robert Kiyosaki", "Tác giả sách kinh tế", "Mỹ"),
    ("Paulo Coelho", "Nhà văn", "Brazil"),
    ("George Orwell", "Nhà văn", "Anh"),
    ("J.K. Rowling", "Nhà văn", "Anh"),
    ("Stephen King", "Nhà văn", "Mỹ"),
    ("Haruki Murakami", "Nhà văn", "Nhật Bản"),
    ("Yuval Noah Harari", "Nhà sử học", "Israel"),
    ("Adam Smith", "Nhà kinh tế học", "Scotland"),
    ("Antoine de Saint-Exupéry", "Nhà văn", "Pháp"),
    ("Mark Twain", "Nhà văn", "Mỹ"),
    ("Ernest Hemingway", "Nhà văn", "Mỹ"),
    ("F. Scott Fitzgerald", "Nhà văn", "Mỹ"),
    ("Victor Hugo", "Nhà văn", "Pháp"),
    ("William Shakespeare", "Nhà viết kịch", "Anh"),
    ("Lev Tolstoy", "Nhà văn", "Nga"),
    ("Charles Dickens", "Nhà văn", "Anh"),
    ("Jane Austen", "Nhà văn", "Anh"),
    ("Daniel Kahneman", "Nhà tâm lý học", "Israel"),
    ("James Clear", "Tác giả sách kỹ năng", "Mỹ"),
    ("Robert C. Martin", "Tác giả sách lập trình", "Mỹ"),
    ("Andrew Hunt", "Tác giả sách lập trình", "Mỹ"),
    ("Eric Matthes", "Tác giả sách lập trình", "Mỹ"),
    ("Bjarne Stroustrup", "Tác giả sách lập trình", "Đan Mạch"),
]

PUBLISHERS = [
    "Nhà xuất bản Kim Đồng",
    "Nhà xuất bản Trẻ",
    "Nhà xuất bản Giáo dục Việt Nam",
    "Nhà xuất bản Tổng hợp TP.HCM",
    "Nhà xuất bản Thế Giới",
]

BOOKS = [
    ("Dế Mèn Phiêu Lưu Ký", "Thiếu nhi"),
    ("Mắt Biếc", "Văn học"),
    ("Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "Văn học"),
    ("Cho Tôi Xin Một Vé Đi Tuổi Thơ", "Văn học"),
    ("Kính Vạn Hoa", "Thiếu nhi"),
    ("Lão Hạc", "Văn học"),
    ("Chí Phèo", "Văn học"),
    ("Số Đỏ", "Văn học"),
    ("Truyện Kiều", "Văn học"),
    ("Vợ Nhặt", "Văn học"),
    ("Đắc Nhân Tâm", "Kỹ năng sống"),
    ("Quẳng Gánh Lo Đi Và Vui Sống", "Kỹ năng sống"),
    ("Cha Giàu Cha Nghèo", "Kinh tế"),
    ("Nhà Đầu Tư Thông Minh", "Kinh tế"),
    ("Nghĩ Giàu Làm Giàu", "Kinh tế"),
    ("Người Giàu Có Nhất Thành Babylon", "Kinh tế"),
    ("Nhà Giả Kim", "Văn học"),
    ("1984", "Văn học"),
    ("Harry Potter Và Hòn Đá Phù Thủy", "Thiếu nhi"),
    ("Chuyện Con Mèo Dạy Hải Âu Bay", "Thiếu nhi"),
    ("Hoàng Tử Bé", "Thiếu nhi"),
    ("Tom Sawyer", "Thiếu nhi"),
    ("Ông Già Và Biển Cả", "Văn học"),
    ("Đại Gia Gatsby", "Văn học"),
    ("Những Người Khốn Khổ", "Văn học"),
    ("Romeo Và Juliet", "Văn học"),
    ("Chiến Tranh Và Hòa Bình", "Văn học"),
    ("Oliver Twist", "Văn học"),
    ("Kiêu Hãnh Và Định Kiến", "Văn học"),
    ("Tư Duy Nhanh Và Chậm", "Tâm lý học"),
    ("Atomic Habits", "Kỹ năng sống"),
    ("Clean Code", "Công nghệ thông tin"),
    ("The Pragmatic Programmer", "Công nghệ thông tin"),
    ("Python Crash Course", "Công nghệ thông tin"),
    ("Lập Trình C++ Cơ Bản", "Công nghệ thông tin"),
    ("Lập Trình Python Cơ Bản", "Công nghệ thông tin"),
    ("Cấu Trúc Dữ Liệu Và Giải Thuật", "Công nghệ thông tin"),
    ("Giải Thuật Và Lập Trình", "Công nghệ thông tin"),
    ("Nhập Môn Trí Tuệ Nhân Tạo", "Công nghệ thông tin"),
    ("Cơ Sở Dữ Liệu", "Công nghệ thông tin"),
    ("Lịch Sử Việt Nam", "Lịch sử"),
    ("Đại Việt Sử Ký Toàn Thư", "Lịch sử"),
    ("Lược Sử Loài Người", "Lịch sử"),
    ("Lược Sử Thế Giới", "Lịch sử"),
    ("Vũ Trụ Trong Vỏ Hạt Dẻ", "Khoa học"),
    ("Lược Sử Thời Gian", "Khoa học"),
    ("Nguồn Gốc Các Loài", "Khoa học"),
    ("Bí Ẩn Của Vật Chất", "Khoa học"),
    ("Tâm Lý Học Đám Đông", "Tâm lý học"),
    ("Đi Tìm Lẽ Sống", "Tâm lý học"),
    ("Tâm Lý Học Thành Công", "Tâm lý học"),
    ("Đánh Thức Con Người Phi Thường Trong Bạn", "Kỹ năng sống"),
    ("Tuổi Trẻ Đáng Giá Bao Nhiêu", "Kỹ năng sống"),
    ("Tôi Tài Giỏi, Bạn Cũng Thế", "Giáo dục"),
    ("Học Khôn Ngoan Mà Không Gian Nan", "Giáo dục"),
    ("English Grammar In Use", "Ngoại ngữ"),
    ("Oxford Word Skills", "Ngoại ngữ"),
    ("Basic Japanese", "Ngoại ngữ"),
    ("Minna No Nihongo", "Ngoại ngữ"),
    ("Từ Điển Tiếng Anh", "Ngoại ngữ"),
]


# ==============================================================================
# 3. CÁC HÀM TIỆN ÍCH (HELPERS)
# ==============================================================================

def get_or_create(db: Session, model, filters: dict, values: dict):
    """Tìm bản ghi theo filter, nếu chưa có thì thêm mới."""
    item = db.query(model).filter_by(**filters).first()
    if item:
        return item
    item = model(**values)
    db.add(item)
    db.flush()
    return item


def make_isbn(number: int) -> str:
    """Tạo mã chuẩn ISBN-13 hợp lệ kèm số kiểm tra checksum."""
    first_12 = f"978604{number:06d}"
    total = sum(
        int(digit) * (1 if index % 2 == 0 else 3)
        for index, digit in enumerate(first_12)
    )
    check_digit = (10 - total % 10) % 10
    return first_12 + str(check_digit)


# ==============================================================================
# 4. HÀM SEED TỪNG THÀNH PHẦN
# ==============================================================================

def seed_users(db: Session) -> list[User]:
    """Tạo 1 Admin, 2 Thủ thư và 20 Độc giả."""
    db.add(User(
        email="admin@library.com",
        password_hash=hash_password(ADMIN_PASSWORD),
        full_name="Quản Trị Viên",
        phone="0900000001",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    ))

    for i in range(1, 3):
        db.add(User(
            email=f"thuthu{i}@library.com",
            password_hash=hash_password(LIBRARIAN_PASSWORD),
            full_name=f"Thủ Thư {i}",
            phone=f"090000010{i}",
            role=UserRole.LIBRARIAN,
            status=UserStatus.ACTIVE,
        ))

    readers = []
    for i, name in enumerate(READER_NAMES, start=1):
        reader = User(
            email=f"docgia{i:02d}@library.com",
            password_hash=hash_password(READER_PASSWORD),
            full_name=name,
            phone=f"09123456{i:02d}",
            role=UserRole.READER,
            status=UserStatus.LOCKED if i == 20 else UserStatus.ACTIVE,
        )
        db.add(reader)
        readers.append(reader)

    db.flush()
    return readers


def seed_cards(db: Session, readers: list[User]) -> None:
    """Cấp thẻ thư viện tương ứng cho từng độc giả."""
    today = date.today()
    card_types = [CardType.STANDARD, CardType.STUDENT, CardType.VIP]

    for i, reader in enumerate(readers, start=1):
        card_type = card_types[(i - 1) % 3]
        issue_date = today - timedelta(days=30)
        expiry_date = issue_date + timedelta(days=365)
        status = CardStatus.ACTIVE

        if i == 19:
            issue_date = today - timedelta(days=730)
            expiry_date = issue_date + timedelta(days=365)
            status = CardStatus.EXPIRED
        elif i == 20:
            status = CardStatus.LOCKED

        db.add(LibraryCard(
            card_code=f"LC-{i:04d}",
            reader_id=reader.id,
            card_type=card_type,
            issue_date=issue_date,
            expiry_date=expiry_date,
            max_borrow_books=MAX_BOOKS[card_type],
            status=status,
        ))


def seed_users_and_cards(db: Session) -> None:
    """Kiểm tra và tạo tài khoản + thẻ thư viện."""
    if db.scalar(select(func.count()).select_from(User)) > 0:
        print("[SEED USERS] Bảng users đã có dữ liệu -> Bỏ qua phần tạo tài khoản.")
        return

    readers = seed_users(db)
    seed_cards(db, readers)
    db.commit()
    print("[SEED USERS] Tạo thành công 1 Admin, 2 Thủ thư, 20 Độc giả và 20 Thẻ thư viện.")
    print(f"  - Admin:    admin@library.com / {ADMIN_PASSWORD}")
    print(f"  - Thủ thư:  thuthu1@library.com, thuthu2@library.com / {LIBRARIAN_PASSWORD}")
    print(f"  - Độc giả:  docgia01@library.com ... docgia20@library.com / {READER_PASSWORD}")


def seed_books_and_catalogs(db: Session) -> None:
    """Tạo danh mục thể loại, tác giả, nhà xuất bản, đầu sách và các bản sao sách."""
    print("[SEED BOOKS] Đang khởi tạo thể loại, tác giả, NXB, sách và bản sao...")

    categories = {}
    for name in CATEGORIES:
        category = get_or_create(db, Category, {"name": name}, {"name": name})
        categories[name] = category

    authors = []
    for name, biography, nationality in AUTHORS:
        author = get_or_create(
            db,
            Author,
            {"name": name},
            {"name": name, "biography": biography, "nationality": nationality},
        )
        authors.append(author)

    publishers = []
    for name in PUBLISHERS:
        publisher = get_or_create(db, Publisher, {"name": name}, {"name": name})
        publishers.append(publisher)

    for index, (title, category_name) in enumerate(BOOKS, start=1):
        isbn = make_isbn(index)
        author = authors[(index - 1) % len(authors)]
        publisher = publishers[(index - 1) % len(publishers)]
        category = categories[category_name]

        book = get_or_create(
            db,
            Book,
            {"isbn": isbn},
            {
                "isbn": isbn,
                "title": title,
                "category_id": category.id,
                "publisher_id": publisher.id,
                "publish_year": 2010 + index % 15,
                "page_count": 150 + index * 5,
                "language": "Tiếng Việt",
                "description": f"Giới thiệu về cuốn sách {title}",
                "price": Decimal(50000 + index * 5000),
            },
        )

        book_author = db.query(BookAuthor).filter_by(
            book_isbn=book.isbn,
            author_id=author.id,
        ).first()

        if not book_author:
            db.add(BookAuthor(book_isbn=book.isbn, author_id=author.id))

        copy_count = 2 + index % 4
        for copy_number in range(1, copy_count + 1):
            copy_code = f"BC-{isbn}-{copy_number:02d}"
            get_or_create(
                db,
                BookCopy,
                {"copy_code": copy_code},
                {
                    "book_isbn": book.isbn,
                    "copy_code": copy_code,
                    "shelf_location": f"Kệ A{(index - 1) % 5 + 1}",
                    "imported_at": date.today(),
                    "condition": "MỚI",
                    "status": "AVAILABLE",
                },
            )

    db.commit()
    print(f"[SEED BOOKS] Hoàn tất: {len(CATEGORIES)} thể loại, {len(AUTHORS)} tác giả, {len(PUBLISHERS)} NXB, {len(BOOKS)} đầu sách và các bản sao.")


# ==============================================================================
# 5. HÀM CHÍNH GỘP TẤT CẢ (ENTRY POINTS)
# ==============================================================================

def seed_data(db: Session | None = None) -> None:
    """Hàm chạy toàn bộ quá trình seed (cả users lẫn books)."""
    if db is not None:
        try:
            seed_users_and_cards(db)
            seed_books_and_catalogs(db)
        except Exception as e:
            db.rollback()
            print("[SEED] Lỗi:", e)
            raise
    else:
        with SessionLocal() as session:
            try:
                seed_users_and_cards(session)
                seed_books_and_catalogs(session)
            except Exception as e:
                session.rollback()
                print("[SEED] Lỗi:", e)
                raise

if __name__ == "__main__":
    print("=" * 60)
    print("BẮT ĐẦU SEED DỮ LIỆU TOÀN DIỆN CHO CSDL")
    print("=" * 60)
    Base.metadata.create_all(bind=engine)
    seed_data()
    print("=" * 60)
    print("ĐÃ SEED TOÀN BỘ DỮ LIỆU THÀNH CÔNG!")
    print("=" * 60)
