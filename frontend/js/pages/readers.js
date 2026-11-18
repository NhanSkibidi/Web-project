// ==============================================================================
// KS25 Library — Quản lý Độc giả & Thẻ thư viện (readers.js)
// Nghiệp vụ:
// - Tìm độc giả theo Tên / Mã thẻ (LC-xxxx) / SĐT / Email
// - Tự động chuyển thẻ quá hạn sang EXPIRED khi kiểm tra
// - Xem chi tiết độc giả, lịch sử mượn/phạt và lịch sử thao tác thẻ
// - Gia hạn thẻ (tự khôi phục EXPIRED -> ACTIVE)
// - Khoá / Mở khoá thẻ kèm lý do bắt buộc
// ==============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const user = auth.getUser();
  if (!user || !["ADMIN", "LIBRARIAN"].includes(user.role)) return;

  const tbody = document.getElementById("readers-table-body");
  const searchForm = document.getElementById("reader-search-form");
  const kwInput = document.getElementById("filter-keyword");
  const statusSelect = document.getElementById("filter-status");
  const typeSelect = document.getElementById("filter-card-type");
  const resetBtn = document.getElementById("btn-reset-filter");
  const scanExpiredBtn = document.getElementById("btn-scan-expired");

  // Modals
  const modalDetail = document.getElementById("modal-detail");
  const modalExtend = document.getElementById("modal-extend");
  const modalLock = document.getElementById("modal-lock");

  const LOCK_REASONS = [
    "Độc giả báo mất thẻ thư viện",
    "Nợ sách quá hạn chưa hoàn trả",
    "Chưa thanh toán khoản phạt vi phạm",
    "Vi phạm nội quy phòng đọc thư viện",
  ];

  const UNLOCK_REASONS = [
    "Độc giả đã tìm thấy thẻ và xác minh tại quầy",
    "Độc giả đã trả đủ sách quá hạn và nộp phạt",
    "Đã cấp lại thẻ RFID và kích hoạt lại quyền mượn",
  ];

  function renderCardStatusBadge(status) {
    if (status === "ACTIVE") {
      return `<span class="badge badge-available">ACTIVE · Hoạt động</span>`;
    }
    if (status === "EXPIRED") {
      return `<span class="badge badge-reserved">EXPIRED · Hết hạn</span>`;
    }
    if (status === "LOCKED") {
      return `<span class="badge badge-danger">LOCKED · Đã khóa</span>`;
    }
    return `<span class="badge">Chưa có thẻ</span>`;
  }

  function renderDaysHint(days, status) {
    if (days === null || days === undefined) return "";
    if (days < 0) {
      return `<div style="font-size: 11.5px; color: var(--color-danger); font-weight: 600;">Quá hạn ${Math.abs(days)} ngày</div>`;
    }
    if (days <= 14 && status === "ACTIVE") {
      return `<div style="font-size: 11.5px; color: var(--color-warning); font-weight: 600;">Sắp hết hạn (còn ${days} ngày)</div>`;
    }
    return `<div class="muted" style="font-size: 11.5px;">Còn ${days} ngày</div>`;
  }

  // ---------- 1. Tải danh sách Độc giả & Thẻ ----------
  async function loadReaders() {
    if (!tbody) return;
    try {
      const params = {};
      if (kwInput?.value.trim()) params.q = kwInput.value.trim();
      if (statusSelect?.value) params.status = statusSelect.value;
      if (typeSelect?.value) params.card_type = typeSelect.value;

      const res = await api.get("/library-cards", params);

      // Cập nhật 4 ô thống kê
      document.getElementById("stat-readers-total").textContent =
        (res.active_count || 0) + (res.expired_count || 0) + (res.locked_count || 0);
      document.getElementById("stat-cards-active").textContent = res.active_count ?? 0;
      document.getElementById("stat-cards-expired").textContent = res.expired_count ?? 0;
      document.getElementById("stat-cards-locked").textContent = res.locked_count ?? 0;

      if (res.auto_expired_now > 0) {
        showToast(`Hệ thống vừa tự động chuyển ${res.auto_expired_now} thẻ quá hạn sang EXPIRED!`);
      }

      if (!res.items || res.items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="muted" style="text-align: center; padding: 24px;">Không tìm thấy độc giả hoặc thẻ thư viện phù hợp.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.items
        .map((r) => {
          const reasonHtml =
            r.card_status === "LOCKED" && r.lock_reason
              ? `<div><span class="reason-note" title="${escapeHtml(r.lock_reason)}">Lý do: ${escapeHtml(r.lock_reason)}</span></div>`
              : "";

          const loanSummaryHtml = `
            <div>Đang mượn: <strong>${r.borrowed_count}</strong> / ${r.max_borrow_books}</div>
            ${
              r.overdue_count > 0
                ? `<div style="font-size: 12px; color: var(--color-danger); font-weight: 600;">⚠️ Quá hạn: ${r.overdue_count} cuốn</div>`
                : ""
            }
            ${
              r.unpaid_fine_amount > 0
                ? `<div style="font-size: 12px; color: var(--color-warning); font-weight: 600;">Phạt nợ: ${formatMoney(r.unpaid_fine_amount)}</div>`
                : `<div class="muted" style="font-size: 12px;">Không nợ phạt</div>`
            }
          `;

          const actionBtns = r.card_id
            ? `
              <button type="button" class="btn btn-small" data-action="detail" data-card-id="${r.card_id}">Chi tiết</button>
              <button type="button" class="btn btn-outline btn-small" data-action="extend"
                data-card-id="${r.card_id}"
                data-reader-name="${escapeHtml(r.full_name)}"
                data-card-code="${escapeHtml(r.card_code)}"
                data-expiry="${escapeHtml(r.expiry_date || "")}"
                ${r.card_status === "LOCKED" ? 'title="Mở khóa thẻ trước khi gia hạn"' : ""}>
                Gia hạn
              </button>
              ${
                r.card_status === "LOCKED"
                  ? `<button type="button" class="btn btn-primary btn-small" data-action="unlock"
                      data-card-id="${r.card_id}"
                      data-reader-name="${escapeHtml(r.full_name)}"
                      data-card-code="${escapeHtml(r.card_code)}">
                      🔓 Mở thẻ
                    </button>`
                  : `<button type="button" class="btn btn-danger btn-small" data-action="lock"
                      data-card-id="${r.card_id}"
                      data-reader-name="${escapeHtml(r.full_name)}"
                      data-card-code="${escapeHtml(r.card_code)}">
                      🔒 Khóa thẻ
                    </button>`
              }
            `
            : `<button type="button" class="btn btn-small" data-action="detail-reader" data-reader-id="${r.reader_id}">Chi tiết</button>`;

          return `
            <tr>
              <td>
                <span class="code-mono" style="font-weight: 700;">${escapeHtml(r.card_code || "—")}</span>
              </td>
              <td>
                <strong>${escapeHtml(r.full_name)}</strong>
                <div class="muted" style="font-size: 12.5px;">${escapeHtml(r.email)}</div>
              </td>
              <td><span class="code-mono">${escapeHtml(r.phone || "—")}</span></td>
              <td>
                <span class="badge">${escapeHtml(r.card_type || "—")}</span>
                <div class="muted" style="font-size: 11.5px;">Tối đa ${r.max_borrow_books} cuốn</div>
              </td>
              <td>
                <div class="code-mono" style="font-size: 12.5px;">${escapeHtml(r.issue_date || "—")} → ${escapeHtml(r.expiry_date || "—")}</div>
                ${renderDaysHint(r.days_remaining, r.card_status)}
              </td>
              <td>
                ${renderCardStatusBadge(r.card_status)}
                ${reasonHtml}
              </td>
              <td>${loanSummaryHtml}</td>
              <td class="actions">${actionBtns}</td>
            </tr>
          `;
        })
        .join("");
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-error">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // ---------- 2. Xem Chi Tiết Độc Giả & Thẻ ----------
  async function openDetailModal({ cardId, readerId }) {
    const bodyEl = document.getElementById("detail-modal-body");
    if (!modalDetail || !bodyEl) return;

    modalDetail.hidden = false;
    bodyEl.innerHTML = `<p class="muted">Đang tải thông tin chi tiết & kiểm tra hạn thẻ...</p>`;

    try {
      const detail = cardId
        ? await api.get(`/library-cards/${cardId}`)
        : await api.get(`/readers/${readerId}`);

      const logsHtml =
        detail.card_logs && detail.card_logs.length > 0
          ? detail.card_logs
              .map(
                (lg) => `
              <tr>
                <td><span class="code-mono">${escapeHtml(lg.action)}</span></td>
                <td>
                  <span class="code-mono">${escapeHtml(lg.old_status || "—")} → ${escapeHtml(lg.new_status)}</span>
                  ${
                    lg.new_expiry_date && lg.old_expiry_date !== lg.new_expiry_date
                      ? `<div class="muted" style="font-size: 11.5px;">Hạn: ${escapeHtml(lg.old_expiry_date || "—")} → ${escapeHtml(lg.new_expiry_date)}</div>`
                      : ""
                  }
                </td>
                <td>${escapeHtml(lg.reason || "—")}</td>
                <td>${escapeHtml(lg.performer_name || "Hệ thống")}</td>
                <td>${formatDateTime(lg.created_at)}</td>
              </tr>
            `
              )
              .join("")
          : `<tr><td colspan="5" class="muted">Chưa có lịch sử thay đổi trạng thái thẻ.</td></tr>`;

      const loansHtml =
        detail.recent_loans && detail.recent_loans.length > 0
          ? detail.recent_loans
              .map(
                (ln) => `
              <tr>
                <td><span class="code-mono">#${ln.loan_id}</span></td>
                <td>${escapeHtml(ln.borrow_type)}</td>
                <td><span class="badge">${escapeHtml(ln.status)}</span></td>
                <td>${ln.items?.map((i) => escapeHtml(i.book_title)).join(", ") || "—"}</td>
                <td>${formatDateTime(ln.created_at)}</td>
              </tr>
            `
              )
              .join("")
          : `<tr><td colspan="5" class="muted">Chưa có phiếu mượn nào.</td></tr>`;

      bodyEl.innerHTML = `
        <div class="detail-grid-2">
          <div class="detail-box">
            <h4>👤 Thông tin Độc giả</h4>
            <div class="detail-row"><span class="muted">Mã độc giả:</span><span class="code-mono">#${detail.reader_id}</span></div>
            <div class="detail-row"><span class="muted">Họ và tên:</span><strong>${escapeHtml(detail.full_name)}</strong></div>
            <div class="detail-row"><span class="muted">Email:</span><span>${escapeHtml(detail.email)}</span></div>
            <div class="detail-row"><span class="muted">Số điện thoại:</span><span class="code-mono">${escapeHtml(detail.phone || "—")}</span></div>
            <div class="detail-row"><span class="muted">Tài khoản:</span><span class="badge ${detail.user_status === "ACTIVE" ? "badge-available" : "badge-danger"}">${escapeHtml(detail.user_status)}</span></div>
          </div>

          <div class="detail-box">
            <h4>💳 Thông tin Thẻ thư viện</h4>
            <div class="detail-row"><span class="muted">Mã thẻ:</span><span class="code-mono" style="font-weight:700;">${escapeHtml(detail.card_code || "Chưa cấp")}</span></div>
            <div class="detail-row"><span class="muted">Hạng thẻ:</span><span>${escapeHtml(detail.card_type || "—")} (Tối đa ${detail.max_borrow_books} cuốn)</span></div>
            <div class="detail-row"><span class="muted">Ngày cấp → Hết hạn:</span><span class="code-mono">${escapeHtml(detail.issue_date || "—")} → ${escapeHtml(detail.expiry_date || "—")}</span></div>
            <div class="detail-row"><span class="muted">Trạng thái thẻ:</span><span>${renderCardStatusBadge(detail.card_status)}</span></div>
            <div class="detail-row"><span class="muted">Lý do / Ghi chú gần nhất:</span><span>${escapeHtml(detail.lock_reason || "—")}</span></div>
          </div>
        </div>

        ${
          detail.card_id
            ? `
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 18px;">
            <button type="button" class="btn btn-outline btn-small" id="detail-btn-extend">📅 Gia hạn thẻ này</button>
            ${
              detail.card_status === "LOCKED"
                ? `<button type="button" class="btn btn-primary btn-small" id="detail-btn-unlock">🔓 Mở khóa thẻ</button>`
                : `<button type="button" class="btn btn-danger btn-small" id="detail-btn-lock">🔒 Khóa thẻ</button>`
            }
          </div>
        `
            : ""
        }

        <h4 style="margin: 14px 0 6px;">📜 Lịch sử Gia hạn & Khóa/Mở thẻ</h4>
        <div class="table-wrap" style="margin-bottom: 18px;">
          <table>
            <thead>
              <tr>
                <th>Hành động</th>
                <th>Chuyển trạng thái</th>
                <th>Lý do / Ghi chú</th>
                <th>Người thực hiện</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>${logsHtml}</tbody>
          </table>
        </div>

        <h4 style="margin: 14px 0 6px;">📚 Phiếu mượn gần đây (Đang mượn: ${detail.borrowed_count} · Quá hạn: ${detail.overdue_count})</h4>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Hình thức</th>
                <th>Trạng thái</th>
                <th>Đầu sách</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>${loansHtml}</tbody>
          </table>
        </div>
      `;

      document.getElementById("detail-btn-extend")?.addEventListener("click", () => {
        modalDetail.hidden = true;
        openExtendModal({
          cardId: detail.card_id,
          readerName: detail.full_name,
          cardCode: detail.card_code,
          expiryDate: detail.expiry_date,
        });
      });

      document.getElementById("detail-btn-lock")?.addEventListener("click", () => {
        modalDetail.hidden = true;
        openLockModal({
          cardId: detail.card_id,
          action: "LOCK",
          readerName: detail.full_name,
          cardCode: detail.card_code,
        });
      });

      document.getElementById("detail-btn-unlock")?.addEventListener("click", () => {
        modalDetail.hidden = true;
        openLockModal({
          cardId: detail.card_id,
          action: "UNLOCK",
          readerName: detail.full_name,
          cardCode: detail.card_code,
        });
      });

      // Đồng bộ lại danh sách bên ngoài nếu thẻ vừa tự động chuyển EXPIRED
      loadReaders();
    } catch (err) {
      bodyEl.innerHTML = `<p class="text-error">${escapeHtml(err.message)}</p>`;
    }
  }

  // ---------- 3. Gia Hạn Thẻ ----------
  const extendMonthsSelect = document.getElementById("extend-months");
  const extendCustomWrap = document.getElementById("extend-custom-date-wrap");

  extendMonthsSelect?.addEventListener("change", () => {
    if (extendCustomWrap) {
      extendCustomWrap.hidden = extendMonthsSelect.value !== "custom";
    }
  });

  function openExtendModal({ cardId, readerName, cardCode, expiryDate }) {
    if (!modalExtend) return;
    document.getElementById("extend-card-id").value = cardId;
    document.getElementById("extend-reader-name").textContent = readerName || "—";
    document.getElementById("extend-current-info").textContent = `${cardCode} (Hạn: ${expiryDate || "—"})`;
    document.getElementById("extend-months").value = "12";
    document.getElementById("extend-card-type").value = "";
    document.getElementById("extend-reason").value = "Gia hạn thẻ thư viện định kỳ";
    if (extendCustomWrap) extendCustomWrap.hidden = true;
    modalExtend.hidden = false;
  }

  document.getElementById("extend-card-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cardId = document.getElementById("extend-card-id").value;
    const monthsVal = document.getElementById("extend-months").value;
    const customDate = document.getElementById("extend-new-date").value;
    const cardType = document.getElementById("extend-card-type").value;
    const reason = document.getElementById("extend-reason").value.trim();
    const submitBtn = document.getElementById("btn-submit-extend");

    const payload = {
      months: monthsVal === "custom" ? 12 : Number(monthsVal),
      new_expiry_date: monthsVal === "custom" && customDate ? customDate : null,
      card_type: cardType || null,
      reason: reason || "Gia hạn thẻ thư viện định kỳ",
    };

    try {
      submitBtn.disabled = true;
      const updated = await api.post(`/library-cards/${cardId}/extend`, payload);
      showToast(`Đã gia hạn thẻ ${updated.card_code} đến ngày ${updated.expiry_date}!`);
      modalExtend.hidden = true;
      loadReaders();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ---------- 4. Khoá / Mở Khoá Thẻ Kèm Lý Do ----------
  function openLockModal({ cardId, action, readerName, cardCode }) {
    if (!modalLock) return;
    document.getElementById("lock-card-id").value = cardId;
    document.getElementById("lock-action-type").value = action;
    document.getElementById("lock-reader-name").textContent = readerName || "—";
    document.getElementById("lock-card-code").textContent = cardCode || "—";

    const titleEl = document.getElementById("lock-modal-title");
    const reasonInput = document.getElementById("lock-reason-input");
    const submitBtn = document.getElementById("btn-submit-lock");
    const quickWrap = document.getElementById("lock-quick-reasons");

    reasonInput.value = "";
    if (action === "LOCK") {
      titleEl.textContent = "🔒 Khóa thẻ thư viện";
      reasonInput.placeholder = "Nhập lý do khóa thẻ (VD: Làm mất thẻ, nợ sách quá hạn...)";
      submitBtn.textContent = "Xác nhận Khóa thẻ";
      submitBtn.className = "btn btn-danger";
      quickWrap.innerHTML = LOCK_REASONS.map(
        (r) => `<button type="button" class="quick-reason-chip">${escapeHtml(r)}</button>`
      ).join("");
    } else {
      titleEl.textContent = "🔓 Mở khóa thẻ thư viện";
      reasonInput.placeholder = "Nhập lý do mở khóa thẻ (VD: Độc giả đã nộp phạt, đã tìm lại thẻ...)";
      submitBtn.textContent = "Xác nhận Mở thẻ";
      submitBtn.className = "btn btn-primary";
      quickWrap.innerHTML = UNLOCK_REASONS.map(
        (r) => `<button type="button" class="quick-reason-chip">${escapeHtml(r)}</button>`
      ).join("");
    }

    modalLock.hidden = false;
    reasonInput.focus();
  }

  document.getElementById("lock-quick-reasons")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".quick-reason-chip");
    if (!chip) return;
    const input = document.getElementById("lock-reason-input");
    if (input) {
      input.value = chip.textContent.trim();
      input.focus();
    }
  });

  document.getElementById("lock-card-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cardId = document.getElementById("lock-card-id").value;
    const action = document.getElementById("lock-action-type").value;
    const reason = document.getElementById("lock-reason-input").value.trim();
    const submitBtn = document.getElementById("btn-submit-lock");

    if (reason.length < 3) {
      showToast("Vui lòng nhập lý do tối thiểu 3 ký tự.", "error");
      return;
    }

    const endpoint = action === "LOCK" ? `/library-cards/${cardId}/lock` : `/library-cards/${cardId}/unlock`;
    try {
      submitBtn.disabled = true;
      const updated = await api.post(endpoint, { reason });
      showToast(
        action === "LOCK"
          ? `Đã khóa thẻ ${updated.card_code} (Lý do: ${reason})`
          : `Đã mở khóa thẻ ${updated.card_code} -> Trạng thái: ${updated.card_status}`
      );
      modalLock.hidden = true;
      loadReaders();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ---------- 5. Sự kiện Bảng, Tìm kiếm & Đóng Modal ----------
  tbody?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const act = btn.getAttribute("data-action");
    const cardId = btn.getAttribute("data-card-id");
    const readerId = btn.getAttribute("data-reader-id");
    const readerName = btn.getAttribute("data-reader-name");
    const cardCode = btn.getAttribute("data-card-code");
    const expiry = btn.getAttribute("data-expiry");

    if (act === "detail") {
      openDetailModal({ cardId });
    } else if (act === "detail-reader") {
      openDetailModal({ readerId });
    } else if (act === "extend") {
      openExtendModal({ cardId, readerName, cardCode, expiryDate: expiry });
    } else if (act === "lock") {
      openLockModal({ cardId, action: "LOCK", readerName, cardCode });
    } else if (act === "unlock") {
      openLockModal({ cardId, action: "UNLOCK", readerName, cardCode });
    }
  });

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-close-modal");
      const modal = document.getElementById(targetId);
      if (modal) modal.hidden = true;
    });
  });

  [modalDetail, modalExtend, modalLock].forEach((m) => {
    m?.addEventListener("click", (e) => {
      if (e.target === m) m.hidden = true;
    });
  });

  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    loadReaders();
  });

  statusSelect?.addEventListener("change", loadReaders);
  typeSelect?.addEventListener("change", loadReaders);

  resetBtn?.addEventListener("click", () => {
    if (kwInput) kwInput.value = "";
    if (statusSelect) statusSelect.value = "";
    if (typeSelect) typeSelect.value = "";
    loadReaders();
  });

  scanExpiredBtn?.addEventListener("click", async () => {
    try {
      scanExpiredBtn.disabled = true;
      const res = await api.post("/library-cards/check-expired", {});
      showToast(res.message);
      loadReaders();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      scanExpiredBtn.disabled = false;
    }
  });

  // Tải dữ liệu ban đầu
  loadReaders();
});
