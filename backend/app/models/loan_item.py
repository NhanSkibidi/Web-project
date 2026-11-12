from datetime import datetime
from sqlalchemy import DateTime, Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.loan import Loan
    from app.models.Book import Book
    from app.models.BookCopy import BookCopy

class LoanItem(Base):
    __tablename__ = "loan_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    loan_id: Mapped[int] = mapped_column(ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    book_isbn: Mapped[str] = mapped_column(String(20), ForeignKey("books.isbn"), nullable=False)
    copy_id: Mapped[int | None] = mapped_column(ForeignKey("book_copies.id"), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    renewal_count: Mapped[int] = mapped_column(Integer, default=0)
    return_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    loan: Mapped["Loan"] = relationship("Loan", back_populates="loan_items")
    book: Mapped["Book"] = relationship("Book")
    copy: Mapped["BookCopy | None"] = relationship("BookCopy")
