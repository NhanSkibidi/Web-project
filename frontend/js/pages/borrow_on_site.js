(function () {
  "use strict";

  // 1. Quản lý trạng thái duy nhất của màn hình (Single Source of Truth)
  const state = {
    reader: null,         // Thông tin thẻ & độc giả đã quét/tìm thấy
    copies: [],           // Danh sách các ấn phẩm sách đã quét { copy_code, title, author, location, status }
    conditions: [],       // Kết quả thẩm định 7 điều kiện từ API
    canBorrow: false,     // Cờ tổng: Đủ điều kiện tạo phiếu
    isSubmitting: false,  // Đang gửi request tạo phiếu
    createdLoan: null,    // Dữ liệu phiếu mượn vừa tạo thành công (biên lai)
  };

  // 2. Tham chiếu DOM Elements
  const dom = {
    // Thẻ độc giả (Bước 1)
    cardReaderSection: document.getElementById("card-reader-section"),
    readerStatusPill: document.getElementById("reader-status-pill"),
    inputCardCode: document.getElementById("input-card-code"),
    btnLookupCard: document.getElementById("btn-lookup-card"),
    readerInfoDisplay: document.getElementById("reader-info-display"),
    readerEmptyPlaceholder: document.getElementById("reader-empty-placeholder"),

    // Quét sách (Bước 2)
    cardBooksSection: document.getElementById("card-books-section"),
    copiesCountPill: document.getElementById("copies-count-pill"),
    inputBarcode: document.getElementById("input-barcode"),
    btnAddBarcode: document.getElementById("btn-add-barcode"),
    scannedCopiesList: document.getElementById("scanned-copies-list"),
    copiesEmptyPlaceholder: document.getElementById("copies-empty-placeholder"),

    // Thẩm định (Bước 3)
    conditionOverallBadge: document.getElementById("condition-overall-badge"),
    conditionsListBox: document.getElementById("conditions-list-box"),

    // Xác nhận (Bước 4)
    summaryDueDate: document.getElementById("summary-due-date"),
    summaryTotalBooks: document.getElementById("summary-total-books"),
    summaryLibrarianName: document.getElementById("summary-librarian-name"),
    btnSubmitLoan: document.getElementById("btn-submit-loan"),
    btnSubmitText: document.getElementById("btn-submit-text"),
    btnCancelLoan: document.getElementById("btn-cancel-loan"),
    btnResetCounter: document.getElementById("btn-reset-counter"),

    // Modal biên lai & in
    receiptModal: document.getElementById("receipt-modal"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnFinishModal: document.getElementById("btn-finish-modal"),
    btnPrintReceiptAction: document.getElementById("btn-print-receipt-action"),
    modalLoanCode: document.getElementById("modal-loan-code"),
    modalReaderName: document.getElementById("modal-reader-name"),
    modalReaderId: document.getElementById("modal-reader-id"),
    modalBookCount: document.getElementById("modal-book-count"),
    modalBorrowedAt: document.getElementById("modal-borrowed-at"),
    modalDueDate: document.getElementById("modal-due-date"),
    modalBooksList: document.getElementById("modal-books-list"),

    // Bản in @media print
    pLoanCode: document.getElementById("p-loan-code"),
    pBorrowDate: document.getElementById("p-borrow-date"),
    pDueDate: document.getElementById("p-due-date"),
    pReaderName: document.getElementById("p-reader-name"),
    pCardCode: document.getElementById("p-card-code"),
    pStudentId: document.getElementById("p-student-id"),
    pFaculty: document.getElementById("p-faculty"),
    pBooksBody: document.getElementById("p-books-body"),
    pSigReaderName: document.getElementById("p-sig-reader-name"),
    pSigLibrarianName: document.getElementById("p-sig-librarian-name"),

    // Toast
    toastContainer: document.getElementById("toast-container"),

    // Camera scanner modal (html5-qrcode)
    cameraScannerModal: document.getElementById("camera-scanner-modal"),
    btnScanCardCamera: document.getElementById("btn-scan-card-camera"),
    btnScanBarcodeCamera: document.getElementById("btn-scan-barcode-camera"),
    btnCameraClose: document.getElementById("btn-camera-close"),
    btnCameraStop: document.getElementById("btn-camera-stop"),
    cameraTargetLabel: document.getElementById("camera-target-label"),
    cameraScannerReader: document.getElementById("camera-scanner-reader"),
    cameraDeviceSelect: document.getElementById("camera-device-select"),
    btnCameraTorch: document.getElementById("btn-camera-torch"),
    cameraFileInput: document.getElementById("camera-file-input"),
    cameraFeedbackCard: document.getElementById("camera-feedback-card"),
    cameraFeedbackIcon: document.getElementById("camera-feedback-icon"),
    cameraFeedbackTitle: document.getElementById("camera-feedback-title"),
    cameraFeedbackDesc: document.getElementById("camera-feedback-desc"),
    cameraSessionCount: document.getElementById("camera-session-count"),
  };

  // 3. Hàm hiển thị Toast thông báo nội bộ
  function showLocalToast(message, type = "success") {
    if (!dom.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast-item ${type === "error" ? "error" : type === "warning" ? "warning" : ""}`;

    const iconSpan = document.createElement("span");
    iconSpan.className = "material-symbols-outlined";
    iconSpan.style.fontSize = "18px";
    iconSpan.textContent = type === "error" ? "error" : type === "warning" ? "warning" : "check_circle";

    const textSpan = document.createElement("span");
    textSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.2s ease";
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // 4. Định dạng ngày tháng tiện ích
  function formatDateVN(dateObj) {
    if (!dateObj) return "—";
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function getStandardDueDate() {
    const d = new Date();
    d.setDate(d.getDate() + 14); // Quy định mượn 14 ngày
    return formatDateVN(d);
  }

  // ==============================================================================
  // 5. NGHIỆP VỤ BƯỚC 1: TRA CỨU & TIẾP NHẬN THẺ ĐỘC GIẢ
  // ==============================================================================
  async function lookupReader() {
    const rawVal = dom.inputCardCode.value.trim();
    if (!rawVal) {
      showLocalToast("Vui lòng nhập hoặc quét mã thẻ thư viện độc giả", "warning");
      dom.inputCardCode.focus();
      return;
    }

    const cardCode = rawVal.toUpperCase();
    dom.btnLookupCard.disabled = true;
    dom.btnLookupCard.innerHTML = `<span class="material-symbols-outlined" style="animation: spin 1s infinite linear;">sync</span> Tra...`;

    try {
      // Gọi API tra cứu thẻ độc giả
      let res;
      try {
        res = await api.get(`/loans/readers/by-card/${encodeURIComponent(cardCode)}`);
      } catch (e) {
        if (e && e.status === 401) throw e;
        // Fallback endpoint nếu router prefix khác
        res = await api.get(`/library-cards/by-code/${encodeURIComponent(cardCode)}`);
      }

      state.reader = res;
      renderReaderInfo();
      showLocalToast(`Đã nhận diện độc giả: ${res.full_name || res.card_code}`);

      // Tự động chuyển tiêu điểm sang ô quét mã sách để thao tác nhanh
      dom.inputBarcode.focus();

      // Thẩm định lại điều kiện mượn
      await validateBorrowConditions();
    } catch (err) {
      state.reader = null;
      renderReaderInfo();
      await validateBorrowConditions();
      const msg = err && err.status === 401
        ? "Phiên làm việc hết hạn hoặc chưa đăng nhập Thủ thư (401). Vui lòng đăng nhập lại!"
        : (err.message || "Không tìm thấy thông tin thẻ thư viện!");
      showLocalToast(msg, "error");
      dom.inputCardCode.select();
    } finally {
      dom.btnLookupCard.disabled = false;
      dom.btnLookupCard.innerHTML = `<span class="material-symbols-outlined">search</span><span>Tra cứu</span>`;
    }
  }

  function clearReader() {
    state.reader = null;
    dom.inputCardCode.value = "";
    renderReaderInfo();
    validateBorrowConditions();
    dom.inputCardCode.focus();
  }

  function renderReaderInfo() {
    if (!state.reader) {
      dom.readerEmptyPlaceholder.classList.remove("hidden");
      dom.readerInfoDisplay.classList.add("hidden");
      dom.readerInfoDisplay.replaceChildren();
      dom.readerStatusPill.className = "status-pill status-pill-muted";
      dom.readerStatusPill.textContent = "Chờ quẹt thẻ";
      return;
    }

    const r = state.reader;
    dom.readerEmptyPlaceholder.classList.add("hidden");
    dom.readerInfoDisplay.classList.remove("hidden");
    dom.readerInfoDisplay.replaceChildren();

    // Hàng trên: Avatar, Tên, MSSV, Nút đổi thẻ
    const headerRow = document.createElement("div");
    headerRow.className = "reader-header-row";

    const profileFlex = document.createElement("div");
    profileFlex.className = "reader-profile-flex";

    const avatar = document.createElement("div");
    avatar.className = "reader-avatar-circle";
    const initial = (r.full_name || "Đ").trim().charAt(0).toUpperCase();
    avatar.textContent = initial;

    const nameCol = document.createElement("div");
    const nameEl = document.createElement("h4");
    nameEl.className = "reader-name-bold";
    nameEl.textContent = r.full_name;

    const subInfo = document.createElement("p");
    subInfo.className = "reader-sub-info";
    subInfo.textContent = `Mã thẻ: ${r.card_code} · MSSV: ${r.student_id || "2301" + String(r.user_id).padStart(4, "0")}`;

    nameCol.appendChild(nameEl);
    nameCol.appendChild(subInfo);
    profileFlex.appendChild(avatar);
    profileFlex.appendChild(nameCol);

    const btnClear = document.createElement("button");
    btnClear.type = "button";
    btnClear.className = "btn-remove-reader";
    btnClear.innerHTML = `<span class="material-symbols-outlined" style="font-size: 15px;">close</span><span>Đổi thẻ</span>`;
    btnClear.addEventListener("click", clearReader);

    headerRow.appendChild(profileFlex);
    headerRow.appendChild(btnClear);

    // Hàng dưới: Lưới 3 thông số: Trạng thái thẻ, Sách đang giữ, Nợ phạt
    const statsGrid = document.createElement("div");
    statsGrid.className = "reader-stats-grid";

    // 1. Trạng thái thẻ
    const stat1 = document.createElement("div");
    stat1.className = "reader-stat-item";
    const l1 = document.createElement("div");
    l1.className = "reader-stat-label";
    l1.textContent = "Hạn thẻ thư viện";
    const v1 = document.createElement("div");
    v1.className = "reader-stat-val";
    v1.style.color = r.status === "ACTIVE" ? "var(--color-success)" : "var(--color-danger)";
    v1.textContent = r.status === "ACTIVE" ? `Còn hạn (${r.expiry_date || "Hợp lệ"})` : "Đã hết hạn/Khóa";
    stat1.appendChild(l1);
    stat1.appendChild(v1);

    // 2. Sách đang mượn
    const stat2 = document.createElement("div");
    stat2.className = "reader-stat-item";
    const l2 = document.createElement("div");
    l2.className = "reader-stat-label";
    l2.textContent = "Sách đang giữ";
    const v2 = document.createElement("div");
    v2.className = "reader-stat-val font-mono";
    const limit = r.max_borrow_books || 5;
    v2.textContent = `${r.borrowing_count} / ${limit} cuốn`;
    stat2.appendChild(l2);
    stat2.appendChild(v2);

    // 3. Nợ phạt
    const stat3 = document.createElement("div");
    stat3.className = "reader-stat-item";
    const l3 = document.createElement("div");
    l3.className = "reader-stat-label";
    l3.textContent = "Nợ phạt vi phạm";
    const v3 = document.createElement("div");
    v3.className = "reader-stat-val font-mono";
    const unpaidFineVal = r.unpaid_fine ?? r.unpaid_fines ?? 0;
    v3.style.color = unpaidFineVal > 0 ? "var(--color-danger)" : "var(--color-success)";
    v3.textContent = unpaidFineVal > 0 ? Number(unpaidFineVal).toLocaleString("vi-VN") + " đ" : "0 đ (Sạch nợ)";
    stat3.appendChild(l3);
    stat3.appendChild(v3);

    statsGrid.appendChild(stat1);
    statsGrid.appendChild(stat2);
    statsGrid.appendChild(stat3);

    dom.readerInfoDisplay.appendChild(headerRow);
    dom.readerInfoDisplay.appendChild(statsGrid);

    // Cập nhật Pill trạng thái
    const cardStatusVal = r.card_status || r.status;
    if (cardStatusVal === "ACTIVE") {
      dom.readerStatusPill.className = "status-pill status-pill-success";
      dom.readerStatusPill.textContent = "Thẻ hợp lệ";
    } else {
      dom.readerStatusPill.className = "status-pill";
      dom.readerStatusPill.style.background = "var(--color-danger-bg)";
      dom.readerStatusPill.style.color = "var(--color-danger)";
      dom.readerStatusPill.textContent = "Thẻ không hợp lệ";
    }
  }

  // ==============================================================================
  // 6. NGHIỆP VỤ BƯỚC 2: QUÉT MÃ VẠCH SÁCH & THÊM VÀO DANH SÁCH MƯỢN
  // ==============================================================================
  async function addBarcode() {
    const rawVal = dom.inputBarcode.value.trim();
    if (!rawVal) {
      showLocalToast("Vui lòng nhập hoặc quét mã vạch bản sao sách", "warning");
      dom.inputBarcode.focus();
      return;
    }

    const barcode = rawVal.toUpperCase();

    // Kiểm tra trùng lặp trong giỏ đang quét
    const alreadyExists = state.copies.some((c) => c.copy_code.toUpperCase() === barcode);
    if (alreadyExists) {
      showLocalToast(`Mã sách '${barcode}' đã có trong danh mục mượn!`, "warning");
      dom.inputBarcode.value = "";
      dom.inputBarcode.focus();
      return;
    }

    dom.btnAddBarcode.disabled = true;
    dom.btnAddBarcode.innerHTML = `<span class="material-symbols-outlined" style="animation: spin 1s infinite linear;">sync</span>`;

    try {
      let copyData;
      try {
        copyData = await api.get(`/loans/copies/by-barcode/${encodeURIComponent(barcode)}`);
      } catch (e) {
        if (e && e.status === 401) throw e;
        copyData = await api.get(`/book_copies/code/${encodeURIComponent(barcode)}`);
        if (copyData && !copyData.title && copyData.book_isbn) {
          try {
            const b = await api.get(`/books/${encodeURIComponent(copyData.book_isbn)}`);
            copyData.title = b.title || copyData.copy_code;
            copyData.author = b.author || "Tác giả thư viện";
          } catch {
            copyData.title = copyData.copy_code;
            copyData.author = "Chưa cập nhật";
          }
        }
      }

      if (!copyData || !copyData.copy_code) {
        throw new Error(`Không tìm thấy bản sao '${barcode}' trong kho!`);
      }

      state.copies.push(copyData);
      renderScannedCopies();
      showLocalToast(`Đã thêm: "${copyData.title || copyData.copy_code}"`);

      // Xóa ô nhập và giữ focus để quét cuốn tiếp theo ngay lập tức
      dom.inputBarcode.value = "";
      dom.inputBarcode.focus();

      // Thẩm định lại 7 điều kiện
      await validateBorrowConditions();
    } catch (err) {
      const msg = err && err.status === 401
        ? "Phiên làm việc hết hạn hoặc chưa đăng nhập Thủ thư (401). Vui lòng đăng nhập lại!"
        : (err.message || `Không tìm thấy bản sao '${barcode}' trong kho!`);
      showLocalToast(msg, "error");
      dom.inputBarcode.select();
    } finally {
      dom.btnAddBarcode.disabled = false;
      dom.btnAddBarcode.innerHTML = `<span class="material-symbols-outlined">add_circle</span><span>Thêm sách</span>`;
    }
  }

  function removeCopy(copyCode) {
    state.copies = state.copies.filter((c) => c.copy_code !== copyCode);
    renderScannedCopies();
    showLocalToast(`Đã bớt sách khỏi danh mục mượn`);
    validateBorrowConditions();
  }

  function renderScannedCopies() {
    dom.copiesCountPill.textContent = `${state.copies.length} cuốn`;
    dom.summaryTotalBooks.textContent = `${state.copies.length} cuốn`;

    if (state.copies.length === 0) {
      dom.copiesEmptyPlaceholder.classList.remove("hidden");
      dom.scannedCopiesList.replaceChildren();
      return;
    }

    dom.copiesEmptyPlaceholder.classList.add("hidden");
    dom.scannedCopiesList.replaceChildren();

    state.copies.forEach((copy, idx) => {
      const card = document.createElement("div");
      card.className = "book-copy-card";

      const leftFlex = document.createElement("div");
      leftFlex.className = "book-copy-main";

      const iconWrap = document.createElement("div");
      iconWrap.className = "book-copy-icon";
      iconWrap.innerHTML = `<span class="material-symbols-outlined">book</span>`;

      const details = document.createElement("div");
      details.className = "book-copy-details";

      const titleEl = document.createElement("h5");
      titleEl.className = "book-copy-title";
      titleEl.textContent = `${idx + 1}. ${copy.title}`;
      titleEl.title = copy.title;

      const meta = document.createElement("div");
      meta.className = "book-copy-meta";

      const barcodeSpan = document.createElement("span");
      barcodeSpan.className = "book-copy-barcode";
      barcodeSpan.textContent = copy.copy_code;

      const authorSpan = document.createElement("span");
      authorSpan.textContent = copy.author || "Tác giả thư viện";

      const locSpan = document.createElement("span");
      locSpan.innerHTML = `Vị trí: <strong>${copy.shelf_location || "Kệ chính"}</strong>`;

      meta.appendChild(barcodeSpan);
      meta.appendChild(authorSpan);
      meta.appendChild(locSpan);

      details.appendChild(titleEl);
      details.appendChild(meta);

      leftFlex.appendChild(iconWrap);
      leftFlex.appendChild(details);

      const rightFlex = document.createElement("div");
      rightFlex.className = "book-copy-right";

      const statusBadge = document.createElement("span");
      if (copy.status === "AVAILABLE") {
        statusBadge.className = "status-pill status-pill-success";
        statusBadge.textContent = "Sẵn sàng";
      } else {
        statusBadge.className = "status-pill";
        statusBadge.style.background = "var(--color-danger-bg)";
        statusBadge.style.color = "var(--color-danger)";
        statusBadge.textContent = copy.status;
      }

      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "btn-remove-copy";
      btnDelete.title = "Xóa cuốn này khỏi danh sách";
      btnDelete.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">delete</span>`;
      btnDelete.addEventListener("click", () => removeCopy(copy.copy_code));

      rightFlex.appendChild(statusBadge);
      rightFlex.appendChild(btnDelete);

      card.appendChild(leftFlex);
      card.appendChild(rightFlex);
      dom.scannedCopiesList.appendChild(card);
    });
  }

  // ==============================================================================
  // 7. NGHIỆP VỤ BƯỚC 3: THẨM ĐỊNH 7 ĐIỀU KIỆN MƯỢN SÁCH THEO THỜI GIAN THỰC
  // ==============================================================================
  async function validateBorrowConditions() {
    const cardCode = state.reader?.card_code || "";
    const barcodes = state.copies.map((c) => c.copy_code);

    // Cập nhật ngày hẹn trả hiển thị
    dom.summaryDueDate.textContent = getStandardDueDate();

    // Nếu chưa có thẻ và chưa có sách: Trạng thái chờ
    if (!cardCode && barcodes.length === 0) {
      state.canBorrow = false;
      renderConditionStates([
        { code: "CARD_VALID", label: "1. Thẻ thư viện hợp lệ và còn hạn", passed: false, message: "Chưa nhập mã thẻ độc giả" },
        { code: "READER_ALLOWED", label: "2. Quyền mượn của độc giả", passed: false, message: "Tài khoản độc giả phải ở trạng thái ACTIVE" },
        { code: "LIMIT_NOT_EXCEEDED", label: "3. Giới hạn số lượng sách mượn", passed: false, message: "Tổng số sách giữ + mới <= hạn mức cho phép" },
        { code: "BOOK_EXISTS", label: "4. Mã vạch sách tồn tại trong kho", passed: false, message: "Mã bản sao phải tồn tại trên hệ thống" },
        { code: "COPY_AVAILABLE", label: "5. Bản sao sẵn sàng cho mượn", passed: false, message: "Tất cả cuốn sách phải đang ở trạng thái AVAILABLE" },
        { code: "NO_RESTRICTION", label: "6. Không có sách quá hạn hoặc nợ phạt", passed: false, message: "Không nợ quá hạn và nợ phạt trong ngưỡng quy định" },
        { code: "HAS_BOOKS", label: "7. Danh sách sách cần mượn", passed: false, message: "Cần chọn ít nhất 1 cuốn sách để mượn" },
      ], false, true);
      return;
    }

    try {
      const res = await api.post("/loans/counter/validate", {
        card_code: cardCode,
        barcodes: barcodes,
      });

      state.conditions = res.conditions || [];
      state.canBorrow = Boolean(res.can_borrow);

      renderConditionStates(state.conditions, state.canBorrow, false);
    } catch (err) {
      console.error("Lỗi khi thẩm định mượn sách:", err);
      state.canBorrow = false;
      dom.conditionOverallBadge.className = "badge-eval badge-eval-failed";
      dom.conditionOverallBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">error</span><span>Lỗi kiểm tra</span>`;
      dom.btnSubmitLoan.disabled = true;
    }
  }

  function renderConditionStates(conditions, canBorrow, isWaiting = false) {
    // 1. Cập nhật Badge Tổng quan
    if (isWaiting) {
      dom.conditionOverallBadge.className = "badge-eval badge-eval-waiting";
      dom.conditionOverallBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">pending</span><span>Chờ dữ liệu</span>`;
    } else if (canBorrow) {
      dom.conditionOverallBadge.className = "badge-eval badge-eval-passed";
      dom.conditionOverallBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span><span>Đủ điều kiện mượn</span>`;
    } else {
      dom.conditionOverallBadge.className = "badge-eval badge-eval-failed";
      dom.conditionOverallBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">cancel</span><span>Chưa đủ điều kiện</span>`;
    }

    // 2. Cập nhật từng item điều kiện
    conditions.forEach((cond) => {
      const itemEl = dom.conditionsListBox.querySelector(`[data-code="${cond.code}"]`);
      if (!itemEl) return;

      const iconEl = itemEl.querySelector(".condition-icon");
      const msgEl = itemEl.querySelector(".condition-message");

      if (isWaiting) {
        itemEl.className = "condition-item condition-state-pending";
        iconEl.textContent = "radio_button_unchecked";
      } else if (cond.passed) {
        itemEl.className = "condition-item condition-state-passed";
        iconEl.textContent = "check_circle";
      } else {
        itemEl.className = "condition-item condition-state-failed";
        iconEl.textContent = "cancel";
      }

      msgEl.textContent = cond.message;
    });

    // 3. Khóa/Mở nút xác nhận mượn
    dom.btnSubmitLoan.disabled = !canBorrow || state.isSubmitting;
  }

  // ==============================================================================
  // 8. NGHIỆP VỤ BƯỚC 4: TẠO PHIẾU MƯỢN BORROWED VÀ GIAO DỊCH ALL-OR-NOTHING
  // ==============================================================================
  async function submitLoan() {
    if (!state.canBorrow || state.isSubmitting) return;

    if (!state.reader) {
      showLocalToast("Thiếu thông tin độc giả", "warning");
      return;
    }

    if (state.copies.length === 0) {
      showLocalToast("Chưa chọn cuốn sách nào để mượn", "warning");
      return;
    }

    state.isSubmitting = true;
    dom.btnSubmitLoan.disabled = true;
    dom.btnSubmitText.textContent = "Đang xử lý giao dịch...";

    try {
      const payload = {
        card_code: state.reader.card_code,
        barcodes: state.copies.map((c) => c.copy_code),
      };

      const receipt = await api.post("/loans/counter", payload);
      state.createdLoan = receipt;

      showLocalToast(`Tạo phiếu ${receipt.code} thành công!`);

      // Hiển thị Modal biên lai mượn
      openReceiptModal(receipt);
    } catch (err) {
      if (err.status === 409) {
        showLocalToast(
          err.message || "Xung đột: Bản sao sách vừa được người khác mượn hoặc đổi trạng thái!",
          "error"
        );
        // Refresh lại kiểm tra để cập nhật danh sách
        await validateBorrowConditions();
      } else {
        showLocalToast(err.message || "Không thể khởi tạo phiếu mượn sách!", "error");
      }
    } finally {
      state.isSubmitting = false;
      dom.btnSubmitText.textContent = "Xác nhận & Cấp phiếu mượn";
      dom.btnSubmitLoan.disabled = !state.canBorrow;
    }
  }

  // ==============================================================================
  // 9. MODAL BIÊN LAI VÀ TÍNH NĂNG IN PHIẾU (WINDOW.PRINT)
  // ==============================================================================
  function openReceiptModal(receipt) {
    dom.modalLoanCode.textContent = receipt.code;
    dom.modalReaderName.textContent = receipt.reader_name;
    dom.modalReaderId.textContent = `${receipt.reader_card_code} · MSSV: ${receipt.reader_student_id || "23010412"}`;
    dom.modalBookCount.textContent = `${receipt.books.length} cuốn`;
    dom.modalBorrowedAt.textContent = receipt.borrowed_at;
    dom.modalDueDate.textContent = receipt.due_date;

    // Bảng sách modal
    dom.modalBooksList.replaceChildren();
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th style="width: 25px;">#</th>
        <th>Tên ấn phẩm</th>
        <th>Mã vạch</th>
        <th>Vị trí</th>
      </tr>
    `;
    const tbody = document.createElement("tbody");
    receipt.books.forEach((b, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(b.title)}</strong></td>
        <td><span class="font-mono">${escapeHtml(b.barcode)}</span></td>
        <td>${escapeHtml(b.location || "Kệ chính")}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    dom.modalBooksList.appendChild(table);

    // Chuẩn bị dữ liệu cho khung in @media print
    dom.pLoanCode.textContent = receipt.code;
    dom.pBorrowDate.textContent = receipt.borrowed_at;
    dom.pDueDate.textContent = receipt.due_date;
    dom.pReaderName.textContent = receipt.reader_name;
    dom.pCardCode.textContent = receipt.reader_card_code;
    dom.pStudentId.textContent = receipt.reader_student_id || "23010412";
    dom.pFaculty.textContent = receipt.reader_faculty || "Khoa CNTT (K1)";
    dom.pSigReaderName.textContent = receipt.reader_name;
    dom.pSigLibrarianName.textContent = receipt.librarian_name || "Trịnh Huy Đại";

    dom.pBooksBody.replaceChildren();
    receipt.books.forEach((b, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align: center;">${i + 1}</td>
        <td><span class="font-mono">${escapeHtml(b.barcode)}</span></td>
        <td><strong>${escapeHtml(b.title)}</strong></td>
        <td style="text-align: center;">${escapeHtml(b.location || "Kệ A")}</td>
        <td style="text-align: right;" class="font-mono">${escapeHtml(b.due_date || receipt.due_date)}</td>
      `;
      dom.pBooksBody.appendChild(tr);
    });

    // Mở modal
    dom.receiptModal.classList.remove("hidden");
  }

  function printReceipt() {
    window.print();
  }

  function closeModalAndReset() {
    dom.receiptModal.classList.add("hidden");
    resetCounterSession();
  }

  function resetCounterSession() {
    state.reader = null;
    state.copies = [];
    state.conditions = [];
    state.canBorrow = false;
    state.createdLoan = null;

    dom.inputCardCode.value = "";
    dom.inputBarcode.value = "";

    renderReaderInfo();
    renderScannedCopies();
    validateBorrowConditions();

    showLocalToast("Đã làm mới quầy tiếp nhận mượn sách");
    dom.inputCardCode.focus();
  }

  // ==============================================================================
  // 6.5. QUÉT MÃ BẰNG CAMERA - html5-qrcode (HOẠT ĐỘNG OFFLINE QUA STATIC FILES)
  // ==============================================================================

  // Biến trạng thái camera scanner
  var html5QrScanner = null;         // Instance của Html5Qrcode
  var cameraTarget = "book";         // "book" hoặc "card" - đang quét cho mục nào
  var cameraSessionScanned = 0;      // Đếm số mã đã quét trong phiên
  var lastScannedCode = "";          // Mã vừa quét (chống trùng liên tục)
  var lastScannedTime = 0;           // Thời điểm quét cuối (ms)

  // Mở modal camera và bắt đầu quét
  function openCameraModal(target) {
    cameraTarget = target;
    cameraSessionScanned = 0;
    lastScannedCode = "";
    lastScannedTime = 0;

    // Cập nhật nhãn hiển thị
    if (target === "card") {
      dom.cameraTargetLabel.textContent = "Đang quét: Mã thẻ thư viện";
    } else {
      dom.cameraTargetLabel.textContent = "Đang quét: Mã vạch sách";
    }

    dom.cameraSessionCount.textContent = "0";
    dom.cameraFeedbackCard.classList.add("hidden");
    dom.cameraFeedbackCard.className = "camera-feedback-card hidden";
    dom.cameraScannerModal.classList.remove("hidden");

    // Lấy danh sách camera có sẵn
    Html5Qrcode.getCameras().then(function (devices) {
      dom.cameraDeviceSelect.innerHTML = "";
      if (devices.length === 0) {
        var opt = document.createElement("option");
        opt.textContent = "Không tìm thấy camera nào";
        dom.cameraDeviceSelect.appendChild(opt);
        showLocalToast("Không tìm thấy camera trên thiết bị", "error");
        return;
      }
      devices.forEach(function (cam) {
        var opt = document.createElement("option");
        opt.value = cam.id;
        opt.textContent = cam.label || ("Camera " + cam.id.slice(0, 8));
        dom.cameraDeviceSelect.appendChild(opt);
      });

      // Ưu tiên camera sau (rear/back/environment)
      var rearCam = devices.find(function (d) {
        return /back|rear|environment/i.test(d.label);
      });
      if (rearCam) {
        dom.cameraDeviceSelect.value = rearCam.id;
      }

      // Bắt đầu quét với camera được chọn
      startScannerWithCamera(dom.cameraDeviceSelect.value);
    }).catch(function (err) {
      console.error("Lỗi lấy danh sách camera:", err);
      showLocalToast("Không thể truy cập camera. Hãy cấp quyền camera!", "error");
    });
  }

  // Khởi chạy html5-qrcode với camera cụ thể
  function startScannerWithCamera(cameraId) {
    // Dừng scanner cũ nếu đang chạy
    if (html5QrScanner) {
      try { html5QrScanner.stop(); } catch (e) { /* bỏ qua */ }
    }

    html5QrScanner = new Html5Qrcode("camera-scanner-reader");

    // Cấu hình tối ưu cho mã vạch sách
    var config = {
      fps: 15,
      qrbox: function (vw, vh) {
        var w = Math.min(vw * 0.85, 340);
        var h = Math.min(vh * 0.5, 180);
        return { width: Math.floor(w), height: Math.floor(h) };
      },
      aspectRatio: 1.333333,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.ITF,
      ],
    };

    html5QrScanner.start(
      cameraId,
      config,
      onCameraCodeDetected,
      function () { /* Lỗi quét liên tục - không xử lý */ }
    ).catch(function (err) {
      console.error("Không thể khởi động camera:", err);
      showLocalToast("Không thể khởi động camera: " + (err.message || err), "error");
    });
  }

  // Dừng camera scanner và đóng modal
  function stopCameraScanner() {
    if (html5QrScanner) {
      html5QrScanner.stop().then(function () {
        html5QrScanner.clear();
        html5QrScanner = null;
      }).catch(function () {
        html5QrScanner = null;
      });
    }
    dom.cameraScannerModal.classList.add("hidden");
  }

  // Xử lý khi camera đọc được mã (gọi lại mỗi lần phát hiện mã)
  function onCameraCodeDetected(decodedText) {
    var now = Date.now();
    var code = decodedText.trim().toUpperCase();

    // Chống quét trùng liên tục trong 2.5 giây
    if (code === lastScannedCode && (now - lastScannedTime) < 2500) {
      return;
    }
    lastScannedCode = code;
    lastScannedTime = now;

    // Phát âm thanh beep xác nhận
    playScannerBeep();

    cameraSessionScanned++;
    dom.cameraSessionCount.textContent = String(cameraSessionScanned);

    if (cameraTarget === "card") {
      // Quét thẻ: điền vào ô mã thẻ và tự động tra cứu
      dom.inputCardCode.value = code;
      updateCameraFeedback("Đã quét thẻ: " + code, "Đang tra cứu thông tin độc giả...", "success");
      stopCameraScanner();
      lookupReader();
    } else {
      // Quét sách: kiểm tra trùng rồi thêm vào danh sách
      var alreadyExists = state.copies.some(function (c) {
        return c.copy_code.toUpperCase() === code;
      });

      if (alreadyExists) {
        updateCameraFeedback("Mã trùng: " + code, "Cuốn sách này đã có trong danh mục mượn!", "warning");
        return;
      }

      updateCameraFeedback("Đã quét: " + code, "Đang tra cứu bản sao trong kho...", "success");

      // Gọi API tra cứu bản sao
      dom.inputBarcode.value = code;
      addBarcode();
    }
  }

  // Phát âm beep xác nhận quét thành công qua Web Audio API
  function playScannerBeep() {
    try {
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Trình duyệt không hỗ trợ Web Audio - bỏ qua
    }
  }

  // Cập nhật khung phản hồi quét trong modal camera
  function updateCameraFeedback(title, desc, status) {
    dom.cameraFeedbackCard.classList.remove("hidden", "feedback-success", "feedback-warning", "feedback-error");
    dom.cameraFeedbackCard.classList.add("feedback-" + status);

    var iconMap = { success: "check_circle", warning: "warning", error: "error" };
    dom.cameraFeedbackIcon.textContent = iconMap[status] || "info";
    dom.cameraFeedbackTitle.textContent = title;
    dom.cameraFeedbackDesc.textContent = desc;
  }

  // Quét mã từ ảnh tải lên (file upload)
  function handleCameraFileUpload(e) {
    var file = e.target.files[0];
    if (!file) return;

    if (!html5QrScanner) {
      html5QrScanner = new Html5Qrcode("camera-scanner-reader");
    }

    html5QrScanner.scanFile(file, true)
      .then(function (decoded) {
        onCameraCodeDetected(decoded);
      })
      .catch(function () {
        updateCameraFeedback("Không tìm thấy mã", "Ảnh không chứa mã vạch/QR hợp lệ. Thử ảnh khác.", "error");
      });

    // Reset input file để cho phép chọn lại cùng file
    e.target.value = "";
  }

  // ==============================================================================
  // 9. HỘP THOẠI XÁC NHẬN CHUNG / ĐĂNG XUẤT (showConfirm - ĐỒNG BỘ LOAN_MANAGEMENT)
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

  // ----------------------------------------------------------------------------
  // ĐỒNG BỘ THÔNG TIN NGƯỜI DÙNG & SỰ KIỆN TẠI AVATAR (LOGIN / LOGOUT / PROFILE)
  // ----------------------------------------------------------------------------
  async function loadUserProfile() {
    const avatarEl = document.getElementById("userAvatar");
    const nameEl = document.getElementById("userName");
    const roleEl = document.getElementById("userRole");
    const dropdownMenu = document.getElementById("userDropdownMenu");

    function mapRoleLabel(role) {
      if (!role) return "Độc giả";
      const r = String(role).toUpperCase();
      if (r === "ADMIN") return "Quản trị viên";
      if (r === "LIBRARIAN") return "Thủ thư trực quầy";
      if (r === "READER") return "Sinh viên / Độc giả";
      return role;
    }

    function renderUser(user) {
      if (!user) {
        if (avatarEl) avatarEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">person</span>';
        if (nameEl) nameEl.textContent = "Chưa đăng nhập";
        if (roleEl) roleEl.textContent = "Bấm để đăng nhập";
        if (dom.summaryLibrarianName) dom.summaryLibrarianName.textContent = "Chưa đăng nhập";
        if (dom.pSigLibrarianName) dom.pSigLibrarianName.textContent = "—";

        if (dropdownMenu) {
          dropdownMenu.innerHTML = `
            <a href="login.html#login" class="dropdown-item">
              <span class="material-symbols-outlined">login</span>
              <span>Đăng nhập</span>
            </a>
            <a href="login.html#register" class="dropdown-item">
              <span class="material-symbols-outlined">person_add</span>
              <span>Đăng ký thẻ mới</span>
            </a>
          `;
        }
        return;
      }

      const displayName = user.full_name || user.name || user.email || "Thủ thư";
      const initialChar = (displayName.trim().charAt(0) || "T").toUpperCase();
      const displayRole = mapRoleLabel(user.role);

      if (avatarEl) avatarEl.textContent = initialChar;
      if (nameEl) nameEl.textContent = displayName;
      if (roleEl) roleEl.textContent = displayRole;

      if (dom.summaryLibrarianName) dom.summaryLibrarianName.textContent = displayName;
      if (dom.pSigLibrarianName) dom.pSigLibrarianName.textContent = displayName;

      if (dropdownMenu) {
        dropdownMenu.innerHTML = `
          <a href="auth.html" class="dropdown-item">
            <span class="material-symbols-outlined">account_circle</span>
            <span>Thông tin cá nhân</span>
          </a>
          <div class="dropdown-divider"></div>
          <button type="button" class="dropdown-item text-danger" id="logoutMenuBtn">
            <span class="material-symbols-outlined">logout</span>
            <span>Đăng xuất</span>
          </button>
        `;
      }
    }

    // 1. Lấy thông tin từ cache (hiển thị ngay)
    let currentUser = null;
    if (typeof auth !== "undefined" && typeof auth.getUser === "function") {
      currentUser = auth.getUser();
    } else {
      try {
        const raw = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
        if (raw) currentUser = JSON.parse(raw);
      } catch (e) { /* ignore */ }
    }
    renderUser(currentUser);

    // 2. Đồng bộ session mới nhất từ database nếu có token
    if (typeof auth !== "undefined" && typeof auth.getToken === "function" && auth.getToken()) {
      try {
        if (typeof auth.syncSession === "function") {
          const freshUser = await auth.syncSession();
          if (freshUser) renderUser(freshUser);
        }
      } catch (err) {
        console.warn("Không thể đồng bộ session user:", err);
      }
    }
  }

  function handleLogoutClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const userDropdownMenu = document.getElementById("userDropdownMenu");
    const userProfileBtn = document.getElementById("userProfileBtn");
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
        showLocalToast("Phiên làm việc đã kết thúc. Đang chuyển hướng...", "info");
        setTimeout(() => {
          window.location.href = "login.html#login";
        }, 500);
      }
    });
  }

  // ==============================================================================
  // 10. KHỞI TẠO VÀ LẮNG NGHE SỰ KIỆN GIAO DIỆN
  // ==============================================================================
  function init() {
    // 1. Tải và đồng bộ thông tin tài khoản
    loadUserProfile();

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

    if (userProfileBtn && userDropdownMenu) {
      userProfileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdownMenu.classList.toggle("show");
        const isShown = userDropdownMenu.classList.contains("show");
        userProfileBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
      });
    }

    // Bắt sự kiện đăng xuất qua delegation trên document
    document.addEventListener("click", (e) => {
      const logoutBtn = e.target.closest("#logoutMenuBtn");
      if (logoutBtn) {
        handleLogoutClick(e);
      }
    });

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

    // 2. Đặt ngày hẹn trả mặc định 14 ngày
    dom.summaryDueDate.textContent = getStandardDueDate();

    // 3. Sự kiện tra cứu thẻ
    dom.btnLookupCard.addEventListener("click", lookupReader);
    dom.inputCardCode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        lookupReader();
      }
    });
    const readerSearchForm = document.getElementById("reader-search-form");
    if (readerSearchForm) {
      readerSearchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        lookupReader();
      });
    }

    // 4. Sự kiện quét mã sách (hỗ trợ cả máy quét mã vạch barcode scanner gun và nhập tay)
    dom.btnAddBarcode.addEventListener("click", addBarcode);
    dom.inputBarcode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addBarcode();
      }
    });
    const barcodeScanForm = document.getElementById("barcode-scan-form");
    if (barcodeScanForm) {
      barcodeScanForm.addEventListener("submit", (e) => {
        e.preventDefault();
        addBarcode();
      });
    }

    // 5. Nút bấm tạo phiếu mượn
    dom.btnSubmitLoan.addEventListener("click", submitLoan);

    // 6. Nút hủy bỏ / làm mới
    dom.btnCancelLoan.addEventListener("click", resetCounterSession);
    dom.btnResetCounter.addEventListener("click", resetCounterSession);

    // 7. Sự kiện modal biên lai
    dom.btnCloseModal.addEventListener("click", () => dom.receiptModal.classList.add("hidden"));
    dom.btnFinishModal.addEventListener("click", closeModalAndReset);
    dom.btnPrintReceiptAction.addEventListener("click", printReceipt);

    // 8. Đóng modal bằng phím Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!dom.cameraScannerModal.classList.contains("hidden")) {
          stopCameraScanner();
        } else if (!dom.receiptModal.classList.contains("hidden")) {
          dom.receiptModal.classList.add("hidden");
        }
      }
    });

    // 9. Sự kiện camera scanner
    dom.btnScanCardCamera.addEventListener("click", function () {
      openCameraModal("card");
    });
    dom.btnScanBarcodeCamera.addEventListener("click", function () {
      openCameraModal("book");
    });
    dom.btnCameraClose.addEventListener("click", stopCameraScanner);
    dom.btnCameraStop.addEventListener("click", stopCameraScanner);

    // Chuyển camera khi thay đổi dropdown
    dom.cameraDeviceSelect.addEventListener("change", function () {
      if (this.value && html5QrScanner) {
        startScannerWithCamera(this.value);
        if (confirmModal && confirmModal.classList.contains("active")) {
          closeConfirmModal();
        }
        if (dom.receiptModal && !dom.receiptModal.classList.contains("hidden")) {
          dom.receiptModal.classList.add("hidden");
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

    // Bật/tắt đèn flash (torch)
    dom.btnCameraTorch.addEventListener("click", function () {
      if (html5QrScanner) {
        html5QrScanner.applyVideoConstraints({
          advanced: [{ torch: true }]
        }).catch(function () {
          showLocalToast("Thiết bị không hỗ trợ đèn flash", "warning");
        });
      }
    });

    // Quét từ ảnh tải lên
    dom.cameraFileInput.addEventListener("change", handleCameraFileUpload);

    // Khởi tạo trạng thái ban đầu
    validateBorrowConditions();
  }

  // Export các hàm modal tiện ích
  window.borrowOnSiteApp = {
    showConfirm,
    closeConfirmModal,
  };

  // Chạy sau khi nạp xong DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
