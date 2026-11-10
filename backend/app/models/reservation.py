
from sqlalchemy import Column, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    reserved_at = Column(DateTime, default=datetime.now)
    status = Column( Enum( "WAITING", "READY", "FULFILLED", "CANCELLED", "EXPIRED", name="reservation_status"), default="WAITING", nullable=False)
    pickup_deadline = Column(DateTime, nullable=True)
    copy_id = Column(Integer, ForeignKey("book_copies.id"), nullable=True)
    # Quan hệ với độc giả
    reader = relationship("User")
    # Quan hệ với đầu sách
    book = relationship("Book")
    # Quan hệ với bản sao sách
    copy = relationship("BookCopy")
