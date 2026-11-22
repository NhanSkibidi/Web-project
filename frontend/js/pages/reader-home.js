// ==============================================================================
// UniLib / KS25 Library — Tra cứu Danh mục Ấn bản (reader-home.js)
// Kết nối trực tiếp GET /api/books/facets, GET /api/books/search, POST /api/loans/online
// ==============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  let currentPage = 1;
  const pageSize = 9;
  let currentScope = "all";

  const gridEl = document.getElementById("catalog-book-grid");
  const paginationEl = document.getElementById("catalog-pagination");
  const resultInfoEl = document.getElementById("catalog-result-info");
  const kwInput = document.getElementById("catalog-keyword");
  const sortSelect = document.getElementById("catalog-sort");
  const availCheckbox = document.getElementById("filter-avail-only");

  // Palette bìa sách học thuật cho sách chưa có ảnh bìa URL
  const COVER_GRADIENTS = [
    "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
    "linear-gradient(135deg, #243B53 0%, #486581 100%)",
    "linear-gradient(135deg, #5C3D2E 0%, #8C5A3C 100%)",
    "linear-gradient(135deg, #1E3A5F 0%, #2B598C 100%)",
    "linear-gradient(135deg, #3A4F41 0%, #587863 100%)",
    "linear-gradient(135deg, #4A314D 0%, #6B4970 100%)",
  ];

  // ---------- 1. Header User & Giỏ mượn ----------
  function getBasket() {
    try {
      return JSON.parse(localStorage.getItem("ks25_loan_basket") || "[]");
    } catch {
      return [];
    }
  }

  function saveBasket(list) {
    localStorage.setItem("ks25_loan_basket", JSON.stringify(list));
    updateBasketBadge();
  }

  function updateBasketBadge() {
    const el = document.getElementById("header-basket-badge");
    if (el) el.textContent = getBasket().length;
  }

  async function syncHeaderUser() {
    const avatarEl = document.getElementById("header-user-avatar");
    const nameEl = document.getElementById("header-user-name");
    const metaEl = document.getElementById("header-user-meta");
    const userLink = document.getElementById("header-user-link");
    const logoutBtn = document.getElementById("btn-header-logout");

    if (!auth.getToken()) return;
    const user = (await auth.syncSession()) || auth.getUser();
    const card = auth.getCard();
    if (!user) return;

    if (avatarEl) avatarEl.textContent = (user.full_name || user.email).charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = user.full_name || user.email;
    if (metaEl) {
      metaEl.textContent = card?.card_code
        ? `${card.card_code} · ${card.card_type}`
        : `${user.role}`;
    }
    if (userLink) userLink.href = "auth.html";
    if (logoutBtn) logoutBtn.hidden = false;
  }

  document.getElementById("btn-header-logout")?.addEventListener("click", () => {
    auth.clearSession();
    window.location.href = "login.html#login";
  });

  // ---------- 2. Tải Bộ lọc Facets thực từ Backend ----------
  async function loadFacets() {
    const catWrap = document.getElementById("facet-categories");
    const shelfWrap = document.getElementById("facet-shelves");
    const langWrap = document.getElementById("facet-languages");

    try {
      const data = await api.get("/books/facets");

      if (catWrap) {
        catWrap.innerHTML = (data.categories || [])
          .map(
            (c) => `
          <label class="filter-check-item">
            <span class="filter-check-left">
              <input type="checkbox" name="facet-cat" value="${c.id}">
              <span>${escapeHtml(c.name)}</span>
            </span>
            <span class="filter-count">${c.count}</span>
          </label>
        `
          )
          .join("");
      }

      if (shelfWrap) {
        shelfWrap.innerHTML = (data.shelves || [])
          .map(
            (s) => `
          <label class="filter-check-item">
            <span class="filter-check-left">
              <input type="checkbox" name="facet-shelf" value="${escapeHtml(s.name)}">
              <span>${escapeHtml(s.name)}</span>
            </span>
            <span class="filter-count">${s.count}</span>
          </label>
        `
          )
          .join("");
      }

      if (langWrap) {
        langWrap.innerHTML = (data.languages || [])
          .map(
            (l) => `
          <label class="filter-check-item">
            <span class="filter-check-left">
              <input type="checkbox" name="facet-lang" value="${escapeHtml(l.name)}">
              <span>${escapeHtml(l.name)}</span>
            </span>
            <span class="filter-count">${l.count}</span>
          </label>
        `
          )
          .join("");
      }

      document.querySelectorAll('input[name^="facet-"]').forEach((cb) => {
        cb.addEventListener("change", () => loadBooks(1));
      });
    } catch {
      if (catWrap) catWrap.innerHTML = `<span style="font-size:12px;color:var(--muted);">Không tải được bộ lọc</span>`;
    }
  }

  function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  }

  // ---------- 3. Tải Danh mục Sách & Phân trang ----------
  async function loadBooks(page = 1) {
    currentPage = page;
    if (!gridEl) return;

    try {
      const [sortBy, sortOrder] = (sortSelect?.value || "created_at:desc").split(":");
      const catIds = getCheckedValues("facet-cat");
      const shelves = getCheckedValues("facet-shelf");
      const langs = getCheckedValues("facet-lang");

      const params = {
        page: currentPage,
        page_size: pageSize,
        scope: currentScope,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (kwInput?.value.trim()) params.keyword = kwInput.value.trim();
      if (catIds.length) params.category_ids = catIds.join(",");
      if (shelves.length) params.shelf_locations = shelves.join(",");
      if (langs.length) params.languages = langs.join(",");
      if (availCheckbox?.checked) params.available_only = true;

      const res = await api.get("/books/search", params);
      const total = res.total ?? 0;
      const totalPages = Math.max(res.total_pages || 1, 1);

      if (resultInfoEl) {
        resultInfoEl.innerHTML = `Tìm thấy <strong>${total} kết quả</strong> · Hiển thị trang ${res.page || 1} / ${totalPages}`;
      }

      if (!res.items || res.items.length === 0) {
        gridEl.innerHTML = `
          <div style="grid-column: 1/-1; background:#fff; border:1px solid var(--border); border-radius:14px; padding:42px 24px; text-align:center; color:var(--muted);">
            Không tìm thấy ấn bản nào khớp với tiêu chí tìm kiếm hiện tại.
          </div>
        `;
        if (paginationEl) paginationEl.innerHTML = "";
        return;
      }

      gridEl.innerHTML = res.items
        .map((b, idx) => {
          const isAvail = (b.available_copies || 0) > 0;
          const authorsText = b.authors?.map((a) => a.name).join(", ") || "Chưa rõ tác giả";
          const catName = b.category?.name || "Học thuật";
          const shelfText = b.shelf_location || "Kệ A1";
          const gradient = COVER_GRADIENTS[idx % COVER_GRADIENTS.length];

          const coverContent = b.cover_image
            ? `<img src="${escapeHtml(b.cover_image)}" alt="${escapeHtml(b.title)}" class="book-cover-img" onerror="this.remove()">`
            : "";

          const primaryAction = isAvail
            ? `<button type="button" class="btn-borrow-primary" data-borrow-isbn="${escapeHtml(b.isbn)}" data-book-title="${escapeHtml(b.title)}">
                 📖 Mượn trực tuyến
               </button>`
            : `<button type="button" class="btn-reserve-muted" data-reserve-title="${escapeHtml(b.title)}">
                 🕒 Đặt trước
               </button>`;

          return `
            <article class="book-card">
              <div class="book-cover-wrap" style="background: ${gradient};">
                ${coverContent}
                <span class="cover-status-pill ${isAvail ? "cover-status-avail" : "cover-status-out"}">
                  ${isAvail ? `${b.available_copies}/${b.total_copies} CÓ SẴN` : "ĐÃ MƯỢN HẾT"}
                </span>
                <div class="book-cover-art">
                  <div class="book-cover-art-cat">${escapeHtml(catName)}</div>
                  <div class="book-cover-art-title">${escapeHtml(b.title)}</div>
                </div>
                <span class="cover-shelf-pill">📍 ${escapeHtml(shelfText)}</span>
              </div>

              <div class="book-card-body">
                <h3 class="book-card-title" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</h3>
                <div class="book-card-author">👤 ${escapeHtml(authorsText)}</div>
                <div class="book-card-isbn">ISBN: ${escapeHtml(b.isbn)} · ${formatMoney(b.price)}</div>

                <div class="book-card-actions">
                  ${primaryAction}
                  <button
                    type="button"
                    class="btn-basket-icon"
                    title="Thêm vào giỏ mượn"
                    data-add-basket="${escapeHtml(b.isbn)}"
                    data-book-title="${escapeHtml(b.title)}"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");

      renderPagination(res.page || 1, totalPages);
    } catch (err) {
      gridEl.innerHTML = `<div style="grid-column:1/-1; color:var(--danger); padding:20px;">${escapeHtml(err.message)}</div>`;
    }
  }

  function renderPagination(page, totalPages) {
    if (!paginationEl) return;
    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }

    let html = `<button type="button" class="page-btn" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹ Trang trước</button>`;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let p = start; p <= end; p++) {
      html += `<button type="button" class="page-btn ${p === page ? "active" : ""}" data-page="${p}">${p}</button>`;
    }
    html += `<button type="button" class="page-btn" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>Trang sau ›</button>`;
    paginationEl.innerHTML = html;
  }

  paginationEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-page]");
    if (!btn || btn.disabled) return;
    const p = Number(btn.getAttribute("data-page"));
    if (p >= 1) {
      loadBooks(p);
      window.scrollTo({ top: 240, behavior: "smooth" });
    }
  });

  // ---------- 4. Hành động Mượn trực tuyến / Giỏ mượn / Đặt trước ----------
  gridEl?.addEventListener("click", async (e) => {
    const borrowBtn = e.target.closest("[data-borrow-isbn]");
    if (borrowBtn) {
      if (!auth.isLoggedIn()) {
        showToast("Vui lòng đăng nhập tài khoản Độc giả để mượn sách trực tuyến!", "error");
        setTimeout(() => (window.location.href = "login.html#login"), 700);
        return;
      }
      const isbn = borrowBtn.getAttribute("data-borrow-isbn");
      const title = borrowBtn.getAttribute("data-book-title");
      try {
        borrowBtn.disabled = true;
        const loan = await api.post("/loans/online", { book_isbns: [isbn] });
        showToast(`Đã gửi yêu cầu mượn "${title}" (Mã phiếu #${loan.id})!`);
        loadBooks(currentPage);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        borrowBtn.disabled = false;
      }
      return;
    }

    const addBtn = e.target.closest("[data-add-basket]");
    if (addBtn) {
      const isbn = addBtn.getAttribute("data-add-basket");
      const title = addBtn.getAttribute("data-book-title");
      const basket = getBasket();
      if (basket.some((i) => i.isbn === isbn)) {
        showToast(`"${title}" đã có sẵn trong giỏ mượn.`, "error");
        return;
      }
      if (basket.length >= 5) {
        showToast("Giỏ mượn tối đa 5 cuốn mỗi lần!", "error");
        return;
      }
      basket.push({ isbn, title });
      saveBasket(basket);
      showToast(`Đã lưu "${title}" vào giỏ mượn (${basket.length}/5).`);
      return;
    }

    const resBtn = e.target.closest("[data-reserve-title]");
    if (resBtn) {
      const title = resBtn.getAttribute("data-reserve-title");
      showToast(`Đã ghi nhận yêu cầu đặt trước sách "${title}".`);
    }
  });

  // ---------- 5. Scope Pills, Search, View Toggle & Modals ----------
  document.getElementById("scope-bar")?.addEventListener("click", (e) => {
    const pill = e.target.closest("[data-scope]");
    if (!pill) return;
    currentScope = pill.getAttribute("data-scope");
    document.querySelectorAll(".scope-pill").forEach((p) => p.classList.toggle("active", p === pill));
    loadBooks(1);
  });

  document.getElementById("hero-search-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    loadBooks(1);
  });

  sortSelect?.addEventListener("change", () => loadBooks(1));
  availCheckbox?.addEventListener("change", () => loadBooks(1));

  document.getElementById("btn-reset-filters")?.addEventListener("click", () => {
    if (kwInput) kwInput.value = "";
    if (availCheckbox) availCheckbox.checked = false;
    currentScope = "all";
    document.querySelectorAll(".scope-pill").forEach((p) =>
      p.classList.toggle("active", p.getAttribute("data-scope") === "all")
    );
    document.querySelectorAll('input[name^="facet-"]').forEach((cb) => (cb.checked = false));
    loadBooks(1);
  });

  const btnGrid = document.getElementById("btn-view-grid");
  const btnList = document.getElementById("btn-view-list");
  btnGrid?.addEventListener("click", () => {
    gridEl?.classList.remove("list-view");
    btnGrid.classList.add("active");
    btnList?.classList.remove("active");
  });
  btnList?.addEventListener("click", () => {
    gridEl?.classList.add("list-view");
    btnList.classList.add("active");
    btnGrid?.classList.remove("active");
  });

  // Modals (Quét mã vạch & Đề xuất sách)
  const modalBarcode = document.getElementById("modal-barcode");
  const modalSuggest = document.getElementById("modal-suggest");

  document.getElementById("btn-open-barcode")?.addEventListener("click", () => {
    modalBarcode.hidden = false;
    document.getElementById("barcode-input")?.focus();
  });
  document.getElementById("btn-open-suggest")?.addEventListener("click", () => {
    modalSuggest.hidden = false;
    document.getElementById("suggest-title")?.focus();
  });
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.getAttribute("data-close")).hidden = true;
    });
  });

  document.getElementById("barcode-lookup-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("barcode-input").value.trim();
    const resEl = document.getElementById("barcode-result");
    if (!code) return;
    try {
      const copy = await api.get(`/book_copies/code/${encodeURIComponent(code)}`);
      resEl.innerHTML = `<span style="color:var(--success); font-weight:600;">✅ Tìm thấy bản sao ${escapeHtml(copy.copy_code)} · ISBN ${escapeHtml(copy.book_isbn)} · Vị trí: ${escapeHtml(copy.shelf_location)} (${escapeHtml(copy.status)})</span>`;
      if (kwInput) {
        kwInput.value = copy.book_isbn;
        currentScope = "isbn";
        loadBooks(1);
      }
    } catch {
      resEl.innerHTML = `<span style="color:var(--warning);">Không thấy mã bản sao, đang tìm theo ISBN "${escapeHtml(code)}"...</span>`;
      if (kwInput) {
        kwInput.value = code;
        currentScope = "isbn";
        loadBooks(1);
      }
    }
  });

  document.getElementById("suggest-book-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("suggest-title").value.trim();
    showToast(`Cảm ơn bạn! Đã gửi đề xuất bổ sung sách "${title}" tới Thủ thư.`);
    e.target.reset();
    modalSuggest.hidden = true;
  });

  updateBasketBadge();
  syncHeaderUser();
  loadFacets();
  loadBooks(1);
});
