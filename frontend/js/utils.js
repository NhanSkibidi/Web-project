// Các hàm tiện ích dùng chung cho nhiều trang.

// Chống XSS: luôn dùng hàm này khi chèn dữ liệu người dùng nhập vào innerHTML
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

// 45000 -> "45.000 ₫"; trả về "0 ₫" nếu không có giá trị
function formatMoney(value) {
  return Number(value ?? 0).toLocaleString("vi-VN") + " ₫";
}

// "2026-11-04T09:30:00" -> "09:30 4/11/2026"; trả về "—" nếu không có giá trị
function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " +
    d.toLocaleDateString("vi-VN");
}

// Hiện thông báo nhỏ ở góc màn hình. type: "success" | "error"
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ==============================================================================
// Đồng bộ giao diện & điều hướng theo vai trò (GUEST / READER / LIBRARIAN / ADMIN)
// ==============================================================================
const READER_ONLY_PORTAL_PAGES = [
  "/home.html",
  "/search.html",
  "/book_detail.html",
  "/loan_slip.html",
  "/reservations.html",
  "/loan_basket.html",
];

function getCurrentSessionInfo() {
  let user = null;
  let token = null;
  if (typeof auth !== "undefined") {
    token = auth.getToken();
    user = auth.getUser();
  } else {
    token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("access_token") ||
      null;
    try {
      const raw = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
      user = raw ? JSON.parse(raw) : null;
    } catch {
      user = null;
    }
  }
  const role = token && user && user.role ? String(user.role).toUpperCase() : "GUEST";
  return { user, token, role };
}

function isReaderOnlyPath(pathname) {
  const normalized = String(pathname || "").replace(/\\/g, "/").toLowerCase();
  if (!normalized || normalized === "/" || normalized.endsWith("/frontend/")) {
    return true;
  }
  return READER_ONLY_PORTAL_PAGES.some((page) => normalized.endsWith(page));
}

function getStaffDashboardHref() {
  const normalized = String(window.location.pathname || "").replace(/\\/g, "/").toLowerCase();
  if (normalized.includes("/pages/")) {
    return "staff-dashboard.html";
  }
  const rootPrefix = (document.body && document.body.dataset && document.body.dataset.root) || "./";
  return `${rootPrefix}pages/staff-dashboard.html`;
}

// Khóa chặt tài khoản ADMIN / LIBRARIAN trong phân hệ quản trị, không cho sang Trang chủ / Cổng Độc giả
function enforceStaffManagementBoundary(overrideUser = null) {
  const session = getCurrentSessionInfo();
  const activeUser = overrideUser || session.user;
  const role = session.token && activeUser && activeUser.role ? String(activeUser.role).toUpperCase() : session.role;
  if (role !== "ADMIN" && role !== "LIBRARIAN") {
    return false;
  }
  if (isReaderOnlyPath(window.location.pathname)) {
    window.location.replace(getStaffDashboardHref());
    return true;
  }
  return false;
}

function applyStaffHeaderCleanup(role) {
  if (role !== "ADMIN" && role !== "LIBRARIAN") return;

  const staffHref = getStaffDashboardHref();
  document.querySelectorAll(".librarian-topbar .brand-badge").forEach((brandEl) => {
    brandEl.setAttribute("href", staffHref);
    brandEl.removeAttribute("data-page");
    brandEl.setAttribute("title", "UniLib - Bàn làm việc quản trị");
  });

  const topNav = document.querySelector(".librarian-topbar .topbar-nav");
  if (topNav) {
    topNav.querySelectorAll('a[href*="home.html"]').forEach((link) => link.remove());
    const hasVisibleLinks = topNav.querySelectorAll("a, button").length > 0;
    if (!hasVisibleLinks) {
      topNav.style.setProperty("display", "none", "important");
      const mobileBtn = document.getElementById("mobileMenuToggle");
      if (mobileBtn) mobileBtn.style.setProperty("display", "none", "important");
    }
  }

  const dropdownMenu = document.getElementById("userDropdownMenu");
  if (dropdownMenu) {
    dropdownMenu.querySelectorAll("a.dropdown-item").forEach((item) => {
      const href = item.getAttribute("href") || "";
      if (!href.includes("profile.html")) {
        item.remove();
      }
    });
  }

  const notifWrap = document.getElementById("notifDropdownContainer");
  if (notifWrap) notifWrap.remove();
  const basketBtn = document.getElementById("loanBasketBtn");
  if (basketBtn) basketBtn.remove();

  const pfNav = document.getElementById("pf-top-nav");
  if (pfNav) {
    pfNav.innerHTML = "";
    pfNav.style.display = "none";
  }
}

enforceStaffManagementBoundary();
applyStaffHeaderCleanup(getCurrentSessionInfo().role);

function syncRoleBasedUI() {
  if (enforceStaffManagementBoundary()) return;

  const path = window.location.pathname || "";
  if (path === "/") return;

  const { user, role } = getCurrentSessionInfo();
  const roleLabelMap = {
    ADMIN: "Quản trị viên",
    LIBRARIAN: "Thủ thư",
    READER: "Độc giả",
  };

  // 1. Staff Sidebar (#app-sidebar)
  const sidebar = document.getElementById("app-sidebar");
  if (sidebar) {
    const headerSpan = sidebar.querySelector(".sidebar-rail-header span");
    if (role === "ADMIN") {
      if (headerSpan) headerSpan.textContent = "PHÂN HỆ QUẢN TRỊ";
      sidebar.querySelectorAll('a[href*="admin-users.html"]').forEach((el) => {
        el.style.display = "";
      });
    } else if (role === "LIBRARIAN") {
      if (headerSpan) headerSpan.textContent = "PHÂN HỆ THỦ THƯ";
      sidebar.querySelectorAll('a[href*="admin-users.html"]').forEach((el) => {
        el.style.display = "none";
      });
    } else if (role === "READER" && path.endsWith("/fines.html")) {
      document.body.classList.add("reader-mode");
      const footerLeft = document.querySelector(".app-footer .footer-left");
      if (footerLeft) {
        footerLeft.textContent = "© 2026 KS25 Library System - Cổng Tra Cứu & Độc Giả Sinh Viên. Bảo lưu mọi quyền.";
      }

      sidebar.style.display = "none";
      const finesWrap = document.querySelector(".fines-workspace-wrapper");
      if (finesWrap) finesWrap.style.marginLeft = "0";
      const topNav = document.querySelector(".librarian-topbar .topbar-nav");
      if (topNav) {
        topNav.style.display = "";
        topNav.innerHTML = `
          <a href="home.html" class="topbar-nav-link" data-page="home">Trang chủ</a>
          <a href="search.html" class="topbar-nav-link" data-page="search">Tra cứu sách</a>
          <a href="loan_slip.html" class="topbar-nav-link" data-page="loan_slip">Phiếu mượn</a>
          <a href="reservations.html" class="topbar-nav-link" data-page="reservations">Đặt trước</a>
          <a href="fines.html" class="topbar-nav-link active" data-page="fines">Tiền phạt</a>
        `;
      }

      const notifWrap = document.getElementById("notifDropdownContainer");
      if (notifWrap) notifWrap.style.display = "";
      const basketBtn = document.getElementById("loanBasketBtn");
      if (basketBtn) basketBtn.style.display = "";

      if (window.unilibNotifications && typeof window.unilibNotifications.load === "function") {
        window.unilibNotifications.load();
      } else if (!document.querySelector('script[src*="notifications.js"]')) {
        const s = document.createElement("script");
        s.src = `${(document.body && document.body.dataset && document.body.dataset.root) || "../"}js/notifications.js?v=2.1`;
        s.defer = true;
        document.body.appendChild(s);
      }
    }
  }

  // 1b. Với ADMIN / LIBRARIAN trên các trang quản trị (gồm cả fines.html):
  //     Không cho điều hướng ra Trang chủ; avatar dropdown chỉ giữ Thông tin cá nhân & Đăng xuất
  applyStaffHeaderCleanup(role);

  // 2. Reader / Public Topbars (.topbar-nav, .unilib-nav, .nav)
  if (document.body.dataset.layout !== "staff") {
    document.querySelectorAll("[data-role-allow]").forEach((el) => {
      if (sidebar && sidebar.contains(el)) return;
      const allowed = String(el.getAttribute("data-role-allow") || "")
        .split(",")
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean);
      el.style.display = allowed.includes(role) ? "" : "none";
    });

    document.querySelectorAll("[data-auth-required='true']").forEach((el) => {
      if (sidebar && sidebar.contains(el)) return;
      el.style.display = role === "GUEST" ? "none" : "";
    });

    // Chặn các link Quản trị thư viện tĩnh nếu chưa gắn data-role-allow
    const isStaff = role === "ADMIN" || role === "LIBRARIAN";
    document
      .querySelectorAll('.topbar-nav a[href*="staff-dashboard.html"], .unilib-nav a[href*="staff-dashboard.html"], .nav a[href*="staff-dashboard.html"]')
      .forEach((el) => {
        if (!el.hasAttribute("data-role-allow")) {
          el.style.display = isStaff ? "" : "none";
        }
      });
  }

  // 3. Hydrate User Profile tĩnh trên loan_basket.html & loan_slip.html
  const isBasketOrSlip = path.endsWith("/loan_basket.html") || path.endsWith("/loan_slip.html");
  if (isBasketOrSlip) {
    const profileBtn = document.querySelector(".librarian-profile");
    if (profileBtn) {
      const avatarEl = profileBtn.querySelector(".librarian-avatar");
      const nameEl = profileBtn.querySelector(".librarian-name");
      const roleEl = profileBtn.querySelector(".librarian-role");

      if (role !== "GUEST" && user) {
        const displayName = user.full_name || user.name || user.email || "Độc giả";
        const displayRole = roleLabelMap[role] || role;
        if (avatarEl) avatarEl.textContent = displayName.trim().charAt(0).toUpperCase() || "U";
        if (nameEl) nameEl.textContent = displayName;
        if (roleEl) roleEl.textContent = displayRole;

        const accMenuInfo = document.querySelector("#accountMenu p");
        if (accMenuInfo) {
          accMenuInfo.innerHTML = `<strong>${escapeHtml(displayName)}</strong><small>${escapeHtml(displayRole)}</small>`;
        }
      } else {
        if (avatarEl) avatarEl.textContent = "?";
        if (nameEl) nameEl.textContent = "Đăng nhập";
        if (roleEl) roleEl.textContent = "Khách tham quan";

        const accMenu = document.getElementById("accountMenu");
        if (accMenu) {
          accMenu.innerHTML = `
            <p><strong>Khách tham quan</strong><small>Chưa đăng nhập</small></p>
            <a href="login.html#login" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;color:inherit;text-decoration:none;font-size:13px;font-weight:600;">Đăng nhập ngay →</a>
          `;
        }

        const basketDropdown = document.getElementById("userDropdownMenu");
        if (basketDropdown) {
          basketDropdown.innerHTML = `
            <a href="login.html#login" class="dropdown-item">
              <span class="material-symbols-outlined">login</span>
              <span>Đăng nhập</span>
            </a>
            <a href="login.html#register" class="dropdown-item">
              <span class="material-symbols-outlined">person_add</span>
              <span>Đăng ký thẻ mới</span>
            </a>
          `;
        }
      }
    }
  }
}

const LIBRARY_BASKET_KEY = "library_basket";

function getLibraryBasket() {
  try {
    const raw = JSON.parse(localStorage.getItem(LIBRARY_BASKET_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const cleaned = [];
    for (const item of raw) {
      if (!item || !item.isbn) continue;
      const isbn = String(item.isbn).trim();
      if (!isbn || isbn === "000" || seen.has(isbn)) continue;
      seen.add(isbn);
      cleaned.push({
        isbn,
        title: item.title ? String(item.title) : "",
        copy_code: item.copy_code ? String(item.copy_code) : "",
        selected: item.selected !== false,
        added_at: item.added_at || new Date().toISOString(),
      });
    }
    return cleaned;
  } catch {
    return [];
  }
}

function saveLibraryBasket(items) {
  const seen = new Set();
  const normalized = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !item.isbn) continue;
    const isbn = String(item.isbn).trim();
    if (!isbn || isbn === "000" || seen.has(isbn)) continue;
    seen.add(isbn);
    normalized.push({
      isbn,
      title: item.title ? String(item.title) : "",
      copy_code: item.copy_code ? String(item.copy_code) : "",
      selected: item.selected !== false,
      added_at: item.added_at || new Date().toISOString(),
    });
  }
  try {
    localStorage.setItem(LIBRARY_BASKET_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore storage quota errors */
  }
  syncCartBadges();
  return normalized;
}

function addBookToLibraryBasket(entry) {
  const isbn = String(entry?.isbn || "").trim();
  if (!isbn || isbn === "000") {
    return { ok: false, reason: "invalid", basket: getLibraryBasket() };
  }
  const basket = getLibraryBasket();
  if (basket.some((item) => item.isbn === isbn)) {
    return { ok: false, reason: "duplicate", basket };
  }
  basket.push({
    isbn,
    title: entry?.title ? String(entry.title) : "",
    copy_code: entry?.copy_code ? String(entry.copy_code) : "",
    selected: true,
    added_at: new Date().toISOString(),
  });
  const saved = saveLibraryBasket(basket);
  return { ok: true, reason: "added", basket: saved };
}

function syncCartBadges() {
  const count = getLibraryBasket().length;
  const labelText = count > 9 ? "9+" : String(count);

  document
    .querySelectorAll(".cart-badge-count, #cartBadge, #headerCartBadge, #loanBasketBadge")
    .forEach((badge) => {
      badge.textContent = labelText;
      badge.style.display = count === 0 ? "none" : "flex";
      badge.setAttribute("aria-label", `Giỏ mượn có ${count} cuốn sách`);
      const parentLink = badge.closest("a");
      if (parentLink) {
        parentLink.setAttribute("aria-label", `Giỏ mượn sách (${count} cuốn)`);
      }
    });

  document
    .querySelectorAll('a[href*="loan_basket.html"] .badge-dot')
    .forEach((dot) => {
      dot.style.display = count > 0 ? "" : "none";
    });
}

window.getLibraryBasket = getLibraryBasket;
window.saveLibraryBasket = saveLibraryBasket;
window.addBookToLibraryBasket = addBookToLibraryBasket;
window.syncCartBadges = syncCartBadges;
window.syncRoleBasedUI = syncRoleBasedUI;
window.enforceStaffManagementBoundary = enforceStaffManagementBoundary;
window.isReaderOnlyPath = isReaderOnlyPath;

window.addEventListener("storage", (e) => {
  if (e.key === LIBRARY_BASKET_KEY) {
    syncCartBadges();
  }
});

function initUtilsOnLoad() {
  syncRoleBasedUI();
  syncCartBadges();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUtilsOnLoad);
} else {
  initUtilsOnLoad();
}
