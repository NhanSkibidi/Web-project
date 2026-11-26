/**
 * ==============================================================================
 * FILE: loan_management.js
 * MÔ TẢ: Trang quản lý & duyệt yêu cầu mượn sách trực tuyến (Staff / Admin).
 *        Kết nối trực tiếp FastAPI & MySQL qua module `api` (`api.js`).
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. BIẾN TRẠNG THÁI TOÀN CỤC
// ------------------------------------------------------------------------------
var loanData = [];                 // Danh sách phiếu mượn đọc từ database
var reservationData = [];          // Danh sách đặt trước READY chờ nhận tại quầy
var isLoading = true;              // Trạng thái đang tải dữ liệu phiếu mượn
var loadError = null;              // Thông báo lỗi tải dữ liệu (nếu có)
var isLoadingReservations = false; // Trạng thái đang tải đặt trước
var reservationLoadError = null;   // Thông báo lỗi tải đặt trước
var currentStaffUser = null;       // Hồ sơ thủ thư / admin đang đăng nhập

var currentTab = "pending";        // Mặc định chọn tab "Chờ duyệt"
var currentStatusFilter = "pending";
var currentSearchKeyword = "";
var currentTimeFilter = "all";
var currentPage = 1;
var pageSize = 10;
var currentRejectLoanId = null;
var activeConfirmCallback = null;

var LOAN_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ duyệt (PENDING)" },
  { value: "approved", label: "Sẵn sàng nhận (APPROVED)" },
  { value: "borrowed", label: "Đang mượn (BORROWED)" },
  { value: "overdue", label: "Quá hạn (OVERDUE)" },
  { value: "returned", label: "Đã trả (RETURNED)" },
  { value: "rejected", label: "Đã từ chối / hủy" }
];

var RESERVATION_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "READY", label: "Sẵn sàng nhận (READY)" },
  { value: "WAITING", label: "Đang chờ xếp hàng (WAITING)" },
  { value: "FULFILLED", label: "Đã giao sách (FULFILLED)" },
  { value: "CANCELLED", label: "Đã hủy (CANCELLED)" },
  { value: "EXPIRED", label: "Hết hạn giữ chỗ (EXPIRED)" }
];

var RESERVATION_STATUS_META = {
  READY: {
    badgeClass: "badge-ready",
    badgeText: "Sẵn sàng nhận",
    modalSub: "Sẵn sàng giao tại quầy",
    copyFallback: "Chờ gán bản sao"
  },
  WAITING: {
    badgeClass: "badge-pending",
    badgeText: "Đang chờ",
    modalSub: "Đang xếp hàng chờ sách",
    copyFallback: "Chờ gán bản sao"
  },
  FULFILLED: {
    badgeClass: "badge-preparing",
    badgeText: "Đã giao sách",
    modalSub: "Đã hoàn tất giao sách",
    copyFallback: "Đã giao bản sao"
  },
  CANCELLED: {
    badgeClass: "badge-rejected",
    badgeText: "Đã hủy",
    modalSub: "Đơn đặt trước đã hủy",
    copyFallback: "Đã giải phóng bản sao"
  },
  EXPIRED: {
    badgeClass: "badge-overdue",
    badgeText: "Hết hạn giữ chỗ",
    modalSub: "Quá hạn giữ 48 giờ",
    copyFallback: "Đã chuyển lượt"
  }
};

function getReservationStatusInfo(res) {
  var st = String((res && res.status) || "WAITING").toUpperCase();
  var base = RESERVATION_STATUS_META[st] || RESERVATION_STATUS_META.WAITING;
  var qPos = String((res && res.queue_position) || "?");
  var badgeText = st === "WAITING" ? ("Đang chờ (#" + qPos + ")") : base.badgeText;
  var modalSub = st === "WAITING" ? ("Đang xếp hàng #" + qPos) : base.modalSub;
  return {
    status: st,
    badgeClass: base.badgeClass,
    badgeText: badgeText,
    modalSub: modalSub,
    copyFallback: base.copyFallback
  };
}

function renderStatusFilterOptions(mode, selectedValue) {
  var statusSelect = document.getElementById("filter-status");
  if (!statusSelect) return;
  var opts = mode === "reservations" ? RESERVATION_STATUS_OPTIONS : LOAN_STATUS_OPTIONS;
  statusSelect.disabled = false;
  statusSelect.innerHTML = opts.map(function (opt) {
    return '<option value="' + escapeHtml(opt.value) + '">' + escapeHtml(opt.label) + "</option>";
  }).join("");
  var validValues = opts.map(function (o) { return o.value; });
  statusSelect.value = validValues.indexOf(selectedValue) !== -1 ? selectedValue : "all";
}

// ------------------------------------------------------------------------------
// 2. HÀM TIỆN ÍCH ĐỊNH DẠNG & BÁO LỖI
// ------------------------------------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function extractApiError(err, fallback) {
  if (!err) return fallback || "Đã xảy ra lỗi không xác định.";
  if (err.data && typeof err.data.detail === "string" && err.data.detail) {
    return err.data.detail;
  }
  if (err.message) return err.message;
  return fallback || "Không thể kết nối tới máy chủ.";
}

function parseApiDate(value) {
  if (!value) return null;
  var d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateVN(value) {
  var d = parseApiDate(value);
  if (!d) return "—";
  var dd = String(d.getDate()).padStart(2, "0");
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var yyyy = d.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

function formatDateTimeVN(value) {
  var d = parseApiDate(value);
  if (!d) return "—";
  var hh = String(d.getHours()).padStart(2, "0");
  var min = String(d.getMinutes()).padStart(2, "0");
  return hh + ":" + min + " • " + formatDateVN(d);
}

function formatCurrencyVN(amount) {
  var num = Number(amount) || 0;
  return num.toLocaleString("vi-VN") + "đ";
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  var due = parseApiDate(dateStr);
  if (!due) return false;
  due.setHours(0, 0, 0, 0);
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function formatCardStatusLabel(status) {
  if (!status) return "Chưa cấp thẻ";
  var s = String(status).toUpperCase();
  if (s === "ACTIVE") return "Đang hoạt động";
  if (s === "LOCKED") return "Đang bị khóa";
  if (s === "EXPIRED") return "Đã hết hạn";
  return status;
}

// ------------------------------------------------------------------------------
// 3. CHUẨN HÓA DỮ LIỆU TỪ API SANG VIEW MODEL
// ------------------------------------------------------------------------------
function mapApiLoanToView(raw) {
  var items = Array.isArray(raw.loan_items) ? raw.loan_items : [];
  var rawStatus = String(raw.status || "PENDING").toUpperCase();

  var hasOverdueItem = items.some(function (it) {
    return !it.return_date && (Boolean(it.is_overdue) || isPastDate(it.due_date));
  });
  var isOverdue = rawStatus === "BORROWED" && (hasOverdueItem || isPastDate(raw.due_date));

  var maxOverdueDays = items.reduce(function (maxDays, it) {
    return Math.max(maxDays, Number(it.overdue_days || 0));
  }, 0);
  var totalEstimatedFine = items.reduce(function (sum, it) {
    return sum + Number(it.estimated_fine || 0);
  }, 0);

  var trangThai = "Chờ duyệt";
  if (rawStatus === "PENDING") trangThai = "Chờ duyệt";
  else if (rawStatus === "APPROVED") trangThai = "Sẵn sàng nhận";
  else if (rawStatus === "BORROWED") trangThai = isOverdue ? "Quá hạn" : "Đang mượn";
  else if (rawStatus === "RETURNED") trangThai = "Đã trả";
  else if (rawStatus === "REJECTED") trangThai = "Đã từ chối";
  else if (rawStatus === "CANCELLED") trangThai = "Đã hủy";

  var henNhan = "—";
  var hanNhan = "—";

  if (rawStatus === "PENDING") {
    henNhan = "Gửi " + formatDateVN(raw.created_at);
    hanNhan = "Chờ thủ thư duyệt";
  } else if (rawStatus === "APPROVED") {
    henNhan = "Chờ nhận tại quầy";
    hanNhan = "Đã duyệt · sẵn sàng bàn giao";
  } else if (rawStatus === "BORROWED" && isOverdue) {
    henNhan = "Quá hạn" + (maxOverdueDays > 0 ? " " + maxOverdueDays + " ngày" : "");
    hanNhan = "Hạn trả: " + formatDateVN(raw.due_date) +
      (totalEstimatedFine > 0 ? " · Phạt ~" + formatCurrencyVN(totalEstimatedFine) : "");
  } else if (rawStatus === "BORROWED") {
    henNhan = raw.borrowed_at ? ("Nhận " + formatDateVN(raw.borrowed_at)) : "Đang lưu thông";
    hanNhan = "Hạn trả: " + formatDateVN(raw.due_date);
  } else if (rawStatus === "RETURNED") {
    henNhan = "Đã hoàn trả";
    hanNhan = raw.due_date ? ("Hạn cũ: " + formatDateVN(raw.due_date)) : "Hoàn tất";
  } else if (rawStatus === "REJECTED") {
    henNhan = "Đã từ chối";
    hanNhan = raw.reject_reason ? raw.reject_reason : "Không đủ điều kiện";
  } else if (rawStatus === "CANCELLED") {
    henNhan = "Độc giả tự hủy";
    hanNhan = "Phiếu đã đóng";
  }

  var mappedBooks = items.map(function (it) {
    var copyStatus = String(it.copy_status || "").toUpperCase();
    var hasCopyCode = Boolean(it.copy_code);
    var availableForFulfill = hasCopyCode && (copyStatus === "AVAILABLE" || copyStatus === "RESERVED");

    return {
      id: it.id,
      bookIsbn: it.book_isbn || "",
      ten: it.book_title || it.book_isbn || "Chưa rõ tên sách",
      tacGia: it.author_name || "",
      copyId: it.copy_id,
      copyCode: it.copy_code || "",
      copyStatus: copyStatus,
      maBanSao: it.copy_code || "Chưa gán bản sao",
      viTri: it.shelf_location || "Chưa cập nhật kệ",
      khaDung: availableForFulfill,
      renewalCount: Number(it.renewal_count || 0),
      dueDate: it.due_date || null,
      isOverdue: !it.return_date && (Boolean(it.is_overdue) || isPastDate(it.due_date)),
      returnDate: it.return_date || null,
      hasWaitingReservation: Boolean(it.has_waiting_reservation)
    };
  });

  var maxRenewal = items.reduce(function (m, it) {
    return Math.max(m, Number(it.renewal_count || 0));
  }, 0);
  var hasWaitingReservation = items.some(function (it) {
    return !it.return_date && Boolean(it.has_waiting_reservation);
  });

  var readerName = raw.reader_name || ("Độc giả #" + raw.user_id);

  return {
    id: raw.id,
    maPhieu: raw.code || ("PM-" + raw.id),
    userId: raw.user_id,
    rawStatus: rawStatus,
    trangThai: trangThai,
    createdAt: raw.created_at,
    borrowedAt: raw.borrowed_at,
    ngayHenTra: raw.due_date || null,
    gioTao: formatDateTimeVN(raw.created_at),
    henNhan: henNhan,
    hanNhan: hanNhan,
    docGia: {
      ten: readerName,
      email: raw.reader_email || "Chưa cập nhật",
      sdt: raw.reader_phone || "Chưa cập nhật",
      cardCode: raw.card_code || ("#" + raw.user_id),
      cardStatus: raw.card_status || null,
      soSachDangGiu: Number(raw.reader_holding_count || 0),
      gioiHanSach: Number(raw.reader_max_borrow || 5)
    },
    sach: mappedBooks,
    soLanGiaHan: maxRenewal,
    coNguoiDatTruoc: hasWaitingReservation,
    daQuaHan: isOverdue,
    lyDoTuChoi: raw.reject_reason || ""
  };
}

// ------------------------------------------------------------------------------
// 4. TẢI DỮ LIỆU TỪ DATABASE
// ------------------------------------------------------------------------------
async function loadLoansFromDatabase(showSuccessToast) {
  isLoading = true;
  loadError = null;
  if (currentTab !== "reservations") renderLoanTable();

  try {
    var rows = await api.get("/loans", { borrow_type: "ONLINE", limit: 200 });
    var list = Array.isArray(rows) ? rows : [];
    loanData = list.map(mapApiLoanToView);
    isLoading = false;
    loadError = null;

    updateCountsAndStats();
    if (currentTab !== "reservations") renderLoanTable();

    if (showSuccessToast) {
      showToast("success", "Cập nhật thành công!", "Đã đồng bộ " + loanData.length + " phiếu mượn trực tuyến từ hệ thống.");
    }
  } catch (err) {
    isLoading = false;
    loadError = extractApiError(err, "Không thể tải danh sách phiếu mượn từ cơ sở dữ liệu.");
    updateCountsAndStats();
    if (currentTab !== "reservations") renderLoanTable();
    showToast("error", "Lỗi tải dữ liệu", loadError);
  }
}

async function loadReservationsFromDatabase(showSuccessToast) {
  isLoadingReservations = true;
  reservationLoadError = null;
  if (currentTab === "reservations") renderLoanTable();

  try {
    var rows = await api.get("/reservations/staff/active", { include_history: true });
    reservationData = Array.isArray(rows) ? rows : [];
    isLoadingReservations = false;
    reservationLoadError = null;

    updateCountsAndStats();
    if (currentTab === "reservations") renderLoanTable();

    if (showSuccessToast) {
      showToast("success", "Cập nhật thành công!", "Đã đồng bộ " + reservationData.length + " đơn đặt trước từ hệ thống.");
    }
  } catch (err) {
    isLoadingReservations = false;
    reservationLoadError = extractApiError(err, "Không thể tải danh sách đặt trước từ cơ sở dữ liệu.");
    updateCountsAndStats();
    if (currentTab === "reservations") renderLoanTable();
    if (showSuccessToast) {
      showToast("error", "Lỗi tải đặt trước", reservationLoadError);
    }
  }
}

// ------------------------------------------------------------------------------
// 5. HÀM THÔNG BÁO TOAST NỔI (TOAST NOTIFICATIONS)
// ------------------------------------------------------------------------------
function showToast(type, title, message) {
  var container = document.getElementById("toast-container");
  if (!container) return;

  var toast = document.createElement("div");
  toast.className = "toast-item toast-" + type;

  var iconName = "info";
  if (type === "success") iconName = "check_circle";
  if (type === "error") iconName = "error";
  if (type === "warning") iconName = "warning";

  toast.innerHTML =
    '<div class="toast-icon-wrap">' +
    '<span class="material-symbols-outlined">' + iconName + '</span>' +
    '</div>' +
    '<div class="toast-content">' +
    '<div class="toast-title">' + escapeHtml(title) + '</div>' +
    '<div class="toast-msg">' + escapeHtml(message) + '</div>' +
    '</div>' +
    '<button type="button" class="toast-close-btn" title="Đóng">' +
    '<span class="material-symbols-outlined" style="font-size: 16px;">close</span>' +
    '</button>';

  container.appendChild(toast);

  var closeBtn = toast.querySelector(".toast-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      removeToast(toast);
    });
  }

  setTimeout(function () {
    removeToast(toast);
  }, 4500);
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add("toast-leave");
  setTimeout(function () {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 250);
}

// ------------------------------------------------------------------------------
// 6. HỘP THOẠI XÁC NHẬN CHUNG (showConfirm)
// ------------------------------------------------------------------------------
function showConfirm(options) {
  var modal = document.getElementById("confirm-modal");
  var titleEl = document.getElementById("confirm-title");
  var msgEl = document.getElementById("confirm-message");
  var iconBox = document.getElementById("confirm-icon-box");
  var iconEl = document.getElementById("confirm-icon");
  var btnProceed = document.getElementById("btn-confirm-proceed");
  var btnCancel = document.getElementById("btn-confirm-cancel");

  if (!modal) return;

  titleEl.textContent = options.title || "Xác nhận";
  msgEl.textContent = options.message || "Bạn có chắc chắn muốn thực hiện thao tác này?";

  iconBox.className = "confirm-icon-circle";
  btnProceed.className = "btn-confirm-proceed";

  if (options.type === "red") {
    iconBox.classList.add("icon-red");
    btnProceed.classList.add("btn-danger");
    iconEl.textContent = "warning";
  } else if (options.type === "green") {
    iconBox.classList.add("icon-green");
    iconEl.textContent = "check_circle";
  } else {
    iconBox.classList.add("icon-blue");
    iconEl.textContent = "help_outline";
  }

  btnProceed.textContent = options.confirmText || "Xác nhận";
  btnCancel.textContent = options.cancelText || "Hủy";

  activeConfirmCallback = options.onConfirm || null;
  modal.classList.add("active");
}

function closeConfirmModal() {
  var modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.remove("active");
  activeConfirmCallback = null;
}

// ------------------------------------------------------------------------------
// 7. CẬP NHẬT SỐ LIỆU 4 THẺ THỐNG KÊ & BADGE TRÊN CÁC TAB
// ------------------------------------------------------------------------------
function updateCountsAndStats() {
  var countPending = 0;
  var countReady = 0;
  var countBorrowed = 0;
  var countOverdue = 0;
  var countRejected = 0;

  loanData.forEach(function (loan) {
    if (loan.trangThai === "Chờ duyệt") countPending++;
    else if (loan.trangThai === "Sẵn sàng nhận") countReady++;
    else if (loan.trangThai === "Đang mượn") countBorrowed++;
    else if (loan.trangThai === "Quá hạn") countOverdue++;
    else if (loan.trangThai === "Đã từ chối" || loan.trangThai === "Đã hủy") countRejected++;
  });

  var countAll = loanData.length;

  var elPending = document.getElementById("stat-count-pending");
  var elPreparing = document.getElementById("stat-count-preparing");
  var elReady = document.getElementById("stat-count-ready");
  var elRejected = document.getElementById("stat-count-rejected");

  if (elPending) elPending.textContent = countPending;
  if (elPreparing) elPreparing.textContent = countBorrowed + countOverdue;
  if (elReady) elReady.textContent = countReady;
  if (elRejected) elRejected.textContent = countRejected;

  var tabAll = document.getElementById("count-tab-all");
  var tabPen = document.getElementById("count-tab-pending");
  var tabRdy = document.getElementById("count-tab-ready");
  var tabBor = document.getElementById("count-tab-borrowed");
  var tabOver = document.getElementById("count-tab-overdue");
  var tabRej = document.getElementById("count-tab-rejected");
  var tabRes = document.getElementById("count-tab-reservations");

  var activeResCount = reservationData.filter(function (r) {
    var st = String(r.status || "").toUpperCase();
    return st === "READY" || st === "WAITING";
  }).length;

  if (tabAll) tabAll.textContent = countAll;
  if (tabPen) tabPen.textContent = countPending;
  if (tabRdy) tabRdy.textContent = countReady;
  if (tabBor) tabBor.textContent = countBorrowed;
  if (tabOver) tabOver.textContent = countOverdue;
  if (tabRej) tabRej.textContent = countRejected;
  if (tabRes) tabRes.textContent = activeResCount;
}

// ------------------------------------------------------------------------------
// 8. BỘ LỌC DỮ LIỆU BẢNG (TAB + TRẠNG THÁI + TỪ KHÓA + THỜI GIAN)
// ------------------------------------------------------------------------------
function matchesStatusKey(loan, filterKey) {
  if (!filterKey || filterKey === "all") return true;
  if (filterKey === "pending") return loan.trangThai === "Chờ duyệt";
  if (filterKey === "approved" || filterKey === "ready") return loan.trangThai === "Sẵn sàng nhận";
  if (filterKey === "borrowed") return loan.trangThai === "Đang mượn";
  if (filterKey === "overdue") return loan.trangThai === "Quá hạn";
  if (filterKey === "returned") return loan.trangThai === "Đã trả";
  if (filterKey === "rejected") return loan.trangThai === "Đã từ chối" || loan.trangThai === "Đã hủy";
  return true;
}

function getFilteredLoans() {
  var todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return loanData.filter(function (loan) {
    var activeFilter = currentStatusFilter !== "all" ? currentStatusFilter : currentTab;
    if (!matchesStatusKey(loan, activeFilter)) return false;

    if (currentSearchKeyword.trim() !== "") {
      var kw = currentSearchKeyword.trim().toLowerCase();
      var maPhieuMatch = loan.maPhieu.toLowerCase().indexOf(kw) !== -1;
      var tenMatch = loan.docGia.ten.toLowerCase().indexOf(kw) !== -1;
      var cardMatch = loan.docGia.cardCode.toLowerCase().indexOf(kw) !== -1;
      var bookMatch = loan.sach.some(function (b) {
        return b.ten.toLowerCase().indexOf(kw) !== -1 || b.maBanSao.toLowerCase().indexOf(kw) !== -1;
      });
      if (!maPhieuMatch && !tenMatch && !cardMatch && !bookMatch) return false;
    }

    if (currentTimeFilter !== "all") {
      var createdDate = parseApiDate(loan.createdAt);
      if (!createdDate) return false;
      var createdDay = new Date(createdDate.getTime());
      createdDay.setHours(0, 0, 0, 0);
      var diffDays = Math.floor((todayStart.getTime() - createdDay.getTime()) / 86400000);

      if (currentTimeFilter === "today" && diffDays !== 0) return false;
      if (currentTimeFilter === "3days" && (diffDays < 0 || diffDays > 2)) return false;
      if (currentTimeFilter === "7days" && (diffDays < 0 || diffDays > 6)) return false;
    }

    return true;
  });
}

// ------------------------------------------------------------------------------
// 9. RENDER BẢNG DỮ LIỆU & PHÂN TRANG
// ------------------------------------------------------------------------------
function getStatusBadgeClass(loan) {
  if (loan.trangThai === "Chờ duyệt") return "badge-pending";
  if (loan.trangThai === "Sẵn sàng nhận") return "badge-ready";
  if (loan.trangThai === "Đang mượn") return "badge-borrowed";
  if (loan.trangThai === "Quá hạn") return "badge-overdue";
  if (loan.trangThai === "Đã trả") return "badge-preparing";
  return "badge-rejected";
}

function getFilteredReservations() {
  var todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return reservationData.filter(function (res) {
    if (currentStatusFilter && currentStatusFilter !== "all") {
      if (String(res.status || "").toUpperCase() !== String(currentStatusFilter).toUpperCase()) {
        return false;
      }
    }

    if (currentSearchKeyword.trim() !== "") {
      var kw = currentSearchKeyword.trim().toLowerCase();
      var code = ("dt-" + String(res.id).padStart(4, "0")).toLowerCase();
      var codeMatch = code.indexOf(kw) !== -1;
      var nameMatch = String(res.user_name || "").toLowerCase().indexOf(kw) !== -1;
      var emailMatch = String(res.user_email || "").toLowerCase().indexOf(kw) !== -1;
      var titleMatch = String(res.book_title || "").toLowerCase().indexOf(kw) !== -1;
      var copyMatch = String(res.copy_code || "").toLowerCase().indexOf(kw) !== -1;
      var isbnMatch = String(res.book_isbn || "").toLowerCase().indexOf(kw) !== -1;
      if (!codeMatch && !nameMatch && !emailMatch && !titleMatch && !copyMatch && !isbnMatch) return false;
    }

    if (currentTimeFilter !== "all") {
      var resDate = parseApiDate(res.reserved_at);
      if (!resDate) return false;
      var resDay = new Date(resDate.getTime());
      resDay.setHours(0, 0, 0, 0);
      var diffDays = Math.floor((todayStart.getTime() - resDay.getTime()) / 86400000);

      if (currentTimeFilter === "today" && diffDays !== 0) return false;
      if (currentTimeFilter === "3days" && (diffDays < 0 || diffDays > 2)) return false;
      if (currentTimeFilter === "7days" && (diffDays < 0 || diffDays > 6)) return false;
    }

    return true;
  });
}

function renderReservationTable(tbody) {
  if (isLoadingReservations) {
    updateTableHeaderTitle(0);
    tbody.innerHTML =
      '<tr><td colspan="6" class="table-empty-row">' +
      '<span class="material-symbols-outlined" style="font-size: 32px; display:block; margin-bottom: 8px; opacity: 0.6;">hourglass_empty</span>' +
      'Đang tải danh sách đặt trước sẵn sàng nhận...' +
      '</td></tr>';
    renderPagination(0, 1, 0, 0);
    return;
  }

  if (reservationLoadError) {
    updateTableHeaderTitle(0);
    tbody.innerHTML =
      '<tr><td colspan="6" class="table-empty-row">' +
      '<span class="material-symbols-outlined" style="font-size: 32px; display:block; margin-bottom: 8px; color: var(--color-danger);">cloud_off</span>' +
      '<div>' + escapeHtml(reservationLoadError) + '</div>' +
      '<button type="button" class="btn-table-action" id="btn-retry-res-load" style="margin: 12px auto 0;">' +
      '<span class="material-symbols-outlined">refresh</span><span>Thử lại</span>' +
      '</button>' +
      '</td></tr>';
    var retryResBtn = document.getElementById("btn-retry-res-load");
    if (retryResBtn) {
      retryResBtn.addEventListener("click", function () {
        loadReservationsFromDatabase(true);
      });
    }
    renderPagination(0, 1, 0, 0);
    return;
  }

  var filteredList = getFilteredReservations();
  var totalItems = filteredList.length;

  var totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  var startIndex = (currentPage - 1) * pageSize;
  var endIndex = Math.min(startIndex + pageSize, totalItems);
  var pageItems = filteredList.slice(startIndex, endIndex);

  updateTableHeaderTitle(totalItems);
  tbody.innerHTML = "";

  if (pageItems.length === 0) {
    var hasResFilter = currentStatusFilter !== "all" || currentSearchKeyword.trim() !== "" || currentTimeFilter !== "all";
    var trEmpty = document.createElement("tr");
    trEmpty.innerHTML =
      '<td colspan="6" class="table-empty-row">' +
      '<span class="material-symbols-outlined" style="font-size: 32px; display:block; margin-bottom: 8px; opacity: 0.5;">bookmark_remove</span>' +
      (hasResFilter ? "Không tìm thấy đơn đặt trước nào phù hợp với bộ lọc." : "Chưa có đơn đặt trước nào trong hệ thống.") +
      '</td>';
    tbody.appendChild(trEmpty);
  } else {
    pageItems.forEach(function (res) {
      var tr = document.createElement("tr");
      var resCode = "DT-" + String(res.id).padStart(4, "0");
      var initialLetter = res.user_name ? res.user_name.trim().charAt(0).toUpperCase() : "U";
      var info = getReservationStatusInfo(res);
      var st = info.status;

      var tdCode = document.createElement("td");
      tdCode.innerHTML =
        '<div class="loan-code-cell">' +
        '<span class="loan-code-text font-mono">' + escapeHtml(resCode) + '</span>' +
        '<span class="loan-time-sub">Đặt ' + escapeHtml(formatDateTimeVN(res.reserved_at)) + '</span>' +
        '</div>';
      tr.appendChild(tdCode);

      var tdReader = document.createElement("td");
      tdReader.innerHTML =
        '<div class="reader-cell">' +
        '<div class="reader-avatar-circle">' + escapeHtml(initialLetter) + '</div>' +
        '<div class="reader-meta-wrap">' +
        '<span class="reader-name-text">' + escapeHtml(res.user_name || ("Độc giả #" + res.user_id)) + '</span>' +
        '<span class="reader-mssv-text">' + escapeHtml(res.user_email || ("ID #" + res.user_id)) + '</span>' +
        '</div>' +
        '</div>';
      tr.appendChild(tdReader);

      var tdDeadline = document.createElement("td");
      if (st === "READY") {
        tdDeadline.innerHTML =
          '<div class="appointment-cell">' +
          '<span class="appointment-time-main"><span class="material-symbols-outlined">event_available</span> Hạn lấy: ' + escapeHtml(formatDateVN(res.pickup_deadline)) + '</span>' +
          '<span class="appointment-due-sub">Kệ: ' + escapeHtml(res.shelf_location || "Quầy thủ thư") + '</span>' +
          '</div>';
      } else if (st === "WAITING") {
        tdDeadline.innerHTML =
          '<div class="appointment-cell">' +
          '<span class="appointment-time-main"><span class="material-symbols-outlined">hourglass_top</span> Xếp hàng #' + escapeHtml(String(res.queue_position || "?")) + '</span>' +
          '<span class="appointment-due-sub">Đang chờ sách trả về kho</span>' +
          '</div>';
      } else if (st === "FULFILLED") {
        tdDeadline.innerHTML =
          '<div class="appointment-cell">' +
          '<span class="appointment-time-main"><span class="material-symbols-outlined">task_alt</span> Đã bàn giao sách</span>' +
          '<span class="appointment-due-sub">Kệ: ' + escapeHtml(res.shelf_location || "Hoàn tất tại quầy") + '</span>' +
          '</div>';
      } else if (st === "EXPIRED") {
        tdDeadline.innerHTML =
          '<div class="appointment-cell">' +
          '<span class="overdue-alert-tag"><span class="material-symbols-outlined" style="font-size: 15px;">event_busy</span> Quá hạn giữ 48h</span>' +
          '<span class="appointment-due-sub">' + (res.pickup_deadline ? ("Hạn cũ: " + escapeHtml(formatDateVN(res.pickup_deadline))) : "Đã chuyển lượt") + '</span>' +
          '</div>';
      } else {
        tdDeadline.innerHTML =
          '<div class="appointment-cell">' +
          '<span class="appointment-time-main"><span class="material-symbols-outlined">cancel</span> Đã hủy giữ chỗ</span>' +
          '<span class="appointment-due-sub">Đơn đặt trước đã đóng</span>' +
          '</div>';
      }
      tr.appendChild(tdDeadline);

      var tdBook = document.createElement("td");
      tdBook.innerHTML =
        '<div class="books-summary-cell">' +
        '<span class="book-count-badge">' + escapeHtml(res.copy_code || info.copyFallback) + '</span>' +
        '<span class="book-title-ellipsis" title="' + escapeHtml(res.book_title || "") + '">' + escapeHtml(res.book_title || res.book_isbn) + '</span>' +
        '</div>';
      tr.appendChild(tdBook);

      var tdStatus = document.createElement("td");
      tdStatus.style.textAlign = "center";
      tdStatus.innerHTML = '<span class="badge ' + info.badgeClass + '">' + escapeHtml(info.badgeText) + '</span>';
      tr.appendChild(tdStatus);

      var tdActions = document.createElement("td");
      tdActions.style.textAlign = "center";
      var actionsWrap = document.createElement("div");
      actionsWrap.className = "action-buttons-cell";

      var btnDetail = document.createElement("button");
      btnDetail.type = "button";
      btnDetail.className = "btn-table-action";
      btnDetail.innerHTML = '<span class="material-symbols-outlined">visibility</span><span>Chi tiết</span>';
      btnDetail.addEventListener("click", function () {
        openReservationDetailModal(res.id);
      });
      actionsWrap.appendChild(btnDetail);

      if (st === "READY") {
        var btnNotifyEmail = document.createElement("button");
        btnNotifyEmail.type = "button";
        btnNotifyEmail.className = "btn-icon-renew";
        btnNotifyEmail.title = "Gửi email thông báo sách đặt trước đã sẵn sàng";
        btnNotifyEmail.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">mail</span>';
        btnNotifyEmail.addEventListener("click", function () {
          notifyReservationReadyEmail(res.id);
        });
        actionsWrap.appendChild(btnNotifyEmail);

        var btnFulfill = document.createElement("button");
        btnFulfill.type = "button";
        btnFulfill.className = "btn-icon-handover";
        btnFulfill.title = "Xác nhận đã giao sách đặt trước";
        btnFulfill.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">output</span>';
        btnFulfill.addEventListener("click", function () {
          confirmFulfillReservation(res.id);
        });
        actionsWrap.appendChild(btnFulfill);
      }

      if (st === "READY" || st === "WAITING") {
        var btnCancelRes = document.createElement("button");
        btnCancelRes.type = "button";
        btnCancelRes.className = "btn-icon-reject";
        btnCancelRes.title = "Hủy giữ chỗ đặt trước";
        btnCancelRes.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">close</span>';
        btnCancelRes.addEventListener("click", function () {
          confirmCancelReservation(res.id);
        });
        actionsWrap.appendChild(btnCancelRes);
      }

      tdActions.appendChild(actionsWrap);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  renderPagination(totalItems, totalPages, startIndex, endIndex);
}

function renderLoanTable() {
  var tbody = document.getElementById("loan-table-body");
  if (!tbody) return;

  var checkExpBtn = document.getElementById("btn-check-expired-res");
  var sortIcon = document.getElementById("table-sort-icon");
  var sortText = document.getElementById("table-sort-text");
  if (currentTab === "reservations") {
    if (checkExpBtn) checkExpBtn.style.display = "inline-flex";
    if (sortIcon) sortIcon.style.display = "none";
    if (sortText) sortText.style.display = "none";
    renderReservationTable(tbody);
    return;
  } else {
    if (checkExpBtn) checkExpBtn.style.display = "none";
    if (sortIcon) sortIcon.style.display = "";
    if (sortText) sortText.style.display = "";
  }

  if (isLoading) {
    updateTableHeaderTitle(0);
    tbody.innerHTML =
      '<tr><td colspan="6" class="table-empty-row">' +
      '<span class="material-symbols-outlined" style="font-size: 32px; display:block; margin-bottom: 8px; opacity: 0.6;">hourglass_empty</span>' +
      'Đang tải danh sách phiếu mượn từ cơ sở dữ liệu...' +
      '</td></tr>';
    renderPagination(0, 1, 0, 0);
    return;
  }

  if (loadError) {
    updateTableHeaderTitle(0);
    tbody.innerHTML =
      '<tr><td colspan="6" class="table-empty-row">' +
      '<span class="material-symbols-outlined" style="font-size: 32px; display:block; margin-bottom: 8px; color: var(--color-danger);">cloud_off</span>' +
      '<div>' + escapeHtml(loadError) + '</div>' +
      '<button type="button" class="btn-table-action" id="btn-retry-load" style="margin: 12px auto 0;">' +
      '<span class="material-symbols-outlined">refresh</span><span>Thử lại</span>' +
      '</button>' +
      '</td></tr>';
    var retryBtn = document.getElementById("btn-retry-load");
    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        loadLoansFromDatabase(true);
      });
    }
    renderPagination(0, 1, 0, 0);
    return;
  }

  var filteredList = getFilteredLoans();
  var totalItems = filteredList.length;

  var totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  var startIndex = (currentPage - 1) * pageSize;
  var endIndex = Math.min(startIndex + pageSize, totalItems);
  var pageItems = filteredList.slice(startIndex, endIndex);

  updateTableHeaderTitle(totalItems);
  tbody.innerHTML = "";

  if (pageItems.length === 0) {
    var trEmpty = document.createElement("tr");
    trEmpty.innerHTML =
      '<td colspan="6" class="table-empty-row">' +
      '<span class="material-symbols-outlined" style="font-size: 32px; display:block; margin-bottom: 8px; opacity: 0.5;">search_off</span>' +
      'Không tìm thấy yêu cầu phù hợp.' +
      '</td>';
    tbody.appendChild(trEmpty);
  } else {
    pageItems.forEach(function (loan) {
      var tr = document.createElement("tr");
      if (loan.trangThai === "Quá hạn") {
        tr.className = "row-overdue";
      }

      // 1. Mã phiếu
      var tdMaPhieu = document.createElement("td");
      tdMaPhieu.innerHTML =
        '<div class="loan-code-cell">' +
        '<span class="loan-code-text font-mono">' + escapeHtml(loan.maPhieu) + '</span>' +
        '<span class="loan-time-sub">' + escapeHtml(loan.gioTao) + '</span>' +
        '</div>';
      tr.appendChild(tdMaPhieu);

      // 2. Độc giả
      var tdDocGia = document.createElement("td");
      var initialLetter = loan.docGia.ten ? loan.docGia.ten.trim().charAt(0).toUpperCase() : "U";
      tdDocGia.innerHTML =
        '<div class="reader-cell">' +
        '<div class="reader-avatar-circle">' + escapeHtml(initialLetter) + '</div>' +
        '<div class="reader-meta-wrap">' +
        '<span class="reader-name-text">' + escapeHtml(loan.docGia.ten) + '</span>' +
        '<span class="reader-mssv-text">Mã thẻ: ' + escapeHtml(loan.docGia.cardCode) + '</span>' +
        '</div>' +
        '</div>';
      tr.appendChild(tdDocGia);

      // 3. Thời gian / Hạn trả
      var tdHenNhan = document.createElement("td");
      if (loan.trangThai === "Quá hạn") {
        tdHenNhan.innerHTML =
          '<div class="appointment-cell">' +
          '<span class="overdue-alert-tag"><span class="material-symbols-outlined" style="font-size: 15px;">warning</span> ' + escapeHtml(loan.henNhan) + '</span>' +
          '<span class="appointment-due-sub font-mono">' + escapeHtml(loan.hanNhan) + '</span>' +
          '</div>';
      } else if (loan.trangThai === "Đã từ chối" || loan.trangThai === "Đã hủy") {
        tdHenNhan.innerHTML =
          '<div class="appointment-cell">' +
          '<span class="overdue-alert-tag"><span class="material-symbols-outlined" style="font-size: 15px;">event_busy</span> ' + escapeHtml(loan.henNhan) + '</span>' +
          '<span class="appointment-due-sub" title="' + escapeHtml(loan.hanNhan) + '">' + escapeHtml(loan.hanNhan) + '</span>' +
          '</div>';
      } else {
        tdHenNhan.innerHTML =
          '<div class="appointment-cell">' +
          '<span class="appointment-time-main"><span class="material-symbols-outlined">schedule</span> ' + escapeHtml(loan.henNhan) + '</span>' +
          '<span class="appointment-due-sub">' + escapeHtml(loan.hanNhan) + '</span>' +
          '</div>';
      }
      tr.appendChild(tdHenNhan);

      // 4. Ấn phẩm yêu cầu
      var tdSach = document.createElement("td");
      var bookCount = loan.sach.length;
      var firstBookTitle = loan.sach[0] ? loan.sach[0].ten : "Chưa có ấn phẩm";
      tdSach.innerHTML =
        '<div class="books-summary-cell">' +
        '<span class="book-count-badge">' + bookCount + ' cuốn</span>' +
        '<span class="book-title-ellipsis" title="' + escapeHtml(firstBookTitle) + '">' + escapeHtml(firstBookTitle) + '</span>' +
        '</div>';
      tr.appendChild(tdSach);

      // 5. Trạng thái
      var tdTrangThai = document.createElement("td");
      tdTrangThai.style.textAlign = "center";
      tdTrangThai.innerHTML = '<span class="badge ' + getStatusBadgeClass(loan) + '">' + escapeHtml(loan.trangThai) + '</span>';
      tr.appendChild(tdTrangThai);

      // 6. Thao tác
      var tdThaoTac = document.createElement("td");
      tdThaoTac.style.textAlign = "center";
      var actionsWrap = document.createElement("div");
      actionsWrap.className = "action-buttons-cell";

      var btnDetail = document.createElement("button");
      btnDetail.type = "button";
      btnDetail.className = "btn-table-action";
      btnDetail.innerHTML = '<span class="material-symbols-outlined">visibility</span><span>Chi tiết</span>';
      btnDetail.addEventListener("click", function () {
        openDetailModal(loan.id);
      });
      actionsWrap.appendChild(btnDetail);

      if (loan.trangThai === "Chờ duyệt") {
        var btnApprove = document.createElement("button");
        btnApprove.type = "button";
        btnApprove.className = "btn-icon-approve";
        btnApprove.title = "Duyệt yêu cầu";
        btnApprove.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">check</span>';
        btnApprove.addEventListener("click", function () {
          confirmApproveLoan(loan.id);
        });
        actionsWrap.appendChild(btnApprove);

        var btnReject = document.createElement("button");
        btnReject.type = "button";
        btnReject.className = "btn-icon-reject";
        btnReject.title = "Từ chối yêu cầu";
        btnReject.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">close</span>';
        btnReject.addEventListener("click", function () {
          openRejectModal(loan.id);
        });
        actionsWrap.appendChild(btnReject);
      } else if (loan.trangThai === "Sẵn sàng nhận") {
        var btnHandover = document.createElement("button");
        btnHandover.type = "button";
        btnHandover.className = "btn-icon-handover";
        btnHandover.title = "Xác nhận giao sách";
        btnHandover.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">output</span>';
        btnHandover.addEventListener("click", function () {
          confirmHandoverLoan(loan.id);
        });
        actionsWrap.appendChild(btnHandover);
      } else if (loan.trangThai === "Đang mượn") {
        var btnRenew = document.createElement("button");
        btnRenew.type = "button";
        btnRenew.className = "btn-icon-renew";
        if (loan.soLanGiaHan >= 1) {
          btnRenew.classList.add("disabled");
          btnRenew.title = "Đã gia hạn tối đa 1/1 lần";
        } else if (loan.coNguoiDatTruoc) {
          btnRenew.classList.add("disabled");
          btnRenew.title = "Đầu sách có người đặt trước, không thể gia hạn";
        } else {
          btnRenew.title = "Gia hạn thêm 7 ngày (thủ thư gia hạn hộ)";
        }
        btnRenew.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">autorenew</span>';
        btnRenew.addEventListener("click", function () {
          confirmRenewLoan(loan.id);
        });
        actionsWrap.appendChild(btnRenew);
      }

      tdThaoTac.appendChild(actionsWrap);
      tr.appendChild(tdThaoTac);

      tbody.appendChild(tr);
    });
  }

  renderPagination(totalItems, totalPages, startIndex, endIndex);
}

// ------------------------------------------------------------------------------
// 10. TIÊU ĐỀ BẢNG & PHÂN TRANG
// ------------------------------------------------------------------------------
function updateTableHeaderTitle(totalItems) {
  var titleEl = document.getElementById("table-title-text");
  var badgeEl = document.getElementById("table-count-badge");
  if (!titleEl || !badgeEl) return;

  var activeFilter = currentTab === "reservations"
    ? "reservations"
    : (currentStatusFilter !== "all" ? currentStatusFilter : currentTab);
  if (activeFilter === "reservations") {
    var readyCnt = reservationData.filter(function (r) { return String(r.status || "").toUpperCase() === "READY"; }).length;
    var waitingCnt = reservationData.filter(function (r) { return String(r.status || "").toUpperCase() === "WAITING"; }).length;
    var historyCnt = reservationData.length - readyCnt - waitingCnt;
    titleEl.textContent = "Quản lý đặt trước sách (5 trạng thái)";
    if (totalItems === 0) {
      badgeEl.textContent = "0 đơn";
    } else if (currentStatusFilter !== "all") {
      badgeEl.textContent = totalItems + " đơn (" + currentStatusFilter + ")";
    } else {
      badgeEl.textContent = readyCnt + " sẵn sàng · " + waitingCnt + " xếp hàng" +
        (historyCnt > 0 ? (" · " + historyCnt + " lịch sử") : "");
    }
  } else if (activeFilter === "pending") {
    titleEl.textContent = "Phiếu đặt mượn trực tuyến chờ duyệt";
    badgeEl.textContent = totalItems + " chờ xử lý";
  } else if (activeFilter === "ready" || activeFilter === "approved") {
    titleEl.textContent = "Sách đã duyệt sẵn sàng chờ độc giả nhận";
    badgeEl.textContent = totalItems + " đơn chờ nhận";
  } else if (activeFilter === "borrowed") {
    titleEl.textContent = "Phiếu sách độc giả đang mượn lưu hành";
    badgeEl.textContent = totalItems + " đang mượn";
  } else if (activeFilter === "overdue") {
    titleEl.textContent = "Danh sách phiếu mượn quá hạn";
    badgeEl.textContent = totalItems + " đơn quá hạn";
  } else if (activeFilter === "returned") {
    titleEl.textContent = "Phiếu mượn trực tuyến đã hoàn trả";
    badgeEl.textContent = totalItems + " đã trả";
  } else if (activeFilter === "rejected") {
    titleEl.textContent = "Phiếu đã từ chối hoặc độc giả tự hủy";
    badgeEl.textContent = totalItems + " đơn";
  } else {
    titleEl.textContent = "Tất cả phiếu yêu cầu trực tuyến";
    badgeEl.textContent = totalItems + " đơn";
  }
}

function renderPagination(totalItems, totalPages, startIndex, endIndex) {
  var infoEl = document.getElementById("pagination-info-text");
  var btnsWrap = document.getElementById("pagination-buttons-wrap");

  if (infoEl) {
    if (totalItems === 0) {
      infoEl.textContent = "Hiển thị 0 trên 0 đơn";
    } else {
      infoEl.textContent = "Hiển thị " + (startIndex + 1) + " - " + endIndex + " trên " + totalItems + " đơn";
    }
  }

  if (!btnsWrap) return;
  btnsWrap.innerHTML = "";
  if (totalPages <= 1) return;

  var btnPrev = document.createElement("button");
  btnPrev.type = "button";
  btnPrev.className = "btn-page-nav";
  btnPrev.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">chevron_left</span>';
  btnPrev.disabled = currentPage === 1;
  btnPrev.addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      renderLoanTable();
    }
  });
  btnsWrap.appendChild(btnPrev);

  for (var i = 1; i <= totalPages; i++) {
    (function (pageNumber) {
      var btnNum = document.createElement("button");
      btnNum.type = "button";
      btnNum.className = "btn-page-nav" + (pageNumber === currentPage ? " active" : "");
      btnNum.textContent = pageNumber;
      btnNum.addEventListener("click", function () {
        currentPage = pageNumber;
        renderLoanTable();
      });
      btnsWrap.appendChild(btnNum);
    })(i);
  }

  var btnNext = document.createElement("button");
  btnNext.type = "button";
  btnNext.className = "btn-page-nav";
  btnNext.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">chevron_right</span>';
  btnNext.disabled = currentPage === totalPages;
  btnNext.addEventListener("click", function () {
    if (currentPage < totalPages) {
      currentPage++;
      renderLoanTable();
    }
  });
  btnsWrap.appendChild(btnNext);
}

// ------------------------------------------------------------------------------
// 11. HỘP THOẠI CHI TIẾT PHIẾU YÊU CẦU (MODAL CHI TIẾT)
// ------------------------------------------------------------------------------
function getBookCopyStatusHtml(book, loan) {
  if (!book.copyCode) {
    return '<span class="book-item-availability unavailable"><span class="material-symbols-outlined" style="font-size: 14px;">cancel</span> Chưa gán bản sao</span>';
  }
  if (loan.rawStatus === "BORROWED" && !book.returnDate) {
    return '<span class="book-item-availability available"><span class="material-symbols-outlined" style="font-size: 14px;">menu_book</span> Đang được độc giả mượn</span>';
  }
  if (loan.rawStatus === "RETURNED" || book.returnDate) {
    return '<span class="book-item-availability available"><span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span> Đã hoàn trả về kho</span>';
  }
  if (book.copyStatus === "RESERVED") {
    return '<span class="book-item-availability available"><span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span> Đã giữ bản sao cho phiếu này</span>';
  }
  if (book.copyStatus === "AVAILABLE") {
    return '<span class="book-item-availability available"><span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span> Bản sao sẵn sàng trên kệ (Khả dụng)</span>';
  }
  return '<span class="book-item-availability unavailable"><span class="material-symbols-outlined" style="font-size: 14px;">cancel</span> Bản sao hiện không khả dụng (' + escapeHtml(book.copyStatus || "N/A") + ')</span>';
}

function openDetailModal(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  var modal = document.getElementById("detail-modal");
  if (!modal) return;

  document.getElementById("modal-detail-title").textContent = "Chi tiết Phiếu yêu cầu trực tuyến #" + loan.maPhieu;
  var badgeEl = document.getElementById("modal-detail-badge");
  badgeEl.className = "badge " + getStatusBadgeClass(loan);
  badgeEl.textContent = loan.trangThai;

  var rejectBanner = document.getElementById("modal-rejected-banner");
  var rejectText = document.getElementById("modal-rejected-reason-text");
  if (loan.trangThai === "Đã từ chối" || loan.trangThai === "Đã hủy") {
    rejectBanner.style.display = "flex";
    rejectText.textContent = loan.lyDoTuChoi || (loan.trangThai === "Đã hủy" ? "Độc giả đã hủy yêu cầu." : "Phiếu đã bị từ chối.");
  } else {
    rejectBanner.style.display = "none";
  }

  var avatarEl = document.getElementById("modal-reader-avatar");
  avatarEl.textContent = loan.docGia.ten ? loan.docGia.ten.trim().charAt(0).toUpperCase() : "U";
  document.getElementById("modal-reader-name").textContent = loan.docGia.ten;
  document.getElementById("modal-reader-email").textContent = loan.docGia.email;
  document.getElementById("modal-reader-phone").textContent = loan.docGia.sdt;
  document.getElementById("modal-reader-mssv").textContent = loan.docGia.cardCode;
  document.getElementById("modal-reader-dept").textContent = formatCardStatusLabel(loan.docGia.cardStatus);
  document.getElementById("modal-reader-books-holding").textContent =
    loan.docGia.soSachDangGiu + " / " + loan.docGia.gioiHanSach + " cuốn";

  var validBadge = modal.querySelector(".reader-valid-badge");
  if (validBadge) {
    var cardUpper = String(loan.docGia.cardStatus || "").toUpperCase();
    if (cardUpper === "ACTIVE") {
      validBadge.style.display = "inline-flex";
      validBadge.innerHTML =
        '<span class="material-symbols-outlined" style="font-size: 16px;">verified</span>' +
        '<span>Thẻ Thư viện hợp lệ</span>';
    } else {
      validBadge.style.display = "inline-flex";
      validBadge.innerHTML =
        '<span class="material-symbols-outlined" style="font-size: 16px;">info</span>' +
        '<span>' + escapeHtml(formatCardStatusLabel(loan.docGia.cardStatus)) + '</span>';
    }
  }

  var booksTitle = document.getElementById("modal-books-count-title");
  booksTitle.textContent = "DANH SÁCH CHI TIẾT ẤN PHẨM YÊU CẦU (" + loan.sach.length + " CUỐN)";

  var booksListContainer = document.getElementById("modal-books-list");
  booksListContainer.innerHTML = "";

  loan.sach.forEach(function (book) {
    var card = document.createElement("div");
    card.className = "book-item-card";

    var itemMetaExtra = "";
    if (loan.rawStatus === "BORROWED") {
      itemMetaExtra = " • <strong>Hạn trả:</strong> " + escapeHtml(formatDateVN(book.dueDate || loan.ngayHenTra)) +
        " • <strong>Gia hạn:</strong> " + book.renewalCount + "/1";
    }

    var canRenewThisItem =
      loan.rawStatus === "BORROWED" &&
      !book.returnDate &&
      book.id &&
      book.renewalCount < 1 &&
      !book.hasWaitingReservation &&
      !book.isOverdue &&
      !loan.daQuaHan;

    card.innerHTML =
      '<div class="book-item-icon-wrap">' +
      '<span class="material-symbols-outlined">menu_book</span>' +
      '</div>' +
      '<div class="book-item-details">' +
      '<div class="book-item-title">' + escapeHtml(book.ten) + '</div>' +
      '<div class="book-item-meta">' +
      '<strong>Mã bản sao:</strong> <span class="font-mono">' + escapeHtml(book.maBanSao) + '</span> • ' +
      '<strong>Vị trí trên giá:</strong> ' + escapeHtml(book.viTri) +
      (book.tacGia ? ' • <strong>Tác giả:</strong> ' + escapeHtml(book.tacGia) : '') +
      itemMetaExtra +
      '</div>' +
      getBookCopyStatusHtml(book, loan) +
      (book.hasWaitingReservation && !book.returnDate && loan.rawStatus === "BORROWED"
        ? ' <span class="badge badge-pending" style="margin-left:8px; font-size:11px;">Có người đặt trước</span>'
        : '') +
      '</div>';

    if (canRenewThisItem) {
      var btnRenewItem = document.createElement("button");
      btnRenewItem.type = "button";
      btnRenewItem.className = "btn-table-action";
      btnRenewItem.style.alignSelf = "center";
      btnRenewItem.style.flexShrink = "0";
      btnRenewItem.title = "Gia hạn riêng cuốn sách này thêm 7 ngày";
      btnRenewItem.innerHTML = '<span class="material-symbols-outlined">autorenew</span><span>Gia hạn cuốn này</span>';
      btnRenewItem.addEventListener("click", function () {
        closeDetailModal();
        confirmRenewLoanItem(loan.id, book.id);
      });
      card.appendChild(btnRenewItem);
    }

    booksListContainer.appendChild(card);
  });

  var retentionEl = document.getElementById("modal-shelf-retention-text");
  if (retentionEl) {
    if (loan.rawStatus === "BORROWED" && loan.ngayHenTra) {
      retentionEl.innerHTML =
        'Phiếu đang lưu hành. Hạn trả sách dự kiến: <strong>' + escapeHtml(formatDateVN(loan.ngayHenTra)) + '</strong> (đã gia hạn ' + loan.soLanGiaHan + '/1 lần).';
    } else if (loan.rawStatus === "APPROVED") {
      retentionEl.innerHTML =
        'Phiếu đã duyệt và giữ bản sao. Chờ độc giả đến quầy làm thủ tục bàn giao để bắt đầu kỳ mượn 14 ngày.';
    } else {
      retentionEl.innerHTML =
        'Sách sau khi duyệt sẽ chuyển sang trạng thái <strong>Sẵn sàng nhận</strong> để độc giả đến quầy nhận trong thời gian quy định.';
    }
  }

  var readerNoteEl = document.getElementById("modal-reader-note-text");
  if (readerNoteEl) {
    readerNoteEl.textContent =
      "Ngày tạo: " + loan.gioTao + (loan.borrowedAt ? (" • Ngày bàn giao: " + formatDateTimeVN(loan.borrowedAt)) : "");
  }

  var warningBox = document.getElementById("modal-warning-callout");
  if (warningBox) {
    warningBox.style.display = loan.trangThai === "Chờ duyệt" ? "flex" : "none";
  }

  var footerEl = document.getElementById("modal-detail-footer");
  footerEl.innerHTML = "";

  if (loan.trangThai === "Chờ duyệt") {
    var btnReject = document.createElement("button");
    btnReject.type = "button";
    btnReject.className = "btn-outline-danger";
    btnReject.innerHTML = '<span class="material-symbols-outlined">close</span><span>Từ chối yêu cầu</span>';
    btnReject.addEventListener("click", function () {
      closeDetailModal();
      openRejectModal(loan.id);
    });
    footerEl.appendChild(btnReject);

    var btnApprove = document.createElement("button");
    btnApprove.type = "button";
    btnApprove.className = "btn-primary-action";
    btnApprove.innerHTML = '<span class="material-symbols-outlined">check_circle</span><span>Duyệt yêu cầu</span>';
    btnApprove.addEventListener("click", function () {
      closeDetailModal();
      confirmApproveLoan(loan.id);
    });
    footerEl.appendChild(btnApprove);
  } else if (loan.trangThai === "Sẵn sàng nhận") {
    var btnHandover = document.createElement("button");
    btnHandover.type = "button";
    btnHandover.className = "btn-primary-action";
    btnHandover.innerHTML = '<span class="material-symbols-outlined">output</span><span>Xác nhận giao sách</span>';
    btnHandover.addEventListener("click", function () {
      closeDetailModal();
      confirmHandoverLoan(loan.id);
    });
    footerEl.appendChild(btnHandover);
  } else if (loan.trangThai === "Đang mượn" && loan.soLanGiaHan < 1 && !loan.coNguoiDatTruoc) {
    var btnRenewModal = document.createElement("button");
    btnRenewModal.type = "button";
    btnRenewModal.className = "btn-primary-action";
    btnRenewModal.innerHTML = '<span class="material-symbols-outlined">autorenew</span><span>Gia hạn thêm 7 ngày</span>';
    btnRenewModal.addEventListener("click", function () {
      closeDetailModal();
      confirmRenewLoan(loan.id);
    });
    footerEl.appendChild(btnRenewModal);
  } else {
    var btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "btn-secondary-neutral";
    btnClose.textContent = "Đóng";
    btnClose.addEventListener("click", closeDetailModal);
    footerEl.appendChild(btnClose);
  }

  modal.classList.add("active");
}

function closeDetailModal() {
  var modal = document.getElementById("detail-modal");
  if (modal) modal.classList.remove("active");
}

function openReservationDetailModal(resId) {
  var res = reservationData.find(function (item) { return item.id === resId; });
  if (!res) return;

  var modal = document.getElementById("detail-modal");
  if (!modal) return;

  var resCode = "DT-" + String(res.id).padStart(4, "0");
  document.getElementById("modal-detail-title").textContent = "Chi tiết Đơn đặt trước #" + resCode;

  var info = getReservationStatusInfo(res);
  var st = info.status;
  var badgeEl = document.getElementById("modal-detail-badge");
  badgeEl.className = "badge " + info.badgeClass;
  badgeEl.textContent = info.badgeText;

  var rejectBanner = document.getElementById("modal-rejected-banner");
  if (rejectBanner) rejectBanner.style.display = "none";

  var readerName = res.user_name || ("Độc giả #" + res.user_id);
  document.getElementById("modal-reader-avatar").textContent = readerName.trim().charAt(0).toUpperCase() || "U";
  document.getElementById("modal-reader-name").textContent = readerName;
  document.getElementById("modal-reader-email").textContent = res.user_email || "Chưa cập nhật";
  document.getElementById("modal-reader-phone").textContent = "—";
  document.getElementById("modal-reader-mssv").textContent = res.student_id || ("ID #" + res.user_id);
  document.getElementById("modal-reader-dept").textContent = "Đặt trước sách";
  document.getElementById("modal-reader-books-holding").textContent = "Đơn đặt trước #" + res.id;

  var validBadge = modal.querySelector(".reader-valid-badge");
  if (validBadge) {
    validBadge.style.display = "inline-flex";
    var badgeIcon = st === "READY" ? "bookmark_added" : (st === "FULFILLED" ? "task_alt" : (st === "WAITING" ? "hourglass_top" : "info"));
    validBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">' + badgeIcon + '</span><span>' + escapeHtml(info.modalSub) + '</span>';
  }

  document.getElementById("modal-books-count-title").textContent = st === "READY"
    ? "ẤN PHẨM ĐANG GIỮ CHỖ TẠI QUẦY (1 CUỐN)"
    : "THÔNG TIN ẤN PHẨM ĐẶT TRƯỚC (1 CUỐN)";
  var booksListContainer = document.getElementById("modal-books-list");
  booksListContainer.innerHTML = "";

  var availHtml = '<span class="book-item-availability unavailable"><span class="material-symbols-outlined" style="font-size: 14px;">info</span> ' + escapeHtml(info.modalSub) + '</span>';
  if (st === "READY") {
    availHtml = '<span class="book-item-availability available"><span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span> Đã giữ chỗ cho đơn đặt trước</span>';
  } else if (st === "FULFILLED") {
    availHtml = '<span class="book-item-availability available"><span class="material-symbols-outlined" style="font-size: 14px;">task_alt</span> Đã giao sách cho độc giả</span>';
  } else if (st === "WAITING") {
    availHtml = '<span class="book-item-availability unavailable"><span class="material-symbols-outlined" style="font-size: 14px;">hourglass_top</span> Đang chờ có bản sao trống để giữ chỗ</span>';
  }

  var card = document.createElement("div");
  card.className = "book-item-card";
  card.innerHTML =
    '<div class="book-item-icon-wrap">' +
    '<span class="material-symbols-outlined">menu_book</span>' +
    '</div>' +
    '<div class="book-item-details">' +
    '<div class="book-item-title">' + escapeHtml(res.book_title || res.book_isbn) + '</div>' +
    '<div class="book-item-meta">' +
    '<strong>Mã bản sao:</strong> <span class="font-mono">' + escapeHtml(res.copy_code || info.copyFallback) + '</span> • ' +
    '<strong>Vị trí:</strong> ' + escapeHtml(res.shelf_location || "Quầy thủ thư") +
    (res.book_author ? ' • <strong>Tác giả:</strong> ' + escapeHtml(res.book_author) : '') +
    '</div>' +
    availHtml +
    '</div>';
  booksListContainer.appendChild(card);

  var retentionEl = document.getElementById("modal-shelf-retention-text");
  if (retentionEl) {
    if (st === "READY") {
      retentionEl.innerHTML = 'Hạn chót độc giả đến nhận sách: <strong>' + escapeHtml(formatDateVN(res.pickup_deadline)) + '</strong>. Quá hạn sẽ tự động nhường người kế tiếp.';
    } else if (st === "WAITING") {
      retentionEl.innerHTML = 'Đơn đang ở vị trí hàng chờ <strong>#' + escapeHtml(String(res.queue_position || "?")) + '</strong>. Sẽ tự động chuyển sang Sẵn sàng nhận khi có bản sao trả về kho.';
    } else if (st === "FULFILLED") {
      retentionEl.innerHTML = 'Đơn đặt trước đã hoàn tất bàn giao sách và tạo phiếu mượn tại quầy.';
    } else if (st === "EXPIRED") {
      retentionEl.innerHTML = 'Đơn đã quá hạn giữ chỗ 48 giờ nên hệ thống tự động chuyển sang <strong>EXPIRED</strong> và nhường lượt.';
    } else {
      retentionEl.innerHTML = 'Đơn đặt trước đã bị hủy và giải phóng giữ chỗ.';
    }
  }

  var readerNoteEl = document.getElementById("modal-reader-note-text");
  if (readerNoteEl) {
    readerNoteEl.textContent = "Ngày đặt trước: " + formatDateTimeVN(res.reserved_at);
  }

  var warningBox = document.getElementById("modal-warning-callout");
  if (warningBox) warningBox.style.display = "none";

  var footerEl = document.getElementById("modal-detail-footer");
  footerEl.innerHTML = "";

  if (st === "READY" || st === "WAITING") {
    var btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.className = "btn-outline-danger";
    btnCancel.innerHTML = '<span class="material-symbols-outlined">close</span><span>Hủy giữ chỗ</span>';
    btnCancel.addEventListener("click", function () {
      closeDetailModal();
      confirmCancelReservation(res.id);
    });
    footerEl.appendChild(btnCancel);
  }

  if (st === "READY") {
    var btnEmailModal = document.createElement("button");
    btnEmailModal.type = "button";
    btnEmailModal.className = "btn-secondary-neutral";
    btnEmailModal.innerHTML = '<span class="material-symbols-outlined">mail</span><span>Gửi email báo nhận</span>';
    btnEmailModal.addEventListener("click", function () {
      notifyReservationReadyEmail(res.id);
    });
    footerEl.appendChild(btnEmailModal);

    var btnFulfill = document.createElement("button");
    btnFulfill.type = "button";
    btnFulfill.className = "btn-primary-action";
    btnFulfill.innerHTML = '<span class="material-symbols-outlined">output</span><span>Xác nhận đã giao sách</span>';
    btnFulfill.addEventListener("click", function () {
      closeDetailModal();
      confirmFulfillReservation(res.id);
    });
    footerEl.appendChild(btnFulfill);
  } else if (st !== "WAITING") {
    var btnCloseRes = document.createElement("button");
    btnCloseRes.type = "button";
    btnCloseRes.className = "btn-secondary-neutral";
    btnCloseRes.textContent = "Đóng";
    btnCloseRes.addEventListener("click", closeDetailModal);
    footerEl.appendChild(btnCloseRes);
  }

  modal.classList.add("active");
}

async function notifyReservationReadyEmail(resId) {
  var res = reservationData.find(function (item) { return item.id === resId; });
  if (!res) return;
  var resCode = "DT-" + String(res.id).padStart(4, "0");

  try {
    var result = await api.post("/emails/notify-reservation-ready/" + res.id, {});
    var msg = (result && result.message) || ("Đã gửi email thông báo đơn " + resCode + " tới độc giả.");
    showToast("success", "Đã gửi email thông báo!", msg);
  } catch (err) {
    showToast("error", "Không thể gửi email", extractApiError(err, "Độc giả chưa có email hợp lệ hoặc cấu hình SMTP chưa sẵn sàng."));
  }
}

function confirmFulfillReservation(resId) {
  var res = reservationData.find(function (item) { return item.id === resId; });
  if (!res) return;
  var resCode = "DT-" + String(res.id).padStart(4, "0");

  showConfirm({
    title: "Xác nhận giao sách đặt trước?",
    message: "Xác nhận độc giả " + (res.user_name || "") + " đã đến nhận sách «" + (res.book_title || res.book_isbn) + "» (" + resCode + ")?",
    type: "green",
    confirmText: "Xác nhận đã giao",
    cancelText: "Hủy",
    onConfirm: async function () {
      try {
        var fulfilled = await api.post("/reservations/" + res.id + "/fulfill", {});
        var loanSuffix = fulfilled && fulfilled.loan_code ? (" Đã tạo phiếu mượn " + fulfilled.loan_code + " (hạn 14 ngày).") : "";
        showToast("success", "Hoàn tất đặt trước!", "Đơn " + resCode + " đã giao sách thành công." + loanSuffix);
        await Promise.all([
          loadReservationsFromDatabase(false),
          loadLoansFromDatabase(false),
        ]);
      } catch (err) {
        showToast("error", "Thao tác thất bại", extractApiError(err, "Không thể xác nhận giao sách đặt trước."));
      }
    }
  });
}

function confirmCancelReservation(resId) {
  var res = reservationData.find(function (item) { return item.id === resId; });
  if (!res) return;
  var resCode = "DT-" + String(res.id).padStart(4, "0");

  showConfirm({
    title: "Hủy đơn đặt trước?",
    message: "Hủy giữ chỗ " + resCode + " của độc giả " + (res.user_name || "") + "? Hệ thống sẽ tự chuyển bản sao cho người xếp hàng kế tiếp (nếu có).",
    type: "red",
    confirmText: "Hủy giữ chỗ",
    cancelText: "Quay lại",
    onConfirm: async function () {
      try {
        await api.post("/reservations/" + res.id + "/cancel", {});
        showToast("success", "Đã hủy giữ chỗ!", "Đơn " + resCode + " đã được hủy và giải phóng bản sao.");
        await Promise.all([
          loadReservationsFromDatabase(false),
          loadLoansFromDatabase(false),
        ]);
      } catch (err) {
        showToast("error", "Hủy giữ chỗ thất bại", extractApiError(err, "Không thể hủy đơn đặt trước."));
      }
    }
  });
}

async function checkExpiredReservations() {
  try {
    var result = await api.post("/reservations/check-expired", {});
    var msg = (result && result.message) || ("Đã quét xong. Số đơn quá hạn xử lý: " + (result?.expired_count ?? 0));
    showToast("info", "Đã quét đặt trước quá hạn", msg);
    await loadReservationsFromDatabase(false);
  } catch (err) {
    showToast("error", "Lỗi quét quá hạn", extractApiError(err, "Không thể quét đơn đặt trước quá hạn."));
  }
}

// ------------------------------------------------------------------------------
// 12. NGHIỆP VỤ DUYỆT PHIẾU (PENDING -> APPROVED)
// ------------------------------------------------------------------------------
function confirmApproveLoan(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  var hasUnavailable = loan.sach.some(function (b) { return !b.khaDung; });
  if (hasUnavailable) {
    showToast("error", "Không thể duyệt yêu cầu này!", "Có bản sao chưa được gán hoặc đang không khả dụng.");
    return;
  }

  showConfirm({
    title: "Xác nhận duyệt yêu cầu mượn?",
    message: "Duyệt phiếu " + loan.maPhieu + " của độc giả " + loan.docGia.ten + " sang trạng thái Sẵn sàng nhận tại quầy?",
    type: "green",
    confirmText: "Xác nhận duyệt",
    cancelText: "Hủy",
    onConfirm: async function () {
      try {
        await api.patch("/loans/" + loan.id + "/approve");
        showToast("success", "Duyệt yêu cầu thành công!", "Phiếu mượn " + loan.maPhieu + " đã chuyển sang Sẵn sàng nhận.");
        await loadLoansFromDatabase(false);
      } catch (err) {
        showToast("error", "Duyệt phiếu thất bại", extractApiError(err, "Không thể duyệt phiếu mượn."));
      }
    }
  });
}

// ------------------------------------------------------------------------------
// 13. NGHIỆP VỤ GIAO SÁCH (APPROVED -> BORROWED)
// ------------------------------------------------------------------------------
function confirmHandoverLoan(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  var copies = loan.sach
    .filter(function (b) { return b.bookIsbn && b.copyCode; })
    .map(function (b) { return { book_isbn: b.bookIsbn, copy_code: b.copyCode }; });

  if (copies.length === 0) {
    showToast("error", "Thiếu thông tin bản sao", "Phiếu mượn chưa có mã bản sao hợp lệ để bàn giao.");
    return;
  }

  showConfirm({
    title: "Xác nhận giao sách cho độc giả?",
    message: "Xác nhận độc giả " + loan.docGia.ten + " (Mã thẻ: " + loan.docGia.cardCode + ") đã nhận " + copies.length + " cuốn sách và bắt đầu thời hạn mượn 14 ngày?",
    type: "green",
    confirmText: "Xác nhận giao sách",
    cancelText: "Hủy",
    onConfirm: async function () {
      try {
        await api.post("/loans/" + loan.id + "/handover", { copies: copies });
        showToast("success", "Giao sách thành công!", "Phiếu mượn " + loan.maPhieu + " đã chuyển sang Đang mượn.");
        await loadLoansFromDatabase(false);
      } catch (err) {
        showToast("error", "Bàn giao sách thất bại", extractApiError(err, "Không thể xác nhận bàn giao sách."));
      }
    }
  });
}

// ------------------------------------------------------------------------------
// 14. NGHIỆP VỤ GIA HẠN PHIẾU MƯỢN (+7 NGÀY)
// ------------------------------------------------------------------------------
function confirmRenewLoanItem(loanId, loanItemId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;
  var book = loan.sach.find(function (b) { return b.id === loanItemId; });
  if (!book) return;

  if (book.renewalCount >= 1) {
    showToast("warning", "Không thể gia hạn", "Cuốn «" + book.ten + "» đã đạt giới hạn gia hạn 1/1 lần.");
    return;
  }
  if (book.hasWaitingReservation) {
    showToast("warning", "Không thể gia hạn", "Cuốn «" + book.ten + "» đang có độc giả khác đặt trước.");
    return;
  }

  showConfirm({
    title: "Gia hạn cuốn sách (+7 ngày)?",
    message: "Gia hạn thêm 7 ngày cho cuốn «" + book.ten + "» (mã " + book.maBanSao + ") trong phiếu " + loan.maPhieu + "?",
    type: "blue",
    confirmText: "Gia hạn cuốn này",
    cancelText: "Hủy",
    onConfirm: async function () {
      try {
        if (!currentStaffUser || !currentStaffUser.id) {
          currentStaffUser = await api.get("/auth/me");
        }
        var res = await api.patch("/loans/items/" + loanItemId + "/renew", {
          librarian_id: currentStaffUser.id
        });
        showToast("success", "Gia hạn thành công!", (res && res.message) || ("Đã gia hạn cuốn «" + book.ten + "» thêm 7 ngày."));
        await loadLoansFromDatabase(false);
      } catch (err) {
        showToast("error", "Gia hạn thất bại", extractApiError(err, "Không thể gia hạn cuốn sách này."));
      }
    }
  });
}

function confirmRenewLoan(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  if (loan.soLanGiaHan >= 1) {
    showToast("warning", "Không thể gia hạn", "Phiếu " + loan.maPhieu + " đã đạt giới hạn gia hạn 1/1 lần.");
    return;
  }
  if (loan.coNguoiDatTruoc) {
    showToast("warning", "Không thể gia hạn", "Có đầu sách trong phiếu đang có người đặt trước.");
    return;
  }

  showConfirm({
    title: "Xác nhận gia hạn phiếu mượn?",
    message: "Gia hạn thêm 7 ngày cho phiếu " + loan.maPhieu + " của độc giả " + loan.docGia.ten + "?",
    type: "blue",
    confirmText: "Gia hạn +7 ngày",
    cancelText: "Hủy",
    onConfirm: async function () {
      try {
        if (!currentStaffUser || !currentStaffUser.id) {
          currentStaffUser = await api.get("/auth/me");
        }
        await api.patch("/loans/" + loan.id + "/renew", {
          librarian_id: currentStaffUser.id
        });
        showToast("success", "Gia hạn thành công!", "Phiếu " + loan.maPhieu + " đã được gia hạn thêm 7 ngày.");
        await loadLoansFromDatabase(false);
      } catch (err) {
        showToast("error", "Gia hạn thất bại", extractApiError(err, "Không thể gia hạn phiếu mượn."));
      }
    }
  });
}

// ------------------------------------------------------------------------------
// 15. NGHIỆP VỤ TỪ CHỐI KÈM LÝ DO (PENDING -> REJECTED)
// ------------------------------------------------------------------------------
function openRejectModal(loanId) {
  var loan = loanData.find(function (item) { return item.id === loanId; });
  if (!loan) return;

  currentRejectLoanId = loanId;
  var modal = document.getElementById("reject-modal");
  var codeEl = document.getElementById("reject-modal-loan-code");
  var textarea = document.getElementById("reject-reason-textarea");
  var errorMsg = document.getElementById("reject-error-msg");
  var counterEl = document.getElementById("reject-char-counter");
  var selectReason = document.getElementById("reject-reason-select");

  if (codeEl) codeEl.textContent = "Phiếu mượn #" + loan.maPhieu + " - Độc giả: " + loan.docGia.ten;
  if (selectReason) selectReason.selectedIndex = 0;
  if (textarea) {
    textarea.value = selectReason ? selectReason.value : "";
    textarea.classList.remove("has-error");
  }
  if (errorMsg) errorMsg.style.display = "none";
  if (counterEl) {
    var initLen = textarea ? textarea.value.length : 0;
    counterEl.textContent = initLen + " / 200";
  }

  if (modal) modal.classList.add("active");
}

function closeRejectModal() {
  var modal = document.getElementById("reject-modal");
  if (modal) modal.classList.remove("active");
  currentRejectLoanId = null;
}

async function submitRejectLoan() {
  if (!currentRejectLoanId) return;

  var loan = loanData.find(function (item) { return item.id === currentRejectLoanId; });
  if (!loan) return;

  var textarea = document.getElementById("reject-reason-textarea");
  var errorMsg = document.getElementById("reject-error-msg");
  var btnSubmit = document.getElementById("btn-submit-reject");
  var reason = textarea ? textarea.value.trim() : "";

  if (!reason) {
    if (textarea) textarea.classList.add("has-error");
    if (errorMsg) errorMsg.style.display = "block";
    showToast("warning", "Cảnh báo", "Vui lòng nhập lý do từ chối trước khi xác nhận.");
    return;
  }

  if (btnSubmit) btnSubmit.disabled = true;
  try {
    await api.patch("/loans/" + loan.id + "/reject", { reject_reason: reason });
    closeRejectModal();
    showToast("success", "Đã từ chối yêu cầu mượn.", "Phiếu " + loan.maPhieu + " đã được cập nhật trạng thái từ chối.");
    await loadLoansFromDatabase(false);
  } catch (err) {
    showToast("error", "Từ chối phiếu thất bại", extractApiError(err, "Không thể từ chối phiếu mượn."));
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
}

// ------------------------------------------------------------------------------
// 16. XUẤT BÁO CÁO CSV TỪ DỮ LIỆU THỰC
// ------------------------------------------------------------------------------
function csvEscapeCell(val) {
  var s = val === null || val === undefined ? "" : String(val);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportFilteredLoansCsv() {
  var rows = getFilteredLoans();
  if (rows.length === 0) {
    showToast("warning", "Không có dữ liệu", "Danh sách hiện tại trống, không có phiếu nào để xuất CSV.");
    return;
  }

  var header = [
    "Mã phiếu",
    "Độc giả",
    "Mã thẻ",
    "Email",
    "SĐT",
    "Thời gian tạo",
    "Hạn trả",
    "Số cuốn",
    "Danh sách ấn phẩm",
    "Trạng thái",
    "Lý do từ chối"
  ];

  var csvLines = [header.map(csvEscapeCell).join(",")];
  rows.forEach(function (loan) {
    var bookTitles = loan.sach.map(function (b) {
      return b.ten + " (" + b.maBanSao + ")";
    }).join(" | ");

    csvLines.push([
      loan.maPhieu,
      loan.docGia.ten,
      loan.docGia.cardCode,
      loan.docGia.email,
      loan.docGia.sdt,
      loan.gioTao,
      loan.ngayHenTra ? formatDateVN(loan.ngayHenTra) : "",
      loan.sach.length,
      bookTitles,
      loan.trangThai,
      loan.lyDoTuChoi
    ].map(csvEscapeCell).join(","));
  });

  var csvContent = "\uFEFF" + csvLines.join("\r\n");
  var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  var todayStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = "phieu_muon_truc_tuyen_" + todayStr + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("success", "Xuất báo cáo thành công!", "Đã tải xuống " + rows.length + " phiếu mượn ra file CSV.");
}

// ------------------------------------------------------------------------------
// 17. KHỞI TẠO HỒ SƠ STAFF & SỰ KIỆN TRANG
// ------------------------------------------------------------------------------
function syncTabsWithStatus(statusValue) {
  var tabButtons = document.querySelectorAll("#filter-tabs .tab-btn");
  var targetTab = statusValue;
  if (statusValue === "approved") targetTab = "ready";
  else if (statusValue === "returned") targetTab = "all";

  currentTab = targetTab;
  tabButtons.forEach(function (b) {
    b.classList.remove("active");
    if (b.getAttribute("data-tab") === targetTab) {
      b.classList.add("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  var userProfileBtn = document.getElementById("userProfileBtn");
  var userDropdownMenu = document.getElementById("userDropdownMenu");
  var logoutMenuBtn = document.getElementById("logoutMenuBtn");
  var mobileMenuToggle = document.getElementById("mobileMenuToggle");
  var navMenu = document.getElementById("navMenu");

  function mapRoleLabel(role) {
    if (!role) return "Độc giả";
    var r = String(role).toUpperCase();
    if (r === "ADMIN") return "Quản trị viên";
    if (r === "LIBRARIAN") return "Thủ thư trực quầy";
    if (r === "READER") return "Độc giả";
    return role;
  }

  function renderUser(user) {
    if (!user) return;
    currentStaffUser = user;
    var avatarEl = document.getElementById("userAvatar") || (userProfileBtn ? userProfileBtn.querySelector(".librarian-avatar") : null);
    var nameEl = document.getElementById("userName") || (userProfileBtn ? userProfileBtn.querySelector(".librarian-name") : null);
    var roleEl = document.getElementById("userRole") || (userProfileBtn ? userProfileBtn.querySelector(".librarian-role") : null);

    var fullName = user.full_name || user.name || user.email || "Thủ thư";
    var initial = (fullName.trim().charAt(0) || "U").toUpperCase();
    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = mapRoleLabel(user.role);
  }

  async function verifyStaffAndLoadProfile() {
    var token = (typeof auth !== "undefined" && typeof auth.getToken === "function")
      ? auth.getToken()
      : (localStorage.getItem("access_token") || localStorage.getItem("token") || sessionStorage.getItem("access_token"));

    if (!token) {
      window.location.href = "login.html#login";
      return false;
    }

    var cachedUser = (typeof auth !== "undefined" && typeof auth.getUser === "function") ? auth.getUser() : null;
    if (cachedUser) renderUser(cachedUser);

    try {
      var freshUser = null;
      if (typeof auth !== "undefined" && typeof auth.syncSession === "function") {
        freshUser = await auth.syncSession();
      } else {
        freshUser = await api.get("/auth/me");
      }

      if (!freshUser) {
        if (typeof auth !== "undefined") auth.clearSession();
        window.location.href = "login.html#login";
        return false;
      }

      renderUser(freshUser);
      var roleUpper = String(freshUser.role || "").toUpperCase();
      if (roleUpper !== "ADMIN" && roleUpper !== "LIBRARIAN") {
        showToast("error", "Không có quyền truy cập", "Trang này chỉ dành cho Thủ thư hoặc Quản trị viên.");
        setTimeout(function () {
          window.location.href = "home.html";
        }, 800);
        return false;
      }
      return true;
    } catch (err) {
      if (err && err.status === 401) {
        if (typeof auth !== "undefined") auth.clearSession();
        window.location.href = "login.html#login";
        return false;
      }
      console.warn("Không đồng bộ được hồ sơ nhân viên:", err);
      return true;
    }
  }

  // Khởi tạo sự kiện Tabs & Filter
  var tabButtons = document.querySelectorAll("#filter-tabs .tab-btn");
  var statusSelect = document.getElementById("filter-status");
  renderStatusFilterOptions(currentTab === "reservations" ? "reservations" : "loans", currentStatusFilter);

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabButtons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentTab = btn.getAttribute("data-tab") || "all";
      if (currentTab === "reservations") {
        currentStatusFilter = "all";
        renderStatusFilterOptions("reservations", "all");
      } else {
        currentStatusFilter = currentTab === "ready" ? "approved" : currentTab;
        renderStatusFilterOptions("loans", currentStatusFilter);
      }
      currentPage = 1;
      renderLoanTable();
    });
  });

  if (statusSelect) {
    statusSelect.addEventListener("change", function () {
      statusSelect.disabled = false;
      currentStatusFilter = statusSelect.value;
      if (currentTab !== "reservations") {
        syncTabsWithStatus(currentStatusFilter);
      }
      currentPage = 1;
      renderLoanTable();
    });
  }

  var timeSelect = document.getElementById("filter-time");
  if (timeSelect) {
    timeSelect.addEventListener("change", function () {
      currentTimeFilter = timeSelect.value;
      currentPage = 1;
      renderLoanTable();
    });
  }

  var searchInput = document.getElementById("filter-keyword");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      currentSearchKeyword = searchInput.value;
      currentPage = 1;
      renderLoanTable();
    });
  }

  var btnApply = document.getElementById("btn-apply-filter");
  if (btnApply) {
    btnApply.addEventListener("click", function () {
      if (statusSelect) {
        currentStatusFilter = statusSelect.value;
        if (currentTab !== "reservations") {
          syncTabsWithStatus(currentStatusFilter);
        }
      }
      if (timeSelect) currentTimeFilter = timeSelect.value;
      if (searchInput) currentSearchKeyword = searchInput.value;
      currentPage = 1;
      renderLoanTable();
      showToast("info", "Đã áp dụng bộ lọc", "Danh sách đã được cập nhật theo điều kiện lọc.");
    });
  }

  var btnReset = document.getElementById("btn-reset-filter");
  if (btnReset) {
    btnReset.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      if (timeSelect) timeSelect.value = "all";

      currentSearchKeyword = "";
      currentStatusFilter = "all";
      currentTimeFilter = "all";
      currentPage = 1;

      if (currentTab === "reservations") {
        renderStatusFilterOptions("reservations", "all");
        renderLoanTable();
        showToast("info", "Đã đặt lại bộ lọc", "Hiển thị toàn bộ đơn đặt trước (5 trạng thái).");
      } else {
        renderStatusFilterOptions("loans", "all");
        syncTabsWithStatus("all");
        renderLoanTable();
        showToast("info", "Đã đặt lại bộ lọc", "Hiển thị toàn bộ phiếu mượn trực tuyến.");
      }
    });
  }

  var pageSizeSelect = document.getElementById("page-size-select");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", function () {
      pageSize = parseInt(pageSizeSelect.value, 10) || 10;
      currentPage = 1;
      renderLoanTable();
    });
  }

  var btnRefresh = document.getElementById("btn-refresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", function () {
      if (currentTab === "reservations") {
        loadReservationsFromDatabase(true);
        loadLoansFromDatabase(false);
      } else {
        loadLoansFromDatabase(true);
        loadReservationsFromDatabase(false);
      }
    });
  }

  var btnCheckExpiredRes = document.getElementById("btn-check-expired-res");
  if (btnCheckExpiredRes) {
    btnCheckExpiredRes.addEventListener("click", checkExpiredReservations);
  }

  var btnExport = document.getElementById("btn-export");
  if (btnExport) {
    btnExport.addEventListener("click", exportFilteredLoansCsv);
  }

  // Modal chi tiết
  var btnCloseDetail = document.getElementById("btn-close-detail-modal");
  if (btnCloseDetail) btnCloseDetail.addEventListener("click", closeDetailModal);
  var detailModal = document.getElementById("detail-modal");
  if (detailModal) {
    detailModal.addEventListener("click", function (e) {
      if (e.target === detailModal) closeDetailModal();
    });
  }

  // Modal từ chối
  var btnCloseReject = document.getElementById("btn-close-reject-modal");
  var btnCancelReject = document.getElementById("btn-cancel-reject");
  var btnSubmitReject = document.getElementById("btn-submit-reject");
  var rejectModal = document.getElementById("reject-modal");
  var rejectTextarea = document.getElementById("reject-reason-textarea");
  var rejectCounter = document.getElementById("reject-char-counter");
  var rejectReasonSelect = document.getElementById("reject-reason-select");

  if (btnCloseReject) btnCloseReject.addEventListener("click", closeRejectModal);
  if (btnCancelReject) btnCancelReject.addEventListener("click", closeRejectModal);
  if (btnSubmitReject) btnSubmitReject.addEventListener("click", submitRejectLoan);

  if (rejectModal) {
    rejectModal.addEventListener("click", function (e) {
      if (e.target === rejectModal) closeRejectModal();
    });
  }

  if (rejectTextarea && rejectCounter) {
    rejectTextarea.addEventListener("input", function () {
      var len = rejectTextarea.value.length;
      rejectCounter.textContent = len + " / 200";
      if (len > 0) {
        rejectTextarea.classList.remove("has-error");
        var err = document.getElementById("reject-error-msg");
        if (err) err.style.display = "none";
      }
    });
  }

  if (rejectReasonSelect && rejectTextarea) {
    rejectReasonSelect.addEventListener("change", function () {
      var val = rejectReasonSelect.value;
      if (val === "Khác") {
        rejectTextarea.value = "";
        rejectTextarea.focus();
      } else {
        rejectTextarea.value = val;
      }
      if (rejectCounter) rejectCounter.textContent = rejectTextarea.value.length + " / 200";
      rejectTextarea.classList.remove("has-error");
      var err = document.getElementById("reject-error-msg");
      if (err) err.style.display = "none";
    });
  }

  var reasonPills = document.querySelectorAll("#quick-reason-pills .reason-pill");
  reasonPills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      var reasonVal = pill.getAttribute("data-reason") || "";
      if (rejectReasonSelect) {
        var optMatch = Array.from(rejectReasonSelect.options).find(function (o) { return o.value === reasonVal; });
        rejectReasonSelect.value = optMatch ? reasonVal : "Khác";
      }
      if (rejectTextarea) {
        rejectTextarea.value = reasonVal;
        rejectTextarea.focus();
        if (rejectCounter) rejectCounter.textContent = reasonVal.length + " / 200";
        rejectTextarea.classList.remove("has-error");
        var err = document.getElementById("reject-error-msg");
        if (err) err.style.display = "none";
      }
    });
  });

  // Modal xác nhận
  var btnConfirmCancel = document.getElementById("btn-confirm-cancel");
  var btnConfirmProceed = document.getElementById("btn-confirm-proceed");
  var confirmModal = document.getElementById("confirm-modal");

  if (btnConfirmCancel) btnConfirmCancel.addEventListener("click", closeConfirmModal);
  if (btnConfirmProceed) {
    btnConfirmProceed.addEventListener("click", function () {
      var callback = activeConfirmCallback;
      closeConfirmModal();
      if (typeof callback === "function") {
        callback();
      }
    });
  }
  if (confirmModal) {
    confirmModal.addEventListener("click", function (e) {
      if (e.target === confirmModal) closeConfirmModal();
    });
  }

  // Phím Esc
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.keyCode === 27) {
      closeDetailModal();
      closeRejectModal();
      closeConfirmModal();
      if (userDropdownMenu) userDropdownMenu.classList.remove("show");
    }
  });

  // Header Dropdown & Mobile Menu
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      navMenu.classList.toggle("show");
    });
  }

  if (userProfileBtn && userDropdownMenu) {
    userProfileBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      userDropdownMenu.classList.toggle("show");
      var isShown = userDropdownMenu.classList.contains("show");
      userProfileBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
    });
  }

  if (logoutMenuBtn) {
    logoutMenuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (userDropdownMenu) userDropdownMenu.classList.remove("show");
      showConfirm({
        title: "Xác nhận đăng xuất?",
        message: "Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại không?",
        type: "red",
        confirmText: "Đăng xuất",
        cancelText: "Hủy",
        onConfirm: function () {
          if (typeof auth !== "undefined" && typeof auth.clearSession === "function") {
            auth.clearSession();
          } else {
            localStorage.clear();
            sessionStorage.clear();
          }
          showToast("info", "Đang đăng xuất...", "Phiên làm việc đã kết thúc.");
          setTimeout(function () {
            window.location.href = "login.html#login";
          }, 500);
        }
      });
    });
  }

  document.addEventListener("click", function () {
    if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
      userDropdownMenu.classList.remove("show");
      if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
    }
    if (navMenu && navMenu.classList.contains("show")) {
      navMenu.classList.remove("show");
    }
  });

  // Kiểm tra quyền nhân viên & tải dữ liệu từ database
  var allowed = await verifyStaffAndLoadProfile();
  if (allowed) {
    await Promise.all([
      loadLoansFromDatabase(false),
      loadReservationsFromDatabase(false),
    ]);
  }
});
