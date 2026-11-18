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
    if (window.API_BASE_URL) return window.API_BASE_URL;
    const origin = window.location.origin;
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return "http://127.0.0.1:8000/api";
    }
    return "/api";
  })();

  // 2. DỮ LIỆU DỰ PHÒNG CHUẨN (MOCK DATA KHI CHƯA BẬT SERVER BACKEND)
  const FALLBACK_FINES = [
    {
      id: 1,
      user_id: 101,
      user_name: "Nguyễn Văn An",
      user_email: "an.nguyen@student.ptit.edu.vn",
      user_phone: "0901234567",
      card_code: "LC-2026-0042",
      loan_id: 12,
      book_copy_id: 201,
      copy_code: "CP-IT-001",
      book_title: "Lập trình Web Hiện đại với Python & FastAPI",
      book_isbn: "BK-IT-2024-001",
      fine_type: "QUÁ HẠN",
      amount: 14000,
      status: "UNPAID",
      collected_by: null,
      collector_name: null,
      collected_at: null,
      waive_reason: null,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 2,
      user_id: 102,
      user_name: "Trần Thị Bích Ngọc",
      user_email: "ngoc.tran@student.ptit.edu.vn",
      user_phone: "0912345678",
      card_code: "LC-2026-0089",
      loan_id: 14,
      book_copy_id: 205,
      copy_code: "CP-MS-004",
      book_title: "Kiến trúc Hệ thống & Thiết kế Microservices",
      book_isbn: "BK-IT-2023-089",
      fine_type: "HỎNG",
      amount: 60000,
      status: "UNPAID",
      collected_by: null,
      collector_name: null,
      collected_at: null,
      waive_reason: "Ghi chú: Rách trang 45-50",
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 3,
      user_id: 103,
      user_name: "Lê Hoàng Long",
      user_email: "long.le@student.ptit.edu.vn",
      user_phone: "0988776655",
      card_code: "LC-2026-0112",
      loan_id: 9,
      book_copy_id: 210,
      copy_code: "CP-BA-012",
      book_title: "Kinh tế số & Công nghệ Tài chính (Fintech)",
      book_isbn: "BK-BA-2024-015",
      fine_type: "QUÁ HẠN",
      amount: 8000,
      status: "PAID",
      collected_by: 2,
      collector_name: "Trịnh Huy Đại",
      collected_at: new Date().toISOString(),
      waive_reason: "PT: TIỀN MẶT | Thu tại quầy K1",
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 4,
      user_id: 104,
      user_name: "Phạm Minh Đức",
      user_email: "duc.pm@student.ptit.edu.vn",
      user_phone: "0977112233",
      card_code: "LC-2026-0201",
      loan_id: 18,
      book_copy_id: 215,
      copy_code: "CP-CC-002",
      book_title: "Clean Code - Nghệ thuật viết mã sạch",
      book_isbn: "BK-IT-2022-044",
      fine_type: "QUÁ HẠN",
      amount: 10000,
      status: "WAIVED",
      collected_by: 1,
      collector_name: "Quản trị viên Hệ thống",
      collected_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      waive_reason: "Độc giả có giấy xác nhận điều trị nội trú tại bệnh viện",
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
  ];

  let currentFinesList = [];
  let isUsingFallback = false;

  // 3. TIỆN ÍCH AUTH & TOKEN
  function getAuthHeader() {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function getCurrentUser() {
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
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 6. GỌI API BACKEND VỚI CƠ CHẾ DỰ PHÒNG THÔNG MINH
  async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Lỗi HTTP ${res.status}: ${res.statusText}`
        );
      }
      isUsingFallback = false;
      return await res.json();
    } catch (err) {
      // Nếu không kết nối được server (Server offline / CORS)
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        console.warn(`[Fines] Backend offline tại ${url}, chuyển sang chế độ Client-side fallback.`);
        isUsingFallback = true;
        return handleFallback(endpoint, options);
      }
      throw err;
    }
  }

  // Xử lý Offline Mock khi Backend chưa bật
  function handleFallback(endpoint, options) {
    if (endpoint.startsWith("/fines/statistics")) {
      const unpaid = currentFinesList.filter((f) => f.status === "UNPAID");
      const paid = currentFinesList.filter((f) => f.status === "PAID");
      const waived = currentFinesList.filter((f) => f.status === "WAIVED");
      return {
        total_fines_count: currentFinesList.length,
        total_unpaid_amount: unpaid.reduce((sum, f) => sum + f.amount, 0),
        unpaid_count: unpaid.length,
        paid_count: paid.length,
        total_paid_today: paid.reduce((sum, f) => sum + f.amount, 0),
        waived_count: waived.length,
      };
    }

    if (endpoint.startsWith("/fines?")) {
      const urlObj = new URL(`http://dummy${endpoint}`);
      const status = urlObj.searchParams.get("status");
      const fine_type = urlObj.searchParams.get("fine_type");
      const search = (urlObj.searchParams.get("search") || "").toLowerCase();

      return currentFinesList.filter((f) => {
        if (status && status !== "ALL" && f.status !== status) return false;
        if (
          fine_type &&
          fine_type !== "ALL" &&
          !f.fine_type.toUpperCase().includes(fine_type.toUpperCase())
        )
          return false;
        if (search) {
          const matchStr = `${f.user_name} ${f.card_code} ${f.book_title} ${f.copy_code} ${f.book_isbn}`.toLowerCase();
          if (!matchStr.includes(search)) return false;
        }
        return true;
      });
    }

    if (endpoint.includes("/pay")) {
      const id = parseInt(endpoint.split("/")[2]);
      const body = JSON.parse(options.body || "{}");
      const item = currentFinesList.find((f) => f.id === id);
      if (item) {
        item.status = "PAID";
        item.collected_at = new Date().toISOString();
        item.collector_name = "Trịnh Huy Đại";
        item.waive_reason = `PT: ${body.payment_method || "TIỀN MẶT"} | ${body.note || "Thu tại quầy"}`;
        return item;
      }
    }

    if (endpoint.includes("/waive")) {
      const id = parseInt(endpoint.split("/")[2]);
      const body = JSON.parse(options.body || "{}");
      const item = currentFinesList.find((f) => f.id === id);
      if (item) {
        item.status = "WAIVED";
        item.collected_at = new Date().toISOString();
        item.collector_name = "Quản trị viên Hệ thống";
        item.waive_reason = body.waive_reason || "Miễn giảm theo quy định";
        return item;
      }
    }

    if (endpoint.includes("/receipt")) {
      const id = parseInt(endpoint.split("/")[2]);
      const item = currentFinesList.find((f) => f.id === id) || currentFinesList[0];
      return {
        receipt_no: `REC-${String(item.id).padStart(6, "0")}`,
        fine_id: item.id,
        created_at: item.created_at,
        collected_at: item.collected_at || new Date().toISOString(),
        reader_name: item.user_name,
        reader_card_code: item.card_code,
        reader_phone: item.user_phone,
        reader_email: item.user_email,
        book_title: item.book_title,
        copy_code: item.copy_code,
        book_isbn: item.book_isbn,
        fine_type: item.fine_type,
        amount: item.amount,
        amount_in_words: numberToWords(item.amount),
        payment_method: (item.waive_reason && item.waive_reason.includes("CHUYỂN KHOẢN")) ? "Chuyển khoản QR" : "Tiền mặt tại quầy",
        status: item.status,
        collector_name: item.collector_name || "Trịnh Huy Đại",
        collector_role: "Thủ thư ca trực",
        waive_reason: item.waive_reason,
        note: item.waive_reason,
      };
    }

    if (endpoint.includes("/my-fines")) {
      return {
        user_id: 101,
        user_name: "Nguyễn Văn An",
        card_code: "LC-2026-0042",
        total_unpaid_amount: 14000,
        unpaid_count: 1,
        fines: currentFinesList.filter((f) => f.user_id === 101 || f.card_code === "LC-2026-0042"),
      };
    }

    return currentFinesList;
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

          // Nút thao tác
          let actionsHtml = "";
          if (s === "UNPAID") {
            actionsHtml = `
              <div class="action-buttons">
                <button type="button" class="btn-action pay" title="Thu tiền phạt" data-action="pay" data-id="${f.id}">
                  <span class="material-symbols-outlined" style="font-size: 18px;">payments</span>
                </button>
                <button type="button" class="btn-action waive" title="Admin miễn phạt" data-action="waive" data-id="${f.id}">
                  <span class="material-symbols-outlined" style="font-size: 18px;">verified_user</span>
                </button>
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
              <td class="font-mono" style="font-weight: 600; color: var(--color-brand);">#FN-${String(f.id).padStart(4, "0")}</td>
              <td>
                <div style="font-weight: 600; color: var(--color-text-primary);">${f.user_name || "Độc giả"}</div>
                <div style="font-size: 11.5px; color: var(--color-text-muted);">
                  Thẻ: <strong class="font-mono">${f.card_code || "Chưa cấp"}</strong>
                </div>
              </td>
              <td>
                <div style="font-weight: 600; color: var(--color-text-primary); max-width: 280px; white-space: normal;">
                  ${f.book_title || "Ấn bản thư viện"}
                </div>
                <div style="font-size: 11.5px; color: var(--color-text-muted);">
                  Mã bản sao: <strong class="font-mono">${f.copy_code || "N/A"}</strong>
                </div>
              </td>
              <td>
                <span class="fine-badge ${typeClass}">${f.fine_type || "Vi phạm"}</span>
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
            <p>Không thể kết nối đến máy chủ: ${err.message}</p>
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
      document.getElementById("receipt-sig-collector").textContent = receipt.collector_name || "Trịnh Huy Đại";

      document.getElementById("modal-receipt").style.display = "flex";
    } catch (err) {
      showToast(`Không thể tạo biên lai: ${err.message}`, "error");
    }
  }

  // 12. CỔNG ĐỘC GIẢ: TRA CỨU KHOẢN PHẠT
  async function handleReaderCheck() {
    const input = document.getElementById("reader-card-input").value.trim();
    if (!input) {
      showToast("Vui lòng nhập mã thẻ hoặc mã ID bạn đọc", "error");
      return;
    }

    const alertBox = document.getElementById("reader-alert-box");
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
      // Tìm theo endpoint search hoặc my-fines
      const fines = await fetchAPI(`/fines?search=${encodeURIComponent(input)}`);
      if (!fines || fines.length === 0) {
        alertBox.style.display = "none";
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state">
              <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-success);">check_circle</span>
              <p style="margin: 8px 0 0; font-weight: 600; color: var(--color-success);">
                Tuyệt vời! Không có khoản phạt nào ghi nhận cho độc giả này.
              </p>
            </td>
          </tr>
        `;
        return;
      }

      const unpaidFines = fines.filter((f) => f.status === "UNPAID");
      const totalUnpaid = unpaidFines.reduce((sum, f) => sum + f.amount, 0);

      if (unpaidFines.length > 0) {
        alertBox.style.display = "flex";
        document.getElementById("reader-alert-title").textContent = `Bạn có ${unpaidFines.length} khoản phạt chưa thanh toán`;
        document.getElementById("reader-alert-amount").textContent = formatVND(totalUnpaid);
      } else {
        alertBox.style.display = "none";
      }

      document.getElementById("reader-result-name").textContent = `Khoản phạt của: ${fines[0].user_name} (${fines[0].card_code})`;
      document.getElementById("reader-record-count").textContent = `${fines.length} khoản`;

      tbody.innerHTML = fines
        .map((f) => {
          const s = (f.status || "").toUpperCase();
          let statusBadge = "";
          if (s === "PAID") statusBadge = `<span class="status-badge paid">Đã nộp</span>`;
          else if (s === "WAIVED") statusBadge = `<span class="status-badge waived">Đã miễn</span>`;
          else statusBadge = `<span class="status-badge unpaid">Chưa nộp</span>`;

          return `
            <tr>
              <td class="font-mono">#FN-${String(f.id).padStart(4, "0")}</td>
              <td>
                <div style="font-weight: 600;">${f.book_title}</div>
                <div style="font-size: 11.5px; color: #666;">Bản sao: ${f.copy_code}</div>
              </td>
              <td><span class="fine-badge overdue">${f.fine_type}</span></td>
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
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state" style="color: var(--color-danger);">
            Lỗi tra cứu: ${err.message}
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

    // Tìm kiếm nhanh trên topbar
    document.getElementById("topbar-quick-search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        document.getElementById("filter-keyword").value = e.target.value;
        loadFinesTable();
      }
    });

    // Expose hàm xem biên lai ra window cho nút trong bảng Reader
    window.viewFineReceipt = openReceiptModal;
  }

  // 16. KHỞI CHẠY TRANG
  window.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo danh sách mẫu nếu server chưa có
    currentFinesList = [...FALLBACK_FINES];

    // Cập nhật tên người dùng hiển thị
    const user = getCurrentUser();
    if (user && user.full_name) {
      document.getElementById("user-display-name").textContent = user.full_name;
      document.getElementById("user-display-role").textContent = `${user.role || 'Thủ thư'} (B25DTCN151)`;
    }

    initEvents();
    loadStatistics();
    loadFinesTable();
  });
})();
