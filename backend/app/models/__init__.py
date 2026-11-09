# Import mọi model ở đây để Base.metadata.create_all() "nhìn thấy" và tạo bảng.
# Thêm model mới -> nhớ thêm 1 dòng import vào file này.

from app.models.item import Item  # noqa: F401
from app.models.user import User, UserRole, UserStatus  # noqa: F401
from app.models.library_card import CardStatus, CardType, LibraryCard  # noqa: F401
from app.models.Category import Category  # noqa: F401
from app.models.Publisher import Publisher  # noqa: F401
from app.models.Author import Author  # noqa: F401
from app.models.Book import Book  # noqa: F401
from app.models.BookAuthor import BookAuthor  # noqa: F401
from app.models.BookCopy import BookCopy  # noqa: F401
from app.models.CopyStatusLog import CopyStatusLog  # noqa: F401
from app.models.loan import Loan  # noqa: F401
from app.models.loan_item import LoanItem  # noqa: F401
from app.models.fine import Fine  # noqa: F401