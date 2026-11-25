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
function syncRoleBasedUI() {
  const path = window.location.pathname || "";
  if (path === "/" || path.endsWith("/index.html")) return;

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
      sidebar.style.display = "none";
      const finesWrap = document.querySelector(".fines-workspace-wrapper");
      if (finesWrap) finesWrap.style.marginLeft = "0";
      const topNav = document.querySelector(".librarian-topbar .topbar-nav");
      if (topNav) {
        topNav.innerHTML = `
          <a href="home.html" class="topbar-nav-link">Trang chủ</a>
          <a href="search.html" class="topbar-nav-link">Tra cứu sách</a>
          <a href="loan_slip.html" class="topbar-nav-link">Phiếu mượn</a>
          <a href="reservations.html" class="topbar-nav-link">Đặt trước</a>
          <a href="fines.html" class="topbar-nav-link active">Tiền phạt</a>
        `;
      }
    }
  }

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

window.syncRoleBasedUI = syncRoleBasedUI;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", syncRoleBasedUI);
} else {
  syncRoleBasedUI();
}
