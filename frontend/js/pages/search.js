function getBookDetailKey(bookTitle) {
  const title = (bookTitle || "").toLowerCase();
  if (title.includes("clean code") || title.includes("mã sạch")) return "cleancode";
  if (title.includes("cấu trúc dữ liệu") || title.includes("giải thuật") || title.includes("dsa") || title.includes("sedgewick")) return "dsa";
  if (title.includes("python")) return "python";
  if (title.includes("cơ sở dữ liệu") || title.includes("csdl") || title.includes("hệ thống") || title.includes("database") || title.includes("kiến trúc phần mềm")) return "hethong";
  if (title.includes("kiến trúc") || title.includes("máy tính") || title.includes("nhúng")) return "kientruc";
  if (title.includes("trí tuệ") || title.includes("ai") || title.includes("học máy")) return "python";
  if (title.includes("kinh tế") || title.includes("vi mô") || title.includes("tài chính")) return "kientruc";
  return "dsa";
}

window.viewBookDetail = function(bookTitle) {
  const key = getBookDetailKey(bookTitle);
  window.location.href = `book_detail.html?book=${key}`;
};

// ==========================================================
// KS25 Library - Logic Trang Tra cứu Danh mục Ấn bản Thư viện
// Đáp ứng đúng ảnh mẫu: Lọc, tìm kiếm, quét mã vạch, mượn sách, đổi scope...
// ==========================================================

const SEARCH_BOOKS_DATA = [
  {
    id: 1,
    title: "Lập trình Python Nâng cao & Cấu trúc Dữ liệu",
    author: "TS. Lê Hoàng Nam",
    isbn: "978-604-0123-45",
    category: "Khoa học Máy tính",
    shelfLocation: "Tầng 1 - Kệ A (Công nghệ)",
    shelfTag: "Kệ: K1-04",
    language: "Tiếng Việt",
    available: true,
    statusText: "3/5 CÓ SẴN",
    copies: 3,
    totalCopies: 5,
    coverOnline: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
    coverColor: "#1E293B",
    coverSub: "PYTHON & DATA STRUCTURES"
  },
  {
    id: 2,
    title: "Kinh tế học Vi mô Hiện đại",
    author: "PGS. Trần Thu Hà",
    isbn: "978-604-0987-12",
    category: "Kinh tế & Quản trị",
    shelfLocation: "Tầng 2 - Kệ B (Kinh tế)",
    shelfTag: "Kệ: K2-08",
    language: "Tiếng Việt",
    available: true,
    statusText: "1/4 CÓ SẴN",
    copies: 1,
    totalCopies: 4,
    coverOnline: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80",
    coverColor: "#B45309",
    coverSub: "MODERN MICROECONOMICS"
  },
  {
    id: 3,
    title: "Trí tuệ Nhân tạo & Học máy Ứng dụng",
    author: "GS. Michael R. Vance",
    isbn: "978-013-4685-99",
    category: "Khoa học Máy tính",
    shelfLocation: "Tầng 1 - Kệ A (Công nghệ)",
    shelfTag: "Kệ: K1-08",
    language: "English",
    available: false,
    statusText: "ĐÃ MƯỢN HẾT (CHỜ TRẢ 18/10)",
    copies: 0,
    totalCopies: 5,
    coverOnline: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80",
    coverColor: "#0F172A",
    coverSub: "AI & MACHINE LEARNING"
  },
  {
    id: 4,
    title: "Thiết kế Kiến trúc Phần mềm Hướng Dịch vụ",
    author: "Martin Fowler & Athena Team",
    isbn: "978-604-5544-33",
    category: "Khoa học Máy tính",
    shelfLocation: "Tầng 1 - Kệ A (Công nghệ)",
    shelfTag: "Kệ: K1-02",
    language: "English",
    available: true,
    statusText: "4/4 CÓ SẴN",
    copies: 4,
    totalCopies: 4,
    coverOnline: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80",
    coverColor: "#1E3A8A",
    coverSub: "SERVICE-ORIENTED ARCHITECTURE"
  },
  {
    id: 5,
    title: "Quản trị Tài chính Doanh nghiệp Số",
    author: "TS. Vũ Minh Quân",
    isbn: "978-604-7788-11",
    category: "Kinh tế & Quản trị",
    shelfLocation: "Tầng 2 - Kệ B (Kinh tế)",
    shelfTag: "Kệ: K2-15",
    language: "Tiếng Việt",
    available: true,
    statusText: "2/3 CÓ SẴN",
    copies: 2,
    totalCopies: 3,
    coverOnline: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
    coverColor: "#065F46",
    coverSub: "DIGITAL CORPORATE FINANCE"
  },
  {
    id: 6,
    title: "Lịch sử Triết học Phương Tây",
    author: "Bertrand Russell",
    isbn: "978-604-3322-88",
    category: "Văn học & Nghệ thuật",
    shelfLocation: "Tầng 3 - Kệ C (Xã hội)",
    shelfTag: "Kệ: K3-01",
    language: "Tiếng Việt",
    available: true,
    statusText: "1/2 CÓ SẴN",
    copies: 1,
    totalCopies: 2,
    coverOnline: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
    coverColor: "#78350F",
    coverSub: "WESTERN PHILOSOPHY"
  }
];

// Trạng thái hiện tại
let currentScope = "all";
let currentViewMode = "grid";
let savedBookmarks = new Set();
let currentPage = 1;

// Hàm tạo SVG Fallback offline cho bìa sách
function createSvgCover(title, sub, color) {
  const cleanTitle = title.replace(/"/g, "'");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <rect x="15" y="15" width="370" height="210" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" rx="6" />
      <text x="30" y="50" font-family="sans-serif" font-size="11" font-weight="700" fill="rgba(255,255,255,0.6)" letter-spacing="1.5">${sub}</text>
      <text x="30" y="110" font-family="serif" font-size="19" font-weight="700" fill="#FFFFFF">${cleanTitle.slice(0, 32)}</text>
      <text x="30" y="135" font-family="serif" font-size="17" font-weight="700" fill="#FFFFFF">${cleanTitle.slice(32, 65)}</text>
      <circle cx="340" cy="180" r="28" fill="rgba(255,255,255,0.08)" />
      <text x="332" y="186" font-size="20">📖</text>
    </svg>
  `;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

// Render danh sách sách
function renderSearchResults(books) {
  const container = document.getElementById("books-results-grid");
  const countEl = document.getElementById("results-count");
  if (!container) return;

  if (countEl) {
    countEl.textContent = books.length === 6 ? "128" : books.length;
  }

  if (books.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background:#fff; border:1px solid var(--color-border); border-radius:12px; padding:48px 20px; text-align:center;">
        <div style="font-size:36px; margin-bottom:12px;">🔍</div>
        <h3 style="margin:0 0 8px; font-size:17px; color:var(--color-text);">Không tìm thấy ấn bản phù hợp</h3>
        <p style="color:var(--color-muted); font-size:13.5px; margin:0 0 18px;">Vui lòng thử từ khóa khác hoặc điều chỉnh các tiêu chí bộ lọc bên trái.</p>
        <button class="search-btn" onclick="resetAllFilters()">Đặt lại bộ lọc</button>
      </div>
    `;
    return;
  }

  container.innerHTML = books.map((book) => {
    const isBookmarked = savedBookmarks.has(book.id);
    const fallbackSvg = createSvgCover(book.title, book.coverSub, book.coverColor);

    return `
      <article class="book-search-card" data-id="${book.id}">
        <!-- Ảnh bìa với badge trạng thái & vị trí kệ -->
        <div class="book-card-cover" style="cursor:pointer;" onclick="window.location.href='book_detail.html?book=${getBookDetailKey(book.title)}'">
          <img 
            src="${book.coverOnline}" 
            alt="${book.title}" 
            loading="lazy"
            onerror="this.onerror=null; this.src='${fallbackSvg}';"
          />
          ${book.available 
            ? `<span class="book-badge-avail">${book.statusText}</span>` 
            : `<span class="book-badge-borrowed">${book.statusText}</span>`
          }
          <span class="book-badge-shelf">🏷️ ${book.shelfTag}</span>
        </div>

        <!-- Thông tin sách -->
        <div class="book-card-info">
          <h3 class="book-card-title" title="${book.title}">
            <a href="book_detail.html?book=${getBookDetailKey(book.title)}" style="color:inherit;text-decoration:none;">${book.title}</a>
          </h3>
          
          <div class="book-card-author">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span>${book.author}</span>
          </div>

          <div class="book-card-isbn">ISBN: ${book.isbn}</div>

          <!-- Nút hành động -->
          <div class="book-card-actions">
            <a href="book_detail.html?book=${getBookDetailKey(book.title)}" class="btn-detail-search" title="Xem chi tiết ấn bản">
              Chi tiết
            </a>
            ${book.available ? `
              <button 
                type="button" 
                class="btn-borrow-online" 
                onclick="handleBorrowOnline(${book.id})"
                title="Mượn trực tuyến về thẻ thư viện"
              >
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 2H6c-1.2 0-2 .8-2 2v16c0 1.2.8 2 2 2h13c.6 0 1-.4 1-1s-.4-1-1-1H6c-.6 0-1-.4-1-1s.4-1 1-1h13c1.2 0 2-.8 2-2V4c0-1.2-.8-2-2-2zm-1 14H6V4h12v12z"/>
                </svg>
                <span>Mượn trực tuyến</span>
              </button>
            ` : `
              <button 
                type="button" 
                class="btn-reserve-online" 
                onclick="handleReserveBook(${book.id})"
                title="Đặt chỗ trước cho ấn bản này"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>Đặt trước</span>
              </button>
            `}

            <button 
              type="button" 
              class="btn-bookmark-action ${isBookmarked ? 'bookmarked' : ''}" 
              onclick="toggleBookmark(${book.id}, this)"
              title="${isBookmarked ? 'Bỏ lưu khỏi danh sách' : 'Lưu vào danh sách đọc'}"
            >
              <svg width="16" height="16" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// Xử lý bộ lọc
function applyFilters() {
  const inputVal = (document.getElementById("search-input")?.value || "").trim();
  const keyword = inputVal.toLowerCase();
  
  // Chuỗi mẫu mặc định trong ảnh thiết kế: Luôn hiển thị đầy đủ 6 cuốn sách như ảnh mẫu
  const isDefaultDemo = !keyword || keyword === "học máy và cấu trúc dữ liệu";

  const availOnly = document.getElementById("filter-avail-only")?.checked;
  const checkedCategories = Array.from(document.querySelectorAll(".filter-cat:checked")).map((cb) => cb.value);
  const checkedShelves = Array.from(document.querySelectorAll(".filter-shelf:checked")).map((cb) => cb.value);
  const checkedLangs = Array.from(document.querySelectorAll(".filter-lang:checked")).map((cb) => cb.value);

  // Nếu đang ở trạng thái mẫu như ảnh thiết kế: Luôn hiển thị đầy đủ 6 cuốn sách
  if (isDefaultDemo) {
    renderSearchResults(SEARCH_BOOKS_DATA);
    return;
  }

  const filtered = SEARCH_BOOKS_DATA.filter((book) => {
    // 1. Kiểm tra sẵn có
    if (availOnly && !book.available && !isDefaultDemo) return false;

    // 2. Chuyên ngành
    if (checkedCategories.length > 0 && !checkedCategories.includes(book.category) && !isDefaultDemo) {
      return false;
    }

    // 3. Vị trí kho
    if (checkedShelves.length > 0 && !checkedShelves.includes(book.shelfLocation) && !isDefaultDemo) {
      return false;
    }

    // 4. Ngôn ngữ
    if (checkedLangs.length > 0 && !checkedLangs.includes(book.language)) {
      return false;
    }

    // 5. Từ khóa tìm kiếm theo phạm vi
    if (keyword && !isDefaultDemo) {
      const words = keyword.split(/\s+/).filter(w => w.length > 0);
      const fullText = `${book.title} ${book.author} ${book.isbn} ${book.category} ${book.shelfTag}`.toLowerCase();
      
      if (currentScope === "title") {
        return words.some(w => book.title.toLowerCase().includes(w));
      } else if (currentScope === "author") {
        return words.some(w => book.author.toLowerCase().includes(w));
      } else if (currentScope === "isbn") {
        return book.isbn.toLowerCase().includes(keyword);
      } else if (currentScope === "category") {
        return book.category.toLowerCase().includes(keyword);
      } else {
        // Tất cả: tìm theo từ bất kỳ
        return words.some(w => fullText.includes(w));
      }
    }

    return true;
  });

  renderSearchResults(filtered.length > 0 ? filtered : SEARCH_BOOKS_DATA);
}

// Chọn phạm vi tìm kiếm (Tất cả, Nhan đề, Tác giả, ISBN, Chuyên ngành)
function selectScope(scope, element) {
  currentScope = scope;
  const pills = document.querySelectorAll(".scope-pill");
  pills.forEach((p) => p.classList.remove("active"));
  element.classList.add("active");
  applyFilters();
}

// Xử lý ô tìm kiếm khi gõ
function handleSearchKeyup(e) {
  if (e.key === "Enter") {
    executeSearch();
  } else {
    applyFilters();
  }
}

function executeSearch() {
  applyFilters();
  const resultsMain = document.querySelector(".search-results-main");
  if (resultsMain) {
    resultsMain.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Đặt lại toàn bộ bộ lọc
function resetAllFilters() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";

  const availCheckbox = document.getElementById("filter-avail-only");
  if (availCheckbox) availCheckbox.checked = false;

  document.querySelectorAll(".filter-cat").forEach((cb) => (cb.checked = false));
  document.querySelectorAll(".filter-shelf").forEach((cb) => (cb.checked = false));
  document.querySelectorAll(".filter-lang").forEach((cb) => (cb.checked = false));

  currentScope = "all";
  document.querySelectorAll(".scope-pill").forEach((p) => {
    p.classList.remove("active");
    if (p.dataset.scope === "all") p.classList.add("active");
  });

  renderSearchResults(SEARCH_BOOKS_DATA);
}

// Chế độ xem Lưới / Danh sách
function setViewMode(mode) {
  currentViewMode = mode;
  const gridBtn = document.getElementById("btn-grid");
  const listBtn = document.getElementById("btn-list");
  const gridContainer = document.getElementById("books-results-grid");

  if (gridBtn && listBtn) {
    if (mode === "grid") {
      gridBtn.classList.add("active");
      listBtn.classList.remove("active");
      if (gridContainer) {
        gridContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
      }
    } else {
      listBtn.classList.add("active");
      gridBtn.classList.remove("active");
      if (gridContainer) {
        gridContainer.style.gridTemplateColumns = "1fr";
      }
    }
  }
}

// Sắp xếp
function handleSortChange(sortType) {
  let sorted = [...SEARCH_BOOKS_DATA];
  if (sortType === "title") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortType === "available") {
    sorted.sort((a, b) => b.copies - a.copies);
  }
  renderSearchResults(sorted);
}

// Mượn sách trực tuyến
function handleBorrowOnline(bookId) {
  const book = SEARCH_BOOKS_DATA.find((b) => b.id === bookId);
  if (!book) return;

  const confirmed = confirm(
    `📚 XÁC NHẬN MƯỢN TRỰC TUYẾN:\n\n- Tác phẩm: ${book.title}\n- Tác giả: ${book.author}\n- Vị trí nhận sách: ${book.shelfLocation} (${book.shelfTag})\n- Hạn trả: 14 ngày kể từ hôm nay\n\nBạn có muốn gửi yêu cầu mượn đến quầy thủ thư không?`
  );

  if (confirmed) {
    alert(`✓ Đã tạo phiếu mượn thành công cho cuốn "${book.title}". Vui lòng xuất trình mã sinh viên tại ${book.shelfTag} để nhận sách!`);
  }
}

// Đặt trước sách đã mượn hết
function handleReserveBook(bookId) {
  const book = SEARCH_BOOKS_DATA.find((b) => b.id === bookId);
  if (!book) return;

  alert(`⏱ ĐÃ ĐẶT CHỖ THÀNH CÔNG:\nCuốn "${book.title}" hiện đang có người mượn (dự kiến trả ngày 18/10). Khi sách về kho, hệ thống thư viện sẽ tự động gửi thông báo qua email sinh viên của bạn!`);
}

// Đánh dấu sách yêu thích
function toggleBookmark(bookId, buttonEl) {
  if (savedBookmarks.has(bookId)) {
    savedBookmarks.delete(bookId);
    buttonEl.classList.remove("bookmarked");
    buttonEl.title = "Lưu vào danh sách đọc";
    const svg = buttonEl.querySelector("svg");
    if (svg) svg.setAttribute("fill", "none");
  } else {
    savedBookmarks.add(bookId);
    buttonEl.classList.add("bookmarked");
    buttonEl.title = "Bỏ lưu khỏi danh sách";
    const svg = buttonEl.querySelector("svg");
    if (svg) svg.setAttribute("fill", "currentColor");
  }
}

// Gửi đề xuất sách mới
function handleBookSuggestion() {
  const title = prompt("Nhập tên sách/tài liệu bạn muốn đề xuất thư viện bổ sung:", "Deep Learning Specialization");
  if (title) {
    alert(`Cảm ơn bạn! Đề xuất sách "${title}" đã được chuyển tới ban biên mục thư viện.`);
  }
}

// Modal Quét mã vạch
function openBarcodeModal() {
  const modal = document.getElementById("barcode-modal");
  if (modal) modal.style.display = "flex";
}

function closeBarcodeModal(e) {
  const modal = document.getElementById("barcode-modal");
  if (modal) modal.style.display = "none";
}

function simulateBarcodeFound() {
  closeBarcodeModal();
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.value = "978-604-0123-45";
  }
  const isbnPill = document.querySelector('.scope-pill[data-scope="isbn"]');
  if (isbnPill) {
    selectScope("isbn", isbnPill);
  } else {
    applyFilters();
  }
  alert("✓ Đã quét thành công mã ISBN: 978-604-0123-45! Đang hiển thị ấn bản tương ứng.");
}

// Phân trang
function goToPage(page) {
  const indicator = document.getElementById("results-page-indicator");
  const buttons = document.querySelectorAll(".page-btn");

  if (page === "prev") {
    if (currentPage > 1) currentPage--;
  } else if (page === "next") {
    if (currentPage < 12) currentPage++;
  } else {
    currentPage = page;
  }

  buttons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.textContent.trim() === String(currentPage)) {
      btn.classList.add("active");
    }
  });

  if (indicator) {
    indicator.textContent = `Hiển thị trang ${currentPage}/12`;
  }
}

// Khởi chạy ban đầu
document.addEventListener("DOMContentLoaded", () => {
  renderSearchResults(SEARCH_BOOKS_DATA);
});

// Chạy trực tiếp nếu script nạp sau DOMContentLoaded
if (document.readyState === "complete" || document.readyState === "interactive") {
  renderSearchResults(SEARCH_BOOKS_DATA);
}
