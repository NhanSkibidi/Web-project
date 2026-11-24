// ==========================================================
// KS25 Library - Logic Trang Chủ Thư Viện
// Thiết kế chuẩn xác 100% theo giao diện người dùng yêu cầu
// ==========================================================

// Kho sách chuẩn hóa - Bìa phủ toàn ô (Full-cover), màu sắc gradient sang trọng
const ALL_BOOKS = [
  // --- TRANG 1: 4 cuốn mẫu y hệt thiết kế chuẩn ---
  {
    id: 1,
    title: "Kiến Trúc Mã Sạch (Clean Code)",
    author: "Robert C. Martin",
    category: "CNTT",
    categoryKey: "Công nghệ thông tin",
    shelf: "Kệ: A1-12",
    isbn: "9786040000325",
    copies: "Còn 4 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #1e3a8a, #0f172a)",
    coverTag: "CLEAN CODE",
    coverTitle: "Kiến Trúc Mã Sạch"
  },
  {
    id: 2,
    title: "Trí Tuệ Nhân Tạo Hiện Đại",
    author: "Stuart Russell & Peter Norvig",
    category: "Trí tuệ nhân tạo",
    categoryKey: "Công nghệ thông tin",
    shelf: "Kệ: B1-06",
    isbn: "9786040000451",
    copies: "Còn 7 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #0284c7, #0369a1)",
    coverTag: "ARTIFICIAL INTELLIGENCE",
    coverTitle: "Trí Tuệ Nhân Tạo Hiện Đại"
  },
  {
    id: 3,
    title: "Nguyên Lý Hệ Cơ Sở Dữ Liệu",
    author: "Abraham Silberschatz",
    category: "Cơ sở dữ liệu",
    categoryKey: "Công nghệ thông tin",
    shelf: "Kệ: A2-09",
    isbn: "9786040000888",
    copies: "Đang hết",
    available: false,
    coverBg: "linear-gradient(135deg, #334155, #1e293b)",
    coverTag: "DATABASE SYSTEMS",
    coverTitle: "Nguyên Lý Hệ CSDL"
  },
  {
    id: 4,
    title: "Kinh Tế Vi Mô Ứng Dụng",
    author: "N. Gregory Mankiw",
    category: "Kinh tế học",
    categoryKey: "Kinh tế",
    shelf: "Kệ: C2-01",
    isbn: "9786040000122",
    copies: "Còn 12 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #b45309, #78350f)",
    coverTag: "MICROECONOMICS",
    coverTitle: "Kinh Tế Vi Mô Ứng Dụng"
  },

  // --- TRANG 2 ---
  {
    id: 5,
    title: "Python Crash Course",
    author: "Eric Matthes",
    category: "CNTT",
    categoryKey: "Công nghệ thông tin",
    shelf: "Kệ: A1-15",
    isbn: "9786040000349",
    copies: "Còn 4 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #0f766e, #115e59)",
    coverTag: "PYTHON",
    coverTitle: "Python Crash Course"
  },
  {
    id: 6,
    title: "Giải thuật & Cấu trúc Dữ liệu",
    author: "Robert Sedgewick",
    category: "CNTT",
    categoryKey: "Công nghệ thông tin",
    shelf: "Kệ: A1-18",
    isbn: "9786040000172",
    copies: "Còn 5 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #1b4332, #2d6a4f)",
    coverTag: "ALGORITHMS",
    coverTitle: "Giải Thuật & Cấu Trúc Dữ Liệu"
  },
  {
    id: 7,
    title: "Quản trị Tài chính Doanh nghiệp",
    author: "Stephen Ross",
    category: "Kinh tế học",
    categoryKey: "Kinh tế",
    shelf: "Kệ: B2-04",
    isbn: "9786040000417",
    copies: "Còn 3 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #854d0e, #533107)",
    coverTag: "FINANCE",
    coverTitle: "Quản Trị Tài Chính"
  },
  {
    id: 8,
    title: "Hệ Điều Hành Hiện Đại",
    author: "Andrew S. Tanenbaum",
    category: "CNTT",
    categoryKey: "Công nghệ thông tin",
    shelf: "Kệ: A3-02",
    isbn: "9786040000431",
    copies: "Đang hết",
    available: false,
    coverBg: "linear-gradient(135deg, #4338ca, #312e81)",
    coverTag: "OPERATING SYSTEMS",
    coverTitle: "Hệ Điều Hành Hiện Đại"
  },

  // --- TRANG 3 ---
  {
    id: 9,
    title: "Đắc Nhân Tâm",
    author: "Dale Carnegie",
    category: "Kỹ năng sống",
    categoryKey: "Kỹ năng sống",
    shelf: "Kệ: KN-01",
    isbn: "9786040000099",
    copies: "Còn 10 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #c2410c, #9a3412)",
    coverTag: "SELF-HELP",
    coverTitle: "Đắc Nhân Tâm"
  },
  {
    id: 10,
    title: "Tôi Tài Giỏi Bạn Cũng Thế",
    author: "Adam Khoo",
    category: "Giáo dục",
    categoryKey: "Giáo dục",
    shelf: "Kệ: GD-02",
    isbn: "9786040000523",
    copies: "Còn 5 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #0d9488, #115e59)",
    coverTag: "EDUCATION",
    coverTitle: "Tôi Tài Giỏi Bạn Cũng Thế"
  },
  {
    id: 11,
    title: "Dế Mèn Phiêu Lưu Ký",
    author: "Tô Hoài",
    category: "Thiếu nhi",
    categoryKey: "Thiếu nhi",
    shelf: "Kệ: TN-01",
    isbn: "9786040000011",
    copies: "Còn 12 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #15803d, #14532d)",
    coverTag: "LITERATURE",
    coverTitle: "Dế Mèn Phiêu Lưu Ký"
  },
  {
    id: 12,
    title: "English Grammar In Use",
    author: "Raymond Murphy",
    category: "Ngoại ngữ",
    categoryKey: "Ngoại ngữ",
    shelf: "Kệ: NN-01",
    isbn: "9786040000547",
    copies: "Còn 9 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #be123c, #881337)",
    coverTag: "LANGUAGES",
    coverTitle: "English Grammar In Use"
  },

  // --- TRANG 4 ---
  {
    id: 13,
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt & David Thomas",
    category: "CNTT",
    categoryKey: "Công nghệ thông tin",
    shelf: "Kệ: CNTT-02",
    isbn: "9786040000332",
    copies: "Còn 3 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #1e293b, #0f172a)",
    coverTag: "PROGRAMMING",
    coverTitle: "The Pragmatic Programmer"
  },
  {
    id: 14,
    title: "Atomic Habits (Thói Quen Nguyên Tử)",
    author: "James Clear",
    category: "Kỹ năng sống",
    categoryKey: "Kỹ năng sống",
    shelf: "Kệ: KN-03",
    isbn: "9786040000318",
    copies: "Còn 6 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #ea580c, #9a3412)",
    coverTag: "HABITS",
    coverTitle: "Atomic Habits"
  },
  {
    id: 15,
    title: "Nhà Đầu Tư Thông Minh",
    author: "Benjamin Graham",
    category: "Kinh tế",
    categoryKey: "Kinh tế",
    shelf: "Kệ: KT-04",
    isbn: "9786040000141",
    copies: "Đang hết",
    available: false,
    coverBg: "linear-gradient(135deg, #854d0e, #533107)",
    coverTag: "INVESTING",
    coverTitle: "Nhà Đầu Tư Thông Minh"
  },
  {
    id: 16,
    title: "Đại Việt Sử Ký Toàn Thư",
    author: "Ngô Sĩ Liên",
    category: "Lịch sử",
    categoryKey: "Lịch sử",
    shelf: "Kệ: LS-01",
    isbn: "9786040000400",
    copies: "Còn 4 cuốn",
    available: true,
    coverBg: "linear-gradient(135deg, #4338ca, #312e81)",
    coverTag: "VIET HISTORY",
    coverTitle: "Đại Việt Sử Ký"
  }
];

const PAGE_SIZE = 4; // Chia đúng thành 4 trang (mỗi trang 4 cuốn sách = 16 cuốn tất cả)
let currentCarouselPage = 1;
let currentFilteredList = null; // null = xem tất cả (carousel), array = kết quả lọc
let isAllBooksView = false; // Chế độ xem toàn bộ sách không qua phân trang

document.addEventListener("DOMContentLoaded", () => {
  renderCurrentView();
});

function renderCurrentView() {
  const booksToDisplay = currentFilteredList || ALL_BOOKS;
  const totalBooks = booksToDisplay.length;
  const totalPages = Math.ceil(totalBooks / PAGE_SIZE) || 1;

  if (currentCarouselPage > totalPages) currentCarouselPage = totalPages;
  if (currentCarouselPage < 1) currentCarouselPage = 1;

  // Cập nhật nhãn phân trang trên header section (Hiển thị dạng 1 / 4 chuẩn Figma)
  const indicator = document.getElementById("carousel-page-indicator");
  if (indicator) {
    if (isAllBooksView) {
      indicator.textContent = `Tất cả (${totalBooks} cuốn)`;
    } else {
      indicator.textContent = `${currentCarouselPage} / ${totalPages}`;
    }
  }

  // Cập nhật 4 nút số trang bên dưới: [1] [2] [3] [4]
  const pageNumbersContainer = document.getElementById("page-numbers-container");
  if (pageNumbersContainer) {
    if (isAllBooksView || totalPages <= 1) {
      pageNumbersContainer.innerHTML = `<button class="page-number-btn active">1</button>`;
    } else {
      let html = "";
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-number-btn ${i === currentCarouselPage ? 'active' : ''}" onclick="goToCarouselPage(${i})">${i}</button>`;
      }
      pageNumbersContainer.innerHTML = html;
    }
  }

  // Cập nhật trạng thái nút Trang trước / Trang tiếp
  const prevBtn = document.getElementById("btn-prev-page");
  const nextBtn = document.getElementById("btn-next-page");
  if (prevBtn) prevBtn.disabled = (!isAllBooksView && currentCarouselPage <= 1);
  if (nextBtn) nextBtn.disabled = (!isAllBooksView && currentCarouselPage >= totalPages);

  // Xác định danh sách sách hiển thị
  let pageBooks;
  if (isAllBooksView) {
    pageBooks = booksToDisplay;
  } else {
    const startIndex = (currentCarouselPage - 1) * PAGE_SIZE;
    pageBooks = booksToDisplay.slice(startIndex, startIndex + PAGE_SIZE);
  }

  const grid = document.getElementById("new-books-grid");
  if (!grid) return;

  if (pageBooks.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #fff; border: 1px dashed var(--color-border); border-radius: var(--radius-lg);">
        <div style="font-size: 36px; margin-bottom: 12px;">📚</div>
        <h3 style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 6px;">Không tìm thấy tài liệu phù hợp</h3>
        <p style="font-size: 13.5px; color: var(--color-muted); max-width: 480px; margin: 0 auto 16px;">
          Không có sách nào khớp với từ khóa hoặc chuyên ngành bạn chọn. Vui lòng bấm nút bên dưới để xem lại tất cả sách.
        </p>
        <button onclick="clearSearchFilter()" class="btn-borrow" style="padding: 8px 18px; font-size: 13px;">
          Xem lại tất cả tài liệu
        </button>
      </div>
    `;
    return;
  }

  grid.style.opacity = "0.6";
  grid.innerHTML = pageBooks.map((book) => `
    <div class="book-card">
      <a href="book_detail.html?book=${getBookDetailKey(book.title)}" style="display:block;text-decoration:none;">
        <div class="book-cover" style="background: ${book.coverBg}; cursor: pointer;">
          <span class="shelf-badge">${book.shelf}</span>
          <div class="book-cover-content">
            <div class="book-cover-tag">${book.coverTag}</div>
            <div class="book-cover-title">${book.coverTitle}</div>
            <div class="book-cover-author">${book.author}</div>
          </div>
        </div>
      </a>
      <div class="book-meta">
        <span class="badge-cat">${book.category}</span>
        <span class="badge-status ${book.available ? 'status-available' : 'status-out'}">
          ● ${book.copies}
        </span>
      </div>
      <h3 class="book-title" title="${book.title}">
        <a href="book_detail.html?book=${getBookDetailKey(book.title)}" style="color:inherit;text-decoration:none;">${book.title}</a>
      </h3>
      <div class="book-author">${book.author}</div>
      <div class="book-actions">
        <a href="book_detail.html?book=${getBookDetailKey(book.title)}" class="btn-detail">Chi tiết</a>
        ${book.available
      ? `<button class="btn-borrow" onclick="borrowBook('${escapeQuotes(book.title)}')">🛒 Mượn</button>`
      : `<button class="btn-borrow" disabled>Hết sách</button>`
    }
      </div>
    </div>
  `).join("");

  setTimeout(() => {
    grid.style.opacity = "1";
  }, 100);
}

// Bấm nút chuyển trang lùi (<)
function prevCarousel() {
  const booksToDisplay = currentFilteredList || ALL_BOOKS;
  const totalPages = Math.ceil(booksToDisplay.length / PAGE_SIZE) || 1;
  isAllBooksView = false;
  currentCarouselPage = (currentCarouselPage > 1) ? currentCarouselPage - 1 : totalPages;
  renderCurrentView();
  scrollToBooks();
}

// Bấm nút chuyển trang tiếp (>)
function nextCarousel() {
  const booksToDisplay = currentFilteredList || ALL_BOOKS;
  const totalPages = Math.ceil(booksToDisplay.length / PAGE_SIZE) || 1;
  isAllBooksView = false;
  currentCarouselPage = (currentCarouselPage < totalPages) ? currentCarouselPage + 1 : 1;
  renderCurrentView();
  scrollToBooks();
}

// Chuyển trang trực tiếp theo số trang (1, 2,...)
function goToCarouselPage(pageNum) {
  isAllBooksView = false;
  currentCarouselPage = pageNum;
  renderCurrentView();
  scrollToBooks();
}

// Bật / tắt chế độ xem toàn bộ sách (16 cuốn cùng lúc)
function toggleAllBooksView() {
  isAllBooksView = !isAllBooksView;
  const topBtn = document.getElementById("btn-view-all-books");

  if (isAllBooksView) {
    if (topBtn) topBtn.textContent = "Thu gọn (4 cuốn/trang)";
  } else {
    if (topBtn) topBtn.textContent = "Xem tất cả (16 cuốn)";
  }

  renderCurrentView();
}

function scrollToBooks() {
  const section = document.getElementById("books-section");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// Bật / tắt mở rộng 5 danh mục chuyên ngành còn lại
let isCategoriesExpanded = false;

function toggleCategories() {
  isCategoriesExpanded = !isCategoriesExpanded;
  const grid = document.getElementById("category-grid");
  const headerText = document.getElementById("header-cat-text");
  const headerArrow = document.getElementById("header-cat-arrow");
  const bottomText = document.getElementById("toggle-cat-text");
  const bottomArrow = document.getElementById("toggle-cat-arrow");
  const extras = document.querySelectorAll(".category-card-extra");

  if (grid) {
    if (isCategoriesExpanded) {
      grid.classList.add("expanded");
    } else {
      grid.classList.remove("expanded");
    }
  }

  extras.forEach((el) => {
    el.style.display = isCategoriesExpanded ? "flex" : "none";
  });

  if (headerText) {
    headerText.textContent = isCategoriesExpanded ? "Thu gọn danh mục" : "Xem tất cả danh mục (10 ngành)";
  }
  if (headerArrow) {
    headerArrow.innerHTML = isCategoriesExpanded ? "&lt;" : "&gt;";
  }
  if (bottomText) {
    bottomText.textContent = isCategoriesExpanded ? "Thu gọn danh mục" : "Xem thêm 5 ngành học khác";
  }
  if (bottomArrow) {
    bottomArrow.textContent = isCategoriesExpanded ? "▲" : "▼";
  }
}
window.toggleAllCategories = toggleCategories; // Tương thích ngược

// Tìm kiếm động
function handleSearch(event) {
  event.preventDefault();
  const input = document.getElementById("search-input");
  const categorySelect = document.getElementById("search-category");

  const keyword = input.value.trim().toLowerCase();
  const selectedCat = categorySelect.value;

  if (!keyword && !selectedCat) {
    clearSearchFilter();
    return;
  }

  currentFilteredList = ALL_BOOKS.filter((book) => {
    const matchKeyword = !keyword ||
      book.title.toLowerCase().includes(keyword) ||
      book.author.toLowerCase().includes(keyword) ||
      book.isbn.toLowerCase().includes(keyword) ||
      book.shelf.toLowerCase().includes(keyword) ||
      book.category.toLowerCase().includes(keyword);

    const matchCategory = !selectedCat || book.category.toLowerCase() === selectedCat.toLowerCase();

    return matchKeyword && matchCategory;
  });

  currentCarouselPage = 1;

  const banner = document.getElementById("search-status-banner");
  const bannerText = document.getElementById("search-status-text");
  const title = document.getElementById("books-section-title");

  if (banner && bannerText) {
    banner.style.display = "flex";
    let queryDesc = [];
    if (keyword) queryDesc.push(`từ khóa "<strong>${input.value.trim()}</strong>"`);
    if (selectedCat) queryDesc.push(`ngành "<strong>${selectedCat}</strong>"`);

    bannerText.innerHTML = `Kết quả tìm kiếm cho ${queryDesc.join(" & ")}: Tìm thấy <strong>${currentFilteredList.length}</strong> tài liệu phù hợp.`;
  }

  if (title) {
    title.textContent = `Kết quả tra cứu (${currentFilteredList.length})`;
  }

  renderCurrentView();

  const section = document.getElementById("books-section");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Lọc theo 10 ngành trong seed.py
function handleCategoryFilter(catName) {
  if (catName === "all" || !catName) {
    clearSearchFilter();
    return;
  }

  const categorySelect = document.getElementById("search-category");
  if (categorySelect) categorySelect.value = catName;

  currentFilteredList = ALL_BOOKS.filter((book) => book.category.toLowerCase() === catName.toLowerCase());
  currentCarouselPage = 1;

  const banner = document.getElementById("search-status-banner");
  const bannerText = document.getElementById("search-status-text");
  const title = document.getElementById("books-section-title");

  if (banner && bannerText) {
    banner.style.display = "flex";
    bannerText.innerHTML = `Đang lọc theo ngành: <strong>${catName}</strong> (Tìm thấy <strong>${currentFilteredList.length}</strong> tài liệu).`;
  }

  if (title) {
    title.textContent = `Sách chuyên ngành: ${catName}`;
  }

  renderCurrentView();

  const section = document.getElementById("books-section");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function clearSearchFilter() {
  currentFilteredList = null;
  currentCarouselPage = 1;

  const input = document.getElementById("search-input");
  const categorySelect = document.getElementById("search-category");
  if (input) input.value = "";
  if (categorySelect) categorySelect.value = "";

  const banner = document.getElementById("search-status-banner");
  if (banner) banner.style.display = "none";

  const title = document.getElementById("books-section-title");
  if (title) title.textContent = "Tài liệu mới nhập học kỳ này";

  renderCurrentView();
}

function borrowBook(bookTitle) {
  showConfirm({
    title: "Thêm vào danh sách mượn",
    message: `Bạn muốn thêm cuốn "${bookTitle}" vào danh sách chuẩn bị mượn sách?`,
    type: "green",
    confirmText: "Thêm vào giỏ",
    cancelText: "Đóng",
    onConfirm: () => {
      if (typeof showToast === "function") {
        showToast(`Đã thêm "${bookTitle}" vào danh sách mượn!`, "success");
      }
    },
  });
}

function showLibraryRules() {
  showConfirm({
    title: "Quy chế mượn trả thư viện KS25",
    message: "Mượn tối đa 05 cuốn / 14 ngày. Gia hạn online trước hạn trả 2 ngày. Phạt trễ hạn 2.000đ/ngày/cuốn; hỏng sách 50% giá bìa; mất sách 100% giá bìa.",
    type: "green",
    confirmText: "Đã hiểu",
    cancelText: "Đóng",
  });
}

function quickAdd(bookTitle) {
  borrowBook(bookTitle);
}

function getBookDetailKey(bookTitle) {
  const title = (bookTitle || "").toLowerCase();
  if (title.includes("clean code") || title.includes("mã sạch")) return "cleancode";
  if (title.includes("cấu trúc dữ liệu") || title.includes("giải thuật") || title.includes("dsa") || title.includes("sedgewick")) return "dsa";
  if (title.includes("python")) return "python";
  if (title.includes("cơ sở dữ liệu") || title.includes("csdl") || title.includes("hệ thống") || title.includes("database")) return "hethong";
  if (title.includes("kiến trúc") || title.includes("máy tính") || title.includes("nhúng")) return "kientruc";
  if (title.includes("trí tuệ") || title.includes("ai")) return "python";
  if (title.includes("kinh tế") || title.includes("vi mô")) return "kientruc";
  return "dsa";
}

function viewBookDetail(bookTitle) {
  const key = getBookDetailKey(bookTitle);
  window.location.href = `book_detail.html?book=${key}`;
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'");
}

// ==============================================================================
// ĐỒNG BỘ THANH ĐIỀU HƯỚNG TOPBAR, USER ACCOUNT & MODAL ĐĂNG XUẤT (THEO BOOKS.HTML)
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
    if (btnProceed) btnProceed.classList.add("btn-success");
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

function initTopBar() {
  // 1. Đồng bộ thông tin người dùng lên Topbar
  const userProfileBtn = document.getElementById("userProfileBtn");
  const avatarEl = document.getElementById("userAvatar");
  const nameEl = document.getElementById("userName");
  const roleEl = document.getElementById("userRole");
  const userDropdownMenu = document.getElementById("userDropdownMenu");

  let user = null;
  if (typeof auth !== "undefined" && typeof auth.getUser === "function") {
    user = auth.getUser();
  } else {
    try {
      const raw = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
      if (raw) user = JSON.parse(raw);
    } catch (e) {
      /* ignore */
    }
  }

  if (user) {
    const fullName = user.full_name || user.name || user.email || "Độc giả";
    const initial = (fullName.trim().charAt(0) || "U").toUpperCase();
    const roleText = user.role === "ADMIN" ? "Quản trị viên" : user.role === "LIBRARIAN" ? "Thủ thư" : "Sinh viên / Độc giả";

    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = roleText;

    if (userDropdownMenu) {
      const adminLink = (user.role === "ADMIN" || user.role === "LIBRARIAN")
        ? `<a href="staff-dashboard.html" class="dropdown-item">
             <span class="material-symbols-outlined">space_dashboard</span>
             <span>Bàn làm việc quản trị</span>
           </a>`
        : "";

      userDropdownMenu.innerHTML = `
        <a href="profile.html" class="dropdown-item">
          <span class="material-symbols-outlined">account_circle</span>
          <span>Thông tin cá nhân</span>
        </a>
        <a href="loan_slip.html" class="dropdown-item">
          <span class="material-symbols-outlined">receipt_long</span>
          <span>Phiếu mượn của tôi</span>
        </a>
        <a href="reservations.html" class="dropdown-item">
          <span class="material-symbols-outlined">bookmark_added</span>
          <span>Sách đặt trước</span>
        </a>
        ${adminLink}
        <div class="dropdown-divider"></div>
        <button type="button" class="dropdown-item text-danger" id="logoutMenuBtn">
          <span class="material-symbols-outlined">logout</span>
          <span>Đăng xuất</span>
        </button>
      `;
    }
  } else {
    if (avatarEl) avatarEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">person</span>';
    if (nameEl) nameEl.textContent = "Tài khoản";
    if (roleEl) roleEl.textContent = "Chưa đăng nhập";

    if (userDropdownMenu) {
      userDropdownMenu.innerHTML = `
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
  }

  // 2. Toggle Mobile menu
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navMenu = document.getElementById("navMenu");
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      navMenu.classList.toggle("show");
    });
  }

  // 3. Toggle User Dropdown
  if (userProfileBtn && userDropdownMenu) {
    userProfileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdownMenu.classList.toggle("show");
      const isShown = userDropdownMenu.classList.contains("show");
      userProfileBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
    });
  }

  // 4. Click mục "Thông báo" trên thanh điều hướng ngang
  const navNotifBtn = document.getElementById("navNotifBtn");
  if (navNotifBtn) {
    navNotifBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const bell = document.getElementById("notifBellBtn");
      if (bell) {
        bell.click();
      } else {
        window.location.href = "loan_slip.html";
      }
    });
  }

  // 5. Đóng menu khi click ngoài màn hình
  document.addEventListener("click", () => {
    if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
      userDropdownMenu.classList.remove("show");
      if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
    }
    if (navMenu && navMenu.classList.contains("show")) {
      navMenu.classList.remove("show");
    }
  });

  // 6. Sự kiện đăng xuất với confirm modal
  document.addEventListener("click", (e) => {
    const logoutBtn = e.target.closest("#logoutMenuBtn");
    if (logoutBtn) {
      e.preventDefault();
      if (userDropdownMenu) userDropdownMenu.classList.remove("show");
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
        },
      });
    }
  });

  // 7. Các nút trong Modal xác nhận
  const btnCancelConfirm = document.getElementById("btn-confirm-cancel");
  const btnProceedConfirm = document.getElementById("btn-confirm-proceed");
  const confirmModal = document.getElementById("confirm-modal");

  if (btnCancelConfirm) {
    btnCancelConfirm.addEventListener("click", closeConfirmModal);
  }
  if (btnProceedConfirm) {
    btnProceedConfirm.addEventListener("click", () => {
      if (typeof activeConfirmCallback === "function") {
        activeConfirmCallback();
      }
      closeConfirmModal();
    });
  }
  if (confirmModal) {
    confirmModal.addEventListener("click", (e) => {
      if (e.target === confirmModal) {
        closeConfirmModal();
      }
    });
  }
}

// Khởi chạy
renderCurrentView();
initTopBar();

// Đảm bảo các hàm gọi từ thuộc tính onclick trên HTML luôn sẵn sàng
window.handleSearch = handleSearch;
window.toggleCategories = toggleCategories;
window.handleCategoryFilter = handleCategoryFilter;
window.clearSearchFilter = clearSearchFilter;
window.borrowBook = borrowBook;
window.showLibraryRules = showLibraryRules;
window.quickAdd = quickAdd;
window.prevCarousel = prevCarousel;
window.nextCarousel = nextCarousel;
window.goToCarouselPage = goToCarouselPage;
window.toggleAllBooksView = toggleAllBooksView;
window.viewBookDetail = viewBookDetail;
window.showConfirm = showConfirm;
window.closeConfirmModal = closeConfirmModal;
