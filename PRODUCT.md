# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Độc giả (Sinh viên, Giảng viên):** Tìm kiếm và tra cứu đầu sách, kiểm tra tình trạng sẵn sàng của các bản sao, theo dõi thẻ thư viện cá nhân và gửi yêu cầu mượn sách online.
- **Thủ thư / Quản trị viên:** Quản lý kho sách và bản sao, duyệt yêu cầu mượn online, tiếp nhận trả sách tại quầy bằng mã cuốn (`copy_code`), kiểm tra sách quá hạn và xử lý tiền phạt vi phạm.

## Product Purpose
Hệ thống quản lý thư viện số phục vụ đồ án thực tập CNTT (HN-KS25-CNTT1). Hệ thống số hóa toàn diện quy trình mượn - trả sách, theo dõi chính xác trạng thái từng bản sao sách vật lý (`AVAILABLE`, `BORROWED`, `RESERVED`, `LOST`, `DAMAGED`) và tự động hóa tính toán tiền phạt trễ hạn / hư hỏng.

## Positioning
Giải pháp quản lý thư viện trường học tinh gọn, tối ưu tốc độ tác nghiệp quầy thủ thư, hỗ trợ tra cứu trực tuyến cho độc giả, vận hành ổn định trên kiến trúc 3 tầng: Giao diện thuần (HTML/CSS/JS + Axios) -> Backend RESTful (FastAPI) -> Cơ sở dữ liệu quan hệ (MySQL).

## Operating Context
- **Cổng Độc giả:** Sử dụng trên trình duyệt máy tính và thiết bị di động để tra cứu danh mục, kiểm tra giá bìa, vị trí kệ sách và quản lý lịch sử mượn.
- **Bàn làm việc Thủ thư:** Sử dụng trên máy trạm quầy thủ thư, thao tác nhanh với phím và máy quét mã bản sao sách (`copy_code`), xử lý các đợt trả sách và thu phí phạt.

## Capabilities and Constraints
- **Kiến trúc công nghệ:** Backend FastAPI (Python 3.14) + SQLAlchemy 2.0 + MySQL 8; Frontend HTML5, CSS3, JavaScript ES6 thuần và thư viện Axios.
- **Xác thực & Phân quyền:** JWT Bearer Token với các vai trò `READER`, `LIBRARIAN`, `ADMIN`.
- **Ràng buộc mượn sách:** Thẻ thư viện phải ở trạng thái `ACTIVE` và còn hạn; không có sách quá hạn chưa trả; không có khoản phạt `UNPAID`; không vượt quá số lượng mượn tối đa của thẻ (mặc định 5 cuốn).
- **Quy trình trả sách:** Hỗ trợ trả từng cuốn theo `copy_code` (hoặc `book_copy_id`) hoặc trả toàn bộ phiếu mượn; tự động chuyển bản sao về `AVAILABLE` và cập nhật trạng thái phiếu `Loan` thành `RETURNED`.
- **Chính sách tiền phạt:** Phạt quá hạn 2.000đ/ngày/cuốn; phạt làm hỏng sách 50% giá bìa; phạt làm mất sách 100% giá bìa.

## Brand Commitments
- **Tên sản phẩm:** KS25 Library Management System.
- **Ngôn ngữ:** Tiếng Việt toàn diện từ thông báo giao diện đến tài liệu API.
- **Phong cách:** Gọn gàng, hiện đại, thời gian phản hồi nhanh, không dùng framework UI nặng nề.

## Evidence on Hand
- Backend API endpoints đã hoàn thiện: `/api/auth` (đăng ký, đăng nhập, thông tin thẻ), `/api/books` (tìm kiếm, tra cứu sách), `/api/loans` (tạo yêu cầu mượn online, hủy mượn), `/api/returns` (ghi nhận trả sách lẻ và cả phiếu).
- Schema và Model cơ sở dữ liệu đã chuẩn hóa hoàn toàn trong `backend/app/models/`.

## Product Principles
1. **Toàn vẹn giao dịch (Atomic Integrity):** Mọi thao tác mượn/trả và chuyển trạng thái bản sao phải được thực thi trong database transaction an toàn.
2. **Tối ưu tốc độ tác nghiệp:** Giảm thiểu số bước thao tác cho thủ thư; quét mã hoặc nhập mã cuốn sách trả về kết quả lập tức.
3. **Minh bạch và Nhất quán:** Dữ liệu hiển thị ở Frontend phải đồng bộ 100% với trạng thái thực tế trong cơ sở dữ liệu backend.

## Accessibility & Inclusion
- Cung cấp phản hồi trạng thái rõ ràng (thành công, cảnh báo, lỗi) qua các thông báo trực quan.
- Tương thích tốt với các kích thước màn hình phổ biến trong nhà trường.

