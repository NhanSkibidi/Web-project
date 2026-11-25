// ==============================================================================
// KS25 Library — Khung giao diện dùng chung (Layout) & Chặn trang theo Role
// ==============================================================================
// Cách cấu hình trên thẻ <body> của mỗi trang HTML:
//   1. Trang Độc giả / Công khai (dùng Header ngang + Footer):
//      <body data-root="./"> hoặc <body data-root="../" data-layout="reader">
//
//   2. Trang Thủ thư & Admin (dùng Sidebar trái + Header quản trị):
//      <body data-root="../" data-layout="staff" data-roles="ADMIN,LIBRARIAN" data-title="Quản lý mượn trả">
//
//   3. Trang chỉ dành riêng cho Admin:
//      <body data-root="../" data-layout="staff" data-roles="ADMIN" data-title="Quản trị tài khoản">
//
//   4. Trang Độc giả bắt buộc đăng nhập:
//      <body data-root="../" data-layout="reader" data-roles="READER">
// ==============================================================================

// Danh sách menu Sidebar cho Admin & Thủ thư (Cả nhóm thêm trang mới vào đây)
const STAFF_SIDEBAR_GROUPS = [
  {
    group: "Quầy Thủ Thư",
    items: [
      {
        href: "pages/staff-dashboard.html",
        label: "Bàn làm việc chung",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
      },
      {
        href: "pages/returns.html",
        label: "Tiếp nhận trả sách",
        badge: "Scan",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>`,
      },
      {
        href: "pages/borrow_on_site.html",
        label: "Mượn sách tại quầy",
        badge: "Quầy",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><line x1="12" y1="7" x2="12" y2="13"></line><line x1="9" y1="10" x2="15" y2="10"></line></svg>`,
      },
      {
        href: "pages/loan_management.html",
        label: "Duyệt mượn Online",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
      },
    ],
  },
  {
    group: "Kho Sách & Bản Sao",
    items: [
      {
        href: "pages/books.html",
        label: "Danh mục đầu sách & Bản sao",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
      },
      {
        href: "pages/taxonomy.html",
        label: "Thể loại, Tác giả, NXB",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"></path></svg>`,
      },
    ],
  },
  {
    group: "Độc Giả & Vi Phạm",
    items: [
      {
        href: "pages/readers.html",
        label: "Độc giả & Thẻ thư viện",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
      },
      {
        href: "pages/fines.html",
        label: "Xử lý tiền phạt",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
      },
    ],
  },
  {
    group: "Quản Trị Hệ Thống",
    items: [
      {
        href: "pages/admin-users.html",
        label: "Nhân sự & Phân quyền",
        badge: "ADMIN",
        roles: ["ADMIN"],
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
      },
    ],
  },
];

const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  LIBRARIAN: "Thủ thư",
  READER: "Độc giả",
};

function getRootPrefix() {
  return document.body.dataset.root || "./";
}

function getSafeText(val) {
  if (typeof escapeHtml === "function") return escapeHtml(val);
  const d = document.createElement("div");
  d.textContent = val ?? "";
  return d.innerHTML;
}

// ==============================================================================
// 1. CHẶN TRANG THEO ROLE (PAGE ACCESS GUARD)
// ==============================================================================
function checkPageAccess() {
  const rolesAttr = document.body.dataset.roles;
  if (!rolesAttr || !rolesAttr.trim()) {
    return true; // Trang công khai, không giới hạn role
  }

  const allowedRoles = rolesAttr
    .split(",")
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  const root = getRootPrefix();
  const user = typeof auth !== "undefined" ? auth.getUser() : null;
  const token = typeof auth !== "undefined" ? auth.getToken() : null;
  const mainEl = document.querySelector("main") || document.body;

  // Trường hợp 1: Chưa đăng nhập (401)
  if (!token || !user) {
    try {
      sessionStorage.setItem("redirect_after_login", window.location.href);
    } catch {
      // ignore
    }

    mainEl.innerHTML = `
      <div class="guard-wrap">
        <div class="guard-card">
          <div class="guard-icon guard-icon-401">🔒</div>
          <div class="guard-code">HTTP 401 · UNAUTHORIZED</div>
          <h2 class="guard-title">Yêu cầu đăng nhập</h2>
          <p class="guard-desc">
            Trang này yêu cầu xác thực tài khoản trước khi truy cập.
            Vui lòng đăng nhập để tiếp tục làm việc.
          </p>
          <div class="guard-meta">
            <div class="guard-meta-row">
              <span class="muted">Quyền yêu cầu:</span>
              <span class="code-mono">${getSafeText(allowedRoles.join(" / "))}</span>
            </div>
            <div class="guard-meta-row">
              <span class="muted">Trạng thái hiện tại:</span>
              <span class="badge badge-reserved">Chưa đăng nhập</span>
            </div>
          </div>
          <div class="guard-actions">
            <a href="${root}pages/login.html#login" class="btn btn-primary">Đăng nhập ngay →</a>
            <a href="${root}pages/home.html" class="btn">Về Trang chủ</a>
          </div>
        </div>
      </div>
    `;
    return false;
  }

  // Trường hợp 2: Đã đăng nhập nhưng không đúng Role (403)
  if (!allowedRoles.includes(user.role)) {
    const fallbackUrl = auth.getHomeUrlByRole(user.role, root);
    const allowedNames = allowedRoles.map((r) => ROLE_LABELS[r] || r).join(", ");

    mainEl.innerHTML = `
      <div class="guard-wrap">
        <div class="guard-card">
          <div class="guard-icon guard-icon-403">⛔</div>
          <div class="guard-code">HTTP 403 · FORBIDDEN</div>
          <h2 class="guard-title">Không đủ quyền truy cập</h2>
          <p class="guard-desc">
            Tài khoản <strong>${getSafeText(user.full_name || user.email)}</strong>
            không thuộc nhóm vai trò được phép mở trang này.
          </p>
          <div class="guard-meta">
            <div class="guard-meta-row">
              <span class="muted">Vai trò của bạn:</span>
              <span class="badge badge-borrowed">${getSafeText(ROLE_LABELS[user.role] || user.role)} (${getSafeText(user.role)})</span>
            </div>
            <div class="guard-meta-row">
              <span class="muted">Vai trò trang yêu cầu:</span>
              <span class="code-mono">${getSafeText(allowedNames)}</span>
            </div>
          </div>
          <div class="guard-actions">
            <a href="${fallbackUrl}" class="btn btn-primary">Về trang dành cho ${getSafeText(ROLE_LABELS[user.role] || "bạn")} →</a>
            <a href="${root}pages/login.html#login" class="btn" id="guard-switch-acc-btn">Đổi tài khoản khác</a>
          </div>
        </div>
      </div>
    `;

    document.getElementById("guard-switch-acc-btn")?.addEventListener("click", () => {
      auth.clearSession();
    });

    return false;
  }

  return true;
}

// Cho phép các file JS riêng của từng trang gọi kiểm tra quyền bằng code nếu muốn
window.requirePageRoles = function (roles = []) {
  document.body.dataset.roles = Array.isArray(roles) ? roles.join(",") : String(roles);
  return checkPageAccess();
};

// ==============================================================================
// 2. RENDER HEADER & FOOTER CHO ĐỘC GIẢ (READER LAYOUT)
// ==============================================================================
function renderReaderLayout() {
  const root = getRootPrefix();
  const currentPath = window.location.pathname;
  const user = typeof auth !== "undefined" ? auth.getUser() : null;
  const token = typeof auth !== "undefined" ? auth.getToken() : null;
  const isLoggedIn = Boolean(token && user);
  const card = typeof auth !== "undefined" ? auth.getCard() : null;

  const headerEl = document.getElementById("app-header");
  const footerEl = document.getElementById("app-footer");

  if (headerEl) {
    const isHome = currentPath.endsWith("/home.html") || currentPath.endsWith("/") || currentPath === "";
    const isSearch = currentPath.endsWith("/search.html") || currentPath.endsWith("/books.html");
    const isLoanSlip = currentPath.endsWith("/loan_slip.html");
    const isReservations = currentPath.endsWith("/reservations.html");
    const isFines = currentPath.endsWith("/fines.html");

    // Nếu là Độc giả đang đăng nhập -> hiện lối vào Tiền phạt cá nhân (Task T3CFF2C)
    const readerFinesLinkHtml =
      isLoggedIn && user.role === "READER"
        ? `<a href="${root}pages/fines.html" class="topbar-nav-link ${isFines ? "active" : ""}">Tiền phạt</a>`
        : "";

    const readerAuthLinksHtml = isLoggedIn
      ? `<a href="${root}pages/loan_slip.html" class="topbar-nav-link ${isLoanSlip ? "active" : ""}">Phiếu mượn</a>
         <a href="${root}pages/reservations.html" class="topbar-nav-link ${isReservations ? "active" : ""}">Đặt trước</a>`
      : "";

    const notifHtml = isLoggedIn
      ? `
      <div class="notif-dropdown-container" id="notifDropdownContainer">
        <button type="button" class="topbar-icon-btn notif-btn" id="notifBellBtn" aria-label="Xem thông báo nhắc trả sách" aria-expanded="false" title="Thông báo nhắc trả sách">
          <span class="material-symbols-outlined">notifications</span>
          <span class="notif-badge" id="notifBadge" style="display: none;">0</span>
        </button>
        <div class="notif-dropdown-menu" id="notifDropdownMenu" hidden>
          <div class="notif-header">
            <div class="notif-title-group">
              <span class="notif-title">Thông báo mượn trả</span>
              <span class="notif-badge-pill">0 mới</span>
            </div>
            <button type="button" class="notif-mark-read" id="notifMarkReadBtn">Đã đọc tất cả</button>
          </div>
          <div class="notif-list">
            <div style="padding: 24px 16px; text-align: center; color: #64748b; font-size: 13px;">
              Đang tải thông báo...
            </div>
          </div>
          <div class="notif-footer">
            <a href="${root}pages/loan_slip.html" class="notif-view-all">Xem tất cả phiếu mượn &amp; Lịch sử →</a>
          </div>
        </div>
      </div>
    `
      : "";

    const basketHtml = isLoggedIn
      ? `
        <a href="${root}pages/loan_basket.html" class="topbar-icon-btn" title="Giỏ mượn sách" id="loanBasketBtn">
          <span class="material-symbols-outlined">shopping_bag</span>
          <span class="cart-badge-count" id="loanBasketBadge" style="display: none;">0</span>
        </a>
      `
      : "";

    const role = isLoggedIn ? String(user.role || "").toUpperCase() : "";
    const roleText = role === "ADMIN" ? "Quản trị viên" : role === "LIBRARIAN" ? "Thủ thư" : "Độc giả";

    let dropdownMenuHtml = "";
    let avatarHtml = "";
    let userNameText = "Tài khoản";
    let userRoleText = "Chưa đăng nhập";

    if (isLoggedIn) {
      const fullName = user.full_name || user.name || user.email || "Độc giả";
      const initial = (fullName.trim().charAt(0) || "U").toUpperCase();
      avatarHtml = getSafeText(initial);
      userNameText = getSafeText(fullName);
      userRoleText = getSafeText(roleText);

      dropdownMenuHtml = `
        <a href="${root}pages/profile.html" class="dropdown-item" id="userProfileLink">
          <span class="material-symbols-outlined">account_circle</span>
          <span>Thông tin cá nhân</span>
        </a>
        <div class="dropdown-divider"></div>
        <button type="button" class="dropdown-item text-danger" id="logoutMenuBtn">
          <span class="material-symbols-outlined">logout</span>
          <span>Đăng xuất</span>
        </button>
      `;
    } else {
      avatarHtml = `<span class="material-symbols-outlined" style="font-size:18px;">person</span>`;
      dropdownMenuHtml = `
        <a href="${root}pages/login.html#login" class="dropdown-item">
          <span class="material-symbols-outlined">login</span>
          <span>Đăng nhập</span>
        </a>
        <a href="${root}pages/login.html#register" class="dropdown-item">
          <span class="material-symbols-outlined">person_add</span>
          <span>Đăng ký thẻ mới</span>
        </a>
      `;
    }

    const userAreaHtml = `
      <div class="topbar-right">
        ${notifHtml}
        ${basketHtml}
        <div class="user-dropdown-container" id="userDropdownContainer">
          <button type="button" class="librarian-profile user-profile-btn" id="userProfileBtn" aria-expanded="false" aria-haspopup="true">
            <div class="librarian-avatar" id="userAvatar">${avatarHtml}</div>
            <div class="librarian-info">
              <span class="librarian-name" id="userName">${userNameText}</span>
              <span class="librarian-role" id="userRole">${userRoleText}</span>
            </div>
            <span class="material-symbols-outlined" style="font-size: 16px; margin-left: 2px;">expand_more</span>
          </button>
          <div class="user-dropdown-menu" id="userDropdownMenu">
            ${dropdownMenuHtml}
          </div>
        </div>
      </div>
    `;

    headerEl.className = "librarian-topbar reader-topbar";
    headerEl.innerHTML = `
      <div class="topbar-left">
        <a href="${root}pages/home.html" class="brand-badge" title="UniLib - Thư viện số KS25">
          <div class="brand-icon">
            <span class="material-symbols-outlined">local_library</span>
          </div>
          <div class="brand-text">
            <span class="brand-name">UniLib</span>
            <span class="brand-sub">Thư viện số KS25</span>
          </div>
        </a>
        <button type="button" class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Mở menu điều hướng">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <nav class="topbar-nav" id="navMenu">
          <a href="${root}pages/home.html" class="topbar-nav-link ${isHome ? "active" : ""}">Trang chủ</a>
          <a href="${root}pages/search.html" class="topbar-nav-link ${isSearch ? "active" : ""}">Tra cứu sách</a>
          ${readerAuthLinksHtml}
          ${readerFinesLinkHtml}
        </nav>
      </div>
      ${userAreaHtml}
    `;

    bindReaderTopbarActions(root);

    // Chuông thông báo được quản lý tập trung bởi notifications.js (tránh gắn 2 lần gây double-toggle)
    if (window.unilibNotifications && typeof window.unilibNotifications.init === "function") {
      window.unilibNotifications.init();
    }
    if (typeof window.syncCartBadges === "function") {
      window.syncCartBadges();
    }
  }

  if (footerEl) {
    footerEl.className = "app-footer";
    footerEl.innerHTML = `
      <div class="footer-left">
        © 2026 KS25 Library System - Cổng Tra Cứu &amp; Độc Giả Sinh Viên. Bảo lưu mọi quyền.
      </div>
      <div class="footer-right">
        <a href="#" class="footer-link">Trung tâm trợ giúp</a>
        <span class="footer-dot">•</span>
        <a href="#" class="footer-link">Quy định mượn trả</a>
        <span class="footer-dot">•</span>
        <a href="#" class="footer-link">Hỗ trợ sinh viên</a>
      </div>
    `;
  }
}

function ensureConfirmModal() {
  if (document.getElementById("confirm-modal")) return;
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.id = "confirm-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.setAttribute("role", "dialog");
  modal.innerHTML = `
    <div class="modal-dialog modal-confirm">
      <div class="confirm-content-wrap">
        <div class="confirm-icon-circle icon-red" id="confirm-icon-box">
          <span class="material-symbols-outlined" id="confirm-icon">warning</span>
        </div>
        <h3 class="confirm-title font-headline" id="confirm-title">Xác nhận thao tác</h3>
        <p class="confirm-message" id="confirm-message">Bạn có chắc chắn muốn thực hiện thao tác này?</p>
        <div class="confirm-actions-row">
          <button type="button" class="btn-confirm-cancel" id="btn-confirm-cancel">Hủy</button>
          <button type="button" class="btn-confirm-proceed btn-danger" id="btn-confirm-proceed">Xác nhận</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

let activeLayoutConfirmCallback = null;

function openLayoutConfirm(options) {
  ensureConfirmModal();
  const modal = document.getElementById("confirm-modal");
  const titleEl = document.getElementById("confirm-title");
  const msgEl = document.getElementById("confirm-message");
  const iconBox = document.getElementById("confirm-icon-box");
  const iconEl = document.getElementById("confirm-icon");
  const btnProceed = document.getElementById("btn-confirm-proceed");
  const btnCancel = document.getElementById("btn-confirm-cancel");
  if (!modal) return;

  if (titleEl) titleEl.textContent = options.title || "Xác nhận";
  if (msgEl) msgEl.textContent = options.message || "Bạn có chắc chắn muốn thực hiện thao tác này?";
  if (iconBox) iconBox.className = "confirm-icon-circle";
  if (btnProceed) btnProceed.className = "btn-confirm-proceed";

  if (options.type === "red") {
    if (iconBox) iconBox.classList.add("icon-red");
    if (btnProceed) btnProceed.classList.add("btn-danger");
    if (iconEl) iconEl.textContent = "warning";
  } else if (options.type === "green") {
    if (iconBox) iconBox.classList.add("icon-green");
    if (iconEl) iconEl.textContent = "check_circle";
  } else {
    if (iconBox) iconBox.classList.add("icon-blue");
    if (iconEl) iconEl.textContent = "help_outline";
  }

  if (btnProceed) btnProceed.textContent = options.confirmText || "Xác nhận";
  if (btnCancel) btnCancel.textContent = options.cancelText || "Hủy";

  activeLayoutConfirmCallback = options.onConfirm || null;
  modal.style.display = "";
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("active");
}

function closeLayoutConfirm() {
  const modal = document.getElementById("confirm-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }
  activeLayoutConfirmCallback = null;
}

function bindReaderTopbarActions(root) {
  const userProfileBtn = document.getElementById("userProfileBtn");
  const userDropdownMenu = document.getElementById("userDropdownMenu");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navMenu = document.getElementById("navMenu");

  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      navMenu.classList.toggle("show");
    });
  }

  if (userProfileBtn && userDropdownMenu) {
    userProfileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdownMenu.classList.toggle("show");
      const isShown = userDropdownMenu.classList.contains("show");
      userProfileBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
    });
  }

  if (!window.__unilibReaderTopbarBound) {
    window.__unilibReaderTopbarBound = true;

    document.addEventListener("click", (e) => {
      const btn = document.getElementById("userProfileBtn");
      const menu = document.getElementById("userDropdownMenu");
      const nav = document.getElementById("navMenu");
      const toggle = document.getElementById("mobileMenuToggle");

      if (menu && menu.classList.contains("show") && !e.target.closest("#userDropdownContainer")) {
        menu.classList.remove("show");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
      if (nav && nav.classList.contains("show") && !e.target.closest("#navMenu") && !e.target.closest("#mobileMenuToggle")) {
        nav.classList.remove("show");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }

      if (e.target.closest("#logoutMenuBtn")) {
        e.preventDefault();
        if (menu) menu.classList.remove("show");
        if (btn) btn.setAttribute("aria-expanded", "false");
        openLayoutConfirm({
          title: "Xác nhận đăng xuất?",
          message: "Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại không?",
          type: "red",
          confirmText: "Đăng xuất",
          cancelText: "Hủy",
          onConfirm: () => {
            if (typeof auth !== "undefined" && typeof auth.clearSession === "function") {
              auth.clearSession();
            } else {
              localStorage.removeItem("access_token");
              localStorage.removeItem("token");
              localStorage.removeItem("user_info");
              localStorage.removeItem("library_card");
              sessionStorage.removeItem("access_token");
              sessionStorage.removeItem("user_info");
            }
            window.location.href = `${root}pages/login.html#login`;
          },
        });
      }

      if (e.target.closest("#btn-confirm-cancel") || e.target.id === "confirm-modal") {
        closeLayoutConfirm();
      } else if (e.target.closest("#btn-confirm-proceed")) {
        const cb = activeLayoutConfirmCallback;
        closeLayoutConfirm();
        if (typeof cb === "function") cb();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const menu = document.getElementById("userDropdownMenu");
        const btn = document.getElementById("userProfileBtn");
        const nav = document.getElementById("navMenu");
        if (menu && menu.classList.contains("show")) {
          menu.classList.remove("show");
          if (btn) btn.setAttribute("aria-expanded", "false");
        }
        if (nav && nav.classList.contains("show")) {
          nav.classList.remove("show");
        }
        closeLayoutConfirm();
      }
    });
  }
}

// ==============================================================================
// 3. RENDER SIDEBAR + HEADER CHO ADMIN & THỦ THƯ (STAFF LAYOUT)
// ==============================================================================
function renderStaffLayout() {
  const root = getRootPrefix();
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;
  const user = typeof auth !== "undefined" ? auth.getUser() : null;
  const pageTitle = document.body.dataset.title || document.title.split("|")[0].trim() || "Bàn làm việc Thủ thư";

  document.body.classList.add("staff-layout-active");

  // Ẩn header/footer mặc định của reader nếu có
  const oldHeader = document.getElementById("app-header");
  const oldFooter = document.getElementById("app-footer");
  if (oldHeader) oldHeader.style.display = "none";
  if (oldFooter) oldFooter.style.display = "none";

  const mainEl = document.querySelector("main");
  if (!mainEl) return;

  // Render các nhóm menu trong Sidebar
  const sidebarGroupsHtml = STAFF_SIDEBAR_GROUPS.map((grp) => {
    const links = grp.items
      .filter((item) => !item.roles || (user && item.roles.includes(user.role)))
      .map((item) => {
        const isActive =
          currentPath.endsWith("/" + item.href) ||
          (item.href.includes("#") &&
            currentPath.endsWith("/" + item.href.split("#")[0]) &&
            currentHash === "#" + item.href.split("#")[1]);

        const badgeHtml = item.badge
          ? `<span class="sidebar-badge">${getSafeText(item.badge)}</span>`
          : "";

        return `
          <a href="${root}${item.href}" class="sidebar-link ${isActive ? "active" : ""}">
            <span class="sidebar-link-left">
              ${item.icon || ""}
              <span>${getSafeText(item.label)}</span>
            </span>
            ${badgeHtml}
          </a>
        `;
      })
      .join("");

    if (!links) return "";

    return `
      <div class="sidebar-group">
        <div class="sidebar-group-label">${getSafeText(grp.group)}</div>
        ${links}
      </div>
    `;
  }).join("");

  const userInitial = user ? (user.full_name || user.email || "U").charAt(0).toUpperCase() : "G";
  const userName = user ? user.full_name || user.email : "Chưa đăng nhập";
  const userRoleText = user ? `${ROLE_LABELS[user.role] || user.role} (${user.role})` : "Khách";

  // Tạo cấu trúc .staff-shell bọc quanh nội dung của <main>
  const shell = document.createElement("div");
  shell.className = "staff-shell";
  shell.innerHTML = `
    <aside id="staff-sidebar" class="staff-sidebar">
      <div class="sidebar-brand">
        <a href="${root}pages/staff-dashboard.html" class="sidebar-brand-link">
          <div class="sidebar-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div>
            <div class="sidebar-brand-title">KS25 Library</div>
            <span class="sidebar-brand-sub">Quầy Thủ thư & Quản trị</span>
          </div>
        </a>
      </div>

      <nav class="sidebar-nav">
        ${sidebarGroupsHtml}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user-card">
          <div class="sidebar-avatar">${getSafeText(userInitial)}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${getSafeText(userName)}</div>
            <div class="sidebar-user-role">${getSafeText(userRoleText)}</div>
          </div>
        </div>
        <div class="sidebar-actions">
          <button type="button" id="staff-logout-btn" class="sidebar-btn sidebar-btn-danger">Đăng xuất</button>
        </div>
      </div>
    </aside>

    <div class="staff-main">
      <header class="staff-topbar">
        <div class="topbar-left">
          <button type="button" id="mobile-sidebar-toggle" class="mobile-menu-btn" title="Mở/Đóng menu">☰</button>
          <div class="topbar-breadcrumb">
            <span>Hệ thống Thư viện</span>
            <span>/</span>
            <strong>${getSafeText(pageTitle)}</strong>
          </div>
        </div>

        <div class="topbar-right">
          <form id="topbar-quick-scan-form" class="quick-scan-box" title="Quét hoặc nhập mã bản sao sách để tra cứu nhanh">
            <span class="material-symbols-outlined" style="font-size:18px; color:var(--color-text-secondary,#718096);">search</span>
            <input id="topbar-copy-code-input" type="text" placeholder="Tra nhanh copy_code (VD: BC-...)" autocomplete="off">
          </form>
          ${user
      ? `<a href="${root}pages/profile.html" class="user-chip" title="Hồ sơ cá nhân & Đổi mật khẩu" style="text-decoration:none; color:inherit;">
                  <span>${getSafeText(user.full_name || user.email)}</span>
                  <span class="user-chip-role">${getSafeText(user.role)}</span>
                </a>`
      : `<a href="${root}pages/login.html" class="btn btn-primary btn-small">Đăng nhập</a>`
    }
        </div>
      </header>

      <div id="staff-content-slot" class="staff-content"></div>
    </div>
  `;

  // Chuyển <main> vào trong #staff-content-slot
  mainEl.classList.remove("container");
  mainEl.parentNode.insertBefore(shell, mainEl);
  shell.querySelector("#staff-content-slot").appendChild(mainEl);

  // Sự kiện nút mở Sidebar trên mobile
  document.getElementById("mobile-sidebar-toggle")?.addEventListener("click", () => {
    document.getElementById("staff-sidebar")?.classList.toggle("open");
  });

  // Sự kiện nút Đăng xuất ở Sidebar
  document.getElementById("staff-logout-btn")?.addEventListener("click", () => {
    auth.clearSession();
    window.location.href = `${root}pages/login.html#login`;
  });

  // Sự kiện quét nhanh copy_code trên Topbar
  document.getElementById("topbar-quick-scan-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const codeInput = document.getElementById("topbar-copy-code-input");
    const code = codeInput?.value.trim();
    if (!code) return;
    try {
      const copy = await api.get(`/book_copies/code/${encodeURIComponent(code)}`);
      if (typeof showToast === "function") {
        showToast(`Bản sao ${copy.copy_code} · ISBN: ${copy.book_isbn} · Trạng thái: ${copy.status} (${copy.shelf_location})`, "success");
      } else {
        alert(`Bản sao: ${copy.copy_code}\nISBN: ${copy.book_isbn}\nTrạng thái: ${copy.status}\nVị trí: ${copy.shelf_location}`);
      }
    } catch (err) {
      if (typeof showToast === "function") {
        showToast(err.message || `Không tìm thấy mã bản sao "${code}"`, "error");
      } else {
        alert(err.message || `Không tìm thấy mã bản sao "${code}"`);
      }
    }
  });
}

// ==============================================================================
// 4. KHỞI CHẠY LAYOUT & KIỂM TRA QUYỀN TRUY CẬP
// ==============================================================================
function initLayout() {
  if (typeof window.enforceStaffManagementBoundary === "function" && window.enforceStaffManagementBoundary()) {
    return;
  }

  document.documentElement.removeAttribute("data-theme");
  localStorage.removeItem("ks25_theme");

  const layoutMode = document.body.dataset.layout || "reader";

  // Render khung giao diện trước (Staff Sidebar hoặc Reader Header)
  if (layoutMode === "staff") {
    renderStaffLayout();
  } else {
    renderReaderLayout();
  }

  // Tự động kích hoạt chuông thông báo in-app (Task T3CFF48)
  if (window.unilibNotifications && window.unilibNotifications.load) {
    window.unilibNotifications.load();
  } else if (!document.querySelector('script[src*="notifications.js"]')) {
    const s = document.createElement("script");
    s.src = `${document.body.dataset.root || ""}js/notifications.js?v=2.0`;
    s.defer = true;
    document.body.appendChild(s);
  }

  // Kiểm tra quyền truy cập trang theo data-roles
  const allowed = checkPageAccess();
  if (!allowed) return;

  // Đồng bộ ngầm thông tin user/thẻ từ backend nếu có token
  if (typeof auth !== "undefined" && auth.getToken()) {
    auth.syncSession().then((freshUser) => {
      if (!freshUser && document.body.dataset.roles) {
        // Token hết hạn hoặc tài khoản bị khoá giữa chừng -> chặn lại ngay
        checkPageAccess();
      }
    });
  }
}

initLayout();
