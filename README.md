# Dự án Thư viện số KS25 Library (HN-KS25-CNTT1)

Hệ thống quản lý và tra cứu tài liệu học thuật trực tuyến. Dự án gồm 2 phần:

| Thư mục | Công nghệ | Mô tả chức năng |
|---|---|---|
| [`backend/`](backend/README.md) | Python FastAPI + MySQL (SQLAlchemy) | API quản lý sách, bạn đọc, mượn trả tài liệu |
| `frontend/` | HTML5 · CSS3 · JavaScript ES6 | Giao diện Trang chủ và Tra cứu danh mục ấn bản |

```
Trình duyệt (frontend) --axios JSON--> FastAPI (backend :8000/api) --SQLAlchemy--> MySQL (:3306)
```

## Cấu trúc thư mục Frontend
```
frontend/
├── pages/                # Toàn bộ trang giao diện HTML
│   ├── home.html         # Trang chủ thư viện & danh mục chuyên ngành
│   ├── index.html        # Trang chủ cổng vào (đồng bộ với home.html)
│   └── search.html       # Trang tra cứu danh mục ấn bản & bộ lọc
├── css/
│   ├── home.css          # CSS trang chủ thư viện (Design System KS25)
│   ├── search.css        # CSS trang tra cứu ấn bản
│   └── style.css         # CSS dùng chung hệ thống
└── js/
    ├── layout.js         # Menu điều hướng & header dùng chung
    └── pages/
        ├── home.js       # Logic trang chủ (tìm kiếm, carousel, danh mục)
        └── search.js     # Logic trang tra cứu danh mục ấn bản
```

## Hướng dẫn chạy dự án

1. **MySQL Workbench:** File → Open SQL Script → chọn `backend/sql/init.sql` → bấm ⚡ Execute.
2. **Backend** (mở terminal trong thư mục `backend/`):
   ```bash
   copy .env.example .env               # Mac/Linux: cp .env.example .env
   # mở .env, điền DB_PASSWORD = mật khẩu root MySQL của bạn
   python -m venv .venv
   .venv\Scripts\activate               # Mac/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload        # http://127.0.0.1:8000/docs
   ```
3. **Frontend:**
   - Trong VS Code: Chuột phải vào file `frontend/pages/home.html` (hoặc `frontend/pages/search.html`) → chọn **Open with Live Server**.
   - Trình duyệt sẽ mở tại địa chỉ: `http://127.0.0.1:5500/pages/home.html`.

