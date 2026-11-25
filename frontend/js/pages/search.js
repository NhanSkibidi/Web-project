// ==============================================================================
// KS25 Library - Trang Tra cứu Danh mục Ấn bản Thư viện
// Đọc dữ liệu thực từ API: GET /api/books/search, GET /api/books/facets
// ==============================================================================

// ---------- Trạng thái toàn cục ----------
const searchState = {
  keyword: "",
  scope: "all",
  currentPage: 1,
  pageSize: 12,
  totalPages: 1,
  total: 0,
  sortBy: "created_at",
  sortOrder: "desc",
  availableOnly: false,
  selectedCategories: [],
  selectedShelves: [],
  selectedLanguages: [],
  viewMode: "grid",
  loading: false,
};

// Map từ dữ liệu DB sang hiển thị
let currentDisplayedBooks = [];
let pendingBorrowBook = null;
let lastModalTriggerEl = null;
let searchUiBound = false;
let savedBookmarks = new Set();

// ---------- Helper: format cover URL ----------
function formatCoverUrl(coverImage, root) {
  if (!coverImage) return null;
  if (coverImage.startsWith("http://") || coverImage.startsWith("https://") || coverImage.startsWith("data:")) {
    return coverImage;
  }
  const r = root || (document.body.dataset.root || "../");
  return r + coverImage.replace(/^\//, "");
}

// ---------- Helper: SVG fallback bìa sách ----------
function createSvgCover(title, color) {
  const cleanTitle = (title || "").replace(/"/g, "'");
  const bg = color || "#1E293B";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <rect x="15" y="15" width="370" height="210" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" rx="6" />
      <text x="30" y="50" font-family="sans-serif" font-size="11" font-weight="700" fill="rgba(255,255,255,0.6)" letter-spacing="1.5">KS25 LIBRARY</text>
      <text x="30" y="110" font-family="serif" font-size="19" font-weight="700" fill="#FFFFFF">${cleanTitle.slice(0, 32)}</text>
      <text x="30" y="135" font-family="serif" font-size="17" font-weight="700" fill="#FFFFFF">${cleanTitle.slice(32, 65)}</text>
      <circle cx="340" cy="180" r="28" fill="rgba(255,255,255,0.08)" />
      <text x="332" y="186" font-size="20">📖</text>
    </svg>
  `;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateVN(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function generateLoanSlipCode() {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `PM-${year}-${num}`;
}

function isSearchUserLoggedIn() {
  if (typeof auth !== "undefined" && typeof auth.isLoggedIn === "function") {
    return auth.isLoggedIn();
  }
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("access_token");
  const userRaw = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
  return Boolean(token && userRaw);
}

function openAuthGuardModal(redirectUrl = "") {
  const overlay = document.getElementById("authGuardOverlay");
  if (!overlay) {
    window.location.href = "login.html#login";
    return;
  }
  const loginBtn = document.getElementById("authGuardLoginBtn");
  if (loginBtn) {
    loginBtn.onclick = () => {
      try {
        const target = redirectUrl
          ? new URL(redirectUrl, window.location.href).href
          : window.location.href;
        sessionStorage.setItem("redirect_after_login", target);
      } catch {
        // ignore
      }
    };
  }
  overlay.style.display = "flex";
}

function closeAuthGuardModal() {
  const overlay = document.getElementById("authGuardOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

function openSearchBookDetail(detailUrl) {
  if (!isSearchUserLoggedIn()) {
    openAuthGuardModal(detailUrl);
    return;
  }
  window.location.href = detailUrl;
}

function handleSearchDetailLinkClick(event, el) {
  if (!isSearchUserLoggedIn()) {
    if (event) event.preventDefault();
    const targetUrl = el && el.getAttribute ? el.getAttribute("href") : "";
    openAuthGuardModal(targetUrl);
    return false;
  }
  return true;
}

// ---------- Hiển thị trạng thái loading ----------
function showLoadingState() {
  const container = document.getElementById("books-results-grid");
  if (!container) return;
  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px; color:var(--color-muted);">
      <div class="spinner" style="width:36px;height:36px;border:3px solid var(--color-border);border-top-color:var(--color-primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
      <p style="font-size:14px;">Đang tải dữ liệu...</p>
    </div>
  `;
  // Thêm animation nếu chưa có
  if (!document.getElementById("search-spin-style")) {
    const style = document.createElement("style");
    style.id = "search-spin-style";
    style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(style);
  }
}

// ---------- Render kết quả ----------
function renderSearchResults(books) {
  currentDisplayedBooks = Array.isArray(books) ? books : [];
  const container = document.getElementById("books-results-grid");
  const countEl = document.getElementById("results-count");
  if (!container) return;

  if (countEl) {
    countEl.textContent = searchState.total || books.length;
  }

  if (books.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background:#fff; border:1px solid var(--color-border); border-radius:12px; padding:48px 20px; text-align:center;">
        <span class="material-symbols-outlined" style="font-size:48px; color:var(--color-muted); display:block; margin-bottom:12px;">search</span>
        <h3 style="margin:0 0 8px; font-size:17px; color:var(--color-text);">Không tìm thấy ấn bản phù hợp</h3>
        <p style="color:var(--color-muted); font-size:13.5px; margin:0 0 18px;">Vui lòng thử từ khóa khác hoặc điều chỉnh các tiêu chí bộ lọc bên trái.</p>
        <button class="search-btn" onclick="resetAllFilters()">Đặt lại bộ lọc</button>
      </div>
    `;
    return;
  }

  container.innerHTML = books.map((book) => {
    const isbn = book.isbn || "";
    const title = book.title || "(Chưa có tiêu đề)";
    const authorName = Array.isArray(book.authors) && book.authors.length > 0
      ? book.authors[0].name
      : (book.author || "");
    const shelfTag = book.shelf_location || book.shelfLocation || "";
    const shelfTagLabel = shelfTag ? `🏷️ ${shelfTag}` : "";
    const availCopies = typeof book.available_copies === "number" ? book.available_copies : (book.copies || 0);
    const totalCopies = typeof book.total_copies === "number" ? book.total_copies : (book.totalCopies || 0);
    const isAvailable = availCopies > 0;
    const hasPhysicalCopies = totalCopies > 0;
    const statusText = isAvailable
      ? `${availCopies}/${totalCopies} CÓ SẴN`
      : hasPhysicalCopies
      ? "ĐÃ MƯỢN HẾT"
      : "CHƯA CÓ BẢN SAO";

    const coverUrl = formatCoverUrl(book.cover_image || book.coverOnline);
    const fallbackSvg = createSvgCover(title, book.coverColor || "#1E293B");
    const coverSrc = coverUrl || fallbackSvg;

    const isBookmarked = savedBookmarks.has(isbn);
    const bookIdAttr = escapeHtml(isbn);

    return `
      <article class="book-search-card" data-isbn="${bookIdAttr}">
        <!-- Ảnh bìa -->
        <div class="book-card-cover" style="cursor:pointer;" data-detail-url="book_detail.html?isbn=${encodeURIComponent(isbn)}" onclick="openSearchBookDetail(this.dataset.detailUrl)">
          <img 
            src="${escapeHtml(coverSrc)}" 
            alt="${escapeHtml(title)}" 
            loading="lazy"
            onerror="this.onerror=null; this.src='${fallbackSvg.replace(/'/g, "\\'")}'"
          />
          ${isAvailable 
            ? `<span class="book-badge-avail">${escapeHtml(statusText)}</span>` 
            : `<span class="book-badge-borrowed">${escapeHtml(statusText)}</span>`
          }
          ${shelfTagLabel ? `<span class="book-badge-shelf">${escapeHtml(shelfTagLabel)}</span>` : ""}
        </div>

        <!-- Thông tin sách -->
        <div class="book-card-info">
          <h3 class="book-card-title" title="${escapeHtml(title)}">
            <a href="book_detail.html?isbn=${encodeURIComponent(isbn)}" style="color:inherit;text-decoration:none;" onclick="return handleSearchDetailLinkClick(event, this)">${escapeHtml(title)}</a>
          </h3>
          
          <div class="book-card-author">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span>${escapeHtml(authorName)}</span>
          </div>

          ${isbn ? `<div class="book-card-isbn">ISBN: ${escapeHtml(isbn)}</div>` : ""}

          <!-- Nút hành động -->
          <div class="book-card-actions">
            <a href="book_detail.html?isbn=${encodeURIComponent(isbn)}" class="btn-detail-search" title="Xem chi tiết ấn bản" onclick="return handleSearchDetailLinkClick(event, this)">
              Chi tiết
            </a>
            ${isAvailable ? `
              <button 
                type="button" 
                class="btn-borrow-online" 
                onclick="handleBorrowOnline('${bookIdAttr}')"
                title="Mượn trực tuyến về thẻ thư viện"
              >
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 2H6c-1.2 0-2 .8-2 2v16c0 1.2.8 2 2 2h13c.6 0 1-.4 1-1s-.4-1-1-1H6c-.6 0-1-.4-1-1s.4-1 1-1h13c1.2 0 2-.8 2-2V4c0-1.2-.8-2-2-2zm-1 14H6V4h12v12z"/>
                </svg>
                <span>Mượn trực tuyến</span>
              </button>
            ` : hasPhysicalCopies ? `
              <button 
                type="button" 
                class="btn-reserve-online" 
                onclick="handleReserveBook('${bookIdAttr}')"
                title="Đặt chỗ trước cho ấn bản này"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>Đặt trước</span>
              </button>
            ` : `
              <button
                type="button"
                class="btn-reserve-online"
                disabled
                style="opacity: 0.55; cursor: not-allowed;"
                title="Đầu sách hiện chưa có bản sao vật lý nào trong kho"
              >
                <span>Chưa có bản sao</span>
              </button>
            `}

            <button 
              type="button" 
              class="btn-bookmark-action ${isBookmarked ? 'bookmarked' : ''}" 
              onclick="toggleBookmark('${bookIdAttr}', this)"
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

// ---------- Render phân trang ----------
function renderPagination(total, totalPages) {
  searchState.total = total || 0;
  searchState.totalPages = totalPages || 1;

  const container = document.getElementById("pagination-controls");
  const countEl = document.getElementById("results-count");
  const pageEl = document.getElementById("results-page-indicator");

  if (countEl) countEl.textContent = searchState.total;
  if (pageEl) pageEl.textContent = `Hiển thị trang ${searchState.currentPage}/${searchState.totalPages}`;

  if (!container) return;

  const cur = searchState.currentPage;
  const max = searchState.totalPages;

  if (max <= 1) {
    container.innerHTML = "";
    return;
  }

  let pagesHtml = "";
  // Prev
  pagesHtml += `<button type="button" class="page-btn ${cur <= 1 ? 'disabled' : ''}" onclick="goToPage('prev')" ${cur <= 1 ? 'disabled' : ''}>&lt; Trang trước</button>`;

  // First
  pagesHtml += `<button type="button" class="page-btn ${cur === 1 ? 'active' : ''}" onclick="goToPage(1)">1</button>`;

  if (cur > 3) {
    pagesHtml += `<span class="page-dots">...</span>`;
  }

  for (let i = Math.max(2, cur - 1); i <= Math.min(max - 1, cur + 1); i++) {
    pagesHtml += `<button type="button" class="page-btn ${cur === i ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (cur < max - 2) {
    pagesHtml += `<span class="page-dots">...</span>`;
  }

  if (max > 1) {
    pagesHtml += `<button type="button" class="page-btn ${cur === max ? 'active' : ''}" onclick="goToPage(${max})">${max}</button>`;
  }

  // Next
  pagesHtml += `<button type="button" class="page-btn ${cur >= max ? 'disabled' : ''}" onclick="goToPage('next')" ${cur >= max ? 'disabled' : ''}>Trang kế &gt;</button>`;

  container.innerHTML = pagesHtml;
}

const SEARCH_CACHE_KEY = "unilib_search_cache_v1";

function readSearchCache() {
  try {
    const raw = sessionStorage.getItem(SEARCH_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSearchCache(patch) {
  try {
    const prev = readSearchCache() || {};
    sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    // ignore
  }
}

function isDefaultSearchQuery() {
  return (
    !searchState.keyword &&
    searchState.currentPage === 1 &&
    !searchState.availableOnly &&
    searchState.sortBy === "created_at" &&
    searchState.sortOrder === "desc" &&
    searchState.selectedCategories.length === 0 &&
    searchState.selectedShelves.length === 0 &&
    searchState.selectedLanguages.length === 0
  );
}

function getBooksSignature(items, total, totalPages) {
  try {
    return JSON.stringify({ items, total, totalPages });
  } catch {
    return "";
  }
}

// ---------- Gọi API lấy sách ----------
async function fetchBooks(options = {}) {
  const { silent = false, prevSignature = "" } = options;
  if (searchState.loading) return;
  searchState.loading = true;
  if (!silent) {
    showLoadingState();
  }

  try {
    const params = {
      page: searchState.currentPage,
      page_size: searchState.pageSize,
      sort_by: searchState.sortBy,
      sort_order: searchState.sortOrder,
    };
    if (searchState.keyword) {
      params.keyword = searchState.keyword;
      params.scope = searchState.scope;
    }
    if (searchState.availableOnly) params.available_only = true;
    if (searchState.selectedCategories.length) params.category_ids = searchState.selectedCategories.join(",");
    if (searchState.selectedShelves.length) params.shelf_locations = searchState.selectedShelves.join(",");
    if (searchState.selectedLanguages.length) params.languages = searchState.selectedLanguages.join(",");

    const res = await api.get("/books/search", params);
    // res = { items, total, page, page_size, total_pages }
    const items = res.items || res.books || res.data || (Array.isArray(res) ? res : []);
    const total = res.total || res.total_count || items.length;
    const totalPages = res.total_pages || res.pages || Math.ceil(total / searchState.pageSize) || 1;

    const nextSig = getBooksSignature(items, total, totalPages);
    if (isDefaultSearchQuery()) {
      writeSearchCache({ books: { items, total, totalPages } });
    }

    if (!silent || !prevSignature || nextSig !== prevSignature) {
      renderSearchResults(items);
      renderPagination(total, totalPages);
    }
  } catch (err) {
    console.error("[search] fetchBooks error:", err);
    if (!silent) {
      const container = document.getElementById("books-results-grid");
      if (container) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; padding:48px 20px; color:var(--color-danger,#dc2626);">
            <span class="material-symbols-outlined" style="font-size:40px; display:block; margin-bottom:12px;">error_outline</span>
            <p>Không thể tải dữ liệu. Vui lòng kiểm tra kết nối và thử lại.</p>
            <button class="search-btn" onclick="fetchBooks()" style="margin-top:12px;">Thử lại</button>
          </div>
        `;
      }
      renderPagination(0, 1);
    }
  } finally {
    searchState.loading = false;
  }
}

// ---------- Gọi API lấy facets (thể loại, kệ sách, ngôn ngữ) ----------
async function loadFacets(prevFacetsSig = "") {
  try {
    const data = await api.get("/books/facets");
    const nextSig = JSON.stringify(data || {});
    writeSearchCache({ facets: data });
    if (!prevFacetsSig || nextSig !== prevFacetsSig) {
      renderFacetCategories(data.categories || []);
      renderFacetShelves(data.shelves || []);
      renderFacetLanguages(data.languages || []);
    }
  } catch (err) {
    console.warn("[search] loadFacets error:", err);
    // Giữ nội dung hiện có nếu API thất bại
  }
}

function renderFacetCategories(categories) {
  const wrap = document.getElementById("filter-categories-container");
  if (!wrap || !categories.length) return;
  wrap.innerHTML = categories.map((c) => `
    <label class="filter-item">
      <span style="display:flex; align-items:center;">
        <input type="checkbox" class="filter-checkbox filter-cat" value="${escapeHtml(String(c.id || c.name))}" onchange="applyFilters()">
        ${escapeHtml(c.name || c.id)}
      </span>
      ${c.count != null ? `<span class="filter-count">${c.count}</span>` : ""}
    </label>
  `).join("");
}

function renderFacetShelves(shelves) {
  const wrap = document.getElementById("filter-shelves-container");
  if (!wrap || !shelves.length) return;
  wrap.innerHTML = shelves.map((s) => `
    <label class="filter-item">
      <span style="display:flex; align-items:center;">
        <input type="checkbox" class="filter-checkbox filter-shelf" value="${escapeHtml(s.name || s)}" onchange="applyFilters()">
        ${escapeHtml(s.name || s)}
      </span>
      ${s.count != null ? `<span class="filter-count">${s.count}</span>` : ""}
    </label>
  `).join("");
}

function renderFacetLanguages(languages) {
  const wrap = document.getElementById("filter-languages-container");
  if (!wrap || !languages.length) return;
  wrap.innerHTML = languages.map((l) => `
    <label class="filter-item">
      <span style="display:flex; align-items:center;">
        <input type="checkbox" class="filter-checkbox filter-lang" value="${escapeHtml(l.name || l)}" onchange="applyFilters()">
        ${escapeHtml(l.name || l)}
      </span>
      ${l.count != null ? `<span class="filter-count">${l.count}</span>` : ""}
    </label>
  `).join("");
}

// ---------- Áp dụng bộ lọc (đọc UI -> gọi API) ----------
function applyFilters() {
  const kw = (document.getElementById("search-input")?.value || "").trim();
  searchState.keyword = kw;

  searchState.availableOnly = document.getElementById("filter-avail-only")?.checked || false;

  // Nếu có facet container → đọc từ đó; nếu không → đọc hardcode
  searchState.selectedCategories = Array.from(document.querySelectorAll(".filter-cat:checked")).map((cb) => cb.value);
  searchState.selectedShelves = Array.from(document.querySelectorAll(".filter-shelf:checked")).map((cb) => cb.value);
  searchState.selectedLanguages = Array.from(document.querySelectorAll(".filter-lang:checked")).map((cb) => cb.value);

  searchState.currentPage = 1;
  fetchBooks();
}

// ---------- Phạm vi tìm kiếm ----------
function selectScope(scope, element) {
  searchState.scope = scope;
  const pills = document.querySelectorAll(".scope-pill");
  pills.forEach((p) => p.classList.remove("active"));
  element.classList.add("active");
  applyFilters();
}

// ---------- Nhập từ bàn phím ----------
function handleSearchKeyup(e) {
  if (e.key === "Enter") {
    executeSearch();
  }
  // Live search đã bỏ để tránh spam API; chỉ tìm khi nhấn Enter hoặc nút
}

function executeSearch() {
  applyFilters();
  const resultsMain = document.querySelector(".search-results-main");
  if (resultsMain) {
    resultsMain.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ---------- Đặt lại toàn bộ ----------
function resetAllFilters() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";

  const availCheckbox = document.getElementById("filter-avail-only");
  if (availCheckbox) availCheckbox.checked = false;

  document.querySelectorAll(".filter-cat").forEach((cb) => (cb.checked = false));
  document.querySelectorAll(".filter-shelf").forEach((cb) => (cb.checked = false));
  document.querySelectorAll(".filter-lang").forEach((cb) => (cb.checked = false));

  searchState.keyword = "";
  searchState.scope = "all";
  searchState.selectedCategories = [];
  searchState.selectedShelves = [];
  searchState.selectedLanguages = [];
  searchState.availableOnly = false;
  searchState.currentPage = 1;
  searchState.sortBy = "created_at";
  searchState.sortOrder = "desc";

  document.querySelectorAll(".scope-pill").forEach((p) => {
    p.classList.remove("active");
    if (p.dataset.scope === "all") p.classList.add("active");
  });

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) sortSelect.value = "newest";

  fetchBooks();
}

// ---------- Chế độ xem Lưới / Danh sách ----------
function setViewMode(mode) {
  searchState.viewMode = mode;
  const gridBtn = document.getElementById("btn-grid");
  const listBtn = document.getElementById("btn-list");
  const gridContainer = document.getElementById("books-results-grid");

  if (gridBtn && listBtn) {
    if (mode === "grid") {
      gridBtn.classList.add("active");
      listBtn.classList.remove("active");
      if (gridContainer) gridContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
    } else {
      listBtn.classList.add("active");
      gridBtn.classList.remove("active");
      if (gridContainer) gridContainer.style.gridTemplateColumns = "1fr";
    }
  }
}

// ---------- Sắp xếp ----------
function handleSortChange(sortType) {
  if (sortType === "title") {
    searchState.sortBy = "title";
    searchState.sortOrder = "asc";
  } else {
    searchState.sortBy = "created_at";
    searchState.sortOrder = "desc";
  }
  searchState.currentPage = 1;
  fetchBooks();
}

// ---------- Phân trang ----------
function goToPage(page) {
  const max = searchState.totalPages;
  if (page === "prev") {
    if (searchState.currentPage > 1) searchState.currentPage--;
    else return;
  } else if (page === "next") {
    if (searchState.currentPage < max) searchState.currentPage++;
    else return;
  } else {
    searchState.currentPage = page;
  }
  fetchBooks();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Toast ----------
function getToastIconSvg(type) {
  if (type === "warning") {
    return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  }
  if (type === "info") {
    return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  }
  return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
}

function dismissSearchToast(toastEl) {
  if (!toastEl || toastEl.dataset.closing === "1") return;
  toastEl.dataset.closing = "1";
  toastEl.classList.remove("is-visible");
  toastEl.classList.add("is-hiding");
  window.setTimeout(() => {
    if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
  }, 240);
}

function showSearchToast({
  type = "success",
  title = "",
  message = "",
  chips = [],
  actionText = "",
  actionHref = "",
  duration = 6500
}) {
  const stack = document.getElementById("search-toast-stack");
  if (!stack) return;

  const existing = stack.querySelectorAll(".search-toast:not(.is-hiding)");
  if (existing.length >= 3) dismissSearchToast(existing[0]);

  const toast = document.createElement("div");
  toast.className = `search-toast search-toast--${type}`;
  toast.setAttribute("role", "status");

  const chipsHtml = Array.isArray(chips) && chips.length > 0
    ? `<div class="search-toast-meta">${chips.map((c) => `<span class="search-toast-chip">${escapeHtml(c)}</span>`).join("")}</div>`
    : "";
  const actionHtml = actionText && actionHref
    ? `<div class="search-toast-actions"><a href="${escapeHtml(actionHref)}" class="search-toast-link">${escapeHtml(actionText)} <span aria-hidden="true">→</span></a></div>`
    : "";

  toast.innerHTML = `
    <div class="search-toast-icon">${getToastIconSvg(type)}</div>
    <div class="search-toast-content">
      <div class="search-toast-title">${escapeHtml(title)}</div>
      <p class="search-toast-desc">${escapeHtml(message)}</p>
      ${chipsHtml}
      ${actionHtml}
    </div>
    <button type="button" class="search-toast-close" aria-label="Đóng thông báo">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
    <div class="search-toast-progress" style="animation-duration: ${duration}ms"></div>
  `;

  const closeBtn = toast.querySelector(".search-toast-close");
  if (closeBtn) closeBtn.addEventListener("click", () => dismissSearchToast(toast));

  let remaining = duration;
  let startedAt = Date.now();
  let timerId = window.setTimeout(() => dismissSearchToast(toast), remaining);

  toast.addEventListener("mouseenter", () => {
    window.clearTimeout(timerId);
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
  });
  toast.addEventListener("mouseleave", () => {
    if (toast.dataset.closing === "1") return;
    startedAt = Date.now();
    timerId = window.setTimeout(() => dismissSearchToast(toast), remaining);
  });

  stack.appendChild(toast);
  window.requestAnimationFrame(() => toast.classList.add("is-visible"));
}

// ---------- Modal mượn sách ----------
function closeBorrowModal() {
  const modal = document.getElementById("borrow-confirm-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  pendingBorrowBook = null;
  if (lastModalTriggerEl && document.contains(lastModalTriggerEl)) {
    lastModalTriggerEl.focus();
  }
  lastModalTriggerEl = null;
}

function handleBorrowOnline(isbn) {
  if (!isSearchUserLoggedIn()) {
    openAuthGuardModal();
    return;
  }

  const book = currentDisplayedBooks.find((b) => (b.isbn || "") === isbn);
  if (!book) return;

  const availCopies = typeof book.available_copies === "number" ? book.available_copies : (book.copies || 0);
  if (availCopies <= 0) {
    showSearchToast({
      type: "warning",
      title: "Ấn bản tạm hết bản sao",
      message: `Cuốn "${book.title}" hiện không còn bản sao trên kệ. Bạn có thể bấm "Đặt trước" để giữ chỗ.`,
      chips: [book.shelf_location || book.shelfLocation || ""]
    });
    return;
  }

  const modal = document.getElementById("borrow-confirm-modal");
  if (!modal) return;

  pendingBorrowBook = book;
  lastModalTriggerEl = document.activeElement;

  const today = new Date();
  const dueDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const authorName = Array.isArray(book.authors) && book.authors.length > 0
    ? book.authors[0].name
    : (book.author || "");
  const totalCopies = typeof book.total_copies === "number" ? book.total_copies : (book.totalCopies || 0);
  const statusText = `${availCopies}/${totalCopies} CÓ SẴN`;

  const coverUrl = formatCoverUrl(book.cover_image || book.coverOnline);
  const fallbackSvg = createSvgCover(book.title, book.coverColor || "#1E293B");

  const coverEl = document.getElementById("borrow-modal-cover");
  if (coverEl) {
    coverEl.onerror = () => { coverEl.onerror = null; coverEl.src = fallbackSvg; };
    coverEl.src = coverUrl || fallbackSvg;
    coverEl.alt = book.title;
  }

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText("borrow-modal-status", statusText);
  setText("borrow-modal-book-title", book.title);
  setText("borrow-modal-author", `Tác giả: ${authorName}`);
  setText("borrow-modal-isbn", `ISBN: ${book.isbn || ""}`);
  setText("borrow-modal-location", book.shelf_location || book.shelfLocation || "");
  setText("borrow-modal-shelf-tag", book.shelf_location || book.shelfLocation || "");
  setText("borrow-modal-date", formatDateVN(today));
  setText("borrow-modal-due-date", formatDateVN(dueDate));

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const confirmBtn = document.getElementById("btn-confirm-borrow");
  if (confirmBtn) window.setTimeout(() => confirmBtn.focus(), 40);
}

async function confirmBorrowOnline() {
  if (!pendingBorrowBook) return;
  const book = pendingBorrowBook;

  try {
    // Gọi API mượn sách
    const isbn = book.isbn || "";
    await api.post("/loans/online", { book_isbns: [isbn] });

    const today = new Date();
    const dueDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const slipCode = generateLoanSlipCode();

    closeBorrowModal();
    fetchBooks(); // Làm mới kết quả

    showSearchToast({
      type: "success",
      title: "Xác nhận mượn sách thành công",
      message: `Đã tạo phiếu mượn cho cuốn "${book.title}". Vui lòng xuất trình thẻ sinh viên tại quầy thủ thư trong 48 giờ.`,
      chips: [slipCode, book.shelf_location || "", `Hạn trả: ${formatDateVN(dueDate)}`],
      actionText: "Xem phiếu mượn",
      actionHref: "loan_slip.html",
      duration: 7500
    });
  } catch (err) {
    closeBorrowModal();
    showSearchToast({
      type: "warning",
      title: "Không thể hoàn tất yêu cầu",
      message: err?.data?.detail || "Có lỗi xảy ra khi mượn sách. Vui lòng thử lại hoặc liên hệ thủ thư."
    });
  }
}

async function handleReserveBook(isbn) {
  if (!isSearchUserLoggedIn()) {
    openAuthGuardModal();
    return;
  }

  const book = currentDisplayedBooks.find((b) => (b.isbn || "") === isbn);
  const bookTitle = book ? `"${book.title}"` : "ấn bản";

  try {
    const res = await api.post("/reservations", { book_isbn: isbn });
    const queuePos = res?.queue_position ? `Vị trí hàng chờ: #${res.queue_position}` : "";
    showSearchToast({
      type: "success",
      title: "Đã đặt trước thành công",
      message: `Cuốn ${bookTitle} đã được lưu vào danh sách đặt trước của bạn. Khi có bản sao trả về, hệ thống sẽ giữ sách 2 ngày tại quầy.`,
      chips: [queuePos, book ? (book.shelf_location || book.shelfLocation || "") : "", isbn ? `ISBN: ${isbn}` : ""].filter(Boolean),
      actionText: "Xem sách đặt trước",
      actionHref: "reservations.html",
      duration: 7000
    });
  } catch (err) {
    showSearchToast({
      type: "warning",
      title: "Không thể đặt trước ấn bản",
      message: err?.message || err?.data?.detail || "Đã có lỗi xảy ra khi gửi yêu cầu đặt trước.",
      duration: 6000
    });
  }
}

function toggleBookmark(isbn, buttonEl) {
  if (!isSearchUserLoggedIn()) {
    openAuthGuardModal();
    return;
  }

  const book = currentDisplayedBooks.find((b) => (b.isbn || "") === isbn);
  const bookLabel = book ? `"${book.title}"` : "ấn bản";

  if (savedBookmarks.has(isbn)) {
    savedBookmarks.delete(isbn);
    buttonEl.classList.remove("bookmarked");
    buttonEl.title = "Lưu vào danh sách đọc";
    const svg = buttonEl.querySelector("svg");
    if (svg) svg.setAttribute("fill", "none");
    showSearchToast({ type: "info", title: "Đã bỏ lưu ấn bản", message: `Đã xóa ${bookLabel} khỏi danh sách đọc của bạn.`, duration: 2800 });
  } else {
    savedBookmarks.add(isbn);
    buttonEl.classList.add("bookmarked");
    buttonEl.title = "Bỏ lưu khỏi danh sách";
    const svg = buttonEl.querySelector("svg");
    if (svg) svg.setAttribute("fill", "currentColor");
    showSearchToast({ type: "info", title: "Đã lưu vào danh sách đọc", message: `Bạn có thể xem lại ${bookLabel} bất cứ lúc nào.`, duration: 2800 });
  }
}

// ---------- Barcode Modal ----------
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
  if (searchInput) searchInput.value = "978-604-0123-45";
  const isbnPill = document.querySelector('.scope-pill[data-scope="isbn"]');
  if (isbnPill) {
    selectScope("isbn", isbnPill);
  } else {
    applyFilters();
  }
  showSearchToast({
    type: "success",
    title: "Quét mã vạch thành công",
    message: "Đã nhận diện ấn bản tương ứng trong danh mục lưu thông.",
    chips: ["ISBN: 978-604-0123-45"],
    duration: 4500
  });
}

// ---------- Khởi tạo modal bindings ----------
function initBorrowModalBindings() {
  if (searchUiBound) return;
  searchUiBound = true;

  const borrowBackdrop = document.getElementById("borrow-confirm-modal");
  const closeBtn = document.getElementById("btn-close-borrow-modal");
  const cancelBtn = document.getElementById("btn-cancel-borrow");
  const confirmBtn = document.getElementById("btn-confirm-borrow");

  if (borrowBackdrop) {
    borrowBackdrop.addEventListener("click", (e) => {
      if (e.target === borrowBackdrop) closeBorrowModal();
    });
  }
  if (closeBtn) closeBtn.addEventListener("click", closeBorrowModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeBorrowModal);
  if (confirmBtn) confirmBtn.addEventListener("click", confirmBorrowOnline);

  const authGuardOverlay = document.getElementById("authGuardOverlay");
  if (authGuardOverlay) {
    authGuardOverlay.addEventListener("click", (e) => {
      if (e.target === authGuardOverlay) closeAuthGuardModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (authGuardOverlay && authGuardOverlay.style.display === "flex") {
      closeAuthGuardModal();
      return;
    }
    if (borrowBackdrop && borrowBackdrop.classList.contains("is-open")) {
      closeBorrowModal();
      return;
    }
    const barcodeModal = document.getElementById("barcode-modal");
    if (barcodeModal && barcodeModal.style.display === "flex") closeBarcodeModal();
  });
}

// ---------- Khởi chạy trang ----------
let searchPageInitialized = false;

function initSearchPage() {
  if (searchPageInitialized) return;
  searchPageInitialized = true;

  initBorrowModalBindings();

  // Đặt URL param keyword nếu có (từ trang khác chuyển sang)
  const urlParams = new URLSearchParams(window.location.search);
  const urlKeyword = urlParams.get("q") || urlParams.get("keyword") || "";
  if (urlKeyword) {
    const input = document.getElementById("search-input");
    if (input) input.value = urlKeyword;
    searchState.keyword = urlKeyword;
  }

  const cache = readSearchCache();
  let facetsSig = "";
  if (cache?.facets) {
    try {
      facetsSig = JSON.stringify(cache.facets);
      renderFacetCategories(cache.facets.categories || []);
      renderFacetShelves(cache.facets.shelves || []);
      renderFacetLanguages(cache.facets.languages || []);
    } catch {
      facetsSig = "";
    }
  }

  let booksSig = "";
  if (!urlKeyword && cache?.books && Array.isArray(cache.books.items)) {
    const { items, total, totalPages } = cache.books;
    booksSig = getBooksSignature(items, total, totalPages);
    renderSearchResults(items);
    renderPagination(total, totalPages);
  }

  // Load facets & kết quả từ server (nếu đã có cache thì cập nhật âm thầm không nháy spinner)
  loadFacets(facetsSig);
  fetchBooks(booksSig ? { silent: true, prevSignature: booksSig } : {});
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSearchPage);
} else {
  initSearchPage();
}
