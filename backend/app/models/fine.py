from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.loan import Loan
    from app.models.BookCopy import BookCopy


class Fine(Base):
    __tablename__ = "fines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    loan_id: Mapped[int] = mapped_column(ForeignKey("loans.id"), nullable=False)
    book_copy_id: Mapped[int] = mapped_column(ForeignKey("book_copies.id"), nullable=False)
    fine_type: Mapped[str] = mapped_column(String(50), nullable=False)  # QUÁ HẠN, HỎNG, MẤT
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="UNPAID")  # UNPAID, PAID, WAIVED
    collected_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    collected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    waive_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    loan: Mapped["Loan"] = relationship("Loan", foreign_keys=[loan_id])
    book_copy: Mapped["BookCopy"] = relationship("BookCopy", foreign_keys=[book_copy_id])
    collector: Mapped["User | None"] = relationship("User", foreign_keys=[collected_by])
