/**
 * KS25 Library - Module Quản lý Đầu sách & Bản sao (Books & Copies Management)
 * Tích hợp Backend RESTful API hoàn chỉnh theo quy chuẩn Clean Architecture
 * Bảo lưu 100% tính năng giao diện, in ấn tem mã vạch, xuất Excel/CSV và drawer di động
 */

(function () {
    "use strict";

    // ============================================================================
    // APPLICATION STATE
    // ============================================================================
    const state = {
        books: [],
        totalRecords: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize: 10,
        searchTerm: "",
        selectedCategory: "",
        selectedStatus: "",
        editingIsbn: null,
        editingOriginalCopies: 0,
        returnToDetailIsbn: null,
        authorTags: [],
        selectedCoverFile: null,

        // Modal 2: Quản lý bản sao
        activeCopiesBookIsbn: null,
        activeCopiesBook: null,
        activeCopiesList: [],
        copiesFilter: "ALL", // 'ALL' | 'AVAILABLE' | 'BORROWED' | 'ISSUES'
        copiesSearch: "",
        copiesPage: 1,
        copiesPageSize: 6,
        activeCopyForStatus: null,

        // Modal 3: Xóa / ẩn sách
        deletingIsbn: null,

        // Modal 4: Chi tiết đầu sách
        activeDetailIsbn: null,
        activeDetailBook: null,
        activeDetailCopies: [],

        // Danh mục taxonomy
        categoriesList: [],
        publishersList: [],
        authorsList: [],
        copyConditionsList: []
    };

    // ============================================================================
    // DOM ELEMENTS (ÁNH XẠ TOÀN BỘ PHẦN TỬ TRÊN GIAO DIỆN)
    // ============================================================================
    const dom = {
        // KPI Cards
        kpiTotalBooks: document.getElementById("kpi-total-books"),
        kpiTotalCopies: document.getElementById("kpi-total-copies"),
        kpiAvailableCopies: document.getElementById("kpi-available-copies"),
        kpiBorrowedCopies: document.getElementById("kpi-borrowed-copies"),

        // Filter & Search
        filterSearchInput: document.getElementById("filter-search-input"),
        filterCategory: document.getElementById("filter-category"),
        filterStatus: document.getElementById("filter-status"),
        btnResetFilter: document.getElementById("btn-reset-filter"),

        // Main Table & Pagination
        booksTableBody: document.getElementById("books-table-body"),
        pageStart: document.getElementById("page-start"),
        pageEnd: document.getElementById("page-end"),
        totalRecords: document.getElementById("total-records"),
        paginationInfo: document.getElementById("pagination-info"),
        paginationControls: document.getElementById("pagination-controls"),

        // Modal 1: Create / Edit Book
        bookModalBackdrop: document.getElementById("bookModalBackdrop"),
        bookForm: document.getElementById("bookForm"),
        btnOpenCreateBook: document.getElementById("btn-open-create-book"),
        closeModalBtn: document.getElementById("closeModalBtn"),
        cancelModalBtn: document.getElementById("cancelModalBtn"),
        draftModalBtn: document.getElementById("draftModalBtn"),
        submitBookBtn: document.getElementById("submitBookBtn"),
        modalBookHeading: document.getElementById("modal-book-heading"),
        modalBookBadge: document.getElementById("modal-book-badge"),

        // Modal 1 Form inputs
        bookTitle: document.getElementById("bookTitle"),
        bookIsbn: document.getElementById("bookIsbn"),
        btnLookupIsbn: document.getElementById("btnLookupIsbn"),
        isbnLookupStatus: document.getElementById("isbnLookupStatus"),
        bookCategory: document.getElementById("bookCategory"),
        authorSelectDropdown: document.getElementById("authorSelectDropdown"),
        authorChipsContainer: document.getElementById("authorChipsContainer"),
        tagAuthorInput: document.getElementById("tagAuthorInput"),
        bookPublisher: document.getElementById("bookPublisher"),
        bookYear: document.getElementById("bookYear"),
        bookPageCount: document.getElementById("bookPages"),
        bookPrice: document.getElementById("bookPrice"),
        bookShelf: document.getElementById("bookShelf"),
        bookDescription: document.getElementById("bookSummary"),
        coverFileInput: document.getElementById("coverFileInput"),
        coverDropZone: document.getElementById("coverDropZone"),
        coverPreviewImg: document.getElementById("coverPreviewImg"),
        copiesCount: document.getElementById("copiesCount"),
        copiesCountHint: document.getElementById("copiesCountHint"),
        barcodeRange: document.getElementById("barcodeRange"),

        // Modal 2: Copies Management Modal
        copiesModalBackdrop: document.getElementById("copiesModalBackdrop"),
        copiesModalBookId: document.getElementById("copiesModalBookId"),
        copiesModalIsbn: document.getElementById("copiesModalIsbn"),
        copiesModalDdc: document.getElementById("copiesModalDdc"),
        copiesModalTitle: document.getElementById("copiesModalTitle"),
        copiesModalBookTitle: document.getElementById("copiesModalBookTitle"),
        copiesModalEdition: document.getElementById("copiesModalEdition"),
        copiesModalShelf: document.getElementById("copiesModalShelf"),
        copiesModalTotalSummary: document.getElementById("copiesModalTotalSummary"),
        statCountAvailable: document.getElementById("stat-count-available"),
        statCountBorrowed: document.getElementById("stat-count-borrowed"),
        statCountDamaged: document.getElementById("stat-count-damaged"),
        statCountMaintenance: document.getElementById("stat-count-maintenance"),
        closeCopiesModalBtn: document.getElementById("closeCopiesModalBtn"),
        closeCopiesModalFooterBtn: document.getElementById("closeCopiesModalFooterBtn"),
        exportCopiesCsvBtn: document.getElementById("exportCopiesCsvBtn"),
        doneCopiesModalBtn: document.getElementById("doneCopiesModalBtn"),

        // Modal 3: Confirm Delete Modal
        deleteModalBackdrop: document.getElementById("deleteModalBackdrop"),
        deleteModalTitle: document.getElementById("deleteModalTitle"),
        deleteModalBookTitle: document.getElementById("deleteModalBookTitle"),
        deleteModalIsbn: document.getElementById("deleteModalIsbn"),
        deleteModalAuthor: document.getElementById("deleteModalAuthor"),
        deleteModalCopies: document.getElementById("deleteModalCopies"),
        deleteModalCover: document.getElementById("deleteModalCover"),
        confirmDeleteModalBtn: document.getElementById("confirmDeleteModalBtn"),
        cancelDeleteModalBtn: document.getElementById("cancelDeleteModalBtn"),
        closeDeleteModalBtn: document.getElementById("closeDeleteModalBtn"),

        // Modal 4: Chi tiết đầu sách & Quản trị bản sao
        detailModalBackdrop: document.getElementById("detailModalBackdrop"),
        detailCategoryBadge: document.getElementById("detailCategoryBadge"),
        detailDdc: document.getElementById("detailDdc"),
        detailIsbn: document.getElementById("detailIsbn"),
        detailHeaderTitle: document.getElementById("detailHeaderTitle"),
        closeDetailModalBtn: document.getElementById("closeDetailModalBtn"),
        detailCoverImg: document.getElementById("detailCoverImg"),
        detailBookCode: document.getElementById("detailBookCode"),
        detailShelfLocation: document.getElementById("detailShelfLocation"),
        detailShelfSection: document.getElementById("detailShelfSection"),
        detailCreatedAt: document.getElementById("detailCreatedAt"),
        detailCopiesTotalLabel: document.getElementById("detailCopiesTotalLabel"),
        detailCopiesAvail: document.getElementById("detailCopiesAvail"),
        detailCopiesBorrowed: document.getElementById("detailCopiesBorrowed"),
        detailCopiesReserved: document.getElementById("detailCopiesReserved"),
        btnDetailPrintSpine: document.getElementById("btnDetailPrintSpine"),
        detailBookTitle: document.getElementById("detailBookTitle"),
        detailAuthor: document.getElementById("detailAuthor"),
        detailPublisher: document.getElementById("detailPublisher"),
        detailPages: document.getElementById("detailPages"),
        detailLanguage: document.getElementById("detailLanguage"),
        detailSummary: document.getElementById("detailSummary"),
        detailCopiesTableTitle: document.getElementById("detailCopiesTableTitle"),
        detailBarcodePrefix: document.getElementById("detailBarcodePrefix"),
        detailCopiesTableBody: document.getElementById("detailCopiesTableBody"),
        detailFooterInfo: document.getElementById("detailFooterInfo"),
        detailPrice: document.getElementById("detailPrice"),
        closeDetailModalFooterBtn: document.getElementById("closeDetailModalFooterBtn"),
        detailManageCopiesBtn: document.getElementById("detailManageCopiesBtn"),
        detailManageCopiesBtnText: document.getElementById("detailManageCopiesBtnText"),
        detailEditBookBtn: document.getElementById("detailEditBookBtn"),

        // Modal 2 Tabs
        btnTab1: document.getElementById("btnTab1"),
        btnTab2: document.getElementById("btnTab2"),
        tab1Count: document.getElementById("tab1Count"),
        contentTab1: document.getElementById("contentTab1"),
        contentTab2: document.getElementById("contentTab2"),

        // Modal 2 Tab 1: Filters & Search
        filterBtnAll: document.getElementById("filterBtnAll"),
        filterBtnAvailable: document.getElementById("filterBtnAvailable"),
        filterBtnBorrowed: document.getElementById("filterBtnBorrowed"),
        filterBtnIssues: document.getElementById("filterBtnIssues"),
        filterCountAll: document.getElementById("filterCountAll"),
        filterCountAvailable: document.getElementById("filterCountAvailable"),
        filterCountBorrowed: document.getElementById("filterCountBorrowed"),
        filterCountIssues: document.getElementById("filterCountIssues"),
        copiesSearchInput: document.getElementById("copiesSearchInput"),
        printBatchBarcodesBtn: document.getElementById("printBatchBarcodesBtn"),
        toggleAddCopyBtn: document.getElementById("toggleAddCopyBtn"),

        // Modal 2 Tab 1: Add Copy Drawer
        addCopyDrawer: document.getElementById("addCopyDrawer"),
        closeAddCopyDrawerBtn: document.getElementById("closeAddCopyDrawerBtn"),
        cancelAddCopyBtn: document.getElementById("cancelAddCopyBtn"),
        submitAddCopyBtn: document.getElementById("submitAddCopyBtn"),
        newCopyQty: document.getElementById("newCopyQty"),
        newCopyShelf: document.getElementById("newCopyShelf"),
        newCopyCondition: document.getElementById("newCopyCondition"),

        // Modal 2 Tab 1: Table & Pagination
        copiesTableBody: document.getElementById("copiesTableBody"),
        copiesPaginationInfo: document.getElementById("copiesPaginationInfo"),
        copiesPaginationControls: document.getElementById("copiesPaginationControls"),

        // Modal 2 Tab 1: Status Drawer
        quickStatusDrawer: document.getElementById("quickStatusDrawer"),
        quickStatusCopyCode: document.getElementById("quickStatusCopyCode"),
        quickStatusTicket: document.getElementById("quickStatusTicket"),
        quickStatusSelect: document.getElementById("quickStatusSelect"),
        quickStatusReason: document.getElementById("quickStatusReason"),
        cancelQuickStatusBtn: document.getElementById("cancelQuickStatusBtn"),
        saveQuickStatusBtn: document.getElementById("saveQuickStatusBtn"),

        // Modal 2 Tab 2: Audit Logs
        auditSyncBadge: document.getElementById("auditSyncBadge"),
        auditTimelineContainer: document.getElementById("auditTimelineContainer"),

        // General & Export
        btnExportExcel: document.getElementById("btn-export-excel"),
        toastBox: document.getElementById("toast-box")
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatCoverUrl(url) {
        if (!url) return "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&q=80";
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
        const baseOrigin = typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL
            ? CONFIG.API_BASE_URL.replace(/\/api\/?$/, "")
            : "";
        return `${baseOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
    }

    function mapConditionToBackend(condStr) {
        if (!condStr) return "MỚI";
        const s = condStr.toUpperCase();
        if (s.includes("HỎNG") || s.includes("RÁCH") || s.includes("DAMAGED")) return "HỎNG";
        if (s.includes("CŨ") || s.includes("80%") || s.includes("90%")) return "CŨ";
        return "MỚI";
    }

    function showNotification(message, type = "info") {
        if (typeof Utils !== "undefined" && Utils.showNotification) {
            Utils.showNotification(message, type);
            return;
        }

        const box = dom.toastBox || document.body;
        const toast = document.createElement("div");
        toast.className = `toast toast-${type} toast-item ${type === "error" ? "error" : ""}`;

        let icon = "info";
        if (type === "success") icon = "check_circle";
        if (type === "error") icon = "error";
        if (type === "warning") icon = "warning";

        toast.innerHTML = `
            <span class="material-symbols-outlined">${icon}</span>
            <div class="toast-content">
                <div class="toast-title">${type === "success" ? "Thành công" : type === "error" ? "Lỗi hệ thống" : "Thông báo"}</div>
                <div class="toast-message">${escapeHtml(message)}</div>
            </div>
            <button class="toast-close" type="button">&times;</button>
        `;

        box.appendChild(toast);
        const closeBtn = toast.querySelector(".toast-close");
        if (closeBtn) closeBtn.onclick = () => toast.remove();

        setTimeout(() => {
            toast.style.animation = "slideOut 0.3s forwards";
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ============================================================================
    // 1. TẢI TAXONOMY (THỂ LOẠI, NXB, TÁC GIẢ)
    // ============================================================================
    async function loadTaxonomy() {
        try {
            const [cats, pubs, authors] = await Promise.all([
                api.get("/categories/all").catch(() => []),
                api.get("/publishers/all").catch(() => []),
                api.get("/authors/all").catch(() => [])
            ]);

            state.categoriesList = Array.isArray(cats) ? cats : [];
            state.publishersList = Array.isArray(pubs) ? pubs : [];
            state.authorsList = Array.isArray(authors) ? authors : [];

            if (dom.filterCategory && state.categoriesList.length > 0) {
                const catCodeMap = {
                    "Công nghệ thông tin": "CNTT · Phần mềm",
                    "Kinh tế": "ECO · Quản trị",
                    "Khoa học": "SCI · Tự nhiên",
                    "Giáo dục": "EDU · Sư phạm",
                    "Ngoại ngữ": "LANG · Kỹ năng",
                    "Kỹ thuật": "ENG · Điện tử",
                    "Kỹ năng sống": "SKILL · Phát triển",
                    "Lịch sử": "HIST · Xã hội",
                    "Tâm lý học": "PSY · Hành vi",
                    "Thiếu nhi": "KIDS · Truyện tranh",
                    "Văn học": "LIT · Tiểu thuyết"
                };
                dom.filterCategory.innerHTML = `<option value="">Tất cả thể loại chuyên ngành</option>` +
                    state.categoriesList.map(c => {
                        const tag = catCodeMap[c.name] || (c.code ? c.code.toUpperCase() : "CHUYÊN NGÀNH");
                        return `<option value="${c.id}">${escapeHtml(c.name)} (${tag})</option>`;
                    }).join("");
            }

            if (dom.bookCategory && state.categoriesList.length > 0) {
                dom.bookCategory.innerHTML = state.categoriesList.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
            }

            if (dom.bookPublisher && state.publishersList.length > 0) {
                dom.bookPublisher.innerHTML = state.publishersList.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
            }

            if (dom.authorSelectDropdown) {
                dom.authorSelectDropdown.innerHTML =
                    `<option value="">+ Chọn nhanh tác giả có sẵn...</option>` +
                    state.authorsList.map(a => `<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)}</option>`).join("");
            }
        } catch (err) {
            console.warn("Lỗi tải danh mục taxonomy:", err);
        }
    }

    // ============================================================================
    // 2. TẢI DANH SÁCH ĐẦU SÁCH & PHÂN TRANG (Task A)
    // ============================================================================
    async function loadBooks() {
        if (!dom.booksTableBody) return;

        // Trạng thái Loading
        dom.booksTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 48px 0; color: var(--color-brand);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                        <span class="material-symbols-outlined" style="font-size: 32px; animation: spin 1s linear infinite;">sync</span>
                        <span style="font-size: 14px; font-weight: 500;">Đang kết nối cơ sở dữ liệu và tải danh sách sách...</span>
                    </div>
                </td>
            </tr>
        `;

        try {
            const params = {
                page: state.currentPage,
                page_size: state.pageSize,
                sort_by: "created_at",
                sort_order: "desc"
            };

            if (state.searchTerm) {
                params.keyword = state.searchTerm;
            }

            if (state.selectedCategory) {
                params.category_id = parseInt(state.selectedCategory, 10);
            }

            if (state.selectedStatus === "available") {
                params.available_only = true;
            }

            const res = await api.get("/books/search", params);
            let books = res && Array.isArray(res.items) ? res.items : [];
            let total = res && typeof res.total === "number" ? res.total : books.length;
            let totalPages = res && typeof res.total_pages === "number" ? res.total_pages : 1;

            // Xử lý bộ lọc trạng thái phụ trên client nếu chọn khác AVAILABLE
            if (state.selectedStatus === "borrowed") {
                books = books.filter(b => (b.borrowed_copies || 0) > 0);
                total = books.length;
                totalPages = Math.ceil(total / state.pageSize) || 1;
            } else if (state.selectedStatus === "reserved") {
                books = books.filter(b => (b.reserved_copies || 0) > 0);
                total = books.length;
                totalPages = Math.ceil(total / state.pageSize) || 1;
            } else if (state.selectedStatus === "lost") {
                books = books.filter(b => ((b.lost_copies || 0) + (b.damage_copies || 0) + (b.disposed_copies || 0)) > 0);
                total = books.length;
                totalPages = Math.ceil(total / state.pageSize) || 1;
            }

            state.books = books;
            state.totalRecords = total;
            state.totalPages = totalPages;

            renderTable();
            renderPagination(state.totalPages);
            updateKPIs();

        } catch (err) {
            console.error("Lỗi khi tải danh sách sách:", err);
            // Trạng thái Error
            dom.booksTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px 0; color: #ef4444;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 36px;">cloud_off</span>
                            <span style="font-size: 15px; font-weight: 600;">Không thể tải danh sách đầu sách từ máy chủ</span>
                            <span style="font-size: 13px; color: var(--color-muted);">${escapeHtml(err.message || "Lỗi mạng hoặc chưa đăng nhập quyền Thủ thư.")}</span>
                            <button type="button" class="btn-primary" style="margin-top: 8px; padding: 6px 16px; font-size: 13px;" onclick="window.booksApp.reload()">
                                Thử lại
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            if (dom.paginationControls) dom.paginationControls.innerHTML = "";
        }
    }

    // ============================================================================
    // 3. RENDER BẢNG DỮ LIỆU ĐẦU SÁCH
    // ============================================================================
    function renderTable() {
        if (!dom.booksTableBody) return;

        // Trạng thái Empty
        if (state.books.length === 0) {
            dom.booksTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 50px 0; color: var(--color-muted);">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 40px; color: #cbd5e1;">menu_book</span>
                            <span style="font-size: 15px; font-weight: 500;">Không tìm thấy đầu sách nào phù hợp</span>
                            <span style="font-size: 13px;">Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc.</span>
                        </div>
                    </td>
                </tr>
            `;
            if (dom.pageStart) dom.pageStart.textContent = "0";
            if (dom.pageEnd) dom.pageEnd.textContent = "0";
            if (dom.totalRecords) dom.totalRecords.textContent = "0";
            if (dom.paginationControls) dom.paginationControls.innerHTML = "";
            return;
        }

        const startIndex = (state.currentPage - 1) * state.pageSize;
        const endIndex = Math.min(startIndex + state.books.length, state.totalRecords);

        if (dom.pageStart) dom.pageStart.textContent = String(startIndex + 1);
        if (dom.pageEnd) dom.pageEnd.textContent = String(endIndex);
        if (dom.totalRecords) dom.totalRecords.textContent = Number(state.totalRecords).toLocaleString("vi-VN");

        let html = "";
        state.books.forEach((book) => {
            const isAvail = (book.available_copies || 0) > 0;
            const statusBadge = isAvail
                ? `<span class="status-badge available"><span class="dot"></span> ${book.available_copies} sẵn sàng</span>`
                : `<span class="status-badge empty"><span class="dot"></span> Hết bản sao</span>`;

            const authorsDisplay = Array.isArray(book.authors)
                ? book.authors.map(a => (typeof a === "object" ? a.name : a)).join(", ")
                : (book.authors || "Chưa rõ");

            const publisherDisplay = book.publisher ? (book.publisher.name || book.publisher) : "NXB Giáo Dục";
            const categoryDisplay = book.category ? (book.category.name || book.category) : "Chuyên ngành";
            const coverSrc = formatCoverUrl(book.cover_image);

            html += `
                <tr>
                    <td>
                        <span class="book-code-cell">${escapeHtml(book.isbn)}</span>
                        <span class="book-isbn-cell">ISBN: ${escapeHtml(book.isbn)}</span>
                    </td>
                    <td style="text-align: center;">
                        <img src="${coverSrc}" alt="${escapeHtml(book.title)}" class="book-cover-img" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&q=80'">
                    </td>
                    <td>
                        <a href="book_detail.html?isbn=${encodeURIComponent(book.isbn)}" onclick="window.booksApp.openBookDetailModal('${book.isbn}'); return false;" class="book-title-text" title="Xem chi tiết đầu sách">
                            ${escapeHtml(book.title)}
                        </a>
                        <span class="book-page-text">${book.page_count || 400} trang • Vị trí: ${escapeHtml(book.shelf_location || "Kệ A1")}</span>
                    </td>
                    <td>
                        <span class="book-author-text">${escapeHtml(authorsDisplay)}</span>
                        <span class="book-publisher-text">${escapeHtml(publisherDisplay)} (${book.publish_year || 2024})</span>
                    </td>
                    <td>
                        <span class="category-tag">${escapeHtml(categoryDisplay)}</span>
                    </td>
                    <td style="text-align: center;">
                        <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: var(--color-text-primary);">${book.total_copies || 0}</span>
                    </td>
                    <td style="text-align: center;">
                        ${statusBadge}
                    </td>
                    <td style="text-align: right;">
                        <div class="table-actions" style="justify-content: flex-end;">
                            <button type="button" class="btn-table-action" onclick="window.booksApp.openBookDetailModal('${book.isbn}')" title="Xem chi tiết đầu sách">
                                <span class="material-symbols-outlined">visibility</span>
                            </button>
                            <button type="button" class="btn-table-action" onclick="window.booksApp.openEditModal('${book.isbn}')" title="Chỉnh sửa thông tin">
                                <span class="material-symbols-outlined">edit</span>
                            </button>
                            <button type="button" class="btn-table-action" onclick="window.booksApp.openCopiesModal('${book.isbn}')" title="Quản lý bản sao & Trạng thái">
                                <span class="material-symbols-outlined">qr_code_2</span>
                            </button>
                            <button type="button" class="btn-table-action delete" onclick="window.booksApp.deleteBook('${book.isbn}')" title="Ẩn/Xóa đầu sách">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        dom.booksTableBody.innerHTML = html;
    }

    // ============================================================================
    // 4. PHÂN TRANG
    // ============================================================================
    function renderPagination(totalPages) {
        if (!dom.paginationControls) return;
        if (totalPages <= 1) {
            dom.paginationControls.innerHTML = "";
            return;
        }

        let html = "";
        html += `
            <button type="button" class="pagination-btn" ${state.currentPage === 1 ? "disabled" : ""} onclick="window.booksApp.setPage(${state.currentPage - 1})">
                <span class="material-symbols-outlined">chevron_left</span>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= state.currentPage - 1 && i <= state.currentPage + 1)) {
                html += `
                    <button type="button" class="pagination-btn ${i === state.currentPage ? "active" : ""}" onclick="window.booksApp.setPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === state.currentPage - 2 || i === state.currentPage + 2) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        html += `
            <button type="button" class="pagination-btn" ${state.currentPage === totalPages ? "disabled" : ""} onclick="window.booksApp.setPage(${state.currentPage + 1})">
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        `;

        dom.paginationControls.innerHTML = html;
    }

    function setPage(page) {
        if (page < 1 || page > state.totalPages || page === state.currentPage) return;
        state.currentPage = page;
        loadBooks();
    }

    // ============================================================================
    // 5. CẬP NHẬT SỐ LIỆU KPI ĐẦU TRANG
    // ============================================================================
    async function updateKPIs() {
        try {
            const stat = await api.get("/statistics/dashboard", { period: "month" }).catch(() => null);
            if (stat && stat.summary) {
                const s = stat.summary;
                if (dom.kpiTotalBooks) dom.kpiTotalBooks.textContent = Number(s.total_books || 0).toLocaleString("vi-VN");
                if (dom.kpiTotalCopies) dom.kpiTotalCopies.textContent = Number(s.total_copies || 0).toLocaleString("vi-VN");
                if (dom.kpiAvailableCopies) dom.kpiAvailableCopies.textContent = Number(s.available_copies || 0).toLocaleString("vi-VN");
                if (dom.kpiBorrowedCopies) dom.kpiBorrowedCopies.textContent = Number(s.borrowed_copies || 0).toLocaleString("vi-VN");
                return;
            }
        } catch { }

        const totalCopies = state.books.reduce((acc, b) => acc + (b.total_copies || 0), 0);
        const availCopies = state.books.reduce((acc, b) => acc + (b.available_copies || 0), 0);
        const borrowedCopies = state.books.reduce((acc, b) => acc + (b.borrowed_copies || 0), 0);

        if (dom.kpiTotalBooks) dom.kpiTotalBooks.textContent = Number(state.totalRecords).toLocaleString("vi-VN");
        if (dom.kpiTotalCopies) dom.kpiTotalCopies.textContent = Number(totalCopies).toLocaleString("vi-VN");
        if (dom.kpiAvailableCopies) dom.kpiAvailableCopies.textContent = Number(availCopies).toLocaleString("vi-VN");
        if (dom.kpiBorrowedCopies) dom.kpiBorrowedCopies.textContent = Number(borrowedCopies).toLocaleString("vi-VN");
    }

    // ============================================================================
    // 6. QUẢN LÝ CHIPS TÁC GIẢ KHI THÊM / SỬA (Task A)
    // ============================================================================
    function renderAuthorChips() {
        if (!dom.authorChipsContainer) return;
        const rawInput = dom.tagAuthorInput;
        dom.authorChipsContainer.querySelectorAll(".author-chip").forEach(el => el.remove());

        state.authorTags.forEach((name, idx) => {
            const chip = document.createElement("span");
            chip.className = "author-chip";
            chip.innerHTML = `
                <span>${escapeHtml(name)}</span>
                <button type="button" class="chip-remove" onclick="window.booksApp.removeAuthorTag(${idx})">&times;</button>
            `;
            if (rawInput && rawInput.parentNode === dom.authorChipsContainer) {
                dom.authorChipsContainer.insertBefore(chip, rawInput);
            } else {
                dom.authorChipsContainer.appendChild(chip);
            }
        });

        if (rawInput && rawInput.parentNode !== dom.authorChipsContainer) {
            dom.authorChipsContainer.appendChild(rawInput);
        }
    }

    function addAuthorTag(name) {
        const trimmed = (name || "").trim();
        if (!trimmed) return;
        if (!state.authorTags.includes(trimmed)) {
            state.authorTags.push(trimmed);
            renderAuthorChips();
        }
        if (dom.tagAuthorInput) dom.tagAuthorInput.value = "";
    }

    function removeAuthorTag(index) {
        state.authorTags.splice(index, 1);
        renderAuthorChips();
    }

    function updateBarcodeRange() {
        if (!dom.barcodeRange || !dom.copiesCount) return;
        const raw = parseInt(dom.copiesCount.value, 10);
        const isbnVal = dom.bookIsbn ? dom.bookIsbn.value.trim().replace(/[^0-9]/g, "") : "";
        const prefix = isbnVal || "9786040000000";

        if (state.editingIsbn) {
            const orig = Number(state.editingOriginalCopies || 0);
            if (isNaN(raw) || raw === orig) {
                dom.barcodeRange.textContent = `Không tạo thêm bản sao (hiện có ${orig} bản)`;
            } else if (raw < orig) {
                dom.barcodeRange.textContent = `Không thể giảm trực tiếp (hiện có ${orig} bản)`;
            } else {
                const startSeq = String(orig + 1).padStart(2, "0");
                const endSeq = String(raw).padStart(2, "0");
                dom.barcodeRange.textContent = `Bổ sung ${raw - orig} bản: dự kiến BC-${prefix}-${startSeq} ... ${endSeq}`;
            }
            return;
        }

        if (isNaN(raw) || raw <= 0) {
            dom.barcodeRange.textContent = "Chưa khởi tạo bản sao vật lý (0 bản)";
            return;
        }
        dom.barcodeRange.textContent = `Dự kiến: BC-${prefix}-01 đến BC-${prefix}-${String(raw).padStart(2, "0")}`;
    }

    // ============================================================================
    // 7. XỬ LÝ FILE ẢNH BÌA & UPLOAD (Task E)
    // ============================================================================
    function handleCoverFileSelect(file) {
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
            showNotification("Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG!", "error");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showNotification("Dung lượng file ảnh không được vượt quá 5MB!", "error");
            return;
        }

        state.selectedCoverFile = file;

        const reader = new FileReader();
        reader.onload = function (e) {
            if (dom.coverPreviewImg) {
                dom.coverPreviewImg.src = e.target.result;
                dom.coverPreviewImg.style.display = "block";
            }
        };
        reader.readAsDataURL(file);
    }

    async function uploadCoverFile(isbn, file) {
        if (!file) return null;
        const formData = new FormData();
        formData.append("file", file);

        const token = typeof auth !== "undefined" && auth.getToken ? auth.getToken() : null;
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const baseOrigin = typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL
            ? CONFIG.API_BASE_URL
            : "/api";

        const res = await axios.post(`${baseOrigin}/books/${encodeURIComponent(isbn)}/cover`, formData, { headers });
        return res.data;
    }

    // ============================================================================
    // 8. TRA CỨU TỰ ĐỘNG THÔNG TIN SÁCH TỪ ISBN (Task E)
    // ============================================================================
    async function lookupBookByIsbn() {
        if (!dom.bookIsbn) return;
        const rawIsbn = dom.bookIsbn.value.trim();
        const cleanIsbn = rawIsbn.replace(/[^0-9X]/gi, "");

        if (!cleanIsbn || cleanIsbn.length < 9) {
            showNotification("Vui lòng nhập mã ISBN hợp lệ (10 hoặc 13 chữ số) để tra cứu!", "error");
            if (dom.bookIsbn) dom.bookIsbn.focus();
            return;
        }

        if (dom.btnLookupIsbn) {
            dom.btnLookupIsbn.disabled = true;
            dom.btnLookupIsbn.innerHTML = `
                <span class="material-symbols-outlined isbn-spinner">sync</span>
                <span>Đang tìm...</span>
            `;
        }
        if (dom.isbnLookupStatus) {
            dom.isbnLookupStatus.textContent = "Đang tra cứu...";
            dom.isbnLookupStatus.style.color = "var(--color-brand)";
        }

        let bookData = null;

        // 1. Google Books API
        try {
            const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(cleanIsbn)}`;
            const resGb = await fetch(gbUrl, { headers: { "Accept": "application/json" } });
            if (resGb.ok) {
                const dataGb = await resGb.json();
                if (dataGb.items && dataGb.items.length > 0) {
                    const info = dataGb.items[0].volumeInfo || {};
                    let pubYear = null;
                    if (info.publishedDate) {
                        const m = info.publishedDate.match(/\b(19\d\d|20\d\d)\b/);
                        if (m) pubYear = parseInt(m[1], 10);
                    }
                    let coverUrl = "";
                    if (info.imageLinks) {
                        coverUrl = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || info.imageLinks.medium || "";
                        if (coverUrl.startsWith("http://")) coverUrl = coverUrl.replace(/^http:\/\//i, "https://");
                    }
                    bookData = {
                        source: "Google Books",
                        title: info.title || "",
                        authors: Array.isArray(info.authors) ? info.authors : (info.authors ? [info.authors] : []),
                        publisher: info.publisher || "",
                        publishYear: pubYear,
                        pageCount: info.pageCount || null,
                        description: info.description || "",
                        coverUrl: coverUrl
                    };
                }
            }
        } catch (err) {
            console.warn("Lỗi tra cứu Google Books:", err);
        }

        // 2. Open Library Fallback
        if (!bookData) {
            try {
                const bibKey = `ISBN:${cleanIsbn}`;
                const olUrl = `https://openlibrary.org/api/books?bibkeys=${bibKey}&format=json&jscmd=data`;
                const resOl = await fetch(olUrl, { headers: { "Accept": "application/json" } });
                if (resOl.ok) {
                    const dataOl = await resOl.json();
                    const info = dataOl[bibKey];
                    if (info) {
                        const authors = Array.isArray(info.authors) ? info.authors.map((a) => a.name).filter(Boolean) : [];
                        const publishers = Array.isArray(info.publishers) ? info.publishers.map((p) => p.name).filter(Boolean) : [];
                        let pubYear = null;
                        if (info.publish_date) {
                            const m = info.publish_date.match(/\b(19\d\d|20\d\d)\b/);
                            if (m) pubYear = parseInt(m[1], 10);
                        }
                        const coverUrl = info.cover?.large || info.cover?.medium || `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
                        bookData = {
                            source: "Open Library",
                            title: info.title || "",
                            authors: authors,
                            publisher: publishers.length > 0 ? publishers[0] : "",
                            publishYear: pubYear,
                            pageCount: info.number_of_pages || null,
                            description: typeof info.notes === "string" ? info.notes : "",
                            coverUrl: coverUrl
                        };
                    }
                }
            } catch (err) {
                console.warn("Lỗi tra cứu Open Library:", err);
            }
        }

        if (dom.btnLookupIsbn) {
            dom.btnLookupIsbn.disabled = false;
            dom.btnLookupIsbn.innerHTML = `
                <span class="material-symbols-outlined">travel_explore</span>
                <span>Tra cứu ISBN</span>
            `;
        }

        if (!bookData || !bookData.title) {
            if (dom.isbnLookupStatus) {
                dom.isbnLookupStatus.textContent = "Không tìm thấy metadata quốc tế. Bạn có thể tự nhập tay!";
                dom.isbnLookupStatus.style.color = "var(--color-warning)";
            }
            showNotification("Không tìm thấy đầu sách với ISBN này. Vui lòng tự nhập thông tin!", "warning");
            return;
        }

        if (dom.bookTitle) dom.bookTitle.value = bookData.title;
        if (bookData.authors && bookData.authors.length > 0) {
            state.authorTags = [...bookData.authors];
            renderAuthorChips();
        }
        if (bookData.publishYear && dom.bookYear) dom.bookYear.value = bookData.publishYear;
        if (bookData.pageCount && dom.bookPageCount) dom.bookPageCount.value = bookData.pageCount;
        if (bookData.description && dom.bookDescription) dom.bookDescription.value = bookData.description;

        if (bookData.coverUrl && dom.coverPreviewImg) {
            dom.coverPreviewImg.src = bookData.coverUrl;
            dom.coverPreviewImg.style.display = "block";
        }

        if (dom.isbnLookupStatus) {
            dom.isbnLookupStatus.textContent = `Đã tự điền từ ${bookData.source}! Hãy kiểm tra lại trước khi lưu.`;
            dom.isbnLookupStatus.style.color = "var(--color-success)";
        }
        showNotification(`Đã tìm thấy thông tin từ ${bookData.source}!`, "success");
    }

    // ============================================================================
    // 9. MODAL THÊM / SỬA ĐẦU SÁCH (Task A)
    // ============================================================================
    function openCreateModal() {
        state.editingIsbn = null;
        state.editingOriginalCopies = 0;
        state.selectedCoverFile = null;

        if (dom.modalBookHeading) dom.modalBookHeading.textContent = "Thêm mới đầu sách & Thiết lập bản sao";
        if (dom.modalBookBadge) {
            dom.modalBookBadge.textContent = "Chế độ: Tạo mới";
            dom.modalBookBadge.style.background = "#b1f0ce";
            dom.modalBookBadge.style.color = "#002114";
        }
        if (dom.submitBookBtn) {
            dom.submitBookBtn.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 16px;">bookmark_add</span>
                <span>Lưu &amp; Khởi tạo bản sao</span>
            `;
        }

        if (dom.bookTitle) dom.bookTitle.value = "";
        if (dom.bookIsbn) {
            dom.bookIsbn.value = "";
            dom.bookIsbn.placeholder = "Nhập ISBN (10 hoặc 13 số)...";
            dom.bookIsbn.readOnly = false;
        }
        if (dom.btnLookupIsbn) dom.btnLookupIsbn.disabled = false;
        if (dom.isbnLookupStatus) dom.isbnLookupStatus.textContent = "";

        state.authorTags = [];
        renderAuthorChips();

        if (dom.bookYear) dom.bookYear.value = new Date().getFullYear();
        if (dom.bookPageCount) dom.bookPageCount.value = 350;
        if (dom.bookPrice) dom.bookPrice.value = "";
        if (dom.bookShelf) dom.bookShelf.value = "Khu A - Kệ A3 (Kho CNTT)";
        if (dom.bookDescription) dom.bookDescription.value = "";
        if (dom.copiesCount) {
            dom.copiesCount.min = "0";
            dom.copiesCount.max = "50";
            dom.copiesCount.value = 3;
        }
        if (dom.copiesCountHint) {
            dom.copiesCountHint.textContent = "Nhập số lượng bản sao ban đầu (0–50) để tự sinh mã vạch khi tạo mới.";
        }

        if (dom.coverPreviewImg) {
            dom.coverPreviewImg.src = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80";
            dom.coverPreviewImg.style.display = "block";
        }

        updateBarcodeRange();
        if (dom.bookModalBackdrop) dom.bookModalBackdrop.classList.remove("hidden");
    }

    async function openEditModal(isbn) {
        try {
            state.editingIsbn = isbn;
            state.selectedCoverFile = null;

            const book = await api.get(`/books/${encodeURIComponent(isbn)}`);
            if (!book) {
                showNotification("Không tìm thấy thông tin đầu sách!", "error");
                return;
            }

            if (dom.modalBookHeading) dom.modalBookHeading.textContent = "Chỉnh sửa thông tin Đầu sách";
            if (dom.modalBookBadge) {
                dom.modalBookBadge.textContent = "Chế độ: Chỉnh sửa";
                dom.modalBookBadge.style.background = "#efeeeb";
                dom.modalBookBadge.style.color = "#414844";
            }
            if (dom.submitBookBtn) {
                dom.submitBookBtn.innerHTML = `
                    <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
                    <span>Lưu thay đổi</span>
                `;
            }

            if (dom.bookTitle) dom.bookTitle.value = book.title || "";
            if (dom.bookIsbn) {
                dom.bookIsbn.value = book.isbn || "";
                dom.bookIsbn.readOnly = true;
            }
            if (dom.btnLookupIsbn) dom.btnLookupIsbn.disabled = true;
            if (dom.isbnLookupStatus) dom.isbnLookupStatus.textContent = "";

            if (dom.bookCategory && book.category) {
                dom.bookCategory.value = book.category.id;
            }
            if (dom.bookPublisher && book.publisher) {
                dom.bookPublisher.value = book.publisher.id;
            }

            state.authorTags = Array.isArray(book.authors)
                ? book.authors.map(a => (typeof a === "object" ? a.name : a))
                : [];
            renderAuthorChips();

            if (dom.bookYear) dom.bookYear.value = book.publish_year || new Date().getFullYear();
            if (dom.bookPageCount) dom.bookPageCount.value = book.page_count || "";
            if (dom.bookPrice) dom.bookPrice.value = book.price != null ? Number(book.price) : 0;
            if (dom.bookShelf) {
                const shelfVal = book.shelf_location || "Khu A - Kệ A3 (Kho CNTT)";
                const hasOpt = Array.from(dom.bookShelf.options).some(o => o.value === shelfVal);
                if (!hasOpt && shelfVal) {
                    dom.bookShelf.add(new Option(shelfVal, shelfVal, true, true));
                }
                dom.bookShelf.value = shelfVal;
            }
            if (dom.bookDescription) dom.bookDescription.value = book.description || "";
            state.editingOriginalCopies = Number(book.total_copies || 0);
            if (dom.copiesCount) {
                dom.copiesCount.min = String(state.editingOriginalCopies);
                dom.copiesCount.max = String(state.editingOriginalCopies + 50);
                dom.copiesCount.value = state.editingOriginalCopies;
            }
            if (dom.copiesCountHint) {
                dom.copiesCountHint.textContent = `Hiện có ${state.editingOriginalCopies} bản sao. Chỉ hỗ trợ tăng thêm để sinh bản sao mới; để giảm/thanh lý từng cuốn vui lòng vào Quản lý bản sao.`;
            }
            if (dom.authorSelectDropdown) dom.authorSelectDropdown.value = "";

            if (dom.coverPreviewImg) {
                dom.coverPreviewImg.src = formatCoverUrl(book.cover_image);
                dom.coverPreviewImg.style.display = "block";
            }

            updateBarcodeRange();
            if (dom.bookModalBackdrop) dom.bookModalBackdrop.classList.remove("hidden");
        } catch (err) {
            console.error("Lỗi khi mở modal sửa sách:", err);
            showNotification(err.message || "Không thể tải thông tin sách.", "error");
        }
    }

    function closeBookModal(preserveReturnTarget = false) {
        if (dom.bookModalBackdrop) dom.bookModalBackdrop.classList.add("hidden");
        state.editingIsbn = null;
        state.editingOriginalCopies = 0;
        if (!preserveReturnTarget) {
            state.returnToDetailIsbn = null;
        }
        state.selectedCoverFile = null;
    }

    async function resolveAuthorIds() {
        const ids = [];
        for (const tag of state.authorTags) {
            const trimmed = tag.trim();
            if (!trimmed) continue;
            let found = state.authorsList.find(a => a.name.toLowerCase() === trimmed.toLowerCase());
            if (found) {
                ids.push(found.id);
            } else {
                try {
                    const created = await api.post("/authors", { name: trimmed });
                    if (created && created.id) {
                        state.authorsList.push(created);
                        ids.push(created.id);
                    }
                } catch (err) {
                    console.warn("Không thể tạo tác giả mới:", trimmed, err);
                }
            }
        }
        if (ids.length === 0 && state.authorsList.length > 0) {
            ids.push(state.authorsList[0].id);
        }
        return ids;
    }

    async function createBookCopiesBatch(isbn, count, shelfLocation) {
        if (!count || count <= 0) return;
        await api.post("/book_copies", {
            book_isbn: isbn,
            copies: Array.from({ length: count }, () => ({
                copy_code: "", // Backend tự sinh mã chuẩn BC-{isbn}-{seq:02d}
                shelf_location: shelfLocation || "Kệ A1",
                condition: "MỚI",
                status: "AVAILABLE"
            }))
        });
    }

    async function saveBook() {
        const title = dom.bookTitle ? dom.bookTitle.value.trim() : "";
        const rawIsbn = dom.bookIsbn ? dom.bookIsbn.value.trim() : "";
        const cleanIsbn = rawIsbn.replace(/[^0-9]/g, "");

        if (!title) {
            showNotification("Vui lòng nhập Tên đầu sách!", "error");
            if (dom.bookTitle) dom.bookTitle.focus();
            return;
        }

        if (!cleanIsbn || (cleanIsbn.length !== 10 && cleanIsbn.length !== 13)) {
            showNotification("Mã ISBN phải gồm đúng 10 hoặc 13 chữ số (VD: 9786042100001)!", "error");
            if (dom.bookIsbn) dom.bookIsbn.focus();
            return;
        }

        let categoryId = parseInt(dom.bookCategory ? dom.bookCategory.value : 0, 10);
        if (!categoryId && state.categoriesList.length > 0) categoryId = state.categoriesList[0].id;

        let publisherId = parseInt(dom.bookPublisher ? dom.bookPublisher.value : 0, 10);
        if (!publisherId && state.publishersList.length > 0) publisherId = state.publishersList[0].id;

        const publishYear = parseInt(dom.bookYear ? dom.bookYear.value : new Date().getFullYear(), 10) || new Date().getFullYear();
        const pageCount = parseInt(dom.bookPageCount ? dom.bookPageCount.value : 0, 10) || 0;
        const rawPrice = dom.bookPrice ? dom.bookPrice.value.trim() : "";
        let price = 0;
        if (rawPrice !== "") {
            price = Number(rawPrice);
            if (!Number.isFinite(price) || price < 0) {
                showNotification("Đơn giá sách phải là số không âm!", "error");
                if (dom.bookPrice) dom.bookPrice.focus();
                return;
            }
        }
        const shelfLocation = dom.bookShelf ? dom.bookShelf.value.trim() : "Kệ A1";
        const description = dom.bookDescription ? dom.bookDescription.value.trim() : "";

        const rawCopiesCount = dom.copiesCount ? dom.copiesCount.value.trim() : "";
        const parsedCopies = rawCopiesCount === "" ? 0 : Number(rawCopiesCount);
        if (!Number.isInteger(parsedCopies) || parsedCopies < 0) {
            showNotification("Số lượng bản sao vật lý phải là số nguyên không âm!", "error");
            if (dom.copiesCount) dom.copiesCount.focus();
            return;
        }

        if (state.editingIsbn) {
            const originalCopies = Number(state.editingOriginalCopies || 0);
            if (parsedCopies < originalCopies) {
                showNotification(
                    `Không thể giảm tổng số bản sao từ ${originalCopies} xuống ${parsedCopies} tại đây. Để thanh lý hoặc báo mất, vui lòng vào Quản lý bản sao.`,
                    "warning"
                );
                if (dom.copiesCount) {
                    dom.copiesCount.value = String(originalCopies);
                    dom.copiesCount.focus();
                    updateBarcodeRange();
                }
                return;
            }
            if (parsedCopies - originalCopies > 50) {
                showNotification("Chỉ có thể bổ sung tối đa 50 bản sao mỗi lần lưu!", "warning");
                if (dom.copiesCount) dom.copiesCount.focus();
                return;
            }
        } else if (parsedCopies > 50) {
            showNotification("Số lượng bản sao khởi tạo ban đầu tối đa là 50 cuốn!", "warning");
            if (dom.copiesCount) dom.copiesCount.focus();
            return;
        }

        if (dom.tagAuthorInput && dom.tagAuthorInput.value.trim()) {
            addAuthorTag(dom.tagAuthorInput.value);
        }
        const authorIds = await resolveAuthorIds();
        const returnDetailIsbn = state.returnToDetailIsbn;

        try {
            if (state.editingIsbn) {
                const editedIsbn = state.editingIsbn;
                const updatePayload = {
                    title: title,
                    category_id: categoryId,
                    publisher_id: publisherId,
                    publish_year: publishYear,
                    page_count: pageCount,
                    price: price,
                    description: description,
                    author_ids: authorIds
                };

                const updatedBook = await api.put(`/books/${encodeURIComponent(editedIsbn)}`, updatePayload);

                if (state.selectedCoverFile) {
                    try {
                        await uploadCoverFile(editedIsbn, state.selectedCoverFile);
                    } catch (coverErr) {
                        console.warn("Upload ảnh bìa thất bại:", coverErr);
                    }
                }

                const extraCopies = Math.max(0, parsedCopies - Number(state.editingOriginalCopies || 0));
                let copyErrorMsg = "";
                if (extraCopies > 0) {
                    try {
                        await createBookCopiesBatch(editedIsbn, extraCopies, shelfLocation);
                    } catch (copyErr) {
                        console.warn("Lỗi khi bổ sung bản sao:", copyErr);
                        copyErrorMsg = copyErr.message || "Lỗi kết nối API bản sao";
                    }
                }

                if (updatedBook && updatedBook.isbn) {
                    const idx = state.books.findIndex(b => b.isbn === editedIsbn);
                    if (idx !== -1) state.books[idx] = updatedBook;
                    if (state.activeDetailIsbn === editedIsbn) {
                        state.activeDetailBook = updatedBook;
                    }
                }

                if (copyErrorMsg) {
                    showNotification(`Đã lưu thông tin đầu sách, nhưng lỗi khi bổ sung ${extraCopies} bản sao: ${copyErrorMsg}`, "warning");
                } else if (extraCopies > 0) {
                    showNotification(`Đã cập nhật đầu sách "${title}" và bổ sung thêm ${extraCopies} bản sao!`, "success");
                } else {
                    showNotification(`Đã cập nhật đầu sách "${title}" thành công!`, "success");
                }
            } else {
                const createPayload = {
                    isbn: cleanIsbn,
                    title: title,
                    category_id: categoryId,
                    publisher_id: publisherId,
                    publish_year: publishYear,
                    page_count: pageCount,
                    description: description,
                    author_ids: authorIds,
                    price: price
                };

                await api.post("/books", createPayload);

                if (state.selectedCoverFile) {
                    try {
                        await uploadCoverFile(cleanIsbn, state.selectedCoverFile);
                    } catch (coverErr) {
                        console.warn("Upload ảnh bìa thất bại:", coverErr);
                    }
                }

                let copyErrorMsg = "";
                if (parsedCopies > 0) {
                    try {
                        await createBookCopiesBatch(cleanIsbn, parsedCopies, shelfLocation);
                    } catch (copyErr) {
                        console.warn("Lỗi khi tự sinh bản sao ban đầu:", copyErr);
                        copyErrorMsg = copyErr.message || "Lỗi kết nối API bản sao";
                    }
                }

                if (copyErrorMsg) {
                    showNotification(`Đã tạo đầu sách "${title}", nhưng lỗi khi khởi tạo ${parsedCopies} bản sao: ${copyErrorMsg}`, "warning");
                } else if (parsedCopies > 0) {
                    showNotification(`Đã thêm mới đầu sách "${title}" với ${parsedCopies} bản sao!`, "success");
                } else {
                    showNotification(`Đã thêm mới đầu sách "${title}" thành công!`, "success");
                }
            }

            closeBookModal(Boolean(returnDetailIsbn));
            await loadBooks();
            if (returnDetailIsbn) {
                state.returnToDetailIsbn = null;
                await openBookDetailModal(returnDetailIsbn);
            }

        } catch (err) {
            console.error("Lỗi khi lưu đầu sách:", err);
            showNotification(err.message || "Không thể lưu thông tin đầu sách. Vui lòng kiểm tra lại quyền hoặc dữ liệu.", "error");
        }
    }

    // ============================================================================
    // 10. XÓA / ẨN ĐẦU SÁCH (Task A - Modal xác nhận tinh gọn, hài hòa)
    // ============================================================================
    function openDeleteModal(isbn) {
        const book = state.books.find((b) => b.isbn === isbn);
        state.deletingIsbn = isbn;

        const title = book ? book.title : isbn;
        let authors = "Chưa cập nhật";
        if (book) {
            if (book.authors && Array.isArray(book.authors) && book.authors.length > 0) {
                authors = book.authors.map(a => a.name || a).join(", ");
            } else if (book.author_name) {
                authors = book.author_name;
            } else if (book.authors) {
                authors = String(book.authors);
            }
        }

        const copies = book ? (book.total_copies || 0) : 0;
        const coverSrc = book ? formatCoverUrl(book.cover_image) : "";

        if (dom.deleteModalBookTitle) dom.deleteModalBookTitle.textContent = title;
        if (dom.deleteModalIsbn) dom.deleteModalIsbn.textContent = `ISBN: ${isbn}`;
        if (dom.deleteModalAuthor) dom.deleteModalAuthor.textContent = `Tác giả: ${authors}`;
        if (dom.deleteModalCopies) dom.deleteModalCopies.textContent = `${copies} bản sao`;
        if (dom.deleteModalCover) {
            dom.deleteModalCover.src = coverSrc || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&q=80";
            dom.deleteModalCover.alt = title;
        }

        if (dom.deleteModalBackdrop) {
            dom.deleteModalBackdrop.classList.remove("hidden");
        }
    }

    function closeDeleteModal() {
        if (dom.deleteModalBackdrop) {
            dom.deleteModalBackdrop.classList.add("hidden");
        }
        state.deletingIsbn = null;
    }

    async function handleConfirmDelete() {
        if (!state.deletingIsbn) return;
        const isbn = state.deletingIsbn;
        const book = state.books.find((b) => b.isbn === isbn);
        const title = book ? book.title : isbn;

        if (dom.confirmDeleteModalBtn) {
            dom.confirmDeleteModalBtn.disabled = true;
            dom.confirmDeleteModalBtn.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 18px; animation: spinDelete 1s linear infinite;">progress_activity</span>
                <span>Đang xử lý...</span>
            `;
        }

        try {
            const res = await api.delete(`/books/${encodeURIComponent(isbn)}`);
            showNotification(res.message || `Đã ẩn/xóa đầu sách "${title}" khỏi danh mục.`, "success");
            closeDeleteModal();
            await loadBooks();
        } catch (err) {
            console.error("Lỗi khi xóa đầu sách:", err);
            showNotification(err.message || "Không thể xóa/ẩn đầu sách này.", "error");
        } finally {
            if (dom.confirmDeleteModalBtn) {
                dom.confirmDeleteModalBtn.disabled = false;
                dom.confirmDeleteModalBtn.innerHTML = `
                    <span class="material-symbols-outlined">delete</span>
                    <span>Xác nhận xóa</span>
                `;
            }
        }
    }

    function deleteBook(isbn) {
        openDeleteModal(isbn);
    }

    // ============================================================================
    // 10.5. MODAL 4: CHI TIẾT ĐẦU SÁCH & QUẢN TRỊ BẢN SAO (HIGH-FIDELITY MODAL)
    // ============================================================================
    function populateBookDetailModal(book, copies = []) {
        if (!book) return;
        const isbn = book.isbn || "";
        const title = book.title || "";
        const catName = (book.category && (book.category.name || book.category)) || "Chuyên ngành";
        const ddc = book.classification_number || book.ddc || "005.133";
        const pubName = (book.publisher && (book.publisher.name || book.publisher)) || "NXB Giáo Dục";
        const pubYear = book.publish_year ? ` (${book.publish_year})` : "";
        const shelf = book.shelf_location || "Tầng 1 - Kệ A3";
        const section = book.shelf_section || `Ngăn 02 (Kho ${catName})`;
        const pages = book.page_count ? `${book.page_count} trang` : "Chưa rõ";
        const language = book.language || "Tiếng Việt";
        const summary = book.description || book.summary || "Tài liệu cung cấp nền tảng kiến thức chuyên ngành theo chuẩn đào tạo, phục vụ nghiên cứu và học tập cho sinh viên và giảng viên.";
        const coverSrc = formatCoverUrl(book.cover_image);

        let authorsStr = "Chưa cập nhật";
        if (Array.isArray(book.authors) && book.authors.length > 0) {
            authorsStr = book.authors.map(a => (typeof a === "object" ? a.name : a)).join(", ");
        } else if (book.author_name) {
            authorsStr = book.author_name;
        } else if (book.authors) {
            authorsStr = String(book.authors);
        }

        let createdDate = "15/01/2024";
        if (book.created_at) {
            try {
                createdDate = new Date(book.created_at).toLocaleDateString("vi-VN");
            } catch (e) { }
        }

        // Header
        if (dom.detailCategoryBadge) dom.detailCategoryBadge.textContent = catName;
        if (dom.detailDdc) dom.detailDdc.textContent = `DDC: ${ddc}`;
        if (dom.detailIsbn) dom.detailIsbn.textContent = `ISBN: ${isbn}`;
        if (dom.detailHeaderTitle) dom.detailHeaderTitle.textContent = "Chi tiết Đầu sách & Quản trị Bản sao";

        // Left Col
        if (dom.detailCoverImg) {
            dom.detailCoverImg.src = coverSrc;
            dom.detailCoverImg.alt = title;
        }
        if (dom.detailBookCode) dom.detailBookCode.textContent = `Mã: ${isbn}`;
        if (dom.detailShelfLocation) dom.detailShelfLocation.textContent = shelf;
        if (dom.detailShelfSection) dom.detailShelfSection.textContent = section;
        if (dom.detailCreatedAt) dom.detailCreatedAt.textContent = createdDate;

        // Copies Stats
        const totalCopies = copies.length > 0 ? copies.length : (book.total_copies || 0);
        const availCopies = copies.length > 0
            ? copies.filter(c => c.status === "AVAILABLE").length
            : (book.available_copies !== undefined ? book.available_copies : totalCopies);
        const borrowedCopies = copies.length > 0
            ? copies.filter(c => c.status === "BORROWED").length
            : Math.max(0, totalCopies - availCopies);
        const reservedCopies = copies.length > 0
            ? copies.filter(c => c.status === "RESERVED" || c.status === "HOLD").length
            : 0;

        if (dom.detailCopiesTotalLabel) dom.detailCopiesTotalLabel.textContent = `Tình trạng ${totalCopies} bản sao`;
        if (dom.detailCopiesAvail) dom.detailCopiesAvail.textContent = `${availCopies} bản`;
        if (dom.detailCopiesBorrowed) dom.detailCopiesBorrowed.textContent = `${borrowedCopies} bản`;
        if (dom.detailCopiesReserved) dom.detailCopiesReserved.textContent = `${reservedCopies} bản`;

        // Right Col
        if (dom.detailBookTitle) dom.detailBookTitle.textContent = title;
        if (dom.detailAuthor) dom.detailAuthor.textContent = authorsStr;
        if (dom.detailPublisher) dom.detailPublisher.textContent = `${pubName}${pubYear}`;
        if (dom.detailPages) dom.detailPages.textContent = pages;
        if (dom.detailLanguage) dom.detailLanguage.textContent = language;
        if (dom.detailSummary) dom.detailSummary.textContent = summary;

        // Mini Copies Table
        const sampleLimit = 5;
        const sampleCount = Math.min(copies.length, sampleLimit);
        if (dom.detailCopiesTableTitle) {
            dom.detailCopiesTableTitle.textContent = copies.length > 0
                ? `Bản sao vật lý mẫu (${sampleCount}/${totalCopies} bản)`
                : `Bản sao vật lý (${totalCopies} bản)`;
        }
        if (dom.detailBarcodePrefix) dom.detailBarcodePrefix.textContent = `Prefix: ${isbn}`;

        if (dom.detailCopiesTableBody) {
            if (!copies || copies.length === 0) {
                dom.detailCopiesTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 24px; color: var(--color-muted);">
                            Chưa có dữ liệu bản sao chi tiết hoặc đang tải...
                        </td>
                    </tr>
                `;
            } else {
                let html = "";
                copies.slice(0, sampleLimit).forEach(copy => {
                    let badgeClass = "avail";
                    let statusText = "AVAILABLE";
                    if (copy.status === "BORROWED") {
                        badgeClass = "borrowed";
                        statusText = "BORROWED";
                    } else if (copy.status === "RESERVED" || copy.status === "HOLD") {
                        badgeClass = "reserved";
                        statusText = "RESERVED";
                    } else if (copy.status === "DAMAGED" || copy.status === "LOST" || copy.status === "DISPOSED") {
                        badgeClass = "damaged";
                        statusText = copy.status;
                    }

                    let copyDate = createdDate;
                    if (copy.created_at) {
                        try {
                            copyDate = new Date(copy.created_at).toLocaleDateString("vi-VN");
                        } catch (e) { }
                    }

                    html += `
                        <tr>
                            <td class="font-mono" style="font-weight: 700; color: var(--color-brand);">${escapeHtml(copy.copy_code || copy.barcode || 'BS-' + copy.id)}</td>
                            <td><span class="detail-shelf-badge">${escapeHtml(copy.shelf_location || shelf)}</span></td>
                            <td><span style="color: var(--color-green); font-weight: 500;">${escapeHtml(copy.condition || 'Tốt')}</span></td>
                            <td>
                                <span class="copy-status-badge ${badgeClass}">
                                    <span class="stat-dot dot-${badgeClass}"></span> ${statusText}
                                </span>
                            </td>
                            <td style="text-align: right;" class="font-mono text-muted">${copyDate}</td>
                        </tr>
                    `;
                });
                dom.detailCopiesTableBody.innerHTML = html;
            }
        }

        // Footer
        if (dom.detailPrice) {
            dom.detailPrice.textContent = book.price ? `${Number(book.price).toLocaleString("vi-VN")} đ` : "Theo quy chuẩn thư viện";
        }
        if (dom.detailManageCopiesBtnText) {
            dom.detailManageCopiesBtnText.textContent = `Quản lý ${totalCopies} bản sao`;
        }
    }

    async function openBookDetailModal(isbn) {
        try {
            state.activeDetailIsbn = isbn;

            // Optimistic render from in-memory cache
            const cachedBook = state.books.find(b => b.isbn === isbn);
            if (cachedBook) {
                populateBookDetailModal(cachedBook, []);
                if (dom.detailModalBackdrop) dom.detailModalBackdrop.classList.remove("hidden");
            }

            // Fetch fresh details & copies from API
            const [book, copies] = await Promise.all([
                api.get(`/books/${encodeURIComponent(isbn)}`),
                api.get("/book_copies", { book_isbn: isbn }).catch(() => [])
            ]);

            state.activeDetailBook = book || cachedBook;
            state.activeDetailCopies = Array.isArray(copies) ? copies : [];

            populateBookDetailModal(state.activeDetailBook, state.activeDetailCopies);

            if (dom.detailModalBackdrop) dom.detailModalBackdrop.classList.remove("hidden");
        } catch (err) {
            console.error("Lỗi khi mở modal xem chi tiết sách:", err);
            showNotification(err.message || "Không thể tải chi tiết đầu sách.", "error");
        }
    }

    function closeBookDetailModal() {
        if (dom.detailModalBackdrop) {
            dom.detailModalBackdrop.classList.add("hidden");
        }
        state.activeDetailIsbn = null;
        state.activeDetailBook = null;
        state.activeDetailCopies = [];
    }

    // ============================================================================
    // 11. MODAL 2: QUẢN LÝ BẢN SAO & TRẠNG THÁI (Task B & C)
    // ============================================================================
    function renderCopyConditionOptions(conditions) {
        if (!dom.newCopyCondition) return;
        const items = Array.isArray(conditions) ? conditions : [];
        if (items.length === 0) {
            dom.newCopyCondition.innerHTML = `<option value="">Không có dữ liệu tình trạng</option>`;
            return;
        }
        dom.newCopyCondition.innerHTML = items.map((item, idx) => {
            const val = typeof item === "string" ? item : (item?.value || "");
            const lbl = typeof item === "string" ? item : (item?.label || item?.value || "");
            const isDefault = val === "MỚI" || idx === 0;
            return `<option value="${escapeHtml(val)}"${isDefault ? " selected" : ""}>${escapeHtml(lbl)}</option>`;
        }).join("");
        if (items.some((i) => (typeof i === "string" ? i : i?.value) === "MỚI")) {
            dom.newCopyCondition.value = "MỚI";
        }
    }

    async function loadCopyConditions() {
        try {
            const data = await api.get("/book_copies/conditions");
            state.copyConditionsList = Array.isArray(data) ? data : [];
            renderCopyConditionOptions(state.copyConditionsList);
        } catch (err) {
            console.warn("Không thể tải tình trạng bản sao từ DB:", err);
            if (dom.newCopyCondition && dom.newCopyCondition.options.length <= 1 && !dom.newCopyCondition.value) {
                dom.newCopyCondition.innerHTML = `<option value="">Không tải được dữ liệu từ DB</option>`;
            }
        }
    }

    async function openCopiesModal(isbn) {
        try {
            state.activeCopiesBookIsbn = isbn;
            state.copiesFilter = "ALL";
            state.copiesSearch = "";
            state.copiesPage = 1;
            state.activeCopyForStatus = null;

            const [book, copies] = await Promise.all([
                api.get(`/books/${encodeURIComponent(isbn)}`),
                api.get("/book_copies", { book_isbn: isbn }),
                state.copyConditionsList.length === 0 ? loadCopyConditions() : Promise.resolve()
            ]);

            state.activeCopiesBook = book;
            state.activeCopiesList = Array.isArray(copies) ? copies : [];

            if (dom.copiesModalBookId) dom.copiesModalBookId.textContent = book.isbn;
            if (dom.copiesModalIsbn) dom.copiesModalIsbn.textContent = `ISBN: ${book.isbn}`;
            const catName = book.category?.name || "Chuyên ngành";
            if (dom.copiesModalDdc) dom.copiesModalDdc.textContent = `Thể loại: ${catName}`;
            if (dom.copiesModalTitle) dom.copiesModalTitle.textContent = "Quản lý Bản sao & Trạng thái";
            if (dom.copiesModalBookTitle) dom.copiesModalBookTitle.textContent = book.title;
            const pubName = book.publisher?.name || "KS25";
            if (dom.copiesModalEdition) dom.copiesModalEdition.textContent = `NXB: ${pubName} (${book.publish_year || "Mới"})`;
            if (dom.copiesModalShelf) dom.copiesModalShelf.textContent = book.shelf_location || "Kệ A1";

            if (dom.tab1Count) dom.tab1Count.textContent = state.activeCopiesList.length;
            if (dom.copiesSearchInput) dom.copiesSearchInput.value = "";

            if (dom.addCopyDrawer) dom.addCopyDrawer.classList.add("hidden");
            if (dom.quickStatusDrawer) dom.quickStatusDrawer.classList.add("hidden");

            updateCopiesSummaryPills();
            renderCopiesTable();
            switchModalTab("tab1");

            if (dom.copiesModalBackdrop) dom.copiesModalBackdrop.classList.remove("hidden");
        } catch (err) {
            console.error("Lỗi khi mở modal bản sao:", err);
            showNotification(err.message || "Không thể tải danh sách bản sao cho đầu sách này.", "error");
        }
    }

    async function refreshCopiesModal() {
        if (!state.activeCopiesBookIsbn) return;
        try {
            const copies = await api.get("/book_copies", { book_isbn: state.activeCopiesBookIsbn });
            state.activeCopiesList = Array.isArray(copies) ? copies : [];
            if (dom.tab1Count) dom.tab1Count.textContent = state.activeCopiesList.length;
            updateCopiesSummaryPills();
            renderCopiesTable();
            if (dom.contentTab2 && !dom.contentTab2.classList.contains("hidden")) {
                await renderAuditTimeline();
            }
        } catch (err) {
            console.warn("Lỗi làm mới bản sao:", err);
        }
    }

    function closeCopiesModal() {
        if (dom.copiesModalBackdrop) dom.copiesModalBackdrop.classList.add("hidden");
        if (dom.addCopyDrawer) dom.addCopyDrawer.classList.add("hidden");
        if (dom.quickStatusDrawer) dom.quickStatusDrawer.classList.add("hidden");
        state.activeCopiesBook = null;
        state.activeCopiesList = [];
    }

    function switchModalTab(tabName) {
        if (tabName === "tab1") {
            if (dom.btnTab1) dom.btnTab1.classList.add("active");
            if (dom.btnTab2) dom.btnTab2.classList.remove("active");
            if (dom.contentTab1) dom.contentTab1.classList.remove("hidden");
            if (dom.contentTab2) dom.contentTab2.classList.add("hidden");
        } else {
            if (dom.btnTab1) dom.btnTab1.classList.remove("active");
            if (dom.btnTab2) dom.btnTab2.classList.add("active");
            if (dom.contentTab1) dom.contentTab1.classList.add("hidden");
            if (dom.contentTab2) dom.contentTab2.classList.remove("hidden");
            renderAuditTimeline();
        }
    }

    function updateCopiesSummaryPills() {
        const copies = state.activeCopiesList || [];
        const total = copies.length;
        const avail = copies.filter((c) => c.status === "AVAILABLE").length;
        const borrowed = copies.filter((c) => c.status === "BORROWED").length;
        const damaged = copies.filter((c) => c.status === "DAMAGED").length;
        const lost = copies.filter((c) => c.status === "LOST" || c.status === "DISPOSED").length;

        if (dom.copiesModalTotalSummary) dom.copiesModalTotalSummary.textContent = `${total} bản sao:`;
        if (dom.statCountAvailable) dom.statCountAvailable.textContent = `${avail} Khả dụng`;
        if (dom.statCountBorrowed) dom.statCountBorrowed.textContent = `${borrowed} Đang mượn`;
        if (dom.statCountDamaged) dom.statCountDamaged.textContent = `${damaged} Hư hỏng`;
        if (dom.statCountMaintenance) dom.statCountMaintenance.textContent = `${lost} Mất/Thanh lý`;

        if (dom.filterCountAll) dom.filterCountAll.textContent = total;
        if (dom.filterCountAvailable) dom.filterCountAvailable.textContent = avail;
        if (dom.filterCountBorrowed) dom.filterCountBorrowed.textContent = borrowed;
        if (dom.filterCountIssues) dom.filterCountIssues.textContent = damaged + lost;
    }

    function setCopiesFilter(filterKey) {
        state.copiesFilter = filterKey;
        state.copiesPage = 1;

        [dom.filterBtnAll, dom.filterBtnAvailable, dom.filterBtnBorrowed, dom.filterBtnIssues].forEach((btn) => {
            if (btn) btn.classList.remove("active");
        });

        if (filterKey === "ALL" && dom.filterBtnAll) dom.filterBtnAll.classList.add("active");
        if (filterKey === "AVAILABLE" && dom.filterBtnAvailable) dom.filterBtnAvailable.classList.add("active");
        if (filterKey === "BORROWED" && dom.filterBtnBorrowed) dom.filterBtnBorrowed.classList.add("active");
        if (filterKey === "ISSUES" && dom.filterBtnIssues) dom.filterBtnIssues.classList.add("active");

        renderCopiesTable();
    }

    function renderCopiesTable() {
        if (!dom.copiesTableBody) return;
        const copies = state.activeCopiesList || [];

        const term = (state.copiesSearch || "").toLowerCase().trim();
        const filtered = copies.filter((c) => {
            if (term && !(c.copy_code || "").toLowerCase().includes(term) && !(c.shelf_location || "").toLowerCase().includes(term)) {
                return false;
            }
            if (state.copiesFilter === "AVAILABLE") return c.status === "AVAILABLE";
            if (state.copiesFilter === "BORROWED") return c.status === "BORROWED";
            if (state.copiesFilter === "ISSUES") return ["DAMAGED", "LOST", "DISPOSED"].includes(c.status);
            return true;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / state.copiesPageSize) || 1;
        if (state.copiesPage > totalPages) state.copiesPage = totalPages;

        const startIndex = (state.copiesPage - 1) * state.copiesPageSize;
        const pageItems = filtered.slice(startIndex, startIndex + state.copiesPageSize);

        if (dom.copiesPaginationInfo) {
            dom.copiesPaginationInfo.textContent = totalItems === 0
                ? "Không có bản sao nào"
                : `Hiển thị ${startIndex + 1} - ${Math.min(startIndex + state.copiesPageSize, totalItems)} trên ${totalItems} bản sao`;
        }

        if (totalItems === 0) {
            dom.copiesTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 32px 0; color: var(--color-muted);">
                        Không tìm thấy bản sao nào theo tiêu chí lọc.
                    </td>
                </tr>
            `;
            if (dom.copiesPaginationControls) dom.copiesPaginationControls.innerHTML = "";
            return;
        }

        let html = "";
        pageItems.forEach((copy) => {
            let statusPill = "";
            if (copy.status === "AVAILABLE") {
                statusPill = `<span class="badge-status-hfd avail"><span class="dot"></span> Khả dụng</span>`;
            } else if (copy.status === "BORROWED") {
                statusPill = `<span class="badge-status-hfd borrowed"><span class="dot"></span> Đang mượn</span>`;
            } else if (copy.status === "RESERVED") {
                statusPill = `<span class="badge-status-hfd reserved"><span class="dot"></span> Đã đặt trước</span>`;
            } else if (copy.status === "DAMAGED") {
                statusPill = `<span class="badge-status-hfd damaged"><span class="dot"></span> Hư hỏng</span>`;
            } else if (copy.status === "LOST") {
                statusPill = `<span class="badge-status-hfd lost"><span class="dot"></span> Báo mất</span>`;
            } else if (copy.status === "DISPOSED") {
                statusPill = `<span class="badge-status-hfd disposed"><span class="dot"></span> Đã thanh lý</span>`;
            } else {
                statusPill = `<span class="badge-status-hfd">${escapeHtml(copy.status)}</span>`;
            }

            html += `
                <tr>
                    <td>
                        <span class="copy-code-main">${escapeHtml(copy.copy_code)}</span>
                        <span class="copy-barcode-sub">ID: #${copy.id}</span>
                    </td>
                    <td>
                        <span class="shelf-primary">${escapeHtml(copy.shelf_location || "Kệ A1")}</span>
                    </td>
                    <td>
                        <span class="condition-note">${escapeHtml(copy.condition || "MỚI")}</span>
                    </td>
                    <td>
                        ${statusPill}
                    </td>
                    <td class="text-right">
                        <button type="button" class="btn-table-status" onclick="window.booksApp.openQuickStatusDrawer(${copy.id})">
                            Đổi trạng thái
                        </button>
                    </td>
                </tr>
            `;
        });

        dom.copiesTableBody.innerHTML = html;
        renderCopiesPagination(totalPages);
    }

    function renderCopiesPagination(totalPages) {
        if (!dom.copiesPaginationControls) return;
        if (totalPages <= 1) {
            dom.copiesPaginationControls.innerHTML = "";
            return;
        }

        let html = "";
        html += `
            <button type="button" class="page-btn" ${state.copiesPage === 1 ? "disabled" : ""} onclick="window.booksApp.setCopiesPage(${state.copiesPage - 1})">
                &lsaquo;
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            html += `
                <button type="button" class="page-btn ${i === state.copiesPage ? "active" : ""}" onclick="window.booksApp.setCopiesPage(${i})">
                    ${i}
                </button>
            `;
        }

        html += `
            <button type="button" class="page-btn ${state.copiesPage === totalPages ? "disabled" : ""} onclick="window.booksApp.setCopiesPage(${state.copiesPage + 1})">
                &rsaquo;
            </button>
        `;

        dom.copiesPaginationControls.innerHTML = html;
    }

    function setCopiesPage(p) {
        state.copiesPage = p;
        renderCopiesTable();
    }

    // ============================================================================
    // 12. DRAWER THÊM NHIỀU BẢN SAO CHO ĐẦU SÁCH (Task B)
    // ============================================================================
    function toggleAddCopyDrawer() {
        if (!dom.addCopyDrawer) return;
        const isHidden = dom.addCopyDrawer.classList.contains("hidden");
        if (isHidden) {
            dom.addCopyDrawer.classList.remove("hidden");
            if (state.copyConditionsList.length === 0) {
                loadCopyConditions();
            } else if (dom.newCopyCondition && state.copyConditionsList.some((i) => (typeof i === "string" ? i : i?.value) === "MỚI")) {
                dom.newCopyCondition.value = "MỚI";
            }
            if (dom.newCopyQty) dom.newCopyQty.focus();
        } else {
            dom.addCopyDrawer.classList.add("hidden");
        }
    }

    async function submitAddCopy() {
        const isbn = state.activeCopiesBookIsbn;
        if (!isbn) return;

        const qty = parseInt(dom.newCopyQty ? dom.newCopyQty.value : 1, 10) || 1;
        const shelf = (dom.newCopyShelf ? dom.newCopyShelf.value.trim() : "") || "Kệ A1";
        const rawCond = dom.newCopyCondition ? dom.newCopyCondition.value.trim() : "";
        if (!rawCond) {
            showNotification("Không có dữ liệu tình trạng từ database. Vui lòng thử tải lại!", "warning");
            await loadCopyConditions();
            return;
        }
        const cond = mapConditionToBackend(rawCond);

        if (qty < 1 || qty > 50) {
            showNotification("Số lượng bản sao bổ sung phải từ 1 đến 50!", "warning");
            return;
        }

        try {
            const payload = {
                book_isbn: isbn,
                copies: Array.from({ length: qty }, () => ({
                    copy_code: "", // Backend tự sinh mã chuẩn BC-{isbn}-{seq:02d}
                    shelf_location: shelf,
                    condition: cond,
                    status: "AVAILABLE"
                }))
            };

            await api.post("/book_copies", payload);
            showNotification(`Đã thêm thành công ${qty} bản sao vào kho cho đầu sách!`, "success");

            if (dom.addCopyDrawer) dom.addCopyDrawer.classList.add("hidden");
            await refreshCopiesModal();
            await loadBooks();
        } catch (err) {
            console.error("Lỗi khi thêm bản sao:", err);
            showNotification(err.message || "Không thể thêm bản sao.", "error");
        }
    }

    // ============================================================================
    // 13. DRAWER BÁO MẤT / BÁO HỎNG / THANH LÝ BẢN SAO (Task C)
    // ============================================================================
    function openQuickStatusDrawer(copyId) {
        const copy = (state.activeCopiesList || []).find((c) => c.id === copyId);
        if (!copy) return;

        state.activeCopyForStatus = copy;

        if (dom.quickStatusCopyCode) dom.quickStatusCopyCode.textContent = copy.copy_code;
        if (dom.quickStatusTicket) dom.quickStatusTicket.textContent = `Phiếu: #COPY-ID-${copy.id}`;

        const validTransitions = {
            AVAILABLE: ["BORROWED", "RESERVED", "LOST", "DAMAGED", "DISPOSED"],
            BORROWED: ["AVAILABLE", "LOST", "DAMAGED"],
            RESERVED: ["AVAILABLE", "BORROWED", "LOST", "DAMAGED"],
            LOST: ["AVAILABLE", "DISPOSED"],
            DAMAGED: ["AVAILABLE", "DISPOSED"],
            DISPOSED: []
        };

        const allowed = validTransitions[copy.status] || [];

        if (dom.quickStatusSelect) {
            Array.from(dom.quickStatusSelect.options).forEach((opt) => {
                const baseText = opt.textContent.replace(" (Hiện tại)", "").replace(" (Không cho phép)", "");
                if (opt.value === copy.status) {
                    opt.disabled = true;
                    opt.textContent = `${baseText} (Hiện tại)`;
                } else if (allowed.includes(opt.value)) {
                    opt.disabled = false;
                    opt.textContent = baseText;
                } else {
                    opt.disabled = true;
                    opt.textContent = `${baseText} (Không cho phép)`;
                }
            });

            // Chọn giá trị hợp lệ đầu tiên
            if (allowed.length > 0) {
                dom.quickStatusSelect.value = allowed[0];
            } else {
                dom.quickStatusSelect.value = copy.status;
            }
        }

        if (dom.saveQuickStatusBtn) {
            if (copy.status === "DISPOSED" || allowed.length === 0) {
                dom.saveQuickStatusBtn.disabled = true;
                dom.saveQuickStatusBtn.title = "Bản sao đã thanh lý không thể đổi trạng thái";
            } else {
                dom.saveQuickStatusBtn.disabled = false;
                dom.saveQuickStatusBtn.title = "";
            }
        }

        if (dom.quickStatusReason) {
            if (dom.quickStatusReason.tagName === "SELECT") {
                dom.quickStatusReason.selectedIndex = 0;
            } else {
                dom.quickStatusReason.value = "";
                dom.quickStatusReason.placeholder = "Nhập lý do chi tiết (bắt buộc khi báo hỏng/mất/thanh lý)...";
            }
            dom.quickStatusReason.focus();
        }

        if (dom.quickStatusDrawer) {
            dom.quickStatusDrawer.classList.remove("hidden");
            dom.quickStatusDrawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    function closeQuickStatusDrawer() {
        if (dom.quickStatusDrawer) dom.quickStatusDrawer.classList.add("hidden");
        state.activeCopyForStatus = null;
    }

    async function saveQuickStatus() {
        const copy = state.activeCopyForStatus;
        if (!copy) return;

        const newStatus = dom.quickStatusSelect ? dom.quickStatusSelect.value : "AVAILABLE";
        const reason = (dom.quickStatusReason ? dom.quickStatusReason.value.trim() : "");

        if (newStatus === copy.status) {
            showNotification("Vui lòng chọn trạng thái mới khác trạng thái hiện tại!", "error");
            return;
        }

        if (["DAMAGED", "LOST", "DISPOSED"].includes(newStatus) && !reason) {
            showNotification("Vui lòng nhập lý do và ghi chú nghiệp vụ để lưu vào lịch sử!", "error");
            if (dom.quickStatusReason) dom.quickStatusReason.focus();
            return;
        }

        try {
            if (newStatus === "DAMAGED") {
                await api.patch(`/book_copies/${copy.id}/report-damaged`, { reason: reason || "Báo hỏng sách" });
            } else if (newStatus === "LOST") {
                await api.patch(`/book_copies/${copy.id}/report-lost`, { reason: reason || "Báo mất sách" });
            } else if (newStatus === "DISPOSED") {
                await api.patch(`/book_copies/${copy.id}/dispose`, { reason: reason || "Thanh lý sách" });
            } else {
                await api.put(`/book_copies/${copy.id}`, {
                    status: newStatus,
                    ...(newStatus === "AVAILABLE" ? { condition: "MỚI" } : {})
                });
            }

            showNotification(`Đã cập nhật trạng thái bản sao ${copy.copy_code} thành công!`, "success");
            closeQuickStatusDrawer();
            await refreshCopiesModal();
            await loadBooks();
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái bản sao:", err);
            showNotification(err.message || "Không thể cập nhật trạng thái bản sao theo quy tắc của hệ thống.", "error");
        }
    }

    // ============================================================================
    // 14. TAB 2: LỊCH SỬ THAY ĐỔI TRẠNG THÁI (Task C)
    // ============================================================================
    async function renderAuditTimeline() {
        if (!dom.auditTimelineContainer) return;
        dom.auditTimelineContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--color-brand);">Đang tải lịch sử trạng thái...</div>`;

        try {
            const copies = state.activeCopiesList || [];
            if (copies.length === 0) {
                dom.auditTimelineContainer.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: var(--color-muted);">
                        Chưa có bản sao nào để hiển thị lịch sử biến động.
                    </div>
                `;
                return;
            }

            const logPromises = copies.map(c =>
                api.get(`/book_copies/${c.id}/history`).catch(() => [])
            );
            const results = await Promise.all(logPromises);
            const allLogs = results.flat();

            allLogs.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));

            if (allLogs.length === 0) {
                dom.auditTimelineContainer.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: var(--color-muted);">
                        Chưa có sự kiện thay đổi trạng thái nào cho các bản sao của đầu sách này.
                    </div>
                `;
                return;
            }

            let html = "";
            allLogs.forEach(log => {
                const timeStr = new Date(log.changed_at).toLocaleString("vi-VN");
                const isDanger = log.new_status === "DAMAGED" || log.new_status === "LOST";
                const isSuccess = log.new_status === "AVAILABLE";
                const nodeClass = isDanger ? "node-danger" : (isSuccess ? "node-success" : "node-primary");
                const iconName = isSuccess ? "check_circle" : (isDanger ? "warning" : "sync");

                html += `
                    <div class="audit-event-card">
                        <div class="audit-node-icon ${nodeClass}">
                            <span class="material-symbols-outlined">${iconName}</span>
                        </div>
                        <div class="audit-event-header">
                            <span class="audit-copy-tag ${isDanger ? "tag-danger" : ""}">Bản sao ID: #${log.book_copy_id}</span>
                            <span class="audit-time">${timeStr}</span>
                        </div>
                        <div class="audit-transition">
                            <span>${escapeHtml(log.old_status)}</span>
                            <span class="material-symbols-outlined">arrow_forward</span>
                            <strong>${escapeHtml(log.new_status)}</strong>
                        </div>
                        <div class="audit-desc">${escapeHtml(log.reason || "Không ghi chú")}</div>
                    </div>
                `;
            });

            dom.auditTimelineContainer.innerHTML = html;
        } catch (err) {
            console.error("Lỗi khi tải lịch sử trạng thái bản sao:", err);
            dom.auditTimelineContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--color-error);">
                    Không thể tải lịch sử trạng thái từ máy chủ.
                </div>
            `;
        }
    }

    // ============================================================================
    // 15. IN TEM MÃ VẠCH & XUẤT CSV / EXCEL
    // ============================================================================
    function printBatchBarcodes() {
        const book = state.activeCopiesBook;
        const copies = state.activeCopiesList || [];
        if (!book || copies.length === 0) {
            showNotification("Không có bản sao nào để in tem mã vạch!", "warning");
            return;
        }

        const printWin = window.open("", "_blank", "width=800,height=600");
        if (!printWin) {
            showNotification("Trình duyệt đã chặn popup, vui lòng cho phép để in tem!", "error");
            return;
        }

        let labelsHtml = "";
        copies.forEach((copy) => {
            labelsHtml += `
                <div style="border: 1px dashed #333; padding: 12px; margin: 8px; width: 220px; font-family: monospace; display: inline-block; vertical-align: top; text-align: center; border-radius: 6px;">
                    <div style="font-weight: bold; font-size: 13px; color: #1B4332;">THƯ VIỆN KS25</div>
                    <div style="font-size: 11px; margin: 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(book.title)}</div>
                    <div style="font-size: 20px; letter-spacing: 2px; margin: 6px 0; font-weight: bold;">|||| | || |||||</div>
                    <div style="font-size: 12px; font-weight: bold;">${escapeHtml(copy.copy_code)}</div>
                    <div style="font-size: 10px; color: #555;">Kệ: ${escapeHtml(copy.shelf_location || "A1")} • ${escapeHtml(copy.condition || "MỚI")}</div>
                </div>
            `;
        });

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>In Tem Mã Vạch - ${escapeHtml(book.isbn)}</title>
                <style>
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body style="font-family: sans-serif; padding: 20px;">
                <h3 style="margin-top: 0; color: #1B4332;">DANH MỤC TEM MÃ VẠCH BẢN SAO</h3>
                <p style="font-size: 12px; color: #666;">Đầu sách: <strong>${escapeHtml(book.title)}</strong> | ISBN: ${escapeHtml(book.isbn)}</p>
                <hr style="border: 0; border-top: 1px solid #ccc; margin-bottom: 16px;">
                <div>${labelsHtml}</div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    }

    function exportCopiesCsv() {
        const book = state.activeCopiesBook;
        const copies = state.activeCopiesList || [];
        if (!book || copies.length === 0) {
            showNotification("Không có dữ liệu bản sao để xuất CSV!", "warning");
            return;
        }

        const headers = ["Mã bản sao", "Vị trí kệ", "Tình trạng", "Trạng thái lưu thông"];
        const rows = copies.map((c) => [
            `"${c.copy_code}"`,
            `"${c.shelf_location || ""}"`,
            `"${c.condition || ""}"`,
            `"${c.status || ""}"`
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `BanSao_${book.isbn}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`Đã xuất danh sách bản sao của sách "${book.title}" thành file CSV!`, "success");
    }

    function exportToExcel() {
        if (!state.books || state.books.length === 0) {
            showNotification("Không có dữ liệu để xuất Excel!", "warning");
            return;
        }

        const headers = ["ISBN", "Tên sách", "Chuyên ngành", "Tác giả", "Nhà xuất bản", "Năm XB", "Tổng bản sao", "Khả dụng", "Vị trí kệ"];
        const rows = state.books.map((b) => {
            const authorStr = Array.isArray(b.authors) ? b.authors.map(a => (typeof a === "object" ? a.name : a)).join("; ") : (b.authors || "");
            const pubStr = b.publisher ? (b.publisher.name || b.publisher) : "";
            const catStr = b.category ? (b.category.name || b.category) : "";
            return [
                `"${b.isbn}"`,
                `"${(b.title || "").replace(/"/g, '""')}"`,
                `"${catStr}"`,
                `"${authorStr.replace(/"/g, '""')}"`,
                `"${pubStr}"`,
                b.publish_year || "",
                b.total_copies || 0,
                b.available_copies || 0,
                `"${b.shelf_location || ""}"`
            ];
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `UniLib_Books_Catalog_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification("Đã xuất danh mục đầu sách ra tệp CSV (Excel) thành công!", "success");
    }

    function viewPdfDoc(logId) {
        showNotification(`Đang mở biên bản kiểm định sự cố #${logId || "BL-2025"}...`, "info");
    }

    // ============================================================================
    // KIỂM TRA QUYỀN NHÂN VIÊN (ADMIN / LIBRARIAN) & TẢI HỒ SƠ TOPBAR
    // ============================================================================
    function getSessionAuthInfo() {
        let token = null;
        let user = null;
        if (typeof auth !== "undefined") {
            token = typeof auth.getToken === "function" ? auth.getToken() : null;
            user = typeof auth.getUser === "function" ? auth.getUser() : null;
        }
        if (!token) {
            token =
                localStorage.getItem("access_token") ||
                localStorage.getItem("token") ||
                sessionStorage.getItem("access_token") ||
                null;
        }
        if (!user) {
            try {
                const raw = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
                if (raw) user = JSON.parse(raw);
            } catch (e) {
                user = null;
            }
        }
        return { token, user };
    }

    function updateBooksTopbarUser(user) {
        const userProfileBtn = document.getElementById("userProfileBtn");
        const avatarEl = document.getElementById("userAvatar") || (userProfileBtn ? userProfileBtn.querySelector(".librarian-avatar") : null);
        const nameEl = document.getElementById("userName") || (userProfileBtn ? userProfileBtn.querySelector(".librarian-name") : null);
        const roleEl = document.getElementById("userRole") || (userProfileBtn ? userProfileBtn.querySelector(".librarian-role") : null);
        const dropdownMenu = document.getElementById("userDropdownMenu");

        function mapRoleLabel(role) {
            if (!role) return "Độc giả";
            const r = String(role).toUpperCase();
            if (r === "ADMIN") return "Quản trị viên";
            if (r === "LIBRARIAN") return "Thủ thư trực quầy";
            if (r === "READER") return "Độc giả";
            return role;
        }

        if (!user) {
            if (avatarEl) avatarEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">person</span>';
            if (nameEl) nameEl.textContent = "Chưa đăng nhập";
            if (roleEl) roleEl.textContent = "Bấm để đăng nhập";
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

        const fullName = user.full_name || user.name || user.email || "Người dùng";
        const roleText = mapRoleLabel(user.role);
        const initial = (fullName.trim().charAt(0) || "U").toUpperCase();

        if (avatarEl) avatarEl.textContent = initial;
        if (nameEl) nameEl.textContent = fullName;
        if (roleEl) roleEl.textContent = roleText;

        if (dropdownMenu) {
            dropdownMenu.innerHTML = `
                <a href="profile.html" class="dropdown-item">
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

    function renderBooksAuthGuard(codeText, reasonTitle, reasonDesc, ctaLabel, ctaHref, isForbidden) {
        const sidebar = document.getElementById("app-sidebar");
        if (sidebar) sidebar.style.display = "none";
        const wrapper = document.querySelector(".books-workspace-wrapper");
        if (wrapper) wrapper.style.paddingLeft = "0";

        const container = document.querySelector(".books-main-container");
        if (!container) return;

        const iconName = isForbidden ? "block" : "lock";
        const secondaryHtml = isForbidden
            ? `<a href="login.html#login" id="btn-guard-switch-acc" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;border:1px solid var(--color-border,#E6E2D8);background:#fff;color:var(--color-text-primary,#1A202C);font-weight:600;font-size:14px;text-decoration:none;">Đổi tài khoản khác</a>`
            : `<a href="home.html" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;border:1px solid var(--color-border,#E6E2D8);background:#fff;color:var(--color-text-primary,#1A202C);font-weight:600;font-size:14px;text-decoration:none;">Về Trang chủ</a>`;

        container.innerHTML = `
            <div style="max-width:560px;margin:48px auto;padding:34px 32px;background:var(--color-surface,#FFFFFF);border:1px solid var(--color-border,#E6E2D8);border-radius:var(--radius-card,12px);box-shadow:var(--shadow-card,0 1px 3px rgba(27,67,50,0.06));text-align:center;">
                <div style="width:56px;height:56px;margin:0 auto 14px;border-radius:50%;background:var(--color-danger-bg,#FEF2F2);color:#DC2626;display:flex;align-items:center;justify-content:center;">
                    <span class="material-symbols-outlined" style="font-size:28px;">${iconName}</span>
                </div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--color-text-secondary,#718096);margin-bottom:6px;">${escapeHtml(codeText)}</div>
                <h2 style="font-family:'Newsreader',Georgia,serif;margin:0 0 8px;color:var(--color-brand,#1B4332);font-size:24px;">${escapeHtml(reasonTitle)}</h2>
                <p style="margin:0 0 24px;color:var(--color-text-secondary,#718096);font-size:14px;line-height:1.55;">${escapeHtml(reasonDesc)}</p>
                <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
                    <a href="${ctaHref}" style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:8px;background:var(--color-brand,#1B4332);color:#fff;font-weight:600;font-size:14px;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                    ${secondaryHtml}
                </div>
            </div>
        `;

        const switchBtn = document.getElementById("btn-guard-switch-acc");
        if (switchBtn) {
            switchBtn.addEventListener("click", () => {
                if (typeof auth !== "undefined" && typeof auth.clearSession === "function") {
                    auth.clearSession();
                } else {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("token");
                    localStorage.removeItem("user_info");
                    sessionStorage.removeItem("access_token");
                    sessionStorage.removeItem("user_info");
                }
            });
        }
    }

    function enforceBooksStaffGuard(userOverride = undefined) {
        const session = getSessionAuthInfo();
        const activeUser = userOverride !== undefined ? userOverride : session.user;

        if (!session.token || !activeUser) {
            try { sessionStorage.setItem("redirect_after_login", window.location.href); } catch (_) { }
            updateBooksTopbarUser(null);
            renderBooksAuthGuard(
                "HTTP 401 · UNAUTHORIZED",
                "Yêu cầu đăng nhập Thủ thư / Admin",
                "Trang Quản lý Đầu sách & Bản sao yêu cầu tài khoản Thủ thư (LIBRARIAN) hoặc Quản trị viên (ADMIN).",
                "Đăng nhập ngay →",
                "login.html#login",
                false
            );
            return null;
        }

        const role = String(activeUser.role || "").toUpperCase();
        if (!["ADMIN", "LIBRARIAN"].includes(role)) {
            updateBooksTopbarUser(activeUser);
            renderBooksAuthGuard(
                "HTTP 403 · FORBIDDEN",
                "Không đủ quyền truy cập (403)",
                `Tài khoản "${activeUser.full_name || activeUser.email}" (${role || "READER"}) không có quyền quản lý đầu sách & bản sao.`,
                "Về Cổng Độc giả →",
                "home.html",
                true
            );
            return null;
        }

        updateBooksTopbarUser(activeUser);
        return activeUser;
    }

    async function loadUserProfile() {
        const { token, user: cachedUser } = getSessionAuthInfo();
        if (cachedUser) {
            updateBooksTopbarUser(cachedUser);
        }
        if (!token) return null;

        try {
            let freshUser = null;
            if (typeof auth !== "undefined" && typeof auth.syncSession === "function") {
                freshUser = await auth.syncSession();
            } else if (typeof api !== "undefined" && typeof api.get === "function") {
                freshUser = await api.get("/auth/me");
                if (freshUser) {
                    if (typeof auth !== "undefined" && typeof auth.setUser === "function") {
                        auth.setUser(freshUser);
                    } else {
                        localStorage.setItem("user_info", JSON.stringify(freshUser));
                    }
                }
            } else {
                const baseUrl = (typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : "http://127.0.0.1:8000/api";
                const res = await fetch(baseUrl + "/auth/me", {
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    }
                });
                if (res.ok) {
                    freshUser = await res.json();
                    localStorage.setItem("user_info", JSON.stringify(freshUser));
                }
            }

            if (!freshUser) {
                const latest = getSessionAuthInfo();
                if (!latest.token || !latest.user) {
                    return enforceBooksStaffGuard(null);
                }
                return enforceBooksStaffGuard(latest.user);
            }
            return enforceBooksStaffGuard(freshUser);
        } catch (err) {
            console.warn("Không thể đồng bộ hồ sơ user từ database:", err);
            return cachedUser;
        }
    }

    // ============================================================================
    // HỘP THOẠI XÁC NHẬN CHUNG / ĐĂNG XUẤT (showConfirm - ĐỒNG BỘ LOAN_MANAGEMENT)
    // ============================================================================
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

    // ============================================================================
    // 16. THIẾT LẬP CÁC SỰ KIỆN GIAO DIỆN (EVENT LISTENERS)
    // ============================================================================
    function initEventListeners() {
        // Tìm kiếm & Lọc theo API backend /books/search
        let searchDebounceTimer = null;
        if (dom.filterSearchInput) {
            dom.filterSearchInput.addEventListener("input", (e) => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    state.searchTerm = e.target.value.trim();
                    state.currentPage = 1;
                    loadBooks();
                }, 350);
            });
            dom.filterSearchInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    clearTimeout(searchDebounceTimer);
                    state.searchTerm = dom.filterSearchInput.value.trim();
                    state.currentPage = 1;
                    loadBooks();
                }
            });
        }

        if (dom.filterCategory) {
            dom.filterCategory.addEventListener("change", (e) => {
                state.selectedCategory = e.target.value;
                state.currentPage = 1;
                loadBooks();
            });
        }

        if (dom.filterStatus) {
            dom.filterStatus.addEventListener("change", (e) => {
                state.selectedStatus = e.target.value;
                state.currentPage = 1;
                loadBooks();
            });
        }

        if (dom.btnResetFilter) {
            dom.btnResetFilter.addEventListener("click", () => {
                if (dom.filterSearchInput) dom.filterSearchInput.value = "";
                if (dom.filterCategory) dom.filterCategory.value = "";
                if (dom.filterStatus) dom.filterStatus.value = "";
                state.searchTerm = "";
                state.selectedCategory = "";
                state.selectedStatus = "";
                state.currentPage = 1;
                loadBooks();
            });
        }

        // Mở Modal Tạo sách
        if (dom.btnOpenCreateBook) {
            dom.btnOpenCreateBook.addEventListener("click", openCreateModal);
        }

        // Đóng Modal Sách
        if (dom.closeModalBtn) dom.closeModalBtn.addEventListener("click", closeBookModal);
        if (dom.cancelModalBtn) dom.cancelModalBtn.addEventListener("click", closeBookModal);
        if (dom.draftModalBtn) {
            dom.draftModalBtn.addEventListener("click", () => {
                showNotification("Đã đóng cửa sổ tạo sách.", "info");
                closeBookModal();
            });
        }

        // Lưu sách
        if (dom.submitBookBtn) dom.submitBookBtn.addEventListener("click", saveBook);

        // Tra cứu ISBN
        if (dom.btnLookupIsbn) dom.btnLookupIsbn.addEventListener("click", lookupBookByIsbn);

        // Thẻ tác giả
        if (dom.tagAuthorInput) {
            dom.tagAuthorInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addAuthorTag(dom.tagAuthorInput.value);
                }
            });
        }

        // Ảnh bìa Dropzone & File Input
        if (dom.coverDropZone && dom.coverFileInput) {
            dom.coverDropZone.addEventListener("click", () => dom.coverFileInput.click());
            dom.coverFileInput.addEventListener("change", (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleCoverFileSelect(e.target.files[0]);
                }
            });

            dom.coverDropZone.addEventListener("dragover", (e) => {
                e.preventDefault();
                dom.coverDropZone.classList.add("dragover");
            });

            dom.coverDropZone.addEventListener("dragleave", () => {
                dom.coverDropZone.classList.remove("dragover");
            });

            dom.coverDropZone.addEventListener("drop", (e) => {
                e.preventDefault();
                dom.coverDropZone.classList.remove("dragover");
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleCoverFileSelect(e.dataTransfer.files[0]);
                }
            });
        }

        // Modal 2: Bản sao
        if (dom.closeCopiesModalBtn) dom.closeCopiesModalBtn.addEventListener("click", closeCopiesModal);
        if (dom.closeCopiesModalFooterBtn) dom.closeCopiesModalFooterBtn.addEventListener("click", closeCopiesModal);
        if (dom.doneCopiesModalBtn) dom.doneCopiesModalBtn.addEventListener("click", closeCopiesModal);

        // Modal 2 Tabs
        if (dom.btnTab1) dom.btnTab1.addEventListener("click", () => switchModalTab("tab1"));
        if (dom.btnTab2) dom.btnTab2.addEventListener("click", () => switchModalTab("tab2"));

        // Modal 2 Filters
        if (dom.filterBtnAll) dom.filterBtnAll.addEventListener("click", () => setCopiesFilter("ALL"));
        if (dom.filterBtnAvailable) dom.filterBtnAvailable.addEventListener("click", () => setCopiesFilter("AVAILABLE"));
        if (dom.filterBtnBorrowed) dom.filterBtnBorrowed.addEventListener("click", () => setCopiesFilter("BORROWED"));
        if (dom.filterBtnIssues) dom.filterBtnIssues.addEventListener("click", () => setCopiesFilter("ISSUES"));

        // Tìm kiếm bản sao trong modal
        if (dom.copiesSearchInput) {
            dom.copiesSearchInput.addEventListener("input", (e) => {
                state.copiesSearch = e.target.value;
                state.copiesPage = 1;
                renderCopiesTable();
            });
        }

        // In tem mã vạch & Xuất CSV
        if (dom.printBatchBarcodesBtn) dom.printBatchBarcodesBtn.addEventListener("click", printBatchBarcodes);
        if (dom.exportCopiesCsvBtn) dom.exportCopiesCsvBtn.addEventListener("click", exportCopiesCsv);
        if (dom.btnExportExcel) dom.btnExportExcel.addEventListener("click", exportToExcel);

        // Drawer thêm bản sao
        if (dom.toggleAddCopyBtn) dom.toggleAddCopyBtn.addEventListener("click", toggleAddCopyDrawer);
        if (dom.closeAddCopyDrawerBtn) dom.closeAddCopyDrawerBtn.addEventListener("click", toggleAddCopyDrawer);
        if (dom.cancelAddCopyBtn) dom.cancelAddCopyBtn.addEventListener("click", toggleAddCopyDrawer);
        if (dom.submitAddCopyBtn) dom.submitAddCopyBtn.addEventListener("click", submitAddCopy);

        // Drawer đổi trạng thái
        if (dom.cancelQuickStatusBtn) dom.cancelQuickStatusBtn.addEventListener("click", closeQuickStatusDrawer);
        if (dom.saveQuickStatusBtn) dom.saveQuickStatusBtn.addEventListener("click", saveQuickStatus);

        // Chọn nhanh tác giả từ dropdown
        if (dom.authorSelectDropdown) {
            dom.authorSelectDropdown.addEventListener("change", (e) => {
                const selectedName = (e.target.value || "").trim();
                if (selectedName) {
                    addAuthorTag(selectedName);
                    e.target.value = "";
                }
            });
        }

        // Thay đổi số lượng bản sao
        if (dom.copiesCount) {
            dom.copiesCount.addEventListener("input", updateBarcodeRange);
        }
        if (dom.bookIsbn) {
            dom.bookIsbn.addEventListener("input", updateBarcodeRange);
        }

        // Modal 3: Confirm Delete buttons
        if (dom.cancelDeleteModalBtn) dom.cancelDeleteModalBtn.addEventListener("click", closeDeleteModal);
        if (dom.closeDeleteModalBtn) dom.closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
        if (dom.confirmDeleteModalBtn) dom.confirmDeleteModalBtn.addEventListener("click", handleConfirmDelete);

        // Modal 4: Book Details Modal buttons
        if (dom.closeDetailModalBtn) dom.closeDetailModalBtn.addEventListener("click", closeBookDetailModal);
        if (dom.closeDetailModalFooterBtn) dom.closeDetailModalFooterBtn.addEventListener("click", closeBookDetailModal);

        if (dom.detailManageCopiesBtn) {
            dom.detailManageCopiesBtn.addEventListener("click", () => {
                const isbn = state.activeDetailIsbn;
                closeBookDetailModal();
                if (isbn) openCopiesModal(isbn);
            });
        }

        if (dom.detailEditBookBtn) {
            dom.detailEditBookBtn.addEventListener("click", () => {
                const isbn = state.activeDetailIsbn;
                closeBookDetailModal();
                if (isbn) {
                    state.returnToDetailIsbn = isbn;
                    openEditModal(isbn);
                }
            });
        }

        if (dom.btnDetailPrintSpine) {
            dom.btnDetailPrintSpine.addEventListener("click", () => {
                showNotification("Đang gửi lệnh in tem nhãn gáy sách (Spine Label)...", "info");
            });
        }

        // Click ngoài backdrop để đóng modal
        window.addEventListener("click", (e) => {
            if (e.target === dom.bookModalBackdrop) closeBookModal();
            if (e.target === dom.copiesModalBackdrop) closeCopiesModal();
            if (e.target === dom.deleteModalBackdrop) closeDeleteModal();
            if (e.target === dom.detailModalBackdrop) closeBookDetailModal();
        });

        // Đóng modal nghiệp vụ bằng phím Escape
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape" || e.keyCode === 27) {
                closeBookModal();
                closeCopiesModal();
                closeDeleteModal();
                closeBookDetailModal();
            }
        });
    }

    function initTopbarControls() {
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

        document.addEventListener("click", (e) => {
            const logoutBtn = e.target.closest("#logoutMenuBtn");
            if (logoutBtn) {
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
                        showNotification("Phiên làm việc đã kết thúc. Đang chuyển hướng...", "info");
                        setTimeout(() => {
                            window.location.href = "login.html#login";
                        }, 500);
                    }
                });
                return;
            }
            if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
                userDropdownMenu.classList.remove("show");
                if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
            }
            if (navMenu && navMenu.classList.contains("show")) {
                navMenu.classList.remove("show");
            }
        });

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

        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape" || e.keyCode === 27) {
                closeConfirmModal();
                if (userDropdownMenu) userDropdownMenu.classList.remove("show");
                if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
                if (navMenu) navMenu.classList.remove("show");
            }
        });
    }

    // ============================================================================
    // KHỞI ĐỘNG ỨNG DỤNG (INITIALIZATION)
    // ============================================================================
    async function init() {
        initTopbarControls();

        const staffUser = enforceBooksStaffGuard();
        if (!staffUser) return;

        const verifiedUser = await loadUserProfile();
        if (!verifiedUser) return;

        initEventListeners();
        await Promise.all([loadTaxonomy(), loadCopyConditions()]);

        // Nhận từ khoá hoặc thể loại từ URL query params nếu có (VD: books.html?q=Python hoặc ?category_id=1)
        const urlParams = new URLSearchParams(window.location.search);
        const queryTerm = urlParams.get("keyword") || urlParams.get("q") || urlParams.get("search");
        if (queryTerm) {
            state.searchTerm = queryTerm.trim();
            if (dom.filterSearchInput) dom.filterSearchInput.value = state.searchTerm;
        }
        const queryCat = urlParams.get("category_id") || urlParams.get("cat");
        if (queryCat) {
            state.selectedCategory = queryCat;
            if (dom.filterCategory) dom.filterCategory.value = queryCat;
        }

        await loadBooks();
    }

    // Export API toàn cục để gọi từ HTML inline events
    window.booksApp = {
        reload: loadBooks,
        setPage: setPage,
        openCreateModal: openCreateModal,
        openEditModal: openEditModal,
        closeBookModal: closeBookModal,
        lookupBookByIsbn: lookupBookByIsbn,
        saveBook: saveBook,
        deleteBook: deleteBook,
        openDeleteModal: openDeleteModal,
        closeDeleteModal: closeDeleteModal,
        openCopiesModal: openCopiesModal,
        closeCopiesModal: closeCopiesModal,
        switchModalTab: switchModalTab,
        setCopiesFilter: setCopiesFilter,
        setCopiesPage: setCopiesPage,
        openQuickStatusDrawer: openQuickStatusDrawer,
        closeQuickStatusDrawer: closeQuickStatusDrawer,
        saveQuickStatus: saveQuickStatus,
        toggleAddCopyDrawer: toggleAddCopyDrawer,
        submitAddCopy: submitAddCopy,
        printBatchBarcodes: printBatchBarcodes,
        exportCopiesCsv: exportCopiesCsv,
        viewPdfDoc: viewPdfDoc,
        exportToExcel: exportToExcel,
        removeAuthorTag: removeAuthorTag,
        openBookDetailModal: openBookDetailModal,
        closeBookDetailModal: closeBookDetailModal,
        showConfirm: showConfirm,
        closeConfirmModal: closeConfirmModal
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
