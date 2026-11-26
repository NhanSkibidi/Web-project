// ==========================================================
// KS25 Library - Logic Trang Chủ Thư Viện (Đọc dữ liệu thực từ Database API)
// ==========================================================

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #1e3a8a, #0f172a)",
  "linear-gradient(135deg, #0284c7, #0369a1)",
  "linear-gradient(135deg, #334155, #1e293b)",
  "linear-gradient(135deg, #b45309, #78350f)",
  "linear-gradient(135deg, #0f766e, #115e59)",
  "linear-gradient(135deg, #1b4332, #2d6a4f)",
  "linear-gradient(135deg, #4338ca, #312e81)",
  "linear-gradient(135deg, #be123c, #881337)",
];

const homeState = {
  PAGE_SIZE: 4,
  ALL_VIEW_PAGE_SIZE: 48,
  currentPage: 1,
  totalPages: 1,
  totalBooks: 0,
  totalCatalogBooks: 0,
  isAllBooksView: false,
  isCategoriesExpanded: false,
  keyword: "",
  selectedCategoryId: "",
  selectedCategoryName: "",
  categories: [],
  booksByIsbn: new Map(),
};

function safeEscape(str) {
  if (typeof escapeHtml === "function") {
    return escapeHtml(String(str ?? ""));
  }
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNumber(val) {
  return Number(val || 0).toLocaleString("vi-VN");
}

function formatCoverUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const baseOrigin =
    typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL
      ? CONFIG.API_BASE_URL.replace(/\/api\/?$/, "")
      : "";
  return `${baseOrigin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function getCoverGradient(seed) {
  const s = String(seed || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
}

function getBookDetailUrl(isbn) {
  return `book_detail.html?isbn=${encodeURIComponent(isbn || "")}`;
}

function getHomeSession() {
  let user = null;
  let token = null;
  if (typeof auth !== "undefined") {
    token = typeof auth.getToken === "function" ? auth.getToken() : null;
    user = typeof auth.getUser === "function" ? auth.getUser() : null;
  } else {
    token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("access_token") ||
      null;
    try {
      const raw = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
      if (raw) user = JSON.parse(raw);
    } catch {
      user = null;
    }
  }
  return { user, token, isLoggedIn: Boolean(token && user) };
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

function handleDetailLinkClick(event, el) {
  if (!getHomeSession().isLoggedIn) {
    if (event) event.preventDefault();
    const targetUrl = el && el.getAttribute ? el.getAttribute("href") : "";
    openAuthGuardModal(targetUrl);
    return false;
  }
  return true;
}

function isStaffUser() {
  if (typeof auth === "undefined") return false;
  const token = auth.getToken ? auth.getToken() : null;
  const user = auth.getUser ? auth.getUser() : null;
  if (!token || !user || !user.role) return false;
  const role = String(user.role).trim().toUpperCase();
  return role === "ADMIN" || role === "LIBRARIAN";
}

function notifyUser(message, type = "info") {
  if (typeof showToast === "function") {
    showToast(message, type);
    return;
  }
  if (typeof Utils !== "undefined") {
    if (typeof Utils.showToast === "function") {
      Utils.showToast(message, type);
      return;
    }
    if (typeof Utils.showNotification === "function") {
      Utils.showNotification(message, type);
      return;
    }
  }
  alert(message);
}

function getCategoryIcon(name) {
  const n = String(name || "").toLowerCase();
  const icon = (symbol) => `<span class="material-symbols-outlined" style="font-size: 26px;">${symbol}</span>`;
  if (n.includes("công nghệ") || n.includes("cntt") || n.includes("tin") || n.includes("phần mềm")) {
    return icon("computer");
  }
  if (n.includes("toán") || n.includes("thống kê")) {
    return icon("calculate");
  }
  if (n.includes("kinh tế") || n.includes("tài chính") || n.includes("quản trị")) {
    return icon("trending_up");
  }
  if (n.includes("mạng") || n.includes("hệ thống") || n.includes("cơ sở dữ liệu")) {
    return icon("dns");
  }
  if (n.includes("ngoại ngữ") || n.includes("tiếng") || n.includes("anh")) {
    return icon("translate");
  }
  if (n.includes("kỹ năng") || n.includes("tâm lý")) {
    return icon("psychology");
  }
  if (n.includes("lịch sử") || n.includes("luật") || n.includes("triết")) {
    return icon("account_balance");
  }
  if (n.includes("khoa học") || n.includes("vật lý") || n.includes("hóa")) {
    return icon("science");
  }
  if (n.includes("giáo dục")) {
    return icon("school");
  }
  return icon("menu_book");
}

const HOME_CACHE_KEY = "unilib_home_cache_v1";

function readHomeCache() {
  try {
    const raw = sessionStorage.getItem(HOME_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeHomeCache(patch) {
  try {
    const prev = readHomeCache() || {};
    sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    // ignore
  }
}

function applyCategoriesData(items, total) {
  const grid = document.getElementById("category-grid");
  const select = document.getElementById("search-category");
  const statCatsEl = document.getElementById("stat-categories-count");

  homeState.categories = items;

  if (statCatsEl) {
    statCatsEl.textContent = formatNumber(total);
  }

  if (select) {
    select.innerHTML =
      `<option value="">Tất cả ngành học</option>` +
      items
        .map(
          (cat) =>
            `<option value="${Number(cat.id)}">${safeEscape(cat.name)}</option>`
        )
        .join("");
    if (homeState.selectedCategoryId) {
      select.value = String(homeState.selectedCategoryId);
    }
  }

  if (grid) {
    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--color-muted);">
          Chưa có chuyên ngành đào tạo nào trong cơ sở dữ liệu.
        </div>
      `;
    } else {
      grid.innerHTML = items
        .map((cat, idx) => {
          const extraClass = idx >= 5 ? " category-card-extra" : "";
          const booksCount = Number(cat.books_count || 0);
          return `
            <div class="category-card${extraClass}" data-category-id="${Number(cat.id)}" onclick="handleCategoryFilter(this.dataset.categoryId)">
              <div class="category-icon">${getCategoryIcon(cat.name)}</div>
              <div class="category-name">${safeEscape(cat.name)}</div>
              <div class="category-count">${formatNumber(booksCount)} sách</div>
            </div>
          `;
        })
        .join("");
    }
  }

  syncCategoryToggleUI();
}

// ==============================================================================
// 1. TẢI DỮ LIỆU CHUYÊN NGÀNH TỪ DATABASE
// ==============================================================================
async function loadCategories(options = {}) {
  const { prevSignature = "" } = options;
  const grid = document.getElementById("category-grid");
  const statCatsEl = document.getElementById("stat-categories-count");

  try {
    const res = await api.get("/categories", { page: 1, page_size: 100 });
    const items = Array.isArray(res?.items) ? res.items : [];
    const total = Number(res?.total ?? items.length);
    const sig = JSON.stringify({ items, total });
    writeHomeCache({ categories: { items, total } });

    if (!prevSignature || sig !== prevSignature) {
      applyCategoriesData(items, total);
    }
  } catch (err) {
    console.error("Không thể tải danh mục chuyên ngành:", err);
    if (!prevSignature) {
      if (statCatsEl) statCatsEl.textContent = "0";
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 28px; color: var(--color-muted);">
            Không thể tải danh mục chuyên ngành từ máy chủ.
          </div>
        `;
      }
      syncCategoryToggleUI();
    }
  }
}

function syncCategoryToggleUI() {
  const total = homeState.categories.length;
  const extraCount = Math.max(0, total - 5);
  const grid = document.getElementById("category-grid");
  const toggleContainer = document.getElementById("category-toggle-container");
  const headerToggleBtn = document.getElementById("toggle-category-btn");
  const headerText = document.getElementById("header-cat-text");
  const headerArrow = document.getElementById("header-cat-arrow");
  const bottomText = document.getElementById("toggle-cat-text");
  const bottomArrow = document.getElementById("toggle-cat-arrow");
  const extras = document.querySelectorAll(".category-card-extra");

  if (grid) {
    grid.classList.toggle("expanded", homeState.isCategoriesExpanded);
  }
  extras.forEach((el) => {
    el.style.display = homeState.isCategoriesExpanded ? "flex" : "none";
  });

  if (extraCount === 0) {
    if (toggleContainer) toggleContainer.style.display = "none";
    if (headerToggleBtn) headerToggleBtn.style.display = total === 0 ? "none" : "inline-flex";
    if (headerText) headerText.textContent = `Tất cả danh mục (${formatNumber(total)} ngành)`;
    if (headerArrow) {
      headerArrow.textContent = "";
      headerArrow.style.display = "none";
    }
    return;
  }

  if (toggleContainer) toggleContainer.style.display = "flex";
  if (headerToggleBtn) headerToggleBtn.style.display = "inline-flex";
  if (headerText) {
    headerText.textContent = homeState.isCategoriesExpanded
      ? "Thu gọn danh mục"
      : `Xem tất cả danh mục (${formatNumber(total)} ngành)`;
  }
  if (headerArrow) {
    headerArrow.style.display = "inline-flex";
    headerArrow.textContent = homeState.isCategoriesExpanded ? "expand_less" : "chevron_right";
  }
  if (bottomText) {
    bottomText.textContent = homeState.isCategoriesExpanded
      ? "Thu gọn danh mục"
      : `Xem thêm ${formatNumber(extraCount)} ngành học khác`;
  }
  if (bottomArrow) {
    bottomArrow.textContent = homeState.isCategoriesExpanded ? "expand_less" : "expand_more";
  }
}

function applyBooksData(items, total, totalPages) {
  homeState.totalBooks = total;
  homeState.totalPages = totalPages;
  if (homeState.currentPage > totalPages) {
    homeState.currentPage = totalPages;
  }
  if (!homeState.keyword && !homeState.selectedCategoryId) {
    homeState.totalCatalogBooks = total;
  }

  items.forEach((book) => {
    if (book && book.isbn) {
      homeState.booksByIsbn.set(String(book.isbn), book);
    }
  });

  updateFilterBannerAndTitle();
  renderBooksView(items);
}

// ==============================================================================
// 2. TẢI DANH SÁCH SÁCH & PHÂN TRANG TỪ DATABASE (/api/books/search)
// ==============================================================================
async function fetchBooksPage(options = {}) {
  const { silent = false, prevSignature = "" } = options;
  const grid = document.getElementById("new-books-grid");
  if (!silent && grid && grid.querySelector(".book-card")) {
    grid.style.opacity = "0.6";
  }

  const pageSize = homeState.isAllBooksView ? homeState.ALL_VIEW_PAGE_SIZE : homeState.PAGE_SIZE;
  const params = {
    page: homeState.currentPage,
    page_size: pageSize,
    sort_by: "created_at",
    sort_order: "desc",
  };
  if (homeState.keyword) params.keyword = homeState.keyword;
  if (homeState.selectedCategoryId) params.category_id = Number(homeState.selectedCategoryId);

  try {
    const res = await api.get("/books/search", params);
    const items = Array.isArray(res?.items) ? res.items : [];
    const total = Number(res?.total ?? items.length);
    const totalPages = Math.max(1, Number(res?.total_pages ?? (Math.ceil(total / pageSize) || 1)));
    const sig = JSON.stringify({ items, total, totalPages });

    if (!homeState.keyword && !homeState.selectedCategoryId && homeState.currentPage === 1 && !homeState.isAllBooksView) {
      writeHomeCache({ defaultBooks: { items, total, totalPages } });
    }

    if (!prevSignature || sig !== prevSignature) {
      applyBooksData(items, total, totalPages);
    }
  } catch (err) {
    console.error("Không thể tải danh sách sách:", err);
    if (!prevSignature && grid) {
      grid.style.opacity = "1";
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #fff; border: 1px dashed var(--color-border); border-radius: var(--radius-lg);">
          <span class="material-symbols-outlined" style="font-size: 40px; color: #D97706; display: block; margin-bottom: 12px;">warning</span>
          <h3 style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 6px;">Không thể tải dữ liệu sách từ máy chủ</h3>
          <p style="font-size: 13.5px; color: var(--color-muted); max-width: 480px; margin: 0 auto 16px;">
            Vui lòng kiểm tra kết nối tới hệ thống backend thư viện rồi thử lại.
          </p>
          <button onclick="fetchBooksPage()" class="btn-borrow" style="padding: 8px 18px; font-size: 13px;">
            Thử tải lại
          </button>
        </div>
      `;
    }
  }
}

function updateFilterBannerAndTitle() {
  const banner = document.getElementById("search-status-banner");
  const bannerText = document.getElementById("search-status-text");
  const titleEl = document.getElementById("books-section-title");
  const hasFilter = Boolean(homeState.keyword || homeState.selectedCategoryId);

  if (!hasFilter) {
    if (banner) banner.style.display = "none";
    if (titleEl) titleEl.textContent = "Tài liệu mới nhập học kỳ này";
    return;
  }

  if (banner && bannerText) {
    banner.style.display = "flex";
    const queryDesc = [];
    if (homeState.keyword) {
      queryDesc.push(`từ khóa "<strong>${safeEscape(homeState.keyword)}</strong>"`);
    }
    if (homeState.selectedCategoryName) {
      queryDesc.push(`ngành "<strong>${safeEscape(homeState.selectedCategoryName)}</strong>"`);
    }
    bannerText.innerHTML = `Kết quả tra cứu cho ${queryDesc.join(" & ")}: Tìm thấy <strong>${formatNumber(homeState.totalBooks)}</strong> tài liệu phù hợp.`;
  }

  if (titleEl) {
    if (homeState.keyword) {
      titleEl.textContent = `Kết quả tra cứu (${formatNumber(homeState.totalBooks)})`;
    } else if (homeState.selectedCategoryName) {
      titleEl.textContent = `Sách chuyên ngành: ${homeState.selectedCategoryName}`;
    }
  }
}

function renderPaginationControls() {
  const indicator = document.getElementById("carousel-page-indicator");
  const viewAllBtn = document.getElementById("btn-view-all-books");
  const pageNumbersContainer = document.getElementById("page-numbers-container");
  const prevBtn = document.getElementById("btn-prev-page");
  const nextBtn = document.getElementById("btn-next-page");

  const { currentPage, totalPages, totalBooks, isAllBooksView } = homeState;

  if (indicator) {
    indicator.textContent =
      isAllBooksView && totalPages <= 1
        ? `Tất cả (${formatNumber(totalBooks)} cuốn)`
        : `${currentPage} / ${totalPages}`;
  }

  if (viewAllBtn) {
    const countForBtn = totalBooks || homeState.totalCatalogBooks;
    viewAllBtn.textContent = isAllBooksView
      ? "Thu gọn (4 cuốn/trang)"
      : `Xem tất cả (${formatNumber(countForBtn)} cuốn)`;
  }

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

  if (!pageNumbersContainer) return;

  if (totalPages <= 1) {
    pageNumbersContainer.innerHTML = `<button class="page-number-btn active" type="button">1</button>`;
    return;
  }

  const pagesToShow = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
  } else {
    pagesToShow.push(1);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pagesToShow.push("...");
    for (let i = start; i <= end; i++) pagesToShow.push(i);
    if (end < totalPages - 1) pagesToShow.push("...");
    pagesToShow.push(totalPages);
  }

  pageNumbersContainer.innerHTML = pagesToShow
    .map((p) => {
      if (p === "...") {
        return `<span style="padding: 0 6px; color: var(--color-muted); font-weight: 600;">…</span>`;
      }
      return `<button type="button" class="page-number-btn ${p === currentPage ? "active" : ""}" onclick="goToCarouselPage(${p})">${p}</button>`;
    })
    .join("");
}

function renderBooksView(pageBooks) {
  renderPaginationControls();

  const grid = document.getElementById("new-books-grid");
  if (!grid) return;

  if (!Array.isArray(pageBooks) || pageBooks.length === 0) {
    const hasFilter = Boolean(homeState.keyword || homeState.selectedCategoryId);
    grid.style.opacity = "1";
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #fff; border: 1px dashed var(--color-border); border-radius: var(--radius-lg);">
        <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-muted); display: block; margin-bottom: 12px;">library_books</span>
        <h3 style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 6px;">
          ${hasFilter ? "Không tìm thấy tài liệu phù hợp" : "Chưa có tài liệu nào trong cơ sở dữ liệu"}
        </h3>
        <p style="font-size: 13.5px; color: var(--color-muted); max-width: 480px; margin: 0 auto 16px;">
          ${
            hasFilter
              ? "Không có sách nào khớp với từ khóa hoặc chuyên ngành bạn chọn. Vui lòng thử điều kiện khác hoặc xem tất cả tài liệu."
              : "Kho sách hiện chưa có đầu sách nào được nhập lên hệ thống."
          }
        </p>
        ${
          hasFilter
            ? `<button onclick="clearSearchFilter()" class="btn-borrow" style="padding: 8px 18px; font-size: 13px;">Xem lại tất cả tài liệu</button>`
            : ""
        }
      </div>
    `;
    return;
  }

  grid.innerHTML = pageBooks
    .map((book) => {
      const isbn = String(book.isbn || "");
      const safeIsbn = safeEscape(isbn);
      const detailUrl = getBookDetailUrl(isbn);
      const title = safeEscape(book.title || "Tài liệu thư viện");
      const authorsText =
        Array.isArray(book.authors) && book.authors.length > 0
          ? book.authors.map((a) => a.name).filter(Boolean).join(", ")
          : "Chưa rõ tác giả";
      const safeAuthor = safeEscape(authorsText);
      const categoryName = book.category?.name || "Tổng hợp";
      const safeCat = safeEscape(categoryName);
      const shelfText = book.shelf_location ? `Kệ: ${book.shelf_location}` : `ISBN: ${isbn}`;
      const safeShelf = safeEscape(shelfText);
      const available = Number(book.available_copies || 0);
      const totalCopies = Number(book.total_copies || 0);
      const coverUrl = formatCoverUrl(book.cover_image);
      const gradient = getCoverGradient(isbn || book.title);

      const statusText =
        available > 0
          ? `● Còn ${formatNumber(available)}${totalCopies > 0 ? `/${formatNumber(totalCopies)}` : ""} cuốn`
          : "● Đang hết";

      return `
        <div class="book-card">
          <a href="${detailUrl}" style="display:block;text-decoration:none;" onclick="return handleDetailLinkClick(event, this)">
            <div class="book-cover" style="background: ${gradient}; cursor: pointer;">
              <span class="shelf-badge">${safeShelf}</span>
              ${
                coverUrl
                  ? `<img class="book-cover-img" src="${safeEscape(coverUrl)}" alt="${title}" loading="lazy" onerror="this.style.display='none'; var fb=this.nextElementSibling; if(fb) fb.style.display='flex';" />`
                  : ""
              }
              <div class="book-cover-content" style="${coverUrl ? "display:none;" : ""}">
                <div class="book-cover-tag">${safeCat.toUpperCase()}</div>
                <div class="book-cover-title">${title}</div>
                <div class="book-cover-author">${safeAuthor}</div>
              </div>
            </div>
          </a>
          <div class="book-meta">
            <span class="badge-cat">${safeCat}</span>
            <span class="badge-status ${available > 0 ? "status-available" : "status-out"}">${statusText}</span>
          </div>
          <h3 class="book-title" title="${title}">
            <a href="${detailUrl}" style="color:inherit;text-decoration:none;" onclick="return handleDetailLinkClick(event, this)">${title}</a>
          </h3>
          <div class="book-author" title="${safeAuthor}">${safeAuthor}</div>
          <div class="book-actions">
            <a href="${detailUrl}" class="btn-detail" onclick="return handleDetailLinkClick(event, this)">Chi tiết</a>
            ${
              available > 0
                ? `<button type="button" class="btn-borrow" data-isbn="${safeIsbn}" onclick="borrowBook(this.dataset.isbn)"><span class="material-symbols-outlined" style="font-size: 17px;">shopping_bag</span><span>Mượn</span></button>`
                : totalCopies > 0
                  ? `<button type="button" class="btn-borrow" data-isbn="${safeIsbn}" onclick="reserveBookFromHome(this.dataset.isbn)" style="background:#D97706;"><span class="material-symbols-outlined" style="font-size: 17px;">hourglass_top</span><span>Đặt trước</span></button>`
                  : `<button type="button" class="btn-borrow" disabled>Chưa có bản sao</button>`
            }
          </div>
        </div>
      `;
    })
    .join("");

  requestAnimationFrame(() => {
    grid.style.opacity = "1";
  });
}

// ==============================================================================
// 3. TẢI THỐNG KÊ HERO & SÁCH MƯỢN NHIỀU TỪ DATABASE
// ==============================================================================
async function loadHeroStatsAndTrending(options = {}) {
  const { prevSignature = "" } = options;
  const staff = isStaffUser();
  let statsLoadedFromDashboard = false;
  let heroStatsPayload = null;
  let trendingItems = [];
  let trendingMode = "weekly";

  if (staff) {
    const [dashRes, topWeekRes] = await Promise.allSettled([
      api.get("/statistics/dashboard", { period: "month" }),
      api.get("/statistics/top-books", { period: "week", limit: 4 }),
    ]);

    if (dashRes.status === "fulfilled" && dashRes.value?.summary) {
      const s = dashRes.value.summary;
      heroStatsPayload = {
        totalBooks: s.total_books,
        totalCopies: s.total_copies,
        thirdIcon: "groups",
        thirdCount: s.active_readers,
        thirdLabel: "Độc giả đang hoạt động",
      };
      statsLoadedFromDashboard = true;

      if (
        (!topWeekRes ||
          topWeekRes.status !== "fulfilled" ||
          !Array.isArray(topWeekRes.value) ||
          topWeekRes.value.length === 0) &&
        Array.isArray(dashRes.value.top_borrowed_books) &&
        dashRes.value.top_borrowed_books.length > 0
      ) {
        trendingItems = dashRes.value.top_borrowed_books.slice(0, 4);
        trendingMode = "monthly";
      }
    }

    if (
      topWeekRes.status === "fulfilled" &&
      Array.isArray(topWeekRes.value) &&
      topWeekRes.value.length > 0
    ) {
      trendingItems = topWeekRes.value.slice(0, 4);
      trendingMode = "weekly";
    }
  }

  // Fallback công khai từ /books/search cho Độc giả/Khách hoặc khi chưa có giao dịch mượn
  if (!statsLoadedFromDashboard || trendingItems.length === 0) {
    try {
      const publicRes = await api.get("/books/search", {
        page: 1,
        page_size: 100,
        sort_by: "created_at",
        sort_order: "desc",
      });
      const allItems = Array.isArray(publicRes?.items) ? publicRes.items : [];
      allItems.forEach((b) => {
        if (b && b.isbn && !homeState.booksByIsbn.has(String(b.isbn))) {
          homeState.booksByIsbn.set(String(b.isbn), b);
        }
      });

      if (!statsLoadedFromDashboard) {
        const totalBooks = Number(publicRes?.total ?? allItems.length);
        const totalCopies = allItems.reduce((sum, b) => sum + Number(b.total_copies || 0), 0);
        const availableCopies = allItems.reduce((sum, b) => sum + Number(b.available_copies || 0), 0);
        const suffix = totalBooks > 100 ? "+" : "";

        heroStatsPayload = {
          totalBooks,
          totalCopiesText: `${formatNumber(totalCopies)}${suffix}`,
          thirdIcon: "library_books",
          thirdCountText: `${formatNumber(availableCopies)}${suffix}`,
          thirdLabel: "Bản sẵn sàng mượn",
        };
      }

      if (trendingItems.length === 0 && allItems.length > 0) {
        trendingItems = [...allItems]
          .sort((a, b) => Number(b.borrowed_copies || 0) - Number(a.borrowed_copies || 0))
          .slice(0, 4)
          .map((b, idx) => ({
            rank: idx + 1,
            isbn: b.isbn,
            title: b.title,
            category_name: b.category?.name || "Tổng hợp",
            borrow_count: Number(b.borrowed_copies || 0),
            available_copies: Number(b.available_copies || 0),
            total_copies: Number(b.total_copies || 0),
            _authors: Array.isArray(b.authors) ? b.authors.map((a) => a.name).join(", ") : "",
            _shelf: b.shelf_location || "",
          }));
        trendingMode = "catalog";
      }
    } catch (err) {
      console.error("Không thể tải dữ liệu thống kê công khai:", err);
      if (!statsLoadedFromDashboard && !prevSignature) {
        heroStatsPayload = {
          totalBooks: 0,
          totalCopies: 0,
          thirdIcon: "library_books",
          thirdCount: 0,
          thirdLabel: "Bản sẵn sàng mượn",
        };
      }
    }
  }

  const nextPayload = { heroStatsPayload, trendingItems, trendingMode };
  const sig = JSON.stringify(nextPayload);
  if (heroStatsPayload) {
    writeHomeCache({ statsAndTrending: nextPayload });
  }
  if (!prevSignature || sig !== prevSignature) {
    if (heroStatsPayload) updateHeroNumbers(heroStatsPayload);
    renderTrendingList(trendingItems, trendingMode);
  }
}

function updateHeroNumbers({
  totalBooks = 0,
  totalCopies = 0,
  totalCopiesText = null,
  thirdIcon = "library_books",
  thirdCount = 0,
  thirdCountText = null,
  thirdLabel = "Bản sẵn sàng mượn",
}) {
  const booksEl = document.getElementById("stat-books-count");
  const copiesEl = document.getElementById("stat-copies-count");
  const thirdIconEl = document.getElementById("stat-third-icon");
  const thirdCountEl = document.getElementById("stat-third-count");
  const thirdLabelEl = document.getElementById("stat-third-label");

  const normalizedThirdIcon = thirdIcon === "👥"
    ? "groups"
    : (thirdIcon === "📚" || !thirdIcon ? "library_books" : thirdIcon);

  if (booksEl) booksEl.textContent = formatNumber(totalBooks);
  if (copiesEl) copiesEl.textContent = totalCopiesText ?? formatNumber(totalCopies);
  if (thirdIconEl) thirdIconEl.textContent = normalizedThirdIcon;
  if (thirdCountEl) thirdCountEl.textContent = thirdCountText ?? formatNumber(thirdCount);
  if (thirdLabelEl) thirdLabelEl.textContent = thirdLabel;
}

function renderTrendingList(items, mode) {
  const container = document.getElementById("trending-books-list");
  const labelEl = document.getElementById("trending-updated-label");
  if (!container) return;

  if (labelEl) {
    if (mode === "weekly") labelEl.textContent = "Thống kê tuần này";
    else if (mode === "monthly") labelEl.textContent = "Thống kê trong tháng";
    else labelEl.textContent = "Dữ liệu trực tiếp từ kho";
  }

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px 0; text-align: center; color: var(--color-muted); font-size: 14px;">
        Chưa có dữ liệu sách mượn nhiều trong cơ sở dữ liệu.
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const isbn = String(item.isbn || "");
    if (isbn && !homeState.booksByIsbn.has(isbn)) {
      homeState.booksByIsbn.set(isbn, {
        isbn,
        title: item.title,
        available_copies: Number(item.available_copies || 0),
        total_copies: Number(item.total_copies || 0),
        category: { name: item.category_name || "Tổng hợp" },
        authors: [],
        shelf_location: item._shelf || "",
      });
    }
  });

  container.innerHTML = items
    .map((item, idx) => {
      const isbn = String(item.isbn || "");
      const safeIsbn = safeEscape(isbn);
      const cachedBook = homeState.booksByIsbn.get(isbn);
      const detailUrl = getBookDetailUrl(isbn);
      const title = safeEscape(item.title || "Tài liệu thư viện");
      const rank = item.rank || idx + 1;
      const available = Number(item.available_copies ?? cachedBook?.available_copies ?? 0);
      const totalCopies = Number(item.total_copies ?? cachedBook?.total_copies ?? 0);
      const borrowCount = Number(item.borrow_count || 0);

      const authorStr =
        item._authors ||
        (cachedBook && Array.isArray(cachedBook.authors) && cachedBook.authors.length > 0
          ? cachedBook.authors.map((a) => a.name).join(", ")
          : "");
      const shelfStr = item._shelf || cachedBook?.shelf_location || "";
      const metaParts = [];
      if (item.category_name) metaParts.push(`Ngành ${item.category_name}`);
      if (authorStr) metaParts.push(authorStr);
      if (shelfStr) metaParts.push(`Kệ ${shelfStr}`);
      if (metaParts.length === 0) metaParts.push(`Còn ${formatNumber(available)}/${formatNumber(totalCopies)} bản`);

      const countText =
        mode === "catalog"
          ? borrowCount > 0
            ? `${formatNumber(borrowCount)} đang mượn`
            : `Còn ${formatNumber(available)} bản`
          : `${formatNumber(borrowCount)} lượt`;

      return `
        <div class="trending-item">
          <div class="trending-left">
            <span class="trending-rank">${rank}</span>
            <div class="trending-info">
              <h5><a href="${detailUrl}" onclick="return handleDetailLinkClick(event, this)">${title}</a></h5>
              <p>${safeEscape(metaParts.join(" • "))}</p>
            </div>
          </div>
          <div class="trending-right">
            <span class="trending-count">${countText}</span>
            <button
              type="button"
              class="trending-add-btn"
              data-isbn="${safeIsbn}"
              title="${available > 0 ? "Thêm vào giỏ mượn" : (totalCopies > 0 ? "Đặt trước sách (Xếp hàng)" : "Chưa có bản sao")}"
              ${available <= 0 && totalCopies <= 0 ? "disabled" : ""}
              onclick="${available > 0 ? "quickAdd(this.dataset.isbn)" : "reserveBookFromHome(this.dataset.isbn)"}"><span class="material-symbols-outlined" style="font-size: 18px;">${available > 0 ? "add" : (totalCopies > 0 ? "hourglass_top" : "add")}</span></button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ==============================================================================
// 4. TƯƠNG TÁC NGƯỜI DÙNG (PHÂN TRANG, TÌM KIẾM, LỌC DANH MỤC, GIỎ MƯỢN)
// ==============================================================================
function prevCarousel() {
  homeState.currentPage =
    homeState.currentPage > 1 ? homeState.currentPage - 1 : homeState.totalPages;
  fetchBooksPage().then(scrollToBooks);
}

function nextCarousel() {
  homeState.currentPage =
    homeState.currentPage < homeState.totalPages ? homeState.currentPage + 1 : 1;
  fetchBooksPage().then(scrollToBooks);
}

function goToCarouselPage(pageNum) {
  const target = Math.max(1, Math.min(homeState.totalPages, Number(pageNum) || 1));
  homeState.currentPage = target;
  fetchBooksPage().then(scrollToBooks);
}

function toggleAllBooksView() {
  homeState.isAllBooksView = !homeState.isAllBooksView;
  homeState.currentPage = 1;
  fetchBooksPage();
}

function scrollToBooks() {
  const section = document.getElementById("books-section");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function toggleCategories() {
  homeState.isCategoriesExpanded = !homeState.isCategoriesExpanded;
  syncCategoryToggleUI();
}
window.toggleAllCategories = toggleCategories;

function handleSearch(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("search-input");
  const categorySelect = document.getElementById("search-category");

  const keyword = input ? input.value.trim() : "";
  const selectedVal = categorySelect ? categorySelect.value.trim() : "";

  if (!keyword && !selectedVal) {
    clearSearchFilter();
    return;
  }

  const matchedCat = selectedVal
    ? homeState.categories.find((c) => String(c.id) === selectedVal)
    : null;
  homeState.keyword = keyword;
  homeState.selectedCategoryId = selectedVal;
  homeState.selectedCategoryName = matchedCat
    ? matchedCat.name
    : selectedVal && categorySelect && categorySelect.selectedIndex >= 0
      ? categorySelect.options[categorySelect.selectedIndex].text
      : "";
  homeState.currentPage = 1;

  fetchBooksPage().then(() => {
    const section = document.getElementById("books-section");
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function handleCategoryFilter(categoryIdOrName) {
  const val = String(categoryIdOrName ?? "").trim();
  if (!val || val === "all") {
    clearSearchFilter();
    return;
  }

  const matchedCat =
    homeState.categories.find((c) => String(c.id) === val) ||
    homeState.categories.find((c) => c.name.toLowerCase() === val.toLowerCase());

  if (!matchedCat) {
    homeState.keyword = val;
    homeState.selectedCategoryId = "";
    homeState.selectedCategoryName = "";
  } else {
    homeState.selectedCategoryId = String(matchedCat.id);
    homeState.selectedCategoryName = matchedCat.name;
    homeState.keyword = "";
  }

  const input = document.getElementById("search-input");
  if (input && matchedCat) input.value = "";
  const categorySelect = document.getElementById("search-category");
  if (categorySelect && matchedCat) {
    categorySelect.value = String(matchedCat.id);
  }

  homeState.currentPage = 1;
  fetchBooksPage().then(() => {
    const section = document.getElementById("books-section");
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function clearSearchFilter() {
  homeState.keyword = "";
  homeState.selectedCategoryId = "";
  homeState.selectedCategoryName = "";
  homeState.currentPage = 1;

  const input = document.getElementById("search-input");
  const categorySelect = document.getElementById("search-category");
  if (input) input.value = "";
  if (categorySelect) categorySelect.value = "";

  fetchBooksPage();
}

function addBookToLocalBasket(book) {
  const isbn = String(book?.isbn || "").trim();
  if (!isbn) {
    notifyUser("Không xác định được mã ISBN của sách.", "warning");
    return;
  }

  if (typeof addBookToLibraryBasket === "function") {
    const result = addBookToLibraryBasket({
      isbn,
      title: book.title || "Tài liệu thư viện",
      copy_code: "",
    });
    if (!result.ok && result.reason === "duplicate") {
      notifyUser(`"${book.title}" đã có sẵn trong giỏ mượn của bạn.`, "info");
      return;
    }
    notifyUser(`Đã thêm "${book.title}" vào danh sách mượn!`, "success");
    return;
  }

  const cartKey = "library_basket";
  try {
    const basket = JSON.parse(localStorage.getItem(cartKey) || "[]");
    const safeBasket = Array.isArray(basket) ? basket : [];
    const exists = safeBasket.some((item) => String(item.isbn) === isbn);
    if (exists) {
      notifyUser(`"${book.title}" đã có sẵn trong giỏ mượn của bạn.`, "info");
      return;
    }
    safeBasket.push({
      isbn,
      title: book.title,
      copy_code: "",
      selected: true,
      added_at: new Date().toISOString(),
    });
    localStorage.setItem(cartKey, JSON.stringify(safeBasket));
    if (typeof syncCartBadges === "function") syncCartBadges();
    notifyUser(`Đã thêm "${book.title}" vào danh sách mượn!`, "success");
  } catch (err) {
    console.error("Không thể cập nhật giỏ mượn:", err);
    notifyUser(`Đã ghi nhận "${book.title}" vào danh sách mượn!`, "success");
  }
}

function borrowBook(isbnOrTitle) {
  if (!getHomeSession().isLoggedIn) {
    openAuthGuardModal();
    return;
  }

  const key = String(isbnOrTitle ?? "").trim();
  let book = homeState.booksByIsbn.get(key);
  if (!book) {
    for (const item of homeState.booksByIsbn.values()) {
      if (item.title === key) {
        book = item;
        break;
      }
    }
  }
  const bookTitle = book ? book.title : key || "Tài liệu thư viện";
  const available = book ? Number(book.available_copies || 0) : 1;

  if (book && available <= 0) {
    notifyUser(`Sách "${bookTitle}" hiện đang hết bản sẵn sàng.`, "warning");
    return;
  }

  showConfirm({
    title: "Thêm vào danh sách mượn",
    message: `Bạn muốn thêm cuốn "${bookTitle}" vào danh sách chuẩn bị mượn sách?`,
    type: "green",
    confirmText: "Thêm vào giỏ",
    cancelText: "Đóng",
    onConfirm: () => {
      addBookToLocalBasket(book || { isbn: key, title: bookTitle });
    },
  });
}

function showLibraryRules() {
  const modal = document.getElementById("rules-modal");
  if (!modal) {
    showConfirm({
      title: "Quy chế mượn trả thư viện KS25",
      message:
        "Mượn tối đa 05 cuốn / 14 ngày. Gia hạn online trước hạn trả 2 ngày. Phạt trễ hạn 2.000đ/ngày/cuốn; hỏng sách 50% giá bìa; mất sách 100% giá bìa.",
      type: "green",
      confirmText: "Đã hiểu",
      cancelText: "Đóng",
    });
    return;
  }
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeRulesModal() {
  const modal = document.getElementById("rules-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }
  document.body.style.overflow = "";
}

function quickAdd(isbnOrTitle) {
  borrowBook(isbnOrTitle);
}

function reserveBookFromHome(isbn) {
  if (!getHomeSession().isLoggedIn) {
    openAuthGuardModal();
    return;
  }

  const key = String(isbn ?? "").trim();
  const book = homeState.booksByIsbn.get(key);
  const bookTitle = book ? book.title : key || "Tài liệu thư viện";

  showConfirm({
    title: "Xác nhận đặt trước sách?",
    message: `Cuốn "${bookTitle}" hiện đã hết bản trống trên kệ. Bạn muốn đặt trước để vào hàng chờ ưu tiên (giữ 48 giờ khi có sách trả về)?`,
    type: "blue",
    confirmText: "Đặt trước ngay",
    cancelText: "Hủy",
    onConfirm: async () => {
      try {
        const res = await api.post("/reservations", { book_isbn: key });
        const pos = res?.queue_position ? ` (Vị trí hàng chờ: #${res.queue_position})` : "";
        notifyUser(`Đã đặt trước "${bookTitle}" thành công${pos}!`, "success");
        fetchBooksPage({ silent: true });
      } catch (err) {
        notifyUser(err?.message || "Không thể đặt trước đầu sách này.", "error");
      }
    },
  });
}

function viewBookDetail(isbnOrTitle) {
  const key = String(isbnOrTitle ?? "").trim();
  const book = homeState.booksByIsbn.get(key);
  const isbn = book ? book.isbn : key;
  const detailUrl = getBookDetailUrl(isbn);
  if (!getHomeSession().isLoggedIn) {
    openAuthGuardModal(detailUrl);
    return;
  }
  window.location.href = detailUrl;
}

async function loadHomeData() {
  const cache = readHomeCache();
  let catSig = "";
  let booksSig = "";
  let statsSig = "";

  if (cache?.categories) {
    try {
      catSig = JSON.stringify(cache.categories);
      applyCategoriesData(cache.categories.items || [], Number(cache.categories.total || 0));
    } catch {
      catSig = "";
    }
  }

  if (cache?.defaultBooks && !homeState.keyword && !homeState.selectedCategoryId && homeState.currentPage === 1 && !homeState.isAllBooksView) {
    try {
      booksSig = JSON.stringify(cache.defaultBooks);
      const { items = [], total = 0, totalPages = 1 } = cache.defaultBooks;
      applyBooksData(items, total, totalPages);
    } catch {
      booksSig = "";
    }
  }

  if (cache?.statsAndTrending) {
    try {
      statsSig = JSON.stringify(cache.statsAndTrending);
      if (cache.statsAndTrending.heroStatsPayload) {
        updateHeroNumbers(cache.statsAndTrending.heroStatsPayload);
      }
      renderTrendingList(cache.statsAndTrending.trendingItems || [], cache.statsAndTrending.trendingMode || "weekly");
    } catch {
      statsSig = "";
    }
  }

  await Promise.allSettled([
    loadCategories({ prevSignature: catSig }),
    fetchBooksPage({ silent: Boolean(booksSig), prevSignature: booksSig }),
    loadHeroStatsAndTrending({ prevSignature: statsSig }),
  ]);
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
}

function closeConfirmModal() {
  const modal = document.getElementById("confirm-modal");
  if (modal) {
    modal.classList.remove("active");
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
  const notifContainer = document.getElementById("notifDropdownContainer");
  const loanBasketBtn = document.getElementById("loanBasketBtn");

  const { user, isLoggedIn } = getHomeSession();

  if (notifContainer) {
    notifContainer.style.display = isLoggedIn ? "" : "none";
  }
  if (loanBasketBtn) {
    loanBasketBtn.style.display = isLoggedIn ? "" : "none";
  }

  if (isLoggedIn) {
    const fullName = user.full_name || user.name || user.email || "Độc giả";
    const initial = (fullName.trim().charAt(0) || "U").toUpperCase();
    const role = String(user.role || "").toUpperCase();
    const roleText = role === "ADMIN" ? "Quản trị viên" : role === "LIBRARIAN" ? "Thủ thư" : "Độc giả";

    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = roleText;

    if (userDropdownMenu) {
      userDropdownMenu.innerHTML = `
        <a href="profile.html" class="dropdown-item" id="userProfileLink">
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

  const authGuardOverlay = document.getElementById("authGuardOverlay");
  if (authGuardOverlay) {
    authGuardOverlay.addEventListener("click", (e) => {
      if (e.target === authGuardOverlay) {
        closeAuthGuardModal();
      }
    });
  }
  const rulesModal = document.getElementById("rules-modal");
  if (rulesModal) {
    rulesModal.addEventListener("click", (e) => {
      if (e.target === rulesModal) {
        closeRulesModal();
      }
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeConfirmModal();
      closeRulesModal();
      closeAuthGuardModal();
    }
  });
}

// Khởi chạy
initTopBar();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadHomeData);
} else {
  loadHomeData();
}

// Đảm bảo các hàm gọi từ thuộc tính onclick trên HTML luôn sẵn sàng
window.handleSearch = handleSearch;
window.toggleCategories = toggleCategories;
window.toggleAllCategories = toggleCategories;
window.handleCategoryFilter = handleCategoryFilter;
window.clearSearchFilter = clearSearchFilter;
window.borrowBook = borrowBook;
window.reserveBookFromHome = reserveBookFromHome;
window.showLibraryRules = showLibraryRules;
window.closeRulesModal = closeRulesModal;
window.quickAdd = quickAdd;
window.prevCarousel = prevCarousel;
window.nextCarousel = nextCarousel;
window.goToCarouselPage = goToCarouselPage;
window.toggleAllBooksView = toggleAllBooksView;
window.viewBookDetail = viewBookDetail;
window.handleDetailLinkClick = handleDetailLinkClick;
window.openAuthGuardModal = openAuthGuardModal;
window.closeAuthGuardModal = closeAuthGuardModal;
window.showConfirm = showConfirm;
window.closeConfirmModal = closeConfirmModal;
window.fetchBooksPage = fetchBooksPage;
window.loadHomeData = loadHomeData;
