from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.Book import Book
    from app.models.CopyStatusLog import CopyStatusLog
    from app.models.loan_item import LoanItem
from datetime import datetime, date
from sqlalchemy import DateTime, String, func, Date, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class BookCopy(Base):
    __tablename__ = "book_copies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    book_isbn: Mapped[str] = mapped_column(
        ForeignKey("books.isbn"), nullable=False
    )
    copy_code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    shelf_location: Mapped[str] = mapped_column(String(100), nullable=False)
    imported_at: Mapped[date] = mapped_column(Date, nullable=False)

    condition: Mapped[str] = mapped_column(
        Enum("MỚI", "CŨ", "HỎNG"),
        default="MỚI",
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "AVAILABLE",
            "BORROWED",
            "RESERVED",
            "LOST",
            "DAMAGED",
            "DISPOSED"
        ),
        default="AVAILABLE",
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    book: Mapped["Book"] = relationship(back_populates="copies")
    status_logs: Mapped[list["CopyStatusLog"]] = relationship(
        back_populates="book_copy"
    )
    loan_items: Mapped[list["LoanItem"]] = relationship(
        back_populates="copy"
    )
