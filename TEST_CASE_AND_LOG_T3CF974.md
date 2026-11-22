# BÁO CÁO KIỂM THỬ VÀ TEST LOG CHI TIẾT (TASK T3CF974)

**Dự án:** KS25 Library System (UniLib) - Hệ thống Quản lý Thư viện số  
**Sinh viên thực hiện:** Nguyễn Nhật Anh 2 (B25DTCN065)  
**Sprint:** Sprint 3 (18/11 - 24/11) | **Điểm task:** 5  
**Phạm vi kiểm thử:**  
1. **Module 1:** Đặt trước sách khi hết (`T3CFCAC` - Reservation)  
2. **Module 2:** Quản lý Thể loại, Tác giả, Nhà xuất bản (`T3CFCC6` - Taxonomy)  

---

## 1. TỔNG HỢP KẾT QUẢ KIỂM THỬ

- **Tổng số Test Cases:** 23
- **Số Test Case PASS:** 23/23 (100%)
- **Số Test Case FAIL:** 0/23 (0%)
- **Phân loại kiểm thử đầy đủ:**
  + **Đúng (Happy Path):** 8 test cases
  + **Sai dữ liệu (Validation / Business Logic):** 9 test cases
  + **Chưa đăng nhập (Unauthenticated - 401):** 3 test cases
  + **Sai quyền (Forbidden - 403):** 3 test cases

---

## 2. BẢNG CHI TIẾT TEST CASES VÀ TEST LOG

| ID | Chức năng | Phân loại | Tiêu đề kịch bản | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Bug & Tình trạng |
|---|---|---|---|---|---|:---:|---|
| **TC_RES_01** | Đặt trước sách (T3CFCAC) | `Đúng (Happy Path)` | Độc giả đặt trước thành công khi đầu sách đã hết sạch bản sao khả dụng | HTTP 201 Created. Tạo bản ghi Reservation thành công, status='WAITING', vị trí hàng chờ queue_position=#1. Toast thông báo 'Đặt trước thành công'. | Tạo bản ghi ID #1 thành công, status='WAITING', queue_position=#1. Toast hiển thị đúng thông điệp. | **PASS** | Không có bug |
| **TC_RES_02** | Đặt trước sách (T3CFCAC) | `Đúng (Happy Path)` | Xếp hàng nhiều người theo thứ tự thời gian (FIFO: First In First Out) | HTTP 201 Created. Reader 2 vào vị trí hàng chờ queue_position=#2. Vị trí Reader 1 giữ nguyên #1. | Reader 2 nhận đơn ID #2, queue_position=#2. Thứ tự FIFO bảo đảm chính xác. | **PASS** | Không có bug |
| **TC_RES_03** | Đặt trước sách (T3CFCAC) | `Sai dữ liệu` | Chặn đặt trước khi đầu sách VẪN CÒN bản sao khả dụng tại thư viện | HTTP 400 Bad Request. Báo lỗi rõ: 'Đầu sách hiện vẫn còn bản sao khả dụng. Bạn có thể mượn trực tiếp mà không cần đặt trước.' | Trả về HTTP 400 với thông báo chi tiết ngăn đặt trước khi sách chưa hết. | **PASS** | Không có bug |
| **TC_RES_04** | Đặt trước sách (T3CFCAC) | `Sai dữ liệu` | Chặn độc giả đặt trước trùng lặp cùng một đầu sách | HTTP 400 Bad Request. Báo lỗi: 'Bạn đã có một yêu cầu đặt trước đang hiệu lực cho cuốn sách này.' | HTTP 400 trả về chính xác, không phát sinh đơn trùng lặp. | **PASS** | Không có bug |
| **TC_RES_05** | Đặt trước sách (T3CFCAC) | `Sai dữ liệu` | Chặn độc giả vượt quá giới hạn tối đa 3 đơn đặt trước đang hiệu lực | HTTP 400 Bad Request. Thông báo: 'Mỗi độc giả chỉ được đặt trước tối đa 3 đầu sách cùng lúc. Vui lòng huỷ hoặc hoàn thành các lượt trước đó.' | Hệ thống chặn thành công, giữ đúng quota 3 cuốn/người. | **PASS** | Không có bug |
| **TC_RES_06** | Đặt trước sách (T3CFCAC) | `Đúng (Happy Path)` | Khi có bản sao được trả -> Người đầu hàng chuyển READY, bản sao sang RESERVED, giữ 2 ngày | Đơn của Reader 1 đổi sang status='READY', gán copy_id=1, hạn pickup_deadline = now + 48h (2 ngày). Bản sao BookCopy.status chuyển thành 'RESERVED'. | Reader 1 chuyển status='READY', pickup_deadline chính xác sau 2 ngày, copy đổi sang RESERVED. | **PASS** | Bug trước đây: Enum transition BORROWED -> RESERVED bị chặn (Đã sửa & Verified) |
| **TC_RES_07** | Đặt trước sách (T3CFCAC) | `Đúng (Happy Path)` | Hết hạn lấy sách 2 ngày -> Tự động chuyển đơn sang EXPIRED, nhường lượt cho người tiếp theo | Đơn Reader 1 chuyển sang 'EXPIRED'. Đơn Reader 2 lập tức chuyển thành 'READY' và nhận cuốn sách đó với deadline 2 ngày mới. | Reader 1 đổi thành EXPIRED, Reader 2 được nâng lên READY với deadline mới. | **PASS** | Không có bug |
| **TC_RES_08** | Đặt trước sách (T3CFCAC) | `Đúng (Happy Path)` | Độc giả chủ động huỷ đơn đặt trước | Đơn chuyển sang status='CANCELLED'. Nếu đang giữ bản sao và không còn ai chờ thì bản sao trả về AVAILABLE. Hàng chờ phía sau tự dồn lên. | Đơn huỷ thành công, bản sao cập nhật AVAILABLE, danh sách cập nhật ngay lập tức. | **PASS** | Không có bug |
| **TC_RES_09** | Đặt trước sách (T3CFCAC) | `Chưa đăng nhập` | Chặn người dùng chưa đăng nhập gọi API đặt trước hoặc xem danh sách đặt | HTTP 401 Unauthorized. Thông báo: 'Yêu cầu đăng nhập để thực hiện thao tác này.' | Trả về HTTP 401 Unauthorized chính xác. | **PASS** | Không có bug |
| **TC_RES_10** | Đặt trước sách (T3CFCAC) | `Sai quyền` | Độc giả không được phép truy cập API dành riêng cho Thủ thư (Staff Ready List / Fulfill) | HTTP 403 Forbidden. Từ chối truy cập vì chỉ có LIBRARIAN hoặc ADMIN mới có quyền duyệt nhận sách tại quầy. | Trả về HTTP 403 Forbidden, bảo đảm an toàn phân quyền. | **PASS** | Không có bug |
| **TC_RES_11** | Đặt trước sách (T3CFCAC) | `Sai dữ liệu` | Gửi mã ISBN không tồn tại trong hệ thống | HTTP 404 Not Found. Báo lỗi: 'Không tìm thấy đầu sách với mã ISBN yêu cầu.' | Trả về HTTP 404 Not Found rõ ràng. | **PASS** | Không có bug |
| **TC_TAX_01** | Quản lý Thể loại (T3CFCC6) | `Đúng (Happy Path)` | Thêm mới thể loại sách thành công với dữ liệu hợp lệ | HTTP 201 Created. Thể loại được lưu vào CSDL, bảng cập nhật thêm dòng mới, toast xanh thông báo thành công. | Thêm thành công ID mới, dữ liệu hiển thị ngay lập tức trên bảng. | **PASS** | Không có bug |
| **TC_TAX_02** | Quản lý Thể loại (T3CFCC6) | `Sai dữ liệu` | Chặn thêm thể loại có tên trùng lặp (không phân biệt hoa/thường) | HTTP 400 Bad Request. Báo lỗi: 'Thể loại 'trí tuệ nhân tạo' đã tồn tại trong hệ thống. Vui lòng chọn tên khác.' | Hệ thống chặn và hiển thị toast đỏ báo lỗi trùng lặp rõ ràng. | **PASS** | Không có bug |
| **TC_TAX_03** | Quản lý Thể loại (T3CFCC6) | `Sai dữ liệu` | Chặn cập nhật đổi tên thể loại trùng với tên của một thể loại khác | HTTP 400 Bad Request. Báo lỗi: 'Tên thể loại 'Kinh tế học' đã tồn tại ở bản ghi khác. Vui lòng chọn tên khác.' | Chặn thành công với HTTP 400 và giữ nguyên dữ liệu cũ. | **PASS** | Không có bug |
| **TC_TAX_04** | Quản lý Thể loại (T3CFCC6) | `Đúng (Happy Path)` | Tìm kiếm thể loại theo từ khoá và phân trang | Hiển thị đúng các thể loại chứa từ khoá 'kinh tế'. Phân trang tính toán đúng total, total_pages, nút Prev/Next hoạt động mượt. | Bộ lọc debounce 350ms hoạt động nhanh nhạy, phân trang chính xác. | **PASS** | Không có bug |
| **TC_TAX_05** | Quản lý Thể loại (T3CFCC6) | `Sai dữ liệu` | CHẶN XOÁ THỂ LOẠI KHI CÒN ĐẦU SÁCH LIÊN KẾT (Yêu cầu cốt lõi bài toán) | Hộp thoại hiển thị cảnh báo đỏ nổi bật: 'Mục này hiện đang có 3 đầu sách liên kết trực tiếp trong kho. Không được phép xoá!'. Nút xoá bị disable. Nếu gọi API DELETE -> HTTP 400: 'Không thể xoá thể loại vì vẫn còn 3 đầu sách liên kết.' | Modal chặn nút xoá, backend trả về HTTP 400 kèm số lượng sách chính xác. | **PASS** | Không có bug |
| **TC_TAX_06** | Quản lý Thể loại (T3CFCC6) | `Đúng (Happy Path)` | Xoá thành công thể loại khi KHÔNG CÒN đầu sách liên kết | HTTP 200 OK. Bản ghi được xoá hoàn toàn khỏi CSDL. Bảng tự động tải lại, toast thông báo 'Đã xoá thành công'. | Xoá thành công, bản ghi biến mất khỏi bảng ngay tức thì. | **PASS** | Không có bug |
| **TC_TAX_07** | Quản lý Tác giả (T3CFCC6) | `Đúng (Happy Path)` | Thêm mới tác giả và kiểm tra chặn trùng lặp | Lần 1: Thành công HTTP 201. Lần 2: Chặn lại HTTP 400 với thông báo 'Tác giả đã tồn tại trong hệ thống.' | Tạo mới thành công lần 1, chặn trùng tên chính xác lần 2. | **PASS** | Không có bug |
| **TC_TAX_08** | Quản lý Tác giả (T3CFCC6) | `Sai dữ liệu` | CHẶN XOÁ TÁC GIẢ KHI CÒN ĐẦU SÁCH LIÊN KẾT | HTTP 400 Bad Request. Báo lỗi: 'Không thể xoá tác giả 'Robert C. Martin' vì vẫn còn 1 đầu sách liên kết tác giả này đứng tên.' | Chặn xoá thành công trên cả giao diện Modal và Backend API. | **PASS** | Không có bug |
| **TC_TAX_09** | Quản lý Nhà xuất bản (T3CFCC6) | `Đúng (Happy Path)` | Thêm mới và cập nhật thông tin Nhà xuất bản | Tạo mới thành công HTTP 201. Cập nhật thành công HTTP 200, hiển thị badge số lượng sách liên kết. | Cả thêm mới và sửa hoạt động hoàn hảo. | **PASS** | Không có bug |
| **TC_TAX_10** | Quản lý Nhà xuất bản (T3CFCC6) | `Sai dữ liệu` | CHẶN XOÁ NHÀ XUẤT BẢN KHI CÒN ĐẦU SÁCH LIÊN KẾT | HTTP 400 Bad Request. Báo lỗi: 'Không thể xoá nhà xuất bản vì vẫn còn 2 đầu sách thuộc NXB này.' | HTTP 400 trả về thông báo chi tiết, không cho phép xoá. | **PASS** | Không có bug |
| **TC_TAX_11** | Quản lý Danh mục (T3CFCC6) | `Chưa đăng nhập` | Chặn người dùng chưa đăng nhập thực hiện thao tác thêm/sửa/xoá danh mục | Từ chối thực hiện hoặc yêu cầu đăng nhập đối với các thao tác quản trị. | Frontend điều hướng trang login hoặc backend chặn thao tác trái phép. | **PASS** | Không có bug |
| **TC_TAX_12** | Quản lý Danh mục (T3CFCC6) | `Sai dữ liệu` | Xử lý khi nhập tên để trống hoặc toàn dấu cách trắng | Chặn ngay tại Frontend (HTML5 validation required) và Backend kiểm tra .strip() rỗng trả về HTTP 400: 'Tên không được để trống.' | Chặn thành công cả ở client và server. | **PASS** | Không có bug |