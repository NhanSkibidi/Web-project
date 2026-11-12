from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.BookCopy import BookCopy
from datetime import datetime
from sqlalchemy import DateTime, String, func, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class CopyStatusLog(Base):
    __tablename__ = "copy_status_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    book_copy_id: Mapped[int] = mapped_column(
        ForeignKey("book_copies.id"), nullable=False
    )

    old_status: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    new_status: Mapped[str] = mapped_column(
        Enum(
            "AVAILABLE",
            "BORROWED",
            "RESERVED",
            "LOST",
            "DAMAGED",
            "DISPOSED"
        ),
        nullable=False
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    book_copy: Mapped["BookCopy"] = relationship(
        back_populates="status_logs"
    )
