from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.Book import Book
    from app.models.Author import Author

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class BookAuthor(Base):
    __tablename__ = "book_authors"

    book_isbn: Mapped[str] = mapped_column(
        ForeignKey("books.isbn"), primary_key=True
    )
    author_id: Mapped[int] = mapped_column(
        ForeignKey("authors.id"), primary_key=True
    )

    book: Mapped["Book"] = relationship(back_populates="book_authors")
    author: Mapped["Author"] = relationship(back_populates="book_authors")
