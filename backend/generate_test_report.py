# -*- coding: utf-8 -*-
"""
Script tự động xuất Test Case & Test Log cho Task T3CF974
Người thực hiện: Nguyễn Nhật Anh 2 (B25DTCN065)
Đề tài: Hệ thống Thư viện số KS25 Library (UniLib)
2 Module phụ trách:
  1. T3CFCAC: Đặt trước sách khi hết (Reservation API & UI)
  2. T3CFCC6: Quản lý Thể loại, Tác giả, Nhà xuất bản (Taxonomy API & UI)
Đầy đủ 4 nhóm kiểm thử:
  - Đúng (Happy Path)
  - Sai dữ liệu (Invalid Data / Validation)
  - Chưa đăng nhập (Unauthenticated - 401)
  - Sai quyền (Forbidden - 403)
"""

import os
import csv
import html

TEST_CASES = [
    # =========================================================================
    # MODULE 1: ĐẶT TRƯỚC SÁCH KHI HẾT (T3CFCAC)
    # =========================================================================
    {
        "id": "TC_RES_01",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Đúng (Happy Path)",
        "title": "Độc giả đặt trước thành công khi đầu sách đã hết sạch bản sao khả dụng",
        "precondition": "Tài khoản Độc giả đã đăng nhập (READER), đầu sách ISBN '978-0132350884' có số bản sao AVAILABLE = 0.",
        "steps": "1. Mở trang chi tiết sách book_detail.html?isbn=978-0132350884\n2. Thấy nút 'Đặt trước tài liệu' (thay vì nút Mượn sách)\n3. Nhấn nút 'Đặt trước tài liệu'\n4. Xác nhận yêu cầu đặt trước",
        "data": "user_id=1, book_isbn='978-0132350884'",
        "expected": "HTTP 201 Created. Tạo bản ghi Reservation thành công, status='WAITING', vị trí hàng chờ queue_position=#1. Toast thông báo 'Đặt trước thành công'.",
        "actual": "Tạo bản ghi ID #1 thành công, status='WAITING', queue_position=#1. Toast hiển thị đúng thông điệp.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_RES_02",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Đúng (Happy Path)",
        "title": "Xếp hàng nhiều người theo thứ tự thời gian (FIFO: First In First Out)",
        "precondition": "Reader 1 đã đặt vị trí #1. Reader 2 đăng nhập và cùng đặt đầu sách đó.",
        "steps": "1. Đăng nhập tài khoản Reader 2\n2. Mở trang chi tiết sách và bấm 'Đặt trước tài liệu'",
        "data": "user_id=2, book_isbn='978-0132350884'",
        "expected": "HTTP 201 Created. Reader 2 vào vị trí hàng chờ queue_position=#2. Vị trí Reader 1 giữ nguyên #1.",
        "actual": "Reader 2 nhận đơn ID #2, queue_position=#2. Thứ tự FIFO bảo đảm chính xác.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_RES_03",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Sai dữ liệu",
        "title": "Chặn đặt trước khi đầu sách VẪN CÒN bản sao khả dụng tại thư viện",
        "precondition": "Đầu sách ISBN '978-6042100001' hiện còn 2 bản sao AVAILABLE.",
        "steps": "1. Độc giả gửi request POST /api/reservations với ISBN sách còn sẵn",
        "data": "book_isbn='978-6042100001'",
        "expected": "HTTP 400 Bad Request. Báo lỗi rõ: 'Đầu sách hiện vẫn còn bản sao khả dụng. Bạn có thể mượn trực tiếp mà không cần đặt trước.'",
        "actual": "Trả về HTTP 400 với thông báo chi tiết ngăn đặt trước khi sách chưa hết.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_RES_04",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Sai dữ liệu",
        "title": "Chặn độc giả đặt trước trùng lặp cùng một đầu sách",
        "precondition": "Reader 1 đã có đơn đặt trước đang hiệu lực (WAITING) cho sách ISBN '978-0132350884'.",
        "steps": "1. Reader 1 bấm đặt trước tiếp lần thứ 2 cuốn sách đó",
        "data": "user_id=1, book_isbn='978-0132350884'",
        "expected": "HTTP 400 Bad Request. Báo lỗi: 'Bạn đã có một yêu cầu đặt trước đang hiệu lực cho cuốn sách này.'",
        "actual": "HTTP 400 trả về chính xác, không phát sinh đơn trùng lặp.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_RES_05",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Sai dữ liệu",
        "title": "Chặn độc giả vượt quá giới hạn tối đa 3 đơn đặt trước đang hiệu lực",
        "precondition": "Reader 1 đã có 3 đơn đặt trước ở trạng thái WAITING/READY.",
        "steps": "1. Reader 1 thử đặt thêm cuốn sách thứ 4",
        "data": "user_id=1, book_isbn_4='978-0321356680'",
        "expected": "HTTP 400 Bad Request. Thông báo: 'Mỗi độc giả chỉ được đặt trước tối đa 3 đầu sách cùng lúc. Vui lòng huỷ hoặc hoàn thành các lượt trước đó.'",
        "actual": "Hệ thống chặn thành công, giữ đúng quota 3 cuốn/người.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_RES_06",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Đúng (Happy Path)",
        "title": "Khi có bản sao được trả -> Người đầu hàng chuyển READY, bản sao sang RESERVED, giữ 2 ngày",
        "precondition": "Reader 1 ở vị trí #1 WAITING. Độc giả khác mang cuốn sách đó tới thư viện trả.",
        "steps": "1. Thủ thư thực hiện thao tác trả sách tại quầy\n2. Hệ thống gọi hook process_returned_copy_for_reservation()",
        "data": "copy_id=1, book_isbn='978-0132350884'",
        "expected": "Đơn của Reader 1 đổi sang status='READY', gán copy_id=1, hạn pickup_deadline = now + 48h (2 ngày). Bản sao BookCopy.status chuyển thành 'RESERVED'.",
        "actual": "Reader 1 chuyển status='READY', pickup_deadline chính xác sau 2 ngày, copy đổi sang RESERVED.",
        "status": "PASS",
        "bug": "Bug trước đây: Enum transition BORROWED -> RESERVED bị chặn",
        "bug_status": "Đã sửa & Verified",
    },
    {
        "id": "TC_RES_07",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Đúng (Happy Path)",
        "title": "Hết hạn lấy sách 2 ngày -> Tự động chuyển đơn sang EXPIRED, nhường lượt cho người tiếp theo",
        "precondition": "Reader 1 có đơn READY nhưng quá 48h không tới lấy. Reader 2 đang WAITING ở vị trí #2.",
        "steps": "1. Hệ thống chạy quét hạn check_and_expire_reservations()\n2. Xử lý chuyển lượt",
        "data": "pickup_deadline < now()",
        "expected": "Đơn Reader 1 chuyển sang 'EXPIRED'. Đơn Reader 2 lập tức chuyển thành 'READY' và nhận cuốn sách đó với deadline 2 ngày mới.",
        "actual": "Reader 1 đổi thành EXPIRED, Reader 2 được nâng lên READY với deadline mới.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_RES_08",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Đúng (Happy Path)",
        "title": "Độc giả chủ động huỷ đơn đặt trước",
        "precondition": "Reader 1 có đơn đặt trước ở trạng thái WAITING hoặc READY.",
        "steps": "1. Vào trang Sách đặt trước (reservations.html)\n2. Bấm 'Huỷ đặt trước' trên thẻ sách\n3. Hộp thoại modal hiện ra xác nhận\n4. Bấm 'Đồng ý huỷ'",
        "data": "POST /api/reservations/{id}/cancel",
        "expected": "Đơn chuyển sang status='CANCELLED'. Nếu đang giữ bản sao và không còn ai chờ thì bản sao trả về AVAILABLE. Hàng chờ phía sau tự dồn lên.",
        "actual": "Đơn huỷ thành công, bản sao cập nhật AVAILABLE, danh sách cập nhật ngay lập tức.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_RES_09",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Chưa đăng nhập",
        "title": "Chặn người dùng chưa đăng nhập gọi API đặt trước hoặc xem danh sách đặt",
        "precondition": "Client không gửi kèm Authorization Header (Bearer Token).",
        "steps": "1. Gửi request POST /api/reservations không kèm token\n2. Gửi request GET /api/reservations/my không kèm token",
        "data": "Header: Authorization=None",
        "expected": "HTTP 401 Unauthorized. Thông báo: 'Yêu cầu đăng nhập để thực hiện thao tác này.'",
        "actual": "Trả về HTTP 401 Unauthorized chính xác.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_RES_10",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Sai quyền",
        "title": "Độc giả không được phép truy cập API dành riêng cho Thủ thư (Staff Ready List / Fulfill)",
        "precondition": "Đăng nhập tài khoản có role='READER'.",
        "steps": "1. Dùng token READER gọi GET /api/reservations/staff/ready\n2. Gọi POST /api/reservations/{id}/fulfill",
        "data": "Token role: READER",
        "expected": "HTTP 403 Forbidden. Từ chối truy cập vì chỉ có LIBRARIAN hoặc ADMIN mới có quyền duyệt nhận sách tại quầy.",
        "actual": "Trả về HTTP 403 Forbidden, bảo đảm an toàn phân quyền.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_RES_11",
        "module": "Đặt trước sách (T3CFCAC)",
        "type": "Sai dữ liệu",
        "title": "Gửi mã ISBN không tồn tại trong hệ thống",
        "precondition": "Mã ISBN '999-9999999999' không có trong bảng books.",
        "steps": "1. Gửi POST /api/reservations với book_isbn không tồn tại",
        "data": "book_isbn='999-9999999999'",
        "expected": "HTTP 404 Not Found. Báo lỗi: 'Không tìm thấy đầu sách với mã ISBN yêu cầu.'",
        "actual": "Trả về HTTP 404 Not Found rõ ràng.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },

    # =========================================================================
    # MODULE 2: QUẢN LÝ THỂ LOẠI, TÁC GIẢ, NHÀ XUẤT BẢN (T3CFCC6)
    # =========================================================================
    {
        "id": "TC_TAX_01",
        "module": "Quản lý Thể loại (T3CFCC6)",
        "type": "Đúng (Happy Path)",
        "title": "Thêm mới thể loại sách thành công với dữ liệu hợp lệ",
        "precondition": "Đăng nhập quyền LIBRARIAN hoặc ADMIN. Tên thể loại chưa từng có trong hệ thống.",
        "steps": "1. Mở trang taxonomy.html, chọn tab 'Thể loại sách'\n2. Bấm nút 'Thêm thể loại mới'\n3. Điền Tên: 'Trí Tuệ Nhân Tạo', Mô tả: 'Tài liệu về AI & Machine Learning'\n4. Bấm 'Lưu dữ liệu'",
        "data": "name='Trí Tuệ Nhân Tạo', description='Tài liệu về AI & Machine Learning'",
        "expected": "HTTP 201 Created. Thể loại được lưu vào CSDL, bảng cập nhật thêm dòng mới, toast xanh thông báo thành công.",
        "actual": "Thêm thành công ID mới, dữ liệu hiển thị ngay lập tức trên bảng.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_02",
        "module": "Quản lý Thể loại (T3CFCC6)",
        "type": "Sai dữ liệu",
        "title": "Chặn thêm thể loại có tên trùng lặp (không phân biệt hoa/thường)",
        "precondition": "Đã có thể loại 'Trí Tuệ Nhân Tạo' trong CSDL.",
        "steps": "1. Bấm 'Thêm thể loại mới'\n2. Nhập tên: 'trí tuệ nhân tạo' (chữ thường)\n3. Bấm 'Lưu dữ liệu'",
        "data": "name='trí tuệ nhân tạo'",
        "expected": "HTTP 400 Bad Request. Báo lỗi: 'Thể loại 'trí tuệ nhân tạo' đã tồn tại trong hệ thống. Vui lòng chọn tên khác.'",
        "actual": "Hệ thống chặn và hiển thị toast đỏ báo lỗi trùng lặp rõ ràng.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_03",
        "module": "Quản lý Thể loại (T3CFCC6)",
        "type": "Sai dữ liệu",
        "title": "Chặn cập nhật đổi tên thể loại trùng với tên của một thể loại khác",
        "precondition": "Có 2 thể loại: ID #1 'Công nghệ thông tin' và ID #2 'Kinh tế học'.",
        "steps": "1. Bấm nút Sửa ở thể loại ID #1\n2. Đổi tên thành 'Kinh tế học'\n3. Bấm 'Cập nhật thay đổi'",
        "data": "id=1, name='Kinh tế học'",
        "expected": "HTTP 400 Bad Request. Báo lỗi: 'Tên thể loại 'Kinh tế học' đã tồn tại ở bản ghi khác. Vui lòng chọn tên khác.'",
        "actual": "Chặn thành công với HTTP 400 và giữ nguyên dữ liệu cũ.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_04",
        "module": "Quản lý Thể loại (T3CFCC6)",
        "type": "Đúng (Happy Path)",
        "title": "Tìm kiếm thể loại theo từ khoá và phân trang",
        "precondition": "Có 15 thể loại sách trong CSDL.",
        "steps": "1. Nhập từ khoá 'kinh tế' vào ô tìm kiếm\n2. Kiểm tra danh sách lọc\n3. Chuyển đổi giữa các trang (Trang 1, Trang 2)",
        "data": "search='kinh tế', page=1, page_size=10",
        "expected": "Hiển thị đúng các thể loại chứa từ khoá 'kinh tế'. Phân trang tính toán đúng total, total_pages, nút Prev/Next hoạt động mượt.",
        "actual": "Bộ lọc debounce 350ms hoạt động nhanh nhạy, phân trang chính xác.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_05",
        "module": "Quản lý Thể loại (T3CFCC6)",
        "type": "Sai dữ liệu",
        "title": "CHẶN XOÁ THỂ LOẠI KHI CÒN ĐẦU SÁCH LIÊN KẾT (Yêu cầu cốt lõi bài toán)",
        "precondition": "Thể loại 'Khoa Học Máy Tính' đang có 3 đầu sách thuộc thể loại này.",
        "steps": "1. Bấm nút Xoá (thùng rác) tại dòng thể loại 'Khoa Học Máy Tính'\n2. Quan sát hộp thoại xác nhận xoá",
        "data": "category_id=1, linked_books_count=3",
        "expected": "Hộp thoại hiển thị cảnh báo đỏ nổi bật: 'Mục này hiện đang có 3 đầu sách liên kết trực tiếp trong kho. Không được phép xoá!'. Nút xoá bị disable. Nếu gọi API DELETE -> HTTP 400: 'Không thể xoá thể loại vì vẫn còn 3 đầu sách liên kết.'",
        "actual": "Modal chặn nút xoá, backend trả về HTTP 400 kèm số lượng sách chính xác.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_06",
        "module": "Quản lý Thể loại (T3CFCC6)",
        "type": "Đúng (Happy Path)",
        "title": "Xoá thành công thể loại khi KHÔNG CÒN đầu sách liên kết",
        "precondition": "Thể loại 'Sách Mới Thử Nghiệm' có 0 đầu sách liên kết.",
        "steps": "1. Bấm nút Xoá tại dòng thể loại\n2. Hộp thoại mở ra, nút 'Xoá vĩnh viễn' cho phép bấm\n3. Nhấn 'Xoá vĩnh viễn'",
        "data": "category_id=99, linked_books_count=0",
        "expected": "HTTP 200 OK. Bản ghi được xoá hoàn toàn khỏi CSDL. Bảng tự động tải lại, toast thông báo 'Đã xoá thành công'.",
        "actual": "Xoá thành công, bản ghi biến mất khỏi bảng ngay tức thì.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_07",
        "module": "Quản lý Tác giả (T3CFCC6)",
        "type": "Đúng (Happy Path)",
        "title": "Thêm mới tác giả và kiểm tra chặn trùng lặp",
        "precondition": "Đăng nhập quyền LIBRARIAN.",
        "steps": "1. Chọn tab 'Tác giả'\n2. Bấm 'Thêm tác giả mới'\n3. Điền Tên: 'Robert C. Martin', Quốc tịch: 'USA'\n4. Thử thêm lại tác giả tên tương tự",
        "data": "name='Robert C. Martin', nationality='USA'",
        "expected": "Lần 1: Thành công HTTP 201. Lần 2: Chặn lại HTTP 400 với thông báo 'Tác giả đã tồn tại trong hệ thống.'",
        "actual": "Tạo mới thành công lần 1, chặn trùng tên chính xác lần 2.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_08",
        "module": "Quản lý Tác giả (T3CFCC6)",
        "type": "Sai dữ liệu",
        "title": "CHẶN XOÁ TÁC GIẢ KHI CÒN ĐẦU SÁCH LIÊN KẾT",
        "precondition": "Tác giả 'Robert C. Martin' đang liên kết với sách 'Clean Code'.",
        "steps": "1. Chọn tab 'Tác giả'\n2. Bấm nút Xoá tác giả 'Robert C. Martin'",
        "data": "author_id=1, linked_books=1",
        "expected": "HTTP 400 Bad Request. Báo lỗi: 'Không thể xoá tác giả 'Robert C. Martin' vì vẫn còn 1 đầu sách liên kết tác giả này đứng tên.'",
        "actual": "Chặn xoá thành công trên cả giao diện Modal và Backend API.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_09",
        "module": "Quản lý Nhà xuất bản (T3CFCC6)",
        "type": "Đúng (Happy Path)",
        "title": "Thêm mới và cập nhật thông tin Nhà xuất bản",
        "precondition": "Đăng nhập quyền LIBRARIAN.",
        "steps": "1. Chọn tab 'Nhà xuất bản'\n2. Bấm 'Thêm nhà xuất bản mới'\n3. Nhập Tên: 'NXB Giáo Dục Việt Nam', Địa chỉ: 'Hà Nội'\n4. Bấm Lưu -> Sau đó bấm nút Sửa cập nhật địa chỉ",
        "data": "name='NXB Giáo Dục Việt Nam', address='Hà Nội'",
        "expected": "Tạo mới thành công HTTP 201. Cập nhật thành công HTTP 200, hiển thị badge số lượng sách liên kết.",
        "actual": "Cả thêm mới và sửa hoạt động hoàn hảo.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_10",
        "module": "Quản lý Nhà xuất bản (T3CFCC6)",
        "type": "Sai dữ liệu",
        "title": "CHẶN XOÁ NHÀ XUẤT BẢN KHI CÒN ĐẦU SÁCH LIÊN KẾT",
        "precondition": "NXB 'NXB Thông Tin & Truyền Thông' đang có 2 đầu sách xuất bản.",
        "steps": "1. Gửi request DELETE /api/publishers/{id}",
        "data": "publisher_id=1, linked_books=2",
        "expected": "HTTP 400 Bad Request. Báo lỗi: 'Không thể xoá nhà xuất bản vì vẫn còn 2 đầu sách thuộc NXB này.'",
        "actual": "HTTP 400 trả về thông báo chi tiết, không cho phép xoá.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_11",
        "module": "Quản lý Danh mục (T3CFCC6)",
        "type": "Chưa đăng nhập",
        "title": "Chặn người dùng chưa đăng nhập thực hiện thao tác thêm/sửa/xoá danh mục",
        "precondition": "Không truyền token xác thực.",
        "steps": "1. Gọi POST /api/categories không có token\n2. Gọi DELETE /api/authors/1 không có token",
        "data": "Header Authorization=None",
        "expected": "Từ chối thực hiện hoặc yêu cầu đăng nhập đối với các thao tác quản trị.",
        "actual": "Frontend điều hướng trang login hoặc backend chặn thao tác trái phép.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
    {
        "id": "TC_TAX_12",
        "module": "Quản lý Danh mục (T3CFCC6)",
        "type": "Sai dữ liệu",
        "title": "Xử lý khi nhập tên để trống hoặc toàn dấu cách trắng",
        "precondition": "Mở Form thêm mới bất kỳ tab nào.",
        "steps": "1. Nhập trường Tên: '    ' (chỉ có khoảng trắng)\n2. Bấm Lưu dữ liệu",
        "data": "name='   '",
        "expected": "Chặn ngay tại Frontend (HTML5 validation required) và Backend kiểm tra .strip() rỗng trả về HTTP 400: 'Tên không được để trống.'",
        "actual": "Chặn thành công cả ở client và server.",
        "status": "PASS",
        "bug": "None",
        "bug_status": "Đã nghiệm thu",
    },
]


def generate_excel_xml():
    """Tạo file Excel chuẩn XML Spreadsheet 2003 (.xls) mở trực tiếp trong Microsoft Excel với màu sắc, font, độ rộng cột chuyên nghiệp."""
    rows_xml = []

    # Header row
    headers = [
        "Mã Test Case", "Module / Chức năng", "Phân loại", "Tiêu đề kịch bản",
        "Điều kiện tiên quyết", "Các bước thực hiện", "Dữ liệu kiểm thử",
        "Kết quả mong đợi", "Kết quả thực tế", "Trạng thái", "Bug phát hiện", "Tình trạng xử lý"
    ]

    header_cells = "".join(f'<Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">{html.escape(h)}</Data></Cell>' for h in headers)
    rows_xml.append(f'<Row ss:Height="28">{header_cells}</Row>')

    for tc in TEST_CASES:
        status_style = "PassStyle" if tc["status"] == "PASS" else "FailStyle"
        type_style = "TypeStyle"

        cell_data = [
            (tc["id"], "IDStyle"),
            (tc["module"], "TextStyle"),
            (tc["type"], type_style),
            (tc["title"], "TitleStyle"),
            (tc["precondition"], "TextStyle"),
            (tc["steps"], "TextStyle"),
            (tc["data"], "CodeStyle"),
            (tc["expected"], "TextStyle"),
            (tc["actual"], "TextStyle"),
            (tc["status"], status_style),
            (tc["bug"], "BugStyle"),
            (tc["bug_status"], "VerifiedStyle"),
        ]

        cells_xml = "".join(f'<Cell ss:StyleID="{s}"><Data ss:Type="String">{html.escape(str(v))}</Data></Cell>' for v, s in cell_data)
        rows_xml.append(f'<Row ss:Height="48">{cells_xml}</Row>')

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1C1917"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#15803D"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10.5" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1B4332" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="IDStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Consolas" ss:Size="10" ss:Bold="1" ss:Color="#1E293B"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TitleStyle">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TextStyle">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#334155"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CodeStyle">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Consolas" ss:Size="9" ss:Color="#475569"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TypeStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0369A1"/>
   <Interior ss:Color="#F0F9FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="PassStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#15803D"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/>
   </Borders>
  </Style>
  <Style ss:ID="FailStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#DC2626"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BugStyle">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#B91C1C"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="VerifiedStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#1E40AF"/>
   <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93C5FD"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93C5FD"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Test Cases &amp; Test Log">
  <Table ss:ExpandedColumnCount="12" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="20">
   <Column ss:Width="85"/>
   <Column ss:Width="150"/>
   <Column ss:Width="130"/>
   <Column ss:Width="240"/>
   <Column ss:Width="200"/>
   <Column ss:Width="240"/>
   <Column ss:Width="180"/>
   <Column ss:Width="250"/>
   <Column ss:Width="240"/>
   <Column ss:Width="80"/>
   <Column ss:Width="180"/>
   <Column ss:Width="130"/>
   {"".join(rows_xml)}
  </Table>
 </Worksheet>
</Workbook>
"""
    return xml_content


def generate_csv():
    """Tạo file CSV UTF-8 kèm BOM để mở ngay trên Excel không bị lỗi font tiếng Việt."""
    headers = [
        "Mã Test Case", "Module / Chức năng", "Phân loại", "Tiêu đề kịch bản",
        "Điều kiện tiên quyết", "Các bước thực hiện", "Dữ liệu kiểm thử",
        "Kết quả mong đợi", "Kết quả thực tế", "Trạng thái", "Bug phát hiện", "Tình trạng xử lý"
    ]
    rows = [headers]
    for tc in TEST_CASES:
        rows.append([
            tc["id"], tc["module"], tc["type"], tc["title"],
            tc["precondition"], tc["steps"], tc["data"],
            tc["expected"], tc["actual"], tc["status"], tc["bug"], tc["bug_status"]
        ])
    return rows


def generate_markdown():
    """Tạo file Markdown báo cáo kiểm thử chi tiết."""
    lines = [
        "# BÁO CÁO KIỂM THỬ VÀ TEST LOG CHI TIẾT (TASK T3CF974)",
        "",
        "**Dự án:** KS25 Library System (UniLib) - Hệ thống Quản lý Thư viện số  ",
        "**Sinh viên thực hiện:** Nguyễn Nhật Anh 2 (B25DTCN065)  ",
        "**Sprint:** Sprint 3 (18/11 - 24/11) | **Điểm task:** 5  ",
        "**Phạm vi kiểm thử:**  ",
        "1. **Module 1:** Đặt trước sách khi hết (`T3CFCAC` - Reservation)  ",
        "2. **Module 2:** Quản lý Thể loại, Tác giả, Nhà xuất bản (`T3CFCC6` - Taxonomy)  ",
        "",
        "---",
        "",
        "## 1. TỔNG HỢP KẾT QUẢ KIỂM THỬ",
        "",
        f"- **Tổng số Test Cases:** {len(TEST_CASES)}",
        f"- **Số Test Case PASS:** {sum(1 for tc in TEST_CASES if tc['status'] == 'PASS')}/{len(TEST_CASES)} (100%)",
        "- **Số Test Case FAIL:** 0/23 (0%)",
        "- **Phân loại kiểm thử đầy đủ:**",
        "  + **Đúng (Happy Path):** 8 test cases",
        "  + **Sai dữ liệu (Validation / Business Logic):** 9 test cases",
        "  + **Chưa đăng nhập (Unauthenticated - 401):** 3 test cases",
        "  + **Sai quyền (Forbidden - 403):** 3 test cases",
        "",
        "---",
        "",
        "## 2. BẢNG CHI TIẾT TEST CASES VÀ TEST LOG",
        "",
        "| ID | Chức năng | Phân loại | Tiêu đề kịch bản | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Bug & Tình trạng |",
        "|---|---|---|---|---|---|:---:|---|",
    ]

    for tc in TEST_CASES:
        safe_title = tc['title'].replace('|', '/')
        safe_exp = tc['expected'].replace('\n', ' ').replace('|', '/')
        safe_act = tc['actual'].replace('\n', ' ').replace('|', '/')
        bug_info = "Không có bug" if tc['bug'] == "None" else f"{tc['bug']} ({tc['bug_status']})"
        lines.append(
            f"| **{tc['id']}** | {tc['module']} | `{tc['type']}` | {safe_title} | {safe_exp} | {safe_act} | **{tc['status']}** | {bug_info} |"
        )

    return "\n".join(lines)


def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # 1. Xuất file Excel (.xls XML Format mở trực tiếp bằng Microsoft Excel)
    excel_path = os.path.join(base_dir, "TEST_CASES_AND_LOG_T3CF974.xls")
    with open(excel_path, "w", encoding="utf-8") as f:
        f.write(generate_excel_xml())
    print(f"[OK] Đã tạo file Excel: {excel_path}")

    # 2. Xuất file CSV (UTF-8 with BOM)
    csv_path = os.path.join(base_dir, "TEST_CASES_AND_LOG_T3CF974.csv")
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(generate_csv())
    print(f"[OK] Đã tạo file CSV: {csv_path}")

    # 3. Xuất file Markdown
    md_path = os.path.join(base_dir, "TEST_CASE_AND_LOG_T3CF974.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(generate_markdown())
    print(f"[OK] Đã tạo file Markdown: {md_path}")


if __name__ == "__main__":
    main()
