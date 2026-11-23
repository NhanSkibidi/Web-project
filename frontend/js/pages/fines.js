/**
 * ==============================================================================
 * KS25 Library - Phân hệ Xử lý Tiền phạt & Miễn phạt (Task T3CFF2C)
 * Người phụ trách: Trịnh Huy Đại (B25DTCN151)
 * File JS độc lập xử lý: API Fines, Thu tiền & in biên lai, Admin miễn phạt, Tra cứu độc giả
 * ==============================================================================
 */

(function () {
  "use strict";

  // 1. CẤU HÌNH API GỐC
  const API_BASE = (function () {
    if (typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL) {
      return CONFIG.API_BASE_URL;
    }
    if (window.API_BASE_URL) return window.API_BASE_URL;
    const origin = window.location.origin;
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return "http://127.0.0.1:8000/api";
    }
    return "/api";
  })();

  let currentFinesList = [];
  let currentUserRole = null;

  function safeHtml(val) {
    if (typeof escapeHtml === "function") return escapeHtml(val);
    const d = document.createElement("div");
    d.textContent = val ?? "";
    return d.innerHTML;
  }

  // 3. TIỆN ÍCH AUTH & TOKEN
  function getAuthHeader() {
    const token =
      typeof auth !== "undefined" && typeof auth.getToken === "function"
        ? auth.getToken()
        : localStorage.getItem("access_token") ||
          localStorage.getItem("token") ||
          sessionStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function getCurrentUser() {
    if (typeof auth !== "undefined" && typeof auth.getUser === "function") {
      return auth.getUser();
    }
    try {
      const raw =
        localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // 4. TIỆN ÍCH ĐỊNH DẠNG (FORMATTER)
  function formatVND(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num);
  }

  function formatDate(isoString) {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  function numberToWords(amount) {
    const n = Math.round(Number(amount) || 0);
    if (n <= 0) return "Không đồng";
    const units = [
      "không",
      "một",
      "hai",
      "ba",
      "bốn",
      "năm",
      "sáu",
      "bảy",
      "tám",
      "chín",
    ];

    function readThree(num, isHigh) {
      const h = Math.floor(num / 100);
      const t = Math.floor((num % 100) / 10);
      const u = num % 10;
      const res = [];
      if (h > 0 || !isHigh) res.push(`${units[h]} trăm`);
      if (t > 1) {
        res.push(`${units[t]} mươi`);
        if (u === 1) res.push("mốt");
        else if (u === 4) res.push("tư");
        else if (u === 5) res.push("lăm");
        else if (u > 0) res.push(units[u]);
      } else if (t === 1) {
        res.push("mười");
        if (u === 5) res.push("lăm");
        else if (u > 0) res.push(units[u]);
      } else if (t === 0) {
        if (u > 0) {
          if (h > 0 || !isHigh) res.push("lẻ");
          res.push(units[u]);
        }
      }
      return res.join(" ");
    }

    const scales = ["", "nghìn", "triệu", "tỷ"];
    const groups = [];
    let temp = n;
    while (temp > 0) {
      groups.push(temp % 1000);
      temp = Math.floor(temp / 1000);
    }
    const words = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (g > 0) {
        words.push(readThree(g, i === groups.length - 1));
        if (scales[i]) words.push(scales[i]);
      }
    }
    const str = words.join(" ").trim();
    return str.charAt(0).toUpperCase() + str.slice(1) + " đồng chẵn";
  }

  // 5. TOAST THÔNG BÁO
  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "check_circle" : "error";
    toast.innerHTML = `
      <span class="material-symbols-outlined">${icon}</span>
      <span>${safeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 6. GỌI API BACKEND CHUẨN (CÓ TOKEN VÀ BÁO LỖI THẬT)
  async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      let msg = `Lỗi HTTP ${res.status}: ${res.statusText}`;
      if (typeof errorData.detail === "string") {
        msg = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        msg = errorData.detail.map((e) => `${e.loc?.[e.loc.length - 1] || "field"}: ${e.msg}`).join("; ");
      }
      if (res.status === 401 && typeof auth !== "undefined") {
        auth.clearSession();
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  // 7. TẢI VÀ HIỂN THỊ THỐNG KÊ KPI
  async function loadStatistics() {
    try {
      const stats = await fetchAPI("/fines/statistics");
      document.getElementById("stat-unpaid-amount").textContent = formatVND(
        stats.total_unpaid_amount
      );
      document.getElementById("stat-unpaid-count").textContent =
        stats.unpaid_count;
      document.getElementById("stat-paid-today").textContent = formatVND(
        stats.total_paid_today
      );
      document.getElementById("stat-paid-count").textContent = stats.paid_count;
      document.getElementById("stat-waived-count").textContent =
        stats.waived_count;
      document.getElementById("stat-total-count").textContent =
        stats.total_fines_count;
    } catch (err) {
      console.error("Lỗi khi tải thống kê:", err);
    }
  }

  // 8. TẢI VÀ RENDER DANH SÁCH TIỀN PHẠT TRÊN BẢNG
  async function loadFinesTable() {
    const tbody = document.getElementById("fines-table-body");
    const countBadge = document.getElementById("table-record-count");

    const keyword = document.getElementById("filter-keyword").value.trim();
    const status = document.getElementById("filter-status").value;
    const fineType = document.getElementById("filter-type").value;

    const query = new URLSearchParams();
    if (status && status !== "ALL") query.append("status", status);
    if (fineType && fineType !== "ALL") query.append("fine_type", fineType);
    if (keyword) query.append("search", keyword);

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="loading-spinner"></div>
          <p>Đang truy vấn dữ liệu các khoản phạt...</p>
        </td>
      </tr>
    `;

    try {
      const fines = await fetchAPI(`/fines?${query.toString()}`);
      currentFinesList = fines;
      countBadge.textContent = `${fines.length} hồ sơ`;

      if (!fines || fines.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="empty-state">
              <span class="material-symbols-outlined" style="font-size: 48px; color: var(--color-text-muted);">folder_off</span>
              <p style="margin: 8px 0 0; font-weight: 500;">Không tìm thấy khoản phạt nào phù hợp với bộ lọc</p>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = fines
        .map((f) => {
          // Xử lý badge loại phạt
          let typeClass = "overdue";
          const t = (f.fine_type || "").toUpperCase();
          if (t.includes("HỎNG") || t.includes("DAMAGED")) typeClass = "damaged";
          else if (t.includes("MẤT") || t.includes("LOST")) typeClass = "lost";

          // Xử lý badge trạng thái
          const s = (f.status || "").toUpperCase();
          let statusHtml = "";
          if (s === "PAID") {
            statusHtml = `<span class="status-badge paid"><span class="dot paid"></span> Đã nộp</span>`;
          } else if (s === "WAIVED") {
            statusHtml = `<span class="status-badge waived"><span class="dot waived"></span> Miễn phạt</span>`;
          } else {
            statusHtml = `<span class="status-badge unpaid"><span class="dot unpaid"></span> Chưa thu</span>`;
          }

          // Nút thao tác (Ẩn nút Miễn phạt nếu không phải ADMIN)
          let actionsHtml = "";
          if (s === "UNPAID") {
            const waiveBtn = currentUserRole === "ADMIN"
              ? `<button type="button" class="btn-action waive" title="Admin miễn phạt" data-action="waive" data-id="${f.id}">
                  <span class="material-symbols-outlined" style="font-size: 18px;">verified_user</span>
                </button>`
              : "";
            actionsHtml = `
              <div class="action-buttons">
                <button type="button" class="btn-action pay" title="Thu tiền phạt" data-action="pay" data-id="${f.id}">
                  <span class="material-symbols-outlined" style="font-size: 18px;">payments</span>
                </button>
                ${waiveBtn}
              </div>
            `;
          } else {
            actionsHtml = `
              <div class="action-buttons">
                <button type="button" class="btn-action receipt" title="Xem & In biên lai" data-action="receipt" data-id="${f.id}">
                  <span class="material-symbols-outlined" style="font-size: 18px;">print</span>
                </button>
              </div>
            `;
          }

          return `
            <tr data-fine-id="${f.id}">
              <td class="font-mono" style="font-weight: 600; color: var(--color-brand);">
                <div>#FN-${String(f.id).padStart(4, "0")}</div>
                <div style="font-size: 11px; color: var(--color-text-muted); font-weight: 400;">#${safeHtml(f.loan_code || ("PM-" + f.loan_id))}</div>
              </td>
              <td>
                <div style="font-weight: 600; color: var(--color-text-primary);">${safeHtml(f.user_name || "Độc giả")}</div>
                <div style="font-size: 11.5px; color: var(--color-text-muted);">
                  Thẻ: <strong class="font-mono">${safeHtml(f.card_code || "Chưa cấp")}</strong>
                </div>
              </td>
              <td>
                <div style="font-weight: 600; color: var(--color-text-primary); max-width: 280px; white-space: normal;">
                  ${safeHtml(f.book_title || "Ấn bản thư viện")}
                </div>
                <div style="font-size: 11.5px; color: var(--color-text-muted);">
                  Mã bản sao: <strong class="font-mono">${safeHtml(f.copy_code || "N/A")}</strong>
                </div>
              </td>
              <td>
                <span class="fine-badge ${typeClass}">${safeHtml(f.fine_type || "Vi phạm")}</span>
              </td>
              <td class="text-right">
                <strong class="font-mono" style="font-size: 14px; color: ${s === 'UNPAID' ? 'var(--color-danger)' : 'var(--color-text-primary)'};">
                  ${formatVND(f.amount)}
                </strong>
              </td>
              <td style="font-size: 12px; color: var(--color-text-secondary);">
                <div>${formatDate(f.created_at)}</div>
                ${f.collected_at ? `<div style="font-size: 11px; color: var(--color-text-muted);">Thu: ${formatDate(f.collected_at)}</div>` : ''}
              </td>
              <td>${statusHtml}</td>
              <td class="text-center">${actionsHtml}</td>
            </tr>
          `;
        })
        .join("");
    } catch (err) {
      console.error("Lỗi khi tải bảng tiền phạt:", err);
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state" style="color: var(--color-danger);">
            <span class="material-symbols-outlined" style="font-size: 40px;">error</span>
            <p>Không thể tải dữ liệu từ máy chủ: ${safeHtml(err.message)}</p>
          </td>
        </tr>
      `;
    }
  }

  // 9. MODAL THU TIỀN PHẠT
  function openPayModal(fineId) {
    const fine = currentFinesList.find((f) => f.id === fineId);
    if (!fine) return;

    document.getElementById("pay-fine-id").value = fine.id;
    document.getElementById("pay-summary-code").textContent = `#FN-${String(fine.id).padStart(4, "0")}`;
    document.getElementById("pay-summary-reader").textContent = fine.user_name;
    document.getElementById("pay-summary-card").textContent = fine.card_code || "Chưa cấp";
    document.getElementById("pay-summary-book").textContent = `${fine.book_title} (${fine.copy_code})`;
    document.getElementById("pay-summary-type").textContent = fine.fine_type;
    document.getElementById("pay-summary-amount").textContent = formatVND(fine.amount);
    document.getElementById("qr-transfer-content").textContent = `NOP PHAT FN${fine.id}`;

    // Reset form & phương thức thanh toán về mặc định (Tiền mặt)
    const payNoteEl = document.getElementById("pay-note");
    if (payNoteEl) payNoteEl.value = "";
    const cashRadio = document.querySelector('input[name="pay-method"][value="TIỀN MẶT"]');
    if (cashRadio) {
      cashRadio.checked = true;
      document.querySelectorAll(".method-option").forEach((opt) => opt.classList.remove("active"));
      cashRadio.closest(".method-option")?.classList.add("active");
    }
    const qrBox = document.getElementById("qr-transfer-box");
    if (qrBox) qrBox.style.display = "none";

    document.getElementById("modal-pay").style.display = "flex";
  }

  async function handleConfirmPay() {
    const fineId = parseInt(document.getElementById("pay-fine-id").value);
    const methodEl = document.querySelector('input[name="pay-method"]:checked');
    const paymentMethod = methodEl ? methodEl.value : "TIỀN MẶT";
    const note = document.getElementById("pay-note").value.trim();

    const btn = document.getElementById("btn-confirm-pay");
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span> Đang xử lý...`;

    try {
      await fetchAPI(`/fines/${fineId}/pay`, {
        method: "POST",
        body: JSON.stringify({
          payment_method: paymentMethod,
          note: note,
        }),
      });

      showToast("Thu tiền phạt thành công! Đang chuẩn bị biên lai...", "success");
      closeModal("modal-pay");

      // Cập nhật lại giao diện
      await loadStatistics();
      await loadFinesTable();

      // Mở ngay biên lai để in
      openReceiptModal(fineId);
    } catch (err) {
      showToast(`Thu tiền thất bại: ${err.message}`, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span class="material-symbols-outlined">check</span> Xác nhận thu tiền & In biên lai`;
    }
  }

  // 10. MODAL ADMIN MIỄN GIẢM TIỀN PHẠT
  function openWaiveModal(fineId) {
    const fine = currentFinesList.find((f) => f.id === fineId);
    if (!fine) return;

    document.getElementById("waive-fine-id").value = fine.id;
    document.getElementById("waive-summary-code").textContent = `#FN-${String(fine.id).padStart(4, "0")}`;
    document.getElementById("waive-summary-reader").textContent = fine.user_name;
    document.getElementById("waive-summary-amount").textContent = formatVND(fine.amount);
    document.getElementById("waive-reason-input").value = "";

    document.getElementById("modal-waive").style.display = "flex";
  }

  async function handleConfirmWaive() {
    const fineId = parseInt(document.getElementById("waive-fine-id").value);
    const reason = document.getElementById("waive-reason-input").value.trim();

    if (!reason || reason.length < 3) {
      showToast("Vui lòng nhập lý do miễn phạt rõ ràng (tối thiểu 3 ký tự)", "error");
      document.getElementById("waive-reason-input").focus();
      return;
    }

    const btn = document.getElementById("btn-confirm-waive");
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span> Đang xử lý...`;

    try {
      await fetchAPI(`/fines/${fineId}/waive`, {
        method: "POST",
        body: JSON.stringify({ waive_reason: reason }),
      });

      showToast("Đã phê duyệt miễn giảm tiền phạt thành công!", "success");
      closeModal("modal-waive");

      await loadStatistics();
      await loadFinesTable();
    } catch (err) {
      showToast(`Không thể miễn phạt: ${err.message}`, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span class="material-symbols-outlined">verified</span> Xác nhận miễn phạt`;
    }
  }

  // 11. MODAL VÀ IN BIÊN LAI THU TIỀN PHẠT
  async function openReceiptModal(fineId) {
    try {
      const receipt = await fetchAPI(`/fines/${fineId}/receipt`);

      document.getElementById("receipt-doc-no").textContent = receipt.receipt_no;
      document.getElementById("receipt-doc-date").textContent = `Ngày: ${formatDate(receipt.collected_at || receipt.created_at)}`;
      document.getElementById("receipt-reader-name").textContent = receipt.reader_name;
      document.getElementById("receipt-card-code").textContent = receipt.reader_card_code || "Chưa cấp";
      document.getElementById("receipt-reader-phone").textContent = receipt.reader_phone || "Không có";
      document.getElementById("receipt-reader-email").textContent = receipt.reader_email || "Không có";

      document.getElementById("receipt-book-title").textContent = receipt.book_title;
      document.getElementById("receipt-book-isbn").textContent = `ISBN: ${receipt.book_isbn}`;
      document.getElementById("receipt-copy-code").textContent = receipt.copy_code;
      document.getElementById("receipt-fine-type").textContent = receipt.fine_type;
      document.getElementById("receipt-item-amount").textContent = formatVND(receipt.amount);
      document.getElementById("receipt-total-amount").textContent = formatVND(receipt.amount);

      document.getElementById("receipt-amount-words").textContent = receipt.amount_in_words;
      document.getElementById("receipt-payment-method").textContent = receipt.payment_method || "Tiền mặt tại quầy";

      const statusEl = document.getElementById("receipt-doc-status");
      if (receipt.status === "PAID") {
        statusEl.textContent = "ĐÃ THANH TOÁN";
        statusEl.className = "receipt-status-pill";
        statusEl.style.background = "";
        statusEl.style.color = "";
      } else if (receipt.status === "WAIVED") {
        statusEl.textContent = "ĐÃ MIỄN PHẠT";
        statusEl.className = "receipt-status-pill";
        statusEl.style.background = "var(--color-purple-bg)";
        statusEl.style.color = "var(--color-purple)";
      } else {
        statusEl.textContent = "CHƯA THANH TOÁN";
        statusEl.className = "receipt-status-pill";
        statusEl.style.background = "var(--color-danger-bg)";
        statusEl.style.color = "var(--color-danger)";
      }

      const noteRow = document.getElementById("receipt-note-row");
      const noteText = document.getElementById("receipt-note-text");
      if (receipt.waive_reason) {
        noteRow.style.display = "block";
        noteText.textContent = receipt.waive_reason;
      } else {
        noteRow.style.display = "none";
      }

      document.getElementById("receipt-sig-reader").textContent = receipt.reader_name;
      document.getElementById("receipt-sig-collector").textContent = receipt.collector_name || "Thủ thư tiếp nhận";

      document.getElementById("modal-receipt").style.display = "flex";
    } catch (err) {
      showToast(`Không thể tạo biên lai: ${err.message}`, "error");
    }
  }

  // 12. CỔNG ĐỘC GIẢ: HIỂN THỊ KHOẢN PHẠT CÁ NHÂN TỪ /api/fines/my-fines
  function renderReaderFinesResult(data, fines) {
    const alertBox = document.getElementById("reader-alert-box");
    const resultWrapper = document.getElementById("reader-result-wrapper");
    const tbody = document.getElementById("reader-table-body");
    resultWrapper.style.display = "block";

    if (!fines || fines.length === 0) {
      alertBox.style.display = "none";
      document.getElementById("reader-result-name").textContent = data
        ? `Khoản phạt của: ${data.user_name} (${data.card_code || "Chưa cấp"})`
        : "Danh sách khoản phạt";
      document.getElementById("reader-record-count").textContent = "0 khoản";
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-success);">check_circle</span>
            <p style="margin: 8px 0 0; font-weight: 600; color: var(--color-success);">
              Tuyệt vời! Bạn không có khoản phạt vi phạm nào được ghi nhận.
            </p>
          </td>
        </tr>
      `;
      return;
    }

    const unpaidFines = fines.filter((f) => (f.status || "").toUpperCase() === "UNPAID");
    const totalUnpaid = data && typeof data.total_unpaid_amount === "number"
      ? data.total_unpaid_amount
      : unpaidFines.reduce((sum, f) => sum + f.amount, 0);
    const unpaidCount = data && typeof data.unpaid_count === "number" ? data.unpaid_count : unpaidFines.length;

    if (unpaidCount > 0) {
      alertBox.style.display = "flex";
      document.getElementById("reader-alert-title").textContent = `Bạn có ${unpaidCount} khoản phạt chưa thanh toán`;
      document.getElementById("reader-alert-amount").textContent = formatVND(totalUnpaid);
    } else {
      alertBox.style.display = "none";
    }

    const readerName = data ? data.user_name : fines[0].user_name;
    const readerCard = data ? data.card_code : fines[0].card_code;
    document.getElementById("reader-result-name").textContent = `Khoản phạt của: ${readerName} (${readerCard || "Chưa cấp"})`;
    document.getElementById("reader-record-count").textContent = `${fines.length} khoản`;

    tbody.innerHTML = fines
      .map((f) => {
        const s = (f.status || "").toUpperCase();
        let statusBadge = "";
        if (s === "PAID") statusBadge = `<span class="status-badge paid">Đã nộp</span>`;
        else if (s === "WAIVED") statusBadge = `<span class="status-badge waived">Đã miễn</span>`;
        else statusBadge = `<span class="status-badge unpaid">Chưa nộp</span>`;

        const ft = (f.fine_type || "").toUpperCase();
        let typeClass = "overdue";
        if (ft.includes("HỎNG") || ft === "DAMAGED") typeClass = "damaged";
        else if (ft.includes("MẤT") || ft === "LOST") typeClass = "lost";

        return `
          <tr>
            <td class="font-mono">#FN-${String(f.id).padStart(4, "0")}</td>
            <td>
              <div style="font-weight: 600;">${safeHtml(f.book_title)}</div>
              <div style="font-size: 11.5px; color: #666;">Bản sao: ${safeHtml(f.copy_code)}</div>
            </td>
            <td><span class="fine-badge ${typeClass}">${safeHtml(f.fine_type)}</span></td>
            <td class="text-right font-mono" style="font-weight: 700; color: ${s === 'UNPAID' ? 'var(--color-danger)' : 'inherit'};">
              ${formatVND(f.amount)}
            </td>
            <td>${formatDate(f.created_at)}</td>
            <td>${statusBadge}</td>
            <td class="text-center">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.viewFineReceipt(${f.id})">
                <span class="material-symbols-outlined" style="font-size: 16px;">receipt</span>
                <span>Xem</span>
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadMyFinesForReader() {
    const resultWrapper = document.getElementById("reader-result-wrapper");
    const tbody = document.getElementById("reader-table-body");
    resultWrapper.style.display = "block";
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="loading-spinner"></div>
          <p>Đang tải danh sách khoản phạt của bạn...</p>
        </td>
      </tr>
    `;

    try {
      const data = await fetchAPI("/fines/my-fines");
      currentFinesList = data.fines || [];
      renderReaderFinesResult(data, currentFinesList);
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state" style="color: var(--color-danger);">
            Lỗi tải khoản phạt: ${safeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  // Thủ thư/Admin tra cứu nhanh cho 1 độc giả theo mã thẻ / User ID / từ khóa
  async function handleReaderCheck() {
    if (currentUserRole === "READER") {
      await loadMyFinesForReader();
      return;
    }

    const input = document.getElementById("reader-card-input").value.trim();
    if (!input) {
      showToast("Vui lòng nhập mã thẻ hoặc mã ID bạn đọc", "error");
      return;
    }

    const resultWrapper = document.getElementById("reader-result-wrapper");
    const tbody = document.getElementById("reader-table-body");

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="loading-spinner"></div>
          <p>Đang kiểm tra hồ sơ độc giả...</p>
        </td>
      </tr>
    `;
    resultWrapper.style.display = "block";

    try {
      if (/^\d+$/.test(input)) {
        const data = await fetchAPI(`/fines/my-fines?user_id=${encodeURIComponent(input)}`);
        renderReaderFinesResult(data, data.fines || []);
      } else {
        const fines = await fetchAPI(`/fines?search=${encodeURIComponent(input)}`);
        renderReaderFinesResult(null, fines || []);
      }
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state" style="color: var(--color-danger);">
            Lỗi tra cứu: ${safeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  // 13. XUẤT BÁO CÁO CSV
  function exportFinesToCSV() {
    if (!currentFinesList || currentFinesList.length === 0) {
      showToast("Không có dữ liệu tiền phạt để xuất báo cáo", "error");
      return;
    }

    const headers = [
      "Mã phạt",
      "Độc giả",
      "Mã thẻ",
      "Tựa sách",
      "Mã bản sao",
      "Loại vi phạm",
      "Số tiền (VNĐ)",
      "Trạng thái",
      "Ngày phát sinh",
      "Ngày xử lý",
      "Người xử lý",
      "Lý do miễn / Ghi chú",
    ];

    const rows = currentFinesList.map((f) => [
      `#FN-${String(f.id).padStart(4, "0")}`,
      `"${f.user_name || ''}"`,
      `"${f.card_code || ''}"`,
      `"${(f.book_title || '').replace(/"/g, '""')}"`,
      `"${f.copy_code || ''}"`,
      `"${f.fine_type || ''}"`,
      f.amount,
      `"${f.status || ''}"`,
      `"${f.created_at || ''}"`,
      `"${f.collected_at || ''}"`,
      `"${f.collector_name || ''}"`,
      `"${(f.waive_reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bao_cao_tien_phat_KS25_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Đã xuất báo cáo CSV thành công!", "success");
  }

  // 14. TIỆN ÍCH ĐÓNG MODAL
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "none";
  }

  // 15. GẮN SỰ KIỆN KHỞI TẠO (EVENT LISTENERS)
  function initEvents() {
    // Tab switching
    document.getElementById("tab-staff-view").addEventListener("click", () => {
      document.getElementById("tab-staff-view").classList.add("active");
      document.getElementById("tab-reader-view").classList.remove("active");
      document.getElementById("staff-view").style.display = "block";
      document.getElementById("reader-view").style.display = "none";
    });

    document.getElementById("tab-reader-view").addEventListener("click", () => {
      document.getElementById("tab-reader-view").classList.add("active");
      document.getElementById("tab-staff-view").classList.remove("active");
      document.getElementById("reader-view").style.display = "block";
      document.getElementById("staff-view").style.display = "none";
    });

    // Bộ lọc và tìm kiếm
    let debounceTimer;
    document.getElementById("filter-keyword").addEventListener("input", (e) => {
      const clearBtn = document.getElementById("btn-clear-search");
      clearBtn.style.display = e.target.value ? "flex" : "none";
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadFinesTable(), 300);
    });

    document.getElementById("btn-clear-search").addEventListener("click", () => {
      document.getElementById("filter-keyword").value = "";
      document.getElementById("btn-clear-search").style.display = "none";
      loadFinesTable();
    });

    document.getElementById("filter-status").addEventListener("change", loadFinesTable);
    document.getElementById("filter-type").addEventListener("change", loadFinesTable);
    document.getElementById("btn-refresh").addEventListener("click", () => {
      loadStatistics();
      loadFinesTable();
      showToast("Đã làm mới dữ liệu tiền phạt", "success");
    });
    document.getElementById("btn-export-csv").addEventListener("click", exportFinesToCSV);

    // Bảng table delegate clicks
    document.getElementById("fines-table-body").addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-action");
      if (!btn) return;
      const action = btn.dataset.action;
      const fineId = parseInt(btn.dataset.id);

      if (action === "pay") openPayModal(fineId);
      else if (action === "waive") openWaiveModal(fineId);
      else if (action === "receipt") openReceiptModal(fineId);
    });

    // Đóng Modal bằng nút close hoặc backdrop click
    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.style.display = "none";
      });
    });

    // Chuyển phương thức thanh toán trong Modal Thu tiền
    document.querySelectorAll('input[name="pay-method"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        document.querySelectorAll(".method-option").forEach((opt) => opt.classList.remove("active"));
        e.target.closest(".method-option").classList.add("active");

        const qrBox = document.getElementById("qr-transfer-box");
        qrBox.style.display = e.target.value === "CHUYỂN KHOẢN" ? "block" : "none";
      });
    });

    // Nút xác nhận thu tiền & miễn phạt
    document.getElementById("btn-confirm-pay").addEventListener("click", handleConfirmPay);
    document.getElementById("btn-confirm-waive").addEventListener("click", handleConfirmWaive);

    // Gợi ý lý do nhanh trong Modal Miễn phạt
    document.querySelectorAll(".chip-btn").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.getElementById("waive-reason-input").value = chip.dataset.reason;
      });
    });

    // In biên lai
    document.getElementById("btn-print-receipt").addEventListener("click", () => {
      window.print();
    });

    // Cổng độc giả
    document.getElementById("btn-reader-check").addEventListener("click", handleReaderCheck);
    document.getElementById("reader-card-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleReaderCheck();
    });

    // Expose hàm xem biên lai ra window cho nút trong bảng Reader
    window.viewFineReceipt = openReceiptModal;
  }

  // 16. KHỞI CHẠY TRANG & PHÂN QUYỀN THEO VAI TRÒ
  function renderLoginRequiredGuard() {
    const container = document.querySelector(".fines-main-container");
    if (!container) return;
    container.innerHTML = `
      <div class="card-panel" style="max-width: 540px; margin: 56px auto; padding: 32px; text-align: center;">
        <div style="width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center;">
          <span class="material-symbols-outlined" style="font-size: 28px;">lock</span>
        </div>
        <h2 class="font-headline" style="margin: 0 0 8px; color: var(--color-brand);">Yêu cầu đăng nhập</h2>
        <p style="margin: 0 0 22px; color: var(--color-text-secondary); font-size: 14px;">
          Vui lòng đăng nhập để xem khoản phạt cá nhân (Độc giả) hoặc xử lý thu phạt / miễn phạt (Thủ thư, Admin).
        </p>
        <div style="display: flex; justify-content: center; gap: 12px;">
          <a href="login.html#login" class="btn btn-primary" style="text-decoration: none;">Đăng nhập ngay →</a>
          <a href="home.html" class="btn btn-secondary" style="text-decoration: none;">Về Trang chủ</a>
        </div>
      </div>
    `;
  }

  window.addEventListener("DOMContentLoaded", () => {
    const token =
      typeof auth !== "undefined" && typeof auth.getToken === "function"
        ? auth.getToken()
        : localStorage.getItem("access_token") || localStorage.getItem("token");
    const user = getCurrentUser();

    if (!token || !user) {
      try { sessionStorage.setItem("redirect_after_login", window.location.href); } catch (_) {}
      const sidebar = document.getElementById("app-sidebar");
      if (sidebar) sidebar.style.display = "none";
      const wrap = document.querySelector(".fines-workspace-wrapper");
      if (wrap) wrap.style.marginLeft = "0";
      renderLoginRequiredGuard();
      return;
    }

    currentUserRole = (user.role || "READER").toUpperCase();
    const roleLabels = { ADMIN: "Quản trị viên", LIBRARIAN: "Thủ thư trực quầy", READER: "Độc giả" };

    const avatarEl = document.getElementById("user-avatar");
    if (avatarEl) avatarEl.textContent = (user.full_name || user.email || "U").charAt(0).toUpperCase();
    const nameEl = document.getElementById("user-display-name");
    if (nameEl) nameEl.textContent = user.full_name || user.email;
    const roleEl = document.getElementById("user-display-role");
    if (roleEl) roleEl.textContent = roleLabels[currentUserRole] || currentUserRole;

    document.getElementById("btn-logout")?.addEventListener("click", () => {
      if (typeof auth !== "undefined") auth.clearSession();
      window.location.href = "login.html#login";
    });

    initEvents();

    // Nếu là Độc giả -> chỉ hiện cổng Xem phạt cá nhân (/api/fines/my-fines)
    if (currentUserRole === "READER") {
      const sidebar = document.getElementById("app-sidebar");
      if (sidebar) sidebar.style.display = "none";
      const wrap = document.querySelector(".fines-workspace-wrapper");
      if (wrap) wrap.style.marginLeft = "0";

      const staffTab = document.getElementById("tab-staff-view");
      const readerTab = document.getElementById("tab-reader-view");
      const staffView = document.getElementById("staff-view");
      const readerView = document.getElementById("reader-view");
      const readerSearchCard = document.querySelector(".reader-search-card");

      if (staffTab) staffTab.style.display = "none";
      if (staffView) staffView.style.display = "none";
      if (readerSearchCard) readerSearchCard.style.display = "none";
      if (readerTab) readerTab.classList.add("active");
      if (readerView) readerView.style.display = "block";

      const bc = document.querySelector(".breadcrumb-nav .highlight");
      if (bc) bc.textContent = "Khoản phạt cá nhân";
      const titleEl = document.querySelector(".page-title");
      if (titleEl) titleEl.textContent = "Khoản phạt cá nhân của tôi";
      const subEl = document.querySelector(".page-subtitle");
      if (subEl) subEl.textContent = "Theo dõi các khoản phạt vi phạm, trạng thái thanh toán và xem biên lai điện tử.";

      loadMyFinesForReader();
      return;
    }

    // Dành cho Thủ thư / Admin: đọc query params nếu điều hướng từ Dashboard (?loan_code=...&reader=...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const kwParam = urlParams.get("loan_code") || urlParams.get("reader") || urlParams.get("search") || "";
      if (kwParam) {
        const kwInput = document.getElementById("filter-keyword");
        const clearBtn = document.getElementById("btn-clear-search");
        const statusSel = document.getElementById("filter-status");
        if (kwInput) kwInput.value = kwParam;
        if (clearBtn) clearBtn.style.display = "flex";
        if (statusSel) statusSel.value = "ALL";
      }
      if (urlParams.get("tab") === "reader") {
        document.getElementById("tab-reader-view")?.click();
      }
    } catch (_) {}

    loadStatistics();
    loadFinesTable();
  });
})();
