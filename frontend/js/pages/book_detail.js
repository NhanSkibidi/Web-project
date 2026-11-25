/**
 * ==============================================================================
 * KS25 Library - Logic Trang Chi Tiết Sách (book_detail.js)
 * Chức năng:
 *  1. Đồng bộ Backend RESTful API: /api/books/{isbn}, /api/book_copies, /api/loans_item/{isbn}/loan-history
 *  2. Kiểm tra xác thực (Bắt buộc đăng nhập để xem chi tiết & mượn sách).
 *  3. Header tích hợp Avatar người dùng và Giỏ hàng mượn sách.
 *  4. Hiệu ứng bay sách vào icon giỏ hàng khi nhấn "Thêm vào giỏ mượn".
 *  5. Quản lý danh mục bản sao vật lý & bộ lọc kho theo thời gian thực.
 *  6. Hiển thị thống kê: Tổng bản sao, Đang mượn, Khả dụng, Mất/hỏng.
 *  7. Hiển thị Lịch sử mượn trả thật của đầu sách.
 *  8. Gợi ý tài liệu học tập cùng chuyên ngành từ cơ sở dữ liệu thật.
 * ==============================================================================
 */

(function () {
  "use strict";

  // Biến lưu trữ dữ liệu sách hiện tại
  let currentBook = null;
  let currentCopies = [];
  let currentLoanHistory = [];

  // Helper định dạng đường dẫn ảnh bìa
  function formatCoverUrl(url) {
    if (!url) return "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    const baseOrigin = typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL
      ? CONFIG.API_BASE_URL.replace(/\/api\/?$/, "")
      : "";
    return `${baseOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(isoStr) {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("vi-VN");
    } catch {
      return isoStr;
    }
  }

  // 1. KIỂM TRA ĐĂNG NHẬP & HEADER PROFILE
  function checkAuth() {
    let user = null;
    if (typeof auth !== "undefined" && auth.getUser) {
      user = auth.getUser();
    } else {
      try {
        const stored = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
        if (stored) user = JSON.parse(stored);
      } catch {}
    }

    const overlay = document.getElementById("authGuardOverlay");
    const userNameEl = document.getElementById("headerUserName");
    const userRoleEl = document.getElementById("headerUserRole");
    const userAvatarEl = document.getElementById("headerUserAvatar");
    const userDropdownMenu = document.getElementById("userDropdownMenu");

    if (!user) {
      if (overlay) overlay.style.display = "flex";
      if (userNameEl) userNameEl.textContent = "Tài khoản";
      if (userRoleEl) userRoleEl.textContent = "Chưa đăng nhập";
      if (userAvatarEl) userAvatarEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">person</span>';
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
      return false;
    } else {
      if (overlay) overlay.style.display = "none";
      const displayName = user.full_name || user.email || "Độc giả";
      const role = String(user.role || "").toUpperCase();
      const roleMap = {
        ADMIN: "Quản trị viên",
        LIBRARIAN: "Thủ thư",
        READER: "Độc giả"
      };
      if (userNameEl) userNameEl.textContent = displayName;
      if (userRoleEl) userRoleEl.textContent = roleMap[role] || "Độc giả";
      if (userAvatarEl) {
        userAvatarEl.textContent = (displayName.trim().charAt(0) || "U").toUpperCase();
      }
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
      return true;
    }
  }

  // Demo Login cho bạn đọc nếu chưa đăng nhập
  window.demoLoginAsStudent = function () {
    const demoUser = {
      id: 99,
      email: "sinhvien@ks25.edu.vn",
      full_name: "Nguyễn Nhật Anh",
      role: "READER",
      student_id: "B25DTCN065"
    };
    if (typeof auth !== "undefined") {
      auth.setToken("demo_token_ks25_student", true);
      auth.setUser(demoUser);
    } else {
      localStorage.setItem("access_token", "demo_token_ks25_student");
      localStorage.setItem("user_info", JSON.stringify(demoUser));
    }
    const overlay = document.getElementById("authGuardOverlay");
    if (overlay) overlay.style.display = "none";
    checkAuth();
    showToast("✓ Đăng nhập thành công với tài khoản Sinh viên!");
  };

  // 2. TẢI DỮ LIỆU ĐẦU SÁCH TỪ BACKEND API
  async function loadBookData() {
    const urlParams = new URLSearchParams(window.location.search);
    let isbn = urlParams.get("isbn") || urlParams.get("book") || urlParams.get("key");

    try {
      // Nếu chưa có ISBN trên URL, lấy đầu sách đầu tiên trong DB
      if (!isbn) {
        const firstRes = await api.get("/books/search", { page_size: 1 });
        if (firstRes && firstRes.items && firstRes.items.length > 0) {
          isbn = firstRes.items[0].isbn;
        } else {
          isbn = "9786042100001";
        }
      }

      // 1. Lấy chi tiết đầu sách
      const bookRes = await api.get(`/books/${encodeURIComponent(isbn)}`);
      currentBook = bookRes;

      // 2. Render giao diện chi tiết sách
      renderBookDetails(currentBook);

      // 3. Tải danh sách bản sao vật lý
      await loadBookCopies(isbn);

      // 4. Tải lịch sử mượn trả
      await loadLoanHistory(isbn);

      // 5. Tải sách liên quan cùng chuyên ngành
      await loadRelatedBooks(currentBook);

    } catch (err) {
      console.error("Lỗi khi tải dữ liệu chi tiết sách:", err);
      showToast("Không tìm thấy thông tin đầu sách hoặc máy chủ chưa sẵn sàng.");
      // Fallback hiển thị thông tin tối thiểu
      renderFallback(isbn);
    }
  }

  function renderBookDetails(book) {
    if (!book) return;

    // Tiêu đề trang
    const pageTitleEl = document.getElementById("pageTitle");
    if (pageTitleEl) pageTitleEl.textContent = `${book.title} | Thư viện số KS25`;
    document.title = `${book.title} | Thư viện số KS25`;

    // Khung bìa sách
    const coverWrap = document.getElementById("mainBookCoverWrap");
    if (coverWrap) {
      const coverUrl = formatCoverUrl(book.cover_image);
      coverWrap.innerHTML = `
        <div style="width:100%; height:100%; border-radius:12px; overflow:hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.25); background: #f8fafc; display:flex; align-items:center; justify-content:center;">
          <img src="${coverUrl}" alt="${escapeHtml(book.title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80'">
        </div>
      `;
    }

    // Tiêu đề sách
    const titleEl = document.getElementById("bookTitle");
    if (titleEl) titleEl.textContent = book.title;

    // Tác giả & NXB
    const authorNames = Array.isArray(book.authors)
      ? book.authors.map((a) => (typeof a === "object" ? a.name : a)).join(", ")
      : (book.authors || "Chưa rõ tác giả");
    const metaAuthor = document.getElementById("metaAuthor");
    if (metaAuthor) metaAuthor.textContent = authorNames || "Chưa rõ tác giả";

    const coAuthor = document.getElementById("metaCoAuthor");
    if (coAuthor) coAuthor.textContent = book.category?.name || "Chuyên ngành";

    const publisherName = book.publisher ? (book.publisher.name || book.publisher) : "NXB Giáo Dục";
    const metaPub = document.getElementById("metaPublisher");
    if (metaPub) metaPub.textContent = `${publisherName} (${book.publish_year || "Mới"})`;

    // 4 Thẻ số liệu KPI thống kê (Task D)
    const statTotal = document.getElementById("statTotalCopies") || document.getElementById("statRating");
    if (statTotal) statTotal.textContent = book.total_copies || 0;

    const statAvail = document.getElementById("statAvailCopies") || document.getElementById("statBorrowCount");
    if (statAvail) statAvail.textContent = book.available_copies || 0;

    const statBorrowed = document.getElementById("statBorrowedCopies") || document.getElementById("statEdition");
    if (statBorrowed) statBorrowed.textContent = book.borrowed_copies || 0;

    const lostAndDamaged = (book.damage_copies || 0) + (book.lost_copies || 0);
    const statDamaged = document.getElementById("statDamagedLostCopies") || document.getElementById("statImportDate");
    if (statDamaged) statDamaged.textContent = lostAndDamaged;

    // Availability Pill
    const availText = document.getElementById("bookAvailabilityText");
    if (availText) {
      availText.textContent = `Còn ${book.available_copies || 0} / ${book.total_copies || 0} bản sao khả dụng`;
    }

    // Tóm tắt nội dung
    const summaryText = document.getElementById("bookSummaryText");
    if (summaryText) {
      summaryText.textContent = book.description || "Tài liệu học tập và nghiên cứu chuẩn mực dành cho sinh viên và giảng viên.";
    }

    // Thông số kỹ thuật
    const specIsbn = document.getElementById("specIsbn");
    if (specIsbn) specIsbn.textContent = book.isbn;

    const specPages = document.getElementById("specPages");
    if (specPages) specPages.textContent = `${book.page_count || 400} trang chuẩn`;

    const specLang = document.getElementById("specLanguage");
    if (specLang) specLang.textContent = book.language || "Tiếng Việt";

    const shelfCode = document.getElementById("shelfLocationCode");
    if (shelfCode) shelfCode.textContent = book.shelf_location || "KHO-TRUNG-TAM / Kệ A1";

    // Tags thể loại
    const tagsContainer = document.getElementById("bookTagPills");
    if (tagsContainer) {
      const catName = book.category?.name || "Khoa học & Kỹ thuật";
      tagsContainer.innerHTML = `
        <span class="tag-badge tag-badge-highlight">${escapeHtml(catName)}</span>
        <span class="tag-badge">Giáo trình KS25</span>
        <span class="tag-badge">Lưu hành nội bộ</span>
      `;
    }
  }

  // 3. TẢI VÀ HIỂN THỊ DANH SÁCH BẢN SAO VẬT LÝ (Task B)
  async function loadBookCopies(isbn) {
    try {
      const copies = await api.get("/book_copies", { book_isbn: isbn });
      currentCopies = Array.isArray(copies) ? copies : [];

      const tabCount = document.getElementById("tabCopiesCount");
      if (tabCount) tabCount.textContent = currentCopies.length;

      const badgeCount = document.getElementById("badgeCopiesCount");
      if (badgeCount) badgeCount.textContent = `${currentCopies.length} bản sao`;

      renderCopiesTable(currentCopies);
    } catch (err) {
      console.warn("Lỗi khi tải bản sao sách:", err);
      currentCopies = [];
      renderCopiesTable([]);
    }
  }

  function renderCopiesTable(copies) {
    const tbody = document.getElementById("copiesTableBody");
    if (!tbody) return;

    if (!copies || copies.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 28px; color: var(--color-muted);">
            Hiện chưa có bản sao vật lý nào cho đầu sách này trong kho.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = copies.map((c, index) => {
      const stt = String(index + 1).padStart(2, "0");
      const isAvail = c.status === "AVAILABLE";
      const isBorrowed = c.status === "BORROWED";
      const isDamaged = c.status === "DAMAGED";
      const isLost = c.status === "LOST";
      const isDisposed = c.status === "DISPOSED";

      let statusBadge = "";
      if (isAvail) {
        statusBadge = `<span class="status-badge-avail">● Khả dụng</span>`;
      } else if (isBorrowed) {
        statusBadge = `<div class="status-badge-borrowed"><span>Đang mượn</span></div>`;
      } else if (isDamaged) {
        statusBadge = `<span style="color:#ef4444; font-weight:600; font-size:12.5px;">● Hư hỏng</span>`;
      } else if (isLost) {
        statusBadge = `<span style="color:#b91c1c; font-weight:600; font-size:12.5px;">● Báo mất</span>`;
      } else if (isDisposed) {
        statusBadge = `<span style="color:#6b7280; font-weight:600; font-size:12.5px;">● Đã thanh lý</span>`;
      } else {
        statusBadge = `<span class="status-badge-avail">${escapeHtml(c.status)}</span>`;
      }

      let actionBtn = "";
      if (isAvail) {
        actionBtn = `
          <button type="button" class="btn-copy-action btn-copy-borrow" onclick="addToCartWithAnimation(event, '${escapeHtml(c.copy_code)}')">
            Mượn
          </button>
        `;
      } else if (isBorrowed) {
        actionBtn = `
          <button type="button" class="btn-copy-action btn-copy-reserve" onclick="showToast('Đã ghi nhận yêu cầu đặt trước bản sao ${escapeHtml(c.copy_code)} khi bạn đọc trả sách!', 'success')">
            Đặt trước
          </button>
        `;
      } else {
        actionBtn = `
          <button type="button" class="btn-copy-action" disabled style="opacity:0.5; cursor:not-allowed;">
            Tạm khóa
          </button>
        `;
      }

      return `
        <tr>
          <td class="stt-cell">${stt}</td>
          <td><span class="barcode-badge">${escapeHtml(c.copy_code)}</span></td>
          <td>
            <div class="location-cell">
              <span>📍</span>
              <span>${escapeHtml(c.shelf_location || "Kệ A1")}</span>
            </div>
          </td>
          <td>${escapeHtml(c.condition || "Mới 100%")} • Mượn 14 ngày</td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">${actionBtn}</td>
        </tr>
      `;
    }).join("");
  }

  // 4. TẢI VÀ HIỂN THỊ LỊCH SỬ MƯỢN TRẢ (Task D & C)
  async function loadLoanHistory(isbn) {
    const tabLoansCount = document.getElementById("tabLoansCount");
    const tbody = document.getElementById("loanHistoryTableBody");
    if (!tbody) return;

    try {
      const res = await api.get(`/loans_item/${encodeURIComponent(isbn)}/loan-history`);
      currentLoanHistory = res && Array.isArray(res.items) ? res.items : [];

      if (tabLoansCount) tabLoansCount.textContent = currentLoanHistory.length;

      if (currentLoanHistory.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding: 24px; color: var(--color-muted);">
              Chưa có lượt mượn trả nào được ghi nhận cho đầu sách này.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = currentLoanHistory.map((item) => {
        const isReturned = Boolean(item.return_date);
        const statusClass = isReturned ? "color:#10b981;" : "color:#f59e0b;";
        return `
          <tr>
            <td><strong class="font-mono">${escapeHtml(item.loan_code)}</strong></td>
            <td>${escapeHtml(item.borrower_name || "Độc giả")}</td>
            <td><span class="barcode-badge">${escapeHtml(item.copy_code || "—")}</span></td>
            <td>${formatDate(item.borrow_date)}</td>
            <td>${formatDate(item.due_date)}</td>
            <td>${item.return_date ? formatDate(item.return_date) : "<span style='color:var(--color-muted);'>Chưa trả</span>"}</td>
            <td style="text-align: right; font-weight:600; ${statusClass}">${escapeHtml(item.status)}</td>
          </tr>
        `;
      }).join("");

    } catch (err) {
      console.warn("Lỗi khi tải lịch sử mượn trả của sách:", err);
      if (tabLoansCount) tabLoansCount.textContent = 0;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 20px; color: var(--color-muted);">
            Không thể tải lịch sử mượn hoặc chưa có dữ liệu.
          </td>
        </tr>
      `;
    }
  }

  // 5. TẢI SÁCH LIÊN QUAN CÙNG CHUYÊN NGÀNH
  async function loadRelatedBooks(book) {
    const grid = document.getElementById("relatedBooksGrid");
    if (!grid) return;

    try {
      const params = { page_size: 4 };
      if (book.category && book.category.id) {
        params.category_id = book.category.id;
      }
      const res = await api.get("/books/search", params);
      const items = res && Array.isArray(res.items) ? res.items.filter((b) => b.isbn !== book.isbn) : [];

      if (items.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--color-muted); text-align:center; padding: 20px;">Đang cập nhật thêm tài liệu cùng chuyên ngành.</div>`;
        return;
      }

      grid.innerHTML = items.map((b) => {
        const coverSrc = formatCoverUrl(b.cover_image);
        const authors = Array.isArray(b.authors) ? b.authors.map((a) => a.name).join(", ") : "Tác giả KS25";
        return `
          <div class="related-card" onclick="window.location.href='book_detail.html?isbn=${encodeURIComponent(b.isbn)}'" style="cursor: pointer;">
            <div class="related-cover-box" style="padding:0; overflow:hidden;">
              <img src="${coverSrc}" alt="${escapeHtml(b.title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&q=80'">
            </div>
            <div class="related-info">
              <span class="related-ddc">${escapeHtml(b.isbn)}</span>
              <div class="related-book-title" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</div>
              <div class="related-author">${escapeHtml(authors)}</div>
              <div class="related-bottom-row">
                <span class="related-copies-badge">Còn ${b.available_copies || 0} cuốn</span>
                <a href="book_detail.html?isbn=${encodeURIComponent(b.isbn)}" class="related-link">
                  Chi tiết →
                </a>
              </div>
            </div>
          </div>
        `;
      }).join("");

    } catch (err) {
      console.warn("Không thể tải sách cùng chuyên ngành:", err);
    }
  }

  function renderFallback(isbn) {
    const titleEl = document.getElementById("bookTitle");
    if (titleEl) titleEl.textContent = `Thông tin đầu sách (${isbn || "KS25"})`;
  }

  // 6. HIỆU ỨNG THÊM VÀO GIỎ HÀNG
  window.addToCartWithAnimation = function (e, copyCode = null) {
    if (!checkAuth()) return;

    const btn = e.currentTarget;
    const cartIcon = document.getElementById("headerCartBtn");
    const bookTitle = currentBook ? currentBook.title : "Tài liệu thư viện";

    // Thêm vào giỏ sách lưu trong localStorage (không trùng ISBN)
    const targetIsbn = currentBook ? String(currentBook.isbn || "").trim() : "";
    if (!targetIsbn) {
      showToast("Không xác định được mã ISBN của sách để thêm vào giỏ.");
      return;
    }

    let addStatus = "added";
    if (typeof addBookToLibraryBasket === "function") {
      const result = addBookToLibraryBasket({
        isbn: targetIsbn,
        title: bookTitle,
        copy_code: copyCode || "",
      });
      if (!result.ok && result.reason === "duplicate") {
        addStatus = "duplicate";
      }
    } else {
      try {
        const cartKey = "library_basket";
        const basket = JSON.parse(localStorage.getItem(cartKey) || "[]");
        if (Array.isArray(basket) && basket.some((item) => String(item.isbn) === targetIsbn)) {
          addStatus = "duplicate";
        } else {
          const next = Array.isArray(basket) ? basket : [];
          next.push({
            isbn: targetIsbn,
            title: bookTitle,
            copy_code: copyCode || "",
            selected: true,
            added_at: new Date().toISOString(),
          });
          localStorage.setItem(cartKey, JSON.stringify(next));
        }
      } catch {}
    }
    updateCartBadge();

    if (addStatus === "duplicate") {
      showToast(`"${bookTitle}" đã có trong giỏ mượn của bạn!`);
      return;
    }

    const btnRect = btn.getBoundingClientRect();
    const cartRect = cartIcon ? cartIcon.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20 };

    const flyingEl = document.createElement("div");
    flyingEl.className = "flying-book-clone";
    flyingEl.innerHTML = `<div style="font-size: 26px;">📖</div>`;
    flyingEl.style.left = `${btnRect.left + btnRect.width / 2 - 30}px`;
    flyingEl.style.top = `${btnRect.top + btnRect.height / 2 - 40}px`;
    flyingEl.style.transform = "scale(1)";
    flyingEl.style.opacity = "1";

    document.body.appendChild(flyingEl);

    requestAnimationFrame(() => {
      flyingEl.style.left = `${cartRect.left + 5}px`;
      flyingEl.style.top = `${cartRect.top + 5}px`;
      flyingEl.style.transform = "scale(0.2) rotate(360deg)";
      flyingEl.style.opacity = "0.7";
    });

    setTimeout(() => {
      flyingEl.remove();
      if (cartIcon) {
        cartIcon.classList.add("cart-bounce");
        setTimeout(() => cartIcon.classList.remove("cart-bounce"), 600);
      }
      showToast(`✓ Đã thêm "${bookTitle}" vào giỏ mượn thành công!`);
    }, 750);
  };

  function updateCartBadge() {
    if (typeof syncCartBadges === "function") {
      syncCartBadges();
      return;
    }
    const badge = document.getElementById("headerCartBadge");
    if (!badge) return;
    try {
      const basket = JSON.parse(localStorage.getItem("library_basket") || "[]");
      const count = Array.isArray(basket) ? basket.length : 0;
      badge.textContent = count > 9 ? "9+" : count;
      badge.style.display = count === 0 ? "none" : "flex";
    } catch {
      badge.textContent = 0;
      badge.style.display = "none";
    }
  }

  function showToast(message) {
    const existing = document.querySelector(".custom-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "custom-toast";
    toast.innerHTML = `
      <span style="font-size: 18px;">🛒</span>
      <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  // 7. CHUYỂN ĐỔI TAB NỘI DUNG
  window.switchDetailTab = function (tabName, btn) {
    document.querySelectorAll(".tab-nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane-content").forEach((p) => p.classList.remove("active"));

    if (btn) btn.classList.add("active");

    if (tabName === "copies") {
      const copiesSec = document.querySelector(".copies-section");
      if (copiesSec) {
        copiesSec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      const defPane = document.getElementById("tab-pane-summary");
      if (defPane) defPane.classList.add("active");
      return;
    }

    const pane = document.getElementById(`tab-pane-${tabName}`);
    if (pane) pane.classList.add("active");
  };

  // 8. LỌC BẢNG BẢN SAO THEO KHO
  window.handleCopiesFilter = function (select) {
    const val = select.value;
    const rows = document.querySelectorAll(".copies-table tbody tr");
    rows.forEach((row) => {
      if (!val || val === "all") {
        row.style.display = "";
      } else {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(val.toLowerCase()) ? "" : "none";
      }
    });
  };

  function isSameOriginReferrer(ref) {
    if (!ref) return false;
    try {
      const refUrl = new URL(ref, window.location.href);
      return (
        refUrl.origin === window.location.origin ||
        (window.location.protocol === "file:" && refUrl.protocol === "file:")
      );
    } catch {
      return false;
    }
  }

  function initBackButton() {
    const backBtn = document.getElementById("btnBackPrevious");
    const ref = document.referrer;
    const sameOrigin = isSameOriginReferrer(ref);
    if (backBtn) {
      backBtn.href = sameOrigin && ref !== window.location.href ? ref : "home.html";
    }
    if (sameOrigin) {
      document.querySelectorAll("#navMenu .topbar-nav-link").forEach((link) => {
        const href = link.getAttribute("href");
        if (href && ref.includes(href)) {
          link.classList.add("active");
        }
      });
    }
  }

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
      if (iconEl) iconEl.textContent = "check_circle";
    } else {
      if (iconBox) iconBox.classList.add("icon-blue");
      if (iconEl) iconEl.textContent = "help_outline";
    }

    if (btnProceed) btnProceed.textContent = options.confirmText || "Xác nhận";
    if (btnCancel) btnCancel.textContent = options.cancelText || "Hủy";

    activeConfirmCallback = options.onConfirm || null;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("active");
  }

  function closeConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    if (modal) {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    }
    activeConfirmCallback = null;
  }

  function initTopbarControls() {
    const mobileMenuToggle = document.getElementById("mobileMenuToggle");
    const navMenu = document.getElementById("navMenu");
    const userProfileBtn = document.getElementById("userProfileBtn");
    const userDropdownMenu = document.getElementById("userDropdownMenu");

    if (mobileMenuToggle && navMenu) {
      mobileMenuToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        navMenu.classList.toggle("show");
      });
    }

    if (userProfileBtn && userDropdownMenu) {
      userProfileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdownMenu.classList.toggle("show");
        const isShown = userDropdownMenu.classList.contains("show");
        userProfileBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
      });
    }

    document.addEventListener("click", (e) => {
      if (userDropdownMenu && userDropdownMenu.classList.contains("show") && !e.target.closest("#userDropdownContainer")) {
        userDropdownMenu.classList.remove("show");
        if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
      }
      if (navMenu && navMenu.classList.contains("show") && !e.target.closest("#navMenu") && !e.target.closest("#mobileMenuToggle")) {
        navMenu.classList.remove("show");
      }

      if (e.target.closest("#logoutMenuBtn")) {
        e.preventDefault();
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
            window.location.href = "login.html#login";
          }
        });
      }
    });

    document.getElementById("btn-confirm-cancel")?.addEventListener("click", closeConfirmModal);
    document.getElementById("btn-confirm-proceed")?.addEventListener("click", () => {
      const cb = activeConfirmCallback;
      closeConfirmModal();
      if (typeof cb === "function") cb();
    });
    document.getElementById("confirm-modal")?.addEventListener("click", (e) => {
      if (e.target && e.target.id === "confirm-modal") closeConfirmModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeConfirmModal();
        if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
          userDropdownMenu.classList.remove("show");
          if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
        }
        if (navMenu && navMenu.classList.contains("show")) {
          navMenu.classList.remove("show");
        }
      }
    });
  }

  window.goBackToPreviousPage = function (event) {
    if (event) event.preventDefault();
    const ref = document.referrer;
    const sameOrigin = isSameOriginReferrer(ref);

    if (window.history.length > 1 && (!ref || sameOrigin)) {
      window.history.back();
      return false;
    }
    if (sameOrigin && ref !== window.location.href) {
      window.location.href = ref;
      return false;
    }
    window.location.href = "home.html";
    return false;
  };

  // KHỞI CHẠY KHI TẢI TRANG
  document.addEventListener("DOMContentLoaded", () => {
    initBackButton();
    initTopbarControls();
    checkAuth();
    loadBookData();
    updateCartBadge();

    const headerEl = document.getElementById("app-header");
    window.addEventListener("scroll", () => {
      if (headerEl) {
        if (window.scrollY > 20) {
          headerEl.classList.add("scrolled");
        } else {
          headerEl.classList.remove("scrolled");
        }
      }
    });
  });

})();
