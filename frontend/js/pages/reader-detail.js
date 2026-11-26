// ==============================================================================
// UniLib / KS25 Library — Trang Chi tiết Độc giả (reader-detail.js)
// - Đọc ?id={reader_id} (hoặc ?card_id={card_id}) từ URL
// - Tải hồ sơ & thẻ từ GET /api/readers/{id} (tự động chuyển EXPIRED nếu quá hạn)
// - Tải toàn bộ lịch sử mượn trả trực tiếp từ Module Mượn: GET /api/loans?user_id={id}
// - Hỗ trợ Gia hạn thẻ, Khoá/Mở khoá thẻ kèm lý do, và In thẻ thư viện bằng window.print()
// ==============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const mainEl = document.getElementById("detail-main-content");

  // 1. Chặn quyền (Chỉ ADMIN / LIBRARIAN)
  const token = auth.getToken();
  const staffUser = auth.getUser();
  if (!token || !staffUser || !["ADMIN", "LIBRARIAN"].includes(staffUser.role)) {
    sessionStorage.setItem("redirect_after_login", window.location.href);
    if (mainEl) {
      mainEl.innerHTML = `
        <div class="guard-box">
          <div style="margin-bottom: 10px;">
            <span class="material-symbols-outlined" style="font-size: 40px; color: var(--warning);">lock</span>
          </div>
          <h2 style="font-family:var(--font-serif);">Không có quyền truy cập</h2>
          <p style="color:var(--muted); margin-bottom:20px;">Trang Chi tiết Độc giả chỉ dành cho Thủ thư (LIBRARIAN) và Quản trị viên (ADMIN).</p>
          <a href="login.html#login" class="btn btn-primary">
            <span>Đăng nhập Thủ thư</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>`;
    }
    return;
  }

  // Đồng bộ Topbar & User Info
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  if (userAvatar) userAvatar.textContent = (staffUser.full_name || staffUser.email || "T").charAt(0).toUpperCase();
  if (userName) userName.textContent = staffUser.full_name || staffUser.email;
  if (userRole) userRole.textContent = staffUser.role === "ADMIN" ? "Quản trị viên" : "Thủ thư trực quầy";

  // Mobile Menu Toggle
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navMenu = document.getElementById("navMenu");
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      navMenu.classList.toggle("show");
    });
  }

  // User Account Dropdown
  const userProfileBtn = document.getElementById("userProfileBtn");
  const userDropdownMenu = document.getElementById("userDropdownMenu");
  const logoutMenuBtn = document.getElementById("logoutMenuBtn");

  if (userProfileBtn && userDropdownMenu) {
    userProfileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdownMenu.classList.toggle("show");
      const isShown = userDropdownMenu.classList.contains("show");
      userProfileBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
    });
  }

  // Confirm Modal Helper (Đồng bộ loan_management)
  let activeConfirmCallback = null;

  function showConfirm(options) {
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
      if (btnProceed) btnProceed.classList.add("btn-green");
      if (iconEl) iconEl.textContent = "check_circle";
    } else {
      if (iconBox) iconBox.classList.add("icon-blue");
      if (iconEl) iconEl.textContent = "help_outline";
    }

    if (btnProceed) btnProceed.textContent = options.confirmText || "Xác nhận";
    if (btnCancel) btnCancel.textContent = options.cancelText || "Hủy";

    activeConfirmCallback = options.onConfirm || null;
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  function closeConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    if (modal) {
      modal.classList.remove("active");
      modal.style.display = "none";
    }
    activeConfirmCallback = null;
  }

  function triggerLogoutConfirm(e) {
    if (e) e.stopPropagation();
    if (userDropdownMenu) userDropdownMenu.classList.remove("show");
    if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
    showConfirm({
      title: "Xác nhận đăng xuất?",
      message: "Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại không?",
      type: "red",
      confirmText: "Đăng xuất",
      cancelText: "Hủy",
      onConfirm: () => {
        if (typeof auth !== "undefined" && typeof auth.clearSession === "function") {
          auth.clearSession();
        } else {
          localStorage.clear();
          sessionStorage.clear();
        }
        window.location.href = "login.html#login";
      }
    });
  }

  if (logoutMenuBtn) logoutMenuBtn.addEventListener("click", triggerLogoutConfirm);

  // Đóng dropdown và mobile menu khi click ngoài màn hình hoặc nhấn Escape
  document.addEventListener("click", () => {
    if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
      userDropdownMenu.classList.remove("show");
      if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
    }
    if (navMenu && navMenu.classList.contains("show")) {
      navMenu.classList.remove("show");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && userDropdownMenu && userDropdownMenu.classList.contains("show")) {
      userDropdownMenu.classList.remove("show");
      if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Sự kiện trong Confirm Modal
  const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
  const btnConfirmProceed = document.getElementById("btn-confirm-proceed");
  const confirmModal = document.getElementById("confirm-modal");

  if (btnConfirmCancel) btnConfirmCancel.addEventListener("click", closeConfirmModal);
  if (btnConfirmProceed) {
    btnConfirmProceed.addEventListener("click", () => {
      const callback = activeConfirmCallback;
      closeConfirmModal();
      if (typeof callback === "function") callback();
    });
  }
  if (confirmModal) {
    confirmModal.addEventListener("click", (e) => {
      if (e.target === confirmModal) closeConfirmModal();
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const readerIdParam = urlParams.get("id");
  const cardIdParam = urlParams.get("card_id");

  if (!readerIdParam && !cardIdParam) {
    window.location.href = "readers.html";
    return;
  }

  let currentDetail = null;
  let currentLoanStatusFilter = "";

  const LOCK_REASONS = [
    "Độc giả báo mất thẻ thư viện",
    "Nợ sách quá hạn chưa hoàn trả",
    "Chưa nộp khoản phạt vi phạm",
    "Vi phạm nội quy phòng đọc",
  ];
  const UNLOCK_REASONS = [
    "Độc giả đã tìm thấy thẻ và xác minh tại quầy",
    "Độc giả đã trả sách quá hạn và hoàn tất nộp phạt",
    "Đã cấp lại thẻ RFID mới",
  ];

  function formatDateVN(val) {
    if (!val) return "--/--/----";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  function renderBarcodeSvg(code) {
    const str = String(code || "LC-0000");
    let bars = "";
    let x = 2;
    for (let i = 0; i < str.length * 4; i++) {
      const charCode = str.charCodeAt(i % str.length);
      const w = (charCode + i * 7) % 3 === 0 ? 2.5 : 1.3;
      const gap = (charCode + i * 3) % 2 === 0 ? 1.8 : 1.1;
      if (x + w < 126) bars += `<rect x="${x.toFixed(1)}" y="2" width="${w}" height="24" fill="#1A202C"/>`;
      x += w + gap;
    }
    return `<svg width="128" height="28" viewBox="0 0 128 28" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
  }

  // ---------- 2. TẢI CHI TIẾT ĐỘC GIẢ & PHÔI THẺ ----------
  async function loadDetail() {
    try {
      const detail = cardIdParam
        ? await api.get(`/library-cards/${cardIdParam}`)
        : await api.get(`/readers/${readerIdParam}`);

      currentDetail = detail;

      document.getElementById("detail-reader-heading").textContent = `${detail.full_name} (${detail.card_code || "Chưa có thẻ"})`;
      document.getElementById("detail-reader-sub").textContent = `Hồ sơ độc giả #${detail.reader_id} · Tạo lúc ${formatDateTime(detail.created_at)}`;

      // Hồ sơ cá nhân
      document.getElementById("info-fullname").textContent = detail.full_name;
      document.getElementById("info-email").textContent = detail.email;
      document.getElementById("info-phone").textContent = detail.phone || "—";
      document.getElementById("info-borrow-stat").innerHTML = `${detail.borrowed_count}/${detail.max_borrow_books} cuốn ${
        detail.overdue_count > 0 ? `<span style="color:var(--danger);">(Quá hạn ${detail.overdue_count})</span>` : ""
      }`;
      document.getElementById("info-fine-stat").innerHTML =
        detail.unpaid_fine_amount > 0
          ? `<span style="color:var(--danger);">${formatMoney(detail.unpaid_fine_amount)}</span>`
          : `<span style="color:var(--success);">0 ₫ (Sạch phạt)</span>`;
      document.getElementById("info-lock-reason").textContent = detail.lock_reason || "—";

      const accPill = document.getElementById("detail-account-pill");
      accPill.textContent = detail.user_status;
      accPill.className = `status-pill ${detail.user_status === "ACTIVE" ? "status-active" : "status-locked"}`;

      // Phôi Thẻ Thư Viện
      const code = detail.card_code || `USER-${detail.reader_id}`;
      document.getElementById("card-preview-avatar").textContent = (detail.full_name || "U").charAt(0).toUpperCase();
      document.getElementById("card-preview-name").textContent = (detail.full_name || "").toUpperCase();
      document.getElementById("card-preview-code").textContent = code;
      document.getElementById("card-preview-type").textContent = `${detail.card_type || "STANDARD"} (${detail.max_borrow_books} cuốn)`;
      document.getElementById("card-preview-expiry").textContent = formatDateVN(detail.expiry_date);
      document.getElementById("card-preview-barcode").innerHTML = renderBarcodeSvg(code);
      document.getElementById("card-preview-barcode-text").textContent = `LIB-${code}`;

      const statusEl = document.getElementById("card-preview-status");
      const readyBadge = document.getElementById("detail-ready-badge");
      const lockBtns = [document.getElementById("btn-detail-lock"), document.getElementById("btn-card-lock")];
      if (detail.card_status === "ACTIVE") {
        statusEl.textContent = "ĐANG HOẠT ĐỘNG";
        statusEl.className = "id-status-text id-status-active";
        if (readyBadge) readyBadge.textContent = "Sẵn sàng in";
        lockBtns.forEach((b) => {
          if (b) {
            b.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Khóa thẻ</span>';
            b.className = b.id === "btn-card-lock" ? "btn btn-soft-danger btn-sm" : "btn btn-soft-danger";
          }
        });
      } else if (detail.card_status === "EXPIRED") {
        statusEl.textContent = "ĐÃ HẾT HẠN";
        statusEl.className = "id-status-text id-status-expired";
        if (readyBadge) readyBadge.textContent = "Cần gia hạn";
        lockBtns.forEach((b) => {
          if (b) {
            b.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Khóa thẻ</span>';
            b.className = b.id === "btn-card-lock" ? "btn btn-soft-danger btn-sm" : "btn btn-soft-danger";
          }
        });
      } else {
        statusEl.textContent = "TẠM KHÓA";
        statusEl.className = "id-status-text id-status-locked";
        if (readyBadge) readyBadge.textContent = "Thẻ đang khóa";
        lockBtns.forEach((b) => {
          if (b) {
            b.innerHTML = '<span class="material-symbols-outlined">lock_open</span><span>Mở khóa thẻ</span>';
            b.className = b.id === "btn-card-lock" ? "btn btn-soft-success btn-sm" : "btn btn-soft-success";
          }
        });
      }

      // Lịch sử thao tác trên thẻ
      const logsTbody = document.getElementById("detail-card-logs-tbody");
      if (logsTbody) {
        if (!detail.card_logs || detail.card_logs.length === 0) {
          logsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:18px; color:var(--muted);">Chưa có lịch sử gia hạn hoặc khóa/mở thẻ.</td></tr>`;
        } else {
          logsTbody.innerHTML = detail.card_logs
            .map(
              (lg) => `
            <tr>
              <td><span class="code-chip">${escapeHtml(lg.action)}</span></td>
              <td>
                <span class="code-chip">${escapeHtml(lg.old_status || "—")} → ${escapeHtml(lg.new_status)}</span>
                ${
                  lg.new_expiry_date && lg.old_expiry_date !== lg.new_expiry_date
                    ? `<div style="font-size:11.5px; color:var(--muted); margin-top:3px;">Hạn: ${formatDateVN(lg.old_expiry_date)} → ${formatDateVN(lg.new_expiry_date)}</div>`
                    : ""
                }
              </td>
              <td>${escapeHtml(lg.reason || "—")}</td>
              <td>${escapeHtml(lg.performer_name || "Hệ thống")}</td>
              <td>${formatDateTime(lg.created_at)}</td>
            </tr>`
            )
            .join("");
        }
      }

      await loadLoanHistoryFromLoanModule(detail.reader_id);
    } catch (err) {
      if (mainEl) {
        mainEl.innerHTML = `
          <div class="guard-box">
            <div style="margin-bottom: 10px;">
              <span class="material-symbols-outlined" style="font-size: 40px; color: var(--danger);">error</span>
            </div>
            <h3 style="color: var(--danger); margin: 0 0 16px;">${escapeHtml(err.message)}</h3>
            <a href="readers.html" class="btn-back-readers" style="margin-bottom: 0;">
              <span class="material-symbols-outlined">arrow_back</span>
              <span>Quay lại Danh sách Độc giả</span>
            </a>
          </div>`;
      }
    }
  }

  // ---------- 3. LẤY LỊCH SỬ MƯỢN TRẢ TỪ MODULE MƯỢN (GET /api/loans?user_id=...) ----------
  let allUserLoanRows = [];
  let currentLoanSearchKeyword = "";

  function updateLoanTabCounts(rows) {
    const total = rows.length;
    let borrowed = 0;
    let pending = 0;
    let returned = 0;

    rows.forEach(({ ln, it }) => {
      const s = (ln.status || "").toUpperCase();
      if (it.return_date || s === "RETURNED") {
        returned++;
      } else if (s === "PENDING") {
        pending++;
      } else if (s === "BORROWED") {
        borrowed++;
      }
    });

    const elAll = document.getElementById("count-loan-all");
    const elBorrowed = document.getElementById("count-loan-borrowed");
    const elPending = document.getElementById("count-loan-pending");
    const elReturned = document.getElementById("count-loan-returned");

    if (elAll) elAll.textContent = total;
    if (elBorrowed) elBorrowed.textContent = borrowed;
    if (elPending) elPending.textContent = pending;
    if (elReturned) elReturned.textContent = returned;
  }

  function renderFilteredLoans() {
    const tbody = document.getElementById("detail-loans-tbody");
    if (!tbody) return;

    const filtered = allUserLoanRows.filter(({ ln, it }) => {
      // 1. Lọc theo trạng thái
      if (currentLoanStatusFilter) {
        const s = (ln.status || "").toUpperCase();
        if (currentLoanStatusFilter === "RETURNED") {
          if (!it.return_date && s !== "RETURNED") return false;
        } else if (currentLoanStatusFilter === "BORROWED") {
          if (s !== "BORROWED" || it.return_date) return false;
        } else if (currentLoanStatusFilter === "PENDING") {
          if (s !== "PENDING") return false;
        }
      }

      // 2. Lọc theo từ khóa tìm kiếm
      if (currentLoanSearchKeyword) {
        const kw = currentLoanSearchKeyword.toLowerCase();
        const matchCode = String(ln.id || "").toLowerCase().includes(kw);
        const matchTitle = (it.book_title || "").toLowerCase().includes(kw);
        const matchIsbn = (it.book_isbn || "").toLowerCase().includes(kw);
        const matchCopy = (it.copy_code || "").toLowerCase().includes(kw);
        if (!matchCode && !matchTitle && !matchIsbn && !matchCopy) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:26px; color:var(--muted);">Chưa có phiếu mượn trả nào khớp bộ lọc.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map(({ ln, it }) => {
        let pill = `<span class="status-pill status-info">${escapeHtml(ln.status)}</span>`;
        if (it.return_date) {
          pill = it.is_overdue
            ? `<span class="status-pill status-locked">Trả trễ ${it.overdue_days} ngày</span>`
            : `<span class="status-pill status-active">Đã trả đúng hạn</span>`;
        } else if (ln.status === "BORROWED") {
          pill = it.is_overdue
            ? `<span class="status-pill status-locked">Quá hạn ${it.overdue_days} ngày</span>`
            : `<span class="status-pill status-info">Đang mượn</span>`;
        } else if (ln.status === "PENDING") {
          pill = `<span class="status-pill status-expired">Chờ duyệt</span>`;
        } else if (ln.status === "CANCELLED" || ln.status === "REJECTED") {
          pill = `<span class="status-pill status-locked">${escapeHtml(ln.status)}</span>`;
        }

        return `
          <tr>
            <td>
              <span class="code-chip">#PM-${ln.id}</span>
              <div style="font-size:11px; color:var(--muted); margin-top:3px;">${escapeHtml(ln.borrow_type)}</div>
            </td>
            <td>
              <strong>${escapeHtml(it.book_title)}</strong>
              <div style="font-size:11.5px; font-family:var(--font-mono); color:var(--muted);">
                ISBN: ${escapeHtml(it.book_isbn)} ${it.copy_code ? `· Bản sao: ${escapeHtml(it.copy_code)}` : ""}
              </div>
            </td>
            <td>${formatDateVN(ln.borrowed_at || ln.created_at)}</td>
            <td>
              <div>Hạn: <span class="code-chip">${formatDateVN(it.due_date || ln.due_date)}</span></div>
              ${
                it.return_date
                  ? `<div style="font-size:12px; color:var(--success); margin-top:3px;">Đã trả: ${formatDateVN(it.return_date)}</div>`
                  : it.estimated_fine > 0
                  ? `<div style="font-size:12px; color:var(--danger); margin-top:3px;">Phạt ước tính: ${formatMoney(it.estimated_fine)}</div>`
                  : ""
              }
            </td>
            <td>${pill}</td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadLoanHistoryFromLoanModule(readerId) {
    const tbody = document.getElementById("detail-loans-tbody");
    if (!tbody) return;
    try {
      const loans = await api.get("/loans", { user_id: readerId, limit: 100 });
      const rows = [];
      (loans || []).forEach((ln) => {
        (ln.loan_items || []).forEach((it) => {
          rows.push({ ln, it });
        });
      });
      allUserLoanRows = rows;
      updateLoanTabCounts(allUserLoanRows);
      renderFilteredLoans();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger); padding:18px;">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // Đồng bộ Filter Tabs và Select trạng thái (chuẩn loan_management)
  const loanStatusTabs = document.getElementById("loan-status-tabs");
  const loanFilterStatus = document.getElementById("loan-filter-status");
  const loanSearchInput = document.getElementById("loan-search-keyword");
  const btnResetLoanFilter = document.getElementById("btn-reset-loan-filter");

  function syncLoanStatusFilter(statusVal) {
    currentLoanStatusFilter = statusVal;
    if (loanFilterStatus) loanFilterStatus.value = statusVal;
    if (loanStatusTabs) {
      loanStatusTabs.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-loan-status") === statusVal);
      });
    }
    renderFilteredLoans();
  }

  loanStatusTabs?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-loan-status]");
    if (!btn) return;
    const val = btn.getAttribute("data-loan-status");
    syncLoanStatusFilter(val);
  });

  loanFilterStatus?.addEventListener("change", () => {
    syncLoanStatusFilter(loanFilterStatus.value);
  });

  loanSearchInput?.addEventListener("input", () => {
    currentLoanSearchKeyword = loanSearchInput.value.trim();
    renderFilteredLoans();
  });

  btnResetLoanFilter?.addEventListener("click", () => {
    if (loanSearchInput) loanSearchInput.value = "";
    currentLoanSearchKeyword = "";
    syncLoanStatusFilter("");
  });

  // ---------- 4. IN THẺ (WINDOW.PRINT), GIA HẠN, KHÓA/MỞ THẺ ----------
  [document.getElementById("btn-detail-print"), document.getElementById("btn-card-print")].forEach((b) => {
    b?.addEventListener("click", () => window.print());
  });

  const modalExtend = document.getElementById("modal-extend");
  const extendMonths = document.getElementById("extend-months");
  const extendCustomWrap = document.getElementById("extend-custom-wrap");
  extendMonths?.addEventListener("change", () => {
    extendCustomWrap.hidden = extendMonths.value !== "custom";
  });

  [document.getElementById("btn-detail-extend"), document.getElementById("btn-card-extend")].forEach((b) => {
    b?.addEventListener("click", () => {
      if (!currentDetail?.card_id) {
        showToast("Độc giả chưa có thẻ thư viện.", "error");
        return;
      }
      modalExtend.hidden = false;
    });
  });

  document.getElementById("extend-card-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentDetail?.card_id) return;
    const monthsVal = extendMonths.value;
    const newDate = document.getElementById("extend-new-date").value;
    const cardType = document.getElementById("extend-card-type").value;
    const reason = document.getElementById("extend-reason").value.trim();
    const btn = document.getElementById("btn-submit-extend");
    try {
      btn.disabled = true;
      const updated = await api.post(`/library-cards/${currentDetail.card_id}/extend`, {
        months: monthsVal === "custom" ? 12 : Number(monthsVal),
        new_expiry_date: monthsVal === "custom" && newDate ? newDate : null,
        card_type: cardType || null,
        reason: reason || "Gia hạn thẻ thư viện định kỳ",
      });
      showToast(`Đã gia hạn thẻ ${updated.card_code} đến ${formatDateVN(updated.expiry_date)}!`);
      modalExtend.hidden = true;
      await loadDetail();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  const modalLock = document.getElementById("modal-lock");
  [document.getElementById("btn-detail-lock"), document.getElementById("btn-card-lock")].forEach((b) => {
    b?.addEventListener("click", () => {
      if (!currentDetail?.card_id) return;
      const action = currentDetail.card_status === "LOCKED" ? "UNLOCK" : "LOCK";
      document.getElementById("lock-action-type").value = action;
      const titleEl = document.getElementById("lock-modal-title");
      const chipsWrap = document.getElementById("lock-quick-chips");
      const submitBtn = document.getElementById("btn-submit-lock");
      const reasonInput = document.getElementById("lock-reason-input");
      reasonInput.value = "";
      if (action === "LOCK") {
        titleEl.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Khóa thẻ thư viện</span>';
        submitBtn.textContent = "Xác nhận Khóa thẻ";
        submitBtn.className = "btn btn-soft-danger";
        chipsWrap.innerHTML = LOCK_REASONS.map((r) => `<button type="button" class="quick-chip">${escapeHtml(r)}</button>`).join("");
      } else {
        titleEl.innerHTML = '<span class="material-symbols-outlined">lock_open</span><span>Mở khóa thẻ thư viện</span>';
        submitBtn.textContent = "Xác nhận Mở thẻ";
        submitBtn.className = "btn btn-primary";
        chipsWrap.innerHTML = UNLOCK_REASONS.map((r) => `<button type="button" class="quick-chip">${escapeHtml(r)}</button>`).join("");
      }
      modalLock.hidden = false;
      reasonInput.focus();
    });
  });

  document.getElementById("lock-quick-chips")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".quick-chip");
    if (chip) document.getElementById("lock-reason-input").value = chip.textContent.trim();
  });

  document.getElementById("lock-card-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentDetail?.card_id) return;
    const action = document.getElementById("lock-action-type").value;
    const reason = document.getElementById("lock-reason-input").value.trim();
    const btn = document.getElementById("btn-submit-lock");
    try {
      btn.disabled = true;
      const ep = action === "LOCK" ? `/library-cards/${currentDetail.card_id}/lock` : `/library-cards/${currentDetail.card_id}/unlock`;
      await api.post(ep, { reason });
      showToast(action === "LOCK" ? "Đã khóa thẻ thành công!" : "Đã mở khóa thẻ thành công!");
      modalLock.hidden = true;
      await loadDetail();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.getAttribute("data-close")).hidden = true;
    });
  });

  loadDetail();
});
