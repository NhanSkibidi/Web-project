"""Model CardActionLog = bảng card_action_logs (lịch sử gia hạn, khoá/mở thẻ kèm lý do)."""
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.library_card import LibraryCard
    from app.models.user import User


class CardActionLog(Base):
    __tablename__ = "card_action_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    card_id: Mapped[int] = mapped_column(
        ForeignKey("library_cards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reader_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Hành động: LOCK (Khoá thẻ), UNLOCK (Mở thẻ), EXTEND (Gia hạn), AUTO_EXPIRE (Tự động hết hạn)
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    old_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    old_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    new_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    performed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    card: Mapped["LibraryCard"] = relationship("LibraryCard", foreign_keys=[card_id])
    reader: Mapped["User"] = relationship("User", foreign_keys=[reader_id])
    performer: Mapped["User | None"] = relationship("User", foreign_keys=[performed_by])
