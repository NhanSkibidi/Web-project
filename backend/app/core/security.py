"""Băm mật khẩu và tạo/kiểm tra JWT.

Băm = biến mật khẩu thành chuỗi khó đoán ngược lại. DB chỉ lưu chuỗi băm.
Mỗi lần băm cùng 1 mật khẩu cho ra chuỗi khác nhau (do bcrypt tự thêm "muối"),
nên phải dùng verify_password() để so sánh, không so sánh bằng dấu ==.
"""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(subject: int) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(subject), "iat": now, "exp": expires_at},
        settings.JWT_SECRET_KEY,
        algorithm="HS256",
    )


def decode_access_token(token: str) -> int:
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.isdecimal():
        raise jwt.InvalidTokenError("Token subject không hợp lệ")
    return int(subject)
