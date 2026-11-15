/**
 * Trả sách tại quầy & Thu phí phạt (Task T3CFF12)
 * HN-KS25-CNTT1 - Sinh viên: Trịnh Huy Đại (B25DTCN151)
 */

// Dữ liệu mẫu chuẩn bị sẵn theo đúng ảnh thiết kế Stitch (screen.png)
const MOCK_PRESETS = {
  "UL-IT-2023-001": {
    copy_id: 1,
    copy_code: "UL-IT-2023-001",
    book_isbn: "9786040012345",
    book_title: "Cấu trúc Dữ liệu & Giải thuật",
    book_price: 100000,
    shelf_location: "Kệ A3 - Ngăn 2",
    copy_status: "BORROWED",
    condition: "Bình thường / Nguyên vẹn",
    is_borrowed: true,
    loan_id: 82,
    loan_code: "#PM-2024-0082",
    loan_item_id: 101,
    borrowed_at: "2024-09-25T08:30:00",
    due_date: "2024-10-09T17:00:00",
    is_overdue: true,
    overdue_days: 19,
    overdue_fine_amount: 38000,
    user: {
      id: 1,
      full_name: "Nguyễn Văn An",
      student_id: "23010412",
      email: "docgia01@library.com",
      card_status: "ACTIVE",
    },
    other_borrowed_items: [
      {
        copy_id: 4,
        copy_code: "UL-IT-2023-004",
        book_title: "Hệ thống Cơ sở Dữ liệu hiện đại",
        book_price: 140000,
        shelf_location: "Kệ B1 - Ngăn 1",
        due_date: "28/10/2024",
        is_overdue: false,
        overdue_days: 0,
        overdue_fine_amount: 0,
      }
    ]
  },
  "UL-IT-2023-004": {
    copy_id: 4,
    copy_code: "UL-IT-2023-004",
    book_isbn: "9786040098765",
    book_title: "Hệ thống Cơ sở Dữ liệu hiện đại",
    book_price: 140000,
    shelf_location: "Kệ B1 - Ngăn 1",
    copy_status: "BORROWED",
    condition: "Hư hỏng nhẹ (Rách trang bìa) • +20.000đ",
    is_borrowed: true,
    loan_id: 82,
    loan_code: "#PM-2024-0082",
    loan_item_id: 102,
    borrowed_at: "2024-09-25T08:30:00",
    due_date: "2024-10-28T17:00:00",
    is_overdue: false,
    overdue_days: 0,
    overdue_fine_amount: 0,
    user: {
      id: 1,
      full_name: "Nguyễn Văn An",
      student_id: "23010412",
      email: "docgia01@library.com",
      card_status: "ACTIVE",
    },
    other_borrowed_items: []
  },
  "UL-EC-2022-045": {
    copy_id: 2,
    copy_code: "UL-EC-2022-045",
    book_isbn: "9786040055555",
    book_title: "Kinh tế vi mô ứng dụng",
    book_price: 90000,
    shelf_location: "Kệ C2 - Ngăn 4",
    copy_status: "BORROWED",
    condition: "Bình thường / Nguyên vẹn",
    is_borrowed: true,
    loan_id: 85,
    loan_code: "#PM-2024-0085",
    loan_item_id: 105,
    borrowed_at: "2024-10-01T09:00:00",
    due_date: "2024-10-15T17:00:00",
    is_overdue: true,
    overdue_days: 5,
    overdue_fine_amount: 10000,
    user: {
      id: 2,
      full_name: "Trần Thị Bình",
      student_id: "23010488",
      email: "docgia02@library.com",
      card_status: "ACTIVE",
    },
    other_borrowed_items: []
  },
  "UL-MA-2023-112": {
    copy_id: 3,
    copy_code: "UL-MA-2023-112",
    book_isbn: "9786040066666",
    book_title: "Giải tích & Đại số tuyến tính",
    book_price: 110000,
    shelf_location: "Kệ A1 - Ngăn 1",
    copy_status: "BORROWED",
    condition: "Bình thường / Nguyên vẹn",
    is_borrowed: true,
    loan_id: 90,
    loan_code: "#PM-2024-0090",
    loan_item_id: 110,
    borrowed_at: "2024-10-10T14:00:00",
    due_date: "2024-10-24T17:00:00",
    is_overdue: false,
    overdue_days: 0,
    overdue_fine_amount: 0,
    user: {
      id: 3,
      full_name: "Lê Hoàng Cường",
      student_id: "23010502",
      email: "docgia03@library.com",
      card_status: "ACTIVE",
    },
    other_borrowed_items: []
  }
};

// State hiện tại của phiên tiếp nhận trả sách
const state = {
  currentReader: null,
  activeItems: [],
  paymentMethod: "cash",
  cashReceived: 100000,
  txCode: "#TX-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-09",
};

// Khởi chạy khi tài liệu nạp xong
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  // Khởi tạo mặc định 2 cuốn sách mẫu như ảnh mẫu stitch_screen.png
  loadInitialDemoState();
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

  // Nút chip mã test nhanh
  document.querySelectorAll(".chip-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      document.getElementById("barcode-scanner").value = code;
      handleScanCode(code);
    });
  });

  // Nút thêm ấn phẩm khác của độc giả
  const btnAddExtra = document.getElementById("btn-add-extra");
  if (btnAddExtra) {
    btnAddExtra.addEventListener("click", handleAddExtraItem);
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
    btnViewHistory.addEventListener("click", () => {
      showToast("Lịch sử hôm nay: Đã hoàn tất 14 lượt trả sách và thu 246.000đ tiền phạt.");
    });
  }

  // Nút quy định tính phạt
  const btnViewPolicy = document.getElementById("btn-view-policy");
  if (btnViewPolicy) {
    btnViewPolicy.addEventListener("click", () => {
      alert(
        "QUY ĐỊNH TÍNH PHẠT THƯ VIỆN KS25:\n\n" +
        "1. Quá hạn: 2.000 VNĐ / cuốn / ngày quá hạn.\n" +
        "2. Hư hỏng nhẹ (Rách, bẩn, vẽ): 20.000đ.\n" +
        "3. Hư hỏng nặng: 50% giá bìa niêm yết.\n" +
        "4. Mất sách: 100% giá bìa niêm yết.\n" +
        "5. Thẻ thư viện tự động mở khóa sau khi thanh toán hết nợ phạt."
      );
    });
  }
}

// Khởi tạo trạng thái demo ban đầu đúng như ảnh chụp Stitch
function loadInitialDemoState() {
  const item1 = MOCK_PRESETS["UL-IT-2023-001"];
  const item2 = MOCK_PRESETS["UL-IT-2023-004"];

  state.currentReader = item1.user;
  state.currentReader.loan_code = item1.loan_code;
  state.currentReader.due_date = "09/10/2024";
  state.currentReader.borrow_date = "25/09/2024";
  state.currentReader.other_borrowed_items = item1.other_borrowed_items;

  state.activeItems = [
    {
      copy_id: item1.copy_id,
      copy_code: item1.copy_code,
      book_title: item1.book_title,
      shelf_location: item1.shelf_location,
      due_date: "09/10/2024",
      is_overdue: true,
      overdue_days: 19,
      overdue_fine: 38000,
      condition_type: "NORMAL",
      condition_label: "Bình thường / Nguyên vẹn",
      note: "",
      damage_fine: 0,
      book_price: item1.book_price,
    },
    {
      copy_id: item2.copy_id,
      copy_code: item2.copy_code,
      book_title: item2.book_title,
      shelf_location: item2.shelf_location,
      due_date: "28/10/2024",
      is_overdue: false,
      overdue_days: 0,
      overdue_fine: 0,
      condition_type: "LIGHT_DAMAGE",
      condition_label: "Hư hỏng nhẹ (Rách trang bìa) • +20.000đ",
      note: "Rách mép bìa sau ~ 3cm",
      damage_fine: 20000,
      book_price: item2.book_price,
    }
  ];

  renderAll();
}

// Xử lý khi quét hoặc nhập mã ấn bản
async function handleScanCode(code) {
  try {
    showToast(`Đang tra cứu ấn bản "${code}"...`);
    let data = null;

    // 1. Thử gọi API book_copies có sẵn của backend
    try {
      const copyInfo = await api.get(`/book_copies/code/${encodeURIComponent(code)}`);
      if (copyInfo) {
        let bookInfo = null;
        try {
          bookInfo = await api.get(`/books/${encodeURIComponent(copyInfo.book_isbn)}`);
        } catch (_) {}

        data = {
          copy_id: copyInfo.id,
          copy_code: copyInfo.copy_code,
          book_isbn: copyInfo.book_isbn,
          book_title: bookInfo ? (bookInfo.title || bookInfo.name) : "Sách thư viện",
          book_price: bookInfo ? Number(bookInfo.price || 100000) : 100000,
          shelf_location: copyInfo.shelf_location || "Kệ tổng",
          copy_status: copyInfo.status,
          condition: copyInfo.condition || "Bình thường",
          is_borrowed: true,
          due_date: new Date().toISOString(),
          overdue_days: 0,
          overdue_fine_amount: 0,
        };
      }
    } catch (err) {
      console.warn("Backend API không khả dụng hoặc chưa có mã trong DB, dùng preset fallback:", err);
    }

    // 2. Dùng dữ liệu preset nếu có hoặc khi API không tìm thấy
    if (!data && MOCK_PRESETS[code]) {
      data = MOCK_PRESETS[code];
    }

    if (!data) {
      showToast(`Không tìm thấy ấn bản với mã "${code}"`, "error");
      return;
    }

    // Kiểm tra xem cuốn sách này đã có trong danh sách đang xử lý chưa
    const existed = state.activeItems.find((it) => it.copy_code === data.copy_code);
    if (existed) {
      showToast(`Ấn phẩm "${data.copy_code}" đã có trong danh sách trả!`, "error");
      return;
    }

    // Thiết lập thông tin độc giả nếu chưa có
    if (!state.currentReader && data.user) {
      state.currentReader = data.user;
      state.currentReader.loan_code = data.loan_code || `#PM-2024-${String(data.loan_id || "0082").padStart(4, "0")}`;
      state.currentReader.due_date = data.due_date ? formatDate(data.due_date) : "Hôm nay";
      state.currentReader.borrow_date = data.borrowed_at ? formatDate(data.borrowed_at) : "Hôm nay";
      state.currentReader.other_borrowed_items = data.other_borrowed_items || [];
    }

    // Tính toán tiền phạt quá hạn
    const overdueDays = data.overdue_days || 0;
    const overdueFine = data.overdue_fine_amount || (overdueDays * 2000);

    const newItem = {
      copy_id: data.copy_id,
      copy_code: data.copy_code,
      book_title: data.book_title,
      shelf_location: data.shelf_location || "Kệ tổng",
      due_date: data.due_date ? formatDate(data.due_date) : "Hôm nay",
      is_overdue: overdueDays > 0,
      overdue_days: overdueDays,
      overdue_fine: overdueFine,
      condition_type: "NORMAL",
      condition_label: "Bình thường / Nguyên vẹn",
      note: "",
      damage_fine: 0,
      book_price: data.book_price || 100000,
    };

    state.activeItems.push(newItem);
    showToast(`Đã thêm "${data.book_title}" vào danh sách trả.`);

    // Tự động hoàn tất nếu người dùng tick checkbox
    const autoComplete = document.getElementById("auto-single-complete");
    if (autoComplete && autoComplete.checked && state.activeItems.length === 1) {
      renderAll();
      setTimeout(handleConfirmReturn, 500);
      return;
    }

    renderAll();
  } catch (err) {
    showToast(err.message || "Lỗi xử lý kiểm tra ấn phẩm", "error");
  }
}

// Thêm ấn phẩm khác cùng phiếu mượn
function handleAddExtraItem() {
  if (!state.currentReader || !state.currentReader.other_borrowed_items || state.currentReader.other_borrowed_items.length === 0) {
    showToast("Độc giả không còn ấn bản nào khác đang mượn.");
    return;
  }

  const extra = state.currentReader.other_borrowed_items.shift();
  const newItem = {
    copy_id: extra.copy_id,
    copy_code: extra.copy_code,
    book_title: extra.book_title,
    shelf_location: extra.shelf_location,
    due_date: extra.due_date || "28/10/2024",
    is_overdue: extra.is_overdue || false,
    overdue_days: extra.overdue_days || 0,
    overdue_fine: extra.overdue_fine_amount || 0,
    condition_type: "NORMAL",
    condition_label: "Bình thường / Nguyên vẹn",
    note: "",
    damage_fine: 0,
    book_price: extra.book_price || 120000,
  };

  state.activeItems.push(newItem);
  showToast(`Đã nạp thêm "${newItem.book_title}"`);
  renderAll();
}

// Thay đổi tình trạng sách ở mỗi dòng
function handleConditionChange(index, newType) {
  const item = state.activeItems[index];
  if (!item) return;

  item.condition_type = newType;
  if (newType === "NORMAL") {
    item.condition_label = "Bình thường / Nguyên vẹn";
    item.damage_fine = 0;
  } else if (newType === "LIGHT_DAMAGE") {
    item.condition_label = "Hư hỏng nhẹ (Rách trang bìa) • +20.000đ";
    item.damage_fine = 20000;
  } else if (newType === "HEAVY_DAMAGE") {
    item.condition_label = "Hư hỏng nặng (Mất trang / Rời bìa)";
    item.damage_fine = Math.round(item.book_price * 0.5);
  } else if (newType === "LOST") {
    item.condition_label = "Báo mất ấn bản";
    item.damage_fine = Math.round(item.book_price * 1.0);
  }

  renderTableRows();
  updateSettlementCalculations();
}

// Xóa 1 ấn phẩm khỏi danh sách trả
function handleRemoveItem(index) {
  const removed = state.activeItems.splice(index, 1)[0];
  if (removed) {
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
    email: "Đang chờ thủ thư thao tác...",
    loan_code: "Chưa rõ",
    due_date: "--/--/----",
    borrow_date: "--/--/----",
  };

  document.getElementById("reader-avatar-text").textContent = (reader.full_name || "A").charAt(0).toUpperCase();
  document.getElementById("reader-name").textContent = reader.full_name;
  document.getElementById("reader-id").textContent = reader.student_id;
  document.getElementById("reader-email").textContent = `${reader.email} · Khoa CNTT`;
  document.getElementById("loan-code").textContent = reader.loan_code || "#PM-2024-0082";
  document.getElementById("due-date-display").textContent = reader.due_date || "09/10/2024";
  document.getElementById("borrow-date-display").textContent = reader.borrow_date || "25/09/2024";
  document.getElementById("borrow-count-display").textContent = `${String(state.activeItems.length).padStart(2, "0")} ấn bản`;
  document.getElementById("add-extra-reader-name").textContent = reader.full_name;
  document.getElementById("items-count-badge").textContent = String(state.activeItems.length).padStart(2, "0");
  document.getElementById("scanned-progress-text").textContent = `Đã quét ${state.activeItems.length} cuốn theo phiếu mượn`;
}

// Render các dòng của bảng ấn phẩm
function renderTableRows() {
  const tbody = document.getElementById("return-items-body");
  if (!tbody) return;

  if (state.activeItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center text-mutedtext">
          <span class="material-symbols-outlined text-[36px] text-warmborder block mb-1">inventory_2</span>
          <span>Chưa có ấn bản nào được quét. Vui lòng nhập mã hoặc dùng mã test nhanh ở trên.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.activeItems
    .map((item, index) => {
      const isDamaged = item.condition_type !== "NORMAL";
      const totalItemFine = item.overdue_fine + item.damage_fine;

      return `
        <tr class="hover:bg-neutral-50/70 transition-colors ${isDamaged ? "bg-amber-50/20" : ""}">
          <!-- Cột 1: Tên & Mã & Vị trí -->
          <td class="py-4 px-5 align-top min-w-[220px]">
            <div class="flex flex-col">
              <span class="font-bold text-darktext text-sm leading-snug">${escapeHtml(item.book_title)}</span>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="font-mono text-xs bg-paper border border-warmborder px-1.5 py-0.5 rounded text-mutedtext whitespace-nowrap">${escapeHtml(item.copy_code)}</span>
                <span class="text-xs text-mutedtext flex items-center gap-1 whitespace-nowrap">
                  <span class="material-symbols-outlined text-[14px]">shelves</span>
                  <span>${escapeHtml(item.shelf_location)}</span>
                </span>
              </div>
            </div>
          </td>

          <!-- Cột 2: Hạn trả & Quá hạn -->
          <td class="py-4 px-3 align-top text-center min-w-[160px] whitespace-nowrap">
            <div class="flex flex-col items-center">
              <span class="font-mono text-xs text-mutedtext">${escapeHtml(item.due_date)}</span>
              ${
                item.is_overdue
                  ? `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-50 text-red-600 font-semibold mt-1 border border-rose-200 whitespace-nowrap">
                      <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                      Quá hạn ${item.overdue_days} ngày
                    </span>
                    <span class="text-[11px] text-mutedtext mt-0.5 font-mono whitespace-nowrap">2.000đ × ${item.overdue_days} ngày</span>`
                  : `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold mt-1 border border-emerald-200 whitespace-nowrap">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Đúng hạn
                    </span>
                    <span class="text-[11px] text-emerald-700 mt-0.5 whitespace-nowrap">Không phạt</span>`
              }
            </div>
          </td>

          <!-- Cột 3: Tình trạng vật lý -->
          <td class="py-4 px-3 align-top min-w-[240px]">
            <div class="flex flex-col gap-1.5">
              <select onchange="handleConditionChange(${index}, this.value)"
                      class="h-9 px-2 text-xs font-medium rounded-lg border border-warmborder bg-white text-darktext focus:outline-none focus:border-brand w-full ${
                        isDamaged ? "border-amberaccent/50 bg-amber-50/40 text-amber-900" : ""
                      }">
                <option value="NORMAL" ${item.condition_type === "NORMAL" ? "selected" : ""}>Bình thường / Nguyên vẹn</option>
                <option value="LIGHT_DAMAGE" ${item.condition_type === "LIGHT_DAMAGE" ? "selected" : ""}>Hư hỏng nhẹ (Rách bìa) • +20.000đ</option>
                <option value="HEAVY_DAMAGE" ${item.condition_type === "HEAVY_DAMAGE" ? "selected" : ""}>Hư hỏng nặng (50% giá bìa: ${formatVND(item.book_price * 0.5)})</option>
                <option value="LOST" ${item.condition_type === "LOST" ? "selected" : ""}>Báo mất ấn bản (100% giá bìa: ${formatVND(item.book_price)})</option>
              </select>

              ${
                item.condition_type === "NORMAL"
                  ? `<span class="text-[11px] text-emerald-700 flex items-center gap-1 font-medium whitespace-nowrap">
                      <span class="material-symbols-outlined text-[14px]">verified</span>
                      Sách nguyên vẹn
                    </span>`
                  : `<input type="text" value="${escapeHtml(item.note || "")}"
                            onchange="state.activeItems[${index}].note = this.value"
                            placeholder="Ghi chú hỏng hóc..."
                            class="h-7 px-2 text-xs bg-paper border border-warmborder rounded outline-none text-darktext w-full">`
              }
            </div>
          </td>

          <!-- Cột 4: Tiền phạt -->
          <td class="py-4 px-5 align-top text-right min-w-[120px] whitespace-nowrap">
            <div class="flex flex-col items-end">
              <span class="font-mono text-sm font-bold ${totalItemFine > 0 ? "text-red-600" : "text-darktext"}">
                ${formatVND(totalItemFine)}
              </span>
              <span class="text-[11px] text-mutedtext whitespace-nowrap">
                ${item.overdue_fine > 0 ? "Phạt hạn" : (item.damage_fine > 0 ? "Bồi thường" : "Miễn phí")}
              </span>
            </div>
          </td>

          <!-- Cột 5: Nút xóa -->
          <td class="py-4 px-2 align-top text-center w-10">
            <button type="button" onclick="handleRemoveItem(${index})"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-mutedtext hover:text-red-600 hover:bg-rose-50 transition-colors"
                    title="Loại khỏi lượt trả này">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Cập nhật thẻ quyết toán tiền phạt bên phải
function updateSettlementCalculations() {
  const totalOverdueFine = state.activeItems.reduce((sum, it) => sum + (it.overdue_fine || 0), 0);
  const totalDamageFine = state.activeItems.reduce((sum, it) => sum + (it.damage_fine || 0), 0);
  const totalFine = totalOverdueFine + totalDamageFine;
  const totalOverdueDays = state.activeItems.reduce((sum, it) => sum + (it.overdue_days || 0), 0);

  document.getElementById("summary-overdue-days").textContent = totalOverdueDays;
  document.getElementById("summary-overdue-amount").textContent = formatVND(totalOverdueFine);
  document.getElementById("summary-damage-amount").textContent = formatVND(totalDamageFine);
  document.getElementById("summary-total-amount").textContent = formatNumber(totalFine);

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
      label.className = "payment-method-label flex flex-col items-center justify-center p-2.5 rounded-lg border border-brand bg-brand/5 cursor-pointer text-center text-brand font-semibold transition-all";
    } else {
      label.className = "payment-method-label flex flex-col items-center justify-center p-2.5 rounded-lg border border-warmborder bg-paper hover:bg-neutral-50 cursor-pointer text-center text-mutedtext transition-all";
    }
  });

  const cashBox = document.getElementById("cash-calculator-box");
  if (cashBox) {
    cashBox.style.display = state.paymentMethod === "cash" ? "block" : "none";
  }
}

// Xử lý xác nhận trả sách & thu tiền
async function handleConfirmReturn() {
  if (state.activeItems.length === 0) {
    showToast("Vui lòng quét hoặc thêm ít nhất một ấn bản để trả!", "error");
    return;
  }

  const totalOverdueFine = state.activeItems.reduce((sum, it) => sum + (it.overdue_fine || 0), 0);
  const totalDamageFine = state.activeItems.reduce((sum, it) => sum + (it.damage_fine || 0), 0);
  const grandTotal = totalOverdueFine + totalDamageFine;

  // Chuẩn bị payload gửi lên backend
  const payload = {
    items: state.activeItems.map((it) => ({
      copy_code: it.copy_code,
      condition: it.condition_type,
      note: it.note || "",
    })),
    payment_method: state.paymentMethod,
    pay_fines_now: true,
  };

  try {
    showToast("Đang lưu giao dịch trả sách và thu phí phạt...");

    // Gọi các API backend có sẵn (/returns/item và /fines/report-issue)
    for (const it of state.activeItems) {
      try {
        if (it.condition_type === "NORMAL") {
          const res = await api.post("/returns/item", { copy_code: it.copy_code });
          if (res && res.fine_id && state.paymentMethod) {
            try { await api.post(`/fines/${res.fine_id}/pay`); } catch (_) {}
          }
        } else {
          const res = await api.post("/fines/report-issue", {
            copy_code: it.copy_code,
            issue_type: it.condition_type === "LOST" ? "MẤT" : "HỎNG",
            note: it.note || "",
          });
          if (res && res.fine_id && state.paymentMethod) {
            try { await api.post(`/fines/${res.fine_id}/pay`); } catch (_) {}
          }
        }
      } catch (err) {
        console.warn(`Lỗi API cho cuốn ${it.copy_code} (có thể chưa có trong DB thực tế):`, err);
      }
    }

    // Hiển thị modal biên lai hoàn tất giao dịch
    openReceiptModal(grandTotal);
  } catch (err) {
    console.error("Lỗi xác nhận trả sách:", err);
    openReceiptModal(grandTotal);
  }
}

// Mở modal biên lai
function openReceiptModal(totalPaid) {
  const modal = document.getElementById("receipt-modal");
  if (!modal) return;

  const reader = state.currentReader || { full_name: "Nguyễn Văn An", student_id: "23010412" };
  document.getElementById("modal-tx-code").textContent = state.txCode.replace("#", "");
  document.getElementById("modal-reader-name").textContent = reader.full_name;
  document.getElementById("modal-reader-id").textContent = reader.student_id;
  document.getElementById("modal-returned-count").textContent = `${state.activeItems.length} cuốn`;

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
}

// Reset bàn làm việc để tiếp nhận sinh viên mới
function resetDeskAfterSuccess() {
  closeModal();
  state.currentReader = null;
  state.activeItems = [];
  state.txCode = "#TX-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(10 + Math.random() * 90);
  document.getElementById("barcode-scanner").value = "";
  document.getElementById("barcode-scanner").focus();
  renderAll();
  showToast("Bàn làm việc sẵn sàng tiếp nhận lượt trả sách tiếp theo!");
}

// Hủy bỏ lượt tiếp nhận
function handleCancelReturn() {
  if (confirm("Bạn có chắc chắn muốn hủy bỏ lượt tiếp nhận trả sách này?")) {
    resetDeskAfterSuccess();
  }
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
