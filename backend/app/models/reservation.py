import enum
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Integer, String, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.Book import Book
    from app.models.BookCopy import BookCopy


class ReservationStatus(str, enum.Enum):
    WAITING = "WAITING"
    READY = "READY"
    FULFILLED = "FULFILLED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # Độc giả (khoá ngoại tới users.id)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    # Đầu sách (khoá ngoại tới books.isbn)
    book_isbn: Mapped[str] = mapped_column(String(20), ForeignKey("books.isbn"), nullable=False, index=True)
    # Thời điểm đặt trước
    reserved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, server_default=func.now())
    # Trạng thái đặt trước
    status: Mapped[str] = mapped_column(
        Enum("WAITING", "READY", "FULFILLED", "CANCELLED", "EXPIRED", name="reservation_status"),
        default="WAITING",
        nullable=False,
    )
    # Hạn đến lấy sách
    pickup_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Bản sao được giữ (khi trạng thái là READY)
    copy_id: Mapped[int | None] = mapped_column(ForeignKey("book_copies.id"), nullable=True, index=True)

    # Quan hệ SQLAlchemy
    reader: Mapped["User"] = relationship("User")
    book: Mapped["Book"] = relationship("Book")
    copy: Mapped["BookCopy | None"] = relationship("BookCopy")

    # Thuộc tính tương thích nếu truy cập qua book_id
    @property
    def book_id(self) -> str:
        return self.book_isbn

    @book_id.setter
    def book_id(self, value: str | int | None):
        self.book_isbn = str(value) if value is not None else None
