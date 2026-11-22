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
          <div style="font-size:40px; margin-bottom:10px;">🔒</div>
          <h2 style="font-family:var(--font-serif);">Không có quyền truy cập</h2>
          <p style="color:var(--muted); margin-bottom:20px;">Trang Chi tiết Độc giả chỉ dành cho Thủ thư (LIBRARIAN) và Quản trị viên (ADMIN).</p>
          <a href="login.html#login" class="btn btn-primary">Đăng nhập Thủ thư →</a>
        </div>`;
    }
    return;
  }

  document.getElementById("top-staff-avatar").textContent = (staffUser.full_name || "T").charAt(0).toUpperCase();
  document.getElementById("top-staff-name").textContent = staffUser.full_name || staffUser.email;
  document.getElementById("top-staff-role").textContent = staffUser.role === "ADMIN" ? "Quản trị hệ thống" : "Thủ thư trực quầy";

  document.getElementById("btn-top-logout")?.addEventListener("click", () => {
    auth.clearSession();
    window.location.href = "login.html#login";
  });
  document.getElementById("btn-mobile-sidebar")?.addEventListener("click", () => {
    document.getElementById("ul-sidebar")?.classList.toggle("open");
  });

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
            b.textContent = "🔒 Khóa thẻ";
            b.className = b.id === "btn-card-lock" ? "btn btn-soft-danger btn-sm" : "btn btn-soft-danger";
          }
        });
      } else if (detail.card_status === "EXPIRED") {
        statusEl.textContent = "ĐÃ HẾT HẠN";
        statusEl.className = "id-status-text id-status-expired";
        if (readyBadge) readyBadge.textContent = "Cần gia hạn";
        lockBtns.forEach((b) => {
          if (b) {
            b.textContent = "🔒 Khóa thẻ";
            b.className = b.id === "btn-card-lock" ? "btn btn-soft-danger btn-sm" : "btn btn-soft-danger";
          }
        });
      } else {
        statusEl.textContent = "TẠM KHÓA";
        statusEl.className = "id-status-text id-status-locked";
        if (readyBadge) readyBadge.textContent = "Thẻ đang khóa";
        lockBtns.forEach((b) => {
          if (b) {
            b.textContent = "🔓 Mở khóa thẻ";
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
      if (mainEl) mainEl.innerHTML = `<div class="guard-box"><h3 style="color:var(--danger);">${escapeHtml(err.message)}</h3><a href="readers.html" class="btn">← Quay lại</a></div>`;
    }
  }

  // ---------- 3. LẤY LỊCH SỬ MƯỢN TRẢ TỪ MODULE MƯỢN (GET /api/loans?user_id=...) ----------
  async function loadLoanHistoryFromLoanModule(readerId) {
    const tbody = document.getElementById("detail-loans-tbody");
    if (!tbody) return;
    try {
      const params = { user_id: readerId, limit: 100 };
      if (currentLoanStatusFilter) params.status = currentLoanStatusFilter;

      const loans = await api.get("/loans", params);
      const rows = [];
      (loans || []).forEach((ln) => {
        (ln.loan_items || []).forEach((it) => {
          rows.push({ ln, it });
        });
      });

      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:26px; color:var(--muted);">Chưa có phiếu mượn trả nào khớp bộ lọc.</td></tr>`;
        return;
      }

      tbody.innerHTML = rows
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
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger); padding:18px;">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // Filter Tabs lịch sử mượn
  document.getElementById("loan-status-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-loan-status]");
    if (!btn || !currentDetail) return;
    currentLoanStatusFilter = btn.getAttribute("data-loan-status");
    document.querySelectorAll(".detail-tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    loadLoanHistoryFromLoanModule(currentDetail.reader_id);
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
        titleEl.textContent = "🔒 Khóa thẻ thư viện";
        submitBtn.textContent = "Xác nhận Khóa thẻ";
        submitBtn.className = "btn btn-soft-danger";
        chipsWrap.innerHTML = LOCK_REASONS.map((r) => `<button type="button" class="quick-chip">${escapeHtml(r)}</button>`).join("");
      } else {
        titleEl.textContent = "🔓 Mở khóa thẻ thư viện";
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
