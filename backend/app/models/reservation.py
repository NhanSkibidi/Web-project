import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class ReservationStatus(str, enum.Enum):
    WAITING = "WAITING"
    READY = "READY"
    FULFILLED = "FULFILLED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # Độc giả
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Đầu sách (khoá ngoại tới books.isbn)
    book_isbn = Column(String(20), ForeignKey("books.isbn"), nullable=False, index=True)
    # Thời điểm đặt trước
    reserved_at = Column(DateTime, default=datetime.now, server_default=func.now(), nullable=False)
    # Trạng thái đặt trước
    status = Column(
        Enum("WAITING", "READY", "FULFILLED", "CANCELLED", "EXPIRED", name="reservation_status"),
        default="WAITING",
        nullable=False,
    )
    # Hạn đến lấy sách
    pickup_deadline = Column(DateTime, nullable=True)
    # Bản sao được giữ (khi trạng thái là READY)
    copy_id = Column(Integer, ForeignKey("book_copies.id"), nullable=True, index=True)

    # Quan hệ
    reader = relationship("User")
    book = relationship("Book")
    copy = relationship("BookCopy")

    # Thuộc tính tương thích nếu truy cập qua book_id
    @property
    def book_id(self):
        return self.book_isbn

    @book_id.setter
    def book_id(self, value):
        self.book_isbn = str(value) if value is not None else None
