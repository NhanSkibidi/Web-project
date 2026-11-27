"""Dữ liệu mẫu toàn diện cho hệ thống thư viện (phục vụ chạy app & demo bảo vệ).

Bao gồm:
- Tài khoản: 1 Admin, 2 Thủ thư, 20 Độc giả (kèm 20 Thẻ thư viện)
- Danh mục sách: 10 Thể loại, 30 Tác giả, 5 Nhà xuất bản
- Kho sách: 60 Đầu sách và các Bản sao sách (BookCopy)
- Nghiệp vụ demo đầy đủ:
  + Phiếu mượn (PENDING, APPROVED, BORROWED quá hạn/sắp đến hạn/còn hạn, RETURNED, REJECTED, CANCELLED)
  + Đặt trước (WAITING xếp hàng FIFO, READY giữ chỗ 48h, FULFILLED, EXPIRED, CANCELLED) + đầu sách hết bản sao
  + Phiếu phạt (UNPAID, PAID có thu trong kỳ & hôm nay, WAIVED miễn phạt; đủ loại QUÁ HẠN, HỎNG, MẤT)
  + Thông báo in-app mẫu (OVERDUE, RESERVATION)

Cách chạy (trong thư mục backend/, đã kích hoạt môi trường ảo):
    python -m app.seed
hoặc:
    python app/seed.py
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
import sys

# Đảm bảo import được `app.*` kể cả khi chạy trực tiếp `python app/seed.py`
_BACKEND_DIR = str(Path(__file__).resolve().parents[1])
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

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
from app.models.CopyStatusLog import CopyStatusLog
from app.models.Publisher import Publisher
from app.models.card_action_log import CardActionLog
from app.models.fine import Fine
from app.models.library_card import CardStatus, CardType, LibraryCard
from app.models.user import User, UserRole, UserStatus
from app.models.loan import Loan, LoanStatus, BorrowType
from app.models.loan_item import LoanItem
from app.models.notification import Notification
from app.models.reservation import Reservation, ReservationStatus

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

CATEGORY_DESCRIPTIONS = {
    "Công nghệ thông tin": "Giáo trình và tài liệu chuyên sâu về lập trình, cơ sở dữ liệu, hệ thống và trí tuệ nhân tạo.",
    "Văn học": "Tiểu thuyết, truyện ngắn, thơ ca kinh điển Việt Nam và thế giới.",
    "Kinh tế": "Tài liệu về kinh tế học, quản trị kinh doanh, đầu tư và tài chính cá nhân.",
    "Kỹ năng sống": "Sách phát triển bản thân, giao tiếp, quản lý thời gian và xây dựng thói quen.",
    "Lịch sử": "Sách nghiên cứu lịch sử Việt Nam, lịch sử văn minh và tiến trình nhân loại.",
    "Khoa học": "Tác phẩm khoa học phổ thông, vật lý, vũ trụ và khoa học tự nhiên.",
    "Tâm lý học": "Nghiên cứu hành vi, tâm lý nhận thức và sức khỏe tinh thần.",
    "Giáo dục": "Phương pháp học tập, giảng dạy và phát triển tư duy giáo dục.",
    "Thiếu nhi": "Truyện thiếu nhi, văn học tuổi học trò và sách giáo dục cho trẻ em.",
    "Ngoại ngữ": "Giáo trình học tiếng Anh, tiếng Nhật, từ vựng và ngữ pháp thực hành.",
}

FOREIGN_BOOK_LANGUAGES = {
    "Atomic Habits": "Tiếng Anh",
    "Clean Code": "Tiếng Anh",
    "The Pragmatic Programmer": "Tiếng Anh",
    "Python Crash Course": "Tiếng Anh",
    "English Grammar In Use": "Tiếng Anh",
    "Oxford Word Skills": "Tiếng Anh",
    "Basic Japanese": "Tiếng Nhật",
    "Minna No Nihongo": "Tiếng Nhật",
}

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

PUBLISHER_DETAILS = {
    "Nhà xuất bản Kim Đồng": {
        "address": "55 Quang Trung, Hai Bà Trưng, Hà Nội",
        "description": "Nhà xuất bản sách thiếu nhi, truyện tranh và văn học tuổi trẻ hàng đầu Việt Nam.",
    },
    "Nhà xuất bản Trẻ": {
        "address": "161B Lý Chính Thắng, Quận 3, TP. Hồ Chí Minh",
        "description": "Đơn vị xuất bản nổi tiếng về văn học hiện đại, kỹ năng sống và sách kinh tế.",
    },
    "Nhà xuất bản Giáo dục Việt Nam": {
        "address": "81 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
        "description": "Nhà xuất bản chuyên sách giáo khoa, giáo trình đại học và tài liệu tham khảo.",
    },
    "Nhà xuất bản Tổng hợp TP.HCM": {
        "address": "62 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh",
        "description": "Xuất bản đa dạng sách lịch sử, khoa học, nghiên cứu và văn hóa.",
    },
    "Nhà xuất bản Thế Giới": {
        "address": "46 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
        "description": "Đơn vị xuất bản sách ngoại văn, đối ngoại và dịch thuật văn hóa quốc tế.",
    },
}

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
        desc = CATEGORY_DESCRIPTIONS.get(name, f"Danh mục sách thuộc lĩnh vực {name}")
        category = get_or_create(
            db,
            Category,
            {"name": name},
            {"name": name, "description": desc},
        )
        if not category.description:
            category.description = desc
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
        p_info = PUBLISHER_DETAILS.get(name, {})
        p_addr = p_info.get("address", "Việt Nam")
        p_desc = p_info.get("description", f"Đơn vị phát hành và xuất bản: {name}")
        publisher = get_or_create(
            db,
            Publisher,
            {"name": name},
            {"name": name, "address": p_addr, "description": p_desc},
        )
        if not publisher.address:
            publisher.address = p_addr
        if not publisher.description:
            publisher.description = p_desc
        publishers.append(publisher)

    cover_dir = Path(_BACKEND_DIR) / "uploads" / "book_covers"

    for index, (title, category_name) in enumerate(BOOKS, start=1):
        isbn = make_isbn(index)
        author = authors[(index - 1) % len(authors)]
        publisher = publishers[(index - 1) % len(publishers)]
        category = categories[category_name]
        lang = FOREIGN_BOOK_LANGUAGES.get(title, "Tiếng Việt")
        cover_rel = None
        for ext in (".jpg", ".png"):
            if (cover_dir / f"{isbn}{ext}").is_file():
                cover_rel = f"/uploads/book_covers/{isbn}{ext}"
                break

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
                "language": lang,
                "description": f"Giới thiệu nội dung, kiến thức cốt lõi và hướng dẫn đọc cuốn '{title}' ({category_name}).",
                "cover_image": cover_rel,
                "price": Decimal(50000 + index * 5000),
            },
        )
        if cover_rel and not book.cover_image:
            book.cover_image = cover_rel
        if lang != "Tiếng Việt" and book.language == "Tiếng Việt":
            book.language = lang

        book_author = db.query(BookAuthor).filter_by(
            book_isbn=book.isbn,
            author_id=author.id,
        ).first()

        if not book_author:
            db.add(BookAuthor(book_isbn=book.isbn, author_id=author.id))

        copy_count = 2 + index % 4
        for copy_number in range(1, copy_count + 1):
            copy_code = f"BC-{isbn}-{copy_number:02d}"
            cond = "CŨ" if (index % 4 == 0 and copy_number == copy_count) else "MỚI"
            get_or_create(
                db,
                BookCopy,
                {"copy_code": copy_code},
                {
                    "book_isbn": book.isbn,
                    "copy_code": copy_code,
                    "shelf_location": f"Kệ A{(index - 1) % 5 + 1}",
                    "imported_at": date.today(),
                    "condition": cond,
                    "status": "AVAILABLE",
                },
            )

    db.commit()
    print(f"[SEED BOOKS] Hoàn tất: {len(CATEGORIES)} thể loại, {len(AUTHORS)} tác giả, {len(PUBLISHERS)} NXB, {len(BOOKS)} đầu sách và các bản sao.")


# ==============================================================================
# 5. DỮ LIỆU PHIẾU MƯỢN MẪU (QUÁ HẠN, SẮP ĐẾN HẠN & THÔNG BÁO)
# ==============================================================================

def seed_loans_and_overdue(db: Session) -> None:
    """Tạo các phiếu mượn quá hạn và sắp đến hạn mẫu phục vụ Task T3CFF48."""
    existing_loans = db.query(Loan).first()
    if existing_loans:
        print("[SEED LOANS] Đã có dữ liệu phiếu mượn, bỏ qua.")
        return

    readers = db.query(User).filter(User.role == UserRole.READER).order_by(User.id.asc()).limit(5).all()
    if not readers:
        return

    librarian = (
        db.query(User)
        .filter(User.role.in_([UserRole.LIBRARIAN, UserRole.ADMIN]))
        .order_by(User.id.asc())
        .first()
    )
    lib_id = librarian.id if librarian else None

    copies = db.query(BookCopy).filter(BookCopy.status == "AVAILABLE").order_by(BookCopy.id.asc()).limit(10).all()
    if not copies:
        return

    now = datetime.now()

    # 1. Phiếu quá hạn 18 ngày cho reader[0]
    c1 = copies[0]
    c1.status = "BORROWED"
    l1 = Loan(
        user_id=readers[0].id,
        processed_by=lib_id,
        borrow_type=BorrowType.WALK_IN,
        status=LoanStatus.BORROWED,
        created_at=now - timedelta(days=32),
        borrowed_at=now - timedelta(days=32),
        due_date=now - timedelta(days=18),
    )
    db.add(l1)
    db.flush()
    i1 = LoanItem(
        loan_id=l1.id,
        book_isbn=c1.book_isbn,
        copy_id=c1.id,
        due_date=now - timedelta(days=18),
        renewal_count=0,
    )
    db.add(i1)
    db.add(CopyStatusLog(book_copy_id=c1.id, old_status="AVAILABLE", new_status="BORROWED", reason=f"Cho mượn tại quầy phiếu #{l1.id} (seed)"))

    # 2. Phiếu quá hạn 14 ngày cho reader[1]
    if len(copies) > 1 and len(readers) > 1:
        c2 = copies[1]
        c2.status = "BORROWED"
        l2 = Loan(
            user_id=readers[1].id,
            processed_by=lib_id,
            borrow_type=BorrowType.WALK_IN,
            status=LoanStatus.BORROWED,
            created_at=now - timedelta(days=28),
            borrowed_at=now - timedelta(days=28),
            due_date=now - timedelta(days=14),
        )
        db.add(l2)
        db.flush()
        i2 = LoanItem(
            loan_id=l2.id,
            book_isbn=c2.book_isbn,
            copy_id=c2.id,
            due_date=now - timedelta(days=14),
            renewal_count=0,
        )
        db.add(i2)
        db.add(CopyStatusLog(book_copy_id=c2.id, old_status="AVAILABLE", new_status="BORROWED", reason=f"Cho mượn tại quầy phiếu #{l2.id} (seed)"))

    # 3. Phiếu sắp đến hạn trong 1 ngày cho reader[2]
    if len(copies) > 2 and len(readers) > 2:
        c3 = copies[2]
        c3.status = "BORROWED"
        l3 = Loan(
            user_id=readers[2].id,
            processed_by=lib_id,
            borrow_type=BorrowType.ONLINE,
            status=LoanStatus.BORROWED,
            created_at=now - timedelta(days=13),
            borrowed_at=now - timedelta(days=13),
            due_date=now + timedelta(days=1),
        )
        db.add(l3)
        db.flush()
        i3 = LoanItem(
            loan_id=l3.id,
            book_isbn=c3.book_isbn,
            copy_id=c3.id,
            due_date=now + timedelta(days=1),
            renewal_count=0,
        )
        db.add(i3)
        db.add(CopyStatusLog(book_copy_id=c3.id, old_status="AVAILABLE", new_status="BORROWED", reason=f"Bàn giao phiếu mượn online #{l3.id} (seed)"))

    # 4. Phiếu sắp đến hạn trong 2 ngày cho reader[3]
    if len(copies) > 3 and len(readers) > 3:
        c4 = copies[3]
        c4.status = "BORROWED"
        l4 = Loan(
            user_id=readers[3].id,
            processed_by=lib_id,
            borrow_type=BorrowType.ONLINE,
            status=LoanStatus.BORROWED,
            created_at=now - timedelta(days=12),
            borrowed_at=now - timedelta(days=12),
            due_date=now + timedelta(days=2),
        )
        db.add(l4)
        db.flush()
        i4 = LoanItem(
            loan_id=l4.id,
            book_isbn=c4.book_isbn,
            copy_id=c4.id,
            due_date=now + timedelta(days=2),
            renewal_count=0,
        )
        db.add(i4)
        db.add(CopyStatusLog(book_copy_id=c4.id, old_status="AVAILABLE", new_status="BORROWED", reason=f"Bàn giao phiếu mượn online #{l4.id} (seed)"))

    db.commit()
    print("[SEED LOANS] Đã tạo các phiếu mượn quá hạn và sắp đến hạn mẫu thành công!")


# ==============================================================================
# 6. DỮ LIỆU DEMO ĐẦY ĐỦ: PHIẾU MƯỢN, ĐẶT TRƯỚC, PHIẾU PHẠT & THÔNG BÁO
# ==============================================================================

def _get_staff_and_readers(db: Session) -> tuple[User | None, User | None, list[User]]:
    """Lấy tài khoản Admin, Thủ thư đầu tiên và danh sách Độc giả theo ID."""
    admin = (
        db.query(User)
        .filter(User.role == UserRole.ADMIN)
        .order_by(User.id.asc())
        .first()
    )
    librarian = (
        db.query(User)
        .filter(User.role == UserRole.LIBRARIAN)
        .order_by(User.id.asc())
        .first()
    ) or admin
    readers = (
        db.query(User)
        .filter(User.role == UserRole.READER, User.status == UserStatus.ACTIVE)
        .order_by(User.id.asc())
        .all()
    )
    return admin, librarian, readers


def _reserved_demo_isbns() -> set[str]:
    """Các đầu sách ưu tiên giữ lại bản sao để demo Đặt trước / Hết sách."""
    return {
        make_isbn(11),  # Đắc Nhân Tâm
        make_isbn(17),  # Nhà Giả Kim
        make_isbn(31),  # Atomic Habits
        make_isbn(32),  # Clean Code
        make_isbn(33),  # The Pragmatic Programmer
    }


def _pick_available_copy(
    db: Session,
    preferred_isbn: str | None = None,
    exclude_isbns: set[str] | None = None,
) -> BookCopy | None:
    """Chọn một bản sao AVAILABLE (ưu tiên sách chưa xóa và tránh sách dành cho demo đặt trước)."""
    base_q = (
        db.query(BookCopy)
        .join(Book, BookCopy.book_isbn == Book.isbn)
        .filter(Book.is_deleted == False, BookCopy.status == "AVAILABLE")  # noqa: E712
    )
    if preferred_isbn:
        copy = base_q.filter(BookCopy.book_isbn == preferred_isbn).order_by(BookCopy.id.asc()).first()
        if copy:
            return copy

    if exclude_isbns:
        copy = (
            base_q.filter(~BookCopy.book_isbn.in_(exclude_isbns))
            .order_by(BookCopy.id.asc())
            .first()
        )
        if copy:
            return copy

    return base_q.order_by(BookCopy.id.asc()).first()


def seed_demo_loans(db: Session) -> None:
    """Bổ sung đủ các trạng thái phiếu mượn ONLINE/WALK_IN để demo trang Quản lý mượn & Trả sách."""
    _, librarian, readers = _get_staff_and_readers(db)
    if not readers:
        return

    now = datetime.now()
    excluded = _reserved_demo_isbns()
    created_summary: list[str] = []

    def reader_at(idx: int) -> User:
        return readers[idx % len(readers)]

    # 1. Phiếu ONLINE chờ duyệt (PENDING - 2 phiếu) cho độc giả sạch phạt (readers[4], readers[5])
    pending_cnt = (
        db.query(Loan)
        .filter(Loan.borrow_type == BorrowType.ONLINE, Loan.status == LoanStatus.PENDING)
        .count()
    )
    for offset in range(pending_cnt, 2):
        copy = _pick_available_copy(db, exclude_isbns=excluded)
        if not copy:
            break
        reader = reader_at(4 + offset)
        copy.status = "RESERVED"
        loan = Loan(
            user_id=reader.id,
            borrow_type=BorrowType.ONLINE,
            status=LoanStatus.PENDING,
            created_at=now - timedelta(hours=3 + offset * 4),
        )
        db.add(loan)
        db.flush()
        db.add(LoanItem(loan_id=loan.id, book_isbn=copy.book_isbn, copy_id=copy.id))
        db.add(
            CopyStatusLog(
                book_copy_id=copy.id,
                old_status="AVAILABLE",
                new_status="RESERVED",
                reason=f"Giữ bản sao cho phiếu mượn online chờ duyệt #{loan.id} (seed)",
            )
        )
        created_summary.append(f"PENDING#{loan.id}")

    # 2. Phiếu ONLINE đã duyệt, sẵn sàng bàn giao tại quầy (APPROVED - 2 phiếu) (readers[6], readers[7])
    approved_cnt = (
        db.query(Loan)
        .filter(Loan.borrow_type == BorrowType.ONLINE, Loan.status == LoanStatus.APPROVED)
        .count()
    )
    for offset in range(approved_cnt, 2):
        copy = _pick_available_copy(db, exclude_isbns=excluded)
        if not copy:
            break
        reader = reader_at(6 + offset)
        copy.status = "RESERVED"
        loan = Loan(
            user_id=reader.id,
            processed_by=librarian.id if librarian else None,
            borrow_type=BorrowType.ONLINE,
            status=LoanStatus.APPROVED,
            created_at=now - timedelta(hours=12 + offset * 6),
        )
        db.add(loan)
        db.flush()
        db.add(LoanItem(loan_id=loan.id, book_isbn=copy.book_isbn, copy_id=copy.id))
        db.add(
            CopyStatusLog(
                book_copy_id=copy.id,
                old_status="AVAILABLE",
                new_status="RESERVED",
                reason=f"Giữ bản sao cho phiếu mượn online đã duyệt #{loan.id} (seed)",
            )
        )
        created_summary.append(f"APPROVED#{loan.id}")

    # 3. Bổ sung thêm phiếu BORROWED còn hạn dài (demo gia hạn) và quá hạn nhẹ (demo trả sách)
    borrowed_cnt = db.query(Loan).filter(Loan.status == LoanStatus.BORROWED).count()
    if borrowed_cnt < 6:
        c_renew = _pick_available_copy(db, exclude_isbns=excluded)
        if c_renew:
            c_renew.status = "BORROWED"
            r_renew = reader_at(14)
            l_renew = Loan(
                user_id=r_renew.id,
                processed_by=librarian.id if librarian else None,
                borrow_type=BorrowType.ONLINE,
                status=LoanStatus.BORROWED,
                created_at=now - timedelta(days=4),
                borrowed_at=now - timedelta(days=4),
                due_date=now + timedelta(days=10),
            )
            db.add(l_renew)
            db.flush()
            db.add(
                LoanItem(
                    loan_id=l_renew.id,
                    book_isbn=c_renew.book_isbn,
                    copy_id=c_renew.id,
                    due_date=now + timedelta(days=10),
                    renewal_count=0,
                )
            )
            created_summary.append(f"BORROWED#{l_renew.id}")

        c_late = _pick_available_copy(db, exclude_isbns=excluded)
        if c_late:
            c_late.status = "BORROWED"
            r_late = reader_at(15)
            l_late = Loan(
                user_id=r_late.id,
                processed_by=librarian.id if librarian else None,
                borrow_type=BorrowType.WALK_IN,
                status=LoanStatus.BORROWED,
                created_at=now - timedelta(days=20),
                borrowed_at=now - timedelta(days=20),
                due_date=now - timedelta(days=6),
            )
            db.add(l_late)
            db.flush()
            db.add(
                LoanItem(
                    loan_id=l_late.id,
                    book_isbn=c_late.book_isbn,
                    copy_id=c_late.id,
                    due_date=now - timedelta(days=6),
                    renewal_count=0,
                )
            )
            created_summary.append(f"BORROWED_LATE#{l_late.id}")

    # 4. Phiếu đã trả (RETURNED - 3 phiếu) để hiển thị tab Đã trả và biểu đồ Lượt trả
    returned_cnt = db.query(Loan).filter(Loan.status == LoanStatus.RETURNED).count()
    returned_specs = [
        (11, BorrowType.ONLINE, 22, 8, 2),   # trả muộn 6 ngày, cách đây 2 ngày
        (14, BorrowType.ONLINE, 18, 4, 4),   # trả đúng hạn, cách đây 4 ngày
        (15, BorrowType.WALK_IN, 12, -2, 1), # trả sớm 2 ngày, cách đây 1 ngày
    ]
    for idx in range(returned_cnt, len(returned_specs)):
        r_idx, b_type, borrowed_ago, due_ago, returned_ago = returned_specs[idx]
        copy = _pick_available_copy(db, exclude_isbns=excluded)
        if not copy:
            break
        reader = reader_at(r_idx)
        borrowed_dt = now - timedelta(days=borrowed_ago)
        due_dt = now - timedelta(days=due_ago)
        ret_dt = now - timedelta(days=returned_ago)
        loan_ret = Loan(
            user_id=reader.id,
            processed_by=librarian.id if librarian else None,
            borrow_type=b_type,
            status=LoanStatus.RETURNED,
            created_at=borrowed_dt,
            borrowed_at=borrowed_dt,
            due_date=due_dt,
        )
        db.add(loan_ret)
        db.flush()
        db.add(
            LoanItem(
                loan_id=loan_ret.id,
                book_isbn=copy.book_isbn,
                copy_id=copy.id,
                due_date=due_dt,
                return_date=ret_dt,
                renewal_count=0,
            )
        )
        created_summary.append(f"RETURNED#{loan_ret.id}")

    # 5. Phiếu từ chối (REJECTED) & tự hủy (CANCELLED) cho đủ bộ trạng thái lọc
    if db.query(Loan).filter(Loan.borrow_type == BorrowType.ONLINE, Loan.status == LoanStatus.REJECTED).count() == 0:
        copy = _pick_available_copy(db, exclude_isbns=excluded)
        if copy:
            loan_rej = Loan(
                user_id=reader_at(8).id,
                processed_by=librarian.id if librarian else None,
                borrow_type=BorrowType.ONLINE,
                status=LoanStatus.REJECTED,
                reject_reason="Sách đang tạm bảo trì hoặc độc giả chưa xác nhận thẻ thư viện",
                created_at=now - timedelta(days=3),
            )
            db.add(loan_rej)
            db.flush()
            db.add(LoanItem(loan_id=loan_rej.id, book_isbn=copy.book_isbn, copy_id=copy.id))
            created_summary.append(f"REJECTED#{loan_rej.id}")

    if db.query(Loan).filter(Loan.borrow_type == BorrowType.ONLINE, Loan.status == LoanStatus.CANCELLED).count() == 0:
        copy = _pick_available_copy(db, exclude_isbns=excluded)
        if copy:
            loan_can = Loan(
                user_id=reader_at(8).id,
                borrow_type=BorrowType.ONLINE,
                status=LoanStatus.CANCELLED,
                created_at=now - timedelta(days=5),
            )
            db.add(loan_can)
            db.flush()
            db.add(LoanItem(loan_id=loan_can.id, book_isbn=copy.book_isbn, copy_id=copy.id))
            created_summary.append(f"CANCELLED#{loan_can.id}")

    if created_summary:
        db.commit()
        print(f"[SEED DEMO LOANS] Đã bổ sung phiếu mượn demo: {', '.join(created_summary)}")
    else:
        print("[SEED DEMO LOANS] Đã có đầy đủ trạng thái phiếu mượn demo, bỏ qua.")


def _exhaust_book_copies_with_loans(
    db: Session,
    book_isbn: str,
    borrower: User,
    librarian: User | None,
    now: datetime,
) -> list[BookCopy]:
    """Chuyển toàn bộ bản sao AVAILABLE của 1 đầu sách sang BORROWED kèm phiếu mượn thật."""
    avail_copies = (
        db.query(BookCopy)
        .filter(BookCopy.book_isbn == book_isbn, BookCopy.status == "AVAILABLE")
        .order_by(BookCopy.id.asc())
        .all()
    )
    if not avail_copies:
        return []

    loan = Loan(
        user_id=borrower.id,
        processed_by=librarian.id if librarian else None,
        borrow_type=BorrowType.WALK_IN,
        status=LoanStatus.BORROWED,
        created_at=now - timedelta(days=3),
        borrowed_at=now - timedelta(days=3),
        due_date=now + timedelta(days=11),
    )
    db.add(loan)
    db.flush()

    for cp in avail_copies:
        cp.status = "BORROWED"
        db.add(
            LoanItem(
                loan_id=loan.id,
                book_isbn=cp.book_isbn,
                copy_id=cp.id,
                due_date=now + timedelta(days=11),
                renewal_count=0,
            )
        )
        db.add(
            CopyStatusLog(
                book_copy_id=cp.id,
                old_status="AVAILABLE",
                new_status="BORROWED",
                reason=f"Cho mượn tại quầy để tạo kịch bản hết sách đặt trước (phiếu #{loan.id})",
            )
        )
    return avail_copies


def seed_demo_reservations(db: Session) -> None:
    """Tạo đầy đủ 5 trạng thái đặt trước (WAITING, READY, FULFILLED, EXPIRED, CANCELLED) + đầu sách hết bản sao."""
    if db.query(Reservation).count() > 0:
        print("[SEED RESERVATIONS] Đã có dữ liệu đặt trước, bỏ qua.")
        return

    _, librarian, readers = _get_staff_and_readers(db)
    if len(readers) < 12:
        return

    now = datetime.now()

    def reader_at(idx: int) -> User:
        return readers[idx % len(readers)]

    # 1. Làm hết bản sao khả dụng cho 3 đầu sách: Clean Code (32), Atomic Habits (31), The Pragmatic Programmer (33)
    clean_code_isbn = make_isbn(32)
    atomic_isbn = make_isbn(31)
    pragmatic_isbn = make_isbn(33)

    if db.query(Book).filter(Book.isbn == clean_code_isbn, Book.is_deleted == False).first():  # noqa: E712
        _exhaust_book_copies_with_loans(db, clean_code_isbn, reader_at(16), librarian, now)
        # Hàng chờ FIFO #1 và #2 cho Clean Code (khi trả 1 cuốn Clean Code, đơn #1 tự lên READY)
        db.add(
            Reservation(
                user_id=reader_at(8).id,
                book_isbn=clean_code_isbn,
                reserved_at=now - timedelta(days=2),
                status=ReservationStatus.WAITING.value,
            )
        )
        db.add(
            Reservation(
                user_id=reader_at(9).id,
                book_isbn=clean_code_isbn,
                reserved_at=now - timedelta(days=1),
                status=ReservationStatus.WAITING.value,
            )
        )

    if db.query(Book).filter(Book.isbn == atomic_isbn, Book.is_deleted == False).first():  # noqa: E712
        _exhaust_book_copies_with_loans(db, atomic_isbn, reader_at(17), librarian, now)
        # Đơn WAITING của docgia01 (readers[0]) để xem/hủy trên reservations.html
        db.add(
            Reservation(
                user_id=reader_at(0).id,
                book_isbn=atomic_isbn,
                reserved_at=now - timedelta(hours=12),
                status=ReservationStatus.WAITING.value,
            )
        )

    # Làm hết bản sao cho The Pragmatic Programmer nhưng chưa đặt trước -> để độc giả bấm Đặt trước mới
    if db.query(Book).filter(Book.isbn == pragmatic_isbn, Book.is_deleted == False).first():  # noqa: E712
        _exhaust_book_copies_with_loans(db, pragmatic_isbn, reader_at(17), librarian, now)

    # 2. Đơn READY còn hạn giữ 48h để thủ thư bấm Giao sách (fulfill) hoặc Hủy chuyển lượt
    ready_copy_1 = _pick_available_copy(db, preferred_isbn=make_isbn(17))
    if ready_copy_1:
        ready_copy_1.status = "RESERVED"
        db.add(
            CopyStatusLog(
                book_copy_id=ready_copy_1.id,
                old_status="AVAILABLE",
                new_status="RESERVED",
                reason="Giữ bản sao cho đơn đặt trước READY (seed)",
            )
        )
        db.add(
            Reservation(
                user_id=reader_at(10).id,  # docgia11 sạch nợ & quá hạn -> giao sách thành công ngay
                book_isbn=ready_copy_1.book_isbn,
                reserved_at=now - timedelta(days=3),
                status=ReservationStatus.READY.value,
                pickup_deadline=now + timedelta(hours=36),
                copy_id=ready_copy_1.id,
            )
        )
        db.add(
            Reservation(
                user_id=reader_at(14).id,
                book_isbn=ready_copy_1.book_isbn,
                reserved_at=now - timedelta(days=1),
                status=ReservationStatus.WAITING.value,
            )
        )

    ready_copy_2 = _pick_available_copy(db, preferred_isbn=make_isbn(11))
    if ready_copy_2:
        ready_copy_2.status = "RESERVED"
        db.add(
            CopyStatusLog(
                book_copy_id=ready_copy_2.id,
                old_status="AVAILABLE",
                new_status="RESERVED",
                reason="Giữ bản sao cho đơn đặt trước READY #2 (seed)",
            )
        )
        db.add(
            Reservation(
                user_id=reader_at(14).id,  # docgia15 sạch nợ -> demo màn hình READY phía độc giả/thủ thư
                book_isbn=ready_copy_2.book_isbn,
                reserved_at=now - timedelta(days=2),
                status=ReservationStatus.READY.value,
                pickup_deadline=now + timedelta(hours=24),
                copy_id=ready_copy_2.id,
            )
        )

    # 3. Các đơn lịch sử đặt trước: FULFILLED, EXPIRED, CANCELLED
    hist_copy = (
        db.query(BookCopy)
        .filter(BookCopy.book_isbn == make_isbn(2))
        .order_by(BookCopy.id.asc())
        .first()
    )
    db.add(
        Reservation(
            user_id=reader_at(11).id,
            book_isbn=hist_copy.book_isbn if hist_copy else make_isbn(2),
            reserved_at=now - timedelta(days=10),
            status=ReservationStatus.FULFILLED.value,
            pickup_deadline=now - timedelta(days=8),
            copy_id=hist_copy.id if hist_copy else None,
        )
    )
    db.add(
        Reservation(
            user_id=reader_at(0).id,
            book_isbn=make_isbn(5),
            reserved_at=now - timedelta(days=7),
            status=ReservationStatus.EXPIRED.value,
            pickup_deadline=now - timedelta(days=2),
            copy_id=None,
        )
    )
    db.add(
        Reservation(
            user_id=reader_at(12).id,
            book_isbn=make_isbn(6),
            reserved_at=now - timedelta(days=4),
            status=ReservationStatus.CANCELLED.value,
            pickup_deadline=None,
            copy_id=None,
        )
    )

    db.commit()
    print("[SEED RESERVATIONS] Đã tạo dữ liệu đặt trước demo (WAITING/READY/FULFILLED/EXPIRED/CANCELLED) thành công!")


def seed_demo_fines(db: Session) -> None:
    """Tạo đầy đủ dữ liệu Phiếu phạt (UNPAID/PAID/WAIVED; QUÁ HẠN/HỎNG/MẤT) cho trang Phạt & Thống kê."""
    if db.query(Fine).count() > 0:
        print("[SEED FINES] Đã có dữ liệu phiếu phạt, bỏ qua.")
        return

    admin, librarian, readers = _get_staff_and_readers(db)
    if len(readers) < 12:
        return

    now = datetime.now()
    excluded = _reserved_demo_isbns()

    def reader_at(idx: int) -> User:
        return readers[idx % len(readers)]

    def create_returned_loan_for_fine(
        reader: User,
        copy: BookCopy,
        borrowed_days_ago: int,
        due_days_ago: int,
        returned_days_ago: int,
    ) -> Loan:
        borrowed_dt = now - timedelta(days=borrowed_days_ago)
        due_dt = now - timedelta(days=due_days_ago)
        ret_dt = now - timedelta(days=returned_days_ago)
        loan = Loan(
            user_id=reader.id,
            processed_by=librarian.id if librarian else None,
            borrow_type=BorrowType.WALK_IN,
            status=LoanStatus.RETURNED,
            created_at=borrowed_dt,
            borrowed_at=borrowed_dt,
            due_date=due_dt,
        )
        db.add(loan)
        db.flush()
        db.add(
            LoanItem(
                loan_id=loan.id,
                book_isbn=copy.book_isbn,
                copy_id=copy.id,
                due_date=due_dt,
                return_date=ret_dt,
                renewal_count=0,
            )
        )
        return loan

    # 1. UNPAID - QUÁ HẠN (20.000đ) -> demo Thu tiền phạt & In biên lai
    c_od = _pick_available_copy(db, preferred_isbn=make_isbn(12), exclude_isbns=excluded)
    if c_od:
        r_od = reader_at(11)
        l_od = create_returned_loan_for_fine(r_od, c_od, 24, 10, 0)
        db.add(
            Fine(
                user_id=r_od.id,
                loan_id=l_od.id,
                book_copy_id=c_od.id,
                fine_type="QUÁ HẠN",
                amount=20000.0,
                status="UNPAID",
                created_at=now,
            )
        )

    # 2. UNPAID - HỎNG (50% giá bìa) -> demo Admin Miễn phạt hoặc Thu tiền
    c_dmg = _pick_available_copy(db, preferred_isbn=make_isbn(13), exclude_isbns=excluded)
    if c_dmg:
        book_dmg = db.query(Book).filter(Book.isbn == c_dmg.book_isbn).first()
        dmg_amt = round(float(book_dmg.price) * 0.5, 2) if (book_dmg and book_dmg.price) else 55000.0
        c_dmg.status = "DAMAGED"
        c_dmg.condition = "HỎNG"
        db.add(
            CopyStatusLog(
                book_copy_id=c_dmg.id,
                old_status="AVAILABLE",
                new_status="DAMAGED",
                reason="Rách bìa và ướt nhiều trang khi độc giả trả sách (seed)",
            )
        )
        r_dmg = reader_at(12)
        l_dmg = create_returned_loan_for_fine(r_dmg, c_dmg, 15, 1, 1)
        db.add(
            Fine(
                user_id=r_dmg.id,
                loan_id=l_dmg.id,
                book_copy_id=c_dmg.id,
                fine_type="HỎNG",
                amount=dmg_amt,
                status="UNPAID",
                waive_reason="Ghi chú: Rách bìa và ướt nhiều trang khi trả",
                created_at=now - timedelta(days=1),
            )
        )

    # 3. UNPAID - MẤT (100% giá bìa)
    c_lost = _pick_available_copy(db, preferred_isbn=make_isbn(14), exclude_isbns=excluded)
    if c_lost:
        book_lost = db.query(Book).filter(Book.isbn == c_lost.book_isbn).first()
        lost_amt = round(float(book_lost.price), 2) if (book_lost and book_lost.price) else 120000.0
        c_lost.status = "LOST"
        db.add(
            CopyStatusLog(
                book_copy_id=c_lost.id,
                old_status="AVAILABLE",
                new_status="LOST",
                reason="Độc giả báo làm mất sách ngoài trường (seed)",
            )
        )
        r_lost = reader_at(13)
        l_lost = create_returned_loan_for_fine(r_lost, c_lost, 16, 2, 2)
        db.add(
            Fine(
                user_id=r_lost.id,
                loan_id=l_lost.id,
                book_copy_id=c_lost.id,
                fine_type="MẤT",
                amount=lost_amt,
                status="UNPAID",
                waive_reason="Ghi chú: Độc giả báo làm mất sách",
                created_at=now - timedelta(days=2),
            )
        )

    # 4. PAID hôm nay (16.000đ) -> lên KPI "Đã thu hôm nay" & Biểu đồ Tiền phạt hôm nay
    c_paid_today = _pick_available_copy(db, preferred_isbn=make_isbn(15), exclude_isbns=excluded)
    if c_paid_today:
        r_pt = reader_at(14)
        l_pt = create_returned_loan_for_fine(r_pt, c_paid_today, 22, 8, 0)
        db.add(
            Fine(
                user_id=r_pt.id,
                loan_id=l_pt.id,
                book_copy_id=c_paid_today.id,
                fine_type="QUÁ HẠN",
                amount=16000.0,
                status="PAID",
                collected_by=librarian.id if librarian else None,
                collected_at=now,
                waive_reason="PT: TIỀN MẶT | Thu trực tiếp tại quầy trả sách",
                created_at=now,
            )
        )

    # 5. PAID cách đây 4 ngày (45.000đ) -> biểu đồ Tiền phạt trong kỳ 30 ngày
    c_paid_prev = _pick_available_copy(db, preferred_isbn=make_isbn(16), exclude_isbns=excluded)
    if c_paid_prev:
        c_paid_prev.status = "DAMAGED"
        c_paid_prev.condition = "HỎNG"
        db.add(
            CopyStatusLog(
                book_copy_id=c_paid_prev.id,
                old_status="AVAILABLE",
                new_status="DAMAGED",
                reason="Bong gáy sách khi hoàn trả (seed)",
            )
        )
        r_pp = reader_at(15)
        l_pp = create_returned_loan_for_fine(r_pp, c_paid_prev, 19, 5, 4)
        db.add(
            Fine(
                user_id=r_pp.id,
                loan_id=l_pp.id,
                book_copy_id=c_paid_prev.id,
                fine_type="HỎNG",
                amount=45000.0,
                status="PAID",
                collected_by=librarian.id if librarian else None,
                collected_at=now - timedelta(days=4),
                waive_reason="PT: CHUYỂN KHOẢN | Độc giả chuyển khoản QR",
                created_at=now - timedelta(days=4),
            )
        )

    # 6. WAIVED (14.000đ) -> demo Admin đã miễn giảm kèm lý do
    c_waived = _pick_available_copy(db, preferred_isbn=make_isbn(18), exclude_isbns=excluded)
    if c_waived:
        r_wv = reader_at(16)
        l_wv = create_returned_loan_for_fine(r_wv, c_waived, 27, 13, 6)
        db.add(
            Fine(
                user_id=r_wv.id,
                loan_id=l_wv.id,
                book_copy_id=c_waived.id,
                fine_type="QUÁ HẠN",
                amount=14000.0,
                status="WAIVED",
                collected_by=admin.id if admin else (librarian.id if librarian else None),
                collected_at=now - timedelta(days=6),
                waive_reason="Sinh viên có giấy xác nhận nhập viện, Admin duyệt miễn phạt",
                created_at=now - timedelta(days=6),
            )
        )

    db.commit()
    print("[SEED FINES] Đã tạo dữ liệu phiếu phạt mẫu (UNPAID/PAID/WAIVED) thành công!")


def seed_demo_notifications(db: Session) -> None:
    """Tạo thông báo in-app mẫu (gắn đủ loan_id & loan_item_id) nếu bảng notifications chưa có dữ liệu."""
    if db.query(Notification).count() > 0:
        print("[SEED NOTIFICATIONS] Đã có thông báo, bỏ qua.")
        return

    _, _, readers = _get_staff_and_readers(db)
    if not readers:
        return

    first_loan = db.query(Loan).filter(Loan.user_id == readers[0].id).order_by(Loan.id.asc()).first()
    first_item = (
        db.query(LoanItem).filter(LoanItem.loan_id == first_loan.id).order_by(LoanItem.id.asc()).first()
        if first_loan
        else None
    )
    db.add(
        Notification(
            user_id=readers[0].id,
            loan_id=first_loan.id if first_loan else None,
            loan_item_id=first_item.id if first_item else None,
            title="Cảnh báo sách mượn quá hạn",
            message="Bạn đang có sách mượn quá hạn. Vui lòng hoàn trả sớm tại quầy để tránh phát sinh thêm phí phạt 2.000đ/ngày.",
            type="OVERDUE",
            is_read=False,
        )
    )
    if len(readers) > 2:
        due_loan = db.query(Loan).filter(Loan.user_id == readers[2].id).order_by(Loan.id.asc()).first()
        due_item = (
            db.query(LoanItem).filter(LoanItem.loan_id == due_loan.id).order_by(LoanItem.id.asc()).first()
            if due_loan
            else None
        )
        db.add(
            Notification(
                user_id=readers[2].id,
                loan_id=due_loan.id if due_loan else None,
                loan_item_id=due_item.id if due_item else None,
                title="Nhắc nhở sách sắp đến hạn trả",
                message="Sách bạn đang mượn sắp đến hạn trả. Bạn có thể gia hạn online thêm 7 ngày hoặc mang trả đúng hạn.",
                type="DUE_SOON",
                is_read=True,
            )
        )
    if len(readers) > 10:
        db.add(
            Notification(
                user_id=readers[10].id,
                title="Sách đặt trước đã sẵn sàng tại quầy",
                message="Đơn đặt trước cuốn 'Nhà Giả Kim' của bạn đã sẵn sàng. Vui lòng đến quầy nhận sách trong vòng 48 giờ.",
                type="SYSTEM",
                is_read=False,
            )
        )

    db.commit()
    print("[SEED NOTIFICATIONS] Đã tạo thông báo mẫu thành công!")


def seed_demo_disposed_copy(db: Session) -> None:
    """Bổ sung 1 bản sao DISPOSED (đã thanh lý) kèm CopyStatusLog lịch sử nhiều bước nếu chưa có."""
    if db.query(BookCopy).filter(BookCopy.status == "DISPOSED").count() > 0:
        return

    copy = _pick_available_copy(db, preferred_isbn=make_isbn(19), exclude_isbns=_reserved_demo_isbns())
    if not copy:
        return

    now = datetime.now()
    copy.condition = "HỎNG"
    copy.status = "DISPOSED"
    db.add(
        CopyStatusLog(
            book_copy_id=copy.id,
            old_status="AVAILABLE",
            new_status="DAMAGED",
            changed_at=now - timedelta(days=10),
            reason="Kiểm kê định kỳ phát hiện sách ẩm mốc, rách bìa (seed)",
        )
    )
    db.add(
        CopyStatusLog(
            book_copy_id=copy.id,
            old_status="DAMAGED",
            new_status="DISPOSED",
            changed_at=now - timedelta(days=3),
            reason="Hết niên hạn sử dụng, lập biên bản thanh lý kho (seed)",
        )
    )
    db.commit()
    print("[SEED COPY DISPOSED] Đã bổ sung 1 bản sao thanh lý (DISPOSED) kèm audit log.")


def seed_demo_card_action_logs(db: Session) -> None:
    """Tạo lịch sử gia hạn, khóa/mở thẻ và tự động hết hạn cho bảng card_action_logs."""
    if db.query(CardActionLog).count() > 0:
        print("[SEED CARD LOGS] Đã có lịch sử tác động thẻ, bỏ qua.")
        return

    admin, librarian, _ = _get_staff_and_readers(db)
    staff_id = librarian.id if librarian else (admin.id if admin else None)
    admin_id = admin.id if admin else staff_id
    now = datetime.now()
    today = date.today()

    # 1. EXTEND trên LC-0001 (docgia01) để trang reader-detail.html có lịch sử gia hạn thẻ
    c1 = db.query(LibraryCard).filter(LibraryCard.card_code == "LC-0001").first()
    if c1:
        db.add(
            CardActionLog(
                card_id=c1.id,
                reader_id=c1.reader_id,
                action="EXTEND",
                old_status="ACTIVE",
                new_status="ACTIVE",
                reason="Gia hạn thẻ thư viện định kỳ năm học mới",
                old_expiry_date=c1.issue_date,
                new_expiry_date=c1.expiry_date,
                performed_by=staff_id,
                created_at=now - timedelta(days=15),
            )
        )

    # 2. LOCK -> UNLOCK trên LC-0003 (docgia03)
    c3 = db.query(LibraryCard).filter(LibraryCard.card_code == "LC-0003").first()
    if c3:
        db.add(
            CardActionLog(
                card_id=c3.id,
                reader_id=c3.reader_id,
                action="LOCK",
                old_status="ACTIVE",
                new_status="LOCKED",
                reason="Tạm khóa do thẻ thất lạc chờ xác minh",
                old_expiry_date=c3.expiry_date,
                new_expiry_date=c3.expiry_date,
                performed_by=staff_id,
                created_at=now - timedelta(days=12),
            )
        )
        db.add(
            CardActionLog(
                card_id=c3.id,
                reader_id=c3.reader_id,
                action="UNLOCK",
                old_status="LOCKED",
                new_status="ACTIVE",
                reason="Độc giả đã tìm lại thẻ và xác nhận tại quầy",
                old_expiry_date=c3.expiry_date,
                new_expiry_date=c3.expiry_date,
                performed_by=staff_id,
                created_at=now - timedelta(days=9),
            )
        )

    # 3. AUTO_EXPIRE cho thẻ EXPIRED (LC-0019)
    c19 = db.query(LibraryCard).filter(LibraryCard.status == CardStatus.EXPIRED).first()
    if c19:
        db.add(
            CardActionLog(
                card_id=c19.id,
                reader_id=c19.reader_id,
                action="AUTO_EXPIRE",
                old_status="ACTIVE",
                new_status="EXPIRED",
                reason="Thẻ hết hạn sử dụng theo ngày hết hạn định kỳ",
                old_expiry_date=c19.expiry_date,
                new_expiry_date=c19.expiry_date,
                performed_by=None,
                created_at=now - timedelta(days=30),
            )
        )

    # 4. LOCK cho thẻ LOCKED (LC-0020)
    c20 = db.query(LibraryCard).filter(LibraryCard.status == CardStatus.LOCKED).first()
    if c20:
        db.add(
            CardActionLog(
                card_id=c20.id,
                reader_id=c20.reader_id,
                action="LOCK",
                old_status="ACTIVE",
                new_status="LOCKED",
                reason="Khóa tài khoản và thẻ do vi phạm nội quy mượn sách",
                old_expiry_date=c20.expiry_date,
                new_expiry_date=today + timedelta(days=335),
                performed_by=admin_id,
                created_at=now - timedelta(days=7),
            )
        )

    db.commit()
    print("[SEED CARD LOGS] Đã tạo lịch sử gia hạn / khóa / mở thẻ mẫu thành công!")


# ==============================================================================
# 7. HÀM CHÍNH GỘP TẤT CẢ (ENTRY POINTS)
# ==============================================================================

def _run_all_seed_steps(db: Session) -> None:
    seed_users_and_cards(db)
    seed_books_and_catalogs(db)
    seed_loans_and_overdue(db)
    seed_demo_loans(db)
    seed_demo_reservations(db)
    seed_demo_fines(db)
    seed_demo_disposed_copy(db)
    seed_demo_card_action_logs(db)
    seed_demo_notifications(db)


def seed_data(db: Session | None = None) -> None:
    """Hàm chạy toàn bộ quá trình seed (users, books, loans, reservations, fines, notifications)."""
    if db is not None:
        try:
            _run_all_seed_steps(db)
        except Exception as e:
            db.rollback()
            print("[SEED] Lỗi:", e)
            raise
    else:
        with SessionLocal() as session:
            try:
                _run_all_seed_steps(session)
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
