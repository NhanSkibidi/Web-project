import enum
from datetime import datetime
from sqlalchemy import DateTime, Date, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class BorrowType(str, enum.Enum):
    ONLINE = "ONLINE"      
    WALK_IN = "WALK_IN"    

class LoanStatus(str, enum.Enum):
    PENDING = "PENDING"        
    APPROVED = "APPROVED"      
    BORROWED = "BORROWED"      
    RETURNED = "RETURNED"      
    REJECTED = "REJECTED"     
    CANCELLED = "CANCELLED"   


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    processed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    borrow_type: Mapped[BorrowType] = mapped_column(
        Enum(BorrowType), default=BorrowType.ONLINE
    )
    status: Mapped[LoanStatus] = mapped_column(
        Enum(LoanStatus), default=LoanStatus.PENDING
    )
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    borrowed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="loans")
    librarian = relationship("User", foreign_keys=[processed_by])
    loan_items = relationship("LoanItem", back_populates="loan", cascade="all, delete-orphan")
