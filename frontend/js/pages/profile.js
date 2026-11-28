// ==============================================================================
// UniLib / KS25 Library — Hồ sơ Cá nhân & Đổi mật khẩu (profile.js)
// - Độc giả / Thủ thư / Admin xem và chỉnh sửa hồ sơ: GET/PUT /api/users/me
// - Đổi mật khẩu có kiểm tra mật khẩu cũ: POST /api/users/me/change-password
// ==============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const mainEl = document.getElementById("profile-main");

  const ROLE_TEXT = {
    ADMIN: "Quản trị viên (ADMIN)",
    LIBRARIAN: "Thủ thư (LIBRARIAN)",
    READER: "Độc giả (READER)",
  };

  function renderAuthGuard() {
    sessionStorage.setItem("redirect_after_login", window.location.href);
    if (mainEl) {
      mainEl.innerHTML = `
        <div class="guard-box">
          <div style="margin-bottom: 10px;">
            <span class="material-symbols-outlined" style="font-size: 40px; color: var(--warning);">lock</span>
          </div>
          <div style="font-family:var(--font-mono); font-size:12px; color:var(--muted);">HTTP 401 · UNAUTHORIZED</div>
          <h2 style="font-family:var(--font-serif); margin:8px 0;">Vui lòng đăng nhập</h2>
          <p style="color:var(--muted); font-size:14px; margin-bottom:22px;">
            Bạn cần đăng nhập tài khoản Độc giả, Thủ thư hoặc Quản trị viên để xem hồ sơ và đổi mật khẩu.
          </p>
          <a href="login.html#login" class="btn btn-primary">
            <span>Đăng nhập ngay</span>
            <span class="material-symbols-outlined" style="font-size: 17px;">arrow_forward</span>
          </a>
        </div>`;
    }
  }

  if (!auth.getToken()) {
    renderAuthGuard();
    return;
  }

  let currentProfile = null;

  function formatDateVN(val) {
    if (!val) return "--/--/----";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  function showInlineAlert(el, message, type = "success") {
    if (!el) return;
    el.className = `inline-alert alert-${type}`;
    el.innerHTML = "";
    const iconEl = document.createElement("span");
    iconEl.className = "material-symbols-outlined";
    iconEl.style.fontSize = "18px";
    iconEl.style.flexShrink = "0";
    iconEl.textContent = type === "error" ? "error" : "check_circle";
    const textEl = document.createElement("span");
    textEl.textContent = message;
    el.appendChild(iconEl);
    el.appendChild(textEl);
  }

  function clearInlineAlert(el) {
    if (!el) return;
    el.className = "inline-alert";
    el.textContent = "";
  }

  let profileFallbackHref = "home.html";

  function isSameOriginUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url, window.location.href);
      return (
        parsed.origin === window.location.origin ||
        (window.location.protocol === "file:" && parsed.protocol === "file:")
      );
    } catch {
      return false;
    }
  }

  function isUsablePreviousUrl(url) {
    if (!isSameOriginUrl(url)) return false;
    if (url === window.location.href) return false;
    if (/\/login\.html(?:[?#]|$)/i.test(url)) return false;
    const role =
      typeof auth !== "undefined" && typeof auth.getUser === "function" && auth.getUser()?.role
        ? String(auth.getUser().role).toUpperCase()
        : "";
    if ((role === "ADMIN" || role === "LIBRARIAN") && typeof window.isReaderOnlyPath === "function") {
      try {
        const parsed = new URL(url, window.location.href);
        if (window.isReaderOnlyPath(parsed.pathname)) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  function setupBackButton(fallbackHref) {
    profileFallbackHref = fallbackHref || "home.html";
    const backBtn = document.getElementById("pf-back-home-btn");
    if (!backBtn) return;

    const ref = document.referrer;
    backBtn.href = isUsablePreviousUrl(ref) ? ref : profileFallbackHref;

    if (!backBtn.dataset.backBound) {
      backBtn.dataset.backBound = "1";
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const curRef = document.referrer;
        if (isUsablePreviousUrl(curRef) && window.history.length > 1) {
          window.history.back();
          return;
        }
        if (isUsablePreviousUrl(curRef)) {
          window.location.href = curRef;
          return;
        }
        window.location.href = profileFallbackHref;
      });
    }
  }

  function renderNavigation(role) {
    const brandLink = document.getElementById("pf-brand-link");
    const navEl = document.getElementById("pf-top-nav");

    const footerLeft = document.querySelector(".app-footer .footer-left");
    if (footerLeft) {
      footerLeft.textContent =
        role === "ADMIN" || role === "LIBRARIAN"
          ? "© 2026 KS25 Library System - Phân hệ Thủ thư Quản trị. Bảo lưu mọi quyền."
          : "© 2026 KS25 Library System - Cổng Tra Cứu & Độc Giả Sinh Viên. Bảo lưu mọi quyền.";
    }

    let homeHref = "home.html";
    if (role === "ADMIN" || role === "LIBRARIAN") {
      homeHref = "staff-dashboard.html";
      if (navEl) {
        navEl.innerHTML = "";
        navEl.style.display = "none";
      }
    } else {
      homeHref = "home.html";
      if (navEl) {
        navEl.style.display = "";
        navEl.innerHTML = `
          <a href="home.html">Trang chủ</a>
          <a href="search.html">Tra cứu sách</a>
          <a href="loan_slip.html">Phiếu mượn</a>
          <a href="reservations.html">Đặt trước</a>
          <a href="fines.html">Tiền phạt</a>
        `;
      }
    }

    setupBackButton(homeHref);
    if (brandLink) brandLink.href = homeHref;
  }

  function bindProfileToUI(profile) {
    currentProfile = profile;
    auth.setUser({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      role: profile.role,
      status: profile.status,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    });
    if (profile.library_card) {
      auth.setCard(profile.library_card);
    }

    const initial = (profile.full_name || profile.email || "U").charAt(0).toUpperCase();
    document.getElementById("pf-avatar").textContent = initial;
    document.getElementById("pf-display-name").textContent = profile.full_name || profile.email;
    document.getElementById("pf-role-pill").textContent = ROLE_TEXT[profile.role] || profile.role;

    const statusPill = document.getElementById("pf-status-pill");
    statusPill.textContent = profile.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa";
    statusPill.className = `status-pill ${profile.status === "ACTIVE" ? "status-active" : "status-locked"}`;

    document.getElementById("pf-meta-id").textContent = `#${profile.id}`;
    document.getElementById("pf-meta-email").textContent = profile.email;
    document.getElementById("pf-meta-phone").textContent = profile.phone || "Chưa cập nhật";
    document.getElementById("pf-meta-created").textContent = formatDateVN(profile.created_at);

    // Fill Edit Form
    document.getElementById("input-full-name").value = profile.full_name || "";
    document.getElementById("input-email").value = profile.email || "";
    document.getElementById("input-phone").value = profile.phone || "";
    document.getElementById("input-role-readonly").value = ROLE_TEXT[profile.role] || profile.role;
    document.getElementById("input-status-readonly").value =
      profile.status === "ACTIVE" ? "ACTIVE — Đang hoạt động" : "LOCKED — Đã bị khóa";

    // Library Card section for Readers
    const cardSection = document.getElementById("pf-card-section");
    if (profile.library_card && cardSection) {
      const c = profile.library_card;
      cardSection.hidden = false;
      document.getElementById("pf-card-code").textContent = c.card_code;
      document.getElementById("pf-card-type").textContent = c.card_type || "STANDARD";
      document.getElementById("pf-card-issue").textContent = formatDateVN(c.issue_date);
      document.getElementById("pf-card-expiry").textContent = formatDateVN(c.expiry_date);
      document.getElementById("pf-card-limit").textContent = `${c.max_borrow_books || 5} cuốn`;

      const pill = document.getElementById("pf-card-status-pill");
      const statusTxt = document.getElementById("pf-card-status-text");
      if (c.status === "ACTIVE") {
        pill.textContent = "Hoạt động";
        pill.className = "status-pill status-active";
        statusTxt.textContent = "ĐANG HOẠT ĐỘNG";
      } else if (c.status === "EXPIRED") {
        pill.textContent = "Hết hạn";
        pill.className = "status-pill status-expired";
        statusTxt.textContent = "ĐÃ HẾT HẠN";
      } else {
        pill.textContent = "Tạm khóa";
        pill.className = "status-pill status-locked";
        statusTxt.textContent = "TẠM KHÓA";
      }
    } else if (cardSection) {
      cardSection.hidden = true;
    }

    renderNavigation(profile.role);
  }

  // ---------- 1. TẢI HỒ SƠ HIỆN TẠI (GET /api/users/me) ----------
  async function loadProfile() {
    try {
      const profile = await api.get("/users/me");
      bindProfileToUI(profile);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        renderAuthGuard();
        return;
      }
      showToast(err.message || "Không tải được hồ sơ cá nhân", "error");
    }
  }

  // ---------- 2. CẬP NHẬT HỒ SƠ (PUT /api/users/me) ----------
  const profileAlert = document.getElementById("profile-alert");

  document.getElementById("btn-reset-profile")?.addEventListener("click", () => {
    clearInlineAlert(profileAlert);
    if (currentProfile) bindProfileToUI(currentProfile);
  });

  document.getElementById("profile-edit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearInlineAlert(profileAlert);

    const fullName = document.getElementById("input-full-name").value.trim();
    const email = document.getElementById("input-email").value.trim();
    const phone = document.getElementById("input-phone").value.trim();
    const btn = document.getElementById("btn-save-profile");

    if (!fullName) {
      showInlineAlert(profileAlert, "Họ và tên không được để trống.", "error");
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = "Đang lưu...";
      const updated = await api.put("/users/me", {
        full_name: fullName,
        email: email,
        phone: phone || null,
      });
      bindProfileToUI(updated);
      showInlineAlert(profileAlert, "Đã cập nhật thông tin hồ sơ cá nhân thành công!", "success");
      showToast("Đã lưu thông tin hồ sơ!");
    } catch (err) {
      showInlineAlert(profileAlert, err.message, "error");
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Lưu thay đổi hồ sơ";
    }
  });

  // ---------- 3. ĐỔI MẬT KHẨU (POST /api/users/me/change-password) ----------
  const passwordAlert = document.getElementById("password-alert");
  const newPwInput = document.getElementById("input-new-password");
  const strengthFill = document.getElementById("pw-strength-fill");
  const strengthText = document.getElementById("pw-strength-text");

  newPwInput?.addEventListener("input", () => {
    const val = newPwInput.value;
    let score = 0;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 1;
    if (/[0-9]/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;

    const map = [
      { w: "0%", c: "#ECEAE4", t: "Nên kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt." },
      { w: "25%", c: "#DC2626", t: "Mật khẩu yếu — cần tối thiểu 8 ký tự." },
      { w: "50%", c: "#D97706", t: "Độ mạnh trung bình — nên thêm số hoặc ký tự đặc biệt." },
      { w: "75%", c: "#2563EB", t: "Mật khẩu khá mạnh." },
      { w: "100%", c: "#15803D", t: "Mật khẩu rất mạnh và an toàn." },
    ];
    const info = val.length === 0 ? map[0] : map[Math.max(1, score)];
    if (strengthFill) {
      strengthFill.style.width = info.w;
      strengthFill.style.background = info.c;
    }
    if (strengthText) strengthText.textContent = info.t;
  });

  document.getElementById("change-password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearInlineAlert(passwordAlert);

    const oldPassword = document.getElementById("input-old-password").value;
    const newPassword = document.getElementById("input-new-password").value;
    const confirmPassword = document.getElementById("input-confirm-password").value;
    const btn = document.getElementById("btn-submit-password");

    if (!oldPassword) {
      showInlineAlert(passwordAlert, "Vui lòng nhập mật khẩu hiện tại (mật khẩu cũ).", "error");
      return;
    }
    if (newPassword.length < 8) {
      showInlineAlert(passwordAlert, "Mật khẩu mới phải có ít nhất 8 ký tự.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showInlineAlert(passwordAlert, "Mật khẩu xác nhận không khớp với mật khẩu mới.", "error");
      return;
    }
    if (newPassword === oldPassword) {
      showInlineAlert(passwordAlert, "Mật khẩu mới phải khác mật khẩu hiện tại.", "error");
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = "Đang xác minh mật khẩu cũ...";
      const res = await api.post("/users/me/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      e.target.reset();
      if (strengthFill) strengthFill.style.width = "0%";
      if (strengthText) strengthText.textContent = "Nên kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.";
      showInlineAlert(passwordAlert, res.message || "Đổi mật khẩu thành công!", "success");
      showToast("Đổi mật khẩu thành công!");
    } catch (err) {
      showInlineAlert(passwordAlert, err.message, "error");
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Cập nhật mật khẩu mới";
    }
  });

  // Ẩn / Hiện mật khẩu
  document.querySelectorAll("[data-toggle-pw]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.getAttribute("data-toggle-pw"));
      if (!target) return;
      const showPw = target.type === "password";
      target.type = showPw ? "text" : "password";
      const iconEl = btn.querySelector(".material-symbols-outlined");
      if (iconEl) iconEl.textContent = showPw ? "visibility_off" : "visibility";
    });
  });

  // Đăng xuất với hộp thoại xác nhận
  const confirmModal = document.getElementById("confirm-modal");
  const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
  const btnConfirmProceed = document.getElementById("btn-confirm-proceed");

  function openLogoutConfirm() {
    if (!confirmModal) {
      auth.clearSession();
      window.location.href = "login.html#login";
      return;
    }
    confirmModal.setAttribute("aria-hidden", "false");
    confirmModal.classList.add("active");
  }

  function closeLogoutConfirm() {
    if (!confirmModal) return;
    confirmModal.classList.remove("active");
    confirmModal.setAttribute("aria-hidden", "true");
  }

  document.getElementById("btn-pf-logout")?.addEventListener("click", openLogoutConfirm);
  btnConfirmCancel?.addEventListener("click", closeLogoutConfirm);
  btnConfirmProceed?.addEventListener("click", () => {
    closeLogoutConfirm();
    auth.clearSession();
    window.location.href = "login.html#login";
  });
  confirmModal?.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeLogoutConfirm();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && confirmModal?.classList.contains("active")) {
      closeLogoutConfirm();
    }
  });

  const cachedUser = typeof auth.getUser === "function" ? auth.getUser() : null;
  if (cachedUser && cachedUser.role) {
    renderNavigation(cachedUser.role);
  }

  loadProfile();
});
