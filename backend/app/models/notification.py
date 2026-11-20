from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.loan import Loan
    from app.models.loan_item import LoanItem


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    loan_id: Mapped[int | None] = mapped_column(ForeignKey("loans.id", ondelete="SET NULL"), nullable=True)
    loan_item_id: Mapped[int | None] = mapped_column(ForeignKey("loan_items.id", ondelete="SET NULL"), nullable=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="OVERDUE")  # OVERDUE, DUE_SOON, REMINDER, SYSTEM, FINE
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    loan: Mapped["Loan | None"] = relationship("Loan", foreign_keys=[loan_id])
    loan_item: Mapped["LoanItem | None"] = relationship("LoanItem", foreign_keys=[loan_item_id])
