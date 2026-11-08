"""Model User = bảng users (tài khoản: admin, thủ thư, độc giả)."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class UserRole(str, enum.Enum):
    """Vai trò của tài khoản."""

    ADMIN = "ADMIN"          # quản trị viên
    LIBRARIAN = "LIBRARIAN"  # thủ thư
    READER = "READER"        # độc giả


class UserStatus(str, enum.Enum):
    """Trạng thái tài khoản."""

    ACTIVE = "ACTIVE"  # đang hoạt động
    LOCKED = "LOCKED"  # bị khoá


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # unique=True: không cho 2 tài khoản trùng email
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    # Chỉ lưu mật khẩu đã băm bằng bcrypt (60 ký tự), TUYỆT ĐỐI không lưu mật khẩu gốc
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.READER)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # 1 độc giả có thể có nhiều thẻ (vd: thẻ cũ hết hạn + thẻ mới)
    # user.library_cards -> danh sách thẻ của user đó
    library_cards: Mapped[list["LibraryCard"]] = relationship(
        back_populates="reader", cascade="all, delete-orphan"
    )
