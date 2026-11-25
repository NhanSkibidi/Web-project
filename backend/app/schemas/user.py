"""Schema cho User. Lưu ý: UserOut KHÔNG có mật khẩu -> không bao giờ trả mật khẩu cho FE."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.security import validate_password_bytes
from app.models.user import UserRole, UserStatus
from app.schemas.library_card import LibraryCardOut


class UserBase(BaseModel):
    email: EmailStr = Field(examples=["docgia01@library.com"])
    full_name: str = Field(min_length=1, max_length=255, examples=["Nguyễn Văn An"])
    phone: str | None = Field(default=None, max_length=20, examples=["0912345678"])
    role: UserRole = UserRole.READER
    status: UserStatus = UserStatus.ACTIVE


class UserOut(UserBase):
    """Dữ liệu API trả về cho FE (không có password)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


# ==============================================================================
# SCHEMAS HỒ SƠ CÁ NHÂN & ĐỔI MẬT KHẨU (ĐỘC GIẢ / THỦ THƯ / ADMIN)
# ==============================================================================
class ProfileOut(UserOut):
    """Hồ sơ người dùng hiện tại, kèm thông tin thẻ thư viện (nếu là Độc giả)."""

    library_card: LibraryCardOut | None = None


class ProfileUpdateRequest(BaseModel):
    """Độc giả / Thủ thư tự cập nhật thông tin cá nhân (không cho phép tự đổi role/status)."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None


class ChangePasswordRequest(BaseModel):
    """Yêu cầu đổi mật khẩu: bắt buộc kiểm tra mật khẩu cũ."""

    old_password: str = Field(min_length=1, max_length=72, description="Mật khẩu hiện tại")
    new_password: str = Field(min_length=8, max_length=72, description="Mật khẩu mới (tối thiểu 8 ký tự)")
    confirm_password: str | None = Field(default=None, max_length=72, description="Xác nhận mật khẩu mới (tuỳ chọn)")

    @field_validator("old_password", "new_password")
    @classmethod
    def check_password_bytes(cls, value: str) -> str:
        return validate_password_bytes(value)

    @field_validator("confirm_password")
    @classmethod
    def check_confirm_password_bytes(cls, value: str | None) -> str | None:
        return validate_password_bytes(value) if value is not None else None


class ChangePasswordResponse(BaseModel):
    message: str


# ==============================================================================
# SCHEMAS QUẢN TRỊ TÀI KHOẢN THỦ THƯ (CHỈ DÀNH CHO ADMIN)
# ==============================================================================
class LibrarianCreateRequest(BaseModel):
    """Admin tạo tài khoản Thủ thư mới."""

    email: EmailStr = Field(examples=["thuthu3@library.com"])
    full_name: str = Field(min_length=1, max_length=255, examples=["Nguyễn Thị Thủ Thư"])
    phone: str | None = Field(default=None, max_length=20, examples=["0901234567"])
    password: str = Field(min_length=8, max_length=72, examples=["Thuthu@123"])

    @field_validator("password")
    @classmethod
    def check_password_bytes(cls, value: str) -> str:
        return validate_password_bytes(value)


class LibrarianUpdateRequest(BaseModel):
    """Admin sửa thông tin tài khoản Thủ thư (mật khẩu là tuỳ chọn để đặt lại)."""

    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    password: str | None = Field(default=None, min_length=8, max_length=72)
    status: UserStatus | None = None

    @field_validator("password")
    @classmethod
    def check_password_bytes(cls, value: str | None) -> str | None:
        return validate_password_bytes(value) if value is not None else None


class LibrarianListResponse(BaseModel):
    """Danh sách tài khoản Thủ thư kèm thống kê nhanh cho trang Admin."""

    items: list[UserOut]
    total: int
    active_count: int
    locked_count: int
