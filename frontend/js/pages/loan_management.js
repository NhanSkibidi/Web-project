// ==============================================================================
// KS25 Library - Duyệt yêu cầu mượn sách trực tuyến (loan_management.js)
// Thiết kế: JavaScript thuần, hàm thông thường, dễ hiểu, có chú thích tiếng Việt
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. DỮ LIỆU MẪU BAN ĐẦU (MẢNG ĐỐI TƯỢNG PHIẾU YÊU CẦU MƯỢN TRỰC TUYẾN)
// Trạng thái chuẩn 7 giá trị:
// "Chờ duyệt", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang mượn", "Quá hạn", "Đã từ chối", "Hết hạn nhận"
// ------------------------------------------------------------------------------
var loanData = [
  {
    id: 1,
    maPhieu: "PM-2024-0104",
    gioTao: "10:15 (28/10)",
    docGia: {
      ten: "Nguyễn Văn A",
      mssv: "23010412",
      email: "vana.nguyen@univ.edu.vn",
      sdt: "0987.654.321",
      soSachDangGiu: 2,
      gioiHanSach: 5,
      khoa: "CNTT & TT"
    },
    henNhan: "16:00 Hôm nay",
    hanNhan: "Trước 17:00",
    ngayHenTra: "2024-11-11",
    sach: [
      {
        ten: "Cấu trúc Dữ liệu & Giải thuật",
        maBanSao: "UL-IT-2023-001",
        viTri: "Khu A - Kệ A3 - Ngăn 2",
        khaDung: true
      },
      {
        ten: "Mạng máy tính căn bản (Tập 1)",
        maBanSao: "UL-IT-2022-089",
        viTri: "Khu B - Kệ B1 - Ngăn 1",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Em đến lấy sách vào khoảng 16h chiều sau giờ thực hành tại Lab 302.",
    trangThai: "Chờ duyệt",
    lyDoTuChoi: ""
  },
  {
    id: 2,
    maPhieu: "PM-2024-0102",
    gioTao: "09:30 (28/10)",
    docGia: {
      ten: "Lê Hoàng Quân",
      mssv: "23010889",
      email: "quan.lh@univ.edu.vn",
      sdt: "0912.345.678",
      soSachDangGiu: 1,
      gioiHanSach: 5,
      khoa: "Kinh tế"
    },
    henNhan: "14:00 Hôm nay",
    hanNhan: "Trước 15:00",
    ngayHenTra: "2024-11-11",
    sach: [
      {
        ten: "Nguyên lý Tiếp thị",
        maBanSao: "UL-KT-2021-042",
        viTri: "Khu C - Kệ C2 - Ngăn 3",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Cần gấp tài liệu ôn tập trước ca học chiều.",
    trangThai: "Chờ duyệt",
    lyDoTuChoi: ""
  },
  {
    id: 3,
    maPhieu: "PM-2024-0098",
    gioTao: "08:10 (28/10)",
    docGia: {
      ten: "Trần Ngọc Thảo",
      mssv: "22020419",
      email: "thao.tn@univ.edu.vn",
      sdt: "0903.888.999",
      soSachDangGiu: 2,
      gioiHanSach: 5,
      khoa: "Ngoại ngữ"
    },
    henNhan: "Khay chờ #08",
    hanNhan: "Đến 18:00 (Hôm nay)",
    ngayHenTra: "2024-11-10",
    sach: [
      {
        ten: "Giáo trình Tiếng Anh Chuyên ngành IT",
        maBanSao: "UL-NN-2023-112",
        viTri: "Khu D - Kệ D1 - Ngăn 1",
        khaDung: true
      },
      {
        ten: "Luyện thi IELTS Advanced",
        maBanSao: "UL-NN-2022-054",
        viTri: "Khu D - Kệ D3 - Ngăn 2",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Nhờ cô thủ thư kiểm tra bản đính kèm CD.",
    trangThai: "Sẵn sàng nhận",
    lyDoTuChoi: ""
  },
  {
    id: 4,
    maPhieu: "PM-2024-0091",
    gioTao: "17:45 (27/10)",
    docGia: {
      ten: "Võ Đức Huy",
      mssv: "21010311",
      email: "huy.vd@univ.edu.vn",
      sdt: "0977.123.456",
      soSachDangGiu: 1,
      gioiHanSach: 5,
      khoa: "Điện tử"
    },
    henNhan: "09:00 (28/10)",
    hanNhan: "Hạn giữ: 09:00 (29/10)",
    ngayHenTra: "2024-11-10",
    sach: [
      {
        ten: "Cảm biến & Đo lường",
        maBanSao: "UL-DT-2021-078",
        viTri: "Khu E - Kệ E2 - Ngăn 4",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Em lấy ca sáng sau giờ thí nghiệm.",
    trangThai: "Đang chuẩn bị",
    lyDoTuChoi: ""
  },
  {
    id: 5,
    maPhieu: "PM-2024-0085",
    gioTao: "20:10 (26/10)",
    docGia: {
      ten: "Hoàng Minh Tuấn",
      mssv: "23040112",
      email: "tuan.hm@univ.edu.vn",
      sdt: "0968.222.333",
      soSachDangGiu: 1,
      gioiHanSach: 5,
      khoa: "Cơ khí"
    },
    henNhan: "Quá hạn",
    hanNhan: "Hết hạn: 17:00 hôm qua",
    ngayHenTra: "2024-10-27",
    sach: [
      {
        ten: "Sức bền Vật liệu & Cơ học",
        maBanSao: "UL-CK-2020-033",
        viTri: "Khu F - Kệ F1 - Ngăn 2",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Không lấy kịp trong ngày.",
    trangThai: "Hết hạn nhận",
    lyDoTuChoi: "Quá 24 giờ giữ sách tại quầy mà độc giả không đến nhận."
  },
  {
    id: 6,
    maPhieu: "PM-2024-0082",
    gioTao: "11:20 (28/10)",
    docGia: {
      ten: "Phạm Thị Mai",
      mssv: "23020045",
      email: "mai.pt@univ.edu.vn",
      sdt: "0934.567.890",
      soSachDangGiu: 4,
      gioiHanSach: 5,
      khoa: "Ngoại ngữ"
    },
    henNhan: "15:30 Hôm nay",
    hanNhan: "Trước 17:00",
    ngayHenTra: "2024-11-11",
    sach: [
      {
        ten: "Ngữ pháp tiếng Anh nâng cao",
        maBanSao: "UL-NN-2023-088",
        viTri: "Khu D - Kệ D2 - Ngăn 3",
        khaDung: false // Dùng để kiểm tra trường hợp bản sao không khả dụng
      }
    ],
    ghiChuDocGia: "Mượn để ôn thi B2.",
    trangThai: "Chờ duyệt",
    lyDoTuChoi: ""
  },
  {
    id: 7,
    maPhieu: "PM-2024-0078",
    gioTao: "08:40 (28/10)",
    docGia: {
      ten: "Trần Minh Khoa",
      mssv: "21010115",
      email: "khoa.tm@univ.edu.vn",
      sdt: "0945.678.901",
      soSachDangGiu: 3,
      gioiHanSach: 5,
      khoa: "CNTT & TT"
    },
    henNhan: "Mượn ngày 15/09/2024",
    hanNhan: "Hạn trả: 29/09/2024",
    ngayHenTra: "2024-09-29", // Đã quá hạn nhiều ngày
    sach: [
      {
        ten: "Hệ điều hành hiện đại",
        maBanSao: "UL-IT-2020-055",
        viTri: "Khu A - Kệ A1 - Ngăn 4",
        khaDung: true
      },
      {
        ten: "Lập trình mạng với Socket",
        maBanSao: "UL-IT-2021-090",
        viTri: "Khu A - Kệ A2 - Ngăn 1",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Mượn kỳ đồ án chuyên ngành.",
    trangThai: "Quá hạn",
    lyDoTuChoi: ""
  },
  {
    id: 8,
    maPhieu: "PM-2024-0075",
    gioTao: "14:15 (27/10)",
    docGia: {
      ten: "Ngô Tuấn Kiệt",
      mssv: "22010115",
      email: "kiet.nt@univ.edu.vn",
      sdt: "0918.234.567",
      soSachDangGiu: 2,
      gioiHanSach: 5,
      khoa: "Điện tử"
    },
    henNhan: "Mượn ngày 12/10/2024",
    hanNhan: "Hạn trả: 26/10/2024",
    ngayHenTra: "2024-10-26", // Đã quá hạn
    sach: [
      {
        ten: "Vi điều khiển STM32 căn bản",
        maBanSao: "UL-DT-2022-019",
        viTri: "Khu E - Kệ E1 - Ngăn 3",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Phục vụ đề tài robot.",
    trangThai: "Quá hạn",
    lyDoTuChoi: ""
  },
  {
    id: 9,
    maPhieu: "PM-2024-0072",
    gioTao: "10:00 (27/10)",
    docGia: {
      ten: "Đỗ Bích Phương",
      mssv: "23030018",
      email: "phuong.db@univ.edu.vn",
      sdt: "0982.345.671",
      soSachDangGiu: 1,
      gioiHanSach: 5,
      khoa: "Kinh tế"
    },
    henNhan: "Mượn ngày 20/10/2024",
    hanNhan: "Hạn trả: 03/11/2024",
    ngayHenTra: "2024-11-03", // Đang mượn hợp lệ
    sach: [
      {
        ten: "Kinh tế vi mô thực hành",
        maBanSao: "UL-KT-2022-067",
        viTri: "Khu C - Kệ C1 - Ngăn 2",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Học kỳ 1 năm học 2024-2025.",
    trangThai: "Đang mượn",
    soLanGiaHan: 0,
    coNguoiDatTruoc: false,
    daQuaHan: false,
    lyDoTuChoi: ""
  },
  {
    id: 10,
    maPhieu: "PM-2024-0069",
    gioTao: "16:20 (26/10)",
    docGia: {
      ten: "Vũ Hải Đăng",
      mssv: "22010892",
      email: "dang.vh@univ.edu.vn",
      sdt: "0909.112.233",
      soSachDangGiu: 0,
      gioiHanSach: 5,
      khoa: "CNTT & TT"
    },
    henNhan: "Khay chờ #12",
    hanNhan: "Đến 17:00 (28/10)",
    ngayHenTra: "2024-11-09",
    sach: [
      {
        ten: "Học sâu và Mạng nơ-ron",
        maBanSao: "UL-IT-2023-104",
        viTri: "Khu A - Kệ A4 - Ngăn 3",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Lấy sách tại quầy tầng 2.",
    trangThai: "Sẵn sàng nhận",
    lyDoTuChoi: ""
  },
  {
    id: 11,
    maPhieu: "PM-2024-0065",
    gioTao: "09:05 (26/10)",
    docGia: {
      ten: "Lý Gia Hân",
      mssv: "23040051",
      email: "han.lg@univ.edu.vn",
      sdt: "0971.888.777",
      soSachDangGiu: 0,
      gioiHanSach: 5,
      khoa: "Ngoại ngữ"
    },
    henNhan: "Từ chối ngày 26/10",
    hanNhan: "Không khả dụng",
    ngayHenTra: "",
    sach: [
      {
        ten: "Từ điển Anh - Việt chuyên ngành",
        maBanSao: "UL-NN-2019-012",
        viTri: "Khu D - Kệ D4 - Ngăn 1",
        khaDung: false
      }
    ],
    ghiChuDocGia: "Cần tham khảo viết khóa luận.",
    trangThai: "Đã từ chối",
    lyDoTuChoi: "Bản sao sách hiện đang được kiểm kê và tu sửa vật lý."
  },
  {
    id: 12,
    maPhieu: "PM-2024-0060",
    gioTao: "15:30 (25/10)",
    docGia: {
      ten: "Bùi Anh Tuấn",
      mssv: "21020089",
      email: "tuan.ba@univ.edu.vn",
      sdt: "0938.456.789",
      soSachDangGiu: 2,
      gioiHanSach: 5,
      khoa: "Cơ khí"
    },
    henNhan: "Đang gom kho",
    hanNhan: "Dự kiến 16:00 (28/10)",
    ngayHenTra: "2024-11-08",
    sach: [
      {
        ten: "Vẽ kỹ thuật cơ khí & CAD",
        maBanSao: "UL-CK-2021-045",
        viTri: "Khu F - Kệ F2 - Ngăn 1",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Em nhờ bạn lấy hộ nếu bận học.",
    trangThai: "Đang chuẩn bị",
    lyDoTuChoi: ""
  },
  {
    id: 13,
    maPhieu: "PM-2024-0055",
    gioTao: "13:40 (25/10)",
    docGia: {
      ten: "Nguyễn Thùy Linh",
      mssv: "23010992",
      email: "linh.nt@univ.edu.vn",
      sdt: "0963.123.789",
      soSachDangGiu: 2,
      gioiHanSach: 5,
      khoa: "Kinh tế"
    },
    henNhan: "16:00 Hôm nay",
    hanNhan: "Trước 17:30",
    ngayHenTra: "2024-11-08",
    sach: [
      {
        ten: "Tài chính Doanh nghiệp",
        maBanSao: "UL-KT-2023-015",
        viTri: "Khu C - Kệ C3 - Ngăn 1",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Mong thư viện duyệt sớm để kịp giờ học.",
    trangThai: "Chờ duyệt",
    lyDoTuChoi: ""
  },
  {
    id: 14,
    maPhieu: "PM-2024-0051",
    gioTao: "11:10 (25/10)",
    docGia: {
      ten: "Đặng Quốc Bảo",
      mssv: "22010456",
      email: "bao.dq@univ.edu.vn",
      sdt: "0915.678.123",
      soSachDangGiu: 1,
      gioiHanSach: 5,
      khoa: "CNTT & TT"
    },
    henNhan: "Khay chờ #03",
    hanNhan: "Đến 17:00 (28/10)",
    ngayHenTra: "2024-11-08",
    sach: [
      {
        ten: "Thiết kế Giao diện Người dùng UI/UX",
        maBanSao: "UL-IT-2022-099",
        viTri: "Khu A - Kệ A3 - Ngăn 4",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Sách bìa mềm.",
    trangThai: "Sẵn sàng nhận",
    lyDoTuChoi: ""
  },
  {
    id: 15,
    maPhieu: "PM-2024-0048",
    gioTao: "08:30 (25/10)",
    docGia: {
      ten: "Trương Mỹ Duyên",
      mssv: "23020112",
      email: "duyen.tm@univ.edu.vn",
      sdt: "0908.765.432",
      soSachDangGiu: 1,
      gioiHanSach: 5,
      khoa: "Ngoại ngữ"
    },
    henNhan: "Mượn ngày 18/10/2024",
    hanNhan: "Hạn trả: 01/11/2024",
    ngayHenTra: "2024-11-01",
    sach: [
      {
        ten: "Phương pháp Dịch thuật Nâng cao",
        maBanSao: "UL-NN-2021-034",
        viTri: "Khu D - Kệ D1 - Ngăn 3",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Đã gia hạn 1 lần.",
    trangThai: "Đang mượn",
    soLanGiaHan: 1,
    coNguoiDatTruoc: false,
    daQuaHan: false,
    lyDoTuChoi: ""
  },
  {
    id: 16,
    maPhieu: "PM-2024-0042",
    gioTao: "17:15 (24/10)",
    docGia: {
      ten: "Phan Đình Trọng",
      mssv: "21040019",
      email: "trong.pd@univ.edu.vn",
      sdt: "0975.333.222",
      soSachDangGiu: 5,
      gioiHanSach: 5,
      khoa: "Cơ khí"
    },
    henNhan: "Từ chối ngày 24/10",
    hanNhan: "Quá hạn mức",
    ngayHenTra: "",
    sach: [
      {
        ten: "Tự động hóa Thủy lực Khí nén",
        maBanSao: "UL-CK-2022-011",
        viTri: "Khu F - Kệ F3 - Ngăn 1",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Em cần sách gấp.",
    trangThai: "Đã từ chối",
    lyDoTuChoi: "Độc giả đã mượn tối đa 5/5 cuốn sách theo quy định của thư viện."
  },
  {
    id: 17,
    maPhieu: "PM-2024-0038",
    gioTao: "14:00 (24/10)",
    docGia: {
      ten: "Lê Minh Trí",
      mssv: "22010678",
      email: "tri.lm@univ.edu.vn",
      sdt: "0984.111.000",
      soSachDangGiu: 0,
      gioiHanSach: 5,
      khoa: "Điện tử"
    },
    henNhan: "Đang gom kho",
    hanNhan: "Dự kiến 10:00 (29/10)",
    ngayHenTra: "2024-11-07",
    sach: [
      {
        ten: "Xử lý Tín hiệu Số (DSP)",
        maBanSao: "UL-DT-2020-044",
        viTri: "Khu E - Kệ E3 - Ngăn 2",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Kèm đĩa thực hành Matlab.",
    trangThai: "Đang chuẩn bị",
    lyDoTuChoi: ""
  },
  {
    id: 18,
    maPhieu: "PM-2024-0035",
    gioTao: "10:45 (24/10)",
    docGia: {
      ten: "Nguyễn Hoàng Nam",
      mssv: "23010777",
      email: "nam.nh@univ.edu.vn",
      sdt: "0919.888.222",
      soSachDangGiu: 2,
      gioiHanSach: 5,
      khoa: "CNTT & TT"
    },
    henNhan: "16:00 Hôm nay",
    hanNhan: "Trước 18:00",
    ngayHenTra: "2024-11-07",
    sach: [
      {
        ten: "An toàn Thông tin và Mật mã học",
        maBanSao: "UL-IT-2023-018",
        viTri: "Khu A - Kệ A2 - Ngăn 3",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Xin kiểm tra bìa sách có nguyên vẹn.",
    trangThai: "Chờ duyệt",
    lyDoTuChoi: ""
  },
  {
    id: 19,
    maPhieu: "PM-2024-0029",
    gioTao: "09:15 (23/10)",
    docGia: {
      ten: "Cao Thúy Hằng",
      mssv: "22030114",
      email: "hang.ct@univ.edu.vn",
      sdt: "0902.555.444",
      soSachDangGiu: 1,
      gioiHanSach: 5,
      khoa: "Kinh tế"
    },
    henNhan: "Mượn ngày 10/10/2024",
    hanNhan: "Hạn trả: 24/10/2024",
    ngayHenTra: "2024-10-24", // Đã quá hạn 4 ngày
    sach: [
      {
        ten: "Quản trị Học đại cương",
        maBanSao: "UL-KT-2021-002",
        viTri: "Khu C - Kệ C1 - Ngăn 1",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Đã nhận sách tại bàn số 1.",
    trangThai: "Quá hạn",
    lyDoTuChoi: ""
  },
  {
    id: 20,
    maPhieu: "PM-2024-0021",
    gioTao: "16:50 (22/10)",
    docGia: {
      ten: "Đinh Quang Huy",
      mssv: "21010555",
      email: "huy.dq@univ.edu.vn",
      sdt: "0944.333.111",
      soSachDangGiu: 2,
      gioiHanSach: 5,
      khoa: "CNTT & TT"
    },
    henNhan: "Mượn ngày 15/10/2024",
    hanNhan: "Hạn trả: 29/10/2024",
    ngayHenTra: "2024-10-29",
    sach: [
      {
        ten: "Lập trình Web hiện đại với FastAPI",
        maBanSao: "UL-IT-2023-049",
        viTri: "Khu A - Kệ A3 - Ngăn 1",
        khaDung: true
      }
    ],
    ghiChuDocGia: "Sinh viên năm cuối làm đồ án.",
    trangThai: "Đang mượn",
    soLanGiaHan: 0,
    coNguoiDatTruoc: true, // Thử nghiệm: Đầu sách này có người đặt trước
    daQuaHan: false,
    lyDoTuChoi: ""
  }
];

// ------------------------------------------------------------------------------
// 2. BIẾN TRẠNG THÁI TOÀN CỤC CỦA BẢNG VÀ BỘ LỌC
// ------------------------------------------------------------------------------
var currentTab = "pending";        // Mặc định chọn tab "Chờ duyệt" như giao diện ảnh
var currentSearchKeyword = "";     // Từ khóa tìm kiếm
var currentTimeFilter = "all";     // Lọc theo thời gian
var currentDeptFilter = "all";     // Lọc theo khoa / viện
var currentPage = 1;               // Trang hiện tại
var pageSize = 10;                 // Số dòng trên 1 trang (5, 10, 20)
var currentRejectLoanId = null;    // ID phiếu đang được thao tác từ chối
var activeConfirmCallback = null;  // Hàm callback sau khi bấm xác nhận

// ------------------------------------------------------------------------------
// 3. HÀM THÔNG BÁO TOAST NỔI (TOAST NOTIFICATIONS)
// type: "success" | "error" | "warning" | "info"
// ------------------------------------------------------------------------------
function showToast(type, title, message) {
  var container = document.getElementById("toast-container");
  if (!container) return;

  var toast = document.createElement("div");
  toast.className = "toast-item toast-" + type;

  var iconName = "info";
  if (type === "success") iconName = "check_circle";
  if (type === "error") iconName = "error";
  if (type === "warning") iconName = "warning";

  toast.innerHTML =
    '<div class="toast-icon-wrap">' +
      '<span class="material-symbols-outlined">' + iconName + '</span>' +
    '</div>' +
    '<div class="toast-content">' +
      '<div class="toast-title">' + escapeHtml(title) + '</div>' +
      '<div class="toast-msg">' + escapeHtml(message) + '</div>' +
    '</div>' +
    '<button type="button" class="toast-close-btn" title="Đóng">' +
      '<span class="material-symbols-outlined" style="font-size: 16px;">close</span>' +
    '</button>';

  container.appendChild(toast);

  // Nút đóng thủ công
  var closeBtn = toast.querySelector(".toast-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      removeToast(toast);
    });
  }

  // Tự động đóng sau 4.5 giây
  setTimeout(function () {
    removeToast(toast);
  }, 4500);
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add("toast-leave");
  setTimeout(function () {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 250);
}

// ------------------------------------------------------------------------------
// 4. HỘP THOẠI XÁC NHẬN CHUNG (showConfirm)
// ------------------------------------------------------------------------------
function showConfirm(options) {
  // options = { title, message, type: "green"|"red"|"blue", confirmText, cancelText, onConfirm }
  var modal = document.getElementById("confirm-modal");
  var titleEl = document.getElementById("confirm-title");
  var msgEl = document.getElementById("confirm-message");
  var iconBox = document.getElementById("confirm-icon-box");
  var iconEl = document.getElementById("confirm-icon");
  var btnProceed = document.getElementById("btn-confirm-proceed");
  var btnCancel = document.getElementById("btn-confirm-cancel");

  if (!modal) return;

  titleEl.textContent = options.title || "Xác nhận";
  msgEl.textContent = options.message || "Bạn có chắc chắn muốn thực hiện thao tác này?";

  // Màu sắc icon & nút xác nhận
  iconBox.className = "confirm-icon-circle";
  btnProceed.className = "btn-confirm-proceed";

  if (options.type === "red") {
    iconBox.classList.add("icon-red");
    btnProceed.classList.add("btn-danger");
    iconEl.textContent = "warning";
  } else if (options.type === "green") {
    iconBox.classList.add("icon-green");
    iconEl.textContent = "check_circle";
  } else {
    iconBox.classList.add("icon-blue");
    iconEl.textContent = "help_outline";
  }

  btnProceed.textContent = options.confirmText || "Xác nhận";
  btnCancel.textContent = options.cancelText || "Hủy";

  activeConfirmCallback = options.onConfirm || null;
  modal.classList.add("active");
}

function closeConfirmModal() {
  var modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.remove("active");
  activeConfirmCallback = null;
}

// ------------------------------------------------------------------------------
// 5. TỰ ĐỘNG KIỂM TRA TRẠNG THÁI QUÁ HẠN (TỰ ĐỘNG THEO NGÀY HIỆN TẠI)
// ------------------------------------------------------------------------------
function updateOverdueStatuses() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  loanData.forEach(function (loan) {
    if (loan.trangThai === "Đang mượn" && loan.ngayHenTra) {
      var dueDate = new Date(loan.ngayHenTra);
      if (!isNaN(dueDate.getTime()) && dueDate < today) {
        loan.trangThai = "Quá hạn";
      }
    }
  });
}

// ------------------------------------------------------------------------------
// 6. CẬP NHẬT SỐ LIỆU 4 THẺ THỐNG KÊ & BADGE TRÊN CÁC TAB
// ------------------------------------------------------------------------------
function updateCountsAndStats() {
  var countPending = 0;
  var countPreparing = 0;
  var countReady = 0;
  var countBorrowed = 0;
  var countOverdue = 0;
  var countRejected = 0;

  loanData.forEach(function (loan) {
    if (loan.trangThai === "Chờ duyệt") countPending++;
    else if (loan.trangThai === "Đang chuẩn bị") countPreparing++;
    else if (loan.trangThai === "Sẵn sàng nhận") countReady++;
    else if (loan.trangThai === "Đang mượn") countBorrowed++;
    else if (loan.trangThai === "Quá hạn") countOverdue++;
    else if (loan.trangThai === "Đã từ chối" || loan.trangThai === "Hết hạn nhận") countRejected++;
  });

  var countAll = loanData.length;

  // Cập nhật 4 thẻ thống kê
  var elPending = document.getElementById("stat-count-pending");
  var elPreparing = document.getElementById("stat-count-preparing");
  var elReady = document.getElementById("stat-count-ready");
  var elRejected = document.getElementById("stat-count-rejected");

  if (elPending) elPending.textContent = countPending;
  if (elPreparing) elPreparing.textContent = countPreparing;
  if (elReady) elReady.textContent = countReady;
  if (elRejected) elRejected.textContent = countRejected;

  // Cập nhật số đếm trên các Tab
  var tabAll = document.getElementById("count-tab-all");
  var tabPen = document.getElementById("count-tab-pending");
  var tabPrep = document.getElementById("count-tab-preparing");
  var tabRdy = document.getElementById("count-tab-ready");
  var tabBor = document.getElementById("count-tab-borrowed");
  var tabOver = document.getElementById("count-tab-overdue");
  var tabRej = document.getElementById("count-tab-rejected");

  if (tabAll) tabAll.textContent = countAll;
  if (tabPen) tabPen.textContent = countPending;
  if (tabPrep) tabPrep.textContent = countPreparing;
  if (tabRdy) tabRdy.textContent = countReady;
  if (tabBor) tabBor.textContent = countBorrowed;
  if (tabOver) tabOver.textContent = countOverdue;
  if (tabRej) tabRej.textContent = countRejected;
}

// ------------------------------------------------------------------------------
// 7. BỘ LỌC DỮ LIỆU BẢNG (TAB + TÌM KIẾM + THỜI GIAN + KHOA)
// ------------------------------------------------------------------------------
function getFilteredLoans() {
  return loanData.filter(function (loan) {
    // 1. Lọc theo Tab
    if (currentTab === "pending" && loan.trangThai !== "Chờ duyệt") return false;
    if (currentTab === "preparing" && loan.trangThai !== "Đang chuẩn bị") return false;
    if (currentTab === "ready" && loan.trangThai !== "Sẵn sàng nhận") return false;
    if (currentTab === "borrowed" && loan.trangThai !== "Đang mượn") return false;
    if (currentTab === "overdue" && loan.trangThai !== "Quá hạn") return false;
    if (currentTab === "rejected" && loan.trangThai !== "Đã từ chối" && loan.trangThai !== "Hết hạn nhận") return false;

    // 2. Lọc theo từ khóa (Mã phiếu, Họ tên độc giả, MSSV)
    if (currentSearchKeyword.trim() !== "") {
      var kw = currentSearchKeyword.trim().toLowerCase();
      var maPhieuMatch = loan.maPhieu.toLowerCase().indexOf(kw) !== -1;
      var tenMatch = loan.docGia.ten.toLowerCase().indexOf(kw) !== -1;
      var mssvMatch = loan.docGia.mssv.toLowerCase().indexOf(kw) !== -1;
      if (!maPhieuMatch && !tenMatch && !mssvMatch) return false;
    }

    // 3. Lọc theo Khoa / Viện
    if (currentDeptFilter !== "all" && loan.docGia.khoa !== currentDeptFilter) {
      return false;
    }

    // 4. Lọc theo thời gian
    if (currentTimeFilter === "today") {
      // Giả lập phiếu tạo trong ngày 28/10
      if (loan.gioTao.indexOf("28/10") === -1 && loan.henNhan.indexOf("Hôm nay") === -1) {
        return false;
      }
    } else if (currentTimeFilter === "3days") {
      // 3 ngày qua: 26, 27, 28
      var validDays = ["28/10", "27/10", "26/10", "Hôm nay"];
      var hasValidDay = validDays.some(function (d) {
        return loan.gioTao.indexOf(d) !== -1 || loan.henNhan.indexOf(d) !== -1;
      });
      if (!hasValidDay) return false;
    }

    return true;
  });
}

// ------------------------------------------------------------------------------
// 8. RENDER BẢNG DỮ LIỆU & PHÂN TRANG
// ------------------------------------------------------------------------------
function renderLoanTable() {
  var tbody = document.getElementById("loan-table-body");
  if (!tbody) return;

  var filteredList = getFilteredLoans();
  var totalItems = filteredList.length;

  // Tính số trang
  var totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  var startIndex = (currentPage - 1) * pageSize;
  var endIndex = Math.min(startIndex + pageSize, totalItems);
  var pageItems = filteredList.slice(startIndex, endIndex);

  // Cập nhật tiêu đề bảng theo Tab
  updateTableHeaderTitle(totalItems);

  // Xóa nội dung bảng cũ
  tbody.innerHTML = "";

  if (pageItems.length === 0) {
    var trEmpty = document.createElement("tr");
    trEmpty.innerHTML = '<td colspan="6" class="table-empty-row">' +
      '<span class="material-symbols-outlined" style="font-size: 32px; display:block; margin-bottom: 8px; opacity: 0.5;">search_off</span>' +
      'Không tìm thấy yêu cầu phù hợp.' +
    '</td>';
    tbody.appendChild(trEmpty);
  } else {
    pageItems.forEach(function (loan) {
      var tr = document.createElement("tr");
      if (loan.trangThai === "Quá hạn") {
        tr.className = "row-overdue";
      }

      // 1. Cột Mã phiếu
      var tdMaPhieu = document.createElement("td");
      tdMaPhieu.innerHTML =
        '<div class="loan-code-cell">' +
          '<span class="loan-code-text font-mono">' + escapeHtml(loan.maPhieu) + '</span>' +
          '<span class="loan-time-sub">' + escapeHtml(loan.gioTao) + '</span>' +
        '</div>';
      tr.appendChild(tdMaPhieu);

      // 2. Cột Độc giả
      var tdDocGia = document.createElement("td");
      var initialLetter = loan.docGia.ten ? loan.docGia.ten.charAt(0).toUpperCase() : "U";
      tdDocGia.innerHTML =
        '<div class="reader-cell">' +
          '<div class="reader-avatar-circle">' + initialLetter + '</div>' +
          '<div class="reader-meta-wrap">' +
            '<span class="reader-name-text">' + escapeHtml(loan.docGia.ten) + '</span>' +
            '<span class="reader-mssv-text">MSSV: ' + escapeHtml(loan.docGia.mssv) + '</span>' +
          '</div>' +
        '</div>';
      tr.appendChild(tdDocGia);

      // 3. Cột Hẹn nhận sách
      var tdHenNhan = document.createElement("td");
      var henNhanHtml = '';
      if (loan.trangThai === "Quá hạn") {
        henNhanHtml =
          '<div class="appointment-cell">' +
            '<span class="overdue-alert-tag"><span class="material-symbols-outlined" style="font-size: 15px;">warning</span> Quá hạn</span>' +
            '<span class="appointment-due-sub font-mono">' + escapeHtml(loan.hanNhan) + '</span>' +
          '</div>';
      } else if (loan.trangThai === "Hết hạn nhận") {
        henNhanHtml =
          '<div class="appointment-cell">' +
            '<span class="overdue-alert-tag"><span class="material-symbols-outlined" style="font-size: 15px;">event_busy</span> Hết hạn giữ</span>' +
            '<span class="appointment-due-sub">' + escapeHtml(loan.hanNhan) + '</span>' +
          '</div>';
      } else {
        henNhanHtml =
          '<div class="appointment-cell">' +
            '<span class="appointment-time-main"><span class="material-symbols-outlined">schedule</span> ' + escapeHtml(loan.henNhan) + '</span>' +
            '<span class="appointment-due-sub">' + escapeHtml(loan.hanNhan) + '</span>' +
          '</div>';
      }
      tdHenNhan.innerHTML = henNhanHtml;
      tr.appendChild(tdHenNhan);

      // 4. Cột Ấn phẩm yêu cầu
      var tdSach = document.createElement("td");
      var bookCount = loan.sach.length;
      var firstBookTitle = loan.sach[0] ? loan.sach[0].ten : "Chưa có tên";
      tdSach.innerHTML =
        '<div class="books-summary-cell">' +
          '<span class="book-count-badge">' + bookCount + ' cuốn</span>' +
          '<span class="book-title-ellipsis" title="' + escapeHtml(firstBookTitle) + '">' + escapeHtml(firstBookTitle) + '</span>' +
        '</div>';
      tr.appendChild(tdSach);

      // 5. Cột Trạng thái (Badge)
      var tdTrangThai = document.createElement("td");
      tdTrangThai.style.textAlign = "center";
      var badgeClass = "badge-pending";
      var labelTrangThai = loan.trangThai;

      if (loan.trangThai === "Chờ duyệt") badgeClass = "badge-pending";
      else if (loan.trangThai === "Đang chuẩn bị") badgeClass = "badge-preparing";
      else if (loan.trangThai === "Sẵn sàng nhận") badgeClass = "badge-ready";
      else if (loan.trangThai === "Đang mượn") badgeClass = "badge-borrowed";
      else if (loan.trangThai === "Quá hạn") badgeClass = "badge-overdue";
      else if (loan.trangThai === "Đã từ chối" || loan.trangThai === "Hết hạn nhận") {
        badgeClass = "badge-rejected";
        if (loan.trangThai === "Hết hạn nhận") labelTrangThai = "Hủy / Quá 24h";
      }

      tdTrangThai.innerHTML = '<span class="badge ' + badgeClass + '">' + escapeHtml(labelTrangThai) + '</span>';
      tr.appendChild(tdTrangThai);

      // 6. Cột Thao tác
      var tdThaoTac = document.createElement("td");
      tdThaoTac.style.textAlign = "center";
      var actionsWrap = document.createElement("div");
      actionsWrap.className = "action-buttons-cell";

      // Nút Chi tiết (luôn luôn có)
      var btnDetail = document.createElement("button");
      btnDetail.type = "button";
      btnDetail.className = "btn-table-action";
      btnDetail.innerHTML = '<span class="material-symbols-outlined">visibility</span><span>Chi tiết</span>';
      btnDetail.addEventListener("click", function () {
        openDetailModal(loan.id);
      });
      actionsWrap.appendChild(btnDetail);

      // Nút theo trạng thái
      if (loan.trangThai === "Chờ duyệt") {
        // Nút Duyệt
        var btnApprove = document.createElement("button");
        btnApprove.type = "button";
        btnApprove.className = "btn-icon-approve";
        btnApprove.title = "Duyệt yêu cầu";
        btnApprove.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">check</span>';
        btnApprove.addEventListener("click", function () {
          confirmApproveLoan(loan.id);
        });
        actionsWrap.appendChild(btnApprove);

        // Nút Từ chối
        var btnReject = document.createElement("button");
        btnReject.type = "button";
        btnReject.className = "btn-icon-reject";
        btnReject.title = "Từ chối yêu cầu";
        btnReject.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">close</span>';
        btnReject.addEventListener("click", function () {
          openRejectModal(loan.id);
        });
        actionsWrap.appendChild(btnReject);
      } else if (loan.trangThai === "Đang chuẩn bị") {
        // Nút Xác nhận hoàn tất chuẩn bị
        var btnDonePrep = document.createElement("button");
        btnDonePrep.type = "button";
        btnDonePrep.className = "btn-icon-approve";
        btnDonePrep.title = "Xác nhận hoàn tất chuẩn bị sách";
        btnDonePrep.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">check</span>';
        btnDonePrep.addEventListener("click", function () {
          confirmCompletePrep(loan.id);
        });
        actionsWrap.appendChild(btnDonePrep);
      } else if (loan.trangThai === "Sẵn sàng nhận") {
        // Nút Giao sách
        var btnHandover = document.createElement("button");
        btnHandover.type = "button";
        btnHandover.className = "btn-icon-handover";
        btnHandover.title = "Xác nhận giao sách";
        btnHandover.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">output</span>';
        btnHandover.addEventListener("click", function () {
          confirmHandoverLoan(loan.id);
        });
        actionsWrap.appendChild(btnHandover);
      } else if (loan.trangThai === "Đang mượn") {
        // Nút Gia hạn sách (+7 ngày cho thủ thư gia hạn hộ)
        var btnRenew = document.createElement("button");
        btnRenew.type = "button";
        btnRenew.className = "btn-icon-renew";
        if (loan.soLanGiaHan >= 1) {
          btnRenew.classList.add("disabled");
          btnRenew.title = "Đã gia hạn tối đa 1/1 lần";
        } else if (loan.coNguoiDatTruoc) {
          btnRenew.title = "Đầu sách có người đặt trước, không thể gia hạn";
        } else {
          btnRenew.title = "Gia hạn thêm 7 ngày (thủ thư gia hạn hộ)";
        }
        btnRenew.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">autorenew</span>';
        btnRenew.addEventListener("click", function () {
          confirmRenewLoan(loan.id);
        });
        actionsWrap.appendChild(btnRenew);
      } else if (loan.trangThai === "Đã từ chối" || loan.trangThai === "Hết hạn nhận") {
        // Nút Xóa bản ghi
        var btnDelete = document.createElement("button");
        btnDelete.type = "button";
        btnDelete.className = "btn-icon-delete";
        btnDelete.title = "Xóa bản ghi này";
        btnDelete.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">delete</span>';
        btnDelete.addEventListener("click", function () {
          confirmDeleteLoan(loan.id);
        });
        actionsWrap.appendChild(btnDelete);
      }

      tdThaoTac.appendChild(actionsWrap);
      tr.appendChild(tdThaoTac);

      tbody.appendChild(tr);
    });
  }

  // Render thanh phân trang
  renderPagination(totalItems, totalPages, startIndex, endIndex);
}

// ------------------------------------------------------------------------------
// 9. CẬP NHẬT TIÊU ĐỀ CARD BẢNG THEO TAB ĐANG CHỌN
// ------------------------------------------------------------------------------
function updateTableHeaderTitle(totalItems) {
  var titleEl = document.getElementById("table-title-text");
  var badgeEl = document.getElementById("table-count-badge");
  if (!titleEl || !badgeEl) return;

  if (currentTab === "pending") {
    titleEl.textContent = "Phiếu đặt trước chờ duyệt";
    badgeEl.textContent = totalItems + " chờ xử lý";
  } else if (currentTab === "preparing") {
    titleEl.textContent = "Sách đang chuẩn bị tại kho";
    badgeEl.textContent = totalItems + " đơn đang gom";
  } else if (currentTab === "ready") {
    titleEl.textContent = "Sách đã sẵn sàng chờ độc giả nhận";
    badgeEl.textContent = totalItems + " đơn lưu kệ";
  } else if (currentTab === "borrowed") {
    titleEl.textContent = "Phiếu sách độc giả đang mượn lưu hành";
    badgeEl.textContent = totalItems + " đang mượn";
  } else if (currentTab === "overdue") {
    titleEl.textContent = "Danh sách phiếu mượn quá hạn";
    badgeEl.textContent = totalItems + " đơn quá hạn";
  } else if (currentTab === "rejected") {
    titleEl.textContent = "Phiếu đã từ chối hoặc hết hạn giữ";
    badgeEl.textContent = totalItems + " đơn";
  } else {
    titleEl.textContent = "Tất cả phiếu yêu cầu trực tuyến";
    badgeEl.textContent = totalItems + " đơn";
  }
}

// ------------------------------------------------------------------------------
// 10. RENDER PHÂN TRANG (PAGINATION)
// ------------------------------------------------------------------------------
function renderPagination(totalItems, totalPages, startIndex, endIndex) {
  var infoEl = document.getElementById("pagination-info-text");
  var btnsWrap = document.getElementById("pagination-buttons-wrap");

  if (infoEl) {
    if (totalItems === 0) {
      infoEl.textContent = "Hiển thị 0 trên 0 đơn";
    } else {
      infoEl.textContent = "Hiển thị " + (startIndex + 1) + " - " + endIndex + " trên " + totalItems + " đơn";
    }
  }

  if (!btnsWrap) return;
  btnsWrap.innerHTML = "";

  if (totalPages <= 1) return;

  // Nút Trước (<)
  var btnPrev = document.createElement("button");
  btnPrev.type = "button";
  btnPrev.className = "btn-page-nav";
  btnPrev.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">chevron_left</span>';
  btnPrev.disabled = currentPage === 1;
  btnPrev.addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      renderLoanTable();
    }
  });
  btnsWrap.appendChild(btnPrev);

  // Các nút số trang
  for (var i = 1; i <= totalPages; i++) {
    (function (pageNumber) {
      var btnNum = document.createElement("button");
      btnNum.type = "button";
      btnNum.className = "btn-page-nav" + (pageNumber === currentPage ? " active" : "");
      btnNum.textContent = pageNumber;
      btnNum.addEventListener("click", function () {
        currentPage = pageNumber;
        renderLoanTable();
      });
      btnsWrap.appendChild(btnNum);
    })(i);
  }

  // Nút Sau (>)
  var btnNext = document.createElement("button");
  btnNext.type = "button";
  btnNext.className = "btn-page-nav";
  btnNext.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">chevron_right</span>';
  btnNext.disabled = currentPage === totalPages;
  btnNext.addEventListener("click", function () {
    if (currentPage < totalPages) {
      currentPage++;
      renderLoanTable();
    }
  });
  btnsWrap.appendChild(btnNext);
}

// ------------------------------------------------------------------------------
// 11. HỘP THOẠI CHI TIẾT PHIẾU YÊU CẦU (MODAL CHI TIẾT)
// ------------------------------------------------------------------------------
function openDetailModal(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  var modal = document.getElementById("detail-modal");
  if (!modal) return;

  // Tiêu đề & Badge
  document.getElementById("modal-detail-title").textContent = "Chi tiết Phiếu yêu cầu trực tuyến #" + loan.maPhieu;
  var badgeEl = document.getElementById("modal-detail-badge");
  badgeEl.className = "badge";

  var labelTrangThai = loan.trangThai;
  if (loan.trangThai === "Chờ duyệt") badgeEl.classList.add("badge-pending");
  else if (loan.trangThai === "Đang chuẩn bị") badgeEl.classList.add("badge-preparing");
  else if (loan.trangThai === "Sẵn sàng nhận") badgeEl.classList.add("badge-ready");
  else if (loan.trangThai === "Đang mượn") badgeEl.classList.add("badge-borrowed");
  else if (loan.trangThai === "Quá hạn") badgeEl.classList.add("badge-overdue");
  else if (loan.trangThai === "Đã từ chối" || loan.trangThai === "Hết hạn nhận") {
    badgeEl.classList.add("badge-rejected");
    if (loan.trangThai === "Hết hạn nhận") labelTrangThai = "Hủy / Quá 24h";
  }
  badgeEl.textContent = labelTrangThai;

  // Khối lý do từ chối
  var rejectBanner = document.getElementById("modal-rejected-banner");
  var rejectText = document.getElementById("modal-rejected-reason-text");
  if (loan.trangThai === "Đã từ chối" || loan.trangThai === "Hết hạn nhận") {
    rejectBanner.style.display = "flex";
    rejectText.textContent = loan.lyDoTuChoi || "Phiếu đã bị hủy hoặc từ chối.";
  } else {
    rejectBanner.style.display = "none";
  }

  // Thông tin độc giả
  var avatarEl = document.getElementById("modal-reader-avatar");
  avatarEl.textContent = loan.docGia.ten ? loan.docGia.ten.charAt(0).toUpperCase() : "U";
  document.getElementById("modal-reader-name").textContent = loan.docGia.ten;
  document.getElementById("modal-reader-email").textContent = loan.docGia.email;
  document.getElementById("modal-reader-phone").textContent = loan.docGia.sdt;
  document.getElementById("modal-reader-mssv").textContent = loan.docGia.mssv;
  document.getElementById("modal-reader-dept").textContent = loan.docGia.khoa;
  document.getElementById("modal-reader-books-holding").textContent = loan.docGia.soSachDangGiu + " / " + loan.docGia.gioiHanSach + " cuốn";

  // Danh sách sách yêu cầu
  var booksTitle = document.getElementById("modal-books-count-title");
  booksTitle.textContent = "DANH SÁCH CHI TIẾT ẤN PHẨM YÊU CẦU (" + loan.sach.length + " CUỐN)";

  var booksListContainer = document.getElementById("modal-books-list");
  booksListContainer.innerHTML = "";

  loan.sach.forEach(function (book) {
    var card = document.createElement("div");
    card.className = "book-item-card";

    var availHtml = book.khaDung
      ? '<span class="book-item-availability available"><span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span> Bản sao sẵn sàng trên kệ (Khả dụng)</span>'
      : '<span class="book-item-availability unavailable"><span class="material-symbols-outlined" style="font-size: 14px;">cancel</span> Bản sao hiện không khả dụng (Đã mượn/Mất)</span>';

    card.innerHTML =
      '<div class="book-item-icon-wrap">' +
        '<span class="material-symbols-outlined">menu_book</span>' +
      '</div>' +
      '<div class="book-item-details">' +
        '<div class="book-item-title">' + escapeHtml(book.ten) + '</div>' +
        '<div class="book-item-meta">' +
          '<strong>Mã bản sao:</strong> <span class="font-mono">' + escapeHtml(book.maBanSao) + '</span> • ' +
          '<strong>Vị trí trên giá:</strong> ' + escapeHtml(book.viTri) +
        '</div>' +
        availHtml +
      '</div>';

    booksListContainer.appendChild(card);
  });

  // Ghi chú của độc giả
  var readerNoteEl = document.getElementById("modal-reader-note-text");
  if (loan.ghiChuDocGia) {
    readerNoteEl.textContent = '"' + loan.ghiChuDocGia + '"';
  } else {
    readerNoteEl.textContent = "Không có ghi chú thêm từ độc giả.";
  }

  // Khung cảnh báo vàng
  var warningBox = document.getElementById("modal-warning-callout");
  if (loan.trangThai === "Chờ duyệt") {
    warningBox.style.display = "flex";
  } else {
    warningBox.style.display = "none";
  }

  // Render các nút bấm ở Footer modal theo trạng thái
  var footerEl = document.getElementById("modal-detail-footer");
  footerEl.innerHTML = "";

  if (loan.trangThai === "Chờ duyệt") {
    // Nút Từ chối
    var btnReject = document.createElement("button");
    btnReject.type = "button";
    btnReject.className = "btn-outline-danger";
    btnReject.innerHTML = '<span class="material-symbols-outlined">close</span><span>Từ chối yêu cầu</span>';
    btnReject.addEventListener("click", function () {
      closeDetailModal();
      openRejectModal(loan.id);
    });
    footerEl.appendChild(btnReject);

    // Nút Duyệt & Chuẩn bị
    var btnApprove = document.createElement("button");
    btnApprove.type = "button";
    btnApprove.className = "btn-primary-action";
    btnApprove.innerHTML = '<span class="material-symbols-outlined">check_circle</span><span>Duyệt &amp; Chuẩn bị sách</span>';
    btnApprove.addEventListener("click", function () {
      closeDetailModal();
      confirmApproveLoan(loan.id);
    });
    footerEl.appendChild(btnApprove);
  } else if (loan.trangThai === "Đang chuẩn bị") {
    var btnComplete = document.createElement("button");
    btnComplete.type = "button";
    btnComplete.className = "btn-primary-action";
    btnComplete.innerHTML = '<span class="material-symbols-outlined">done_all</span><span>Xác nhận hoàn tất chuẩn bị</span>';
    btnComplete.addEventListener("click", function () {
      closeDetailModal();
      confirmCompletePrep(loan.id);
    });
    footerEl.appendChild(btnComplete);
  } else if (loan.trangThai === "Sẵn sàng nhận") {
    var btnHandover = document.createElement("button");
    btnHandover.type = "button";
    btnHandover.className = "btn-primary-action";
    btnHandover.innerHTML = '<span class="material-symbols-outlined">output</span><span>Xác nhận giao sách</span>';
    btnHandover.addEventListener("click", function () {
      closeDetailModal();
      confirmHandoverLoan(loan.id);
    });
    footerEl.appendChild(btnHandover);
  } else {
    var btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "btn-secondary-neutral";
    btnClose.textContent = "Đóng";
    btnClose.addEventListener("click", closeDetailModal);
    footerEl.appendChild(btnClose);
  }

  modal.classList.add("active");
}

function closeDetailModal() {
  var modal = document.getElementById("detail-modal");
  if (modal) modal.classList.remove("active");
}

// ------------------------------------------------------------------------------
// 12. NGHIỆP VỤ DUYỆT PHIẾU (Chờ duyệt -> Đang chuẩn bị)
// Kiểm tra mọi bản sao khả dụng; nếu có sách không khả dụng thì không duyệt
// ------------------------------------------------------------------------------
function confirmApproveLoan(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  // 1. Kiểm tra tính khả dụng của bản sao
  var hasUnavailable = loan.sach.some(function (b) { return !b.khaDung; });
  if (hasUnavailable) {
    showToast("error", "Không thể duyệt yêu cầu này!", "Bản sao sách hiện không khả dụng trên giá lưu trữ.");
    return;
  }

  // 2. Mở hộp thoại xác nhận
  showConfirm({
    title: "Xác nhận duyệt yêu cầu mượn?",
    message: "Bạn có chắc chắn muốn duyệt phiếu " + loan.maPhieu + " và chuyển sang trạng thái chuẩn bị sách không?",
    type: "green",
    confirmText: "Xác nhận duyệt",
    cancelText: "Hủy",
    onConfirm: function () {
      loan.trangThai = "Đang chuẩn bị";
      updateCountsAndStats();
      renderLoanTable();
      showToast("success", "Duyệt yêu cầu thành công!", "Phiếu mượn " + loan.maPhieu + " đã được chuyển sang trạng thái Đang chuẩn bị.");
    }
  });
}

// ------------------------------------------------------------------------------
// 13. NGHIỆP VỤ HOÀN TẤT CHUẨN BỊ (Đang chuẩn bị -> Sẵn sàng nhận)
// ------------------------------------------------------------------------------
function confirmCompletePrep(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  showConfirm({
    title: "Xác nhận hoàn tất chuẩn bị?",
    message: "Bạn có chắc chắn sách của phiếu " + loan.maPhieu + " đã được nhặt xong và sẵn sàng trên kệ chờ nhận?",
    type: "green",
    confirmText: "Hoàn tất chuẩn bị",
    cancelText: "Quay lại",
    onConfirm: function () {
      loan.trangThai = "Sẵn sàng nhận";
      loan.henNhan = "Khay chờ #08";
      loan.hanNhan = "Giữ 24h tại quầy";
      updateCountsAndStats();
      renderLoanTable();
      showToast("success", "Chuẩn bị sách hoàn tất!", "Phiếu " + loan.maPhieu + " đã chuyển sang Sẵn sàng nhận. Đã gửi thông báo cho độc giả.");
    }
  });
}

// ------------------------------------------------------------------------------
// 14. NGHIỆP VỤ GIAO SÁCH (Sẵn sàng nhận -> Đang mượn)
// ------------------------------------------------------------------------------
function confirmHandoverLoan(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  showConfirm({
    title: "Xác nhận giao sách cho độc giả?",
    message: "Xác nhận độc giả " + loan.docGia.ten + " (MSSV: " + loan.docGia.mssv + ") đã nhận sách và bắt đầu thời hạn mượn 14 ngày?",
    type: "green",
    confirmText: "Xác nhận giao sách",
    cancelText: "Hủy",
    onConfirm: function () {
      loan.trangThai = "Đang mượn";
      var today = new Date();
      var dueDate = new Date();
      dueDate.setDate(today.getDate() + 14);
      var dueStr = dueDate.toISOString().slice(0, 10);
      loan.ngayHenTra = dueStr;
      loan.hanNhan = "Hạn trả: 14 ngày sau";
      loan.docGia.soSachDangGiu += loan.sach.length;

      updateCountsAndStats();
      renderLoanTable();
      showToast("success", "Giao sách thành công!", "Phiếu mượn " + loan.maPhieu + " đã kích hoạt trạng thái Đang mượn (14 ngày).");
    }
  });
}

// ------------------------------------------------------------------------------
// 15. NGHIỆP VỤ TỪ CHỐI KÈM LÝ DO (Chờ duyệt -> Đã từ chối)
// ------------------------------------------------------------------------------
function openRejectModal(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  currentRejectLoanId = loanId;
  var modal = document.getElementById("reject-modal");
  var codeEl = document.getElementById("reject-modal-loan-code");
  var textarea = document.getElementById("reject-reason-textarea");
  var errorMsg = document.getElementById("reject-error-msg");
  var counterEl = document.getElementById("reject-char-counter");

  if (codeEl) codeEl.textContent = "Phiếu mượn #" + loan.maPhieu + " - Độc giả: " + loan.docGia.ten;
  if (textarea) {
    textarea.value = "";
    textarea.classList.remove("has-error");
  }
  if (errorMsg) errorMsg.style.display = "none";
  if (counterEl) counterEl.textContent = "0 / 200";

  if (modal) modal.classList.add("active");
}

function closeRejectModal() {
  var modal = document.getElementById("reject-modal");
  if (modal) modal.classList.remove("active");
  currentRejectLoanId = null;
}

function submitRejectLoan() {
  if (!currentRejectLoanId) return;

  var loan = loanData.find(function (item) { return item.id === currentRejectLoanId; });
  if (!loan) return;

  var textarea = document.getElementById("reject-reason-textarea");
  var errorMsg = document.getElementById("reject-error-msg");
  var reason = textarea ? textarea.value.trim() : "";

  // Bắt buộc nhập lý do
  if (!reason) {
    if (textarea) textarea.classList.add("has-error");
    if (errorMsg) errorMsg.style.display = "block";
    showToast("warning", "Cảnh báo", "Vui lòng nhập lý do từ chối trước khi xác nhận.");
    return;
  }

  loan.trangThai = "Đã từ chối";
  loan.lyDoTuChoi = reason;

  closeRejectModal();
  updateCountsAndStats();
  renderLoanTable();

  showToast("success", "Đã từ chối yêu cầu mượn.", "Hệ thống đã cập nhật trạng thái phiếu " + loan.maPhieu + " và gửi thông báo lý do đến sinh viên.");
}

// ------------------------------------------------------------------------------
// 16. NGHIỆP VỤ XÓA BẢN GHI (Đã từ chối / Hết hạn nhận -> Bỏ khỏi danh sách)
// ------------------------------------------------------------------------------
function confirmDeleteLoan(loanId) {
  var loanIndex = loanData.findIndex(function (item) { return item.id === loanId; });
  if (loanIndex === -1) return;

  var loan = loanData[loanIndex];

  showConfirm({
    title: "Xác nhận xóa dữ liệu?",
    message: "Bạn có chắc chắn muốn xóa bản ghi phiếu " + loan.maPhieu + "? Thao tác này không thể khôi phục lại.",
    type: "red",
    confirmText: "Xóa dữ liệu",
    cancelText: "Hủy",
    onConfirm: function () {
      loanData.splice(loanIndex, 1);
      updateCountsAndStats();
      renderLoanTable();
      showToast("success", "Xóa dữ liệu thành công.", "Bản ghi phiếu " + loan.maPhieu + " đã được xóa khỏi hệ thống.");
    }
  });
}

// ------------------------------------------------------------------------------
// 17. TIỆN ÍCH AN TOÀN HTML (ESCAPE HTML)
// ------------------------------------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ------------------------------------------------------------------------------
// 18. KHỞI TẠO SỰ KIỆN GIAO DIỆN (DOM CONTENT LOADED)
// ------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  // 1. Kiểm tra trạng thái quá hạn
  updateOverdueStatuses();

  // 2. Cập nhật thẻ thống kê & render bảng lần đầu
  updateCountsAndStats();
  renderLoanTable();

  // 3. Sự kiện chuyển Tab
  var tabButtons = document.querySelectorAll("#filter-tabs .tab-btn");
  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabButtons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentTab = btn.getAttribute("data-tab");
      currentPage = 1;
      renderLoanTable();
    });
  });

  // 4. Sự kiện Tìm kiếm ngay khi gõ
  var searchInput = document.getElementById("filter-keyword");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      currentSearchKeyword = searchInput.value;
      currentPage = 1;
      renderLoanTable();
    });
  }

  // 5. Sự kiện nút Lọc
  var btnApply = document.getElementById("btn-apply-filter");
  if (btnApply) {
    btnApply.addEventListener("click", function () {
      var timeSelect = document.getElementById("filter-time");
      var deptSelect = document.getElementById("filter-department");
      if (timeSelect) currentTimeFilter = timeSelect.value;
      if (deptSelect) currentDeptFilter = deptSelect.value;
      if (searchInput) currentSearchKeyword = searchInput.value;
      currentPage = 1;
      renderLoanTable();
      showToast("info", "Đã áp dụng bộ lọc", "Danh sách đã được làm mới theo các điều kiện lọc.");
    });
  }

  // 6. Sự kiện nút Đặt lại bộ lọc
  var btnReset = document.getElementById("btn-reset-filter");
  if (btnReset) {
    btnReset.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      var timeSelect = document.getElementById("filter-time");
      var deptSelect = document.getElementById("filter-department");
      if (timeSelect) timeSelect.value = "all";
      if (deptSelect) deptSelect.value = "all";

      currentSearchKeyword = "";
      currentTimeFilter = "all";
      currentDeptFilter = "all";
      currentPage = 1;

      renderLoanTable();
      showToast("info", "Đã đặt lại bộ lọc", "Đã xóa toàn bộ điều kiện tìm kiếm và bộ lọc thời gian.");
    });
  }

  // 7. Sự kiện thay đổi số dòng mỗi trang (Page size select)
  var pageSizeSelect = document.getElementById("page-size-select");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", function () {
      pageSize = parseInt(pageSizeSelect.value, 10) || 10;
      currentPage = 1;
      renderLoanTable();
    });
  }

  // 8. Nút "Làm mới dữ liệu" ở tiêu đề trang
  var btnRefresh = document.getElementById("btn-refresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", function () {
      showToast("info", "Đang cập nhật dữ liệu...", "Đang đồng bộ dữ liệu từ hàng đợi OPAC.");
      setTimeout(function () {
        updateOverdueStatuses();
        updateCountsAndStats();
        renderLoanTable();
        showToast("success", "Cập nhật thành công!", "Dữ liệu yêu cầu mượn trực tuyến đã được làm mới.");
      }, 500);
    });
  }

  // 9. Nút "Xuất báo cáo trực tuyến"
  var btnExport = document.getElementById("btn-export");
  if (btnExport) {
    btnExport.addEventListener("click", function () {
      showToast("info", "Đang xuất báo cáo...", "Đang trích xuất dữ liệu danh sách phiếu mượn sang file Excel/CSV.");
      setTimeout(function () {
        showToast("success", "Báo cáo đã được xuất thành công!", "File báo cáo đã được tải về máy của bạn.");
      }, 800);
    });
  }

  // 10. Sự kiện đóng Modal Chi tiết
  var btnCloseDetail = document.getElementById("btn-close-detail-modal");
  if (btnCloseDetail) {
    btnCloseDetail.addEventListener("click", closeDetailModal);
  }

  var detailModal = document.getElementById("detail-modal");
  if (detailModal) {
    detailModal.addEventListener("click", function (e) {
      if (e.target === detailModal) closeDetailModal();
    });
  }

  // 11. Sự kiện trong Hộp thoại từ chối
  var btnCloseReject = document.getElementById("btn-close-reject-modal");
  var btnCancelReject = document.getElementById("btn-cancel-reject");
  var btnSubmitReject = document.getElementById("btn-submit-reject");
  var rejectModal = document.getElementById("reject-modal");
  var rejectTextarea = document.getElementById("reject-reason-textarea");
  var rejectCounter = document.getElementById("reject-char-counter");

  if (btnCloseReject) btnCloseReject.addEventListener("click", closeRejectModal);
  if (btnCancelReject) btnCancelReject.addEventListener("click", closeRejectModal);
  if (btnSubmitReject) btnSubmitReject.addEventListener("click", submitRejectLoan);

  if (rejectModal) {
    rejectModal.addEventListener("click", function (e) {
      if (e.target === rejectModal) closeRejectModal();
    });
  }

  // Bộ đếm ký tự textarea từ chối
  if (rejectTextarea && rejectCounter) {
    rejectTextarea.addEventListener("input", function () {
      var len = rejectTextarea.value.length;
      rejectCounter.textContent = len + " / 200";
      if (len > 0) {
        rejectTextarea.classList.remove("has-error");
        var err = document.getElementById("reject-error-msg");
        if (err) err.style.display = "none";
      }
    });
  }

  // Chọn nhanh lý do từ chối điền vào textarea
  var reasonPills = document.querySelectorAll("#quick-reason-pills .reason-pill");
  reasonPills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      var reasonVal = pill.getAttribute("data-reason");
      if (rejectTextarea) {
        rejectTextarea.value = reasonVal;
        rejectTextarea.focus();
        if (rejectCounter) rejectCounter.textContent = reasonVal.length + " / 200";
        rejectTextarea.classList.remove("has-error");
        var err = document.getElementById("reject-error-msg");
        if (err) err.style.display = "none";
      }
    });
  });

  // 12. Sự kiện trong Hộp thoại xác nhận chung (Confirm modal)
  var btnConfirmCancel = document.getElementById("btn-confirm-cancel");
  var btnConfirmProceed = document.getElementById("btn-confirm-proceed");
  var confirmModal = document.getElementById("confirm-modal");

  if (btnConfirmCancel) btnConfirmCancel.addEventListener("click", closeConfirmModal);

  if (btnConfirmProceed) {
    btnConfirmProceed.addEventListener("click", function () {
      var callback = activeConfirmCallback;
      closeConfirmModal();
      if (typeof callback === "function") {
        callback();
      }
    });
  }

  if (confirmModal) {
    confirmModal.addEventListener("click", function (e) {
      if (e.target === confirmModal) closeConfirmModal();
    });
  }

  // 13. Phím Esc đóng mọi modal đang mở
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.keyCode === 27) {
      closeDetailModal();
      closeRejectModal();
      closeConfirmModal();
    }
  });

  // 14. Các nút header phụ
  var btnTopbarBasket = document.getElementById("btn-topbar-basket");
  if (btnTopbarBasket) {
    btnTopbarBasket.addEventListener("click", function () {
      showToast("info", "Giỏ tiếp nhận yêu cầu", "Hiện có 3 yêu cầu mượn mới từ OPAC cần tiếp nhận.");
    });
  }

  var btnTopbarAccount = document.getElementById("btn-topbar-account");
  if (btnTopbarAccount) {
    btnTopbarAccount.addEventListener("click", function () {
      showToast("info", "Thông tin tài khoản", "Thủ thư: Nguyễn Văn A (Mã ca: S01).");
    });
  }

  var btnTopbarLogout = document.getElementById("btn-topbar-logout");
  if (btnTopbarLogout) {
    btnTopbarLogout.addEventListener("click", function () {
      showConfirm({
        title: "Xác nhận đăng xuất?",
        message: "Bạn có chắc chắn muốn kết thúc phiên làm việc thủ thư không?",
        type: "red",
        confirmText: "Đăng xuất",
        cancelText: "Hủy",
        onConfirm: function () {
          showToast("info", "Đang đăng xuất...", "Phiên làm việc đã kết thúc.");
          setTimeout(function () {
            window.location.href = "../index.html";
          }, 800);
        }
      });
    });
  }
});
