from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.db.session import Base

class Fine(Base):
    __tablename__ = "fines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    loan_id = Column(Integer, nullable=False)
    book_copy_id = Column(Integer, nullable=False)
    fine_type = Column(String(50), nullable=False)
    amount = Column(Float, default=0.0)
    status = Column(String(20), default="UNPAID")
    collected_by = Column(Integer, nullable=True)
    collected_at = Column(DateTime, nullable=True)
    waive_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)