/**
 * ==============================================================================
 * KS25 Library - Module Quản lý Đầu sách & Bản sao (Task T3CFB37)
 * Tác giả: Ngô Việt Dũng (B25DTCN162)
 *
 * Chức năng:
 *  1. Bảng dữ liệu đầu sách: Tìm kiếm, lọc theo thể loại/trạng thái kho, phân trang.
 *  2. Form thêm/sửa đầu sách: Chọn nhiều tác giả (Tag Chips), tải ảnh bìa xem trước trực tiếp,
 *     thiết lập số lượng bản sao ban đầu và sinh dải mã vạch tự động (Barcode Range).
 *  3. Modal Quản lý Bản sao: Xem danh mục bản sao của từng đầu sách, thêm nhanh nhiều bản sao,
 *     chỉnh sửa vị trí kệ / tình trạng vật lý, xóa bản sao.
 *  4. Tích hợp API backend (/books, /book_copies) kèm fallback dữ liệu chuẩn Stitch.
 * ==============================================================================
 */

(function () {
    "use strict";

    // Dữ liệu mẫu chuẩn theo thiết kế Stitch & tài nguyên học thuật KS25
    const MOCK_BOOKS = [
        {
            isbn: "BK-IT-2024-001",
            title: "Lập trình Web Hiện đại với Python & FastAPI",
            page_count: 420,
            authors: ["TS. Lê Hoàng Nam", "ThS. Đỗ Thùy Linh"],
            publisher: "NXB Đại học Quốc gia",
            publish_year: 2024,
            category_id: "cntt",
            category_name: "CNTT & Phần mềm",
            total_copies: 12,
            available_copies: 8,
            shelf_location: "Kệ A3 - Ngăn 2",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHUieamnMj8LEicCLHMgyMjww9oZXyp8wtMGaR0s228SJD9GGzZrYQ5H3zT5e9QLIL7Y0Z-N2De_jKyxWWrlNFfYsjHhvp71C7bb0Heww51_Rt7RID0naRcxXW97NnajMWEjHV_UPeEIFFqTIdVK5Uno62xerxYntHgt4YPfZhBLnnXxMX9xzt1LqDTTqj-fV8tvMPaj7EvHCA9Vn-IMhZ-Yx83pyVm-6sg9b3GWPS",
            description: "Giáo trình toàn diện về kiến trúc backend hiện đại, API RESTful hiệu năng cao và triển khai containerized.",
            allow_home: true,
            copies: [
                { id: 101, copy_code: "BK-IT-2024-001-001", shelf_location: "Kệ A3 - Ngăn 2", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 102, copy_code: "BK-IT-2024-001-002", shelf_location: "Kệ A3 - Ngăn 2", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 103, copy_code: "BK-IT-2024-001-003", shelf_location: "Kệ A3 - Ngăn 2", condition: "Tốt 95%", status: "BORROWED" },
                { id: 104, copy_code: "BK-IT-2024-001-004", shelf_location: "Kệ A3 - Ngăn 2", condition: "Tốt 95%", status: "AVAILABLE" },
                { id: 105, copy_code: "BK-IT-2024-001-005", shelf_location: "Kệ A3 - Ngăn 2", condition: "Tốt 95%", status: "AVAILABLE" },
                { id: 106, copy_code: "BK-IT-2024-001-006", shelf_location: "Kệ A3 - Ngăn 2", condition: "Tốt 95%", status: "BORROWED" },
                { id: 107, copy_code: "BK-IT-2024-001-007", shelf_location: "Kệ A3 - Ngăn 2", condition: "Cũ 80%", status: "AVAILABLE" },
                { id: 108, copy_code: "BK-IT-2024-001-008", shelf_location: "Kệ A3 - Ngăn 2", condition: "Cũ 80%", status: "BORROWED" },
                { id: 109, copy_code: "BK-IT-2024-001-009", shelf_location: "Kệ A3 - Ngăn 2", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 110, copy_code: "BK-IT-2024-001-010", shelf_location: "Kệ A3 - Ngăn 2", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 111, copy_code: "BK-IT-2024-001-011", shelf_location: "Kệ A3 - Ngăn 2", condition: "Tốt 95%", status: "RESERVED" },
                { id: 112, copy_code: "BK-IT-2024-001-012", shelf_location: "Kệ A3 - Ngăn 2", condition: "Mới 100%", status: "AVAILABLE" }
            ]
        },
        {
            isbn: "BK-IT-2023-089",
            title: "Kiến trúc Hệ thống & Thiết kế Microservices",
            page_count: 560,
            authors: ["Martin Kleppmann", "TS. Vũ Hải Đăng (Dịch)"],
            publisher: "NXB Bách Khoa",
            publish_year: 2023,
            category_id: "cntt",
            category_name: "CNTT & Phần mềm",
            total_copies: 6,
            available_copies: 1,
            shelf_location: "Kệ B1 - Ngăn 1",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBHQUn9YGRWpra0RQY3gATlmUWAz6-UQoT7ak7BIQWQILyZK014OGoBcV-R9HcMooC_26loKEpxs8YTpv2F31KZsjiJdvHDYWcFocBwGP44gWQUSd2xU8qRTg_gYx_Ak-PcbiCrOgapKsLM0NHx6pvJ-k60Yc-1lndI3DPTxgY9m729yScg0PP-PG9tDotRQlpqy07_yi6nQL0GgP_S3qIWkJ32MPFBObSqaXDrO9Ga",
            description: "Phân tích chuyên sâu về dữ liệu phân tán, tính nhất quán, xử lý stream và độ tin cậy trong các hệ thống quy mô lớn.",
            allow_home: true,
            copies: [
                { id: 201, copy_code: "BK-IT-2023-089-001", shelf_location: "Kệ B1 - Ngăn 1", condition: "Tốt 95%", status: "BORROWED" },
                { id: 202, copy_code: "BK-IT-2023-089-002", shelf_location: "Kệ B1 - Ngăn 1", condition: "Tốt 95%", status: "BORROWED" },
                { id: 203, copy_code: "BK-IT-2023-089-003", shelf_location: "Kệ B1 - Ngăn 1", condition: "Cũ 80%", status: "BORROWED" },
                { id: 204, copy_code: "BK-IT-2023-089-004", shelf_location: "Kệ B1 - Ngăn 1", condition: "Cũ 80%", status: "RESERVED" },
                { id: 205, copy_code: "BK-IT-2023-089-005", shelf_location: "Kệ B1 - Ngăn 1", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 206, copy_code: "BK-IT-2023-089-006", shelf_location: "Kệ B1 - Ngăn 1", condition: "Hư hỏng nhẹ", status: "MAINTENANCE" }
            ]
        },
        {
            isbn: "BK-BA-2024-015",
            title: "Kinh tế số & Công nghệ Tài chính (Fintech)",
            page_count: 380,
            authors: ["PGS.TS Trần Minh Quân", "TS. Phạm Hồng Ánh"],
            publisher: "NXB Kinh tế Quốc dân",
            publish_year: 2024,
            category_id: "kinhte",
            category_name: "Kinh tế & Quản trị",
            total_copies: 15,
            available_copies: 11,
            shelf_location: "Kệ C2 - Ngăn 3",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHUieamnMj8LEicCLHMgyMjww9oZXyp8wtMGaR0s228SJD9GGzZrYQ5H3zT5e9QLIL7Y0Z-N2De_jKyxWWrlNFfYsjHhvp71C7bb0Heww51_Rt7RID0naRcxXW97NnajMWEjHV_UPeEIFFqTIdVK5Uno62xerxYntHgt4YPfZhBLnnXxMX9xzt1LqDTTqj-fV8tvMPaj7EvHCA9Vn-IMhZ-Yx83pyVm-6sg9b3GWPS",
            description: "Mô hình ngân hàng mở, chuỗi khối trong thanh toán liên ngân hàng và phân tích hành vi tiêu dùng số.",
            allow_home: true,
            copies: [
                { id: 301, copy_code: "BK-BA-2024-015-001", shelf_location: "Kệ C2 - Ngăn 3", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 302, copy_code: "BK-BA-2024-015-002", shelf_location: "Kệ C2 - Ngăn 3", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 303, copy_code: "BK-BA-2024-015-003", shelf_location: "Kệ C2 - Ngăn 3", condition: "Mới 100%", status: "BORROWED" },
                { id: 304, copy_code: "BK-BA-2024-015-004", shelf_location: "Kệ C2 - Ngăn 3", condition: "Tốt 95%", status: "AVAILABLE" },
                { id: 305, copy_code: "BK-BA-2024-015-005", shelf_location: "Kệ C2 - Ngăn 3", condition: "Tốt 95%", status: "AVAILABLE" }
            ]
        },
        {
            isbn: "BK-IT-2022-044",
            title: "Clean Code - Nghệ thuật viết mã sạch",
            page_count: 464,
            authors: ["Robert C. Martin", "Đặng Hoàng Giang (Dịch)"],
            publisher: "NXB Thông tin & Truyền thông",
            publish_year: 2022,
            category_id: "cntt",
            category_name: "CNTT & Phần mềm",
            total_copies: 5,
            available_copies: 0,
            shelf_location: "Kệ A1 - Ngăn 4",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnTbrgIeAXaD45Ds09K3bfEVOe6s4f1c8s--JxUoMUMyzsZxHXnacUc2e6PoIGYnowZW67AdBuPdY-FxAs-5RDN6QATxyiSe9JoQ-wUgo9Q7l-Tmt5sIg6WUWytjD0IAK2HyjB6zqBE4AH53XLbLTJUzoTUUf4vN8vqHthVDbYyZ6OFcYfAXnn0qNol6qqW28qB8cZMcwBSv6V_iEfqVWR2lEgqML9Yt9CaXO_JouC",
            description: "Cẩm nang bắt buộc về quy chuẩn đặt tên, thiết kế hàm, nguyên lý SOLID và tái cấu trúc mã nguồn.",
            allow_home: true,
            copies: [
                { id: 401, copy_code: "BK-IT-2022-044-001", shelf_location: "Kệ A1 - Ngăn 4", condition: "Cũ 80%", status: "BORROWED" },
                { id: 402, copy_code: "BK-IT-2022-044-002", shelf_location: "Kệ A1 - Ngăn 4", condition: "Cũ 80%", status: "BORROWED" },
                { id: 403, copy_code: "BK-IT-2022-044-003", shelf_location: "Kệ A1 - Ngăn 4", condition: "Tốt 95%", status: "BORROWED" },
                { id: 404, copy_code: "BK-IT-2022-044-004", shelf_location: "Kệ A1 - Ngăn 4", condition: "Tốt 95%", status: "BORROWED" },
                { id: 405, copy_code: "BK-IT-2022-044-005", shelf_location: "Kệ A1 - Ngăn 4", condition: "Cũ 80%", status: "BORROWED" }
            ]
        },
        {
            isbn: "BK-MA-2023-112",
            title: "Xác suất Thống kê Nâng cao cho Khoa học Dữ liệu",
            page_count: 312,
            authors: ["GS. Đặng Đình Thi", "TS. Nguyễn Minh Trí"],
            publisher: "NXB Đại học Quốc gia",
            publish_year: 2023,
            category_id: "toan",
            category_name: "Khoa học Cơ bản",
            total_copies: 8,
            available_copies: 5,
            shelf_location: "Kệ D1 - Ngăn 2",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHUieamnMj8LEicCLHMgyMjww9oZXyp8wtMGaR0s228SJD9GGzZrYQ5H3zT5e9QLIL7Y0Z-N2De_jKyxWWrlNFfYsjHhvp71C7bb0Heww51_Rt7RID0naRcxXW97NnajMWEjHV_UPeEIFFqTIdVK5Uno62xerxYntHgt4YPfZhBLnnXxMX9xzt1LqDTTqj-fV8tvMPaj7EvHCA9Vn-IMhZ-Yx83pyVm-6sg9b3GWPS",
            description: "Lý thuyết xác suất phân phối, kiểm định giả thuyết và ứng dụng trong các giải thuật máy học.",
            allow_home: true,
            copies: [
                { id: 501, copy_code: "BK-MA-2023-112-001", shelf_location: "Kệ D1 - Ngăn 2", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 502, copy_code: "BK-MA-2023-112-002", shelf_location: "Kệ D1 - Ngăn 2", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 503, copy_code: "BK-MA-2023-112-003", shelf_location: "Kệ D1 - Ngăn 2", condition: "Mới 100%", status: "AVAILABLE" },
                { id: 504, copy_code: "BK-MA-2023-112-004", shelf_location: "Kệ D1 - Ngăn 2", condition: "Tốt 95%", status: "BORROWED" },
                { id: 505, copy_code: "BK-MA-2023-112-005", shelf_location: "Kệ D1 - Ngăn 2", condition: "Tốt 95%", status: "AVAILABLE" }
            ]
        }
    ];

    // ============================================================================
    // APPLICATION STATE
    // ============================================================================
    const state = {
        books: JSON.parse(JSON.stringify(MOCK_BOOKS)),
        filteredBooks: [],
        currentPage: 1,
        pageSize: 5,
        searchTerm: "",
        selectedCategory: "",
        selectedStatus: "",
        editingIsbn: null, // null nếu đang tạo mới, chuỗi ISBN nếu đang sửa
        authorTags: ["TS. Lê Hoàng Nam", "ThS. Đỗ Thùy Linh"],
        activeCopiesBook: null // sách đang được mở trong modal bản sao
    };

    // ============================================================================
    // DOM ELEMENTS
    // ============================================================================
    const dom = {
        // KPI
        kpiTotalBooks: document.getElementById("kpi-total-books"),
        kpiTotalCopies: document.getElementById("kpi-total-copies"),
        kpiAvailableCopies: document.getElementById("kpi-available-copies"),
        kpiBorrowedCopies: document.getElementById("kpi-borrowed-copies"),

        // Filter & Search
        filterSearchInput: document.getElementById("filter-search-input"),
        topbarSearchInput: document.getElementById("topbar-global-search"),
        filterCategory: document.getElementById("filter-category"),
        filterStatus: document.getElementById("filter-status"),
        btnResetFilter: document.getElementById("btn-reset-filter"),
        btnApplyFilter: document.getElementById("btn-apply-filter"),

        // Table & Pagination
        tableBody: document.getElementById("books-table-body"),
        pageStart: document.getElementById("page-start"),
        pageEnd: document.getElementById("page-end"),
        totalRecords: document.getElementById("total-records"),
        paginationControls: document.getElementById("pagination-controls"),

        // Actions
        btnOpenCreateBook: document.getElementById("btn-open-create-book"),
        btnExportExcel: document.getElementById("btn-export-excel"),

        // Modal Book (Add/Edit)
        bookModalBackdrop: document.getElementById("bookModalBackdrop"),
        closeModalBtn: document.getElementById("closeModalBtn"),
        cancelModalBtn: document.getElementById("cancelModalBtn"),
        draftModalBtn: document.getElementById("draftModalBtn"),
        submitBookBtn: document.getElementById("submitBookBtn"),
        btnSubmitText: document.getElementById("btn-submit-text"),
        modalBookHeading: document.getElementById("modal-book-heading"),
        modalBookBadge: document.getElementById("modal-book-badge"),

        // Form fields
        bookTitle: document.getElementById("bookTitle"),
        bookIsbn: document.getElementById("bookIsbn"),
        bookCategory: document.getElementById("bookCategory"),
        authorChipsContainer: document.getElementById("authorChipsContainer"),
        tagAuthorInput: document.getElementById("tagAuthorInput"),
        bookPublisher: document.getElementById("bookPublisher"),
        bookYear: document.getElementById("bookYear"),
        bookPages: document.getElementById("bookPages"),
        bookShelf: document.getElementById("bookShelf"),
        bookSummary: document.getElementById("bookSummary"),
        copiesCount: document.getElementById("copiesCount"),
        barcodeRange: document.getElementById("barcodeRange"),
        allowBorrowHome: document.getElementById("allowBorrowHome"),
        coverPreviewImg: document.getElementById("coverPreviewImg"),
        coverFileInput: document.getElementById("coverFileInput"),
        coverDropZone: document.getElementById("coverDropZone"),

        // Modal Copies
        copiesModalBackdrop: document.getElementById("copiesModalBackdrop"),
        closeCopiesModalBtn: document.getElementById("closeCopiesModalBtn"),
        closeCopiesModalFooterBtn: document.getElementById("closeCopiesModalFooterBtn"),
        copiesModalTitle: document.getElementById("copiesModalTitle"),
        copiesModalSubtitle: document.getElementById("copiesModalSubtitle"),
        copiesCountBadge: document.getElementById("copies-count-badge"),
        copiesTableBody: document.getElementById("copiesTableBody"),
        newCopyQty: document.getElementById("newCopyQty"),
        newCopyShelf: document.getElementById("newCopyShelf"),
        newCopyCondition: document.getElementById("newCopyCondition"),
        newCopyStatus: document.getElementById("newCopyStatus"),
        btnAddCopySubmit: document.getElementById("btnAddCopySubmit"),

        // Toast
        toastBox: document.getElementById("toast-box")
    };

    // ============================================================================
    // NOTIFICATION TOAST
    // ============================================================================
    function showNotification(message, type = "success") {
        if (!dom.toastBox) return;
        const toast = document.createElement("div");
        toast.className = `toast-item ${type}`;

        let iconName = "check_circle";
        if (type === "error") iconName = "error";
        if (type === "warning") iconName = "warning";
        if (type === "info") iconName = "info";

        toast.innerHTML = `
      <span class="material-symbols-outlined toast-icon">${iconName}</span>
      <div class="toast-content">${escapeHtml(message)}</div>
      <button type="button" class="toast-close" title="Đóng">&times;</button>
    `;

        toast.querySelector(".toast-close").addEventListener("click", () => {
            toast.remove();
        });

        dom.toastBox.appendChild(toast);
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 4000);
    }

    // ============================================================================
    // CATEGORY HELPERS
    // ============================================================================
    function getCategoryName(catId) {
        const map = {
            cntt: "CNTT & Phần mềm",
            kinhte: "Kinh tế & Quản trị",
            dientu: "Điện tử - Viễn thông",
            toan: "Khoa học Cơ bản",
            ngoaingu: "Ngoại ngữ & Kỹ năng"
        };
        return map[catId] || "Tổng hợp";
    }

    // ============================================================================
    // UPDATE KPIS
    // ============================================================================
    function updateKPIs() {
        let totalBooks = state.books.length;
        let totalCopies = 0;
        let availableCopies = 0;
        let borrowedCopies = 0;

        state.books.forEach(b => {
            totalCopies += (b.total_copies || (b.copies ? b.copies.length : 0));
            if (b.copies && b.copies.length > 0) {
                b.copies.forEach(c => {
                    if (c.status === "AVAILABLE") availableCopies++;
                    else if (c.status === "BORROWED") borrowedCopies++;
                });
            } else {
                availableCopies += (b.available_copies || 0);
                borrowedCopies += Math.max(0, (b.total_copies || 0) - (b.available_copies || 0));
            }
        });

        if (dom.kpiTotalBooks) dom.kpiTotalBooks.textContent = totalBooks.toLocaleString("vi-VN");
        if (dom.kpiTotalCopies) dom.kpiTotalCopies.textContent = totalCopies.toLocaleString("vi-VN");
        if (dom.kpiAvailableCopies) dom.kpiAvailableCopies.textContent = availableCopies.toLocaleString("vi-VN");
        if (dom.kpiBorrowedCopies) dom.kpiBorrowedCopies.textContent = borrowedCopies.toLocaleString("vi-VN");
    }

    // ============================================================================
    // FILTER & SEARCH LOGIC
    // ============================================================================
    function applyFilter() {
        const term = state.searchTerm.trim().toLowerCase();
        const cat = state.selectedCategory;
        const status = state.selectedStatus;

        state.filteredBooks = state.books.filter(book => {
            // 1. Text search
            if (term) {
                const titleMatch = (book.title || "").toLowerCase().includes(term);
                const isbnMatch = (book.isbn || "").toLowerCase().includes(term);
                const authorMatch = Array.isArray(book.authors)
                    ? book.authors.some(a => a.toLowerCase().includes(term))
                    : false;
                const publisherMatch = (book.publisher || "").toLowerCase().includes(term);
                if (!titleMatch && !isbnMatch && !authorMatch && !publisherMatch) return false;
            }

            // 2. Category filter
            if (cat && book.category_id !== cat) {
                return false;
            }

            // 3. Status filter
            if (status) {
                const avail = book.available_copies ?? 0;
                const total = book.total_copies ?? 0;
                if (status === "available" && avail <= 0) return false;
                if (status === "borrowed" && avail >= total) return false;
                if (status === "reserved") {
                    const hasReserved = book.copies && book.copies.some(c => c.status === "RESERVED");
                    if (!hasReserved) return false;
                }
            }

            return true;
        });

        state.currentPage = 1;
        renderTable();
    }

    // ============================================================================
    // RENDER PRIMARY DATA TABLE
    // ============================================================================
    function renderTable() {
        const list = state.filteredBooks;
        const total = list.length;
        const startIdx = (state.currentPage - 1) * state.pageSize;
        const endIdx = Math.min(startIdx + state.pageSize, total);
        const pageItems = list.slice(startIdx, endIdx);

        if (dom.totalRecords) dom.totalRecords.textContent = total.toLocaleString("vi-VN");
        if (dom.pageStart) dom.pageStart.textContent = total === 0 ? "0" : (startIdx + 1);
        if (dom.pageEnd) dom.pageEnd.textContent = endIdx;

        if (!dom.tableBody) return;

        if (pageItems.length === 0) {
            dom.tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 48px 16px; color: var(--color-text-secondary);">
            <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-text-muted); display: block; margin-bottom: 8px;">search_off</span>
            <div style="font-size: 15px; font-weight: 600; color: var(--color-text-primary);">Không tìm thấy đầu sách nào</div>
            <div style="font-size: 12px; margin-top: 4px;">Hãy thử điều chỉnh từ khóa hoặc xóa các bộ lọc đang chọn.</div>
          </td>
        </tr>
      `;
            renderPagination(0);
            return;
        }

        let html = "";
        pageItems.forEach(b => {
            const authorsStr = Array.isArray(b.authors) ? b.authors.join(", ") : (b.authors || "—");
            const avail = b.available_copies ?? 0;
            const totalCopies = b.total_copies ?? (b.copies ? b.copies.length : 0);

            let statusBadge = "";
            if (avail > 0) {
                statusBadge = `
          <span class="status-badge available">
            <span class="dot"></span> ${avail} AVAILABLE
          </span>
        `;
            } else if (totalCopies > 0) {
                statusBadge = `
          <span class="status-badge empty">
            <span class="dot"></span> 0 AVAILABLE
          </span>
        `;
            } else {
                statusBadge = `
          <span class="status-badge reserved">
            <span class="dot"></span> CHƯA CÓ BẢN
          </span>
        `;
            }

            html += `
        <tr data-isbn="${escapeHtml(b.isbn)}">
          <td>
            <span class="book-code-cell">${escapeHtml(b.isbn)}</span>
            <span class="book-isbn-cell">Kệ: ${escapeHtml(b.shelf_location || "Chưa gán")}</span>
          </td>
          <td style="text-align: center;">
            <img class="book-cover-img" src="${escapeHtml(b.cover_image)}" alt="Bìa ${escapeHtml(b.title)}" onerror="this.src='https://placehold.co/80x108?text=Bìa+Sách';">
          </td>
          <td>
            <span class="book-title-text" onclick="window.booksApp.openEditModal('${escapeHtml(b.isbn)}')">
              ${escapeHtml(b.title)}
            </span>
            <span class="book-page-text">• Số trang: ${escapeHtml(b.page_count || "—")} trang • Năm ${escapeHtml(b.publish_year || "2024")}</span>
          </td>
          <td>
            <span class="book-author-text">${escapeHtml(authorsStr)}</span>
            <span class="book-publisher-text">${escapeHtml(b.publisher || "Chưa rõ NXB")}</span>
          </td>
          <td>
            <span class="category-tag">${escapeHtml(b.category_name || getCategoryName(b.category_id))}</span>
          </td>
          <td style="text-align: center; font-weight: 700; font-size: 14px;">
            ${totalCopies}
          </td>
          <td style="text-align: center;">
            ${statusBadge}
          </td>
          <td style="text-align: right;">
            <div class="table-actions-cell">
              <button type="button" class="btn-copies-action" onclick="window.booksApp.openCopiesModal('${escapeHtml(b.isbn)}')" title="Quản lý bản sao vật lý">
                <span class="material-symbols-outlined">qr_code_2</span>
                <span>Bản sao (${totalCopies})</span>
              </button>
              <button type="button" class="btn-icon-action" onclick="window.booksApp.openEditModal('${escapeHtml(b.isbn)}')" title="Chỉnh sửa đầu sách">
                <span class="material-symbols-outlined">edit_square</span>
              </button>
              <button type="button" class="btn-icon-action delete" onclick="window.booksApp.deleteBook('${escapeHtml(b.isbn)}')" title="Xóa đầu sách">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
        });

        dom.tableBody.innerHTML = html;
        renderPagination(total);
    }

    // ============================================================================
    // PAGINATION CONTROLS
    // ============================================================================
    function renderPagination(total) {
        if (!dom.paginationControls) return;
        const totalPages = Math.ceil(total / state.pageSize) || 1;

        let html = `
      <button type="button" class="pagination-btn" ${state.currentPage <= 1 ? "disabled" : ""} onclick="window.booksApp.changePage(${state.currentPage - 1})">
        <span class="material-symbols-outlined" style="font-size: 16px;">chevron_left</span>
        <span>Trước</span>
      </button>
    `;

        for (let p = 1; p <= totalPages; p++) {
            if (totalPages > 7 && Math.abs(p - state.currentPage) > 2 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) {
                    html += `<span style="padding: 0 4px; color: var(--color-text-secondary);">...</span>`;
                }
                continue;
            }
            html += `
        <button type="button" class="pagination-btn ${p === state.currentPage ? "active" : ""}" onclick="window.booksApp.changePage(${p})">
          ${p}
        </button>
      `;
        }

        html += `
      <button type="button" class="pagination-btn" ${state.currentPage >= totalPages ? "disabled" : ""} onclick="window.booksApp.changePage(${state.currentPage + 1})">
        <span>Sau</span>
        <span class="material-symbols-outlined" style="font-size: 16px;">chevron_right</span>
      </button>
    `;

        dom.paginationControls.innerHTML = html;
    }

    // ============================================================================
    // AUTHOR TAG CHIPS MANAGEMENT
    // ============================================================================
    function renderAuthorChips() {
        if (!dom.authorChipsContainer) return;
        // Xóa hết các chip cũ trừ thẻ input
        const chips = dom.authorChipsContainer.querySelectorAll(".author-chip");
        chips.forEach(c => c.remove());

        state.authorTags.forEach((author, index) => {
            const chip = document.createElement("span");
            chip.className = "author-chip";
            chip.innerHTML = `
        <span>${escapeHtml(author)}</span>
        <button type="button" title="Xóa tác giả" data-index="${index}">
          <span class="material-symbols-outlined" style="font-size: 14px;">cancel</span>
        </button>
      `;
            chip.querySelector("button").addEventListener("click", () => {
                state.authorTags.splice(index, 1);
                renderAuthorChips();
            });
            dom.authorChipsContainer.insertBefore(chip, dom.tagAuthorInput);
        });
    }

    function addAuthorTag(name) {
        const cleaned = name.trim();
        if (!cleaned) return;
        if (!state.authorTags.includes(cleaned)) {
            state.authorTags.push(cleaned);
            renderAuthorChips();
        }
        if (dom.tagAuthorInput) dom.tagAuthorInput.value = "";
    }

    // ============================================================================
    // DYNAMIC BARCODE RANGE GENERATION
    // ============================================================================
    function updateBarcodeRange() {
        if (!dom.barcodeRange) return;
        const isbn = (dom.bookIsbn ? dom.bookIsbn.value.trim() : "") || "BK-IT-2024-002";
        const count = parseInt(dom.copiesCount ? dom.copiesCount.value : 5, 10) || 1;
        const safeCount = Math.min(Math.max(count, 1), 50);

        const padEnd = String(safeCount).padStart(3, "0");
        dom.barcodeRange.textContent = `${isbn}-001 ... ${padEnd}`;
    }

    // ============================================================================
    // MODAL 1: ADD / EDIT BOOK
    // ============================================================================
    function openCreateModal() {
        state.editingIsbn = null;
        if (dom.modalBookHeading) dom.modalBookHeading.textContent = "Thêm mới đầu sách & Thiết lập bản sao";
        if (dom.modalBookBadge) {
            dom.modalBookBadge.textContent = "Chế độ: Tạo mới";
            dom.modalBookBadge.style.background = "#C1ECD4";
            dom.modalBookBadge.style.color = "#002114";
        }
        if (dom.btnSubmitText) dom.btnSubmitText.textContent = "Lưu & Khởi tạo bản sao";

        // Reset form
        if (dom.bookTitle) dom.bookTitle.value = "";
        // Tự sinh mã ISBN gợi ý
        const autoCode = `BK-IT-2024-${String(state.books.length + 1).padStart(3, "0")}`;
        if (dom.bookIsbn) {
            dom.bookIsbn.value = autoCode;
            dom.bookIsbn.disabled = false;
        }
        if (dom.bookCategory) dom.bookCategory.value = "cntt";
        if (dom.bookPublisher) dom.bookPublisher.value = "NXB Đại học Quốc gia";
        if (dom.bookYear) dom.bookYear.value = 2024;
        if (dom.bookPages) dom.bookPages.value = 420;
        if (dom.bookShelf) dom.bookShelf.value = "Kệ A3 - Ngăn 2";
        if (dom.bookSummary) dom.bookSummary.value = "";
        if (dom.copiesCount) dom.copiesCount.value = 5;
        if (dom.allowBorrowHome) dom.allowBorrowHome.checked = true;

        state.authorTags = ["TS. Nguyễn Văn A", "ThS. Trần B"];
        renderAuthorChips();

        // Default preview image
        if (dom.coverPreviewImg) {
            dom.coverPreviewImg.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuAHUieamnMj8LEicCLHMgyMjww9oZXyp8wtMGaR0s228SJD9GGzZrYQ5H3zT5e9QLIL7Y0Z-N2De_jKyxWWrlNFfYsjHhvp71C7bb0Heww51_Rt7RID0naRcxXW97NnajMWEjHV_UPeEIFFqTIdVK5Uno62xerxYntHgt4YPfZhBLnnXxMX9xzt1LqDTTqj-fV8tvMPaj7EvHCA9Vn-IMhZ-Yx83pyVm-6sg9b3GWPS";
        }

        updateBarcodeRange();
        if (dom.bookModalBackdrop) dom.bookModalBackdrop.classList.remove("hidden");
    }

    function openEditModal(isbn) {
        const book = state.books.find(b => b.isbn === isbn);
        if (!book) {
            showNotification("Không tìm thấy thông tin đầu sách!", "error");
            return;
        }

        state.editingIsbn = isbn;
        if (dom.modalBookHeading) dom.modalBookHeading.textContent = "Chỉnh sửa thông tin đầu sách";
        if (dom.modalBookBadge) {
            dom.modalBookBadge.textContent = "Chế độ: Cập nhật";
            dom.modalBookBadge.style.background = "#EFF6FF";
            dom.modalBookBadge.style.color = "#1D4ED8";
        }
        if (dom.btnSubmitText) dom.btnSubmitText.textContent = "Lưu thay đổi";

        // Fill form
        if (dom.bookTitle) dom.bookTitle.value = book.title || "";
        if (dom.bookIsbn) {
            dom.bookIsbn.value = book.isbn;
            dom.bookIsbn.disabled = true; // Khóa ISBN khi sửa
        }
        if (dom.bookCategory) dom.bookCategory.value = book.category_id || "cntt";
        if (dom.bookPublisher) dom.bookPublisher.value = book.publisher || "NXB Đại học Quốc gia";
        if (dom.bookYear) dom.bookYear.value = book.publish_year || 2024;
        if (dom.bookPages) dom.bookPages.value = book.page_count || 420;
        if (dom.bookShelf) dom.bookShelf.value = book.shelf_location || "Kệ A3 - Ngăn 2";
        if (dom.bookSummary) dom.bookSummary.value = book.description || "";
        if (dom.copiesCount) dom.copiesCount.value = book.total_copies || (book.copies ? book.copies.length : 1);
        if (dom.allowBorrowHome) dom.allowBorrowHome.checked = book.allow_home !== false;

        state.authorTags = Array.isArray(book.authors) ? [...book.authors] : [book.authors || ""];
        renderAuthorChips();

        if (dom.coverPreviewImg && book.cover_image) {
            dom.coverPreviewImg.src = book.cover_image;
        }

        updateBarcodeRange();
        if (dom.bookModalBackdrop) dom.bookModalBackdrop.classList.remove("hidden");
    }

    function closeBookModal() {
        if (dom.bookModalBackdrop) dom.bookModalBackdrop.classList.add("hidden");
    }

    function saveBook() {
        const title = dom.bookTitle ? dom.bookTitle.value.trim() : "";
        const isbn = dom.bookIsbn ? dom.bookIsbn.value.trim() : "";
        const catId = dom.bookCategory ? dom.bookCategory.value : "cntt";
        const publisher = dom.bookPublisher ? dom.bookPublisher.value : "";
        const year = parseInt(dom.bookYear ? dom.bookYear.value : 2024, 10);
        const pages = parseInt(dom.bookPages ? dom.bookPages.value : 420, 10);
        const shelf = dom.bookShelf ? dom.bookShelf.value.trim() : "Kệ A3 - Ngăn 2";
        const summary = dom.bookSummary ? dom.bookSummary.value.trim() : "";
        const copiesQty = parseInt(dom.copiesCount ? dom.copiesCount.value : 5, 10) || 1;
        const coverUrl = dom.coverPreviewImg ? dom.coverPreviewImg.src : "";
        const allowHome = dom.allowBorrowHome ? dom.allowBorrowHome.checked : true;

        if (!title) {
            showNotification("Vui lòng nhập tên đầu sách!", "warning");
            if (dom.bookTitle) dom.bookTitle.focus();
            return;
        }

        if (!isbn) {
            showNotification("Vui lòng nhập mã phân loại / ISBN!", "warning");
            if (dom.bookIsbn) dom.bookIsbn.focus();
            return;
        }

        if (state.authorTags.length === 0) {
            showNotification("Vui lòng nhập ít nhất 1 tác giả!", "warning");
            if (dom.tagAuthorInput) dom.tagAuthorInput.focus();
            return;
        }

        // Effect button
        if (dom.submitBookBtn) {
            const origHtml = dom.submitBookBtn.innerHTML;
            dom.submitBookBtn.disabled = true;
            dom.submitBookBtn.innerHTML = `
        <span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">refresh</span>
        <span>Đang xử lý...</span>
      `;

            setTimeout(() => {
                if (state.editingIsbn) {
                    // UPDATE
                    const target = state.books.find(b => b.isbn === state.editingIsbn);
                    if (target) {
                        target.title = title;
                        target.category_id = catId;
                        target.category_name = getCategoryName(catId);
                        target.publisher = publisher;
                        target.publish_year = year;
                        target.page_count = pages;
                        target.shelf_location = shelf;
                        target.description = summary;
                        target.authors = [...state.authorTags];
                        target.cover_image = coverUrl;
                        target.allow_home = allowHome;
                    }
                    showNotification(`Đã cập nhật đầu sách "${title}" thành công!`, "success");
                } else {
                    // CREATE NEW
                    // Sinh danh sách bản sao ban đầu
                    const newCopies = [];
                    for (let i = 1; i <= copiesQty; i++) {
                        const pad = String(i).padStart(3, "0");
                        newCopies.push({
                            id: Date.now() + i,
                            copy_code: `${isbn}-${pad}`,
                            shelf_location: shelf,
                            condition: "Mới 100%",
                            status: "AVAILABLE"
                        });
                    }

                    const newBook = {
                        isbn: isbn,
                        title: title,
                        page_count: pages,
                        authors: [...state.authorTags],
                        publisher: publisher,
                        publish_year: year,
                        category_id: catId,
                        category_name: getCategoryName(catId),
                        total_copies: copiesQty,
                        available_copies: copiesQty,
                        shelf_location: shelf,
                        cover_image: coverUrl,
                        description: summary,
                        allow_home: allowHome,
                        copies: newCopies
                    };

                    state.books.unshift(newBook);
                    showNotification(`Đã thêm mới đầu sách "${title}" và khởi tạo ${copiesQty} bản sao!`, "success");
                }

                dom.submitBookBtn.disabled = false;
                dom.submitBookBtn.innerHTML = origHtml;
                closeBookModal();
                updateKPIs();
                applyFilter();
            }, 400);
        }
    }

    // ============================================================================
    // DELETE BOOK
    // ============================================================================
    function deleteBook(isbn) {
        const book = state.books.find(b => b.isbn === isbn);
        if (!book) return;

        const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa đầu sách "${book.title}" (${book.isbn}) khỏi hệ thống?`);
        if (!confirmed) return;

        state.books = state.books.filter(b => b.isbn !== isbn);
        showNotification(`Đã xóa thành công đầu sách "${book.title}".`, "info");
        updateKPIs();
        applyFilter();
    }

    // ============================================================================
    // MODAL 2: COPIES MANAGEMENT
    // ============================================================================
    function openCopiesModal(isbn) {
        const book = state.books.find(b => b.isbn === isbn);
        if (!book) {
            showNotification("Không tìm thấy đầu sách này!", "error");
            return;
        }

        state.activeCopiesBook = book;
        if (dom.copiesModalTitle) dom.copiesModalTitle.textContent = `Danh mục Bản sao: ${book.title}`;
        if (dom.copiesModalSubtitle) {
            dom.copiesModalSubtitle.textContent = `Mã sách: ${book.isbn} • Vị trí chuẩn: ${book.shelf_location || "Chưa gán"}`;
        }
        if (dom.newCopyShelf) dom.newCopyShelf.value = book.shelf_location || "Kệ A3 - Ngăn 2";
        if (dom.newCopyQty) dom.newCopyQty.value = 1;

        renderCopiesTable();
        if (dom.copiesModalBackdrop) dom.copiesModalBackdrop.classList.remove("hidden");
    }

    function closeCopiesModal() {
        if (dom.copiesModalBackdrop) dom.copiesModalBackdrop.classList.add("hidden");
    }

    function renderCopiesTable() {
        const book = state.activeCopiesBook;
        if (!book) return;

        if (!book.copies) book.copies = [];
        const copies = book.copies;

        if (dom.copiesCountBadge) dom.copiesCountBadge.textContent = copies.length;

        if (!dom.copiesTableBody) return;

        if (copies.length === 0) {
            dom.copiesTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">
            Đầu sách này hiện chưa có bản sao vật lý nào trong kho.
          </td>
        </tr>
      `;
            return;
        }

        let html = "";
        copies.forEach((copy, idx) => {
            let statusBadge = "";
            if (copy.status === "AVAILABLE") {
                statusBadge = `<span class="status-badge available" style="font-size: 10px; padding: 2px 6px;"><span class="dot"></span> Sẵn sàng</span>`;
            } else if (copy.status === "BORROWED") {
                statusBadge = `<span class="status-badge" style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; font-size:10px; padding:2px 6px;">Đang mượn</span>`;
            } else if (copy.status === "RESERVED") {
                statusBadge = `<span class="status-badge reserved" style="font-size: 10px; padding: 2px 6px;">Giữ chỗ</span>`;
            } else {
                statusBadge = `<span class="status-badge empty" style="font-size: 10px; padding: 2px 6px;">Bảo quản</span>`;
            }

            html += `
        <tr>
          <td>
            <strong class="font-mono" style="color: var(--color-brand); font-size: 12px;">${escapeHtml(copy.copy_code)}</strong>
          </td>
          <td>
            <span id="shelf-text-${copy.id}">${escapeHtml(copy.shelf_location || "—")}</span>
          </td>
          <td>
            <span style="font-size: 11px; font-weight: 500;">${escapeHtml(copy.condition || "Mới 100%")}</span>
          </td>
          <td>
            ${statusBadge}
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button type="button" class="btn-icon-action" onclick="window.booksApp.editCopyInline(${copy.id})" title="Chỉnh sửa vị trí/tình trạng">
                <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
              </button>
              <button type="button" class="btn-icon-action delete" onclick="window.booksApp.deleteCopy(${copy.id})" title="Xóa bản sao này">
                <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
        });

        dom.copiesTableBody.innerHTML = html;
    }

    function addCopiesBatch() {
        const book = state.activeCopiesBook;
        if (!book) return;

        const qty = parseInt(dom.newCopyQty ? dom.newCopyQty.value : 1, 10) || 1;
        const shelf = (dom.newCopyShelf ? dom.newCopyShelf.value.trim() : "") || book.shelf_location || "Kệ A3 - Ngăn 2";
        const condition = dom.newCopyCondition ? dom.newCopyCondition.value : "Mới 100%";
        const status = dom.newCopyStatus ? dom.newCopyStatus.value : "AVAILABLE";

        if (qty < 1 || qty > 50) {
            showNotification("Số lượng thêm vào phải từ 1 đến 50 bản!", "warning");
            return;
        }

        if (!book.copies) book.copies = [];
        const currentCount = book.copies.length;

        for (let i = 1; i <= qty; i++) {
            const copyNum = currentCount + i;
            const pad = String(copyNum).padStart(3, "0");
            book.copies.push({
                id: Date.now() + i,
                copy_code: `${book.isbn}-${pad}`,
                shelf_location: shelf,
                condition: condition,
                status: status
            });
        }

        // Cập nhật lại tổng số bản sao của đầu sách
        book.total_copies = book.copies.length;
        book.available_copies = book.copies.filter(c => c.status === "AVAILABLE").length;

        renderCopiesTable();
        updateKPIs();
        renderTable();
        showNotification(`Đã thêm thành công ${qty} bản sao cho đầu sách "${book.title}"!`, "success");
    }

    function editCopyInline(copyId) {
        const book = state.activeCopiesBook;
        if (!book || !book.copies) return;
        const copy = book.copies.find(c => c.id === copyId);
        if (!copy) return;

        const newShelf = window.prompt("Nhập vị trí kệ lưu trữ mới:", copy.shelf_location || "");
        if (newShelf === null) return;

        const newStatus = window.confirm("Đặt trạng thái bản sao này là AVAILABLE (Sẵn sàng)?\n- Nhấn OK: AVAILABLE\n- Nhấn Hủy (Cancel): Giữ nguyên");
        copy.shelf_location = newShelf.trim() || copy.shelf_location;
        if (newStatus) {
            copy.status = "AVAILABLE";
        }

        book.available_copies = book.copies.filter(c => c.status === "AVAILABLE").length;
        renderCopiesTable();
        updateKPIs();
        renderTable();
        showNotification(`Đã cập nhật thông tin bản sao ${copy.copy_code}.`, "success");
    }

    function deleteCopy(copyId) {
        const book = state.activeCopiesBook;
        if (!book || !book.copies) return;
        const copy = book.copies.find(c => c.id === copyId);
        if (!copy) return;

        const confirmed = window.confirm(`Bạn có chắc chắn muốn hủy bản sao "${copy.copy_code}"?`);
        if (!confirmed) return;

        book.copies = book.copies.filter(c => c.id !== copyId);
        book.total_copies = book.copies.length;
        book.available_copies = book.copies.filter(c => c.status === "AVAILABLE").length;

        renderCopiesTable();
        updateKPIs();
        renderTable();
        showNotification(`Đã xóa bản sao ${copy.copy_code}.`, "info");
    }

    // ============================================================================
    // EXPORT EXCEL (CSV WITH BOM)
    // ============================================================================
    function exportToExcel() {
        if (state.books.length === 0) {
            showNotification("Danh sách trống, không có dữ liệu để xuất!", "warning");
            return;
        }

        let csvContent = "\uFEFF"; // UTF-8 BOM
        csvContent += "Mã ISBN,Tên đầu sách,Số trang,Tác giả,Nhà xuất bản,Năm XB,Thể loại,Tổng số bản sao,Khả dụng,Vị trí kệ\n";

        state.books.forEach(b => {
            const authors = Array.isArray(b.authors) ? b.authors.join("; ") : (b.authors || "");
            const row = [
                `"${b.isbn}"`,
                `"${(b.title || "").replace(/"/g, '""')}"`,
                b.page_count || "",
                `"${authors.replace(/"/g, '""')}"`,
                `"${(b.publisher || "").replace(/"/g, '""')}"`,
                b.publish_year || "",
                `"${(b.category_name || getCategoryName(b.category_id)).replace(/"/g, '""')}"`,
                b.total_copies || 0,
                b.available_copies || 0,
                `"${(b.shelf_location || "").replace(/"/g, '""')}"`
            ];
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `danh_muc_dau_sach_KS25_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification("Đã xuất danh mục đầu sách ra tệp CSV/Excel thành công!", "success");
    }

    // ============================================================================
    // COVER IMAGE UPLOAD (FILE READER PREVIEW)
    // ============================================================================
    function handleCoverFileSelect(file) {
        if (!file || !file.type.startsWith("image/")) {
            showNotification("Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG)!", "warning");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            if (dom.coverPreviewImg) {
                dom.coverPreviewImg.src = e.target.result;
                showNotification("Đã tải ảnh bìa xem trước thành công!", "success");
            }
        };
        reader.readAsDataURL(file);
    }

    // ============================================================================
    // FETCH FROM BACKEND API (GRACEFUL FALLBACK)
    // ============================================================================
    async function loadBooksFromApi() {
        if (typeof api === "undefined" || !api.get) {
            applyFilter();
            updateKPIs();
            return;
        }

        try {
            const res = await api.get("/books/search", { page: 1, page_size: 50 });
            if (res && res.items && res.items.length > 0) {
                // Map backend books to internal structure
                const apiBooks = res.items.map(item => ({
                    isbn: item.isbn,
                    title: item.title,
                    page_count: item.page_count || 400,
                    authors: item.authors ? item.authors.map(a => a.name) : [],
                    publisher: item.publisher ? item.publisher.name : "NXB Đại học Quốc gia",
                    publish_year: item.publish_year || 2024,
                    category_id: item.category ? String(item.category.id) : "cntt",
                    category_name: item.category ? item.category.name : "CNTT & Phần mềm",
                    total_copies: item.total_copies || 0,
                    available_copies: item.available_copies || 0,
                    shelf_location: "Kệ A3 - Ngăn 2",
                    cover_image: item.cover_image || MOCK_BOOKS[0].cover_image,
                    description: item.description || "",
                    allow_home: true,
                    copies: []
                }));

                state.books = apiBooks;
                showNotification(`Đã đồng bộ ${apiBooks.length} đầu sách từ máy chủ backend.`, "info");
            }
        } catch (err) {
            console.warn("Backend API không khả dụng hoặc chưa có dữ liệu, dùng dữ liệu chuẩn Stitch:", err.message);
        } finally {
            applyFilter();
            updateKPIs();
        }
    }

    // ============================================================================
    // EVENT LISTENERS INITIALIZATION
    // ============================================================================
    function initEventListeners() {
        // 1. Filter & Search
        if (dom.filterSearchInput) {
            dom.filterSearchInput.addEventListener("input", (e) => {
                state.searchTerm = e.target.value;
                applyFilter();
            });
        }

        if (dom.topbarSearchInput) {
            dom.topbarSearchInput.addEventListener("input", (e) => {
                state.searchTerm = e.target.value;
                if (dom.filterSearchInput) dom.filterSearchInput.value = e.target.value;
                applyFilter();
            });
        }

        if (dom.filterCategory) {
            dom.filterCategory.addEventListener("change", (e) => {
                state.selectedCategory = e.target.value;
                applyFilter();
            });
        }

        if (dom.filterStatus) {
            dom.filterStatus.addEventListener("change", (e) => {
                state.selectedStatus = e.target.value;
                applyFilter();
            });
        }

        if (dom.btnApplyFilter) {
            dom.btnApplyFilter.addEventListener("click", applyFilter);
        }

        if (dom.btnResetFilter) {
            dom.btnResetFilter.addEventListener("click", () => {
                state.searchTerm = "";
                state.selectedCategory = "";
                state.selectedStatus = "";
                if (dom.filterSearchInput) dom.filterSearchInput.value = "";
                if (dom.topbarSearchInput) dom.topbarSearchInput.value = "";
                if (dom.filterCategory) dom.filterCategory.value = "";
                if (dom.filterStatus) dom.filterStatus.value = "";
                applyFilter();
                showNotification("Đã đặt lại toàn bộ bộ lọc.", "info");
            });
        }

        // 2. Add / Edit Modal
        if (dom.btnOpenCreateBook) dom.btnOpenCreateBook.addEventListener("click", openCreateModal);
        if (dom.closeModalBtn) dom.closeModalBtn.addEventListener("click", closeBookModal);
        if (dom.cancelModalBtn) dom.cancelModalBtn.addEventListener("click", closeBookModal);
        if (dom.draftModalBtn) {
            dom.draftModalBtn.addEventListener("click", () => {
                showNotification("Đã lưu bản nháp đầu sách thành công!", "info");
                closeBookModal();
            });
        }
        if (dom.submitBookBtn) dom.submitBookBtn.addEventListener("click", saveBook);

        // Dynamic Barcode Range listeners
        if (dom.bookIsbn) dom.bookIsbn.addEventListener("input", updateBarcodeRange);
        if (dom.copiesCount) dom.copiesCount.addEventListener("input", updateBarcodeRange);

        // Tag Author Chips input
        if (dom.tagAuthorInput) {
            dom.tagAuthorInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addAuthorTag(dom.tagAuthorInput.value);
                }
            });
        }

        // Image Upload
        if (dom.coverFileInput) {
            dom.coverFileInput.addEventListener("change", (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleCoverFileSelect(e.target.files[0]);
                }
            });
        }

        // Drag and drop for image
        if (dom.coverDropZone) {
            dom.coverDropZone.addEventListener("dragover", (e) => {
                e.preventDefault();
                dom.coverDropZone.style.borderColor = "var(--color-brand)";
            });
            dom.coverDropZone.addEventListener("dragleave", () => {
                dom.coverDropZone.style.borderColor = "var(--color-border)";
            });
            dom.coverDropZone.addEventListener("drop", (e) => {
                e.preventDefault();
                dom.coverDropZone.style.borderColor = "var(--color-border)";
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleCoverFileSelect(e.dataTransfer.files[0]);
                }
            });
        }

        // 3. Copies Modal
        if (dom.closeCopiesModalBtn) dom.closeCopiesModalBtn.addEventListener("click", closeCopiesModal);
        if (dom.closeCopiesModalFooterBtn) dom.closeCopiesModalFooterBtn.addEventListener("click", closeCopiesModal);
        if (dom.btnAddCopySubmit) dom.btnAddCopySubmit.addEventListener("click", addCopiesBatch);

        // 4. Export Excel
        if (dom.btnExportExcel) dom.btnExportExcel.addEventListener("click", exportToExcel);

        // Close modals on clicking overlay backdrop
        window.addEventListener("click", (e) => {
            if (e.target === dom.bookModalBackdrop) closeBookModal();
            if (e.target === dom.copiesModalBackdrop) closeCopiesModal();
        });

        // Close on Escape key
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                closeBookModal();
                closeCopiesModal();
            }
        });
    }

    // ============================================================================
    // GLOBAL EXPORTS FOR INLINE EVENT HANDLERS
    // ============================================================================
    window.booksApp = {
        openEditModal: openEditModal,
        openCopiesModal: openCopiesModal,
        deleteBook: deleteBook,
        editCopyInline: editCopyInline,
        deleteCopy: deleteCopy,
        changePage: function (p) {
            const totalPages = Math.ceil(state.filteredBooks.length / state.pageSize) || 1;
            if (p < 1 || p > totalPages) return;
            state.currentPage = p;
            renderTable();
        }
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    document.addEventListener("DOMContentLoaded", () => {
        initEventListeners();
        loadBooksFromApi();
    });

})();
