// ==============================================================================
// UniLib / KS25 Library — Quản lý Độc giả & Thẻ thư viện (readers.js)
// - Tìm kiếm theo Mã thẻ / Họ tên / SĐT / Email + lọc Hạng thẻ & Trạng thái
// - Tự động chuyển thẻ quá hạn sang EXPIRED khi kiểm tra
// - Chọn độc giả hiển thị Phôi Thẻ Thư Viện + In thẻ bằng window.print()
// - Lấy lịch sử mượn trả trực tiếp từ module Mượn: GET /api/loans?user_id=...
// - Điều hướng sang trang chi tiết độc giả riêng: reader-detail.html?id=...
// - Gia hạn thẻ, Khoá/Mở khoá thẻ kèm lý do, Thêm độc giả mới, Xuất CSV
// ==============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const mainEl = document.getElementById("readers-main-content");

  // ---------- 0. CHẶN TRANG THEO ROLE (CHỈ ADMIN / LIBRARIAN) ----------
  function enforceStaffGuard() {
    const token = auth.getToken();
    const user = auth.getUser();
    if (!token || !user) {
      sessionStorage.setItem("redirect_after_login", window.location.href);
      if (mainEl) {
        mainEl.innerHTML = `
          <div class="guard-box">
            <span class="material-symbols-outlined" style="font-size:42px; color:var(--primary); margin-bottom:10px; display:block;">lock</span>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--muted);">HTTP 401 · UNAUTHORIZED</div>
            <h2 style="font-family:var(--font-serif); margin:8px 0;">Yêu cầu đăng nhập Thủ thư / Quản trị</h2>
            <p style="color:var(--muted); font-size:14px; margin-bottom:22px;">Vui lòng đăng nhập tài khoản Thủ thư hoặc Quản trị viên để truy cập phân hệ Quản lý Độc giả &amp; Thẻ.</p>
            <a href="login.html#login" class="btn btn-primary">Đăng nhập ngay →</a>
          </div>`;
      }
      return null;
    }
    if (!["ADMIN", "LIBRARIAN"].includes(user.role)) {
      if (mainEl) {
        mainEl.innerHTML = `
          <div class="guard-box">
            <span class="material-symbols-outlined" style="font-size:42px; color:var(--danger); margin-bottom:10px; display:block;">block</span>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--danger);">HTTP 403 · FORBIDDEN</div>
            <h2 style="font-family:var(--font-serif); margin:8px 0;">Không đủ quyền truy cập</h2>
            <p style="color:var(--muted); font-size:14px; margin-bottom:22px;">Tài khoản <strong>${escapeHtml(user.full_name || user.email)}</strong> (${escapeHtml(user.role)}) không có quyền quản lý thẻ thư viện.</p>
            <a href="home.html" class="btn btn-primary">Về Trang chủ Độc giả →</a>
          </div>`;
      }
      return null;
    }
    return user;
  }

  const staffUser = enforceStaffGuard();
  if (!staffUser) return;

  // Đồng bộ Topbar & User Info (Đồng bộ loan_management)
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
          localStorage.removeItem("access_token");
          localStorage.removeItem("token");
          localStorage.removeItem("user_info");
          localStorage.removeItem("library_card");
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("user_info");
        }
        window.location.href = "login.html#login";
      }
    });
  }

  if (logoutMenuBtn) logoutMenuBtn.addEventListener("click", triggerLogoutConfirm);

  // Đóng dropdown và mobile menu khi click ngoài màn hình
  document.addEventListener("click", () => {
    if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
      userDropdownMenu.classList.remove("show");
      if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
    }
    if (navMenu && navMenu.classList.contains("show")) {
      navMenu.classList.remove("show");
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (confirmModal && (confirmModal.classList.contains("active") || confirmModal.style.display === "flex")) {
        closeConfirmModal();
      }
    }
  });

  // ---------- STATE ----------
  let allItems = [];
  let selectedReader = null;
  let currentPage = 1;
  let pageSize = 10;

  const tbody = document.getElementById("readers-tbody");
  const kwInput = document.getElementById("filter-keyword");
  const typeSelect = document.getElementById("filter-card-type");
  const statusSelect = document.getElementById("filter-status");
  const pageSizeSelect = document.getElementById("page-size-select");

  const LOCK_REASONS = [
    "Độc giả báo mất thẻ thư viện",
    "Vi phạm trễ hạn sách chưa hoàn trả",
    "Chưa thanh toán tiền phạt quá hạn/hỏng sách",
    "Vi phạm nội quy thư viện",
  ];
  const UNLOCK_REASONS = [
    "Độc giả đã tìm thấy thẻ và xác nhận tại quầy",
    "Độc giả đã hoàn trả sách quá hạn và nộp đủ phạt",
    "Đã cấp lại thẻ mới và kích hoạt quyền mượn",
  ];

  // ---------- TIỆN ÍCH VẼ BARCODE SVG & FORMAT NGÀY ----------
  function formatDateVN(val) {
    if (!val) return "--/--/----";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  function renderBarcodeSvg(code) {
    const str = String(code || "LC-0000");
    let bars = "";
    let x = 2;
    for (let i = 0; i < str.length * 4; i++) {
      const charCode = str.charCodeAt(i % str.length);
      const w = ((charCode + i * 7) % 3 === 0) ? 2.5 : 1.3;
      const gap = ((charCode + i * 3) % 2 === 0) ? 1.8 : 1.1;
      if (x + w < 126) {
        bars += `<rect x="${x.toFixed(1)}" y="2" width="${w}" height="24" fill="#1A202C"/>`;
      }
      x += w + gap;
    }
    return `<svg width="128" height="28" viewBox="0 0 128 28" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
  }

  function renderStatusPill(status) {
    if (status === "ACTIVE") return `<span class="status-pill status-active">Hoạt động</span>`;
    if (status === "LOCKED") return `<span class="status-pill status-locked">Tạm khóa</span>`;
    if (status === "EXPIRED") return `<span class="status-pill status-expired">Hết hạn</span>`;
    return `<span class="status-pill">Chưa có thẻ</span>`;
  }

  // ---------- 1. TẢI DANH SÁCH ĐỘC GIẢ & THỐNG KÊ ----------
  async function loadReaders(keepSelectedId = null) {
    if (!tbody) return;
    try {
      const params = {};
      if (kwInput?.value.trim()) params.q = kwInput.value.trim();
      if (typeSelect?.value) params.card_type = typeSelect.value;
      if (statusSelect?.value) params.status = statusSelect.value;

      const res = await api.get("/library-cards", params);
      allItems = res.items || [];

      const totalAll = (res.active_count || 0) + (res.expired_count || 0) + (res.locked_count || 0);
      const activeRate = totalAll > 0 ? ((res.active_count / totalAll) * 100).toFixed(1) : "0.0";
      const soonOrExpired = allItems.filter(
        (r) => r.card_status === "EXPIRED" || (r.card_status === "ACTIVE" && r.days_remaining !== null && r.days_remaining <= 30)
      ).length;

      document.getElementById("kpi-total").textContent = totalAll;
      document.getElementById("kpi-active").textContent = res.active_count ?? 0;
      document.getElementById("kpi-active-rate").innerHTML = `<span class="material-symbols-outlined">check_circle</span><span>Tỷ lệ ${activeRate}% thẻ hợp lệ</span>`;
      document.getElementById("kpi-locked").textContent = res.locked_count ?? 0;
      document.getElementById("kpi-expiring").textContent = Math.max(res.expired_count || 0, soonOrExpired);
      document.getElementById("table-total-badge").textContent = `Tổng ${allItems.length} hồ sơ`;

      if (res.auto_expired_now > 0) {
        showToast(`Hệ thống vừa tự động chuyển ${res.auto_expired_now} thẻ quá hạn sang EXPIRED!`);
      }

      currentPage = 1;
      renderTablePage();

      // Chọn lại độc giả trước đó hoặc độc giả đầu tiên
      const targetId = keepSelectedId || selectedReader?.reader_id;
      const match = allItems.find((r) => r.reader_id === targetId) || allItems[0] || null;
      if (match) {
        selectReader(match);
      } else {
        clearPreview();
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger); padding:20px;">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderTablePage() {
    if (!tbody) return;
    const total = allItems.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * pageSize;
    const slice = allItems.slice(startIdx, startIdx + pageSize);

    document.getElementById("table-range-text").textContent =
      total === 0 ? "0 trong 0" : `${startIdx + 1} - ${Math.min(startIdx + slice.length, total)} trong ${total}`;

    if (slice.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--muted);">Không tìm thấy độc giả phù hợp.</td></tr>`;
    } else {
      tbody.innerHTML = slice
        .map((r) => {
          const isSelected = selectedReader && selectedReader.reader_id === r.reader_id;
          const initial = (r.full_name || "U").charAt(0).toUpperCase();
          return `
            <tr data-reader-id="${r.reader_id}" class="${isSelected ? "is-selected" : ""}">
              <td>
                <div class="reader-cell">
                  <div class="reader-avatar">${escapeHtml(initial)}</div>
                  <div>
                    <div class="reader-name-line">
                      <a href="reader-detail.html?id=${r.reader_id}" class="reader-name-link" onclick="event.stopPropagation()">${escapeHtml(r.full_name)}</a>
                      <span class="code-chip">${escapeHtml(r.card_code || "NO-CARD")}</span>
                    </div>
                    <div class="reader-sub-line">${escapeHtml(r.email)} · ${escapeHtml(r.phone || "Chưa có SĐT")}</div>
                  </div>
                </div>
              </td>
              <td>${renderStatusPill(r.card_status)}</td>
              <td><strong>${r.borrowed_count}</strong>/${r.max_borrow_books} cuốn</td>
              <td style="text-align:right;">
                <div class="row-actions">
                  <a href="reader-detail.html?id=${r.reader_id}" class="row-icon-btn" title="Mở trang chi tiết độc giả & lịch sử mượn trả" onclick="event.stopPropagation()">
                    <span class="material-symbols-outlined">visibility</span>
                  </a>
                  <button type="button" class="row-icon-btn" data-quick-print="${r.reader_id}" title="In thẻ thư viện (window.print)">
                    <span class="material-symbols-outlined">print</span>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("");
    }

    // Pager buttons
    const pagerEl = document.getElementById("table-pager");
    if (pagerEl) {
      let html = `<button type="button" class="pager-btn" data-go-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>‹</button>`;
      for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
          html += `<button type="button" class="pager-btn ${p === currentPage ? "active" : ""}" data-go-page="${p}">${p}</button>`;
        }
      }
      html += `<button type="button" class="pager-btn" data-go-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>›</button>`;
      pagerEl.innerHTML = html;
    }
  }

  // ---------- 2. HIỂN THỊ PHÔI THẺ THƯ VIỆN & LỊCH SỬ TỪ MODULE MƯỢN ----------
  function clearPreview() {
    selectedReader = null;
    document.getElementById("card-preview-name").textContent = "CHƯA CHỌN ĐỘC GIẢ";
    document.getElementById("card-preview-code").textContent = "—";
    document.getElementById("card-preview-type").textContent = "—";
    document.getElementById("card-preview-expiry").textContent = "--/--/----";
    document.getElementById("card-preview-barcode").innerHTML = renderBarcodeSvg("UNILIB");
    document.getElementById("card-preview-barcode-text").textContent = "—";
    document.getElementById("recent-loans-list").innerHTML = `<div style="font-size:13px; color:var(--muted);">Chưa có dữ liệu độc giả.</div>`;
  }

  async function selectReader(reader, triggerPrint = false) {
    selectedReader = reader;

    // Highlight dòng đang chọn
    document.querySelectorAll("#readers-tbody tr").forEach((tr) => {
      tr.classList.toggle("is-selected", Number(tr.getAttribute("data-reader-id")) === reader.reader_id);
    });

    // Cập nhật Phôi Thẻ Thư Viện
    const code = reader.card_code || `USER-${reader.reader_id}`;
    document.getElementById("card-preview-avatar").textContent = (reader.full_name || "U").charAt(0).toUpperCase();
    document.getElementById("card-preview-name").textContent = (reader.full_name || "").toUpperCase();
    document.getElementById("card-preview-code").textContent = code;
    document.getElementById("card-preview-type").textContent = `${reader.card_type || "STANDARD"} (${reader.max_borrow_books} cuốn)`;
    document.getElementById("card-preview-expiry").textContent = formatDateVN(reader.expiry_date);
    document.getElementById("card-preview-barcode").innerHTML = renderBarcodeSvg(code);
    document.getElementById("card-preview-barcode-text").textContent = `LIB-${code}`;

    const statusEl = document.getElementById("card-preview-status");
    const readyBadge = document.getElementById("preview-ready-badge");
    const lockBtn = document.getElementById("btn-lock-card");
    const reasonEl = document.getElementById("card-preview-reason");

    if (reader.card_status === "ACTIVE") {
      statusEl.textContent = "ĐANG HOẠT ĐỘNG";
      statusEl.className = "id-status-text id-status-active";
      readyBadge.textContent = "Sẵn sàng in";
      lockBtn.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Khóa thẻ</span>';
      lockBtn.className = "btn btn-soft-danger btn-sm";
    } else if (reader.card_status === "EXPIRED") {
      statusEl.textContent = "ĐÃ HẾT HẠN";
      statusEl.className = "id-status-text id-status-expired";
      readyBadge.textContent = "Cần gia hạn";
      lockBtn.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Khóa thẻ</span>';
      lockBtn.className = "btn btn-soft-danger btn-sm";
    } else if (reader.card_status === "LOCKED") {
      statusEl.textContent = "TẠM KHÓA";
      statusEl.className = "id-status-text id-status-locked";
      readyBadge.textContent = "Thẻ đang khóa";
      lockBtn.innerHTML = '<span class="material-symbols-outlined">lock_open</span><span>Mở thẻ</span>';
      lockBtn.className = "btn btn-soft-success btn-sm";
    }

    if (reader.card_status === "LOCKED" && reader.lock_reason) {
      reasonEl.style.display = "block";
      reasonEl.textContent = `Lý do khóa: ${reader.lock_reason}`;
    } else {
      reasonEl.style.display = "none";
    }

    // Cập nhật link trang Chi tiết độc giả
    const detailUrl = `reader-detail.html?id=${reader.reader_id}`;
    document.getElementById("link-view-all-detail").href = detailUrl;
    document.getElementById("link-open-detail-page").href = detailUrl;

    // Cập nhật thông báo tiền phạt
    const fineEl = document.getElementById("preview-fine-status");
    if (reader.unpaid_fine_amount > 0) {
      fineEl.innerHTML = `<span style="color:var(--danger); font-weight:700; display:inline-flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:15px;">warning</span><span>Nợ phạt: ${formatMoney(reader.unpaid_fine_amount)}</span></span>`;
    } else {
      fineEl.innerHTML = `<span style="color:var(--success); display:inline-flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:15px;">check_circle</span><span>Không nợ phạt quá hạn</span></span>`;
    }

    if (triggerPrint) {
      setTimeout(() => window.print(), 120);
    }

    // Gọi trực tiếp Module Mượn (GET /api/loans?user_id=...) để lấy lịch sử mượn trả!
    await loadRecentLoansFromLoanModule(reader.reader_id);
  }

  async function loadRecentLoansFromLoanModule(readerId) {
    const listEl = document.getElementById("recent-loans-list");
    const linkAll = document.getElementById("link-view-all-detail");
    if (!listEl) return;

    listEl.innerHTML = `<div style="font-size:12.5px; color:var(--muted);">Đang tải lịch sử từ module Mượn...</div>`;
    try {
      const loans = await api.get("/loans", { user_id: readerId, limit: 20 });
      const flatItems = [];
      (loans || []).forEach((ln) => {
        (ln.loan_items || []).forEach((it) => {
          flatItems.push({
            loan_id: ln.id,
            loan_status: ln.status,
            borrowed_at: ln.borrowed_at || ln.created_at,
            due_date: it.due_date || ln.due_date,
            return_date: it.return_date,
            book_title: it.book_title,
            copy_code: it.copy_code,
            is_overdue: it.is_overdue,
            overdue_days: it.overdue_days,
            estimated_fine: it.estimated_fine,
          });
        });
      });

      if (linkAll) linkAll.textContent = `Xem tất cả (${flatItems.length}) →`;

      if (flatItems.length === 0) {
        listEl.innerHTML = `<div style="font-size:13px; color:var(--muted); padding:8px 0;">Độc giả chưa có lịch sử mượn sách nào.</div>`;
        return;
      }

      listEl.innerHTML = flatItems
        .slice(0, 4)
        .map((it) => {
          let badgeHtml = `<span class="status-pill status-info">${escapeHtml(it.loan_status)}</span>`;
          let subRight = "";
          if (it.return_date) {
            badgeHtml = it.is_overdue
              ? `<span class="status-pill status-locked">Trả trễ ${it.overdue_days} ngày</span>`
              : `<span class="status-pill status-active">Đã trả đúng hạn</span>`;
            subRight = `Trả: ${formatDateVN(it.return_date)}`;
          } else if (it.loan_status === "BORROWED") {
            if (it.is_overdue) {
              badgeHtml = `<span class="status-pill status-locked">Quá hạn ${it.overdue_days} ngày</span>`;
              subRight = `Phạt: ${formatMoney(it.estimated_fine)}`;
            } else {
              badgeHtml = `<span class="status-pill status-info">Đang mượn</span>`;
              subRight = `Hạn: ${formatDateVN(it.due_date)}`;
            }
          } else if (it.loan_status === "PENDING") {
            badgeHtml = `<span class="status-pill status-expired">Chờ duyệt</span>`;
          }

          return `
            <div class="loan-mini-item">
              <div style="min-width:0;">
                <div class="loan-mini-title">${escapeHtml(it.book_title)}</div>
                <div class="loan-mini-meta">Phiếu #${it.loan_id} · Mượn: ${formatDateVN(it.borrowed_at)}</div>
              </div>
              <div style="text-align:right; flex-shrink:0;">
                ${badgeHtml}
                ${subRight ? `<div style="font-size:11px; color:var(--muted); margin-top:4px;">${escapeHtml(subRight)}</div>` : ""}
              </div>
            </div>
          `;
        })
        .join("");
    } catch {
      listEl.innerHTML = `<div style="font-size:12.5px; color:var(--danger);">Không tải được lịch sử mượn trả.</div>`;
    }
  }

  // ---------- 3. SỰ KIỆN BẢNG, IN THẺ (WINDOW.PRINT), GIA HẠN, KHÓA/MỞ THẺ ----------
  tbody?.addEventListener("click", (e) => {
    const printBtn = e.target.closest("[data-quick-print]");
    if (printBtn) {
      e.stopPropagation();
      const id = Number(printBtn.getAttribute("data-quick-print"));
      const r = allItems.find((x) => x.reader_id === id);
      if (r) selectReader(r, true);
      return;
    }
    const tr = e.target.closest("tr[data-reader-id]");
    if (!tr) return;
    const id = Number(tr.getAttribute("data-reader-id"));
    const r = allItems.find((x) => x.reader_id === id);
    if (r) selectReader(r, false);
  });

  document.getElementById("table-pager")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-go-page]");
    if (!btn || btn.disabled) return;
    currentPage = Number(btn.getAttribute("data-go-page"));
    renderTablePage();
  });

  pageSizeSelect?.addEventListener("change", () => {
    pageSize = Number(pageSizeSelect.value) || 10;
    currentPage = 1;
    renderTablePage();
  });

  // Nút In thẻ trên panel Phôi thẻ
  document.getElementById("btn-print-card")?.addEventListener("click", () => {
    if (!selectedReader) {
      showToast("Vui lòng chọn 1 độc giả trước khi in thẻ.", "error");
      return;
    }
    window.print();
  });

  // Nút Gia hạn trên panel Phôi thẻ
  const modalExtend = document.getElementById("modal-extend");
  const extendMonths = document.getElementById("extend-months");
  const extendCustomWrap = document.getElementById("extend-custom-wrap");

  extendMonths?.addEventListener("change", () => {
    extendCustomWrap.hidden = extendMonths.value !== "custom";
  });

  document.getElementById("btn-extend-card")?.addEventListener("click", () => {
    if (!selectedReader || !selectedReader.card_id) {
      showToast("Độc giả này chưa có thẻ thư viện.", "error");
      return;
    }
    document.getElementById("extend-card-id").value = selectedReader.card_id;
    document.getElementById("extend-card-label").value = `${selectedReader.full_name} — ${selectedReader.card_code} (Hạn: ${formatDateVN(selectedReader.expiry_date)})`;
    extendMonths.value = "12";
    extendCustomWrap.hidden = true;
    document.getElementById("extend-card-type").value = "";
    document.getElementById("extend-reason").value = "Gia hạn thẻ thư viện định kỳ";
    modalExtend.hidden = false;
  });

  document.getElementById("extend-card-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cardId = document.getElementById("extend-card-id").value;
    const monthsVal = extendMonths.value;
    const newDate = document.getElementById("extend-new-date").value;
    const cardType = document.getElementById("extend-card-type").value;
    const reason = document.getElementById("extend-reason").value.trim();
    const btn = document.getElementById("btn-submit-extend");

    try {
      btn.disabled = true;
      const updated = await api.post(`/library-cards/${cardId}/extend`, {
        months: monthsVal === "custom" ? 12 : Number(monthsVal),
        new_expiry_date: monthsVal === "custom" && newDate ? newDate : null,
        card_type: cardType || null,
        reason: reason || "Gia hạn thẻ thư viện định kỳ",
      });
      showToast(`Đã gia hạn thẻ ${updated.card_code} đến ${formatDateVN(updated.expiry_date)}!`);
      modalExtend.hidden = true;
      await loadReaders(updated.reader_id);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  // Nút Khóa / Mở khóa thẻ trên panel Phôi thẻ
  const modalLock = document.getElementById("modal-lock");
  document.getElementById("btn-lock-card")?.addEventListener("click", () => {
    if (!selectedReader || !selectedReader.card_id) {
      showToast("Độc giả này chưa có thẻ thư viện.", "error");
      return;
    }
    const action = selectedReader.card_status === "LOCKED" ? "UNLOCK" : "LOCK";
    document.getElementById("lock-card-id").value = selectedReader.card_id;
    document.getElementById("lock-action-type").value = action;
    document.getElementById("lock-card-label").value = `${selectedReader.full_name} — ${selectedReader.card_code}`;
    const reasonInput = document.getElementById("lock-reason-input");
    const chipsWrap = document.getElementById("lock-quick-chips");
    const titleEl = document.getElementById("lock-modal-title");
    const submitBtn = document.getElementById("btn-submit-lock");

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

  document.getElementById("lock-quick-chips")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".quick-chip");
    if (chip) document.getElementById("lock-reason-input").value = chip.textContent.trim();
  });

  document.getElementById("lock-card-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cardId = document.getElementById("lock-card-id").value;
    const action = document.getElementById("lock-action-type").value;
    const reason = document.getElementById("lock-reason-input").value.trim();
    const btn = document.getElementById("btn-submit-lock");
    if (reason.length < 3) {
      showToast("Vui lòng nhập lý do tối thiểu 3 ký tự.", "error");
      return;
    }
    try {
      btn.disabled = true;
      const endpoint = action === "LOCK" ? `/library-cards/${cardId}/lock` : `/library-cards/${cardId}/unlock`;
      const updated = await api.post(endpoint, { reason });
      showToast(
        action === "LOCK"
          ? `Đã khóa thẻ ${updated.card_code}!`
          : `Đã mở khóa thẻ ${updated.card_code} -> ${updated.card_status}!`
      );
      modalLock.hidden = true;
      await loadReaders(updated.reader_id);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  // Thêm độc giả mới
  const modalAdd = document.getElementById("modal-add-reader");
  document.getElementById("btn-open-add-reader")?.addEventListener("click", () => {
    modalAdd.hidden = false;
    document.getElementById("new-reader-name")?.focus();
  });

  document.getElementById("add-reader-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-add-reader");
    try {
      btn.disabled = true;
      const res = await api.post("/auth/register", {
        full_name: document.getElementById("new-reader-name").value.trim(),
        email: document.getElementById("new-reader-email").value.trim(),
        phone: document.getElementById("new-reader-phone").value.trim() || null,
        password: document.getElementById("new-reader-pass").value,
      });
      showToast(`Đã tạo độc giả ${res.user.full_name} và cấp thẻ ${res.library_card.card_code}!`);
      e.target.reset();
      document.getElementById("new-reader-pass").value = "Docgia@123";
      modalAdd.hidden = true;
      await loadReaders(res.user.id);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  // Xuất CSV danh sách độc giả
  document.getElementById("btn-export-csv")?.addEventListener("click", () => {
    if (!allItems.length) {
      showToast("Không có dữ liệu để xuất.", "error");
      return;
    }
    const headers = ["MaThe", "HoTen", "Email", "SoDienThoai", "HangThe", "NgayCap", "NgayHetHan", "TrangThai", "DangMuon", "NoPhat"];
    const rows = allItems.map((r) =>
      [
        r.card_code || "",
        `"${(r.full_name || "").replace(/"/g, '""')}"`,
        r.email || "",
        r.phone || "",
        r.card_type || "",
        r.issue_date || "",
        r.expiry_date || "",
        r.card_status || "",
        r.borrowed_count,
        r.unpaid_fine_amount,
      ].join(",")
    );
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `danh-sach-doc-gia-ks25.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${allItems.length} hồ sơ độc giả ra file CSV!`);
  });

  // Quét tự chuyển EXPIRED khi bấm vào ô KPI thứ 4
  document.getElementById("kpi-expired-card")?.addEventListener("click", async () => {
    try {
      const res = await api.post("/library-cards/check-expired", {});
      showToast(res.message);
      loadReaders();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // Bộ lọc & Tìm kiếm
  document.getElementById("readers-filter-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    loadReaders();
  });

  typeSelect?.addEventListener("change", () => loadReaders());
  statusSelect?.addEventListener("change", () => loadReaders());

  const btnResetReaderFilter = document.getElementById("btn-reset-filter");
  btnResetReaderFilter?.addEventListener("click", async () => {
    btnResetReaderFilter.classList.add("is-spinning");
    if (kwInput) kwInput.value = "";
    if (typeSelect) typeSelect.value = "";
    if (statusSelect) statusSelect.value = "";
    try {
      await loadReaders();
    } finally {
      setTimeout(() => {
        btnResetReaderFilter.classList.remove("is-spinning");
      }, 700);
    }
  });

  // Đóng Modals
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.getAttribute("data-close")).hidden = true;
    });
  });

  loadReaders();
});
