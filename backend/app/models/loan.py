from datetime import datetime
from sqlalchemy import DateTime, String, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    processed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    borrow_type: Mapped[str] = mapped_column(Enum("ONLINE", "WALK_IN"),default="ONLINE")
    status: Mapped[str] = mapped_column(Enum("PENDING","APPROVED","BORROWED","RETURNED","REJECTED","CANCELLED"),default="PENDING")
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime,server_default=func.now())
    borrowed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    user = relationship("User",foreign_keys=[user_id],back_populates="loans")
    librarian = relationship("User",foreign_keys=[processed_by])
    loan_items = relationship("LoanItem",back_populates="loan",cascade="all, delete-orphan")