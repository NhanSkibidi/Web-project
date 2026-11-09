
from datetime import date
from decimal import Decimal

from app.db.session import SessionLocal
from app.models.Category import Category
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Book import Book
from app.models.BookAuthor import BookAuthor
from app.models.BookCopy import BookCopy


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


def get_or_create(db, model, filters, values):
    item = db.query(model).filter_by(**filters).first()

    if item:
        return item

    item = model(**values)
    db.add(item)
    db.flush()
    return item


def make_isbn(number):
    first_12 = f"978604{number:06d}"
    total = sum(
        int(digit) * (1 if index % 2 == 0 else 3)
        for index, digit in enumerate(first_12)
    )
    check_digit = (10 - total % 10) % 10
    return first_12 + str(check_digit)


def seed_data():
    db = SessionLocal()

    try:
        categories = {}

        for name in CATEGORIES:
            category = get_or_create(
                db,
                Category,
                {"name": name},
                {"name": name}
            )
            categories[name] = category

        authors = []

        for name, biography, nationality in AUTHORS:
            author = get_or_create(
                db,
                Author,
                {"name": name},
                {
                    "name": name,
                    "biography": biography,
                    "nationality": nationality
                }
            )
            authors.append(author)

        publishers = []

        for name in PUBLISHERS:
            publisher = get_or_create(
                db,
                Publisher,
                {"name": name},
                {"name": name}
            )
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
                    "price": Decimal(50000 + index * 5000)
                }
            )

            book_author = db.query(BookAuthor).filter_by(
                book_isbn=book.isbn,
                author_id=author.id
            ).first()

            if not book_author:
                db.add(
                    BookAuthor(
                        book_isbn=book.isbn,
                        author_id=author.id
                    )
                )

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
                        "status": "AVAILABLE"
                    }
                )

        db.commit()
        print("Seed data hoàn tất!")

    except Exception as e:
        db.rollback()
        print("Seed data thất bại:", e)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    from app.db.session import Base, engine
    Base.metadata.create_all(bind=engine)
    seed_data()