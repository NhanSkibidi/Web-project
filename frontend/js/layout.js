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

// Danh sách menu cho Cổng Độc giả (Header ngang)
const READER_MENU = [
  { href: "index.html", label: "Trang chủ & Tra cứu" },
  { href: "pages/items.html", label: "Items (CRUD mẫu)" },
  { href: "pages/auth.html", label: "Tài khoản & Thẻ" },
];

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
        href: "pages/staff-dashboard.html#returns",
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
        href: "pages/staff-dashboard.html#loans",
        label: "Duyệt mượn Online",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
      },
    ],
  },
  {
    group: "Kho Sách & Bản Sao",
    items: [
      {
        href: "pages/staff-dashboard.html#books",
        label: "Danh mục đầu sách",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
      },
      {
        href: "pages/staff-dashboard.html#copies",
        label: "Bản sao (copy_code)",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="7" y2="16"></line><line x1="11" y1="8" x2="11" y2="16"></line><line x1="15" y1="8" x2="15" y2="16"></line></svg>`,
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
      {
        href: "pages/items.html",
        label: "Items (CRUD mẫu)",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
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
  const card = typeof auth !== "undefined" ? auth.getCard() : null;

  const headerEl = document.getElementById("app-header");
  const footerEl = document.getElementById("app-footer");

  if (headerEl) {
    const isHome = currentPath.endsWith("/index.html") || currentPath.endsWith("/home.html") || currentPath.endsWith("/") || currentPath === "";
    const isSearch = currentPath.endsWith("/search.html") || currentPath.endsWith("/catalog.html") || currentPath.endsWith("/books.html");
    const isLoanSlip = currentPath.endsWith("/loan_slip.html");

    // Nếu là Admin hoặc Thủ thư đang ở trang độc giả -> hiện nút vào Bàn làm việc
    const staffShortcutHtml =
      user && (user.role === "ADMIN" || user.role === "LIBRARIAN")
        ? `<a href="${root}pages/staff-dashboard.html" class="topbar-nav-link" title="Bàn làm việc quản trị">⚡ Quản trị</a>`
        : "";

    const notifHtml = `
      <div class="notif-dropdown-container" id="notifDropdownContainer">
        <button type="button" class="topbar-icon-btn notif-btn" id="notifBellBtn" aria-label="Xem thông báo nhắc trả sách" aria-expanded="false" title="Thông báo nhắc trả sách">
          <span class="material-symbols-outlined">notifications</span>
          <span class="notif-badge" id="notifBadge">2</span>
        </button>
        <div class="notif-dropdown-menu" id="notifDropdownMenu" hidden>
          <div class="notif-header">
            <div class="notif-title-group">
              <span class="notif-title">Thông báo mượn trả</span>
              <span class="notif-badge-pill">2 mới</span>
            </div>
            <button type="button" class="notif-mark-read" id="notifMarkReadBtn">Đã đọc tất cả</button>
          </div>
          <div class="notif-list">
            <a href="${root}pages/loan_slip.html" class="notif-item is-unread is-overdue">
              <div class="notif-icon-box overdue">
                <span class="material-symbols-outlined">error</span>
              </div>
              <div class="notif-content">
                <div class="notif-item-title">
                  <span>Quá hạn trả: Cấu trúc Dữ liệu &amp; Giải thuật</span>
                  <span class="notif-dot"></span>
                </div>
                <p class="notif-item-desc">Phiếu <strong>#PM-2024-0082</strong> đã quá hạn 19 ngày. Tiền phạt dự kiến: <strong>38.000 đ</strong>. Vui lòng mang sách tới quầy để trả.</p>
                <span class="notif-time">10 phút trước • Quá hạn</span>
              </div>
            </a>
            <a href="${root}pages/loan_slip.html" class="notif-item is-unread is-due-soon">
              <div class="notif-icon-box due-soon">
                <span class="material-symbols-outlined">alarm</span>
              </div>
              <div class="notif-content">
                <div class="notif-item-title">
                  <span>Sắp đến hạn trả sách (còn 2 ngày)</span>
                  <span class="notif-dot"></span>
                </div>
                <p class="notif-item-desc">Ấn phẩm <strong>Hệ thống Cơ sở Dữ liệu hiện đại</strong> đến hạn vào ngày <strong>28/10/2024</strong>. Bạn có thể gia hạn online hoặc trả tại quầy.</p>
                <span class="notif-time">2 giờ trước • Nhắc hạn</span>
              </div>
            </a>
          </div>
          <div class="notif-footer">
            <a href="${root}pages/loan_slip.html" class="notif-view-all">Xem tất cả phiếu mượn &amp; Lịch sử →</a>
          </div>
        </div>
      </div>
    `;

    let userAreaHtml = "";
    if (user) {
      const initial = (user.full_name || user.email || "U")[0].toUpperCase();
      userAreaHtml = `
        <div class="topbar-right">
          ${notifHtml}
          <a href="${root}pages/loan_basket.html" class="topbar-icon-btn" title="Giỏ mượn sách">
            <span class="material-symbols-outlined">shopping_bag</span>
            <span class="badge-dot"></span>
          </a>
          <div class="topbar-divider"></div>
          <a href="${root}pages/profile.html" class="librarian-profile" title="Hồ sơ cá nhân & Đổi mật khẩu" style="text-decoration:none; color:inherit;">
            <div class="librarian-avatar">${initial}</div>
            <div class="librarian-info">
              <span class="librarian-name">${getSafeText(user.full_name || user.email)}</span>
              <span class="librarian-role">${getSafeText(ROLE_LABELS[user.role] || user.role)}</span>
            </div>
          </a>
          <button type="button" id="header-logout-btn" class="topbar-icon-btn" title="Đăng xuất">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      `;
    } else {
      userAreaHtml = `
        <div class="topbar-right">
          ${notifHtml}
          <a href="${root}pages/loan_basket.html" class="topbar-icon-btn" title="Giỏ mượn sách">
            <span class="material-symbols-outlined">shopping_bag</span>
          </a>
          <div class="topbar-divider"></div>
          <a href="${root}pages/login.html#login" class="topbar-nav-link">Đăng nhập</a>
          <a href="${root}pages/login.html#register" class="topbar-nav-link active">Đăng ký thẻ</a>
        </div>
      `;
    }

    headerEl.className = "librarian-topbar reader-topbar";
    headerEl.innerHTML = `
      <div class="topbar-left">
        <a href="${root}index.html" class="brand-badge" title="UniLib - Thư viện số KS25">
          <div class="brand-icon">
            <span class="material-symbols-outlined">local_library</span>
          </div>
          <div class="brand-text">
            <span class="brand-name">UniLib</span>
            <span class="brand-sub">Thư viện số KS25</span>
          </div>
        </a>
        <nav class="topbar-nav">
          <a href="${root}index.html" class="topbar-nav-link ${isHome ? "active" : ""}">Trang chủ</a>
          <a href="${root}pages/search.html" class="topbar-nav-link ${isSearch ? "active" : ""}">Tra cứu sách</a>
          <a href="${root}pages/loan_slip.html" class="topbar-nav-link ${isLoanSlip ? "active" : ""}">Phiếu mượn</a>
          ${staffShortcutHtml}
        </nav>
      </div>
      ${userAreaHtml}
    `;

    document.getElementById("header-logout-btn")?.addEventListener("click", () => {
      auth.clearSession();
      window.location.href = `${root}pages/login.html#login`;
    });

    // Wire up in-app notification dropdown
    const bellBtn = document.getElementById("notifBellBtn");
    const notifMenu = document.getElementById("notifDropdownMenu");
    const markReadBtn = document.getElementById("notifMarkReadBtn");
    const notifBadge = document.getElementById("notifBadge");

    if (bellBtn && notifMenu) {
      bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = notifMenu.hasAttribute("hidden") || notifMenu.style.display === "none";
        if (isHidden) {
          notifMenu.removeAttribute("hidden");
          notifMenu.style.display = "block";
          bellBtn.setAttribute("aria-expanded", "true");
        } else {
          notifMenu.setAttribute("hidden", "");
          notifMenu.style.display = "none";
          bellBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    if (markReadBtn) {
      markReadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".notif-item.is-unread").forEach((item) => item.classList.remove("is-unread"));
        document.querySelectorAll(".notif-dot").forEach((dot) => (dot.style.display = "none"));
        if (notifBadge) notifBadge.style.display = "none";
        markReadBtn.textContent = "Đã đọc";
        markReadBtn.style.opacity = "0.6";
      });
    }

    document.addEventListener("click", (e) => {
      const container = document.getElementById("notifDropdownContainer");
      if (container && !container.contains(e.target) && notifMenu) {
        notifMenu.setAttribute("hidden", "");
        notifMenu.style.display = "none";
        if (bellBtn) bellBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (footerEl) {
    footerEl.innerHTML = `
      <div class="container footer-inner">
        <div>© ${new Date().getFullYear()} <strong>KS25 Library System</strong> · Đồ án thực tập CNTT (HN-KS25-CNTT1)</div>
        <div class="footer-links">
          <a href="${root}pages/home.html">Cổng Độc giả</a>
          <a href="${root}pages/staff-dashboard.html">Bàn làm việc Thủ thư</a>
          <a href="${root}pages/auth.html">Tài khoản & Thẻ</a>
          <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noopener">Tài liệu API (/docs)</a>
        </div>
      </div>
    `;
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
      .map((item) => {
        // Nếu mục chỉ dành cho ADMIN mà user hiện tại là LIBRARIAN -> gắn nhãn khoá nhẹ
        const isRestricted = item.roles && user && !item.roles.includes(user.role);
        const isActive =
          currentPath.endsWith("/" + item.href) ||
          (item.href.includes("#") &&
            currentPath.endsWith("/" + item.href.split("#")[0]) &&
            currentHash === "#" + item.href.split("#")[1]);

        const badgeHtml = item.badge
          ? `<span class="sidebar-badge">${getSafeText(item.badge)}</span>`
          : isRestricted
          ? `<span class="sidebar-badge">🔒</span>`
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
          <a href="${root}index.html" class="sidebar-btn" title="Mở giao diện Cổng Độc giả">Cổng Độc giả</a>
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
            <span>🔍</span>
            <input id="topbar-copy-code-input" type="text" placeholder="Tra nhanh copy_code (VD: BC-...)" autocomplete="off">
          </form>
          ${
            user
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
    s.src = `${document.body.dataset.root || ""}js/notifications.js`;
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
