/**
 * QUẢN LÝ THỂ LOẠI, TÁC GIẢ & NHÀ XUẤT BẢN (Task T3CFCC6)
 * Giao diện 3 tab: Thể loại / Tác giả / NXB
 * API thêm/sửa/xoá: tên không trùng, tìm kiếm, phân trang, không xoá khi còn đầu sách liên kết
 */

(function () {
  "use strict";

  // State quản lý toàn trang
  const state = {
    currentTab: "category", // "category" | "author" | "publisher"
    currentPage: 1,
    pageSize: 10,
    searchKeyword: "",
    totalItems: 0,
    totalPages: 1,
    isLoading: false,
    items: [],
    deleteTarget: null, // item đang chuẩn bị xoá
    editTarget: null,   // item đang chuẩn bị sửa (null nếu là thêm mới)
    debounceTimer: null,
  };

  // Cấu hình nhãn & trường theo từng tab
  const TAB_CONFIGS = {
    category: {
      title: "Thể loại sách",
      apiEndpoint: "/categories",
      singularName: "thể loại",
      addBtnText: "Thêm thể loại mới",
      searchPlaceholder: "Tìm kiếm thể loại theo tên hoặc mô tả...",
      modalAddTitle: "Thêm mới thể loại sách",
      modalEditTitle: "Chỉnh sửa thể loại sách",
      labelName: "Tên thể loại",
      hintName: "Tên thể loại là duy nhất (không phân biệt hoa thường), không được trùng lặp.",
      showExtra1: false,
      labelExtra1: "",
      labelDesc: "Mô tả thể loại",
      descPlaceholder: "Nhập mô tả tóm tắt về thể loại sách này...",
    },
    author: {
      title: "Tác giả",
      apiEndpoint: "/authors",
      singularName: "tác giả",
      addBtnText: "Thêm tác giả mới",
      searchPlaceholder: "Tìm tác giả theo tên, quốc tịch, tiểu sử...",
      modalAddTitle: "Thêm mới tác giả",
      modalEditTitle: "Chỉnh sửa thông tin tác giả",
      labelName: "Tên tác giả",
      hintName: "Tên tác giả đầy đủ, hệ thống kiểm tra tránh trùng lặp.",
      showExtra1: true,
      labelExtra1: "Quốc tịch",
      extra1Placeholder: "Ví dụ: Việt Nam, Anh, Mỹ, Nhật Bản...",
      labelDesc: "Tiểu sử / Giới thiệu",
      descPlaceholder: "Nhập tóm tắt tiểu sử, sự nghiệp hoặc thành tựu tác giả...",
    },
    publisher: {
      title: "Nhà xuất bản",
      apiEndpoint: "/publishers",
      singularName: "nhà xuất bản",
      addBtnText: "Thêm nhà xuất bản mới",
      searchPlaceholder: "Tìm NXB theo tên, địa chỉ, thông tin...",
      modalAddTitle: "Thêm mới nhà xuất bản",
      modalEditTitle: "Chỉnh sửa thông tin nhà xuất bản",
      labelName: "Tên nhà xuất bản",
      hintName: "Tên NXB chính thức, không được trùng lặp.",
      showExtra1: true,
      labelExtra1: "Địa chỉ trụ sở",
      extra1Placeholder: "Ví dụ: Hà Nội, TP. Hồ Chí Minh...",
      labelDesc: "Thông tin liên hệ / Ghi chú",
      descPlaceholder: "Thông tin thêm về nhà xuất bản...",
    },
  };

  // Khởi chạy khi DOM sẵn sàng
  document.addEventListener("DOMContentLoaded", () => {
    initLayout();
    initEvents();
    loadStats();
    loadData();
  });

  // ==============================================================================
  // 0. KHỞI TẠO BỐ CỤC CHUNG (TOPBAR, USER DROPDOWN, CONFIRM LOGOUT)
  // ==============================================================================
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

  function initLayout() {
    // Chặn quyền Admin/Thủ thư
    if (typeof auth !== "undefined") {
      const user = auth.getUser();
      if (!user || (user.role !== "ADMIN" && user.role !== "LIBRARIAN")) {
        sessionStorage.setItem("redirect_after_login", window.location.href);
        window.location.href = "login.html#login";
        return;
      }

      // Đồng bộ thông tin người dùng lên Topbar
      const avatarEl = document.getElementById("userAvatar");
      const nameEl = document.getElementById("userName");
      const roleEl = document.getElementById("userRole");
      if (avatarEl) avatarEl.textContent = (user.full_name || user.email || "A").charAt(0).toUpperCase();
      if (nameEl) nameEl.textContent = user.full_name || user.email || "Thủ thư";
      if (roleEl) roleEl.textContent = user.role === "ADMIN" ? "Quản trị viên" : "Thủ thư trực quầy";
    }

    // Toggle menu mobile
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

    // Nút đăng xuất mở modal xác nhận
    if (logoutMenuBtn) {
      logoutMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
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
      });
    }

    // Đóng dropdown khi click ngoài
    document.addEventListener("click", () => {
      if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
        userDropdownMenu.classList.remove("show");
        if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
      }
      if (navMenu && navMenu.classList.contains("show")) {
        navMenu.classList.remove("show");
      }
    });

    // Các nút trong Confirm Modal
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
  }

  // ==============================================================================
  // 1. GẮN SỰ KIỆN GIAO DIỆN
  // ==============================================================================
  function initEvents() {
    // Tìm kiếm với debounce 350ms
    const searchInput = document.getElementById("taxonomySearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchKeyword = e.target.value.trim();
        const btnClear = document.getElementById("btnClearSearch");
        if (btnClear) {
          btnClear.style.display = state.searchKeyword ? "block" : "none";
        }
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(() => {
          state.currentPage = 1;
          loadData();
        }, 350);
      });
    }

    // Đóng modal khi bấm ra ngoài vùng dialog
    const formModal = document.getElementById("formModalBackdrop");
    if (formModal) {
      formModal.addEventListener("click", (e) => {
        if (e.target === formModal) closeFormModal();
      });
    }

    const deleteModal = document.getElementById("deleteModalBackdrop");
    if (deleteModal) {
      deleteModal.addEventListener("click", (e) => {
        if (e.target === deleteModal) closeDeleteModal();
      });
    }

    // Phím tắt Esc để đóng modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeFormModal();
        closeDeleteModal();
      }
    });
  }

  // ==============================================================================
  // 2. CHUYỂN TAB (Thể loại / Tác giả / NXB)
  // ==============================================================================
  window.switchTaxonomyTab = function (tabKey) {
    if (state.currentTab === tabKey) return;
    state.currentTab = tabKey;
    state.currentPage = 1;
    state.searchKeyword = "";

    // Reset ô tìm kiếm
    const searchInput = document.getElementById("taxonomySearchInput");
    if (searchInput) searchInput.value = "";
    const btnClear = document.getElementById("btnClearSearch");
    if (btnClear) btnClear.style.display = "none";

    // Cập nhật trạng thái active tab buttons
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
    });

    const activeBtn =
      tabKey === "category"
        ? document.getElementById("tabBtnCategory")
        : tabKey === "author"
          ? document.getElementById("tabBtnAuthor")
          : document.getElementById("tabBtnPublisher");

    if (activeBtn) {
      activeBtn.classList.add("active");
      activeBtn.setAttribute("aria-selected", "true");
    }

    // Cập nhật text nút thêm mới và placeholder
    const cfg = TAB_CONFIGS[tabKey];
    const btnCreateText = document.getElementById("btnCreateText");
    if (btnCreateText) btnCreateText.textContent = cfg.addBtnText;

    if (searchInput) searchInput.placeholder = cfg.searchPlaceholder;

    loadData();
  };

  window.clearSearch = function () {
    const searchInput = document.getElementById("taxonomySearchInput");
    if (searchInput) searchInput.value = "";
    state.searchKeyword = "";
    const btnClear = document.getElementById("btnClearSearch");
    if (btnClear) btnClear.style.display = "none";
    state.currentPage = 1;
    loadData();
  };

  // ==============================================================================
  // 3. TẢI DỮ LIỆU TỪ BACKEND
  // ==============================================================================
  async function loadData() {
    state.isLoading = true;
    renderTableSkeleton();

    const cfg = TAB_CONFIGS[state.currentTab];

    try {
      const params = {
        page: state.currentPage,
        page_size: state.pageSize,
      };
      if (state.searchKeyword) {
        params.search = state.searchKeyword;
      }

      const res = await api.get(cfg.apiEndpoint, params);

      state.items = res.items || [];
      state.totalItems = res.total || 0;
      state.totalPages = res.total_pages || 1;

      // Cập nhật badge số lượng trên tab
      updateTabBadge(state.currentTab, state.totalItems);

      renderTable();
      renderPagination();
    } catch (err) {
      console.error("Lỗi khi tải danh mục:", err);
      showToast(err.message || "Không thể tải danh mục dữ liệu.", "error");
      renderTableError(err.message);
    } finally {
      state.isLoading = false;
    }
  }

  // Tải thống kê tổng quan 4 thẻ
  async function loadStats() {
    try {
      const stats = await api.get("/taxonomy/stats");
      document.getElementById("statCategoriesCount").textContent = stats.total_categories || 0;
      document.getElementById("statAuthorsCount").textContent = stats.total_authors || 0;
      document.getElementById("statPublishersCount").textContent = stats.total_publishers || 0;
      document.getElementById("statBooksCount").textContent = stats.total_books || 0;

      // Cập nhật badge
      updateTabBadge("category", stats.total_categories || 0);
      updateTabBadge("author", stats.total_authors || 0);
      updateTabBadge("publisher", stats.total_publishers || 0);
    } catch (err) {
      console.warn("Không lấy được taxonomy stats:", err);
    }
  }

  function updateTabBadge(tabKey, count) {
    if (tabKey === "category") {
      const el = document.getElementById("badgeCategoriesCount");
      if (el) el.textContent = count;
    } else if (tabKey === "author") {
      const el = document.getElementById("badgeAuthorsCount");
      if (el) el.textContent = count;
    } else if (tabKey === "publisher") {
      const el = document.getElementById("badgePublishersCount");
      if (el) el.textContent = count;
    }
  }

  // ==============================================================================
  // 4. HIỂN THỊ BẢNG (RENDER TABLE)
  // ==============================================================================
  function renderTableSkeleton() {
    const thead = document.getElementById("taxonomyTableHead");
    const tbody = document.getElementById("taxonomyTableBody");
    const emptyBox = document.getElementById("emptyDataBox");
    if (emptyBox) emptyBox.style.display = "none";

    renderTableHeader(thead);

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8">
          <div class="loading-spinner"></div>
          <p class="loading-text">Đang tải dữ liệu từ máy chủ...</p>
        </td>
      </tr>
    `;
  }

  function renderTableHeader(thead) {
    if (state.currentTab === "category") {
      thead.innerHTML = `
        <tr>
          <th style="width: 80px;">ID</th>
          <th style="width: 260px;">Tên thể loại</th>
          <th>Mô tả chi tiết</th>
          <th style="width: 160px; text-align: center;">Đầu sách liên kết</th>
          <th style="width: 140px;">Ngày tạo</th>
          <th style="width: 110px; text-align: center;">Thao tác</th>
        </tr>
      `;
    } else if (state.currentTab === "author") {
      thead.innerHTML = `
        <tr>
          <th style="width: 80px;">ID</th>
          <th style="width: 240px;">Tên tác giả</th>
          <th style="width: 160px;">Quốc tịch</th>
          <th>Tiểu sử / Giới thiệu</th>
          <th style="width: 160px; text-align: center;">Đầu sách đứng tên</th>
          <th style="width: 110px; text-align: center;">Thao tác</th>
        </tr>
      `;
    } else {
      thead.innerHTML = `
        <tr>
          <th style="width: 80px;">ID</th>
          <th style="width: 260px;">Tên nhà xuất bản</th>
          <th style="width: 200px;">Địa chỉ trụ sở</th>
          <th>Thông tin thêm / Ghi chú</th>
          <th style="width: 160px; text-align: center;">Đầu sách phát hành</th>
          <th style="width: 110px; text-align: center;">Thao tác</th>
        </tr>
      `;
    }
  }

  function renderTable() {
    const thead = document.getElementById("taxonomyTableHead");
    const tbody = document.getElementById("taxonomyTableBody");
    const emptyBox = document.getElementById("emptyDataBox");
    const paginationFooter = document.getElementById("paginationFooter");

    renderTableHeader(thead);

    if (state.items.length === 0) {
      tbody.innerHTML = "";
      if (emptyBox) emptyBox.style.display = "block";
      if (paginationFooter) paginationFooter.style.display = "none";
      return;
    }

    if (emptyBox) emptyBox.style.display = "none";
    if (paginationFooter) paginationFooter.style.display = "flex";

    let html = "";
    state.items.forEach((item) => {
      const booksCount = item.books_count || 0;
      const hasBooks = booksCount > 0;
      const badgeClass = hasBooks ? "books-count-badge has-books" : "books-count-badge";
      const badgeText = hasBooks
        ? `<span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle; margin-right: 2px;">menu_book</span> ${booksCount} cuốn`
        : `0 cuốn`;

      const safeName = escapeHtml(item.name || "");
      const safeDesc = escapeHtml(item.description || item.biography || "—");

      if (state.currentTab === "category") {
        const createdDate = formatDate(item.created_at);
        html += `
          <tr>
            <td class="td-id">#${item.id}</td>
            <td class="td-name">${safeName}</td>
            <td class="td-desc" title="${safeDesc}">${safeDesc}</td>
            <td style="text-align: center;">
              <span class="${badgeClass}">${badgeText}</span>
            </td>
            <td style="color: var(--color-muted); font-size: 13px;">${createdDate}</td>
            <td>
              <div class="table-actions" style="justify-content: center;">
                <button type="button" class="btn-action-icon" title="Chỉnh sửa thể loại" onclick="openEditModal(${item.id})">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button type="button" class="btn-action-icon btn-action-delete" title="Xoá thể loại" onclick="openDeleteModal(${item.id})">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      } else if (state.currentTab === "author") {
        const safeNat = escapeHtml(item.nationality || "—");
        html += `
          <tr>
            <td class="td-id">#${item.id}</td>
            <td class="td-name">${safeName}</td>
            <td><span style="font-weight: 500;">${safeNat}</span></td>
            <td class="td-desc" title="${safeDesc}">${safeDesc}</td>
            <td style="text-align: center;">
              <span class="${badgeClass}">${badgeText}</span>
            </td>
            <td>
              <div class="table-actions" style="justify-content: center;">
                <button type="button" class="btn-action-icon" title="Chỉnh sửa tác giả" onclick="openEditModal(${item.id})">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button type="button" class="btn-action-icon btn-action-delete" title="Xoá tác giả" onclick="openDeleteModal(${item.id})">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      } else {
        const safeAddr = escapeHtml(item.address || "—");
        html += `
          <tr>
            <td class="td-id">#${item.id}</td>
            <td class="td-name">${safeName}</td>
            <td style="font-size: 13px;">${safeAddr}</td>
            <td class="td-desc" title="${safeDesc}">${safeDesc}</td>
            <td style="text-align: center;">
              <span class="${badgeClass}">${badgeText}</span>
            </td>
            <td>
              <div class="table-actions" style="justify-content: center;">
                <button type="button" class="btn-action-icon" title="Chỉnh sửa NXB" onclick="openEditModal(${item.id})">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button type="button" class="btn-action-icon btn-action-delete" title="Xoá NXB" onclick="openDeleteModal(${item.id})">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }
    });

    tbody.innerHTML = html;
  }

  function renderTableError(msg) {
    const tbody = document.getElementById("taxonomyTableBody");
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8">
          <p style="color: var(--color-danger); font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            <span class="material-symbols-outlined" style="font-size: 20px;">warning</span>
            <span>${escapeHtml(msg || "Lỗi tải dữ liệu")}</span>
          </p>
          <div style="margin-top: 10px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="location.reload()">Thử lại</button>
          </div>
        </td>
      </tr>
    `;
  }

  // ==============================================================================
  // 5. PHÂN TRANG (PAGINATION)
  // ==============================================================================
  function renderPagination() {
    const info = document.getElementById("paginationInfo");
    const btnPrev = document.getElementById("btnPrevPage");
    const btnNext = document.getElementById("btnNextPage");
    const numbersGroup = document.getElementById("pageNumbersGroup");

    const start = (state.currentPage - 1) * state.pageSize + 1;
    const end = Math.min(state.currentPage * state.pageSize, state.totalItems);

    if (info) {
      info.innerHTML = `Hiển thị <strong>${state.totalItems ? start : 0}</strong> đến <strong>${end}</strong> trong tổng số <strong>${state.totalItems}</strong> bản ghi`;
    }

    if (btnPrev) btnPrev.disabled = state.currentPage <= 1;
    if (btnNext) btnNext.disabled = state.currentPage >= state.totalPages;

    if (numbersGroup) {
      let html = "";
      for (let p = 1; p <= state.totalPages; p++) {
        // Chỉ hiển thị tối đa 5 trang xung quanh trang hiện tại
        if (p === 1 || p === state.totalPages || Math.abs(p - state.currentPage) <= 2) {
          const activeClass = p === state.currentPage ? "active" : "";
          html += `<button type="button" class="page-num-btn ${activeClass}" onclick="goToPage(${p})">${p}</button>`;
        }
      }
      numbersGroup.innerHTML = html;
    }
  }

  window.changePage = function (delta) {
    const newPage = state.currentPage + delta;
    if (newPage >= 1 && newPage <= state.totalPages) {
      state.currentPage = newPage;
      loadData();
    }
  };

  window.goToPage = function (p) {
    if (p >= 1 && p <= state.totalPages && p !== state.currentPage) {
      state.currentPage = p;
      loadData();
    }
  };

  // ==============================================================================
  // 6. FORM MODAL: THÊM MỚI / CHỈNH SỬA
  // ==============================================================================
  window.openCreateModal = function () {
    state.editTarget = null;
    const cfg = TAB_CONFIGS[state.currentTab];

    document.getElementById("formItemId").value = "";
    document.getElementById("formModalTitle").textContent = cfg.modalAddTitle;
    document.getElementById("modalHeaderIcon").innerHTML = '<span class="material-symbols-outlined">add_circle</span>';
    document.getElementById("btnSubmitText").textContent = "Lưu dữ liệu";

    // Cấu hình nhãn
    document.getElementById("labelName").innerHTML = `${cfg.labelName} <span class="text-danger">*</span>`;
    document.getElementById("hintName").textContent = cfg.hintName;
    document.getElementById("inputName").value = "";
    document.getElementById("inputName").placeholder = `Nhập ${cfg.singularName}...`;

    // Cấu hình trường phụ 1
    const groupExtra1 = document.getElementById("groupExtraField1");
    if (cfg.showExtra1) {
      groupExtra1.style.display = "block";
      document.getElementById("labelExtra1").textContent = cfg.labelExtra1;
      const inputExtra1 = document.getElementById("inputExtra1");
      inputExtra1.value = "";
      inputExtra1.placeholder = cfg.extra1Placeholder || "";
    } else {
      groupExtra1.style.display = "none";
    }

    // Cấu hình mô tả
    document.getElementById("labelDescription").textContent = cfg.labelDesc;
    const inputDesc = document.getElementById("inputDescription");
    inputDesc.value = "";
    inputDesc.placeholder = cfg.descPlaceholder;

    document.getElementById("formModalBackdrop").style.display = "flex";
    setTimeout(() => document.getElementById("inputName")?.focus(), 100);
  };

  window.openEditModal = function (id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;

    state.editTarget = item;
    const cfg = TAB_CONFIGS[state.currentTab];

    document.getElementById("formItemId").value = item.id;
    document.getElementById("formModalTitle").textContent = `${cfg.modalEditTitle} #${item.id}`;
    document.getElementById("modalHeaderIcon").innerHTML = '<span class="material-symbols-outlined">edit</span>';
    document.getElementById("btnSubmitText").textContent = "Cập nhật thay đổi";

    // Điền dữ liệu cũ
    document.getElementById("labelName").innerHTML = `${cfg.labelName} <span class="text-danger">*</span>`;
    document.getElementById("hintName").textContent = cfg.hintName;
    document.getElementById("inputName").value = item.name || "";

    const groupExtra1 = document.getElementById("groupExtraField1");
    if (cfg.showExtra1) {
      groupExtra1.style.display = "block";
      document.getElementById("labelExtra1").textContent = cfg.labelExtra1;
      const inputExtra1 = document.getElementById("inputExtra1");
      inputExtra1.value = item.nationality || item.address || "";
    } else {
      groupExtra1.style.display = "none";
    }

    document.getElementById("labelDescription").textContent = cfg.labelDesc;
    document.getElementById("inputDescription").value = item.description || item.biography || "";

    document.getElementById("formModalBackdrop").style.display = "flex";
    setTimeout(() => document.getElementById("inputName")?.focus(), 100);
  };

  window.closeFormModal = function () {
    const backdrop = document.getElementById("formModalBackdrop");
    if (backdrop) backdrop.style.display = "none";
    state.editTarget = null;
  };

  // Submit form thêm / sửa
  window.handleFormSubmit = async function (e) {
    e.preventDefault();

    const name = document.getElementById("inputName").value.trim();
    if (!name) {
      showToast("Vui lòng nhập tên hợp lệ.", "error");
      return;
    }

    const cfg = TAB_CONFIGS[state.currentTab];
    const isEdit = !!state.editTarget;
    const itemId = document.getElementById("formItemId").value;

    const btnSubmit = document.getElementById("btnSubmitForm");
    btnSubmit.disabled = true;

    // Chuẩn bị payload theo từng tab
    let payload = { name };
    const descValue = document.getElementById("inputDescription").value.trim() || null;
    const extra1Value = document.getElementById("inputExtra1")?.value.trim() || null;

    if (state.currentTab === "category") {
      payload.description = descValue;
    } else if (state.currentTab === "author") {
      payload.nationality = extra1Value;
      payload.biography = descValue;
    } else if (state.currentTab === "publisher") {
      payload.address = extra1Value;
      payload.description = descValue;
    }

    try {
      if (isEdit) {
        await api.put(`${cfg.apiEndpoint}/${itemId}`, payload);
        showToast(`Cập nhật ${cfg.singularName} "${name}" thành công!`, "success");
      } else {
        await api.post(cfg.apiEndpoint, payload);
        showToast(`Thêm ${cfg.singularName} mới "${name}" thành công!`, "success");
      }

      closeFormModal();
      loadData();
      loadStats();
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      // Backend HTTPException trả về detail lỗi tên trùng
      showToast(err.message || "Không thể lưu dữ liệu.", "error");
    } finally {
      btnSubmit.disabled = false;
    }
  };

  // ==============================================================================
  // 7. HỘP THOẠI XÁC NHẬN XOÁ & CHẶN XOÁ KHI CÒN SÁCH LIÊN KẾT
  // ==============================================================================
  window.openDeleteModal = function (id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;

    state.deleteTarget = item;
    const cfg = TAB_CONFIGS[state.currentTab];

    document.getElementById("deleteTargetTypeName").textContent = cfg.singularName;
    document.getElementById("deleteTargetItemName").textContent = `"${item.name}" (ID #${item.id})`;

    const warningBox = document.getElementById("deleteWarningLinkedBooks");
    const warningText = document.getElementById("deleteWarningText");
    const btnConfirm = document.getElementById("btnConfirmDelete");

    const booksCount = item.books_count || 0;

    // Nếu còn sách liên kết: cảnh báo rõ và vô hiệu hoá nút xoá
    if (booksCount > 0) {
      warningBox.style.display = "block";
      warningText.innerHTML = `
        Mục này hiện đang có <strong>${booksCount}</strong> đầu sách liên kết trực tiếp trong kho.
        <br>
        Quy định hệ thống: <strong>Không được phép xoá</strong> khi còn đầu sách liên kết để bảo toàn toàn vẹn dữ liệu.
        Vui lòng chuyển các đầu sách này sang mục khác trước khi xoá.
      `;
      btnConfirm.disabled = true;
      btnConfirm.style.opacity = "0.5";
      btnConfirm.style.cursor = "not-allowed";
      btnConfirm.title = "Không thể xoá do còn sách liên kết";
    } else {
      warningBox.style.display = "none";
      btnConfirm.disabled = false;
      btnConfirm.style.opacity = "1";
      btnConfirm.style.cursor = "pointer";
      btnConfirm.title = "";
    }

    document.getElementById("deleteModalBackdrop").style.display = "flex";
  };

  window.closeDeleteModal = function () {
    const backdrop = document.getElementById("deleteModalBackdrop");
    if (backdrop) backdrop.style.display = "none";
    state.deleteTarget = null;
  };

  window.confirmDeleteAction = async function () {
    if (!state.deleteTarget) return;

    const cfg = TAB_CONFIGS[state.currentTab];
    const target = state.deleteTarget;
    const btnConfirm = document.getElementById("btnConfirmDelete");

    btnConfirm.disabled = true;

    try {
      const res = await api.delete(`${cfg.apiEndpoint}/${target.id}`);
      showToast(res.message || `Đã xoá ${cfg.singularName} "${target.name}" thành công!`, "success");
      closeDeleteModal();
      loadData();
      loadStats();
    } catch (err) {
      console.error("Lỗi khi xoá:", err);
      // Hiển thị báo lỗi chi tiết từ backend (HTTP 400 kèm số sách liên kết)
      showToast(err.message || "Không thể xoá bản ghi.", "error");
    } finally {
      btnConfirm.disabled = false;
    }
  };

  // ==============================================================================
  // 8. TOAST THÔNG BÁO TIỆN ÍCH
  // ==============================================================================
  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;

    const icon = type === "success" ? "check_circle" : type === "error" ? "error" : "info";
    toast.innerHTML = `
      <span class="material-symbols-outlined toast-icon">${icon}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      setTimeout(() => toast.remove(), 250);
    }, 4500);
  }

  // ==============================================================================
  // 9. TIỆN ÍCH PHỤ
  // ==============================================================================
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(isoStr) {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "—";
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    } catch {
      return "—";
    }
  }
})();
