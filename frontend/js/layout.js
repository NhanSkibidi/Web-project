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
  { href: "home.html", label: "Trang chủ" },
  { href: "search.html", label: "Tra cứu sách" },
  { href: "javascript:void(0)", label: "Phiếu mượn của tôi" },
  { href: "javascript:void(0)", label: "Quản trị thư viện" },
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
        href: "pages/staff-dashboard.html#fines",
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
            <a href="${root}index.html" class="btn">Về Trang chủ</a>
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
    const linksHtml = READER_MENU.map((item) => {
      const isCurrent = currentPath.endsWith("/" + item.href);
      return `<a href="${item.href}" class="nav-item ${isCurrent ? "active" : ""}" onclick="handleNavClick(event, this)">${getSafeText(item.label)}</a>`;
    }).join("");

    const userAreaHtml = `
      <div class="header-user-area">
        <button type="button" class="btn-login" id="btn-login" onclick="handleLoginClick(event)">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span>Đăng nhập</span>
        </button>
      </div>
    `;

    headerEl.innerHTML = `
      <div class="container header-inner">
        <a href="home.html" class="brand">
          <div class="brand-icon">KS</div>
          <div class="brand-text">
            <span class="brand-title">KS25 Library</span>
            <span class="brand-subtitle">Hệ thống thư viện số</span>
          </div>
        </a>
        <nav class="nav" id="main-nav">${linksHtml}</nav>
        ${userAreaHtml}
      </div>
    `;

    // Sticky header đổ bóng khi cuộn
    window.addEventListener("scroll", () => {
      if (headerEl) {
        if (window.scrollY > 20) {
          headerEl.classList.add("scrolled");
        } else {
          headerEl.classList.remove("scrolled");
        }
      }
    });
  }

  if (footerEl && !footerEl.querySelector(".footer-inner")) {
    footerEl.innerHTML = `
      <div class="container footer-inner">
        <div>© ${new Date().getFullYear()} Thư viện số KS25. Bảo lưu mọi quyền.</div>
        <div class="footer-links">
          <a href="javascript:void(0)">Trung tâm trợ giúp</a>
          <a href="javascript:void(0)">Quy định mượn trả</a>
          <a href="javascript:void(0)">Hỗ trợ sinh viên</a>
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
          ${user
      ? `<span class="user-chip">
                  <span>${getSafeText(user.full_name || user.email)}</span>
                  <span class="user-chip-role">${getSafeText(user.role)}</span>
                </span>`
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

function handleNavClick(e, el) {
  if (el.getAttribute("href") === "javascript:void(0)" || el.getAttribute("href") === "#") {
    if (e) e.preventDefault();
  }
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  el.classList.add("active");
}

function handleLoginClick(e) {
  if (e) e.preventDefault();
  const btn = document.getElementById("btn-login");
  if (!btn) return;
  const isLogged = btn.classList.toggle("logged-in");
  if (isLogged) {
    btn.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16A34A;"></span><span>Độc giả KS25</span>`;
    btn.style.color = "#16A34A";
    btn.style.borderColor = "#16A34A";
  } else {
    btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg><span>Đăng nhập</span>`;
    btn.style.color = "var(--color-primary)";
    btn.style.borderColor = "var(--color-primary)";
  }
}

window.handleNavClick = handleNavClick;
window.handleLoginClick = handleLoginClick;

initLayout();
