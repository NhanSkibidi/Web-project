/**
 * ==============================================================================
 * KS25 Library - Logic Trang Sách Đặt Trước Của Tôi (reservations.js)
 * Kết nối trực tiếp RESTful API Backend & Database (/api/reservations/*)
 * ==============================================================================
 */

(function () {
  "use strict";

  const COVER_GRADIENTS = [
    "linear-gradient(145deg, #1B4332, #0d231a)",
    "linear-gradient(145deg, #1e3a8a, #0f172a)",
    "linear-gradient(145deg, #0f766e, #115e59)",
    "linear-gradient(145deg, #334155, #1e293b)",
    "linear-gradient(145deg, #b45309, #78350f)",
  ];

  let reservationsData = [];
  let currentFilter = "all";
  let targetCancelId = null;
  let isLoading = false;
  let loadError = null;

  function safeHtml(val) {
    if (typeof escapeHtml === "function") return escapeHtml(val);
    return String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCoverUrl(url) {
    if (!url) return "";
    const trimmed = String(url).trim();
    if (!trimmed) return "";
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("blob:")
    ) {
      return trimmed;
    }
    const baseOrigin =
      typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL
        ? CONFIG.API_BASE_URL.replace(/\/api\/?$/, "")
        : "";
    return `${baseOrigin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  }

  function getCoverGradient(seed) {
    const s = String(seed || "");
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    }
    return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
  }

  // Lấy thông tin user đăng nhập
  function getCurrentUser() {
    if (typeof auth !== "undefined") {
      const u = auth.getUser();
      if (u) return u;
    }
    try {
      const stored = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Khởi tạo và tải danh sách đặt trước từ Database API
  async function loadReservations() {
    const token = typeof auth !== "undefined" && typeof auth.getToken === "function" ? auth.getToken() : null;
    let user = getCurrentUser();
    if (!token) return;

    isLoading = true;
    loadError = null;
    renderUI();

    try {
      if (!user?.id && typeof auth !== "undefined" && typeof auth.syncSession === "function") {
        user = await auth.syncSession();
      }

      const params = user?.id ? { user_id: user.id } : undefined;
      const res = await api.get("/reservations/my", params);
      reservationsData = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      console.error("[reservations] Lỗi tải danh sách đặt trước từ database:", err);
      loadError = err?.message || "Không thể kết nối máy chủ để tải danh sách đặt trước.";
      reservationsData = [];
    } finally {
      isLoading = false;
      renderUI();
    }
  }
  window.reloadReservations = loadReservations;

  // Cập nhật giao diện danh sách
  function renderUI() {
    const container = document.getElementById("reservationsList");
    const emptyState = document.getElementById("emptyState");
    if (!container) return;

    // 1. Cập nhật các bộ đếm trên Tabs
    const countAll = reservationsData.length;
    const countReady = reservationsData.filter((r) => r.status === "READY").length;
    const countWaiting = reservationsData.filter((r) => r.status === "WAITING").length;
    const countHistory = reservationsData.filter(
      (r) => r.status === "FULFILLED" || r.status === "CANCELLED" || r.status === "EXPIRED"
    ).length;

    const elAll = document.getElementById("countAll");
    const elReady = document.getElementById("countReady");
    const elWaiting = document.getElementById("countWaiting");
    const elHistory = document.getElementById("countHistory");
    if (elAll) elAll.textContent = countAll;
    if (elReady) elReady.textContent = countReady;
    if (elWaiting) elWaiting.textContent = countWaiting;
    if (elHistory) elHistory.textContent = countHistory;

    // 2. Cập nhật hạn mức đặt trước (tối đa 3 đầu sách)
    const activeCount = countReady + countWaiting;
    const quotaText = document.getElementById("quotaText");
    const quotaBarFill = document.getElementById("quotaBarFill");
    if (quotaText) {
      quotaText.textContent = isLoading ? "Đang tải..." : `Đang dùng ${activeCount} / 3 lượt`;
    }
    if (quotaBarFill) {
      const percent = Math.min((activeCount / 3) * 100, 100);
      quotaBarFill.style.width = `${percent}%`;
      quotaBarFill.style.background = activeCount >= 3 ? "#EF4444" : "#10B981";
    }

    if (isLoading) {
      if (emptyState) emptyState.style.display = "none";
      container.innerHTML = `
        <div class="res-state-card">
          <div class="res-state-spinner"></div>
          <div style="font-weight: 600; color: var(--color-text);">Đang tải danh sách đặt trước từ cơ sở dữ liệu...</div>
        </div>
      `;
      return;
    }

    if (loadError) {
      if (emptyState) emptyState.style.display = "none";
      container.innerHTML = `
        <div class="res-state-card">
          <div style="margin-bottom: 10px; color: #D97706;">
            <span class="material-symbols-outlined" style="font-size: 36px;">warning</span>
          </div>
          <h3 style="margin: 0 0 8px; color: var(--color-text);">Không thể tải dữ liệu đặt trước</h3>
          <p style="margin: 0 0 18px; font-size: 14px;">${safeHtml(loadError)}</p>
          <button type="button" class="btn btn-primary" onclick="reloadReservations()" style="display: inline-flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
            <span>Thử tải lại</span>
          </button>
        </div>
      `;
      return;
    }

    // 3. Lọc danh sách theo Tab đang chọn
    let filtered = reservationsData;
    if (currentFilter === "READY") {
      filtered = reservationsData.filter((r) => r.status === "READY");
    } else if (currentFilter === "WAITING") {
      filtered = reservationsData.filter((r) => r.status === "WAITING");
    } else if (currentFilter === "history") {
      filtered = reservationsData.filter(
        (r) => r.status === "FULFILLED" || r.status === "CANCELLED" || r.status === "EXPIRED"
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    // 4. Render các Card đặt trước từ Database
    container.innerHTML = filtered.map((item) => {
      const isReady = item.status === "READY";
      const isWaiting = item.status === "WAITING";
      const isCancelled = item.status === "CANCELLED";
      const isFulfilled = item.status === "FULFILLED";
      const isExpired = item.status === "EXPIRED";

      const bookTitle = safeHtml(item.book_title || "Chưa rõ nhan đề");
      const bookAuthor = safeHtml(item.book_author || "Không rõ tác giả");
      const bookIsbn = safeHtml(item.book_isbn || item.book_id || "");
      const copyCode = safeHtml(item.copy_barcode || item.copy_code || "Đang cấp mã");
      const shelfLocation = safeHtml(item.shelf_location || "Quầy thủ thư");

      let statusBadgeHtml = "";
      let statusAlertHtml = "";

      if (isReady) {
        statusBadgeHtml = `<span class="status-badge status-ready"><span class="material-symbols-outlined">check_circle</span> Sẵn sàng nhận sách (READY)</span>`;
        const deadlineDate = item.pickup_deadline ? formatDateTime(item.pickup_deadline) : "Trong vòng 48 giờ";
        statusAlertHtml = `
          <div class="ready-pickup-alert">
            <span class="material-symbols-outlined alert-icon">notifications_active</span>
            <div class="ready-pickup-text">
              <strong>Sách đã có tại quầy thư viện!</strong> Bản sao <code>${copyCode}</code> đang được giữ ưu tiên cho bạn tại <strong>${shelfLocation}</strong>.<br>
              <span class="ready-deadline-row">
                <span class="material-symbols-outlined">schedule</span>
                <span>Hạn đến nhận tại Quầy thủ thư: <strong>${safeHtml(deadlineDate)}</strong> (Giữ tối đa 2 ngày).</span>
              </span>
            </div>
          </div>
        `;
      } else if (isWaiting) {
        const pos = Number(item.queue_position || 1);
        statusBadgeHtml = `
          <span class="status-badge status-waiting"><span class="material-symbols-outlined">hourglass_top</span> Đang xếp hàng (WAITING)</span>
          <span class="queue-position-pill">Vị trí hàng chờ: <span class="queue-num">#${pos}</span></span>
        `;
        statusAlertHtml = `
          <div class="waiting-queue-alert">
            <span class="material-symbols-outlined">info</span>
            <span>Bạn đang ở <strong>vị trí #${pos}</strong> trong danh sách chờ. Khi có bạn đọc trả cuốn sách này, hệ thống sẽ tự động kích hoạt thông báo và giữ sách cho bạn trong 2 ngày!</span>
          </div>
        `;
      } else if (isFulfilled) {
        statusBadgeHtml = `<span class="status-badge status-fulfilled"><span class="material-symbols-outlined">check_circle</span> Đã nhận sách</span>`;
      } else if (isCancelled) {
        statusBadgeHtml = `<span class="status-badge status-cancelled"><span class="material-symbols-outlined">cancel</span> Đã huỷ đặt trước</span>`;
      } else if (isExpired) {
        statusBadgeHtml = `<span class="status-badge status-expired"><span class="material-symbols-outlined">warning</span> Quá hạn nhận (Đã chuyển lượt)</span>`;
      }

      // Nút huỷ đặt trước chỉ hiển thị khi WAITING hoặc READY
      const canCancel = isReady || isWaiting;
      const cancelBtnHtml = canCancel
        ? `<button type="button" class="btn-cancel-res" onclick="openCancelModal(${Number(item.id)})">Huỷ đặt trước</button>`
        : `<span style="font-size:12px; color:var(--color-muted); padding:6px 12px;">Đã đóng</span>`;

      const coverUrl = formatCoverUrl(item.book_cover);
      const coverBg = getCoverGradient(item.book_isbn || item.book_title);
      const coverFallbackHtml = `
        <div class="res-cover-fallback" style="${coverUrl ? "display:none;" : ""}">
          <span class="res-cover-tag">UNILIB KS25</span>
          <div class="res-cover-title">${bookTitle}</div>
          <div class="res-cover-author">${bookAuthor}</div>
        </div>
      `;

      return `
        <div class="res-card ${isReady ? "card-ready" : (isWaiting ? "card-waiting" : "")}" id="res-card-${Number(item.id)}">
          <!-- Bìa sách thu nhỏ -->
          <div class="res-cover-thumb" style="background: ${coverBg};">
            ${
              coverUrl
                ? `<img class="res-cover-img" src="${safeHtml(coverUrl)}" alt="${bookTitle}" onerror="this.style.display='none'; var fb=this.nextElementSibling; if(fb) fb.style.display='flex';" />`
                : ""
            }
            ${coverFallbackHtml}
          </div>

          <!-- Chi tiết thông tin đặt trước -->
          <div class="res-info-col">
            <div class="res-status-row">
              ${statusBadgeHtml}
            </div>

            <h3 class="res-book-title">${bookTitle}</h3>

            <div class="res-meta-line">
              <span><span class="material-symbols-outlined">person</span> Tác giả: <strong>${bookAuthor}</strong></span>
              <span>•</span>
              <span>Mã ISBN: <strong>${bookIsbn}</strong></span>
              <span>•</span>
              <span>Thời điểm đặt: <strong>${safeHtml(formatDateTime(item.reserved_at))}</strong></span>
            </div>

            ${statusAlertHtml}
          </div>

          <!-- Cột thao tác -->
          <div class="res-actions-col">
            <a href="book_detail.html?isbn=${encodeURIComponent(item.book_isbn || item.book_id || "")}" class="btn-detail-link">Xem chi tiết sách →</a>
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

  // Xác nhận huỷ đặt trước lên Database
  window.confirmCancelAction = async function () {
    if (!targetCancelId) return;
    const btn = document.getElementById("btnConfirmCancel");
    const originalText = btn ? btn.textContent : "Huỷ đặt trước";

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Đang huỷ...";
    }

    try {
      await api.post(`/reservations/${targetCancelId}/cancel`);
      closeCancelModal();
      showToast("✓ Đã huỷ lượt đặt trước thành công.");
      await loadReservations();
    } catch (err) {
      closeCancelModal();
      showToast(err?.message || "Không thể huỷ lượt đặt trước. Vui lòng thử lại.", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  };

  // Toast thông báo
  function showToast(message, type = "success") {
    const existing = document.querySelector(".custom-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "custom-toast";
    const bg = type === "error" ? "#991B1B" : "#1B4332";
    const icon = type === "error" ? "warning" : "check_circle";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${bg};
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
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span><span>${safeHtml(message)}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = "opacity 0.3s, transform 0.3s";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(15px)";
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // Khởi chạy khi tài liệu sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReservations);
  } else {
    loadReservations();
  }
})();
