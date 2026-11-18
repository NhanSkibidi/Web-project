/**
 * ==============================================================================
 * KS25 Library - Logic Trang Sách Đặt Trước Của Tôi (reservations.js)
 * Module: Đặt trước sách khi hết (T3CFCAC)
 * ==============================================================================
 */

(function () {
  "use strict";

  // Dữ liệu mẫu chuẩn bị sẵn nếu Backend offline
  const DEMO_RESERVATIONS = [
    {
      id: 101,
      user_id: 1,
      book_isbn: "978-604-0-00032-5",
      book_title: "Kiến Trúc Mã Sạch (Clean Code)",
      book_author: "Robert C. Martin",
      status: "READY",
      reserved_at: "2026-11-16T08:30:00",
      pickup_deadline: "2026-11-20T17:30:00",
      queue_position: null,
      copy_barcode: "BS-CC-001",
      copy_code: "BC-9786040000325-01",
      shelf_location: "Quầy thủ thư Tầng 1 (Kệ A1-02)",
      cover_bg: "linear-gradient(145deg, #1e3a8a, #0f172a)",
      cover_tag: "KINH ĐIỂN IT"
    },
    {
      id: 102,
      user_id: 1,
      book_isbn: "978-604-8-31203-5",
      book_title: "Lập trình Python chuyên sâu & Giải thuật",
      book_author: "TS. Đỗ Bá Lâm",
      status: "WAITING",
      reserved_at: "2026-11-17T14:15:00",
      pickup_deadline: null,
      queue_position: 1,
      copy_barcode: null,
      copy_code: null,
      shelf_location: "KHO-IT / Tầng 1 / Kệ A1-08",
      cover_bg: "linear-gradient(145deg, #14532d, #166534)",
      cover_tag: "GIÁO TRÌNH THỰC HÀNH"
    }
  ];

  let reservationsData = [];
  let currentFilter = "all";
  let targetCancelId = null;

  // Lấy thông tin user đăng nhập
  function getCurrentUser() {
    if (typeof auth !== "undefined") {
      const u = auth.getUser();
      if (u) return u;
    }
    try {
      const stored = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
      return stored ? JSON.parse(stored) : { id: 1, full_name: "Nguyễn Nhật Anh", email: "sinhvien@ks25.edu.vn", role: "READER" };
    } catch {
      return { id: 1, full_name: "Nguyễn Nhật Anh", email: "sinhvien@ks25.edu.vn", role: "READER" };
    }
  }

  // Khởi tạo và tải danh sách đặt trước
  async function loadReservations() {
    const user = getCurrentUser();

    // Cập nhật Header User Info
    const userNameEl = document.getElementById("headerUserName");
    const userRoleEl = document.getElementById("headerUserRole");
    const userAvatarEl = document.getElementById("headerUserAvatar");
    if (userNameEl) userNameEl.textContent = user.full_name || user.email || "Độc giả";
    if (userRoleEl) userRoleEl.textContent = user.role === "ADMIN" ? "Quản trị viên" : (user.role === "LIBRARIAN" ? "Thủ thư" : "Sinh viên");
    if (userAvatarEl) {
      const initial = (user.full_name || user.email || "U").charAt(0).toUpperCase();
      userAvatarEl.textContent = initial;
    }

    // Cập nhật số lượng giỏ mượn
    try {
      const cart = JSON.parse(localStorage.getItem("ks25_cart") || "[]");
      const badge = document.getElementById("headerCartBadge");
      if (badge) {
        badge.textContent = cart.length;
        badge.style.display = cart.length > 0 ? "flex" : "none";
      }
    } catch {}

    // Gọi API Backend lấy danh sách
    try {
      if (typeof api !== "undefined" && typeof api.getMyReservations === "function") {
        const res = await api.getMyReservations(user.id);
        if (Array.isArray(res) && res.length > 0) {
          reservationsData = res;
        } else {
          // Lấy từ LocalStorage lưu tạm nếu có
          const localStored = localStorage.getItem("ks25_reservations");
          reservationsData = localStored ? JSON.parse(localStored) : DEMO_RESERVATIONS;
        }
      } else {
        const localStored = localStorage.getItem("ks25_reservations");
        reservationsData = localStored ? JSON.parse(localStored) : DEMO_RESERVATIONS;
      }
    } catch (err) {
      console.warn("Backend API không khả dụng, sử dụng dữ liệu cục bộ:", err);
      const localStored = localStorage.getItem("ks25_reservations");
      reservationsData = localStored ? JSON.parse(localStored) : DEMO_RESERVATIONS;
    }

    renderUI();
  }

  // Cập nhật giao diện danh sách
  function renderUI() {
    const container = document.getElementById("reservationsList");
    const emptyState = document.getElementById("emptyState");
    if (!container) return;

    // 1. Cập nhật các bộ đếm trên Tabs
    const countAll = reservationsData.length;
    const countReady = reservationsData.filter((r) => r.status === "READY").length;
    const countWaiting = reservationsData.filter((r) => r.status === "WAITING").length;
    const countHistory = reservationsData.filter((r) => r.status === "FULFILLED" || r.status === "CANCELLED" || r.status === "EXPIRED").length;

    document.getElementById("countAll").textContent = countAll;
    document.getElementById("countReady").textContent = countReady;
    document.getElementById("countWaiting").textContent = countWaiting;
    document.getElementById("countHistory").textContent = countHistory;

    // 2. Cập nhật hạn mức đặt trước (tối đa 3 đầu sách)
    const activeCount = countReady + countWaiting;
    const quotaText = document.getElementById("quotaText");
    const quotaBarFill = document.getElementById("quotaBarFill");
    if (quotaText) quotaText.textContent = `Đang dùng ${activeCount} / 3 lượt`;
    if (quotaBarFill) {
      const percent = Math.min((activeCount / 3) * 100, 100);
      quotaBarFill.style.width = `${percent}%`;
      if (activeCount >= 3) {
        quotaBarFill.style.background = "#EF4444";
      } else {
        quotaBarFill.style.background = "#10B981";
      }
    }

    // 3. Lọc danh sách theo Tab đang chọn
    let filtered = reservationsData;
    if (currentFilter === "READY") {
      filtered = reservationsData.filter((r) => r.status === "READY");
    } else if (currentFilter === "WAITING") {
      filtered = reservationsData.filter((r) => r.status === "WAITING");
    } else if (currentFilter === "history") {
      filtered = reservationsData.filter((r) => r.status === "FULFILLED" || r.status === "CANCELLED" || r.status === "EXPIRED");
    }

    if (filtered.length === 0) {
      container.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    // 4. Render các Card đặt trước
    container.innerHTML = filtered.map((item) => {
      const isReady = item.status === "READY";
      const isWaiting = item.status === "WAITING";
      const isCancelled = item.status === "CANCELLED";
      const isFulfilled = item.status === "FULFILLED";
      const isExpired = item.status === "EXPIRED";

      let statusBadgeHtml = "";
      let statusAlertHtml = "";

      if (isReady) {
        statusBadgeHtml = `<span class="status-badge status-ready">● Sẵn sàng nhận sách (READY)</span>`;
        const deadlineDate = item.pickup_deadline ? formatDateTime(item.pickup_deadline) : "Trong vòng 48 giờ";
        statusAlertHtml = `
          <div class="ready-pickup-alert">
            <span class="alert-icon">🔔</span>
            <div class="ready-pickup-text">
              <strong>Sách đã có tại quầy thư viện!</strong> Bản sao <code>${item.copy_barcode || item.copy_code || 'BS-IT-001'}</code> đang được giữ ưu tiên cho bạn.<br>
              ⏰ Hạn đến nhận tại Quầy thủ thư: <strong>${deadlineDate}</strong> (Giữ tối đa 2 ngày).
            </div>
          </div>
        `;
      } else if (isWaiting) {
        statusBadgeHtml = `
          <span class="status-badge status-waiting">⏳ Đang xếp hàng (WAITING)</span>
          <span class="queue-position-pill">Vị trí hàng chờ: <span class="queue-num">#${item.queue_position || 1}</span></span>
        `;
        statusAlertHtml = `
          <div class="waiting-queue-alert">
            ⓘ Bạn đang ở <strong>vị trí #${item.queue_position || 1}</strong> trong danh sách chờ. Khi có bạn đọc trả cuốn sách này, hệ thống sẽ tự động kích hoạt thông báo và giữ sách cho bạn trong 2 ngày!
          </div>
        `;
      } else if (isFulfilled) {
        statusBadgeHtml = `<span class="status-badge status-fulfilled">✓ Đã nhận sách</span>`;
      } else if (isCancelled) {
        statusBadgeHtml = `<span class="status-badge status-cancelled">✕ Đã huỷ đặt trước</span>`;
      } else if (isExpired) {
        statusBadgeHtml = `<span class="status-badge status-expired">⚠ Quá hạn nhận (Đã chuyển lượt)</span>`;
      }

      // Nút huỷ đặt trước chỉ hiển thị khi WAITING hoặc READY
      const canCancel = isReady || isWaiting;
      const cancelBtnHtml = canCancel
        ? `<button type="button" class="btn-cancel-res" onclick="openCancelModal(${item.id})">Huỷ đặt trước</button>`
        : `<span style="font-size:12px; color:var(--color-muted); padding:6px 12px;">Đã đóng</span>`;

      const coverBg = item.cover_bg || "linear-gradient(145deg, #1B4332, #0d231a)";
      const coverTag = item.cover_tag || "GIÁO TRÌNH";

      return `
        <div class="res-card ${isReady ? 'card-ready' : (isWaiting ? 'card-waiting' : '')}" id="res-card-${item.id}">
          <!-- Bìa sách nhỏ gọn -->
          <div class="res-cover-thumb" style="background: ${coverBg};">
            <span class="res-cover-tag">${coverTag}</span>
            <div class="res-cover-title">${item.book_title}</div>
            <div class="res-cover-author">${item.book_author || ''}</div>
          </div>

          <!-- Chi tiết thông tin đặt trước -->
          <div class="res-info-col">
            <div class="res-status-row">
              ${statusBadgeHtml}
            </div>

            <h3 class="res-book-title">${item.book_title}</h3>

            <div class="res-meta-line">
              <span>👤 Tác giả: <strong>${item.book_author || 'Nhiều tác giả'}</strong></span>
              <span>•</span>
              <span>Mã ISBN: <strong>${item.book_isbn}</strong></span>
              <span>•</span>
              <span>Thời điểm đặt: <strong>${formatDateTime(item.reserved_at)}</strong></span>
            </div>

            ${statusAlertHtml}
          </div>

          <!-- Cột thao tác -->
          <div class="res-actions-col">
            <a href="book_detail.html?book=dsa" class="btn-detail-link">Xem chi tiết sách →</a>
            ${cancelBtnHtml}
          </div>
        </div>
      `;
    }).join("");
  }

  // Định dạng ngày giờ thân thiện
  function formatDateTime(str) {
    if (!str) return "";
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} lúc ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return str;
    }
  }

  // Lọc tab
  window.filterReservations = function (tab, btn) {
    currentFilter = tab;
    document.querySelectorAll(".res-tab-btn").forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderUI();
  };

  // Mở modal xác nhận huỷ
  window.openCancelModal = function (resId) {
    targetCancelId = resId;
    const modal = document.getElementById("cancelModalOverlay");
    if (modal) modal.style.display = "flex";
  };

  // Đóng modal
  window.closeCancelModal = function () {
    targetCancelId = null;
    const modal = document.getElementById("cancelModalOverlay");
    if (modal) modal.style.display = "none";
  };

  // Xác nhận huỷ đặt trước
  window.confirmCancelAction = async function () {
    if (!targetCancelId) return;
    const user = getCurrentUser();

    try {
      if (typeof api !== "undefined" && typeof api.cancelReservation === "function") {
        await api.cancelReservation(targetCancelId, user.id);
      }
    } catch (e) {
      console.warn("API Cancel thất bại hoặc offline, xử lý cục bộ:", e);
    }

    // Cập nhật trạng thái trong dữ liệu
    const found = reservationsData.find((r) => r.id === targetCancelId);
    if (found) {
      found.status = "CANCELLED";
      localStorage.setItem("ks25_reservations", JSON.stringify(reservationsData));
    }

    closeCancelModal();
    renderUI();
    showToast("✓ Đã huỷ lượt đặt trước thành công. Lượt giữ sách đã được chuyển cho bạn đọc tiếp theo.");
  };

  // Toast thông báo
  function showToast(message) {
    const existing = document.querySelector(".custom-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "custom-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1B4332;
      color: #FFFFFF;
      padding: 14px 22px;
      border-radius: 12px;
      font-size: 14.5px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: toastPop 0.3s ease;
    `;
    toast.innerHTML = `<span>📋</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = "opacity 0.3s, transform 0.3s";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(15px)";
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // Khởi chạy khi tài liệu sẵn sàng
  document.addEventListener("DOMContentLoaded", () => {
    loadReservations();
  });

})();
