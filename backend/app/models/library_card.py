"""Model LibraryCard = bảng library_cards (thẻ thư viện của độc giả)."""
import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class CardType(str, enum.Enum):
    """Loại thẻ."""

    STANDARD = "STANDARD"  # thẻ thường
    STUDENT = "STUDENT"    # thẻ sinh viên
    VIP = "VIP"            # thẻ VIP


class CardStatus(str, enum.Enum):
    """Trạng thái thẻ."""

    ACTIVE = "ACTIVE"    # đang dùng được
    EXPIRED = "EXPIRED"  # đã hết hạn
    LOCKED = "LOCKED"    # bị khoá


class LibraryCard(Base):
    __tablename__ = "library_cards"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # Mã thẻ duy nhất, vd: LC-0001
    card_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    # Khoá ngoại: thẻ này thuộc về độc giả nào (users.id)
    reader_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    card_type: Mapped[CardType] = mapped_column(Enum(CardType), default=CardType.STANDARD)
    issue_date: Mapped[date] = mapped_column(Date)    # ngày cấp
    expiry_date: Mapped[date] = mapped_column(Date)   # ngày hết hạn
    max_borrow_books: Mapped[int] = mapped_column(Integer, default=5)  # số sách được mượn tối đa
    status: Mapped[CardStatus] = mapped_column(Enum(CardStatus), default=CardStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # library_card.reader -> User sở hữu thẻ
    reader: Mapped["User"] = relationship(back_populates="library_cards")
