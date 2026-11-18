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
      <div class="book-cover" style="background: ${book.coverBg}; cursor: pointer;" onclick="viewBookDetail('${escapeQuotes(book.title)}')">
        <span class="shelf-badge">${book.shelf}</span>
        <div class="book-cover-content">
          <div class="book-cover-tag">${book.coverTag}</div>
          <div class="book-cover-title">${book.coverTitle}</div>
          <div class="book-cover-author">${book.author}</div>
        </div>
      </div>
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
        <a href="book_detail.html?book=${getBookDetailKey(book.title)}" class="btn-detail" onclick="viewBookDetail('${escapeQuotes(book.title)}'); return false;">Chi tiết</a>
        ${
          book.available
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
  const bottomText = document.getElementById("toggle-view-text");
  const bottomIcon = document.getElementById("toggle-view-icon");

  if (isAllBooksView) {
    if (topBtn) topBtn.textContent = "Thu gọn (4 cuốn/trang)";
    if (bottomText) bottomText.textContent = "Thu gọn về dạng 4 trang";
    if (bottomIcon) bottomIcon.textContent = "📑";
  } else {
    if (topBtn) topBtn.textContent = "Xem tất cả (16 cuốn)";
    if (bottomText) bottomText.textContent = "Xem toàn bộ 16 tài liệu";
    if (bottomIcon) bottomIcon.textContent = "📖";
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
  alert(`✓ Đã thêm cuốn "${bookTitle}" vào danh sách mượn!`);
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

renderCurrentView();
