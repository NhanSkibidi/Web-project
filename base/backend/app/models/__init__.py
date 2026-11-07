# Import mọi model ở đây để Base.metadata.create_all() "nhìn thấy" và tạo bảng.
# Thêm model mới -> nhớ thêm 1 dòng import vào file này.
from app.models.item import Item  # noqa: F401
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Book import Book
from app.models.BookAuthor import BookAuthor
from app.models.BookCopy import BookCopy
from app.models.CopyStatusLog import CopyStatusLog
from app.models.Category import Category
