"""Schema cho User. Lưu ý: UserOut KHÔNG có mật khẩu -> không bao giờ trả mật khẩu cho FE."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole, UserStatus


class UserBase(BaseModel):
    email: EmailStr = Field(examples=["docgia01@library.com"])
    full_name: str = Field(min_length=1, max_length=255, examples=["Nguyễn Văn An"])
    phone: str | None = Field(default=None, max_length=20, examples=["0912345678"])
    role: UserRole = UserRole.READER
    status: UserStatus = UserStatus.ACTIVE


class UserCreate(UserBase):
    """Dữ liệu FE gửi lên khi TẠO user. Có mật khẩu gốc, server sẽ băm bcrypt rồi mới lưu."""

    password: str = Field(min_length=6, max_length=72, examples=["Docgia@123"])


class UserUpdate(BaseModel):
    """Dữ liệu FE gửi lên khi SỬA. Trường nào không gửi thì giữ nguyên."""

    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6, max_length=72)
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole | None = None
    status: UserStatus | None = None


class UserOut(UserBase):
    """Dữ liệu API trả về cho FE (không có password)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
