/**
 * ==============================================================================
 * KS25 Library - Logic Trang Chi Tiết Sách (book_detail.js)
 * Chức năng:
 *  1. Kiểm tra xác thực (Bắt buộc đăng nhập để xem chi tiết & mượn sách).
 *  2. Header tích hợp Avatar người dùng và Giỏ hàng mượn sách.
 *  3. Hiệu ứng bay sách vào icon giỏ hàng khi nhấn "Thêm vào giỏ mượn".
 *  4. Quản lý danh mục bản sao vật lý & bộ lọc kho.
 *  5. Chuyển đổi Tabs nội dung linh hoạt.
 *  6. Đổi sách và xem chi tiết tức thì khi nhấn vào "Tài liệu liên quan".
 * ==============================================================================
 */

(function () {
  "use strict";

  // DANH MỤC CÁC SÁCH CHI TIẾT ĐẦY ĐỦ THÔNG TIN
  const BOOKS_CATALOG = {
    dsa: {
      key: "dsa",
      isbn: "978-604-8-31298-1",
      ddc: "005.1 D978",
      title: "Cấu trúc Dữ liệu & Giải thuật nâng cao",
      authors: "TS. Lê Hoàng Nam",
      coAuthors: "ThS. Trần Minh Quang",
      publisher: "NXB Giáo Dục Việt Nam (2023)",
      edition: "Lần 3",
      editionSub: "Tái bản có chỉnh lý",
      rating: "4.8",
      reviewCount: 38,
      borrowCount: 142,
      importDate: "15/08/2023",
      totalCopies: 8,
      availableCopies: 5,
      shelfLocation: "KHO-IT / Tầng 1 / Kệ A3-02",
      format: "Bìa mềm cao cấp",
      pages: "480 trang chuẩn",
      language: "Tiếng Việt (Thuật ngữ EN)",
      size: "16 x 24 cm",
      tags: [
        "Khoa học Máy tính",
        "Lập trình ứng dụng",
        "Cấu trúc Dữ liệu & Giải thuật",
        "Giáo trình Chuẩn Bộ GD&ĐT"
      ],
      cover: {
        tag: "GIÁO TRÌNH ĐẠI HỌC",
        title: "CẤU TRÚC DỮ LIỆU<br>& GIẢI THUẬT",
        author: "TS. LÊ HOÀNG NAM",
        bg: "linear-gradient(145deg, #16382a, #0d231a)",
        accent: "#6ee7b7",
        publisher: "NXB ĐẠI HỌC QUỐC GIA",
        sub: "TÁI BẢN LẦN 3",
        svgType: "tree"
      },
      summary: "Giáo trình cung cấp các kiến thức cốt lõi và chuyên sâu về cấu trúc dữ liệu tuyến tính, cây nhị phân cân bằng (AVL, Red-Black Trees), đồ thị định hướng và các giải thuật tối ưu hóa phức tạp như Dijkstra, A* Search và Quy hoạch động. Giáo trình được thiết kế chuẩn mực với hệ thống mã nguồn mẫu cụ thể bằng C++20 và Java 17, kèm theo các bài toán thực tiễn phân tích độ phức tạp thời gian O(n log n) và kiểm thử bộ nhớ. Phù hợp cho sinh viên chuyên ngành Kỹ thuật Phần mềm, Khoa học Máy tính và kỹ sư chuẩn bị cho các kỳ thi lập trình quốc tế ACM-ICPC.",
      highlights: [
        "Đầy đủ 14 chương từ cấu trúc cơ bản đến giải thuật mạng luồng cực đại",
        "Tích hợp mã QR truy cập kho mã nguồn bài tập trực tuyến"
      ],
      copies: [
        { id: 1, barcode: "BS-IT-001", location: "Tầng 1 – Kệ A3 – Ngăn 02", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
        { id: 2, barcode: "BS-IT-002", location: "Tầng 1 – Kệ A3 – Ngăn 02", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
        { id: 3, barcode: "BS-IT-003", location: "Tầng 2 – Phòng Nghiên cứu", type: "Đọc tại chỗ", status: "AVAILABLE", statusText: "Khả dụng", action: "ONSITE" },
        { id: 4, barcode: "BS-IT-004", location: "Tầng 1 – Kệ A3 – Ngăn 02", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "28/10/2026", action: "RESERVE" },
        { id: 5, barcode: "BS-IT-005", location: "Tầng 1 – Kệ A3 – Ngăn 02", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" }
      ]
    },

    kientruc: {
      key: "kientruc",
      isbn: "978-604-8-31201-1",
      ddc: "005.2 AR88",
      title: "Kiến trúc Phần mềm & Hệ thống Phân tán",
      authors: "PGS. TS. Vũ Thành Trung",
      coAuthors: "TS. Hoàng Quốc Bảo",
      publisher: "NXB Bách Khoa Hà Nội (2023)",
      edition: "Lần 2",
      editionSub: "Tái bản mở rộng",
      rating: "4.9",
      reviewCount: 45,
      borrowCount: 168,
      importDate: "20/09/2023",
      totalCopies: 5,
      availableCopies: 3,
      shelfLocation: "KHO-IT / Tầng 1 / Kệ B2-01",
      format: "Bìa cứng ép kim",
      pages: "520 trang chuẩn",
      language: "Tiếng Việt (Thuật ngữ EN)",
      size: "17 x 25 cm",
      tags: [
        "Kiến trúc Phần mềm",
        "Hệ thống phân tán",
        "Microservices",
        "Tài liệu chuyên khảo"
      ],
      cover: {
        tag: "TÀI LIỆU CHUYÊN SÂU",
        title: "KIẾN TRÚC PHẦN MỀM<br>& HỆ THỐNG PHÂN TÁN",
        author: "PGS. TS. VŨ THÀNH TRUNG",
        bg: "linear-gradient(145deg, #0f172a, #1e3a8a)",
        accent: "#93c5fd",
        publisher: "NXB BÁCH KHOA",
        sub: "XUẤT BẢN NĂM 2023",
        svgType: "arch"
      },
      summary: "Tài liệu chuyên sâu phân tích thiết kế kiến trúc vi dịch vụ (Microservices), hệ thống tin cậy cao, kiến trúc hướng sự kiện (Event-Driven Architecture) cùng các giải pháp chịu tải cao, caching đa tầng, message broker (Kafka, RabbitMQ) và chuẩn thiết kế RESTful / gRPC. Thích hợp cho sinh viên năm cuối và kỹ sư phát triển hệ thống quy mô lớn.",
      highlights: [
        "Khảo sát các case-study hệ thống chịu tải hàng triệu request/giây",
        "Phân tích chuyên sâu cơ chế CAP Theorem, Eventual Consistency và Saga Pattern"
      ],
      copies: [
        { id: 1, barcode: "BS-SE-001", location: "Tầng 1 – Kệ B2 – Ngăn 01", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
        { id: 2, barcode: "BS-SE-002", location: "Tầng 1 – Kệ B2 – Ngăn 01", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
        { id: 3, barcode: "BS-SE-003", location: "Tầng 2 – Phòng Nghiên cứu", type: "Đọc tại chỗ", status: "AVAILABLE", statusText: "Khả dụng", action: "ONSITE" },
        { id: 4, barcode: "BS-SE-004", location: "Tầng 1 – Kệ B2 – Ngăn 01", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "05/11/2026", action: "RESERVE" },
        { id: 5, barcode: "BS-SE-005", location: "Tầng 1 – Kệ B2 – Ngăn 01", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" }
      ]
    },

    hethong: {
      key: "hethong",
      isbn: "978-604-8-31202-8",
      ddc: "004.6 SY92",
      title: "Thiết kế Hệ thống Quy mô lớn",
      authors: "Alex Xu (Bản dịch KS25)",
      coAuthors: "Đội ngũ Dịch thuật KS25",
      publisher: "NXB Thông tin & Truyền thông (2024)",
      edition: "Lần 1",
      editionSub: "Bản dịch bản quyền",
      rating: "4.9",
      reviewCount: 62,
      borrowCount: 210,
      importDate: "10/01/2024",
      totalCopies: 10,
      availableCopies: 7,
      shelfLocation: "KHO-IT / Tầng 1 / Kệ B2-05",
      format: "Bìa mềm tay gập",
      pages: "410 trang chuẩn",
      language: "Tiếng Việt (Bilingual Diagrams)",
      size: "18 x 25 cm",
      tags: [
        "System Design",
        "Cloud Computing",
        "Cơ sở dữ liệu lớn",
        "Phỏng vấn Kỹ thuật"
      ],
      cover: {
        tag: "BẢN DỊCH HỌC THUẬT",
        title: "THIẾT KẾ HỆ THỐNG<br>QUY MÔ LỚN",
        author: "ALEX XU (BẢN DỊCH KS25)",
        bg: "linear-gradient(145deg, #1e293b, #334155)",
        accent: "#cbd5e1",
        publisher: "NXB TT & TRUYỀN THÔNG",
        sub: "PHIÊN BẢN 2024",
        svgType: "system"
      },
      summary: "Cuốn sách cẩm nang kinh điển về thiết kế hệ thống thực chiến: phân tích thiết kế hệ thống Chat thời gian thực, YouTube Video streaming, URL Shortener, Web Crawler, và Distributed Message Queue. Hướng dẫn từng bước cách tiếp cận phỏng vấn thiết kế hệ thống và tính toán throughput, IOPS, băng thông và lưu trữ chính xác.",
      highlights: [
        "Hơn 300 sơ đồ kiến trúc trực quan, mô tả chi tiết luồng dữ liệu",
        "Phương pháp 4 bước làm chủ mọi bài toán thiết kế hệ thống phức tạp"
      ],
      copies: [
        { id: 1, barcode: "BS-SYS-001", location: "Tầng 1 – Kệ B2 – Ngăn 05", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
        { id: 2, barcode: "BS-SYS-002", location: "Tầng 1 – Kệ B2 – Ngăn 05", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
        { id: 3, barcode: "BS-SYS-003", location: "Tầng 1 – Kệ B2 – Ngăn 05", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
        { id: 4, barcode: "BS-SYS-004", location: "Tầng 1 – Kệ B2 – Ngăn 05", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
        { id: 5, barcode: "BS-SYS-005", location: "Tầng 1 – Kệ B2 – Ngăn 05", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" }
      ]
    },

    python: {
      key: "python",
      isbn: "978-604-8-31203-5",
      ddc: "005.13 PY44",
      title: "Lập trình Python chuyên sâu & Giải thuật",
      authors: "TS. Đỗ Bá Lâm",
      coAuthors: "ThS. Ngô Văn Tuấn",
      publisher: "NXB Khoa học và Kỹ thuật (2023)",
      edition: "Lần 2",
      editionSub: "Bổ sung thuật toán thực hành",
      rating: "4.7",
      reviewCount: 29,
      borrowCount: 115,
      importDate: "05/11/2023",
      totalCopies: 4,
      availableCopies: 1,
      shelfLocation: "KHO-IT / Tầng 1 / Kệ A1-08",
      format: "Bìa mềm cao cấp",
      pages: "430 trang chuẩn",
      language: "Tiếng Việt",
      size: "16 x 24 cm",
      tags: [
        "Python 3.12",
        "Giải thuật & Cấu trúc",
        "Data Science",
        "LeetCode Practical"
      ],
      cover: {
        tag: "GIÁO TRÌNH THỰC HÀNH",
        title: "LẬP TRÌNH PYTHON<br>CHUYÊN SÂU & GIẢI THUẬT",
        author: "TS. ĐỖ BÁ LÂM",
        bg: "linear-gradient(145deg, #14532d, #166534)",
        accent: "#86efac",
        publisher: "NXB KHOA HỌC & KỸ THUẬT",
        sub: "PHIÊN BẢN CHỈNH LÝ",
        svgType: "python"
      },
      summary: "Khai thác triệt để các tính năng nâng cao của Python: Generators, Decorators, Concurrency (asyncio, multiprocessing), Memory Management (GIL) và ứng dụng hiện thực hóa cấu trúc dữ liệu & giải thuật tối ưu hóa trong AI, Data Science và xử lý dữ liệu lớn.",
      highlights: [
        "Hơn 120 bài tập thực hành thuật toán có kèm phân tích Big-O",
        "Tối ưu hóa hiệu năng chương trình Python với Cython và NumPy vectorization"
      ],
      copies: [
        { id: 1, barcode: "BS-PY-001", location: "Tầng 1 – Kệ A1 – Ngăn 08", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
        { id: 2, barcode: "BS-PY-002", location: "Tầng 1 – Kệ A1 – Ngăn 08", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "30/10/2026", action: "RESERVE" },
        { id: 3, barcode: "BS-PY-003", location: "Tầng 1 – Kệ A1 – Ngăn 08", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "02/11/2026", action: "RESERVE" },
        { id: 4, barcode: "BS-PY-004", location: "Tầng 1 – Kệ A1 – Ngăn 08", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "15/11/2026", action: "RESERVE" }
      ]
    },

    cleancode: {
      key: "cleancode",
      isbn: "978-604-0-00032-5",
      ddc: "005.13 CC32",
      title: "Kiến Trúc Mã Sạch (Clean Code)",
      authors: "Robert C. Martin",
      coAuthors: "Dean Wampler",
      publisher: "NXB Khoa Học & Kỹ Thuật (2022)",
      edition: "Lần 4",
      editionSub: "Tái bản bìa cứng",
      rating: "5.0",
      reviewCount: 94,
      borrowCount: 380,
      importDate: "12/03/2023",
      totalCopies: 5,
      availableCopies: 0,
      shelfLocation: "KHO-IT / Tầng 1 / Kệ A1-02",
      format: "Bìa cứng cao cấp",
      pages: "464 trang chuẩn",
      language: "Tiếng Việt (Bản dịch kỹ sư)",
      size: "17 x 24 cm",
      tags: [
        "Công nghệ phần mềm",
        "Mã sạch & Refactoring",
        "Best Practices",
        "Kinh điển IT"
      ],
      cover: {
        tag: "KINH ĐIỂN CÔNG NGHỆ",
        title: "KIẾN TRÚC MÃ SẠCH<br>(CLEAN CODE)",
        author: "ROBERT C. MARTIN",
        bg: "linear-gradient(145deg, #1e3a8a, #0f172a)",
        accent: "#60a5fa",
        publisher: "NXB KHOA HỌC KỸ THUẬT",
        sub: "BẢN DỊCH CHUẨN",
        svgType: "arch"
      },
      summary: "Clean Code - Nghệ thuật viết mã sạch, dễ đọc, dễ bảo trì và mở rộng. Cuốn sách gối đầu giường của mọi kỹ sư phần mềm, hướng dẫn chi tiết cách đặt tên hàm, tách module, thiết kế SOLID và xử lý biệt lệ chuẩn xác.",
      highlights: [
        "Phân tích hơn 200 đoạn mã mẫu trước và sau khi refactoring",
        "Nguyên tắc SOLID và thiết kế Clean Architecture kinh điển"
      ],
      copies: [
        { id: 1, barcode: "BS-CC-001", location: "Tầng 1 – Kệ A1 – Ngăn 02", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "25/11/2026", action: "RESERVE" },
        { id: 2, barcode: "BS-CC-002", location: "Tầng 1 – Kệ A1 – Ngăn 02", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "28/11/2026", action: "RESERVE" },
        { id: 3, barcode: "BS-CC-003", location: "Tầng 1 – Kệ A1 – Ngăn 02", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "02/12/2026", action: "RESERVE" },
        { id: 4, barcode: "BS-CC-004", location: "Tầng 1 – Kệ A1 – Ngăn 02", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "05/12/2026", action: "RESERVE" },
        { id: 5, barcode: "BS-CC-005", location: "Tầng 1 – Kệ A1 – Ngăn 02", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "10/12/2026", action: "RESERVE" }
      ]
    }
  };

  // Sách đang hiển thị hiện tại
  let currentBookKey = "dsa";
  let BOOK_DATA = BOOKS_CATALOG.dsa;

  // Render SVG họa tiết bìa sách theo chủ đề
  function renderCoverSvg(type, accent) {
    if (type === "tree") {
      return `
        <svg width="120" height="90" viewBox="0 0 120 90" fill="none" stroke="${accent}" stroke-width="1.5">
          <circle cx="60" cy="15" r="7" />
          <circle cx="30" cy="45" r="6" />
          <circle cx="90" cy="45" r="6" />
          <circle cx="15" cy="75" r="5" />
          <circle cx="45" cy="75" r="5" />
          <circle cx="75" cy="75" r="5" />
          <circle cx="105" cy="75" r="5" />
          <line x1="55" y1="20" x2="35" y2="40" />
          <line x1="65" y1="20" x2="85" y2="40" />
          <line x1="26" y1="50" x2="18" y2="70" />
          <line x1="34" y1="50" x2="42" y2="70" />
          <line x1="86" y1="50" x2="78" y2="70" />
          <line x1="94" y1="50" x2="102" y2="70" />
        </svg>
      `;
    } else if (type === "arch") {
      return `
        <svg width="120" height="85" viewBox="0 0 120 85" fill="none" stroke="${accent}" stroke-width="1.5">
          <rect x="15" y="10" width="30" height="25" rx="4" />
          <rect x="75" y="10" width="30" height="25" rx="4" />
          <rect x="45" y="50" width="30" height="25" rx="4" />
          <path d="M45 22h30" />
          <path d="M30 35v15h15" />
          <path d="M90 35v15H75" />
        </svg>
      `;
    } else if (type === "system") {
      return `
        <svg width="120" height="85" viewBox="0 0 120 85" fill="none" stroke="${accent}" stroke-width="1.5">
          <ellipse cx="60" cy="20" rx="35" ry="12" />
          <path d="M25 20v20c0 6.6 15.7 12 35 12s35-5.4 35-12V20" />
          <path d="M25 40v20c0 6.6 15.7 12 35 12s35-5.4 35-12V40" />
        </svg>
      `;
    } else {
      return `
        <svg width="120" height="85" viewBox="0 0 120 85" fill="none" stroke="${accent}" stroke-width="1.5">
          <path d="M60 15c-15 0-25 5-25 15h25v5H35c0 15 10 25 25 25 15 0 25-5 25-15H60v-5h25c0-15-10-25-25-25z" />
          <circle cx="48" cy="22" r="3" fill="${accent}" />
          <circle cx="72" cy="68" r="3" fill="${accent}" />
        </svg>
      `;
    }
  }

  // Khởi tạo giỏ hàng từ localStorage
  function getCart() {
    try {
      const raw = localStorage.getItem("ks25_cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem("ks25_cart", JSON.stringify(cart));
    } catch {
      // ignore
    }
    updateCartBadge();
  }

  function updateCartBadge() {
    const badge = document.getElementById("headerCartBadge");
    if (!badge) return;
    const cart = getCart();
    const count = cart.length;
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  }

  // 1. KIỂM TRA ĐĂNG NHẬP (AUTH GUARD)
  function checkAuth() {
    let user = typeof auth !== "undefined" ? auth.getUser() : null;
    let token = typeof auth !== "undefined" ? auth.getToken() : null;

    if (!user || !token) {
      try {
        const stored = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
        if (stored) user = JSON.parse(stored);
      } catch {}
    }

    const overlay = document.getElementById("authGuardOverlay");
    if (!user) {
      // Cho phép độc giả xem chi tiết tài liệu tự do, chỉ kích hoạt yêu cầu đăng nhập khi mượn/đặt trước
      if (overlay) overlay.style.display = "none";
      return false;
    } else {
      if (overlay) overlay.style.display = "none";
      const userNameEl = document.getElementById("headerUserName");
      const userRoleEl = document.getElementById("headerUserRole");
      const userAvatarEl = document.getElementById("headerUserAvatar");
      if (userNameEl) userNameEl.textContent = user.full_name || user.email || "Sinh viên KS25";
      if (userRoleEl) userRoleEl.textContent = user.role === "ADMIN" ? "Quản trị viên" : (user.role === "LIBRARIAN" ? "Thủ thư" : "Sinh viên");
      if (userAvatarEl) {
        const initial = (user.full_name || user.email || "U").charAt(0).toUpperCase();
        userAvatarEl.textContent = initial;
      }
      return true;
    }
  }

  // Đăng nhập nhanh Demo để duyệt xem tính năng không bị chặn
  window.demoLoginAsStudent = function () {
    const demoUser = {
      id: 99,
      email: "sinhvien@ks25.edu.vn",
      full_name: "Nguyễn Nhật Anh",
      role: "READER",
      student_id: "B25DTCN065"
    };
    if (typeof auth !== "undefined") {
      auth.setToken("demo_token_ks25_student", true);
      auth.setUser(demoUser);
    } else {
      localStorage.setItem("access_token", "demo_token_ks25_student");
      localStorage.setItem("user_info", JSON.stringify(demoUser));
    }
    const overlay = document.getElementById("authGuardOverlay");
    if (overlay) overlay.style.display = "none";
    checkAuth();
    showToast("✓ Đăng nhập thành công với tài khoản Sinh viên!");
  };

  // 2. CHUYỂN ĐỔI VÀ RENDER CHI TIẾT SÁCH
  window.switchBook = function (key) {
    if (!BOOKS_CATALOG[key]) return;
    currentBookKey = key;
    BOOK_DATA = BOOKS_CATALOG[key];

    // Cập nhật URL parameter mà không reload trang
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("book", key);
      window.history.pushState({ book: key }, "", url.toString());
    } catch {}

    // Render toàn bộ giao diện sách mới
    renderCurrentBook();

    // Cuộn mượt lên đầu trang để người dùng xem chi tiết
    window.scrollTo({ top: 0, behavior: "smooth" });

    showToast(`📖 Đang hiển thị chi tiết: "${BOOK_DATA.title}"`);
  };

  function renderCurrentBook() {
    const book = BOOK_DATA;

    // 1. Tiêu đề trang & Breadcrumb
    const pageTitleEl = document.getElementById("pageTitle");
    if (pageTitleEl) pageTitleEl.textContent = `${book.title} | Thư viện số KS25`;
    document.title = `${book.title} | Thư viện số KS25`;

    const breadcrumbEl = document.getElementById("breadcrumbBookTitle");
    if (breadcrumbEl) breadcrumbEl.textContent = book.title;

    // 2. Khung bìa 3D
    const coverWrap = document.getElementById("mainBookCoverWrap");
    if (coverWrap) {
      coverWrap.innerHTML = `
        <div style="width:100%; height:100%; background: ${book.cover.bg}; color:#fff; padding:28px 20px; display:flex; flex-direction:column; justify-content:space-between; box-shadow: inset 4px 0 10px rgba(0,0,0,0.5);">
          <div>
            <div style="font-size:11px; letter-spacing:2px; font-weight:700; color:${book.cover.accent}; text-transform:uppercase;">${book.cover.tag}</div>
            <h3 style="font-family:var(--font-serif); font-size:22px; font-weight:800; margin:16px 0 8px; line-height:1.2; color:#ffffff;">
              ${book.cover.title}
            </h3>
            <div style="font-size:13px; color:#e2e8f0; font-weight:600;">${book.cover.author}</div>
          </div>

          <div style="text-align:center; opacity:0.4; margin:10px 0;">
            ${renderCoverSvg(book.cover.svgType, book.cover.accent)}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.15); padding-top:10px;">
            <span>${book.cover.publisher}</span>
            <span>${book.cover.sub}</span>
          </div>
        </div>
      `;
    }

    // 3. Trạng thái khả dụng & Nút Mượn / Đặt trước (Yêu cầu task T3CFC92)
    const availPill = document.getElementById("bookAvailabilityPill");
    const availText = document.getElementById("bookAvailabilityText");
    const mainBtn = document.getElementById("btnMainAddCart");

    if (book.availableCopies > 0) {
      if (availPill) availPill.className = "availability-pill";
      if (availText) availText.textContent = `Còn ${book.availableCopies} / ${book.totalCopies} bản sao khả dụng`;
      if (mainBtn) {
        mainBtn.className = "btn-add-cart-main";
        mainBtn.innerHTML = `<span style="font-size: 18px;">🛒</span><span>Thêm vào giỏ mượn</span>`;
        mainBtn.onclick = (e) => addToCartWithAnimation(e);
      }
    } else {
      if (availPill) availPill.className = "availability-pill avail-out-of-stock";
      if (availText) availText.textContent = `Hết sách (0 / ${book.totalCopies} bản sao khả dụng)`;
      if (mainBtn) {
        mainBtn.className = "btn-add-cart-main btn-reserve-mode";
        mainBtn.innerHTML = `<span style="font-size: 18px;">📋</span><span>Đặt trước tài liệu</span>`;
        mainBtn.onclick = async () => {
          try {
            if (typeof api !== "undefined" && typeof api.createReservation === "function") {
              const u = typeof auth !== "undefined" ? auth.getUser() : null;
              await api.createReservation({ book_isbn: book.isbn }, u?.id);
            }
          } catch (err) {
            console.warn("Backend reservation API offline, lưu trạng thái cục bộ:", err);
          }

          try {
            const raw = localStorage.getItem("ks25_reservations");
            const list = raw ? JSON.parse(raw) : [];
            const exists = list.some((r) => r.book_isbn === book.isbn && (r.status === "WAITING" || r.status === "READY"));
            if (!exists) {
              list.push({
                id: Date.now(),
                user_id: 1,
                book_isbn: book.isbn,
                book_title: book.title,
                book_author: book.authors,
                status: "WAITING",
                reserved_at: new Date().toISOString(),
                pickup_deadline: null,
                queue_position: list.filter((r) => r.status === "WAITING").length + 1,
                cover_bg: book.cover.bg,
                cover_tag: book.cover.tag
              });
              localStorage.setItem("ks25_reservations", JSON.stringify(list));
            }
          } catch {}

          if (confirm(`✓ Đã gửi yêu cầu ĐẶT TRƯỚC cuốn "${book.title}" thành công!\nBạn đang ở vị trí #1 trong hàng chờ.\n\nBạn có muốn chuyển sang xem "Danh sách đặt trước của tôi" ngay không?`)) {
            window.location.href = "reservations.html";
          }
        };
      }
    }

    // 4. Bảng thông số thư mục
    const specDdc = document.getElementById("specDdc");
    if (specDdc) specDdc.textContent = book.ddc;
    const specIsbn = document.getElementById("specIsbn");
    if (specIsbn) specIsbn.textContent = book.isbn;
    const specFormat = document.getElementById("specFormat");
    if (specFormat) specFormat.textContent = book.format;
    const specPages = document.getElementById("specPages");
    if (specPages) specPages.textContent = book.pages;
    const specLang = document.getElementById("specLanguage");
    if (specLang) specLang.textContent = book.language;
    const specSize = document.getElementById("specSize");
    if (specSize) specSize.textContent = book.size;

    // 5. Vị trí kệ
    const shelfCode = document.getElementById("shelfLocationCode");
    if (shelfCode) shelfCode.textContent = book.shelfLocation;

    // 6. Tags
    const tagRow = document.getElementById("bookTagPills");
    if (tagRow) {
      tagRow.innerHTML = book.tags.map((t, idx) => {
        const isHighlight = idx === book.tags.length - 1;
        return `<span class="tag-badge ${isHighlight ? 'tag-badge-highlight' : ''}">${t}</span>`;
      }).join("");
    }

    // 7. Tiêu đề sách chính
    const bookTitleEl = document.getElementById("bookTitle");
    if (bookTitleEl) bookTitleEl.textContent = book.title;

    // 8. Tác giả & NXB Meta
    const metaAuthor = document.getElementById("metaAuthor");
    if (metaAuthor) metaAuthor.textContent = book.authors;
    const metaCoAuthor = document.getElementById("metaCoAuthor");
    if (metaCoAuthor) metaCoAuthor.textContent = book.coAuthors;
    const metaPub = document.getElementById("metaPublisher");
    if (metaPub) metaPub.textContent = book.publisher;

    // 9. Thẻ thống kê
    const statRating = document.getElementById("statRating");
    if (statRating) statRating.textContent = book.rating;
    const statReviews = document.getElementById("statReviewCount");
    if (statReviews) statReviews.textContent = `${book.reviewCount} nhận xét học thuật`;
    const statBorrow = document.getElementById("statBorrowCount");
    if (statBorrow) statBorrow.textContent = book.borrowCount;
    const statEdition = document.getElementById("statEdition");
    if (statEdition) statEdition.textContent = book.edition;
    const statEditionSub = document.getElementById("statEditionSub");
    if (statEditionSub) statEditionSub.textContent = book.editionSub;
    const statDate = document.getElementById("statImportDate");
    if (statDate) statDate.textContent = book.importDate;

    // 10. Tóm tắt nội dung
    const summaryText = document.getElementById("bookSummaryText");
    if (summaryText) summaryText.textContent = book.summary;

    const highlightsGrid = document.getElementById("bookHighlightsGrid");
    if (highlightsGrid) {
      highlightsGrid.innerHTML = book.highlights.map((h) => `
        <div class="highlight-box">
          <span class="highlight-check">✓</span>
          <span>${h}</span>
        </div>
      `).join("");
    }

    // 11. Bảng bản sao
    const tabCopiesCount = document.getElementById("tabCopiesCount");
    if (tabCopiesCount) tabCopiesCount.textContent = book.totalCopies;
    const badgeCopiesCount = document.getElementById("badgeCopiesCount");
    if (badgeCopiesCount) badgeCopiesCount.textContent = `${book.totalCopies} ấn bản`;

    const copiesBody = document.getElementById("copiesTableBody");
    if (copiesBody) {
      copiesBody.innerHTML = book.copies.map((c, i) => {
        const stt = String(i + 1).padStart(2, "0");
        let statusBadge = "";
        let actionBtn = "";

        if (c.status === "AVAILABLE") {
          statusBadge = `<span class="status-badge-avail">● ${c.statusText}</span>`;
          if (c.action === "ONSITE") {
            actionBtn = `<button type="button" class="btn-copy-action btn-copy-onsite" onclick="alert('Đã đăng ký đọc bản sao ${c.barcode} tại chỗ!')">Đọc tại chỗ</button>`;
          } else {
            actionBtn = `<button type="button" class="btn-copy-action btn-copy-borrow" onclick="addToCartWithAnimation(event, '${c.barcode}')">Mượn</button>`;
          }
        } else {
          statusBadge = `
            <div class="status-badge-borrowed">
              <span>${c.statusText}</span>
              <small>Hạn trả: ${c.dueDate || '28/10/2026'}</small>
            </div>
          `;
          actionBtn = `<button type="button" class="btn-copy-action btn-copy-reserve" onclick="alert('Đã xếp bạn vào hàng đợi đặt trước bản sao ${c.barcode}!')">Đặt trước</button>`;
        }

        return `
          <tr>
            <td class="stt-cell">${stt}</td>
            <td><span class="barcode-badge">${c.barcode}</span></td>
            <td>
              <div class="location-cell">
                <span>📍</span>
                <span>${c.location}</span>
              </div>
            </td>
            <td>${c.type}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right;">${actionBtn}</td>
          </tr>
        `;
      }).join("");
    }

    // 12. Danh mục tài liệu liên quan (Hiển thị các sách còn lại)
    renderRelatedBooks();
  }

  // Render các sách còn lại trong danh mục liên quan
  function renderRelatedBooks() {
    const grid = document.getElementById("relatedBooksGrid");
    if (!grid) return;

    const otherKeys = Object.keys(BOOKS_CATALOG).filter((k) => k !== currentBookKey);

    grid.innerHTML = otherKeys.map((key) => {
      const b = BOOKS_CATALOG[key];
      return `
        <div class="related-card">
          <div class="related-cover-box" style="background: ${b.cover.bg}; color:#fff; display:flex; align-items:center; justify-content:center; text-align:center; padding:6px; font-size:10px; font-weight:700;">
            ${b.cover.title.replace('<br>', ' ')}
          </div>
          <div class="related-info">
            <span class="related-ddc">${b.ddc}</span>
            <div class="related-book-title" title="${b.title}">${b.title}</div>
            <div class="related-author">${b.authors}</div>
            <div class="related-bottom-row">
              <span class="related-copies-badge">Còn ${b.availableCopies} cuốn</span>
              <a href="javascript:void(0)" onclick="switchBook('${key}')" class="related-link" title="Xem chi tiết cuốn ${b.title}">
                Chi tiết →
              </a>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // 3. HIỆU ỨNG BAY VÀO GIỎ HÀNG (FLYING ANIMATION)
  window.addToCartWithAnimation = function (e, barcode = null) {
    let user = typeof auth !== "undefined" ? auth.getUser() : null;
    if (!user) {
      try {
        const stored = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
        if (stored) user = JSON.parse(stored);
      } catch {}
    }
    if (!user) {
      const overlay = document.getElementById("authGuardOverlay");
      if (overlay) overlay.style.display = "flex";
      return;
    }

    const btn = e.currentTarget;
    const cartIcon = document.getElementById("headerCartBtn");
    const bookTitle = BOOK_DATA.title;

    // Lấy tọa độ nút bấm và icon giỏ hàng
    const btnRect = btn.getBoundingClientRect();
    const cartRect = cartIcon ? cartIcon.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20 };

    // Tạo phần tử bay (clone)
    const flyingEl = document.createElement("div");
    flyingEl.className = "flying-book-clone";
    flyingEl.innerHTML = `<div style="font-size: 26px;">📖</div>`;

    // Vị trí xuất phát từ nút vừa bấm
    flyingEl.style.left = `${btnRect.left + btnRect.width / 2 - 30}px`;
    flyingEl.style.top = `${btnRect.top + btnRect.height / 2 - 40}px`;
    flyingEl.style.transform = "scale(1)";
    flyingEl.style.opacity = "1";

    document.body.appendChild(flyingEl);

    // Kích hoạt animation bay lên icon giỏ hàng
    requestAnimationFrame(() => {
      flyingEl.style.left = `${cartRect.left + 5}px`;
      flyingEl.style.top = `${cartRect.top + 5}px`;
      flyingEl.style.transform = "scale(0.2) rotate(360deg)";
      flyingEl.style.opacity = "0.7";
    });

    // Sau khi bay tới đích:
    setTimeout(() => {
      flyingEl.remove();

      // Rung nảy giỏ hàng
      if (cartIcon) {
        cartIcon.classList.remove("cart-bounce");
        void cartIcon.offsetWidth; // trigger reflow
        cartIcon.classList.add("cart-bounce");
      }

      // Thêm vào giỏ
      const cart = getCart();
      const existing = cart.find((item) => item.isbn === BOOK_DATA.isbn);
      if (!existing) {
        cart.push({
          id: Date.now(),
          isbn: BOOK_DATA.isbn,
          title: BOOK_DATA.title,
          author: BOOK_DATA.authors,
          barcode: barcode || (BOOK_DATA.copies[0] ? BOOK_DATA.copies[0].barcode : "BS-001"),
          location: BOOK_DATA.shelfLocation
        });
        saveCart(cart);
      } else {
        updateCartBadge();
      }

      // Đổi trạng thái nút chính nếu vừa bấm nút chính
      const mainBtn = document.getElementById("btnMainAddCart");
      if (mainBtn && (btn === mainBtn || !barcode)) {
        mainBtn.classList.add("added");
        mainBtn.innerHTML = `<span>✓</span><span>Đã thêm vào giỏ mượn</span>`;
        setTimeout(() => {
          mainBtn.classList.remove("added");
          mainBtn.innerHTML = `<span style="font-size: 18px;">🛒</span><span>Thêm vào giỏ mượn</span>`;
        }, 3000);
      }

      // Thông báo Toast
      showToast(`✓ Đã thêm "${bookTitle}" vào giỏ mượn thành công!`);
    }, 750);
  };

  // 4. HIỂN THỊ TOAST
  function showToast(message) {
    const existing = document.querySelector(".custom-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "custom-toast";
    toast.innerHTML = `
      <span style="font-size: 18px;">🛒</span>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  // 5. CHUYỂN TAB NỘI DUNG
  window.switchDetailTab = function (tabName, btn) {
    document.querySelectorAll(".tab-nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane-content").forEach((p) => p.classList.remove("active"));

    if (btn) btn.classList.add("active");
    const pane = document.getElementById(`tab-pane-${tabName}`);
    if (pane) pane.classList.add("active");
  };

  // 6. LỌC BẢNG BẢN SAO
  window.handleCopiesFilter = function (select) {
    const val = select.value;
    const rows = document.querySelectorAll(".copies-table tbody tr");
    rows.forEach((row) => {
      if (!val || val === "all") {
        row.style.display = "";
      } else {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(val.toLowerCase()) ? "" : "none";
      }
    });
  };

  // KHỞI CHẠY KHI TẢI TRANG
  document.addEventListener("DOMContentLoaded", () => {
    // 1. Kiểm tra xác thực
    checkAuth();

    // 2. Đọc tham số URL để chọn sách (ví dụ: book_detail.html?book=kientruc)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramKey = urlParams.get("book") || urlParams.get("isbn") || urlParams.get("id");
      if (paramKey) {
        if (BOOKS_CATALOG[paramKey]) {
          currentBookKey = paramKey;
          BOOK_DATA = BOOKS_CATALOG[paramKey];
        } else {
          // Tìm theo ISBN
          const found = Object.keys(BOOKS_CATALOG).find((k) => BOOKS_CATALOG[k].isbn === paramKey);
          if (found) {
            currentBookKey = found;
            BOOK_DATA = BOOKS_CATALOG[found];
          }
        }
      }
    } catch {}

    // 3. Render sách hiện tại
    renderCurrentBook();

    // 4. Cập nhật số lượng giỏ hàng
    updateCartBadge();

    // 5. Hiệu ứng header cuộn
    const headerEl = document.getElementById("app-header");
    window.addEventListener("scroll", () => {
      if (headerEl) {
        if (window.scrollY > 20) {
          headerEl.classList.add("scrolled");
        } else {
          headerEl.classList.remove("scrolled");
        }
      }
    });
  });

})();
