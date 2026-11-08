# Import mọi model ở đây để Base.metadata.create_all() "nhìn thấy" và tạo bảng.
# Thêm model mới -> nhớ thêm 1 dòng import vào file này.
from app.models.item import Item  # noqa: F401
<<<<<<< HEAD
=======
from app.models.library_card import CardStatus, CardType, LibraryCard  # noqa: F401
from app.models.user import User, UserRole, UserStatus  # noqa: F401
>>>>>>> 16a2dc8cb80b83cc03920c22dfd88d998bc01450
