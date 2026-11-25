// ==============================================================================
// UniLib — Notification Manager (In-app Notification Dropdown)
// Phục vụ Task T3CFF48: Thông báo in-app nhắc trả sách quá hạn & sắp đến hạn
// ==============================================================================

(function initNotificationSystem() {
  "use strict";

  const API_BASE = (function () {
    if (typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL) {
      return CONFIG.API_BASE_URL.replace(/\/api\/?$/, "");
    }
    if (window.API_BASE_URL) return window.API_BASE_URL.replace(/\/api\/?$/, "");
    if (window.location.port === "8000") return "";
    return "http://127.0.0.1:8000";
  })();

  function getAuthToken() {
    if (typeof auth !== "undefined" && typeof auth.getToken === "function") {
      return auth.getToken();
    }
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("access_token") ||
      null
    );
  }

  function getCurrentUser() {
    if (typeof auth !== "undefined" && typeof auth.getUser === "function") {
      const u = auth.getUser();
      if (u) return u;
    }
    try {
      const raw =
        localStorage.getItem("user_info") ||
        sessionStorage.getItem("user_info") ||
        localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getCurrentUserId() {
    const user = getCurrentUser();
    if (user && user.id) return user.id;
    const rawId = localStorage.getItem("user_id");
    return rawId ? parseInt(rawId, 10) : null;
  }

  function renderEmptyState(message, icon = "mark_email_read") {
    const listEl = document.querySelector(".notif-list");
    if (!listEl) return;
    listEl.innerHTML = `
      <div style="padding: 28px 16px; text-align: center; color: #64748b;">
        <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.55;">${icon}</span>
        <p style="margin: 8px 0 0; font-size: 13px;">${escapeHtml(message)}</p>
      </div>
    `;
  }

  function getIconByType(type) {
    switch (type) {
      case "OVERDUE":
        return { cls: "overdue", icon: "error" };
      case "DUE_SOON":
        return { cls: "due-soon", icon: "alarm" };
      case "REMINDER":
        return { cls: "reminder", icon: "outgoing_mail" };
      default:
        return { cls: "due-soon", icon: "notifications" };
    }
  }

  function renderNotificationList(items) {
    const listEl = document.querySelector(".notif-list");
    if (!listEl) return;

    if (!items || items.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 28px 16px; text-align: center; color: #888;">
          <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.5;">mark_email_read</span>
          <p style="margin: 8px 0 0; font-size: 13px;">Bạn không có thông báo nào mới</p>
        </div>
      `;
      return;
    }

    const targetPage = "loan_slip.html";
    const slipBase = window.location.pathname.includes("/pages/")
      ? targetPage
      : `pages/${targetPage}`;

    listEl.innerHTML = items
      .map((item) => {
        const { cls, icon } = getIconByType(item.type);
        const unreadClass = item.is_read ? "" : "is-unread";
        const dotStyle = item.is_read ? 'style="display: none;"' : "";
        const href = item.loan_id ? `${slipBase}?loan_id=${item.loan_id}` : slipBase;

        return `
          <a href="${href}" class="notif-item ${unreadClass}" data-id="${item.id}">
            <div class="notif-icon-box ${cls}">
              <span class="material-symbols-outlined">${icon}</span>
            </div>
            <div class="notif-content">
              <div class="notif-item-title">
                <span>${escapeHtml(item.title)}</span>
                <span class="notif-dot" ${dotStyle}></span>
              </div>
              <p class="notif-item-desc">${escapeHtml(item.message)}</p>
              <span class="notif-time">${escapeHtml(item.time_ago || "Vừa xong")}</span>
            </div>
          </a>
        `;
      })
      .join("");

    // Gắn sự kiện click đánh dấu đã đọc từng mục
    listEl.querySelectorAll(".notif-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        if (id && el.classList.contains("is-unread")) {
          markSingleAsRead(id, el);
        }
      });
    });
  }

  function updateBadge(unreadCount) {
    const notifBadge = document.getElementById("notifBadge");
    const notifPills = document.querySelectorAll(".notif-badge-pill");

    if (notifBadge) {
      if (unreadCount > 0) {
        notifBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;
        notifBadge.style.display = "flex";
      } else {
        notifBadge.style.display = "none";
      }
    }

    notifPills.forEach((pill) => {
      pill.textContent = unreadCount > 0 ? `${unreadCount} mới` : "0 mới";
      pill.style.background = unreadCount > 0 ? "#FEE2E2" : "#E2E8F0";
      pill.style.color = unreadCount > 0 ? "#DC2626" : "#64748B";
    });

    const markReadBtn = document.getElementById("notifMarkReadBtn");
    if (markReadBtn) {
      if (unreadCount === 0) {
        markReadBtn.textContent = "Đã đọc tất cả";
        markReadBtn.style.opacity = "0.5";
        markReadBtn.style.cursor = "default";
      } else {
        markReadBtn.textContent = "Đã đọc tất cả";
        markReadBtn.style.opacity = "1";
        markReadBtn.style.cursor = "pointer";
      }
    }
  }

  async function loadNotifications() {
    const token = getAuthToken();
    if (!token) {
      updateBadge(0);
      renderEmptyState("Đăng nhập để xem thông báo nhắc trả sách.", "lock_open");
      return;
    }

    const userId = getCurrentUserId();
    const url = userId
      ? `${API_BASE}/api/loans/notifications/my?user_id=${userId}&limit=20`
      : `${API_BASE}/api/loans/notifications/my?limit=20`;

    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      updateBadge(data.unread_count || 0);
      renderNotificationList(data.items || []);
    } catch (err) {
      updateBadge(0);
      renderEmptyState("Không thể tải thông báo từ máy chủ lúc này.", "cloud_off");
    }
  }

  async function markSingleAsRead(id, el) {
    el.classList.remove("is-unread");
    const dot = el.querySelector(".notif-dot");
    if (dot) dot.style.display = "none";

    // Cập nhật số unread trên badge
    const notifBadge = document.getElementById("notifBadge");
    if (notifBadge && notifBadge.style.display !== "none") {
      let current = parseInt(notifBadge.textContent, 10) || 0;
      if (current > 1) {
        notifBadge.textContent = current - 1;
      } else {
        notifBadge.style.display = "none";
      }
    }

    const token = getAuthToken();
    if (!token || String(id).startsWith("demo-")) return;

    const userId = getCurrentUserId();
    const readUrl = userId
      ? `${API_BASE}/api/loans/notifications/${id}/read?user_id=${userId}`
      : `${API_BASE}/api/loans/notifications/${id}/read`;

    try {
      await fetch(readUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      /* ignore */
    }
  }

  async function markAllAsRead() {
    const unreadItems = document.querySelectorAll(".notif-item.is-unread");
    unreadItems.forEach((item) => item.classList.remove("is-unread"));

    const dots = document.querySelectorAll(".notif-dot");
    dots.forEach((dot) => (dot.style.display = "none"));

    updateBadge(0);

    const token = getAuthToken();
    if (!token) return;

    const userId = getCurrentUserId();
    const url = userId
      ? `${API_BASE}/api/loans/notifications/mark-all-read?user_id=${userId}`
      : `${API_BASE}/api/loans/notifications/mark-all-read`;

    try {
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      /* ignore */
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setupNotificationListeners() {
    const bellBtn = document.getElementById("notifBellBtn");
    const notifMenu = document.getElementById("notifDropdownMenu");
    const markReadBtn = document.getElementById("notifMarkReadBtn");
    const notifContainer = document.getElementById("notifDropdownContainer");

    if (bellBtn && notifMenu && !bellBtn.dataset.notifBound) {
      bellBtn.dataset.notifBound = "1";
      bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = notifMenu.hasAttribute("hidden") || notifMenu.style.display === "none";

        // Đóng user dropdown nếu đang mở
        const userMenu =
          document.getElementById("userDropdownMenu") ||
          document.getElementById("accountMenu");
        if (userMenu) {
          userMenu.classList.remove("show");
          userMenu.setAttribute("hidden", "");
        }

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

    if (markReadBtn && !markReadBtn.dataset.notifBound) {
      markReadBtn.dataset.notifBound = "1";
      markReadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        markAllAsRead();
      });
    }

    if (!window.__unilibNotifDocBound) {
      window.__unilibNotifDocBound = true;
      // Đóng khi click ngoài
      document.addEventListener("click", (e) => {
        const containerNow = document.getElementById("notifDropdownContainer");
        const menuNow = document.getElementById("notifDropdownMenu");
        const bellNow = document.getElementById("notifBellBtn");
        if (containerNow && !containerNow.contains(e.target) && menuNow) {
          menuNow.setAttribute("hidden", "");
          menuNow.style.display = "none";
          if (bellNow) bellNow.setAttribute("aria-expanded", "false");
        }
      });

      // Phím Escape đóng dropdown
      document.addEventListener("keydown", (e) => {
        const menuNow = document.getElementById("notifDropdownMenu");
        const bellNow = document.getElementById("notifBellBtn");
        if (e.key === "Escape" && menuNow && !menuNow.hasAttribute("hidden")) {
          menuNow.setAttribute("hidden", "");
          menuNow.style.display = "none";
          if (bellNow) bellNow.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Nạp dữ liệu thông báo
    if (notifContainer) {
      loadNotifications();
    }
  }

  // Export API ra window
  window.unilibNotifications = {
    load: loadNotifications,
    markAllRead: markAllAsRead,
    init: setupNotificationListeners,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNotificationListeners);
  } else {
    setupNotificationListeners();
  }
})();
