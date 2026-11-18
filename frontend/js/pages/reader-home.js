// ==============================================================================
// KS25 Library — Trang chủ Thư viện số dành cho Độc giả (reader-home.js)
// ==============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  let currentPage = 1;
  const pageSize = 12;

  const gridEl = document.getElementById("catalog-book-grid");
  const countTextEl = document.getElementById("catalog-count-text");
  const pageInfoEl = document.getElementById("pagination-info");
  const prevBtn = document.getElementById("btn-prev-page");
  const nextBtn = document.getElementById("btn-next-page");

  const searchForm = document.getElementById("catalog-search-form");
  const kwInput = document.getElementById("catalog-keyword");
  const catSelect = document.getElementById("catalog-category");
  const sortSelect = document.getElementById("catalog-sort");
  const availCheckbox = document.getElementById("filter-avail-only");
  const resetBtn = document.getElementById("btn-catalog-reset");

  // ---------- 1. Giỏ mượn sách (LocalStorage) ----------
  function getBasket() {
    try {
      const raw = localStorage.getItem("ks25_loan_basket");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveBasket(items) {
    localStorage.setItem("ks25_loan_basket", JSON.stringify(items));
    updateBasketBadge();
  }

  function updateBasketBadge() {
    const basket = getBasket();
    const el = document.getElementById("hero-basket-count");
    if (el) el.textContent = basket.length;
  }

  updateBasketBadge();

  // ---------- 2. Hiển thị Thẻ Thư Viện Của Độc Giả ----------
  async function renderUserCardWidget() {
    const codeEl = document.getElementById("widget-card-code");
    const statusEl = document.getElementById("widget-card-status");
    const nameEl = document.getElementById("widget-user-name");
    const typeEl = document.getElementById("widget-card-type");
    const expiryEl = document.getElementById("widget-card-expiry");

    if (!auth.getToken()) {
      if (codeEl) codeEl.textContent = "CHƯA ĐĂNG NHẬP";
      if (statusEl) {
        statusEl.className = "badge badge-reserved";
        statusEl.textContent = "KHÁCH";
      }
      if (nameEl) nameEl.innerHTML = `<a href="login.html#login">Bấm để Đăng nhập / Đăng ký thẻ →</a>`;
      if (typeEl) typeEl.textContent = "Mượn tối đa 5 cuốn / 14 ngày";
      if (expiryEl) expiryEl.textContent = "—";
      return;
    }

    const user = (await auth.syncSession()) || auth.getUser();
    const card = auth.getCard();

    if (!user) return;
    if (nameEl) nameEl.textContent = `${user.full_name} (${user.email})`;

    if (card) {
      if (codeEl) codeEl.textContent = card.card_code;
      if (statusEl) {
        statusEl.className = `badge ${
          card.status === "ACTIVE"
            ? "badge-available"
            : card.status === "EXPIRED"
            ? "badge-reserved"
            : "badge-danger"
        }`;
        statusEl.textContent = card.status;
      }
      if (typeEl) typeEl.textContent = `${card.card_type} · Tối đa ${card.max_borrow_books} cuốn`;
      if (expiryEl) expiryEl.textContent = `${card.issue_date} → ${card.expiry_date}`;
    } else {
      if (codeEl) codeEl.textContent = user.role;
      if (statusEl) {
        statusEl.className = "badge badge-available";
        statusEl.textContent = user.status || "ACTIVE";
      }
      if (typeEl) typeEl.textContent = user.role === "READER" ? "Chưa cấp thẻ" : "Tài khoản Quản trị / Thủ thư";
      if (expiryEl) expiryEl.textContent = "—";
    }
  }

  // ---------- 3. Tải & Tìm kiếm Danh mục Sách ----------
  async function loadBooks(page = 1) {
    currentPage = page;
    if (!gridEl) return;

    try {
      const [sortBy, sortOrder] = (sortSelect?.value || "created_at:desc").split(":");
      const params = {
        page: currentPage,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (kwInput?.value.trim()) params.keyword = kwInput.value.trim();
      if (catSelect?.value) params.category_id = Number(catSelect.value);
      if (availCheckbox?.checked) params.available_only = true;

      const res = await api.get("/books/search", params);

      if (countTextEl) {
        countTextEl.textContent = `Tìm thấy ${res.total ?? 0} đầu sách trong thư viện`;
      }
      if (pageInfoEl) {
        pageInfoEl.textContent = `Trang ${res.page || 1} / ${Math.max(res.total_pages || 1, 1)} (Tổng ${res.total || 0} đầu sách)`;
      }
      if (prevBtn) prevBtn.disabled = (res.page || 1) <= 1;
      if (nextBtn) nextBtn.disabled = (res.page || 1) >= (res.total_pages || 1);

      if (!res.items || res.items.length === 0) {
        gridEl.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; color: var(--color-muted);">Không tìm thấy đầu sách nào phù hợp với bộ lọc hiện tại.</div>`;
        return;
      }

      gridEl.innerHTML = res.items
        .map((b) => {
          const authorNames = b.authors?.map((a) => a.name).join(", ") || "Chưa rõ tác giả";
          const catName = b.category?.name || "Chưa phân loại";
          const isAvail = (b.available_copies || 0) > 0;

          return `
            <article class="book-item-card">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span class="book-cat-tag" style="margin-bottom: 0;">${escapeHtml(catName)}</span>
                  <span class="badge ${isAvail ? "badge-available" : "badge-danger"}">
                    ${isAvail ? `Còn ${b.available_copies}/${b.total_copies} cuốn` : "Hết bản sao"}
                  </span>
                </div>
                <h3 class="book-title">${escapeHtml(b.title)}</h3>
                <div class="book-author">✍️ ${escapeHtml(authorNames)}</div>
                <div class="muted" style="font-size: 12.5px;">
                  NXB: ${escapeHtml(b.publisher?.name || "—")} · Năm: ${b.publish_year || "—"}
                </div>
              </div>

              <div>
                <div class="book-meta-line">
                  <span class="code-mono">ISBN: ${escapeHtml(b.isbn)}</span>
                  <strong style="color: var(--color-primary);">${formatMoney(b.price)}</strong>
                </div>
                <div class="book-card-actions">
                  <button
                    type="button"
                    class="btn btn-outline btn-small"
                    style="flex: 1;"
                    data-add-basket="${escapeHtml(b.isbn)}"
                    data-book-title="${escapeHtml(b.title)}"
                    ${!isAvail ? "disabled" : ""}
                  >
                    + Giỏ mượn
                  </button>
                  <button
                    type="button"
                    class="btn btn-primary btn-small"
                    style="flex: 1;"
                    data-borrow-now="${escapeHtml(b.isbn)}"
                    data-book-title="${escapeHtml(b.title)}"
                    ${!isAvail ? "disabled" : ""}
                  >
                    Mượn ngay →
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    } catch (err) {
      gridEl.innerHTML = `<div class="card text-error" style="grid-column: 1 / -1;">${escapeHtml(err.message)}</div>`;
    }
  }

  // ---------- 4. Xử lý Thêm vào giỏ & Mượn ngay Online ----------
  gridEl?.addEventListener("click", async (e) => {
    const addBtn = e.target.closest("[data-add-basket]");
    if (addBtn) {
      const isbn = addBtn.getAttribute("data-add-basket");
      const title = addBtn.getAttribute("data-book-title");
      const basket = getBasket();
      if (basket.some((i) => i.isbn === isbn)) {
        showToast(`Sách "${title}" đã có trong giỏ mượn!`, "error");
        return;
      }
      if (basket.length >= 5) {
        showToast("Mỗi lần mượn tối đa 5 cuốn sách!", "error");
        return;
      }
      basket.push({ isbn, title });
      saveBasket(basket);
      showToast(`Đã thêm "${title}" vào giỏ mượn (${basket.length}/5)!`);
      return;
    }

    const borrowBtn = e.target.closest("[data-borrow-now]");
    if (borrowBtn) {
      if (!auth.isLoggedIn()) {
        showToast("Vui lòng đăng nhập tài khoản Độc giả để mượn sách!", "error");
        setTimeout(() => {
          window.location.href = "login.html#login";
        }, 700);
        return;
      }

      const isbn = borrowBtn.getAttribute("data-borrow-now");
      const title = borrowBtn.getAttribute("data-book-title");
      try {
        borrowBtn.disabled = true;
        const loan = await api.post("/loans/online", { book_isbns: [isbn] });
        showToast(`Gửi yêu cầu mượn "${title}" thành công (Mã phiếu #${loan.id})!`);
        loadBooks(currentPage);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        borrowBtn.disabled = false;
      }
    }
  });

  // Sự kiện tìm kiếm & phân trang
  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    loadBooks(1);
  });

  catSelect?.addEventListener("change", () => loadBooks(1));
  sortSelect?.addEventListener("change", () => loadBooks(1));
  availCheckbox?.addEventListener("change", () => loadBooks(1));

  resetBtn?.addEventListener("click", () => {
    if (kwInput) kwInput.value = "";
    if (catSelect) catSelect.value = "";
    if (sortSelect) sortSelect.value = "created_at:desc";
    if (availCheckbox) availCheckbox.checked = false;
    loadBooks(1);
  });

  prevBtn?.addEventListener("click", () => {
    if (currentPage > 1) loadBooks(currentPage - 1);
  });

  nextBtn?.addEventListener("click", () => {
    loadBooks(currentPage + 1);
  });

  renderUserCardWidget();
  loadBooks(1);
});
