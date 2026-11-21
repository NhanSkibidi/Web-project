// ==============================================================================
// UniLib — Notification Manager (In-app Notification Dropdown)
// Phục vụ Task T3CFF48: Thông báo in-app nhắc trả sách quá hạn & sắp đến hạn
// ==============================================================================

(function initNotificationSystem() {
  "use strict";

  const API_BASE = (function () {
    if (window.API_BASE_URL) return window.API_BASE_URL;
    if (window.location.port === "8000") return "";
    return "http://127.0.0.1:8000";
  })();

  function getCurrentUserId() {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u && u.id) return u.id;
      }
      const rawId = localStorage.getItem("user_id");
      if (rawId) return parseInt(rawId, 10);
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  // Dữ liệu fallback offline khi backend chưa chạy
  const OFFLINE_NOTIFICATIONS = [
    {
      id: "demo-1",
      type: "OVERDUE",
      title: "Quá hạn trả: Cấu trúc Dữ liệu & Giải thuật",
      message: "Phiếu #PM-2024-0082 đã quá hạn 18 ngày. Tiền phạt dự kiến: 36.000 đ. Vui lòng mang sách tới quầy để trả.",
      time_ago: "10 phút trước",
      is_read: false,
      loan_code: "PM-2024-0082",
    },
    {
      id: "demo-2",
      type: "DUE_SOON",
      title: "Sắp đến hạn trả sách (còn 1 ngày)",
      message: "Ấn phẩm 'Hệ thống Cơ sở Dữ liệu hiện đại' đến hạn vào ngày mai. Bạn có thể gia hạn online thêm 7 ngày hoặc trả tại quầy.",
      time_ago: "2 giờ trước",
      is_read: false,
      loan_code: "PM-2024-0095",
    },
  ];

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

    listEl.innerHTML = items
      .map((item) => {
        const { cls, icon } = getIconByType(item.type);
        const unreadClass = item.is_read ? "" : "is-unread";
        const dotStyle = item.is_read ? 'style="display: none;"' : "";
        const href = item.loan_id ? `loan_slip.html?loan_id=${item.loan_id}` : "loan_slip.html";

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
    const userId = getCurrentUserId();
    const url = userId
      ? `${API_BASE}/api/loans/notifications/my?user_id=${userId}&limit=20`
      : `${API_BASE}/api/loans/notifications/my?limit=20`;

    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      updateBadge(data.unread_count || 0);
      renderNotificationList(data.items || []);
    } catch (err) {
      // Fallback offline mượt mà
      const unreadCount = OFFLINE_NOTIFICATIONS.filter((n) => !n.is_read).length;
      updateBadge(unreadCount);
      renderNotificationList(OFFLINE_NOTIFICATIONS);
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

    if (String(id).startsWith("demo-")) return;

    try {
      await fetch(`${API_BASE}/api/loans/notifications/${id}/read`, {
        method: "PATCH",
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

    const userId = getCurrentUserId();
    const url = userId
      ? `${API_BASE}/api/loans/notifications/mark-all-read?user_id=${userId}`
      : `${API_BASE}/api/loans/notifications/mark-all-read`;

    try {
      await fetch(url, { method: "POST" });
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

    if (bellBtn && notifMenu) {
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

    if (markReadBtn) {
      markReadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        markAllAsRead();
      });
    }

    // Đóng khi click ngoài
    document.addEventListener("click", (e) => {
      if (notifContainer && !notifContainer.contains(e.target) && notifMenu) {
        notifMenu.setAttribute("hidden", "");
        notifMenu.style.display = "none";
        if (bellBtn) bellBtn.setAttribute("aria-expanded", "false");
      }
    });

    // Phím Escape đóng dropdown
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && notifMenu && !notifMenu.hasAttribute("hidden")) {
        notifMenu.setAttribute("hidden", "");
        notifMenu.style.display = "none";
        if (bellBtn) bellBtn.setAttribute("aria-expanded", "false");
      }
    });

    // Nạp dữ liệu thông báo
    loadNotifications();
  }

  // Export API ra window
  window.unilibNotifications = {
    load: loadNotifications,
    markAllRead: markAllAsRead,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNotificationListeners);
  } else {
    setupNotificationListeners();
  }
})();
