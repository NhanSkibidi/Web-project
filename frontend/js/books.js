/**
 * KS25 Library - Module Quản lý Đầu sách & Bản sao (Books & Copies Management)
 * Tuân thủ quy chuẩn Clean Architecture: Tách biệt hoàn toàn HTML / CSS / JS
 * Hỗ trợ đồng bộ Backend API RESTful với cơ chế Graceful Fallback dữ liệu nội bộ
 */

(function () {
    "use strict";

    // ============================================================================
    // MOCK DATA (DỮ LIỆU ĐẦU SÁCH & BẢN SAO ĐẬM CHẤT HỌC THUẬT KS25)
    // ============================================================================
    const MOCK_BOOKS = [
        {
            isbn: "BK-IT-2024-001",
            ddc: "005.133 (FastAPI)",
            title: "Lập trình Web Hiện đại với Python & FastAPI",
            edition: "Tái bản lần 2 (NXB Khoa Học Kỹ Thuật)",
            page_count: 420,
            authors: ["TS. Lê Hoàng Nam", "ThS. Đỗ Thùy Linh"],
            publisher: "NXB Đại học Quốc gia",
            publish_year: 2024,
            category_id: "cntt",
            category_name: "CNTT & Phần mềm",
            total_copies: 12,
            available_copies: 8,
            shelf_location: "KHO-TRUNG-TAM-A",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHUieamnMj8LEicCLHMgyMjww9oZXyp8wtMGaR0s228SJD9GGzZrYQ5H3zT5e9QLIL7Y0Z-N2De_jKyxWWrlNFfYsjHhvp71C7bb0Heww51_Rt7RID0naRcxXW97NnajMWEjHV_UPeEIFFqTIdVK5Uno62xerxYntHgt4YPfZhBLnnXxMX9xzt1LqDTTqj-fV8tvMPaj7EvHCA9Vn-IMhZ-Yx83pyVm-6sg9b3GWPS",
            description: "Giáo trình toàn diện về kiến trúc backend hiện đại, API RESTful hiệu năng cao và triển khai containerized.",
            allow_home: true,
            copies: [
                { id: 101, copy_code: "BS-IT-001-01", barcode: "893524480101", shelf_location: "Kệ A3-02-T1", shelf_sub: "Khu CNTT Tầng 2", condition: "Mới 98% • Đã dán bọc", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 102, copy_code: "BS-IT-001-02", barcode: "893524480102", shelf_location: "Kệ A3-02-T1", shelf_sub: "Đang lưu thông", condition: "Tốt • Gáy chuẩn", status: "BORROWED", borrower: "#DG-2024-0104", due_date: "04/11", policy: "Mượn 14 ngày" },
                { id: 103, copy_code: "BS-IT-001-03", barcode: "893524480103", shelf_location: "Kệ A3-02-T1", shelf_sub: "Đang lưu thông", condition: "Tốt • Bọc plastic", status: "OVERDUE", overdue_days: 2, borrower: "#DG-2023-0882", policy: "Mượn 14 ngày" },
                { id: 104, copy_code: "BS-IT-001-04", barcode: "893524480104", shelf_location: "P. Kỹ thuật 204", shelf_sub: "Chờ phục chế", condition: "Bung gáy • Rách trang 42-45", status: "DAMAGED", policy: "Tạm khóa" },
                { id: 105, copy_code: "BS-IT-001-05", barcode: "893524480105", shelf_location: "Xưởng đóng bìa B1", shelf_sub: "Định kỳ phủ keo", condition: "Bảo trì dự phòng định kỳ", status: "MAINTENANCE", policy: "Tạm khóa" },
                { id: 106, copy_code: "BS-IT-001-06", barcode: "893524480106", shelf_location: "Tủ Kính R-01", shelf_sub: "Lưu chiểu an toàn", condition: "Bản lưu chiểu hoàn hảo 100%", status: "AVAILABLE", policy: "Chỉ đọc tại chỗ" },
                { id: 107, copy_code: "BS-IT-001-07", barcode: "893524480107", shelf_location: "Kệ A3-02-T1", shelf_sub: "Khu CNTT Tầng 2", condition: "Mới 98% • Nguyên vẹn", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 108, copy_code: "BS-IT-001-08", barcode: "893524480108", shelf_location: "Kệ A3-02-T1", shelf_sub: "Khu CNTT Tầng 2", condition: "Mới 98%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 109, copy_code: "BS-IT-001-09", barcode: "893524480109", shelf_location: "Kệ A3-02-T1", shelf_sub: "Khu CNTT Tầng 2", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 110, copy_code: "BS-IT-001-10", barcode: "893524480110", shelf_location: "Kệ A3-02-T1", shelf_sub: "Khu CNTT Tầng 2", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 111, copy_code: "BS-IT-001-11", barcode: "893524480111", shelf_location: "Kệ A3-02-T1", shelf_sub: "Khu CNTT Tầng 2", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 112, copy_code: "BS-IT-001-12", barcode: "893524480112", shelf_location: "Kệ A3-02-T1", shelf_sub: "Khu CNTT Tầng 2", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" }
            ],
            audit_logs: [
                {
                    id: 1,
                    copy_code: "BS-IT-001-04",
                    event_type: "INCIDENT",
                    title: "Sự cố bạn đọc trả sách",
                    time: "28/10/2024 10:45:12",
                    from_status: "Đang mượn (BORROWED)",
                    to_status: "Hư hỏng (DAMAGED)",
                    desc: "Độc giả Nguyễn Văn An làm rách trang 42-45 khi trả sách. Đã lập biên bản xử lý phụ phí phục chế 20.000đ (#BL-2025-0429).",
                    staff: "Trần Minh Quang (Quầy 01)",
                    has_pdf: true
                },
                {
                    id: 2,
                    copy_code: "BS-IT-001-02",
                    event_type: "MAINTENANCE_DONE",
                    title: "Bảo dưỡng hoàn tất",
                    time: "14/10/2024 09:15:00",
                    from_status: "Bảo trì (MAINTENANCE)",
                    to_status: "Khả dụng (AVAILABLE)",
                    desc: "Đã hoàn thành dán gáy gia cố polymer và kiểm định thành công chip RFID tại cổng an ninh.",
                    staff: "Lê Thị Mai (Xưởng Tu bổ)",
                    standard_met: true
                },
                {
                    id: 3,
                    copy_code: "Lô 12 bản sao (BS-01 -> BS-12)",
                    event_type: "INITIAL_INGESTION",
                    title: "Nhập kho lô đầu tiên",
                    time: "15/01/2024 08:00:00",
                    from_status: "Khởi tạo mới",
                    to_status: "AVAILABLE (11 Bản) & ARCHIVE (1 Bản)",
                    desc: "Nghiệm thu bàn giao sách đợt Quý 1/2024. Đã phân loại DDC 005.133, dán RFID và đưa lên giá.",
                    staff: "KS25 Biblio Core (Lô #BATCH-2024-Q1)",
                    auto: true
                }
            ]
        },
        {
            isbn: "BK-IT-2023-089",
            ddc: "004.22 (Architecture)",
            title: "Kiến trúc Hệ thống & Thiết kế Microservices",
            edition: "Bản dịch tiếng Việt (NXB Bách Khoa)",
            page_count: 560,
            authors: ["Martin Kleppmann", "TS. Vũ Hải Đăng (Dịch)"],
            publisher: "NXB Bách Khoa",
            publish_year: 2023,
            category_id: "cntt",
            category_name: "CNTT & Phần mềm",
            total_copies: 6,
            available_copies: 1,
            shelf_location: "KHO-TRUNG-TAM-B",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBHQUn9YGRWpra0RQY3gATlmUWAz6-UQoT7ak7BIQWQILyZK014OGoBcV-R9HcMooC_26loKEpxs8YTpv2F31KZsjiJdvHDYWcFocBwGP44gWQUSd2xU8qRTg_gYx_Ak-PcbiCrOgapKsLM0NHx6pvJ-k60Yc-1lndI3DPTxgY9m729yScg0PP-PG9tDotRQlpqy07_yi6nQL0GgP_S3qIWkJ32MPFBObSqaXDrO9Ga",
            description: "Phân tích chuyên sâu về dữ liệu phân tán, tính nhất quán, xử lý stream và độ tin cậy trong các hệ thống quy mô lớn.",
            allow_home: true,
            copies: [
                { id: 201, copy_code: "BS-IT-089-01", barcode: "893524480201", shelf_location: "Kệ B1-01-T2", shelf_sub: "Đang lưu thông", condition: "Tốt 95%", status: "BORROWED", borrower: "#DG-2024-0012", due_date: "08/11", policy: "Mượn 14 ngày" },
                { id: 202, copy_code: "BS-IT-089-02", barcode: "893524480202", shelf_location: "Kệ B1-01-T2", shelf_sub: "Đang lưu thông", condition: "Tốt 95%", status: "BORROWED", borrower: "#DG-2024-0045", due_date: "12/11", policy: "Mượn 14 ngày" },
                { id: 203, copy_code: "BS-IT-089-03", barcode: "893524480203", shelf_location: "Kệ B1-01-T2", shelf_sub: "Đang lưu thông", condition: "Cũ 80%", status: "BORROWED", borrower: "#DG-2023-0911", due_date: "01/11", policy: "Mượn 14 ngày" },
                { id: 204, copy_code: "BS-IT-089-04", barcode: "893524480204", shelf_location: "Kệ B1-01-T2", shelf_sub: "Đang lưu thông", condition: "Cũ 80%", status: "BORROWED", borrower: "#DG-2024-0231", due_date: "15/11", policy: "Mượn 14 ngày" },
                { id: 205, copy_code: "BS-IT-089-05", barcode: "893524480205", shelf_location: "Kệ B1-01-T2", shelf_sub: "Khu Kỹ thuật", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 206, copy_code: "BS-IT-089-06", barcode: "893524480206", shelf_location: "Xưởng đóng bìa B1", shelf_sub: "Định kỳ gia cố", condition: "Hư hỏng nhẹ bìa sau", status: "MAINTENANCE", policy: "Tạm khóa" }
            ],
            audit_logs: [
                {
                    id: 1,
                    copy_code: "BS-IT-089-06",
                    event_type: "INCIDENT",
                    title: "Chuyển bảo quản xưởng B1",
                    time: "10/10/2024 14:20:00",
                    from_status: "AVAILABLE",
                    to_status: "MAINTENANCE",
                    desc: "Bìa sau bị rách nhỏ do di chuyển kệ, chuyển sang dán keo ép nhiệt.",
                    staff: "Ngô Việt Dũng (Thủ thư)",
                    has_pdf: false
                }
            ]
        },
        {
            isbn: "BK-BA-2024-015",
            ddc: "332.1 (Fintech)",
            title: "Tài chính Số & Ứng dụng Công nghệ Ngân hàng",
            edition: "Ấn bản năm 2024 (NXB Kinh Tế)",
            page_count: 380,
            authors: ["PGS.TS. Phạm Minh Tuấn"],
            publisher: "NXB Kinh Tế TP.HCM",
            publish_year: 2024,
            category_id: "kinhte",
            category_name: "Kinh tế & Quản trị",
            total_copies: 5,
            available_copies: 4,
            shelf_location: "KHO-TRUNG-TAM-C",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHUieamnMj8LEicCLHMgyMjww9oZXyp8wtMGaR0s228SJD9GGzZrYQ5H3zT5e9QLIL7Y0Z-N2De_jKyxWWrlNFfYsjHhvp71C7bb0Heww51_Rt7RID0naRcxXW97NnajMWEjHV_UPeEIFFqTIdVK5Uno62xerxYntHgt4YPfZhBLnnXxMX9xzt1LqDTTqj-fV8tvMPaj7EvHCA9Vn-IMhZ-Yx83pyVm-6sg9b3GWPS",
            description: "Mô hình ngân hàng mở, chuỗi khối trong thanh toán liên ngân hàng và phân tích hành vi tiêu dùng số.",
            allow_home: true,
            copies: [
                { id: 301, copy_code: "BS-BA-015-01", barcode: "893524480301", shelf_location: "Kệ C2-03", shelf_sub: "Khu Kinh tế", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 302, copy_code: "BS-BA-015-02", barcode: "893524480302", shelf_location: "Kệ C2-03", shelf_sub: "Khu Kinh tế", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 303, copy_code: "BS-BA-015-03", barcode: "893524480303", shelf_location: "Kệ C2-03", shelf_sub: "Đang lưu thông", condition: "Mới 100%", status: "BORROWED", borrower: "#DG-2024-0551", due_date: "18/11", policy: "Mượn 14 ngày" },
                { id: 304, copy_code: "BS-BA-015-04", barcode: "893524480304", shelf_location: "Kệ C2-03", shelf_sub: "Khu Kinh tế", condition: "Tốt 95%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 305, copy_code: "BS-BA-015-05", barcode: "893524480305", shelf_location: "Kệ C2-03", shelf_sub: "Khu Kinh tế", condition: "Tốt 95%", status: "AVAILABLE", policy: "Mượn 14 ngày" }
            ],
            audit_logs: []
        },
        {
            isbn: "BK-IT-2022-044",
            ddc: "005.1 (Clean Code)",
            title: "Clean Code - Nghệ thuật viết mã sạch",
            edition: "Bản dịch tiếng Việt (Tái bản 2022)",
            page_count: 464,
            authors: ["Robert C. Martin", "Đặng Hoàng Giang (Dịch)"],
            publisher: "NXB Thông tin & Truyền thông",
            publish_year: 2022,
            category_id: "cntt",
            category_name: "CNTT & Phần mềm",
            total_copies: 5,
            available_copies: 0,
            shelf_location: "KHO-TRUNG-TAM-A",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnTbrgIeAXaD45Ds09K3bfEVOe6s4f1c8s--JxUoMUMyzsZxHXnacUc2e6PoIGYnowZW67AdBuPdY-FxAs-5RDN6QATxyiSe9JoQ-wUgo9Q7l-Tmt5sIg6WUWytjD0IAK2HyjB6zqBE4AH53XLbLTJUzoTUUf4vN8vqHthVDbYyZ6OFcYfAXnn0qNol6qqW28qB8cZMcwBSv6V_iEfqVWR2lEgqML9Yt9CaXO_JouC",
            description: "Cẩm nang bắt buộc về quy chuẩn đặt tên, thiết kế hàm, nguyên lý SOLID và tái cấu trúc mã nguồn.",
            allow_home: true,
            copies: [
                { id: 401, copy_code: "BS-IT-044-01", barcode: "893524480401", shelf_location: "Kệ A1-04", shelf_sub: "Đang lưu thông", condition: "Cũ 80%", status: "BORROWED", borrower: "#DG-2024-0199", due_date: "05/11", policy: "Mượn 14 ngày" },
                { id: 402, copy_code: "BS-IT-044-02", barcode: "893524480402", shelf_location: "Kệ A1-04", shelf_sub: "Đang lưu thông", condition: "Cũ 80%", status: "BORROWED", borrower: "#DG-2024-0210", due_date: "07/11", policy: "Mượn 14 ngày" },
                { id: 403, copy_code: "BS-IT-044-03", barcode: "893524480403", shelf_location: "Kệ A1-04", shelf_sub: "Đang lưu thông", condition: "Tốt 95%", status: "BORROWED", borrower: "#DG-2024-0304", due_date: "10/11", policy: "Mượn 14 ngày" },
                { id: 404, copy_code: "BS-IT-044-04", barcode: "893524480404", shelf_location: "Kệ A1-04", shelf_sub: "Đang lưu thông", condition: "Tốt 95%", status: "BORROWED", borrower: "#DG-2024-0412", due_date: "14/11", policy: "Mượn 14 ngày" },
                { id: 405, copy_code: "BS-IT-044-05", barcode: "893524480405", shelf_location: "Kệ A1-04", shelf_sub: "Đang lưu thông", condition: "Cũ 80%", status: "BORROWED", borrower: "#DG-2024-0518", due_date: "16/11", policy: "Mượn 14 ngày" }
            ],
            audit_logs: []
        },
        {
            isbn: "BK-MA-2023-112",
            ddc: "519.5 (Statistics)",
            title: "Xác suất Thống kê Nâng cao cho Khoa học Dữ liệu",
            edition: "Giáo trình ĐHQG 2023",
            page_count: 312,
            authors: ["GS. Đặng Đình Thi", "TS. Nguyễn Minh Trí"],
            publisher: "NXB Đại học Quốc gia",
            publish_year: 2023,
            category_id: "toan",
            category_name: "Khoa học Cơ bản",
            total_copies: 8,
            available_copies: 5,
            shelf_location: "KHO-TRUNG-TAM-D",
            cover_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHUieamnMj8LEicCLHMgyMjww9oZXyp8wtMGaR0s228SJD9GGzZrYQ5H3zT5e9QLIL7Y0Z-N2De_jKyxWWrlNFfYsjHhvp71C7bb0Heww51_Rt7RID0naRcxXW97NnajMWEjHV_UPeEIFFqTIdVK5Uno62xerxYntHgt4YPfZhBLnnXxMX9xzt1LqDTTqj-fV8tvMPaj7EvHCA9Vn-IMhZ-Yx83pyVm-6sg9b3GWPS",
            description: "Lý thuyết xác suất phân phối, kiểm định giả thuyết và ứng dụng trong các giải thuật máy học.",
            allow_home: true,
            copies: [
                { id: 501, copy_code: "BS-MA-112-01", barcode: "893524480501", shelf_location: "Kệ D1-02", shelf_sub: "Khoa học Cơ bản", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 502, copy_code: "BS-MA-112-02", barcode: "893524480502", shelf_location: "Kệ D1-02", shelf_sub: "Khoa học Cơ bản", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 503, copy_code: "BS-MA-112-03", barcode: "893524480503", shelf_location: "Kệ D1-02", shelf_sub: "Khoa học Cơ bản", condition: "Mới 100%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 504, copy_code: "BS-MA-112-04", barcode: "893524480504", shelf_location: "Kệ D1-02", shelf_sub: "Đang lưu thông", condition: "Tốt 95%", status: "BORROWED", borrower: "#DG-2024-0801", due_date: "19/11", policy: "Mượn 14 ngày" },
                { id: 505, copy_code: "BS-MA-112-05", barcode: "893524480505", shelf_location: "Kệ D1-02", shelf_sub: "Khoa học Cơ bản", condition: "Tốt 95%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 506, copy_code: "BS-MA-112-06", barcode: "893524480506", shelf_location: "Kệ D1-02", shelf_sub: "Khoa học Cơ bản", condition: "Tốt 95%", status: "AVAILABLE", policy: "Mượn 14 ngày" },
                { id: 507, copy_code: "BS-MA-112-07", barcode: "893524480507", shelf_location: "Kệ D1-02", shelf_sub: "Đang lưu thông", condition: "Tốt 95%", status: "BORROWED", borrower: "#DG-2024-0820", due_date: "20/11", policy: "Mượn 14 ngày" },
                { id: 508, copy_code: "BS-MA-112-08", barcode: "893524480508", shelf_location: "Kệ D1-02", shelf_sub: "Đang lưu thông", condition: "Tốt 95%", status: "BORROWED", borrower: "#DG-2024-0842", due_date: "22/11", policy: "Mượn 14 ngày" }
            ],
            audit_logs: []
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
        editingIsbn: null,
        authorTags: ["TS. Lê Hoàng Nam", "ThS. Đỗ Thùy Linh"],
        activeCopiesBook: null,
        copiesFilter: "ALL", // 'ALL' | 'AVAILABLE' | 'BORROWED' | 'ISSUES'
        copiesSearch: "",
        copiesPage: 1,
        copiesPageSize: 6,
        activeCopyForStatus: null
    };

    // ============================================================================
    // DOM ELEMENTS (HỖ TRỢ CẢ ĐỊNH DẠNG CAMELCASE LẪN KEBAB-CASE TRÁNH LỖI)
    // ============================================================================
    const dom = {
        // KPI Cards
        kpiTotalBooks: document.getElementById("kpi-total-books"),
        kpiTotalCopies: document.getElementById("kpi-total-copies"),
        kpiAvailableCopies: document.getElementById("kpi-available-copies"),
        kpiBorrowedCopies: document.getElementById("kpi-borrowed-copies"),

        // Filter & Search
        filterSearchInput: document.getElementById("filter-search-input"),
        topbarSearchInput: document.getElementById("topbar-global-search"),
        filterCategory: document.getElementById("filter-category"),
        filterStatus: document.getElementById("filter-status"),
        btnApplyFilter: document.getElementById("btn-apply-filter"),
        btnResetFilter: document.getElementById("btn-reset-filter"),

        // Main Table & Pagination
        booksTableBody: document.getElementById("books-table-body") || document.getElementById("booksTableBody"),
        pageStart: document.getElementById("page-start"),
        pageEnd: document.getElementById("page-end"),
        totalRecords: document.getElementById("total-records"),
        paginationInfo: document.getElementById("pagination-info") || document.getElementById("paginationInfo"),
        paginationControls: document.getElementById("pagination-controls") || document.getElementById("paginationControls"),

        // Modal 1: Create / Edit Book
        bookModalBackdrop: document.getElementById("bookModalBackdrop"),
        bookForm: document.getElementById("bookForm"),
        btnOpenCreateBook: document.getElementById("btn-open-create-book") || document.getElementById("btnOpenCreateBook"),
        closeModalBtn: document.getElementById("closeModalBtn"),
        cancelModalBtn: document.getElementById("cancelModalBtn"),
        draftModalBtn: document.getElementById("draftModalBtn"),
        submitBookBtn: document.getElementById("submitBookBtn"),
        modalBookHeading: document.getElementById("modal-book-heading"),
        modalBookBadge: document.getElementById("modal-book-badge"),

        // Modal 1 Form inputs
        bookTitle: document.getElementById("bookTitle"),
        bookIsbn: document.getElementById("bookIsbn"),
        bookCategory: document.getElementById("bookCategory"),
        authorChipsContainer: document.getElementById("authorChipsContainer"),
        tagAuthorInput: document.getElementById("tagAuthorInput"),
        bookPublisher: document.getElementById("bookPublisher"),
        bookYear: document.getElementById("bookYear"),
        bookPageCount: document.getElementById("bookPages") || document.getElementById("bookPageCount"),
        bookShelf: document.getElementById("bookShelf"),
        bookDescription: document.getElementById("bookSummary") || document.getElementById("bookDescription"),
        bookAllowHome: document.getElementById("allowBorrowHome") || document.getElementById("bookAllowHome"),
        coverFileInput: document.getElementById("coverFileInput"),
        coverDropZone: document.getElementById("coverDropZone"),
        coverPreviewImg: document.getElementById("coverPreviewImg"),
        copiesCount: document.getElementById("copiesCount"),
        barcodeRange: document.getElementById("barcodeRange") || document.getElementById("barcodeRangeText"),

        // Modal 2: Stitch High-Fidelity Copies Modal
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
        newCopyPolicy: document.getElementById("newCopyPolicy"),

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

        // General
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

    function showNotification(message, type = "info") {
        if (!dom.toastBox) {
            console.log(`[Toast ${type}]:`, message);
            return;
        }

        const toast = document.createElement("div");
        toast.className = `toast-item ${type}`;

        let icon = "info";
        if (type === "success") icon = "check_circle";
        if (type === "error") icon = "error";
        if (type === "warning") icon = "warning";

        toast.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
            <span style="flex: 1; font-size: 13px; font-weight: 500;">${escapeHtml(message)}</span>
        `;

        dom.toastBox.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-10px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function getCategoryName(catId) {
        switch (catId) {
            case "cntt": return "CNTT & Phần mềm";
            case "kinhte": return "Kinh tế & Quản trị";
            case "toan": return "Khoa học Cơ bản";
            case "ngoai-ngu": return "Ngoại ngữ & Văn học";
            case "ky-thuat": return "Kỹ thuật & Công nghệ";
            default: return "Chung";
        }
    }

    // ============================================================================
    // KPI METRIC UPDATES
    // ============================================================================
    function updateKPIs() {
        const totalBooks = state.books.length;
        let totalCopies = 0;
        let availableCopies = 0;
        let borrowedCopies = 0;

        state.books.forEach((b) => {
            const copies = b.copies || [];
            totalCopies += copies.length;
            availableCopies += copies.filter((c) => c.status === "AVAILABLE").length;
            borrowedCopies += copies.filter((c) => c.status === "BORROWED" || c.status === "OVERDUE").length;
        });

        if (dom.kpiTotalBooks) dom.kpiTotalBooks.textContent = totalBooks.toLocaleString("vi-VN");
        if (dom.kpiTotalCopies) dom.kpiTotalCopies.textContent = totalCopies.toLocaleString("vi-VN");
        if (dom.kpiAvailableCopies) dom.kpiAvailableCopies.textContent = availableCopies.toLocaleString("vi-VN");
        if (dom.kpiBorrowedCopies) dom.kpiBorrowedCopies.textContent = borrowedCopies.toLocaleString("vi-VN");
    }

    // ============================================================================
    // MAIN BOOKS TABLE (FILTER, SEARCH, RENDER & PAGINATION)
    // ============================================================================
    function applyFilter() {
        const term = (state.searchTerm || "").toLowerCase().trim();
        const cat = state.selectedCategory || "";
        const stat = state.selectedStatus || "";

        state.filteredBooks = state.books.filter((b) => {
            const matchSearch =
                !term ||
                (b.title && b.title.toLowerCase().includes(term)) ||
                (b.isbn && b.isbn.toLowerCase().includes(term)) ||
                (b.authors && b.authors.some((a) => a.toLowerCase().includes(term))) ||
                (b.publisher && b.publisher.toLowerCase().includes(term));

            const matchCat = !cat || b.category_id === cat;

            let matchStat = true;
            if (stat === "available") {
                matchStat = (b.available_copies || 0) > 0;
            } else if (stat === "borrowed") {
                matchStat = (b.total_copies - (b.available_copies || 0)) > 0;
            } else if (stat === "empty") {
                matchStat = (b.available_copies || 0) === 0;
            }

            return matchSearch && matchCat && matchStat;
        });

        state.currentPage = 1;
        renderTable();
    }

    function renderTable() {
        if (!dom.booksTableBody) return;

        const totalItems = state.filteredBooks.length;
        const totalPages = Math.ceil(totalItems / state.pageSize) || 1;

        if (state.currentPage > totalPages) state.currentPage = totalPages;
        const startIndex = (state.currentPage - 1) * state.pageSize;
        const endIndex = Math.min(startIndex + state.pageSize, totalItems);
        const pageItems = state.filteredBooks.slice(startIndex, endIndex);

        if (dom.pageStart) dom.pageStart.textContent = totalItems > 0 ? startIndex + 1 : 0;
        if (dom.pageEnd) dom.pageEnd.textContent = endIndex;
        if (dom.totalRecords) dom.totalRecords.textContent = totalItems;

        if (pageItems.length === 0) {
            dom.booksTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                        <span class="material-symbols-outlined" style="font-size: 40px; display: block; margin-bottom: 8px; color: var(--color-text-muted);">menu_book</span>
                        Không tìm thấy đầu sách nào phù hợp với bộ lọc hiện tại.
                    </td>
                </tr>
            `;
            if (dom.paginationControls) dom.paginationControls.innerHTML = "";
            return;
        }

        let html = "";
        pageItems.forEach((book) => {
            const isAvail = (book.available_copies || 0) > 0;
            const statusBadge = isAvail
                ? `<span class="status-badge available"><span class="dot"></span> ${book.available_copies} sẵn sàng</span>`
                : `<span class="status-badge empty"><span class="dot"></span> Hết bản sao</span>`;

            const authorsDisplay = (book.authors || []).join(", ");
            const coverSrc = book.cover_image || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&q=80";

            html += `
                <tr>
                    <td>
                        <span class="book-code-cell">${escapeHtml(book.isbn)}</span>
                        <span class="book-isbn-cell">${escapeHtml(book.isbn)}</span>
                    </td>
                    <td style="text-align: center;">
                        <img src="${coverSrc}" alt="${escapeHtml(book.title)}" class="book-cover-img" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&q=80'">
                    </td>
                    <td>
                        <span class="book-title-text" onclick="window.booksApp.openEditModal('${book.isbn}')">${escapeHtml(book.title)}</span>
                        <span class="book-page-text">${book.page_count || 400} trang • Vị trí: ${escapeHtml(book.shelf_location || "Kệ A3-02-T1")}</span>
                    </td>
                    <td>
                        <span class="book-author-text">${escapeHtml(authorsDisplay)}</span>
                        <span class="book-publisher-text">${escapeHtml(book.publisher || "NXB ĐHQG")} (${book.publish_year || 2024})</span>
                    </td>
                    <td>
                        <span class="category-tag">${escapeHtml(book.category_name || getCategoryName(book.category_id))}</span>
                    </td>
                    <td style="text-align: center;">
                        <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: var(--color-text-primary);">${book.total_copies || 0}</span>
                    </td>
                    <td style="text-align: center;">
                        ${statusBadge}
                    </td>
                    <td style="text-align: right;">
                        <div class="table-actions" style="justify-content: flex-end;">
                            <button type="button" class="btn-table-action" onclick="window.booksApp.openEditModal('${book.isbn}')" title="Chỉnh sửa thông tin">
                                <span class="material-symbols-outlined">edit</span>
                            </button>
                            <button type="button" class="btn-table-action" onclick="window.booksApp.openCopiesModal('${book.isbn}')" title="Quản lý bản sao">
                                <span class="material-symbols-outlined">qr_code_2</span>
                            </button>
                            <button type="button" class="btn-table-action delete" onclick="window.booksApp.deleteBook('${book.isbn}')" title="Xóa đầu sách">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        dom.booksTableBody.innerHTML = html;
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        if (!dom.paginationControls) return;
        let html = "";

        html += `
            <button type="button" class="btn-pagination" ${state.currentPage === 1 ? "disabled" : ""} onclick="window.booksApp.setPage(${state.currentPage - 1})">
                <span class="material-symbols-outlined" style="font-size: 16px;">chevron_left</span>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= state.currentPage - 1 && i <= state.currentPage + 1)) {
                html += `
                    <button type="button" class="btn-pagination ${i === state.currentPage ? "active" : ""}" onclick="window.booksApp.setPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === state.currentPage - 2 || i === state.currentPage + 2) {
                html += `<span style="padding: 0 4px; color: var(--color-text-muted);">...</span>`;
            }
        }

        html += `
            <button type="button" class="btn-pagination" ${state.currentPage === totalPages ? "disabled" : ""} onclick="window.booksApp.setPage(${state.currentPage + 1})">
                <span class="material-symbols-outlined" style="font-size: 16px;">chevron_right</span>
            </button>
        `;

        dom.paginationControls.innerHTML = html;
    }

    function setPage(page) {
        state.currentPage = page;
        renderTable();
    }

    // ============================================================================
    // MODAL 1: CREATE & EDIT BOOK (AUTHOR CHIPS, BARCODES, PREVIEWS)
    // ============================================================================
    function renderAuthorChips() {
        if (!dom.authorChipsContainer) return;
        let html = "";
        state.authorTags.forEach((author, index) => {
            html += `
                <span class="tag-chip">
                    ${escapeHtml(author)}
                    <button type="button" class="btn-remove-tag" onclick="window.booksApp.removeAuthorTag(${index})">&times;</button>
                </span>
            `;
        });
        dom.authorChipsContainer.innerHTML = html;
    }

    function addAuthorTag(name) {
        const trimmed = (name || "").trim();
        if (trimmed && !state.authorTags.includes(trimmed)) {
            state.authorTags.push(trimmed);
            renderAuthorChips();
            if (dom.tagAuthorInput) dom.tagAuthorInput.value = "";
        }
    }

    function removeAuthorTag(index) {
        state.authorTags.splice(index, 1);
        renderAuthorChips();
    }

    function updateBarcodeRange() {
        const isbnVal = (dom.bookIsbn ? dom.bookIsbn.value.trim() : "") || "BK-IT-2024-002";
        const countVal = parseInt(dom.copiesCount ? dom.copiesCount.value : 1, 10) || 1;
        if (dom.barcodeRange) {
            const padEnd = String(countVal).padStart(3, "0");
            dom.barcodeRange.textContent = `${isbnVal}-001 ... ${padEnd}`;
        }
    }

    function handleCoverFileSelect(file) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showNotification("Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG)!", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            if (dom.coverPreviewImg) {
                dom.coverPreviewImg.src = e.target.result;
                dom.coverPreviewImg.style.display = "block";
            }
        };
        reader.readAsDataURL(file);
    }

    function openCreateModal() {
        state.editingIsbn = null;
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

        // Reset inputs
        if (dom.bookTitle) dom.bookTitle.value = "";
        if (dom.bookIsbn) {
            dom.bookIsbn.value = `BK-IT-2024-${String(Math.floor(Math.random() * 900) + 100)}`;
            dom.bookIsbn.readOnly = false;
        }
        if (dom.bookCategory) dom.bookCategory.value = "cntt";
        state.authorTags = ["TS. Nguyễn Văn A", "ThS. Trần B"];
        renderAuthorChips();

        if (dom.bookPublisher) dom.bookPublisher.value = "NXB Đại học Quốc gia";
        if (dom.bookYear) dom.bookYear.value = 2024;
        if (dom.bookPageCount) dom.bookPageCount.value = 412;
        if (dom.bookShelf) dom.bookShelf.value = "Kệ A3 - Ngăn 2";
        if (dom.bookDescription) dom.bookDescription.value = "";
        if (dom.bookAllowHome) dom.bookAllowHome.checked = true;
        if (dom.copiesCount) dom.copiesCount.value = 5;

        if (dom.coverPreviewImg) {
            dom.coverPreviewImg.src = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80";
            dom.coverPreviewImg.style.display = "block";
        }

        updateBarcodeRange();
        if (dom.bookModalBackdrop) dom.bookModalBackdrop.classList.remove("hidden");
    }

    function openEditModal(isbn) {
        const book = state.books.find((b) => b.isbn === isbn);
        if (!book) {
            showNotification("Không tìm thấy đầu sách này!", "error");
            return;
        }

        state.editingIsbn = isbn;
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
        if (dom.bookCategory) dom.bookCategory.value = book.category_id || "cntt";
        state.authorTags = Array.isArray(book.authors) ? [...book.authors] : [];
        renderAuthorChips();

        if (dom.bookPublisher) dom.bookPublisher.value = book.publisher || "NXB Đại học Quốc gia";
        if (dom.bookYear) dom.bookYear.value = book.publish_year || 2024;
        if (dom.bookPageCount) dom.bookPageCount.value = book.page_count || 400;
        if (dom.bookShelf) dom.bookShelf.value = book.shelf_location || "Kệ A3 - Ngăn 2";
        if (dom.bookDescription) dom.bookDescription.value = book.description || "";
        if (dom.bookAllowHome) dom.bookAllowHome.checked = book.allow_home !== false;
        if (dom.copiesCount) dom.copiesCount.value = (book.copies ? book.copies.length : book.total_copies) || 1;

        if (dom.coverPreviewImg) {
            dom.coverPreviewImg.src = book.cover_image || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80";
            dom.coverPreviewImg.style.display = "block";
        }

        updateBarcodeRange();
        if (dom.bookModalBackdrop) dom.bookModalBackdrop.classList.remove("hidden");
    }

    function closeBookModal() {
        if (dom.bookModalBackdrop) dom.bookModalBackdrop.classList.add("hidden");
        state.editingIsbn = null;
    }

    async function saveBook() {
        const title = dom.bookTitle ? dom.bookTitle.value.trim() : "";
        const isbn = dom.bookIsbn ? dom.bookIsbn.value.trim() : "";
        const categoryId = dom.bookCategory ? dom.bookCategory.value : "cntt";
        const publisher = dom.bookPublisher ? dom.bookPublisher.value.trim() : "";
        const publishYear = parseInt(dom.bookYear ? dom.bookYear.value : 2024, 10) || 2024;
        const pageCount = parseInt(dom.bookPageCount ? dom.bookPageCount.value : 0, 10) || 0;
        const shelfLocation = dom.bookShelf ? dom.bookShelf.value.trim() : "";
        const description = dom.bookDescription ? dom.bookDescription.value.trim() : "";
        const allowHome = dom.bookAllowHome ? dom.bookAllowHome.checked : true;
        const count = parseInt(dom.copiesCount ? dom.copiesCount.value : 1, 10) || 1;

        if (!title || !isbn) {
            showNotification("Vui lòng nhập đầy đủ Tên đầu sách và Mã phân loại / ISBN!", "error");
            return;
        }

        const authors = state.authorTags.length > 0 ? [...state.authorTags] : ["Chưa rõ tác giả"];
        const coverImage = dom.coverPreviewImg && dom.coverPreviewImg.src ? dom.coverPreviewImg.src : "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80";

        const bookPayload = {
            isbn: isbn,
            ddc: "005.1 (Khởi tạo)",
            title: title,
            edition: "Ấn bản mới (KS25)",
            authors: authors,
            category_id: categoryId,
            category_name: getCategoryName(categoryId),
            publisher: publisher,
            publish_year: publishYear,
            page_count: pageCount,
            shelf_location: shelfLocation || "KHO-TRUNG-TAM-A",
            description: description,
            allow_home: allowHome,
            cover_image: coverImage
        };

        if (state.editingIsbn) {
            // Cập nhật sách hiện tại
            const idx = state.books.findIndex((b) => b.isbn === state.editingIsbn);
            if (idx !== -1) {
                state.books[idx] = {
                    ...state.books[idx],
                    ...bookPayload
                };
                showNotification(`Đã cập nhật đầu sách "${title}" thành công!`, "success");
            }
        } else {
            // Kiểm tra trùng ISBN
            if (state.books.some((b) => b.isbn === isbn)) {
                showNotification("Mã ISBN này đã tồn tại trong hệ thống!", "error");
                return;
            }

            // Tạo các bản sao tự động
            const copies = [];
            for (let i = 1; i <= count; i++) {
                const pad = String(i).padStart(3, "0");
                copies.push({
                    id: Date.now() + i,
                    copy_code: `BS-${isbn.replace(/[^A-Za-z0-9]/g, "")}-${pad}`,
                    barcode: `893524${String(Date.now()).slice(-4)}${pad}`,
                    shelf_location: shelfLocation || "KHO-TRUNG-TAM-A",
                    shelf_sub: "Khu vực lưu thông",
                    condition: "Mới 100% • Khởi tạo ban đầu",
                    status: "AVAILABLE",
                    policy: allowHome ? "Mượn 14 ngày" : "Chỉ đọc tại chỗ"
                });
            }

            bookPayload.copies = copies;
            bookPayload.total_copies = copies.length;
            bookPayload.available_copies = copies.length;
            bookPayload.audit_logs = [
                {
                    id: 1,
                    copy_code: `Lô ${copies.length} bản sao (${copies[0].copy_code} -> ${copies[copies.length - 1].copy_code})`,
                    event_type: "INITIAL_INGESTION",
                    title: "Khởi tạo đầu sách & nhập kho bản sao ban đầu",
                    time: new Date().toLocaleString("vi-VN"),
                    from_status: "Khởi tạo mới",
                    to_status: "AVAILABLE",
                    desc: `Tạo mới đầu sách với ${copies.length} bản sao ban đầu theo quy chuẩn lưu trữ.`,
                    staff: "Thủ thư trưởng (TT-04)",
                    auto: true
                }
            ];

            state.books.unshift(bookPayload);
            showNotification(`Đã thêm mới đầu sách "${title}" với ${count} bản sao!`, "success");
        }

        updateKPIs();
        applyFilter();
        closeBookModal();
    }

    function deleteBook(isbn) {
        const book = state.books.find((b) => b.isbn === isbn);
        if (!book) return;

        const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa đầu sách "${book.title}" và toàn bộ ${book.total_copies || 0} bản sao liên quan?`);
        if (!confirmed) return;

        state.books = state.books.filter((b) => b.isbn !== isbn);
        showNotification(`Đã xóa thành công đầu sách "${book.title}".`, "info");
        updateKPIs();
        applyFilter();
    }

    // ============================================================================
    // MODAL 2: STITCH HIGH-FIDELITY COPIES & STATUS MANAGEMENT
    // ============================================================================
    function openCopiesModal(isbn) {
        const book = state.books.find((b) => b.isbn === isbn);
        if (!book) {
            showNotification("Không tìm thấy đầu sách này!", "error");
            return;
        }

        state.activeCopiesBook = book;
        state.copiesFilter = "ALL";
        state.copiesSearch = "";
        state.copiesPage = 1;
        state.activeCopyForStatus = null;

        // Đảm bảo book.copies và book.audit_logs luôn là mảng
        if (!book.copies) book.copies = [];
        if (!book.audit_logs) book.audit_logs = [];

        // Header info
        if (dom.copiesModalBookId) dom.copiesModalBookId.textContent = book.isbn;
        if (dom.copiesModalIsbn) dom.copiesModalIsbn.textContent = `ISBN: ${book.isbn}`;
        if (dom.copiesModalDdc) dom.copiesModalDdc.textContent = `DDC: ${book.ddc || "005.133 (FastAPI)"}`;
        if (dom.copiesModalTitle) dom.copiesModalTitle.textContent = "Quản lý Bản sao & Trạng thái";
        if (dom.copiesModalBookTitle) dom.copiesModalBookTitle.textContent = book.title;
        if (dom.copiesModalEdition) dom.copiesModalEdition.textContent = book.edition || "Ấn bản chuẩn KS25";
        if (dom.copiesModalShelf) dom.copiesModalShelf.textContent = book.shelf_location || "KHO-TRUNG-TAM-A";

        // Tab count
        if (dom.tab1Count) dom.tab1Count.textContent = book.copies.length;

        // Reset search input
        if (dom.copiesSearchInput) dom.copiesSearchInput.value = "";

        // Drawer states
        if (dom.addCopyDrawer) dom.addCopyDrawer.classList.add("hidden");
        if (dom.quickStatusDrawer) dom.quickStatusDrawer.classList.add("hidden");

        // Set default values for add copy drawer
        if (dom.newCopyShelf) dom.newCopyShelf.value = book.shelf_location || "Kệ A3-02-T1";
        if (dom.newCopyQty) dom.newCopyQty.value = 1;

        // Switch to Tab 1
        switchModalTab("tab1");

        // Render contents
        updateCopiesSummaryPills();
        renderCopiesTable();
        renderAuditTimeline();

        // Show modal
        if (dom.copiesModalBackdrop) dom.copiesModalBackdrop.classList.remove("hidden");
    }

    function closeCopiesModal() {
        if (dom.copiesModalBackdrop) dom.copiesModalBackdrop.classList.add("hidden");
        if (dom.addCopyDrawer) dom.addCopyDrawer.classList.add("hidden");
        if (dom.quickStatusDrawer) dom.quickStatusDrawer.classList.add("hidden");
        state.activeCopiesBook = null;
        state.activeCopyForStatus = null;
    }

    function switchModalTab(tabName) {
        state.currentModalTab = tabName;

        if (tabName === "tab1") {
            if (dom.btnTab1) {
                dom.btnTab1.classList.add("active");
            }
            if (dom.btnTab2) {
                dom.btnTab2.classList.remove("active");
            }
            if (dom.contentTab1) dom.contentTab1.classList.remove("hidden");
            if (dom.contentTab2) dom.contentTab2.classList.add("hidden");
        } else {
            if (dom.btnTab2) {
                dom.btnTab2.classList.add("active");
            }
            if (dom.btnTab1) {
                dom.btnTab1.classList.remove("active");
            }
            if (dom.contentTab2) dom.contentTab2.classList.remove("hidden");
            if (dom.contentTab1) dom.contentTab1.classList.add("hidden");
        }
    }

    function updateCopiesSummaryPills() {
        const book = state.activeCopiesBook;
        if (!book) return;

        const copies = book.copies || [];
        const total = copies.length;
        const avail = copies.filter((c) => c.status === "AVAILABLE").length;
        const borrowed = copies.filter((c) => c.status === "BORROWED" || c.status === "OVERDUE").length;
        const damaged = copies.filter((c) => c.status === "DAMAGED").length;
        const maint = copies.filter((c) => c.status === "MAINTENANCE").length;

        if (dom.copiesModalTotalSummary) dom.copiesModalTotalSummary.textContent = `${total} bản sao:`;
        if (dom.statCountAvailable) dom.statCountAvailable.textContent = avail;
        if (dom.statCountBorrowed) dom.statCountBorrowed.textContent = borrowed;
        if (dom.statCountDamaged) dom.statCountDamaged.textContent = damaged;
        if (dom.statCountMaintenance) dom.statCountMaintenance.textContent = maint;

        if (dom.tab1Count) dom.tab1Count.textContent = total;

        // Filter pills counts
        if (dom.filterCountAll) dom.filterCountAll.textContent = total;
        if (dom.filterCountAvailable) dom.filterCountAvailable.textContent = avail;
        if (dom.filterCountBorrowed) dom.filterCountBorrowed.textContent = borrowed;
        if (dom.filterCountIssues) dom.filterCountIssues.textContent = damaged + maint;
    }

    function setCopiesFilter(filterKey) {
        state.copiesFilter = filterKey;
        state.copiesPage = 1;

        // Update active class on filter buttons
        const btns = [
            { key: "ALL", el: dom.filterBtnAll },
            { key: "AVAILABLE", el: dom.filterBtnAvailable },
            { key: "BORROWED", el: dom.filterBtnBorrowed },
            { key: "ISSUES", el: dom.filterBtnIssues }
        ];

        btns.forEach((b) => {
            if (b.el) {
                if (b.key === filterKey) b.el.classList.add("active");
                else b.el.classList.remove("active");
            }
        });

        renderCopiesTable();
    }

    function renderCopiesTable() {
        const book = state.activeCopiesBook;
        if (!book || !dom.copiesTableBody) return;

        let list = book.copies || [];

        // Apply filter
        if (state.copiesFilter === "AVAILABLE") {
            list = list.filter((c) => c.status === "AVAILABLE");
        } else if (state.copiesFilter === "BORROWED") {
            list = list.filter((c) => c.status === "BORROWED" || c.status === "OVERDUE");
        } else if (state.copiesFilter === "ISSUES") {
            list = list.filter((c) => c.status === "DAMAGED" || c.status === "MAINTENANCE");
        }

        // Apply search
        const s = (state.copiesSearch || "").toLowerCase().trim();
        if (s) {
            list = list.filter((c) => {
                return (
                    (c.copy_code && c.copy_code.toLowerCase().includes(s)) ||
                    (c.barcode && c.barcode.toLowerCase().includes(s)) ||
                    (c.shelf_location && c.shelf_location.toLowerCase().includes(s)) ||
                    (c.condition && c.condition.toLowerCase().includes(s)) ||
                    (c.borrower && c.borrower.toLowerCase().includes(s))
                );
            });
        }

        const totalFiltered = list.length;
        const totalPages = Math.ceil(totalFiltered / state.copiesPageSize) || 1;
        if (state.copiesPage > totalPages) state.copiesPage = totalPages;

        const startIndex = (state.copiesPage - 1) * state.copiesPageSize;
        const endIndex = Math.min(startIndex + state.copiesPageSize, totalFiltered);
        const pageItems = list.slice(startIndex, endIndex);

        if (pageItems.length === 0) {
            dom.copiesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 32px; color: var(--color-text-secondary);">
                        Không tìm thấy bản sao nào theo tiêu chí lọc hiện tại.
                    </td>
                </tr>
            `;
            if (dom.copiesPaginationInfo) {
                dom.copiesPaginationInfo.textContent = `Hiển thị 0 - 0 trên ${totalFiltered} bản sao`;
            }
            if (dom.copiesPaginationControls) dom.copiesPaginationControls.innerHTML = "";
            return;
        }

        let html = "";
        pageItems.forEach((copy) => {
            const isDamaged = copy.status === "DAMAGED";
            const rowClass = isDamaged ? "row-damaged" : "";

            // Trạng thái badge
            let statusHtml = "";
            if (copy.status === "AVAILABLE") {
                statusHtml = `
                    <span class="status-pill pill-available">
                        <span class="dot dot-success"></span> Sẵn sàng
                    </span>
                `;
            } else if (copy.status === "BORROWED") {
                statusHtml = `
                    <span class="status-pill pill-borrowed">
                        <span class="dot dot-primary"></span> Đang mượn
                    </span>
                    <div class="borrower-note">${escapeHtml(copy.borrower || "#DG-LuuThong")} (Hạn: ${escapeHtml(copy.due_date || "14 ngày")})</div>
                `;
            } else if (copy.status === "OVERDUE") {
                statusHtml = `
                    <span class="status-pill pill-damaged">
                        <span class="dot dot-danger"></span> Quá hạn ${copy.overdue_days || 1} ngày
                    </span>
                    <div class="borrower-note">${escapeHtml(copy.borrower || "#DG-QuaHan")}</div>
                `;
            } else if (copy.status === "DAMAGED") {
                statusHtml = `
                    <span class="status-pill pill-damaged">
                        <span class="dot dot-danger"></span> Hư hỏng
                    </span>
                `;
            } else if (copy.status === "MAINTENANCE") {
                statusHtml = `
                    <span class="status-pill pill-maintenance">
                        <span class="dot dot-warning"></span> Bảo trì
                    </span>
                `;
            } else {
                statusHtml = `
                    <span class="status-pill pill-borrowed">
                        <span class="dot dot-primary"></span> ${escapeHtml(copy.status)}
                    </span>
                `;
            }

            // Chính sách badge
            let policyHtml = "";
            if (copy.policy === "Chỉ đọc tại chỗ") {
                policyHtml = `<span class="policy-badge archive">Chỉ đọc tại chỗ</span>`;
            } else if (copy.policy === "Tạm khóa") {
                policyHtml = `<span class="policy-badge locked">Tạm khóa</span>`;
            } else {
                policyHtml = `<span class="policy-badge">${escapeHtml(copy.policy || "Mượn 14 ngày")}</span>`;
            }

            // Thao tác button
            const actionBtn = isDamaged
                ? `<button type="button" class="btn-table-danger" onclick="window.booksApp.openQuickStatusDrawer(${copy.id})">Cập nhật</button>`
                : `<button type="button" class="btn-table-status" onclick="window.booksApp.openQuickStatusDrawer(${copy.id})">Đổi trạng thái</button>`;

            html += `
                <tr class="${rowClass}">
                    <td>
                        <div class="copy-code ${isDamaged ? "text-danger" : ""}">${escapeHtml(copy.copy_code)}</div>
                        <div class="copy-rfid">${escapeHtml(copy.barcode || "893524480000")}</div>
                    </td>
                    <td>
                        <div class="shelf-primary ${isDamaged ? "text-danger" : ""}">${escapeHtml(copy.shelf_location || "Kệ A3-02-T1")}</div>
                        <div class="shelf-sub">${escapeHtml(copy.shelf_sub || "Khu lưu trữ")}</div>
                    </td>
                    <td>
                        <span class="condition-text ${isDamaged ? "text-danger" : ""}">${escapeHtml(copy.condition || "Mới 100%")}</span>
                    </td>
                    <td>${statusHtml}</td>
                    <td style="text-align: center;">${policyHtml}</td>
                    <td style="text-align: right;">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end;">
                            ${actionBtn}
                            <button type="button" class="btn-table-delete" onclick="window.booksApp.deleteCopy(${copy.id})" title="Hủy bản sao này">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        dom.copiesTableBody.innerHTML = html;

        if (dom.copiesPaginationInfo) {
            dom.copiesPaginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trên ${totalFiltered} bản sao`;
        }
        renderCopiesPagination(totalPages);
    }

    function renderCopiesPagination(totalPages) {
        if (!dom.copiesPaginationControls) return;
        let html = "";

        html += `
            <button type="button" class="page-btn" ${state.copiesPage === 1 ? "disabled" : ""} onclick="window.booksApp.setCopiesPage(${state.copiesPage - 1})">
                <span class="material-symbols-outlined">chevron_left</span>
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
            <button type="button" class="page-btn" ${state.copiesPage === totalPages ? "disabled" : ""} onclick="window.booksApp.setCopiesPage(${state.copiesPage + 1})">
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        `;

        dom.copiesPaginationControls.innerHTML = html;
    }

    function setCopiesPage(p) {
        state.copiesPage = p;
        renderCopiesTable();
    }

    // ============================================================================
    // QUICK STATUS ADJUSTMENT DRAWER
    // ============================================================================
    function openQuickStatusDrawer(copyId) {
        const book = state.activeCopiesBook;
        if (!book || !book.copies) return;

        const copy = book.copies.find((c) => c.id === copyId);
        if (!copy) return;

        state.activeCopyForStatus = copy;

        if (dom.quickStatusCopyCode) dom.quickStatusCopyCode.textContent = copy.copy_code;
        if (dom.quickStatusTicket) dom.quickStatusTicket.textContent = `Phiếu: #TRX-MOD-${copy.id}`;

        if (dom.quickStatusSelect) {
            dom.quickStatusSelect.value = copy.status === "OVERDUE" ? "DAMAGED" : copy.status;
        }

        if (dom.quickStatusReason) {
            dom.quickStatusReason.value = copy.condition || "";
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

    function saveQuickStatus() {
        const book = state.activeCopiesBook;
        const copy = state.activeCopyForStatus;
        if (!book || !copy) return;

        const newStatus = dom.quickStatusSelect ? dom.quickStatusSelect.value : "AVAILABLE";
        const reason = (dom.quickStatusReason ? dom.quickStatusReason.value.trim() : "") || "Cập nhật nghiệp vụ định kỳ.";

        const oldStatus = copy.status;
        copy.status = newStatus;
        copy.condition = reason;

        // Cập nhật policy tương ứng
        if (newStatus === "DAMAGED" || newStatus === "MAINTENANCE" || newStatus === "LOST") {
            copy.policy = "Tạm khóa";
        } else if (newStatus === "AVAILABLE" && copy.policy === "Tạm khóa") {
            copy.policy = book.allow_home ? "Mượn 14 ngày" : "Chỉ đọc tại chỗ";
        }

        // Tạo audit log ghi vết
        const newLog = {
            id: Date.now(),
            copy_code: copy.copy_code,
            event_type: newStatus === "DAMAGED" ? "INCIDENT" : "STATUS_CHANGE",
            title: `Cập nhật trạng thái sang ${newStatus}`,
            time: new Date().toLocaleString("vi-VN"),
            from_status: oldStatus,
            to_status: newStatus,
            desc: reason,
            staff: "Thủ thư trưởng (TT-04)",
            has_pdf: newStatus === "DAMAGED"
        };

        if (!book.audit_logs) book.audit_logs = [];
        book.audit_logs.unshift(newLog);

        // Cập nhật số liệu đầu sách
        book.total_copies = book.copies.length;
        book.available_copies = book.copies.filter((c) => c.status === "AVAILABLE").length;

        // Render lại giao diện
        closeQuickStatusDrawer();
        updateCopiesSummaryPills();
        renderCopiesTable();
        renderAuditTimeline();
        updateKPIs();
        renderTable();

        showNotification(`Đã cập nhật trạng thái bản sao ${copy.copy_code} thành ${newStatus}!`, "success");
    }

    // ============================================================================
    // COLLAPSIBLE ADD COPY DRAWER
    // ============================================================================
    function toggleAddCopyDrawer() {
        if (!dom.addCopyDrawer) return;
        const isHidden = dom.addCopyDrawer.classList.contains("hidden");
        if (isHidden) {
            dom.addCopyDrawer.classList.remove("hidden");
            if (dom.newCopyQty) dom.newCopyQty.focus();
        } else {
            dom.addCopyDrawer.classList.add("hidden");
        }
    }

    function submitAddCopy() {
        const book = state.activeCopiesBook;
        if (!book) return;

        const qty = parseInt(dom.newCopyQty ? dom.newCopyQty.value : 1, 10) || 1;
        const shelf = (dom.newCopyShelf ? dom.newCopyShelf.value.trim() : "") || book.shelf_location || "Kệ A3-02-T1";
        const condition = dom.newCopyCondition ? dom.newCopyCondition.value.trim() : "Mới 100% • Đã dán bọc";
        const policy = dom.newCopyPolicy ? dom.newCopyPolicy.value : "Mượn 14 ngày";

        if (qty < 1 || qty > 50) {
            showNotification("Số lượng bản sao bổ sung phải từ 1 đến 50!", "warning");
            return;
        }

        if (!book.copies) book.copies = [];
        const baseIndex = book.copies.length;
        const createdCodes = [];

        for (let i = 1; i <= qty; i++) {
            const num = baseIndex + i;
            const pad = String(num).padStart(2, "0");
            const code = `BS-${book.isbn.replace(/[^A-Za-z0-9]/g, "").slice(-6)}-${pad}`;
            const barcode = `893524${String(Date.now()).slice(-4)}${pad}`;

            book.copies.push({
                id: Date.now() + i,
                copy_code: code,
                barcode: barcode,
                shelf_location: shelf,
                shelf_sub: "Khu vực lưu trữ",
                condition: condition,
                status: "AVAILABLE",
                policy: policy
            });
            createdCodes.push(code);
        }

        // Audit log
        if (!book.audit_logs) book.audit_logs = [];
        book.audit_logs.unshift({
            id: Date.now(),
            copy_code: `Bổ sung ${qty} bản sao (${createdCodes[0]}${qty > 1 ? ` -> ${createdCodes[createdCodes.length - 1]}` : ""})`,
            event_type: "BATCH_ADD",
            title: `Bổ sung ${qty} bản sao vật lý vào kho`,
            time: new Date().toLocaleString("vi-VN"),
            from_status: "Khởi tạo mới",
            to_status: "AVAILABLE",
            desc: `Nhập kho đợt bổ sung: Vị trí ${shelf}. Tình trạng: ${condition}.`,
            staff: "Thủ thư trưởng (TT-04)",
            auto: false
        });

        book.total_copies = book.copies.length;
        book.available_copies = book.copies.filter((c) => c.status === "AVAILABLE").length;

        if (dom.addCopyDrawer) dom.addCopyDrawer.classList.add("hidden");
        updateCopiesSummaryPills();
        renderCopiesTable();
        renderAuditTimeline();
        updateKPIs();
        renderTable();

        showNotification(`Đã thêm thành công ${qty} bản sao vào kho cho đầu sách "${book.title}"!`, "success");
    }

    function deleteCopy(copyId) {
        const book = state.activeCopiesBook;
        if (!book || !book.copies) return;

        const copy = book.copies.find((c) => c.id === copyId);
        if (!copy) return;

        const confirmed = window.confirm(`Bạn có chắc chắn muốn hủy bản sao "${copy.copy_code}"?`);
        if (!confirmed) return;

        book.copies = book.copies.filter((c) => c.id !== copyId);
        book.total_copies = book.copies.length;
        book.available_copies = book.copies.filter((c) => c.status === "AVAILABLE").length;

        if (!book.audit_logs) book.audit_logs = [];
        book.audit_logs.unshift({
            id: Date.now(),
            copy_code: copy.copy_code,
            event_type: "DISPOSE",
            title: "Hủy bản sao khỏi kho",
            time: new Date().toLocaleString("vi-VN"),
            from_status: copy.status,
            to_status: "DISPOSED",
            desc: `Hủy bản sao theo quyết định của thủ thư.`,
            staff: "Thủ thư trưởng (TT-04)",
            auto: false
        });

        updateCopiesSummaryPills();
        renderCopiesTable();
        renderAuditTimeline();
        updateKPIs();
        renderTable();

        showNotification(`Đã xóa bản sao ${copy.copy_code}.`, "info");
    }

    // ============================================================================
    // TAB 2: AUDIT LOG TIMELINE RENDERING
    // ============================================================================
    function renderAuditTimeline() {
        const book = state.activeCopiesBook;
        if (!book || !dom.auditTimelineContainer) return;

        const logs = book.audit_logs || [];
        if (logs.length === 0) {
            dom.auditTimelineContainer.innerHTML = `
                <div style="background: #ffffff; border: 1px solid var(--color-border); border-radius: 8px; padding: 24px; text-align: center; color: var(--color-text-secondary); font-size: 13px;">
                    Chưa có ghi chép nhật ký biến động (Audit Log) nào cho đầu sách này.
                </div>
            `;
            return;
        }

        let html = "";
        logs.forEach((log) => {
            let iconClass = "node-primary";
            let iconName = "inventory_2";
            let isIncident = log.event_type === "INCIDENT" || log.to_status === "DAMAGED";

            if (isIncident) {
                iconClass = "node-danger";
                iconName = "priority_high";
            } else if (log.event_type === "MAINTENANCE_DONE" || log.to_status === "AVAILABLE") {
                iconClass = "node-success";
                iconName = "check";
            }

            const pdfLink = log.has_pdf
                ? `<button type="button" class="audit-pdf-link" onclick="window.booksApp.viewPdfDoc(${log.id})"><span class="material-symbols-outlined">attach_file</span> Xem biên bản PDF</button>`
                : log.standard_met
                    ? `<span style="color: var(--color-success); font-weight: 600;">ĐẠT TIÊU CHUẨN KHO</span>`
                    : log.auto
                        ? `<span style="color: var(--color-text-muted);">Tự động nhập kho</span>`
                        : "";

            html += `
                <div class="audit-event-card">
                    <div class="audit-node-icon ${iconClass}">
                        <span class="material-symbols-outlined">${iconName}</span>
                    </div>
                    <div class="audit-event-header">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="audit-copy-tag ${isIncident ? "tag-danger" : ""}">${escapeHtml(log.copy_code)}</span>
                            <span style="color: var(--color-text-muted); font-size: 11px;">•</span>
                            <span style="font-size: 12px; font-weight: 500; color: var(--color-text-secondary);">${escapeHtml(log.title)}</span>
                        </div>
                        <span class="audit-time">${escapeHtml(log.time)}</span>
                    </div>

                    <div class="audit-transition">
                        <span style="font-size: 11px; font-weight: 500; color: var(--color-text-secondary);">${escapeHtml(log.from_status)}</span>
                        <span class="material-symbols-outlined">arrow_forward</span>
                        <span class="status-pill ${isIncident ? "pill-damaged" : "pill-available"}" style="padding: 1px 8px; font-size: 11px;">
                            ${escapeHtml(log.to_status)}
                        </span>
                    </div>

                    <p class="audit-desc">${escapeHtml(log.desc)}</p>

                    <div class="audit-meta-row">
                        <span>Cán bộ: <strong style="color: var(--color-text-primary); font-weight: 500;">${escapeHtml(log.staff || "Thủ thư trưởng")}</strong></span>
                        <div>${pdfLink}</div>
                    </div>
                </div>
            `;
        });

        dom.auditTimelineContainer.innerHTML = html;
    }

    function viewPdfDoc(logId) {
        showNotification(`Đang mở biên bản kiểm định sự cố #BL-2025-0429...`, "info");
    }

    // ============================================================================
    // BATCH BARCODE PRINTING & CSV EXPORT
    // ============================================================================
    function printBatchBarcodes() {
        const book = state.activeCopiesBook;
        if (!book || !book.copies || book.copies.length === 0) {
            showNotification("Không có bản sao nào để in tem!", "warning");
            return;
        }

        const printWin = window.open("", "_blank", "width=800,height=600");
        if (!printWin) {
            showNotification("Trình duyệt đã chặn popup, vui lòng cho phép để in tem!", "error");
            return;
        }

        let labelsHtml = "";
        book.copies.forEach((copy) => {
            labelsHtml += `
                <div style="border: 1px dashed #333; padding: 12px; margin: 8px; width: 220px; font-family: monospace; display: inline-block; vertical-align: top; text-align: center; border-radius: 6px;">
                    <div style="font-weight: bold; font-size: 13px; color: #1B4332;">THƯ VIỆN KS25</div>
                    <div style="font-size: 11px; margin: 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(book.title)}</div>
                    <div style="font-size: 20px; letter-spacing: 2px; margin: 6px 0; font-weight: bold;">|||| | || |||||</div>
                    <div style="font-size: 12px; font-weight: bold;">${escapeHtml(copy.copy_code)}</div>
                    <div style="font-size: 10px; color: #555;">${escapeHtml(copy.barcode || "")} • ${escapeHtml(copy.shelf_location || "")}</div>
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
        if (!book || !book.copies || book.copies.length === 0) {
            showNotification("Không có dữ liệu bản sao để xuất CSV!", "warning");
            return;
        }

        const headers = ["Mã bản sao", "Mã vạch / RFID", "Vị trí kệ", "Khu vực", "Tình trạng", "Trạng thái", "Chính sách"];
        const rows = book.copies.map((c) => [
            `"${c.copy_code}"`,
            `"${c.barcode || ""}"`,
            `"${c.shelf_location || ""}"`,
            `"${c.shelf_sub || ""}"`,
            `"${c.condition || ""}"`,
            `"${c.status || ""}"`,
            `"${c.policy || ""}"`
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
        const rows = state.books.map((b) => [
            `"${b.isbn}"`,
            `"${(b.title || "").replace(/"/g, '""')}"`,
            `"${b.category_name || ""}"`,
            `"${(b.authors || []).join("; ").replace(/"/g, '""')}"`,
            `"${b.publisher || ""}"`,
            b.publish_year || "",
            b.total_copies || 0,
            b.available_copies || 0,
            `"${b.shelf_location || ""}"`
        ]);

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

        showNotification("Đã xuất toàn bộ danh mục đầu sách ra tệp CSV (Excel) thành công!", "success");
    }

    // ============================================================================
    // EVENT LISTENERS
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

        if (dom.btnApplyFilter) dom.btnApplyFilter.addEventListener("click", applyFilter);

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

        // 2. Add / Edit Book Modal
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

        // Barcode preview
        if (dom.bookIsbn) dom.bookIsbn.addEventListener("input", updateBarcodeRange);
        if (dom.copiesCount) dom.copiesCount.addEventListener("input", updateBarcodeRange);

        // Author tags input
        if (dom.tagAuthorInput) {
            dom.tagAuthorInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addAuthorTag(dom.tagAuthorInput.value);
                }
            });
        }

        // Image Dropzone
        if (dom.coverFileInput) {
            dom.coverFileInput.addEventListener("change", (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleCoverFileSelect(e.target.files[0]);
                }
            });
        }

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

        // 3. Modal 2: Stitch High-Fidelity Tabs
        if (dom.btnTab1) {
            dom.btnTab1.addEventListener("click", () => switchModalTab("tab1"));
        }
        if (dom.btnTab2) {
            dom.btnTab2.addEventListener("click", () => switchModalTab("tab2"));
        }

        // Filter Pills in Copies Modal
        if (dom.filterBtnAll) dom.filterBtnAll.addEventListener("click", () => setCopiesFilter("ALL"));
        if (dom.filterBtnAvailable) dom.filterBtnAvailable.addEventListener("click", () => setCopiesFilter("AVAILABLE"));
        if (dom.filterBtnBorrowed) dom.filterBtnBorrowed.addEventListener("click", () => setCopiesFilter("BORROWED"));
        if (dom.filterBtnIssues) dom.filterBtnIssues.addEventListener("click", () => setCopiesFilter("ISSUES"));

        // Live Search Copies
        if (dom.copiesSearchInput) {
            dom.copiesSearchInput.addEventListener("input", (e) => {
                state.copiesSearch = e.target.value;
                state.copiesPage = 1;
                renderCopiesTable();
            });
        }

        // Print Barcodes
        if (dom.printBatchBarcodesBtn) dom.printBatchBarcodesBtn.addEventListener("click", printBatchBarcodes);

        // Add Copy Drawer
        if (dom.toggleAddCopyBtn) dom.toggleAddCopyBtn.addEventListener("click", toggleAddCopyDrawer);
        if (dom.closeAddCopyDrawerBtn) dom.closeAddCopyDrawerBtn.addEventListener("click", toggleAddCopyDrawer);
        if (dom.cancelAddCopyBtn) dom.cancelAddCopyBtn.addEventListener("click", toggleAddCopyDrawer);
        if (dom.submitAddCopyBtn) dom.submitAddCopyBtn.addEventListener("click", submitAddCopy);

        // Quick Status Drawer
        if (dom.cancelQuickStatusBtn) dom.cancelQuickStatusBtn.addEventListener("click", closeQuickStatusDrawer);
        if (dom.saveQuickStatusBtn) dom.saveQuickStatusBtn.addEventListener("click", saveQuickStatus);

        // Modal 2 Footer Actions
        if (dom.closeCopiesModalBtn) dom.closeCopiesModalBtn.addEventListener("click", closeCopiesModal);
        if (dom.closeCopiesModalFooterBtn) dom.closeCopiesModalFooterBtn.addEventListener("click", closeCopiesModal);
        if (dom.exportCopiesCsvBtn) dom.exportCopiesCsvBtn.addEventListener("click", exportCopiesCsv);
        if (dom.doneCopiesModalBtn) dom.doneCopiesModalBtn.addEventListener("click", closeCopiesModal);

        // 4. Export Excel
        if (dom.btnExportExcel) dom.btnExportExcel.addEventListener("click", exportToExcel);

        // Modal backdrops click to close
        window.addEventListener("click", (e) => {
            if (e.target === dom.bookModalBackdrop) closeBookModal();
            if (e.target === dom.copiesModalBackdrop) closeCopiesModal();
        });

        // Close on Escape
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                closeBookModal();
                closeCopiesModal();
            }
        });
    }

    // ============================================================================
    // GLOBAL EXPORTS & INITIALIZATION
    // ============================================================================
    window.booksApp = {
        openCreateModal,
        openEditModal,
        closeBookModal,
        saveBook,
        deleteBook,
        removeAuthorTag,
        setPage,
        openCopiesModal,
        closeCopiesModal,
        switchModalTab,
        setCopiesFilter,
        setCopiesPage,
        openQuickStatusDrawer,
        closeQuickStatusDrawer,
        saveQuickStatus,
        toggleAddCopyDrawer,
        submitAddCopy,
        deleteCopy,
        printBatchBarcodes,
        exportCopiesCsv,
        viewPdfDoc,
        exportToExcel
    };

    document.addEventListener("DOMContentLoaded", () => {
        updateKPIs();
        applyFilter();
        initEventListeners();
    });
})();
