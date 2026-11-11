"""Request/response schemas for authentication endpoints."""
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.library_card import LibraryCardOut
from app.schemas.user import UserOut


def validate_password_bytes(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Mật khẩu không được vượt quá 72 byte khi mã hóa UTF-8")
    return password


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=20)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("full_name", mode="before")
    @classmethod
    def normalize_full_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("password")
    @classmethod
    def check_password_bytes(cls, value: str) -> str:
        return validate_password_bytes(value)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def check_password_bytes(cls, value: str) -> str:
        return validate_password_bytes(value)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    user: UserOut
    library_card: LibraryCardOut
