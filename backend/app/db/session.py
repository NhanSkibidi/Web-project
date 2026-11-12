"""Kết nối MySQL bằng SQLAlchemy."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# engine: "đường ống" tới MySQL hoặc SQLite khi test
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)

# SessionLocal(): mỗi lần gọi tạo ra 1 phiên làm việc với DB
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Mọi model (bảng) đều kế thừa từ Base."""


def get_db():
    """Dependency cho FastAPI: mở session cho mỗi request và luôn đóng lại sau đó.

    Dùng trong router:  db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
