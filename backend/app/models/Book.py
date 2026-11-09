from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.Category import Category
    from app.models.Publisher import Publisher
    from app.models.BookAuthor import BookAuthor
    from app.models.BookCopy import BookCopy
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, Text, func, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Book(Base):
    __tablename__ = "books"

    isbn: Mapped[str] = mapped_column(String(20), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id"), nullable=False
    )
    publisher_id: Mapped[int] = mapped_column(
        ForeignKey("publishers.id"), nullable=False
    )
    publish_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str] = mapped_column(String(50), default="Tiếng Việt")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    category: Mapped["Category"] = relationship(back_populates="books")
    publisher: Mapped["Publisher"] = relationship(back_populates="books")

    book_authors: Mapped[list["BookAuthor"]] = relationship(
        back_populates="book"
    )
    copies: Mapped[list["BookCopy"]] = relationship(
        back_populates="book"
    )
