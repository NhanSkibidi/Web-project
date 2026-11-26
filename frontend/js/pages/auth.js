// ==============================================================================
// KS25 Library - Authentication Logic (Login & Register)
// ==============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Đảm bảo chỉ dùng giao diện Sáng chuẩn thiết kế (xoá dark theme & tuỳ chọn ngôn ngữ cũ nếu từng lưu)
  document.documentElement.removeAttribute("data-theme");
  localStorage.removeItem("ks25_theme");
  localStorage.removeItem("ks25_lang");

  const tabLoginBtn = document.getElementById("tab-login-btn");
  const tabRegisterBtn = document.getElementById("tab-register-btn");
  const loginPane = document.getElementById("login-pane");
  const registerPane = document.getElementById("register-pane");
  const userActiveCard = document.getElementById("user-active-card");
  const authTabsContainer = document.getElementById("auth-tabs-container");

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginAlert = document.getElementById("login-alert");
  const registerAlert = document.getElementById("register-alert");

  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const loginRememberInput = document.getElementById("login-remember");
  const btnLoginSubmit = document.getElementById("btn-login-submit");
  const btnRegisterSubmit = document.getElementById("btn-register-submit");

  // ---------- 1. Chuyển đổi Tab Đăng nhập / Đăng ký ----------
  function switchTab(tab) {
    if (tab === "register") {
      tabRegisterBtn?.classList.add("active");
      tabLoginBtn?.classList.remove("active");
      registerPane?.classList.add("active");
      loginPane?.classList.remove("active");
      if (registerPane) registerPane.style.display = "block";
      if (loginPane) loginPane.style.display = "none";
      window.location.hash = "register";
    } else {
      tabLoginBtn?.classList.add("active");
      tabRegisterBtn?.classList.remove("active");
      loginPane?.classList.add("active");
      registerPane?.classList.remove("active");
      if (loginPane) loginPane.style.display = "block";
      if (registerPane) registerPane.style.display = "none";
      window.location.hash = "login";
    }
    hideAlerts();
  }

  tabLoginBtn?.addEventListener("click", () => switchTab("login"));
  tabRegisterBtn?.addEventListener("click", () => switchTab("register"));

  if (window.location.hash === "#register") {
    switchTab("register");
  } else {
    switchTab("login");
  }

  // ---------- 2. Hiển thị thông báo & Liên kết hỗ trợ ----------
  function showAlert(element, message, type = "error") {
    if (!element) return;
    element.className = `alert-box alert-${type}`;
    element.textContent = message;
    element.style.display = "block";
  }

  function hideAlerts() {
    if (loginAlert) loginAlert.style.display = "none";
    if (registerAlert) registerAlert.style.display = "none";
  }

  const forgotLink = loginPane?.querySelector(".form-link");
  forgotLink?.addEventListener("click", (e) => {
    e.preventDefault();
    showAlert(
      loginAlert,
      "Vui lòng liên hệ quầy thủ thư hoặc email thuvien@ks25.edu.vn để đặt lại mật khẩu.",
      "info"
    );
  });

  const footerAlerts = [
    "Trung tâm trợ giúp: Liên hệ bàn thủ thư quầy tầng 1 hoặc email thuvien@ks25.edu.vn.",
    "Quy định mượn trả: Mỗi độc giả được mượn tối đa 5 cuốn sách trong thời hạn 14 ngày. Phạt quá hạn 2.000đ/cuốn/ngày.",
    "Hỗ trợ sinh viên: Sinh viên khóa mới mang thẻ SV tới quầy để đồng bộ RFID tự động.",
  ];
  document.querySelectorAll(".app-footer .footer-link").forEach((link, idx) => {
    if (!footerAlerts[idx]) return;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof showToast === "function") {
        showToast(footerAlerts[idx], "success");
      } else {
        showAlert(loginAlert, footerAlerts[idx], "info");
      }
    });
  });

  // ---------- 3. Ẩn / Hiện mật khẩu ----------
  document.querySelectorAll(".toggle-password-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const targetInput = document.getElementById(targetId);
      if (!targetInput) return;

      if (targetInput.type === "password") {
        targetInput.type = "text";
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      } else {
        targetInput.type = "password";
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
  });

  // ---------- 4. Nút điền nhanh Tài khoản Demo ----------
  const DEMO_ACCOUNTS = {
    reader: {
      email: "docgia01@library.com",
      pass: "Docgia@123",
      label: "Độc giả",
    },
    librarian: {
      email: "thuthu1@library.com",
      pass: "Thuthu@123",
      label: "Thủ thư",
    },
    admin: {
      email: "admin@library.com",
      pass: "Admin@123",
      label: "Quản trị viên",
    },
  };

  document.querySelectorAll(".demo-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const role = btn.getAttribute("data-role");
      const creds = DEMO_ACCOUNTS[role];
      if (creds && loginEmailInput && loginPasswordInput) {
        switchTab("login");
        loginEmailInput.value = creds.email;
        loginPasswordInput.value = creds.pass;
        loginEmailInput.focus();
        showAlert(
          loginAlert,
          `Đã điền tài khoản mẫu [${creds.label}: ${creds.email}]. Bấm "Đăng nhập" để vào hệ thống.`,
          "success"
        );
      }
    });
  });

  // ---------- 5. Kiểm tra phiên đăng nhập hiện tại ----------
  async function checkCurrentUser() {
    if (!auth.getToken()) return;
    const user = await auth.syncSession();
    if (user && user.id) {
      showUserCard(user, auth.getCard());
    }
  }

  function showUserCard(user, card = null) {
    if (!userActiveCard) return;

    document.getElementById("user-card-name").textContent = user.full_name || user.email;
    document.getElementById("user-card-email").textContent = user.email;
    document.getElementById("user-card-phone").textContent = user.phone || "—";

    const roleLabels = {
      ADMIN: "Quản trị viên (ADMIN)",
      LIBRARIAN: "Thủ thư (LIBRARIAN)",
      READER: "Độc giả (READER)",
    };
    document.getElementById("user-card-role").textContent = roleLabels[user.role] || user.role;

    const cardCodeEl = document.getElementById("user-card-code");
    if (cardCodeEl) {
      cardCodeEl.textContent = card?.card_code
        ? `${card.card_code} (${card.status} · max ${card.max_borrow_books})`
        : user.role === "READER"
        ? "Chưa đồng bộ thẻ"
        : "Tài khoản Nhân sự / Quản trị";
    }

    const isStaffUser = user.role === "ADMIN" || user.role === "LIBRARIAN";
    const headerBrand = document.querySelector(".librarian-topbar .brand-badge");
    const headerNav = document.querySelector(".librarian-topbar .topbar-nav");
    if (isStaffUser) {
      if (headerBrand) {
        headerBrand.setAttribute("href", "staff-dashboard.html");
        headerBrand.setAttribute("title", "UniLib - Bàn làm việc quản trị");
      }
      if (headerNav) headerNav.style.display = "none";
    } else {
      if (headerBrand) {
        headerBrand.setAttribute("href", "home.html");
        headerBrand.setAttribute("title", "UniLib - Trở về Trang chủ");
      }
      if (headerNav) headerNav.style.display = "";
    }

    const goHomeBtn = document.getElementById("btn-go-dashboard");
    if (goHomeBtn) {
      if (isStaffUser) {
        goHomeBtn.href = "staff-dashboard.html";
        goHomeBtn.textContent = "Vào Bàn làm việc Thủ thư →";
      } else {
        goHomeBtn.href = "home.html";
        goHomeBtn.textContent = "Vào Cổng Độc giả →";
      }
    }

    const initial = (user.full_name || user.email).charAt(0).toUpperCase();
    document.getElementById("user-card-avatar").textContent = initial;

    if (loginPane) loginPane.style.display = "none";
    if (registerPane) registerPane.style.display = "none";
    if (authTabsContainer) authTabsContainer.style.display = "none";
    userActiveCard.style.display = "block";
  }

  // Nút Đăng xuất
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    auth.clearSession();
    const headerBrand = document.querySelector(".librarian-topbar .brand-badge");
    const headerNav = document.querySelector(".librarian-topbar .topbar-nav");
    if (headerBrand) {
      headerBrand.setAttribute("href", "home.html");
      headerBrand.setAttribute("title", "UniLib - Trở về Trang chủ");
    }
    if (headerNav) headerNav.style.display = "";
    userActiveCard.style.display = "none";
    if (authTabsContainer) authTabsContainer.style.display = "flex";
    switchTab("login");
    showAlert(loginAlert, "Đã đăng xuất khỏi hệ thống.", "success");
  });

  // Nút Đổi tài khoản
  document.getElementById("btn-switch-account")?.addEventListener("click", () => {
    userActiveCard.style.display = "none";
    if (authTabsContainer) authTabsContainer.style.display = "flex";
    switchTab("login");
  });

  // ---------- 6. Xử lý Submit Form Đăng nhập ----------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlerts();

    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    const remember = loginRememberInput ? loginRememberInput.checked : true;

    if (!email || !password) {
      showAlert(loginAlert, "Vui lòng nhập đầy đủ địa chỉ email và mật khẩu.");
      return;
    }

    try {
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.innerHTML = "<span>Đang xác thực...</span>";

      const res = await api.post("/auth/login", { email, password });
      auth.setToken(res.access_token, remember);

      const user = await auth.syncSession();
      if (!user) {
        throw new Error("Không lấy được thông tin tài khoản sau khi đăng nhập.");
      }

      const savedRedirect = sessionStorage.getItem("redirect_after_login");
      sessionStorage.removeItem("redirect_after_login");

      const isStaff = user.role === "ADMIN" || user.role === "LIBRARIAN";
      const isReaderTarget = (() => {
        if (!savedRedirect) return false;
        if (typeof window.isReaderOnlyPath === "function") {
          try {
            return window.isReaderOnlyPath(new URL(savedRedirect, window.location.href).pathname);
          } catch {
            return false;
          }
        }
        return /\/(home|index|search|catalog|book_detail|loan_slip|reservations|loan_basket)\.html(?:[?#]|$)/i.test(savedRedirect);
      })();

      const canUseRedirect =
        savedRedirect &&
        !savedRedirect.includes("login.html") &&
        !savedRedirect.includes("auth.html") &&
        !savedRedirect.includes("index.html") &&
        !(isStaff && isReaderTarget);

      const targetUrl = canUseRedirect
        ? savedRedirect
        : isStaff
        ? "staff-dashboard.html"
        : "home.html";

      showAlert(
        loginAlert,
        `Đăng nhập thành công! Xin chào ${user.full_name} (${user.role}). Đang chuyển hướng...`,
        "success"
      );

      setTimeout(() => {
        window.location.href = targetUrl;
      }, 650);
    } catch (err) {
      showAlert(
        loginAlert,
        err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu."
      );
    } finally {
      btnLoginSubmit.disabled = false;
      btnLoginSubmit.innerHTML = "<span>Đăng nhập →</span>";
    }
  });

  // ---------- 7. Xử lý Submit Form Đăng ký ----------
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlerts();

    const fullName = document.getElementById("reg-fullname")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim();
    const phone = document.getElementById("reg-phone")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const confirmPassword = document.getElementById("reg-password-confirm")?.value;
    const termsChecked = document.getElementById("reg-terms")?.checked;

    if (!fullName || !email || !password || !confirmPassword) {
      showAlert(registerAlert, "Vui lòng điền đầy đủ các trường bắt buộc (*).");
      return;
    }

    if (password.length < 8) {
      showAlert(registerAlert, "Mật khẩu phải có độ dài tối thiểu 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      showAlert(registerAlert, "Mật khẩu xác nhận lại không khớp.");
      return;
    }

    if (!termsChecked) {
      showAlert(registerAlert, "Vui lòng đồng ý tuân thủ Quy chế Thư viện số KS25.");
      return;
    }

    try {
      btnRegisterSubmit.disabled = true;
      btnRegisterSubmit.innerHTML = "<span>Đang khởi tạo thẻ & tài khoản...</span>";

      const payload = {
        email: email,
        password: password,
        full_name: fullName,
        phone: phone || null,
      };

      const res = await api.post("/auth/register", payload);
      if (res.user) {
        auth.setUser(res.user);
      }
      if (res.library_card) {
        auth.setCard(res.library_card);
      }

      const loginRes = await api.post("/auth/login", { email, password });
      auth.setToken(loginRes.access_token, true);

      const cardCode = res.library_card?.card_code || "LC-NEW";
      showAlert(
        registerAlert,
        `Đăng ký thành công! Mã thẻ thư viện của bạn là ${cardCode}. Đang vào Trang chủ...`,
        "success"
      );

      setTimeout(() => {
        window.location.href = "home.html";
      }, 900);

      registerForm.reset();
    } catch (err) {
      showAlert(
        registerAlert,
        err.message || "Đăng ký thất bại. Email có thể đã tồn tại."
      );
    } finally {
      btnRegisterSubmit.disabled = false;
      btnRegisterSubmit.innerHTML = "<span>Tạo tài khoản bạn đọc →</span>";
    }
  });

  // ---------- 8. Tra cứu nhanh danh mục sách ở cột trái ----------
  const searchInput = document.getElementById("quick-search-input");
  const searchSelect = document.getElementById("quick-search-category");
  const searchBtn = document.getElementById("quick-search-btn");
  const quickTagsContainer = document.getElementById("quick-tags-container");
  const searchResultsPreview = document.getElementById("search-results-preview");
  const searchResultsList = document.getElementById("search-results-list");

  function renderQuickCategoryOptions(categories) {
    if (!searchSelect) return;
    const prevValue = searchSelect.value;
    const items = Array.isArray(categories) ? categories : [];
    const optionsHtml = items
      .filter((c) => c && c.id != null && c.name)
      .map((c) => `<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.name)}</option>`)
      .join("");
    searchSelect.innerHTML = `<option value="">Tất cả thể loại</option>${optionsHtml}`;
    if (prevValue && items.some((c) => String(c.id) === prevValue)) {
      searchSelect.value = prevValue;
    }
  }

  function renderQuickSuggestionTags(suggestions, isError = false) {
    if (!quickTagsContainer) return;
    const labelHtml = '<span class="tag-label">Gợi ý tìm kiếm:</span>';
    if (isError) {
      quickTagsContainer.innerHTML = `${labelHtml}<span class="tag-label">Không tải được gợi ý từ máy chủ.</span>`;
      return;
    }
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      quickTagsContainer.innerHTML = `${labelHtml}<span class="tag-label">Chưa có dữ liệu sách trong hệ thống.</span>`;
      return;
    }

    quickTagsContainer.innerHTML = `${labelHtml}${suggestions
      .map(
        (text) =>
          `<button type="button" class="tag-pill" data-keyword="${escapeHtml(text)}">${escapeHtml(text)}</button>`
      )
      .join("")}`;

    quickTagsContainer.querySelectorAll(".tag-pill").forEach((tag) => {
      tag.addEventListener("click", () => {
        const text = tag.getAttribute("data-keyword") || tag.textContent.trim();
        if (searchInput) searchInput.value = text;
        if (searchSelect) searchSelect.value = "";
        executeQuickSearch(text);
      });
    });
  }

  function buildQuickSuggestions(facetCategories, books) {
    const picked = [];
    const seen = new Set();
    const pushUnique = (text) => {
      const normalized = String(text || "").trim();
      if (!normalized) return false;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      picked.push(normalized);
      return true;
    };

    const sortedBooks = [...(Array.isArray(books) ? books : [])].sort(
      (a, b) => Number(b?.borrowed_copies || 0) - Number(a?.borrowed_copies || 0)
    );
    const populatedCategories = (Array.isArray(facetCategories) ? facetCategories : []).filter(
      (c) => c && c.name && Number(c.count || 0) > 0
    );

    // Ưu tiên 2 đầu sách nổi bật + 2 thể loại có sách trong DB, sau đó bù cho đủ tối đa 4 gợi ý
    for (const book of sortedBooks) {
      if (picked.length >= 2) break;
      pushUnique(book?.title);
    }
    for (const cat of populatedCategories) {
      if (picked.length >= 4) break;
      pushUnique(cat?.name);
    }
    for (const book of sortedBooks) {
      if (picked.length >= 4) break;
      pushUnique(book?.title);
    }
    for (const cat of populatedCategories) {
      if (picked.length >= 4) break;
      pushUnique(cat?.name);
    }
    return picked;
  }

  async function loadQuickSearchMetadata() {
    const [catsResult, facetsResult, booksResult] = await Promise.allSettled([
      api.get("/categories/all"),
      api.get("/books/facets"),
      api.get("/books/search", {
        page: 1,
        page_size: 20,
        sort_by: "created_at",
        sort_order: "desc",
      }),
    ]);

    const allCategories =
      catsResult.status === "fulfilled" && Array.isArray(catsResult.value) ? catsResult.value : [];
    const facetCategories =
      facetsResult.status === "fulfilled" && Array.isArray(facetsResult.value?.categories)
        ? facetsResult.value.categories
        : [];
    const bookItems =
      booksResult.status === "fulfilled" && Array.isArray(booksResult.value?.items)
        ? booksResult.value.items
        : [];

    renderQuickCategoryOptions(allCategories.length ? allCategories : facetCategories);

    const anySourceOk =
      catsResult.status === "fulfilled" ||
      facetsResult.status === "fulfilled" ||
      booksResult.status === "fulfilled";
    const categorySuggestions =
      facetsResult.status === "fulfilled"
        ? facetCategories
        : allCategories.map((c) => ({ ...c, count: 1 }));
    const suggestions = buildQuickSuggestions(categorySuggestions, bookItems);
    renderQuickSuggestionTags(suggestions, !anySourceOk);
  }

  async function executeQuickSearch(keyword) {
    const hasCategory = Boolean(searchSelect && searchSelect.value);
    if (!keyword && !hasCategory) {
      if (searchResultsPreview) searchResultsPreview.style.display = "none";
      return;
    }
    try {
      if (searchResultsPreview) searchResultsPreview.style.display = "block";
      if (searchResultsList) {
        searchResultsList.innerHTML =
          '<div style="padding: 10px; color: var(--color-text-muted); font-size: 13px;">Đang tra cứu danh mục sách...</div>';
      }

      const params = { page: 1, page_size: 5 };
      if (keyword) params.keyword = keyword;
      if (searchSelect && searchSelect.value) params.category_id = searchSelect.value;

      const res = await api.get("/books/search", params);

      if (!res.items || res.items.length === 0) {
        searchResultsList.innerHTML =
          '<div style="padding: 8px 10px; color: var(--color-text-muted); font-size: 13px;">Không tìm thấy đầu sách phù hợp.</div>';
        return;
      }

      searchResultsList.innerHTML = res.items
        .map(
          (b) => `
        <div class="search-result-item">
          <div>
            <strong>${escapeHtml(b.title)}</strong>
            <div style="font-size: 11px; color: var(--color-text-muted);">
              Tác giả: ${escapeHtml(
                b.authors?.map((a) => a.name).join(", ") || "Chưa rõ"
              )} · ISBN: <span style="font-family: var(--font-mono);">${escapeHtml(b.isbn)}</span>
            </div>
          </div>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: 6px; background: ${
            b.available_copies > 0 ? "#ECFDF5" : "#FEF2F2"
          }; color: ${b.available_copies > 0 ? "#15803D" : "#991B1B"}; font-weight: 600;">
            ${
              b.available_copies > 0
                ? `Sẵn sàng (${b.available_copies})`
                : "Hết bản sao"
            }
          </span>
        </div>
      `
        )
        .join("");
    } catch {
      if (searchResultsList) {
        searchResultsList.innerHTML =
          '<div style="padding: 8px; color: var(--color-accent-danger); font-size: 12px;">Không kết nối được máy chủ tra cứu sách.</div>';
      }
    }
  }

  searchBtn?.addEventListener("click", () => {
    executeQuickSearch(searchInput?.value.trim() || "");
  });

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeQuickSearch(searchInput.value.trim());
    }
  });

  searchSelect?.addEventListener("change", () => {
    executeQuickSearch(searchInput?.value.trim() || "");
  });

  // Nạp dữ liệu thể loại & gợi ý từ DB + kiểm tra trạng thái đăng nhập khi mở trang
  loadQuickSearchMetadata();
  checkCurrentUser();
});
