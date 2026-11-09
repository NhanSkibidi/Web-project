# Import mọi model ở đây để Base.metadata.create_all() "nhìn thấy" và tạo bảng.
# Thêm model mới -> nhớ thêm 1 dòng import vào file này.
from app.models.item import Item
from app.models.user import User, UserRole, UserStatus
from app.models.library_card import CardStatus, CardType, LibraryCard
from app.models.Category import Category
from app.models.Publisher import Publisher
from app.models.Author import Author
from app.models.Book import Book
from app.models.BookAuthor import BookAuthor
from app.models.BookCopy import BookCopy
from app.models.CopyStatusLog import CopyStatusLog
