// Layout chung: Render Header và Footer cho toàn bộ ứng dụng
// Yêu cầu:
// 1. Tất cả các ô trên header (kể cả "Trang chủ") lúc đầu ĐỀU LÀ CHỮ ĐEN, nền trong suốt.
// 2. Chỉ khi di chuột vào (:hover) hoặc khi bấm (:active) thì chữ mới đổi thành TRẮNG, nền thành XANH và ô di chuyển lên trên.
// 3. Header cố định khi cuộn trang (Sticky Header).
// 4. Góc phải là nút Đăng nhập.

const MENU = [
  { href: "pages/home.html", label: "Trang chủ" },
  { href: "pages/search.html", label: "Tra cứu sách" },
  { href: "#loans", label: "Phiếu mượn của tôi" },
  { href: "#admin", label: "Quản trị thư viện" },
];

function renderLayout() {
  const root = document.body.dataset.root || "./";

  // Ban đầu TẤT CẢ các ô menu (kể cả Trang chủ) lúc đầu ĐỀU LÀ CHỮ ĐEN, KHÔNG có nền xanh
  // Chỉ khi di chuột vào (:hover) hoặc khi bấm (:active hoặc click) mới đổi thành chữ trắng, ô thành xanh và ô di chuyển lên
  const links = MENU.map((item) => {
    return `
      <a href="${root}${item.href}" 
         class="nav-item" 
         onclick="handleNavClick(event, this)">
        ${item.label}
      </a>
    `;
  }).join("");

  // Render Header
  const header = document.getElementById("app-header");
  if (header) {
    header.innerHTML = `
      <div class="container header-inner">
        <!-- Logo thương hiệu KS25 Library -->
        <a href="${root}pages/home.html" class="brand">
          <div class="brand-icon">KS</div>
          <div class="brand-text">
            <span class="brand-title">KS25 Library</span>
            <span class="brand-subtitle">Hệ thống thư viện số</span>
          </div>
        </a>

        <!-- Menu điều hướng: Ban đầu mọi ô đều chữ đen -->
        <nav class="nav" id="main-nav">
          ${links}
        </nav>

        <!-- Thao tác bên phải: Ô Đăng Nhập theo đúng yêu cầu -->
        <div class="header-actions">
          <button class="btn-login" id="btn-login" onclick="handleLoginClick()">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Đăng nhập</span>
          </button>
        </div>
      </div>
    `;
  }

  // Render Footer
  const footer = document.getElementById("app-footer");
  if (footer) {
    footer.innerHTML = `
      <div class="container footer-inner">
        <div>© ${new Date().getFullYear()} Thư viện số KS25. Bảo lưu mọi quyền.</div>
        <div class="footer-links">
          <a href="javascript:void(0)" onclick="alert('Chức năng trợ giúp trực tuyến 24/7')">Trung tâm trợ giúp</a>
          <a href="javascript:void(0)" onclick="alert('Quy định mượn trả: 14 ngày/lượt, tối đa 5 cuốn/thẻ')">Quy định mượn trả</a>
          <a href="javascript:void(0)" onclick="alert('Hotline hỗ trợ sinh viên: 024-3888-KS25')">Hỗ trợ sinh viên</a>
        </div>
      </div>
    `;
  }

  // Lắng nghe cuộn trang để đổ bóng header (Sticky Header)
  window.addEventListener("scroll", () => {
    if (header) {
      if (window.scrollY > 20) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }
  });
}

// Xử lý sự kiện khi bấm vào menu:
// Đổi chữ thành trắng, màu nền ô thành xanh và ô đó di chuyển lên
function handleNavClick(e, element) {
  const allNavItems = document.querySelectorAll(".nav-item");
  allNavItems.forEach((item) => item.classList.remove("active"));
  element.classList.add("active");
}

// Xử lý bấm Đăng nhập
function handleLoginClick() {
  const studentId = prompt("Nhập mã sinh viên hoặc mã thẻ thư viện (vd: LC-0082):", "LC-0082");
  if (studentId) {
    const btn = document.getElementById("btn-login");
    if (btn) {
      btn.innerHTML = `
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#15803D;"></span>
        <span>${studentId}</span>
      `;
      btn.style.borderColor = "#15803D";
      btn.style.color = "#15803D";
    }
    alert(`Xin chào bạn! Đã đăng nhập thành công vào thẻ thư viện ${studentId}.`);
  }
}

renderLayout();
