// ==============================================================================
// UniLib — Notification Manager (In-app Notification Dropdown)
// Phục vụ Task T3CFF48: Thông báo in-app nhắc trả sách quá hạn & sắp đến hạn
// ==============================================================================

(function initNotificationSystem() {
  function setupNotificationListeners() {
    const bellBtn = document.getElementById("notifBellBtn");
    const notifMenu = document.getElementById("notifDropdownMenu");
    const markReadBtn = document.getElementById("notifMarkReadBtn");
    const notifBadge = document.getElementById("notifBadge");
    const notifContainer = document.getElementById("notifDropdownContainer");

    if (bellBtn && notifMenu) {
      bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = notifMenu.hasAttribute("hidden") || notifMenu.style.display === "none";
        
        // Đóng user dropdown nếu đang mở
        const userMenu = document.getElementById("userDropdownMenu") || document.getElementById("accountMenu");
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
        const unreadItems = document.querySelectorAll(".notif-item.is-unread");
        unreadItems.forEach((item) => item.classList.remove("is-unread"));
        
        const dots = document.querySelectorAll(".notif-dot");
        dots.forEach((dot) => dot.style.display = "none");

        if (notifBadge) {
          notifBadge.style.display = "none";
        }
        markReadBtn.textContent = "Đã đọc";
        markReadBtn.style.opacity = "0.6";
        markReadBtn.style.cursor = "default";
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNotificationListeners);
  } else {
    setupNotificationListeners();
  }
})();
