"""Băm và kiểm tra mật khẩu bằng bcrypt.

Băm = biến mật khẩu thành chuỗi khó đoán ngược lại. DB chỉ lưu chuỗi băm.
Mỗi lần băm cùng 1 mật khẩu cho ra chuỗi khác nhau (do bcrypt tự thêm "muối"),
nên phải dùng verify_password() để so sánh, không so sánh bằng dấu ==.
"""
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
