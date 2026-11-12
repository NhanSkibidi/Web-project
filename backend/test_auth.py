import os
import sys

# Đảm bảo dùng CSDL SQLite test để chạy độc lập
os.environ["DATABASE_URL"] = "sqlite:///./test_auth.db"

# Xoá file db cũ nếu có
if os.path.exists("test_auth.db"):
    try:
        os.remove("test_auth.db")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath("."))

import app.models
from app.db.session import engine, Base
Base.metadata.create_all(bind=engine)

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

print("=" * 60)
print("BẮT ĐẦU KIỂM THỬ CÁC ENDPOINT AUTHENTICATION")
print("=" * 60)

# 1. Đăng ký tài khoản READER mới
print("\n[1] TEST: POST /auth/register - Đăng ký tài khoản độc giả mới")
reg_payload = {
    "email": "docgia01@library.com",
    "password": "Password@123",
    "full_name": "Nguyễn Văn Độc Giả",
    "phone": "0912345678"
}
res = client.post("/auth/register", json=reg_payload)
print(f"Status Code: {res.status_code}")
reg_data = res.json()
print("Response JSON:")
import json
print(json.dumps(reg_data, indent=2, ensure_ascii=False))

assert res.status_code == 201, f"Expected 201, got {res.status_code}"
assert reg_data["user"]["role"] == "READER", "Role must be READER"
assert reg_data["user"]["status"] == "ACTIVE", "User must be ACTIVE"
assert "password" not in reg_data["user"] and "password_hash" not in reg_data["user"]
assert reg_data["library_card"]["status"] == "ACTIVE"
assert reg_data["library_card"]["card_type"] == "STANDARD"
assert reg_data["library_card"]["max_borrow_books"] == 5
assert reg_data["library_card"]["card_code"].startswith("LC-")
print("=> ĐÃ TẠO TÀI KHOẢN READER VÀ TỰ CẤP THẺ THƯ VIỆN HẠN 1 NĂM THÀNH CÔNG!")

# 2. Đăng ký trùng email
print("\n[2] TEST: POST /auth/register - Đăng ký trùng email (Kỳ vọng 409 Conflict)")
res_dup = client.post("/auth/register", json=reg_payload)
print(f"Status Code: {res_dup.status_code}")
print("Response JSON:", res_dup.json())
assert res_dup.status_code == 409, f"Expected 409, got {res_dup.status_code}"
assert res_dup.json()["detail"] == "Email đã được sử dụng"
print("=> EMAIL TRÙNG ĐÃ TRẢ VỀ 409 CONFLICT CHÍNH XÁC!")

# 3. Validation dữ liệu đăng ký (email sai, thiếu trường)
print("\n[3] TEST: POST /auth/register - Validate dữ liệu sai (Kỳ vọng 422 Unprocessable Entity)")
res_inv = client.post("/auth/register", json={
    "email": "not-an-email",
    "password": "123",
    "full_name": ""
})
print(f"Status Code: {res_inv.status_code}")
print("Response JSON:", res_inv.json())
assert res_inv.status_code == 422, f"Expected 422, got {res_inv.status_code}"
print("=> VALIDATE DỮ LIỆU ĐẦU VÀO HOẠT ĐỘNG CHUẨN XÁC!")

# 4. Đăng nhập đúng thông tin
print("\n[4] TEST: POST /auth/login - Đăng nhập đúng thông tin")
login_payload = {
    "email": "docgia01@library.com",
    "password": "Password@123"
}
res_login = client.post("/auth/login", json=login_payload)
print(f"Status Code: {res_login.status_code}")
login_data = res_login.json()
print("Response JSON:", login_data)
assert res_login.status_code == 200, f"Expected 200, got {res_login.status_code}"
assert "access_token" in login_data and login_data["token_type"] == "bearer"
token = login_data["access_token"]
print(f"=> ĐĂNG NHẬP THÀNH CÔNG, TRẢ VỀ ACCESS TOKEN: {token[:25]}...")

# 5. Đăng nhập sai mật khẩu
print("\n[5] TEST: POST /auth/login - Đăng nhập sai mật khẩu (Kỳ vọng 401 Unauthorized)")
res_wrong = client.post("/auth/login", json={
    "email": "docgia01@library.com",
    "password": "WrongPassword@123"
})
print(f"Status Code: {res_wrong.status_code}")
print("Response JSON:", res_wrong.json())
assert res_wrong.status_code == 401, f"Expected 401, got {res_wrong.status_code}"
print("=> ĐĂNG NHẬP SAI MẬT KHẨU TRẢ VỀ 401 CHUẨN XÁC!")

# 6. GET /auth/me với Bearer Token
print("\n[6] TEST: GET /auth/me - Lấy thông tin user hiện tại qua JWT Bearer Token")
res_me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
print(f"Status Code: {res_me.status_code}")
me_data = res_me.json()
print("Response JSON:")
print(json.dumps(me_data, indent=2, ensure_ascii=False))
assert res_me.status_code == 200, f"Expected 200, got {res_me.status_code}"
assert me_data["email"] == "docgia01@library.com"
assert me_data["role"] == "READER"
assert "password" not in me_data and "password_hash" not in me_data
print("=> LẤY THÔNG TIN TÀI KHOẢN TỪ JWT THÀNH CÔNG!")

# 7. GET /auth/me không có Token hoặc Token sai
print("\n[7] TEST: GET /auth/me - Không gửi Token (Kỳ vọng 401 Unauthorized)")
res_no_tok = client.get("/auth/me")
print(f"Status Code: {res_no_tok.status_code}")
print("Response JSON:", res_no_tok.json())
assert res_no_tok.status_code == 401, f"Expected 401, got {res_no_tok.status_code}"

# 8. Kiểm tra tương thích cả 2 prefix: /api/auth và /auth
print("\n[8] TEST: Kiểm tra tương thích cả 2 đường dẫn /api/auth và /auth")
res_prefix_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
assert res_prefix_me.status_code == 200
print("=> CẢ 2 ĐƯỜNG DẪN /api/auth VÀ /auth ĐỀU HOẠT ĐỘNG HOÀN HẢO!")

print("\n" + "=" * 60)
print("TẤT CẢ CÁC BÀI TEST ĐỀU ĐẠT 100%!")
print("=" * 60)
