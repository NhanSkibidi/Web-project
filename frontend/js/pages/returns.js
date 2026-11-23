/**
 * Trả sách tại quầy & Thu phí phạt (Task T3CFF12, T3CFEDE, T3CFEF8)
 * HN-KS25-CNTT1 - Sinh viên: Trịnh Huy Đại (B25DTCN151)
 */

// State hiện tại của phiên tiếp nhận trả sách
const state = {
  currentReader: null,
  activeItems: [],
  paymentMethod: "cash",
  cashReceived: 0,
  txCode: "#TX-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-01",
  shouldResetOnModalClose: false,
  todaySummary: {
    returned_today_count: 0,
    fines_collected_today: 0,
  },
};

function renderAuthGuard(reasonTitle, reasonDesc, ctaLabel, ctaHref) {
  const container = document.querySelector(".returns-main-container");
  if (!container) return;
  container.innerHTML = `
    <div class="panel-card" style="max-width: 560px; margin: 48px auto; padding: 32px; text-align: center;">
      <div style="width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center;">
        <span class="material-symbols-outlined" style="font-size: 28px;">lock</span>
      </div>
      <h2 class="font-headline" style="margin: 0 0 8px; color: var(--color-brand);">${escapeHtml(reasonTitle)}</h2>
      <p style="margin: 0 0 22px; color: var(--color-text-secondary); font-size: 14px;">${escapeHtml(reasonDesc)}</p>
      <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
        <a href="${ctaHref}" class="btn-brand-primary" style="text-decoration: none;">${escapeHtml(ctaLabel)}</a>
        <a href="home.html" class="btn-header-action" style="text-decoration: none;">Về Trang chủ</a>
      </div>
    </div>
  `;
}

// ==============================================================================
// HỘP THOẠI XÁC NHẬN CHUNG / ĐĂNG XUẤT (showConfirm - ĐỒNG BỘ LOAN_MANAGEMENT)
// ==============================================================================
let activeConfirmCallback = null;

function showConfirm(options) {
  // options = { title, message, type: "green"|"red"|"blue", confirmText, cancelText, onConfirm }
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

  // Màu sắc icon & nút xác nhận
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
}

function closeConfirmModal() {
  const modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.remove("active");
  activeConfirmCallback = null;
}

// Khởi chạy khi tài liệu nạp xong
document.addEventListener("DOMContentLoaded", () => {
  const token = typeof auth !== "undefined" ? auth.getToken() : null;
  const staffUser = typeof auth !== "undefined" ? auth.getUser() : null;

  if (!token || !staffUser) {
    try { sessionStorage.setItem("redirect_after_login", window.location.href); } catch (_) {}
    renderAuthGuard(
      "Yêu cầu đăng nhập Thủ thư",
      "Chức năng Tiếp nhận Trả sách tại quầy yêu cầu tài khoản Thủ thư (LIBRARIAN) hoặc Quản trị viên (ADMIN).",
      "Đăng nhập ngay →",
      "login.html#login"
    );
    return;
  }

  if (!["ADMIN", "LIBRARIAN"].includes(staffUser.role)) {
    renderAuthGuard(
      "Không đủ quyền truy cập (403)",
      `Tài khoản "${staffUser.full_name || staffUser.email}" (${staffUser.role}) không có quyền sử dụng quầy trả sách.`,
      "Quay về Cổng Độc giả",
      "home.html"
    );
    return;
  }

  // Hiển thị thông tin thủ thư đang đăng nhập trên Topbar (đồng bộ loan_management)
  const displayName = staffUser.full_name || staffUser.email || "Thủ thư";
  const initialChar = displayName.charAt(0).toUpperCase();
  const displayRole = staffUser.role === "ADMIN" ? "Quản trị viên" : "Thủ thư trực quầy";

  const userAvatarEl = document.getElementById("userAvatar");
  const userNameEl = document.getElementById("userName");
  const userRoleEl = document.getElementById("userRole");

  if (userAvatarEl) userAvatarEl.textContent = initialChar;
  if (userNameEl) userNameEl.textContent = displayName;
  if (userRoleEl) userRoleEl.textContent = displayRole;

  // Header Mobile Menu & User Dropdown (đồng bộ loan_management)
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navMenu = document.getElementById("navMenu");
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      navMenu.classList.toggle("show");
    });
  }

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
        showToast("Phiên làm việc đã kết thúc. Đang chuyển hướng...", "info");
        setTimeout(() => {
          window.location.href = "login.html#login";
        }, 500);
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

  // Sự kiện trong Hộp thoại xác nhận chung (Confirm modal)
  const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
  const btnConfirmProceed = document.getElementById("btn-confirm-proceed");
  const confirmModal = document.getElementById("confirm-modal");

  if (btnConfirmCancel) btnConfirmCancel.addEventListener("click", closeConfirmModal);

  if (btnConfirmProceed) {
    btnConfirmProceed.addEventListener("click", () => {
      const callback = activeConfirmCallback;
      closeConfirmModal();
      if (typeof callback === "function") {
        callback();
      }
    });
  }

  if (confirmModal) {
    confirmModal.addEventListener("click", (e) => {
      if (e.target === confirmModal) closeConfirmModal();
    });
  }

  // Phím Escape để đóng modal hoặc dropdown
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (confirmModal && confirmModal.classList.contains("active")) {
        closeConfirmModal();
      }
      if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
        userDropdownMenu.classList.remove("show");
        if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
      }
      if (navMenu && navMenu.classList.contains("show")) {
        navMenu.classList.remove("show");
      }
    }
  });

  const txBadge = document.getElementById("tx-code");
  if (txBadge) txBadge.textContent = state.txCode;

  initEventListeners();
  renderAll();
  loadTodaySummary();

  // Nếu mở kèm ?copy_code=... thì tự tra cứu ngay
  try {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("copy_code") || params.get("barcode");
    if (codeParam) {
      const input = document.getElementById("barcode-scanner");
      if (input) input.value = codeParam;
      handleScanCode(codeParam);
    }
  } catch (_) {}
});

function initEventListeners() {
  // Form quét barcode
  const scanForm = document.getElementById("scan-form");
  if (scanForm) {
    scanForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = document.getElementById("barcode-scanner").value.trim();
      if (code) handleScanCode(code);
    });
  }

  // Nút thêm ấn phẩm khác của độc giả
  const btnAddExtra = document.getElementById("btn-add-extra");
  if (btnAddExtra) {
    btnAddExtra.addEventListener("click", handleAddExtraItem);
  }

  // Nút trả toàn bộ phiếu mượn (POST /api/returns/loan)
  const btnReturnFullLoan = document.getElementById("btn-return-full-loan");
  if (btnReturnFullLoan) {
    btnReturnFullLoan.addEventListener("click", handleReturnFullLoan);
  }

  // Checkbox chọn tất cả dòng trong bảng
  const checkAllItems = document.getElementById("check-all-items");
  if (checkAllItems) {
    checkAllItems.addEventListener("change", (e) => {
      const checked = Boolean(e.target.checked);
      state.activeItems.forEach((it) => {
        it.checked = checked;
      });
      renderTableRows();
      updateSettlementCalculations();
    });
  }

  // Máy tính tiền thừa khi khách đưa tiền mặt
  const cashInput = document.getElementById("cash-received-input");
  if (cashInput) {
    cashInput.addEventListener("input", (e) => {
      const rawVal = e.target.value.replace(/[^0-9]/g, "");
      state.cashReceived = Number(rawVal) || 0;
      updateSettlementCalculations();
    });
  }

  // Chọn phương thức thanh toán
  document.querySelectorAll('input[name="payment-method"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      state.paymentMethod = e.target.value;
      updatePaymentMethodUI();
    });
  });

  // Nút xác nhận trả sách & thu tiền
  const btnConfirm = document.getElementById("btn-confirm-return");
  if (btnConfirm) {
    btnConfirm.addEventListener("click", handleConfirmReturn);
  }

  // Nút hủy bỏ lượt tiếp nhận
  const btnCancel = document.getElementById("btn-cancel-return");
  if (btnCancel) {
    btnCancel.addEventListener("click", handleCancelReturn);
  }

  // Modal actions
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnFinishModal = document.getElementById("btn-finish-modal");
  if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
  if (btnFinishModal) btnFinishModal.addEventListener("click", resetDeskAfterSuccess);

  const btnPrintReceipt = document.getElementById("btn-print-receipt-action");
  if (btnPrintReceipt) {
    btnPrintReceipt.addEventListener("click", () => {
      window.print();
    });
  }

  // Nút xem lịch sử trả hôm nay
  const btnViewHistory = document.getElementById("btn-view-history");
  if (btnViewHistory) {
    btnViewHistory.addEventListener("click", async () => {
      await loadTodaySummary();
      const s = state.todaySummary;
      showToast(
        `Hôm nay đã ghi nhận ${s.returned_today_count} lượt trả sách và thu ${formatVND(s.fines_collected_today)} tiền phạt.`
      );
    });
  }

  // Nút quy định tính phạt
  const btnViewPolicy = document.getElementById("btn-view-policy");
  const policyModal = document.getElementById("policy-modal");
  const btnClosePolicy = document.getElementById("btn-close-policy-modal");
  const btnClosePolicyX = document.getElementById("btn-close-policy-x");

  if (btnViewPolicy && policyModal) {
    btnViewPolicy.addEventListener("click", () => {
      policyModal.classList.remove("hidden");
    });
  }

  const hidePolicy = () => {
    if (policyModal) policyModal.classList.add("hidden");
  };

  if (btnClosePolicy) btnClosePolicy.addEventListener("click", hidePolicy);
  if (btnClosePolicyX) btnClosePolicyX.addEventListener("click", hidePolicy);

  if (policyModal) {
    policyModal.addEventListener("click", (e) => {
      if (e.target === policyModal) hidePolicy();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !policyModal.classList.contains("hidden")) {
        hidePolicy();
      }
    });
  }
}

async function loadTodaySummary() {
  try {
    const res = await api.get("/returns/today-summary");
    if (res) {
      state.todaySummary = {
        returned_today_count: Number(res.returned_today_count || 0),
        fines_collected_today: Number(res.fines_collected_today || 0),
      };
      const countEl = document.getElementById("history-count");
      if (countEl) countEl.textContent = String(state.todaySummary.returned_today_count);
    }
  } catch (err) {
    console.warn("Không thể tải thống kê trả sách trong ngày:", err);
  }
}

// Xử lý khi quét hoặc nhập mã ấn bản (Nối trực tiếp Backend /api/returns/lookup/{code})
async function handleScanCode(code) {
  const cleanCode = (code || "").trim();
  if (!cleanCode) return;

  try {
    showToast(`Đang tra cứu ấn bản "${cleanCode}"...`);
    const data = await api.get(`/returns/lookup/${encodeURIComponent(cleanCode)}`);

    if (!data) {
      showToast(`Không tìm thấy ấn bản với mã "${cleanCode}"`, "error");
      return;
    }

    // Kiểm tra xem cuốn sách này đã có trong danh sách đang xử lý chưa
    const existed = state.activeItems.find((it) => it.copy_code === data.copy_code);
    if (existed) {
      showToast(`Ấn phẩm "${data.copy_code}" đã có trong danh sách trả!`, "error");
      return;
    }

    // Tránh gộp nhiều độc giả trong cùng 1 phiên trả
    if (state.currentReader && state.currentReader.id && data.user && state.currentReader.id !== data.user.id) {
      showToast(
        `Ấn bản "${data.copy_code}" thuộc độc giả ${data.user.full_name}. Vui lòng hoàn tất hoặc hủy lượt hiện tại trước!`,
        "error"
      );
      return;
    }

    // Thiết lập hoặc bổ sung thông tin độc giả & phiếu mượn
    if (!state.currentReader && data.user) {
      state.currentReader = {
        ...data.user,
        loan_id: data.loan_id,
        loan_code: data.loan_code || `#PM-${String(data.loan_id || "").padStart(4, "0")}`,
        due_date: data.due_date ? formatDate(data.due_date) : "--/--/----",
        is_overdue: Boolean(data.is_overdue),
        borrow_date: data.borrowed_at ? formatDate(data.borrowed_at) : "--/--/----",
        librarian_name: data.librarian_name || "Quầy trực",
        other_borrowed_items: Array.isArray(data.other_borrowed_items) ? data.other_borrowed_items : [],
      };
    } else if (state.currentReader && Array.isArray(state.currentReader.other_borrowed_items)) {
      state.currentReader.other_borrowed_items = state.currentReader.other_borrowed_items.filter(
        (x) => x.copy_code !== data.copy_code
      );
    }

    const overdueDays = Number(data.overdue_days || 0);
    const overdueFine = Number(data.overdue_fine_amount || overdueDays * 2000);

    const newItem = {
      copy_id: data.copy_id,
      copy_code: data.copy_code,
      loan_id: data.loan_id,
      book_title: data.book_title,
      shelf_location: data.shelf_location || "Kệ tổng",
      due_date: data.due_date ? formatDate(data.due_date) : "--/--/----",
      is_overdue: overdueDays > 0,
      overdue_days: overdueDays,
      overdue_fine: overdueFine,
      condition_type: "NORMAL",
      condition_label: "Bình thường / Nguyên vẹn",
      note: "",
      damage_fine: 0,
      book_price: Number(data.book_price || 0),
      checked: true,
    };

    state.activeItems.push(newItem);
    const scanInput = document.getElementById("barcode-scanner");
    if (scanInput) scanInput.value = "";
    showToast(`Đã thêm "${data.book_title}" (${data.copy_code}) vào danh sách trả.`);

    // Tự động hoàn tất nếu người dùng tick checkbox
    const autoComplete = document.getElementById("auto-single-complete");
    if (autoComplete && autoComplete.checked && state.activeItems.length === 1) {
      renderAll();
      setTimeout(handleConfirmReturn, 400);
      return;
    }

    renderAll();
  } catch (err) {
    showToast(err.message || `Không tìm thấy ấn bản "${cleanCode}" đang mượn`, "error");
  }
}

// Thêm ấn phẩm khác cùng phiếu mượn
function handleAddExtraItem() {
  if (!state.currentReader || !state.currentReader.other_borrowed_items || state.currentReader.other_borrowed_items.length === 0) {
    showToast("Độc giả không còn ấn bản nào khác trong phiếu mượn này.");
    return;
  }

  const extra = state.currentReader.other_borrowed_items.shift();
  if (state.activeItems.some((it) => it.copy_code === extra.copy_code)) {
    renderAll();
    return;
  }

  const newItem = {
    copy_id: extra.copy_id,
    copy_code: extra.copy_code,
    loan_id: state.currentReader.loan_id,
    book_title: extra.book_title,
    shelf_location: extra.shelf_location || "Kệ tổng",
    due_date: extra.due_date ? formatDate(extra.due_date) : "--/--/----",
    is_overdue: Boolean(extra.is_overdue),
    overdue_days: Number(extra.overdue_days || 0),
    overdue_fine: Number(extra.overdue_fine_amount || 0),
    condition_type: "NORMAL",
    condition_label: "Bình thường / Nguyên vẹn",
    note: "",
    damage_fine: 0,
    book_price: Number(extra.book_price || 0),
    checked: true,
  };

  state.activeItems.push(newItem);
  showToast(`Đã nạp thêm "${newItem.book_title}"`);
  renderAll();
}

// Thay đổi tình trạng sách ở mỗi dòng (Khớp Backend: 0%, 50% Hỏng, 100% Mất)
function handleConditionChange(index, newType) {
  const item = state.activeItems[index];
  if (!item) return;

  item.condition_type = newType;
  if (newType === "NORMAL") {
    item.condition_label = "Bình thường / Nguyên vẹn";
    item.damage_fine = 0;
  } else if (newType === "DAMAGED") {
    item.condition_label = "Hư hỏng sách (50% giá bìa)";
    item.damage_fine = Math.round(item.book_price * 0.5);
  } else if (newType === "LOST") {
    item.condition_label = "Báo mất ấn bản (100% giá bìa)";
    item.damage_fine = Math.round(item.book_price * 1.0);
  }

  renderReaderCard();
  renderTableRows();
  updateSettlementCalculations();
}

function handleToggleItem(index, isChecked) {
  const item = state.activeItems[index];
  if (!item) return;
  item.checked = Boolean(isChecked);
  const checkAll = document.getElementById("check-all-items");
  if (checkAll) {
    checkAll.checked = state.activeItems.length > 0 && state.activeItems.every((it) => it.checked !== false);
  }
  updateSettlementCalculations();
}

// Xóa 1 ấn phẩm khỏi danh sách trả
function handleRemoveItem(index) {
  const removed = state.activeItems.splice(index, 1)[0];
  if (removed) {
    if (state.activeItems.length === 0) {
      // Hết ấn phẩm trong bảng -> giải phóng độc giả hiện tại để quét lượt mới không bị kẹt
      state.currentReader = null;
    } else if (
      state.currentReader &&
      removed.loan_id === state.currentReader.loan_id &&
      Array.isArray(state.currentReader.other_borrowed_items) &&
      !state.currentReader.other_borrowed_items.some((x) => x.copy_code === removed.copy_code)
    ) {
      state.currentReader.other_borrowed_items.push({
        copy_id: removed.copy_id,
        copy_code: removed.copy_code,
        book_title: removed.book_title,
        shelf_location: removed.shelf_location,
        due_date: removed.due_date,
        is_overdue: removed.is_overdue,
        overdue_days: removed.overdue_days,
        overdue_fine_amount: removed.overdue_fine,
        book_price: removed.book_price,
      });
    }
    showToast(`Đã bỏ "${removed.book_title}" khỏi lượt trả.`);
  }
  renderAll();
}

// Cập nhật giao diện toàn bộ
function renderAll() {
  renderReaderCard();
  renderTableRows();
  updateSettlementCalculations();
}

// Cập nhật thẻ độc giả
function renderReaderCard() {
  const reader = state.currentReader || {
    full_name: "Chưa quét ấn phẩm",
    student_id: "--------",
    email: "Đang chờ thủ thư thao tác quét mã bản sao...",
    loan_code: "Chưa rõ",
    due_date: "--/--/----",
    borrow_date: "--/--/----",
    card_status: null,
    librarian_name: "—",
    other_borrowed_items: [],
  };

  const avatarText = reader.full_name && state.currentReader
    ? reader.full_name.charAt(0).toUpperCase()
    : "?";
  document.getElementById("reader-avatar-text").textContent = avatarText;
  document.getElementById("reader-name").textContent = reader.full_name;
  document.getElementById("reader-id").textContent = reader.card_code || reader.student_id || "--------";
  document.getElementById("reader-email").textContent = state.currentReader
    ? `${reader.email || "Chưa cập nhật email"}${reader.phone ? " · " + reader.phone : ""}`
    : reader.email;
  document.getElementById("loan-code").textContent = reader.loan_code || "Chưa rõ";

  const dueEl = document.getElementById("due-date-display");
  if (dueEl) {
    dueEl.textContent = reader.due_date || "--/--/----";
    dueEl.classList.toggle("due-danger", Boolean(state.activeItems.some((it) => it.is_overdue)));
  }

  document.getElementById("borrow-date-display").textContent = reader.borrow_date || "--/--/----";
  document.getElementById("borrow-count-display").textContent = `${String(state.activeItems.length).padStart(2, "0")} ấn bản`;

  const libEl = document.getElementById("loan-librarian-display");
  if (libEl) libEl.textContent = reader.librarian_name || "—";

  const statusBadge = document.getElementById("card-status-badge");
  if (statusBadge) {
    const st = (reader.card_status || "").toUpperCase();
    if (!state.currentReader) {
      statusBadge.innerHTML = `<span class="dot"></span> Chờ quét mã`;
    } else if (st === "ACTIVE") {
      statusBadge.innerHTML = `<span class="dot"></span> Thẻ hợp lệ`;
    } else {
      statusBadge.innerHTML = `<span class="dot" style="background:#DC2626;"></span> Thẻ ${escapeHtml(st || "Bị khóa")}`;
    }
  }

  document.getElementById("add-extra-reader-name").textContent = state.currentReader ? reader.full_name : "độc giả";
  document.getElementById("items-count-badge").textContent = String(state.activeItems.length).padStart(2, "0");

  const extraRemaining = Array.isArray(reader.other_borrowed_items) ? reader.other_borrowed_items.length : 0;
  const totalOnLoan = state.activeItems.length + extraRemaining;
  document.getElementById("scanned-progress-text").textContent = state.activeItems.length === 0
    ? "Chưa có bản sao nào trong lượt trả"
    : `Đã quét ${state.activeItems.length}/${totalOnLoan} cuốn thuộc phiếu mượn`;

  const btnAddExtra = document.getElementById("btn-add-extra");
  if (btnAddExtra) {
    btnAddExtra.style.opacity = extraRemaining > 0 ? "1" : "0.55";
  }

  const btnFullLoan = document.getElementById("btn-return-full-loan");
  if (btnFullLoan) {
    const hasLoan = Boolean(state.currentReader && state.currentReader.loan_id && state.activeItems.length > 0);
    btnFullLoan.style.display = hasLoan ? "inline-flex" : "none";
  }
}

// Render các dòng của bảng ấn phẩm
function renderTableRows() {
  const tbody = document.getElementById("return-items-body");
  if (!tbody) return;

  if (state.activeItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-mutedtext">
          <span class="material-symbols-outlined text-[36px] text-warmborder block mb-1">inventory_2</span>
          <span>Chưa có ấn bản nào được quét. Vui lòng quét hoặc nhập mã bản sao ở trên.</span>
        </td>
      </tr>
    `;
    const checkAll = document.getElementById("check-all-items");
    if (checkAll) checkAll.checked = false;
    return;
  }

  const checkAll = document.getElementById("check-all-items");
  if (checkAll) {
    checkAll.checked = state.activeItems.every((it) => it.checked !== false);
  }

  tbody.innerHTML = state.activeItems
    .map((item, index) => {
      const isDamaged = item.condition_type !== "NORMAL";
      const totalItemFine = item.overdue_fine + item.damage_fine;
      const isChecked = item.checked !== false;

      let conditionClass = "is-normal";
      let conditionIcon = "verified";
      if (item.condition_type === "DAMAGED") {
        conditionClass = "is-heavy-damage";
        conditionIcon = "broken_image";
      } else if (item.condition_type === "LOST") {
        conditionClass = "is-lost";
        conditionIcon = "search_off";
      }

      return `
        <tr class="${isDamaged ? "row-damaged" : ""}">
          <!-- Cột 1: Custom Tick -->
          <td style="width: 44px; text-align: center;">
            <label class="custom-tick-label" style="justify-content: center; margin: 0;">
              <input type="checkbox" class="custom-tick-input item-row-tick" ${isChecked ? "checked" : ""}
                     onchange="handleToggleItem(${index}, this.checked)">
              <span class="custom-tick-box">
                <span class="material-symbols-outlined tick-icon">check</span>
              </span>
            </label>
          </td>

          <!-- Cột 2: Tên & Mã & Vị trí -->
          <td style="min-width: 220px;">
            <div class="book-title-cell">${escapeHtml(item.book_title)}</div>
            <div class="book-meta-row">
              <span class="copy-code-pill">${escapeHtml(item.copy_code)}</span>
              <span class="shelf-pill">
                <span class="material-symbols-outlined">shelves</span>
                <span>${escapeHtml(item.shelf_location)}</span>
              </span>
            </div>
          </td>

          <!-- Cột 3: Hạn trả & Quá hạn -->
          <td style="min-width: 150px; text-align: center;">
            <div style="display: flex; flex-direction: column; align-items: center;">
              <span class="font-mono" style="font-size: 12px; color: var(--color-text-muted);">${escapeHtml(item.due_date)}</span>
              ${
                item.is_overdue
                  ? `<span class="badge-overdue">
                      <span class="dot"></span>
                      Quá hạn ${item.overdue_days} ngày
                    </span>
                    <span class="font-mono" style="font-size: 11px; color: var(--color-text-muted); margin-top: 2px;">2.000đ × ${item.overdue_days} ngày</span>`
                  : `<span class="badge-ontime">
                      <span class="dot"></span>
                      Đúng hạn
                    </span>
                    <span style="font-size: 11px; color: var(--color-success); margin-top: 2px;">Không phạt</span>`
              }
            </div>
          </td>

          <!-- Cột 4: Tình trạng vật lý (khớp quy chuẩn Backend: 0% / 50% / 100%) -->
          <td style="min-width: 260px;">
            <div class="condition-control-wrap">
              <div class="condition-select-shell ${conditionClass}">
                <span class="material-symbols-outlined condition-icon">${conditionIcon}</span>
                <select onchange="handleConditionChange(${index}, this.value)"
                        class="condition-select-native ${isDamaged ? "damaged" : ""}">
                  <option value="NORMAL" ${item.condition_type === "NORMAL" ? "selected" : ""}>Bình thường / Nguyên vẹn</option>
                  <option value="DAMAGED" ${item.condition_type === "DAMAGED" ? "selected" : ""}>Hỏng sách (50% giá bìa: ${formatVND(item.book_price * 0.5)})</option>
                  <option value="LOST" ${item.condition_type === "LOST" ? "selected" : ""}>Báo mất sách (100% giá bìa: ${formatVND(item.book_price)})</option>
                </select>
                <span class="material-symbols-outlined condition-arrow">expand_more</span>
              </div>

              ${
                item.condition_type === "NORMAL"
                  ? `<div class="condition-status-pill pill-normal">
                      <span class="material-symbols-outlined">verified</span>
                      <span>Sách đạt chuẩn lưu kho</span>
                    </div>`
                  : `<div class="condition-note-wrap">
                      <span class="material-symbols-outlined note-icon">edit_note</span>
                      <input type="text" value="${escapeHtml(item.note || "")}"
                             onchange="state.activeItems[${index}].note = this.value"
                             placeholder="Ghi chú vết rách, mất trang..."
                             class="condition-note-input">
                    </div>`
              }
            </div>
          </td>

          <!-- Cột 5: Tiền phạt -->
          <td style="min-width: 120px; text-align: right;">
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <span class="fine-amount-display ${totalItemFine > 0 ? "is-fine" : ""}">
                ${formatVND(totalItemFine)}
              </span>
              <span style="font-size: 11px; color: var(--color-text-muted);">
                ${
                  item.overdue_fine > 0 && item.damage_fine > 0
                    ? "Quá hạn + Bồi thường"
                    : item.overdue_fine > 0
                    ? "Phạt hạn"
                    : item.damage_fine > 0
                    ? "Bồi thường"
                    : "Miễn phí"
                }
              </span>
            </div>
          </td>

          <!-- Cột 6: Nút xóa -->
          <td style="text-align: center; width: 40px;">
            <button type="button" onclick="handleRemoveItem(${index})"
                    class="btn-remove-row"
                    title="Loại khỏi lượt trả này">
              <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Cập nhật thẻ quyết toán tiền phạt bên phải
function updateSettlementCalculations() {
  const selectedItems = state.activeItems.filter((it) => it.checked !== false);
  const totalOverdueFine = selectedItems.reduce((sum, it) => sum + (it.overdue_fine || 0), 0);
  const totalDamageFine = selectedItems.reduce((sum, it) => sum + (it.damage_fine || 0), 0);
  const totalFine = totalOverdueFine + totalDamageFine;
  const totalOverdueDays = selectedItems.reduce((sum, it) => sum + (it.overdue_days || 0), 0);

  document.getElementById("summary-overdue-days").textContent = totalOverdueDays;
  document.getElementById("summary-overdue-amount").textContent = formatVND(totalOverdueFine);
  document.getElementById("summary-damage-amount").textContent = formatVND(totalDamageFine);
  document.getElementById("summary-total-amount").textContent = formatNumber(totalFine);

  // Đồng bộ số tiền & mã phiếu hiển thị trên khung VietQR
  const memoRaw = state.currentReader?.loan_code
    ? `TRA SACH ${state.currentReader.loan_code.replace("#", "")}`
    : "TRA SACH UNILIB";
  const memoEl = document.getElementById("vietqr-memo");
  if (memoEl) memoEl.textContent = memoRaw;

  const vietQrAmountEl = document.getElementById("vietqr-amount");
  if (vietQrAmountEl) {
    vietQrAmountEl.textContent = formatVND(totalFine);
  }
  const vietQrImg = document.getElementById("vietqr-image");
  if (vietQrImg) {
    const memo = encodeURIComponent(memoRaw);
    vietQrImg.src = `https://img.vietqr.io/image/MB-99992525KS25-compact2.png?amount=${totalFine}&addInfo=${memo}&accountName=THU%20VIEN%20UNILIB`;
  }

  // Tính tiền thừa trả khách
  const change = Math.max(0, state.cashReceived - totalFine);
  const changeEl = document.getElementById("cash-change-display");
  if (changeEl) {
    changeEl.textContent = formatVND(change);
  }
}

// Cập nhật giao diện phương thức thanh toán
function updatePaymentMethodUI() {
  document.querySelectorAll(".payment-method-label").forEach((label) => {
    const radio = label.querySelector('input[type="radio"]');
    if (radio && radio.checked) {
      label.classList.add("active");
    } else {
      label.classList.remove("active");
    }
  });

  const cashBox = document.getElementById("cash-calculator-box");
  if (cashBox) {
    cashBox.style.display = state.paymentMethod === "cash" ? "block" : "none";
  }

  const qrBox = document.getElementById("vietqr-box");
  if (qrBox) {
    qrBox.style.display = state.paymentMethod === "qr" ? "block" : "none";
  }
}

// Hàm sao chép văn bản vào clipboard
function copyText(text, successMsg) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg || "Đã sao chép vào bộ nhớ tạm!");
    }).catch(() => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast(successMsg || "Đã sao chép vào bộ nhớ tạm!");
  } catch (_) {
    showToast("Không thể tự động sao chép!", "error");
  }
  document.body.removeChild(ta);
}

// Map phương thức thanh toán UI -> Backend
function getBackendPaymentMethod() {
  if (state.paymentMethod === "qr") return "CHUYỂN KHOẢN";
  if (state.paymentMethod === "account") return "VÍ THƯ VIỆN";
  return "TIỀN MẶT";
}

// Xử lý trả toàn bộ phiếu mượn (POST /api/returns/loan)
async function handleReturnFullLoan() {
  if (!state.currentReader || !state.currentReader.loan_id) {
    showToast("Chưa xác định phiếu mượn đang xử lý.", "error");
    return;
  }
  if (state.activeItems.some((it) => it.condition_type !== "NORMAL")) {
    showToast("Có ấn phẩm hỏng/mất, vui lòng dùng nút 'XÁC NHẬN TRẢ SÁCH & THU TIỀN' để xử lý từng cuốn.", "error");
    return;
  }

  const btn = document.getElementById("btn-return-full-loan");
  if (btn) btn.disabled = true;

  try {
    showToast("Đang ghi nhận trả toàn bộ phiếu mượn...");
    const res = await api.post("/returns/loan", { loan_id: state.currentReader.loan_id });

    const payMethodLabel = getBackendPaymentMethod();
    if (Array.isArray(res.fine_ids) && res.fine_ids.length > 0) {
      for (const fid of res.fine_ids) {
        await api.post(`/fines/${fid}/pay`, {
          payment_method: payMethodLabel,
          note: `Thu khi trả cả phiếu #${state.currentReader.loan_id}`,
        });
      }
    }

    if (res.reservations_notified > 0) {
      showToast(`Đã chuyển ${res.reservations_notified} bản sao sang giữ chỗ & xếp hàng gửi email báo độc giả đặt trước!`);
    } else {
      showToast(res.message || "Đã trả toàn bộ phiếu mượn thành công!");
    }

    await loadTodaySummary();
    const returnedCount = Number(res.returned_count || state.activeItems.length);
    state.activeItems = [];
    state.shouldResetOnModalClose = true;
    renderAll();
    openReceiptModal(Number(res.total_fines_amount || 0), returnedCount);
  } catch (err) {
    showToast(err.message || "Không thể trả toàn bộ phiếu mượn", "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Xử lý xác nhận trả sách & thu tiền
async function handleConfirmReturn() {
  const selectedItems = state.activeItems.filter((it) => it.checked !== false);
  if (selectedItems.length === 0) {
    showToast("Vui lòng chọn ít nhất một ấn bản để xác nhận trả!", "error");
    return;
  }

  const btn = document.getElementById("btn-confirm-return");
  if (btn) btn.disabled = true;

  const payMethodLabel = getBackendPaymentMethod();
  const succeededCodes = [];
  const failedErrors = [];
  const reservationNotices = [];
  let totalCollectedPaid = 0;

  try {
    showToast("Đang lưu giao dịch trả sách và xử lý phí phạt...");

    for (const it of selectedItems) {
      try {
        if (it.condition_type === "NORMAL") {
          const res = await api.post("/returns/item", { copy_code: it.copy_code });
          let itemPaid = 0;
          if (res && res.fine_id) {
            await api.post(`/fines/${res.fine_id}/pay`, {
              payment_method: payMethodLabel,
              note: "Thu tiền phạt quá hạn khi trả sách tại quầy",
            });
            itemPaid += Number(res.overdue_fine_amount || 0);
          }
          if (res && res.reservation_notified && res.reserved_for_reader) {
            reservationNotices.push(`${it.copy_code} → ${res.reserved_for_reader}`);
          }
          totalCollectedPaid += itemPaid;
          succeededCodes.push(it.copy_code);
        } else {
          const res = await api.post("/fines/report-issue", {
            copy_code: it.copy_code,
            issue_type: it.condition_type === "LOST" ? "MẤT" : "HỎNG",
            note: it.note || "",
          });
          let itemPaid = 0;
          if (res && res.fine_id) {
            await api.post(`/fines/${res.fine_id}/pay`, {
              payment_method: payMethodLabel,
              note: it.note || "Thu tiền bồi thường tại quầy",
            });
            itemPaid += Number(res.amount || 0);
          }
          if (res && res.overdue_fine_id) {
            await api.post(`/fines/${res.overdue_fine_id}/pay`, {
              payment_method: payMethodLabel,
              note: "Thu phạt quá hạn kèm theo khi trả sách hỏng/mất",
            });
            itemPaid += Number(res.overdue_fine_amount || 0);
          }
          totalCollectedPaid += itemPaid;
          succeededCodes.push(it.copy_code);
        }
      } catch (err) {
        failedErrors.push(`${it.copy_code}: ${err.message || "Lỗi xử lý"}`);
      }
    }

    if (succeededCodes.length === 0) {
      showToast(`Trả sách thất bại: ${failedErrors.join(" | ")}`, "error");
      return;
    }

    if (failedErrors.length > 0) {
      showToast(`Đã trả ${succeededCodes.length} cuốn; lỗi ${failedErrors.length} cuốn: ${failedErrors[0]}`, "error");
    } else if (reservationNotices.length > 0) {
      showToast(`Trả thành công! Đã giữ chỗ & gửi email cho người đặt trước: ${reservationNotices.join(", ")}`);
    } else {
      showToast(`Hoàn tất trả ${succeededCodes.length} ấn bản và cập nhật thanh toán!`);
    }

    // Loại ngay các cuốn đã trả thành công khỏi bảng để tránh bấm xác nhận trùng
    state.activeItems = state.activeItems.filter((it) => !succeededCodes.includes(it.copy_code));
    state.shouldResetOnModalClose = state.activeItems.length === 0;
    renderAll();

    await loadTodaySummary();
    openReceiptModal(totalCollectedPaid, succeededCodes.length);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Mở modal biên lai
function openReceiptModal(totalPaid, returnedCount = state.activeItems.filter((it) => it.checked !== false).length) {
  const modal = document.getElementById("receipt-modal");
  if (!modal) return;

  const reader = state.currentReader || { full_name: "Độc giả", student_id: "--------" };
  document.getElementById("modal-tx-code").textContent = state.txCode.replace("#", "");
  document.getElementById("modal-reader-name").textContent = reader.full_name;
  document.getElementById("modal-reader-id").textContent = reader.card_code || reader.student_id || "--------";
  document.getElementById("modal-returned-count").textContent = `${returnedCount} cuốn`;

  const methodNames = {
    cash: "Tiền mặt",
    qr: "Chuyển khoản VietQR",
    account: "Ví thư viện sinh viên",
  };
  document.getElementById("modal-payment-method").textContent = methodNames[state.paymentMethod] || "Tiền mặt";
  document.getElementById("modal-total-paid").textContent = formatVND(totalPaid);

  modal.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("receipt-modal");
  if (modal) modal.classList.add("hidden");
  if (state.shouldResetOnModalClose) {
    state.shouldResetOnModalClose = false;
    resetDeskAfterSuccess();
  }
}

// Reset bàn làm việc để tiếp nhận sinh viên mới
function resetDeskAfterSuccess() {
  state.shouldResetOnModalClose = false;
  const modal = document.getElementById("receipt-modal");
  if (modal) modal.classList.add("hidden");
  state.currentReader = null;
  state.activeItems = [];
  state.cashReceived = 0;
  state.txCode = "#TX-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(10 + Math.random() * 90);
  const txBadge = document.getElementById("tx-code");
  if (txBadge) txBadge.textContent = state.txCode;
  const cashInput = document.getElementById("cash-received-input");
  if (cashInput) cashInput.value = "0";
  const scanner = document.getElementById("barcode-scanner");
  if (scanner) {
    scanner.value = "";
    scanner.focus();
  }
  renderAll();
  showToast("Bàn làm việc sẵn sàng tiếp nhận lượt trả sách tiếp theo!");
}

// Hủy bỏ lượt tiếp nhận
function handleCancelReturn() {
  if (state.activeItems.length === 0 && !state.currentReader) {
    showToast("Bàn làm việc hiện đang trống.");
    return;
  }
  resetDeskAfterSuccess();
}

// Format VND: 38000 -> "38.000 đ"
function formatVND(num) {
  return Number(num || 0).toLocaleString("vi-VN") + " đ";
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString("vi-VN");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-item ${type === "error" ? "error" : ""}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">${type === "error" ? "error" : "check_circle"}</span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}
