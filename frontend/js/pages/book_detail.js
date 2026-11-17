/**
 * ==============================================================================
 * KS25 Library - Logic Trang Chi Tiết Sách (book_detail.js)
 * Chức năng:
 *  1. Kiểm tra xác thực (Bắt buộc đăng nhập để xem chi tiết & mượn sách).
 *  2. Header tích hợp Avatar người dùng và Giỏ hàng mượn sách.
 *  3. Hiệu ứng bay sách vào icon giỏ hàng khi nhấn "Thêm vào giỏ mượn".
 *  4. Quản lý danh mục bản sao vật lý & bộ lọc kho.
 *  5. Chuyển đổi Tabs nội dung linh hoạt.
 * ==============================================================================
 */

(function () {
  "use strict";

  // Dữ liệu sách chi tiết chuẩn theo ảnh thiết kế
  const BOOK_DATA = {
    isbn: "978-604-8-31298-1",
    ddc: "005.1 D978",
    title: "Cấu trúc Dữ liệu & Giải thuật nâng cao",
    authors: "TS. Lê Hoàng Nam",
    coAuthors: "ThS. Trần Minh Quang",
    publisher: "NXB Giáo Dục Việt Nam (2023)",
    edition: "Lần 3 (Tái bản có chỉnh lý)",
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
    coverUrl: "../assets/images/clean-code.png", // fallback or stylized cover
    copies: [
      { id: 1, barcode: "BS-IT-001", location: "Tầng 1 – Kệ A3 – Ngăn 02", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
      { id: 2, barcode: "BS-IT-002", location: "Tầng 1 – Kệ A3 – Ngăn 02", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" },
      { id: 3, barcode: "BS-IT-003", location: "Tầng 2 – Phòng Nghiên cứu", type: "Đọc tại chỗ", status: "AVAILABLE", statusText: "Khả dụng", action: "ONSITE" },
      { id: 4, barcode: "BS-IT-004", location: "Tầng 1 – Kệ A3 – Ngăn 02", type: "Mượn về nhà", status: "BORROWED", statusText: "Đang mượn", dueDate: "28/10/2026", action: "RESERVE" },
      { id: 5, barcode: "BS-IT-005", location: "Tầng 1 – Kệ A3 – Ngăn 02", type: "Mượn về nhà (14 ngày)", status: "AVAILABLE", statusText: "Khả dụng", action: "BORROW" }
    ]
  };

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
      // Kiểm tra trong sessionStorage hoặc localStorage
      try {
        const stored = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
        if (stored) user = JSON.parse(stored);
      } catch {}
    }

    const overlay = document.getElementById("authGuardOverlay");
    if (!user) {
      // Hiện màn hình khoá bảo vệ
      if (overlay) overlay.style.display = "flex";
      return false;
    } else {
      if (overlay) overlay.style.display = "none";
      // Hiển thị thông tin người dùng lên Header
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

  // 2. HIỆU ỨNG BAY VÀO GIỎ HÀNG (FLYING ANIMATION)
  window.addToCartWithAnimation = function (e, barcode = null) {
    const btn = e.currentTarget;
    const cartIcon = document.getElementById("headerCartBtn");
    const bookTitle = BOOK_DATA.title;

    // Lấy tọa độ nút bấm và icon giỏ hàng
    const btnRect = btn.getBoundingClientRect();
    const cartRect = cartIcon ? cartIcon.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20 };

    // Tạo phần tử bay (clone)
    const flyingEl = document.createElement("div");
    flyingEl.className = "flying-book-clone";
    flyingEl.innerHTML = `
      <div style="font-size: 26px;">📖</div>
    `;

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
      const badge = document.getElementById("headerCartBadge");
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
          barcode: barcode || "BS-IT-001",
          location: BOOK_DATA.shelfLocation,
          cover: BOOK_DATA.coverUrl
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

      // Thông báo Toast sang trọng
      showToast(`✓ Đã thêm "${bookTitle}" vào giỏ mượn thành công!`);
    }, 750);
  };

  // 3. HIỂN THỊ TOAST
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

  // 4. CHUYỂN TAB NỘI DUNG
  window.switchDetailTab = function (tabName, btn) {
    document.querySelectorAll(".tab-nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane-content").forEach((p) => p.classList.remove("active"));

    if (btn) btn.classList.add("active");
    const pane = document.getElementById(`tab-pane-${tabName}`);
    if (pane) pane.classList.add("active");
  };

  // 5. LỌC BẢNG BẢN SAO
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

    // 2. Cập nhật số lượng giỏ hàng
    updateCartBadge();

    // 3. Hiệu ứng header cuộn
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
