// ==============================================================================
// UniLib / KS25 Library — Admin Quản lý Tài khoản Thủ thư (admin-users.js)
// - Chỉ cho phép ADMIN (401 nếu chưa đăng nhập, 403 nếu LIBRARIAN/READER)
// - Kết nối: GET/POST /api/admin/librarians, PUT /{id}, POST /{id}/lock, /{id}/unlock
// ==============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const mainEl = document.getElementById("admin-users-main");

  // ---------- 1. CHẶN QUYỀN CHỈ DÀNH CHO ADMIN ----------
  function enforceAdminGuard() {
    const token = auth.getToken();
    const user = auth.getUser();

    if (!token || !user) {
      sessionStorage.setItem("redirect_after_login", window.location.href);
      if (mainEl) {
        mainEl.innerHTML = `
          <div class="guard-box">
            <span class="material-symbols-outlined" style="font-size:42px; color:var(--primary); margin-bottom:10px; display:block;">lock</span>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--muted);">HTTP 401 · UNAUTHORIZED</div>
            <h2 style="font-family:var(--font-serif); margin:8px 0;">Yêu cầu đăng nhập Quản trị viên</h2>
            <p style="color:var(--muted); font-size:14px; margin-bottom:22px;">
              Vui lòng đăng nhập bằng tài khoản Quản trị viên (ADMIN) để quản lý tài khoản Thủ thư.
            </p>
            <a href="login.html#login" class="btn btn-primary">Đăng nhập Admin →</a>
          </div>`;
      }
      return null;
    }

    if (user.role !== "ADMIN") {
      const homeUrl = user.role === "LIBRARIAN" ? "staff-dashboard.html" : "home.html";
      if (mainEl) {
        mainEl.innerHTML = `
          <div class="guard-box">
            <span class="material-symbols-outlined" style="font-size:42px; color:var(--danger); margin-bottom:10px; display:block;">block</span>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--danger);">HTTP 403 · FORBIDDEN</div>
            <h2 style="font-family:var(--font-serif); margin:8px 0;">Chỉ dành cho Quản trị viên (ADMIN)</h2>
            <p style="color:var(--muted); font-size:14px; margin-bottom:22px;">
              Tài khoản <strong>${escapeHtml(user.full_name || user.email)}</strong> (${escapeHtml(user.role)}) không có quyền tạo, sửa hoặc khóa tài khoản Thủ thư.
            </p>
            <a href="${homeUrl}" class="btn btn-primary">Quay lại trang của bạn →</a>
          </div>`;
      }
      return null;
    }

    return user;
  }

  const adminUser = enforceAdminGuard();
  if (!adminUser) return;

  // Đồng bộ thông tin Admin trên Topbar
  const avatarEl = document.getElementById("userAvatar");
  const nameEl = document.getElementById("userName");
  const roleEl = document.getElementById("userRole");
  if (avatarEl) avatarEl.textContent = (adminUser.full_name || adminUser.email || "A").trim().charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = adminUser.full_name || adminUser.email;
  if (roleEl) roleEl.textContent = adminUser.role === "ADMIN" ? "Quản trị viên" : "Thủ thư";

  // Mobile Menu Toggle
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navMenu = document.getElementById("navMenu");
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      navMenu.classList.toggle("show");
    });
  }

  // User Account Dropdown
  const userProfileBtn = document.getElementById("userProfileBtn");
  const userDropdownMenu = document.getElementById("userDropdownMenu");
  const logoutMenuBtn = document.getElementById("logoutMenuBtn");

  if (userProfileBtn && userDropdownMenu) {
    userProfileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdownMenu.classList.toggle("show");
      const isShown = userDropdownMenu.classList.contains("show");
      userProfileBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
    });
  }

  // Confirm Modal Helper (Đồng bộ loan_management)
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

  function triggerLogoutConfirm(e) {
    if (e) e.stopPropagation();
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
          localStorage.clear();
          sessionStorage.clear();
        }
        window.location.href = "login.html#login";
      }
    });
  }

  if (logoutMenuBtn) logoutMenuBtn.addEventListener("click", triggerLogoutConfirm);

  // Đóng dropdown và mobile menu khi click ngoài màn hình
  document.addEventListener("click", () => {
    if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
      userDropdownMenu.classList.remove("show");
      if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
    }
    if (navMenu && navMenu.classList.contains("show")) {
      navMenu.classList.remove("show");
    }
  });

  // Sự kiện trong Confirm Modal
  const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
  const btnConfirmProceed = document.getElementById("btn-confirm-proceed");
  const confirmModal = document.getElementById("confirm-modal");

  if (btnConfirmCancel) btnConfirmCancel.addEventListener("click", closeConfirmModal);
  if (btnConfirmProceed) {
    btnConfirmProceed.addEventListener("click", () => {
      const callback = activeConfirmCallback;
      closeConfirmModal();
      if (typeof callback === "function") callback();
    });
  }
  if (confirmModal) {
    confirmModal.addEventListener("click", (e) => {
      if (e.target === confirmModal) closeConfirmModal();
    });
  }

  // ---------- 2. STATE & HELPERS ----------
  let librarians = [];
  const tbody = document.getElementById("librarians-tbody");
  const searchInput = document.getElementById("lib-search-input");
  const statusSelect = document.getElementById("lib-status-filter");

  function formatDateVN(val) {
    if (!val) return "--/--/----";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  // ---------- 3. TẢI DANH SÁCH THỦ THƯ (GET /api/admin/librarians) ----------
  async function loadLibrarians() {
    if (!tbody) return;
    try {
      const params = {};
      if (searchInput?.value.trim()) params.q = searchInput.value.trim();
      if (statusSelect?.value) params.status = statusSelect.value;

      const res = await api.get("/admin/librarians", params);
      librarians = res.items || [];

      const totalAll = (res.active_count || 0) + (res.locked_count || 0);
      document.getElementById("kpi-lib-total").textContent = totalAll;
      document.getElementById("kpi-lib-active").textContent = res.active_count ?? 0;
      document.getElementById("kpi-lib-locked").textContent = res.locked_count ?? 0;
      document.getElementById("lib-count-badge").textContent = `${librarians.length} tài khoản`;

      if (librarians.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding:32px; color:var(--muted);">
              Không tìm thấy tài khoản thủ thư nào khớp với điều kiện lọc.
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = librarians
        .map((lib) => {
          const initial = (lib.full_name || "T").charAt(0).toUpperCase();
          const isActive = lib.status === "ACTIVE";
          const statusHtml = isActive
            ? `<span class="status-pill status-active">Hoạt động (ACTIVE)</span>`
            : `<span class="status-pill status-locked">Đã khóa (LOCKED)</span>`;

          const toggleBtn = isActive
            ? `<button type="button" class="btn btn-soft-danger btn-sm" data-toggle-id="${lib.id}" data-action="LOCK"><span class="material-symbols-outlined">lock</span><span>Khóa</span></button>`
            : `<button type="button" class="btn btn-soft-success btn-sm" data-toggle-id="${lib.id}" data-action="UNLOCK"><span class="material-symbols-outlined">lock_open</span><span>Mở khóa</span></button>`;

          return `
            <tr>
              <td><span class="code-chip">#${lib.id}</span></td>
              <td>
                <div class="reader-cell">
                  <div class="reader-avatar">${escapeHtml(initial)}</div>
                  <div>
                    <div class="reader-name-line">
                      <strong>${escapeHtml(lib.full_name)}</strong>
                      <span class="code-chip">LIBRARIAN</span>
                    </div>
                    <div class="reader-sub-line">${escapeHtml(lib.email)}</div>
                  </div>
                </div>
              </td>
              <td><span style="font-family:var(--font-mono); font-size:13px;">${escapeHtml(lib.phone || "—")}</span></td>
              <td>${statusHtml}</td>
              <td>${formatDateVN(lib.created_at)}</td>
              <td style="text-align:right;">
                <div class="row-actions">
                  <button type="button" class="btn btn-soft-blue btn-sm" data-edit-id="${lib.id}"><span class="material-symbols-outlined">edit</span><span>Sửa</span></button>
                  ${toggleBtn}
                </div>
              </td>
            </tr>
          `;
        })
        .join("");
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        enforceAdminGuard();
        return;
      }
      tbody.innerHTML = `<tr><td colspan="6" style="color:var(--danger); padding:20px;">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // ---------- 4. TẠO TÀI KHOẢN THỦ THƯ (POST /api/admin/librarians) ----------
  const modalCreate = document.getElementById("modal-create-lib");
  document.getElementById("btn-open-create-lib")?.addEventListener("click", () => {
    modalCreate.hidden = false;
    document.getElementById("create-lib-name")?.focus();
  });

  document.getElementById("create-lib-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-create-lib");
    try {
      btn.disabled = true;
      const created = await api.post("/admin/librarians", {
        full_name: document.getElementById("create-lib-name").value.trim(),
        email: document.getElementById("create-lib-email").value.trim(),
        phone: document.getElementById("create-lib-phone").value.trim() || null,
        password: document.getElementById("create-lib-password").value,
      });
      showToast(`Đã tạo tài khoản thủ thư "${created.full_name}" (${created.email})!`);
      e.target.reset();
      document.getElementById("create-lib-password").value = "Thuthu@123";
      modalCreate.hidden = true;
      await loadLibrarians();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- 5. SỬA TÀI KHOẢN THỦ THƯ (PUT /api/admin/librarians/{id}) ----------
  const modalEdit = document.getElementById("modal-edit-lib");
  const modalToggle = document.getElementById("modal-toggle-lib");

  tbody?.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit-id]");
    if (editBtn) {
      const id = Number(editBtn.getAttribute("data-edit-id"));
      const lib = librarians.find((x) => x.id === id);
      if (!lib) return;
      document.getElementById("edit-lib-id").value = lib.id;
      document.getElementById("edit-lib-name").value = lib.full_name || "";
      document.getElementById("edit-lib-email").value = lib.email || "";
      document.getElementById("edit-lib-phone").value = lib.phone || "";
      document.getElementById("edit-lib-password").value = "";
      modalEdit.hidden = false;
      document.getElementById("edit-lib-name")?.focus();
      return;
    }

    const toggleBtn = e.target.closest("[data-toggle-id]");
    if (toggleBtn) {
      const id = Number(toggleBtn.getAttribute("data-toggle-id"));
      const action = toggleBtn.getAttribute("data-action");
      const lib = librarians.find((x) => x.id === id);
      if (!lib) return;

      document.getElementById("toggle-lib-id").value = lib.id;
      document.getElementById("toggle-lib-action").value = action;
      const titleEl = document.getElementById("toggle-lib-title");
      const descEl = document.getElementById("toggle-lib-desc");
      const confirmBtn = document.getElementById("btn-confirm-toggle-lib");

      if (action === "LOCK") {
        titleEl.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Khóa tài khoản Thủ thư</span>';
        descEl.innerHTML = `Bạn có chắc chắn muốn <strong>khóa</strong> tài khoản thủ thư <strong>${escapeHtml(lib.full_name)}</strong> (<code>${escapeHtml(lib.email)}</code>)?<br>Tài khoản bị khóa sẽ không thể đăng nhập hoặc thực hiện bất kỳ thao tác nào trên hệ thống.`;
        confirmBtn.textContent = "Xác nhận Khóa tài khoản";
        confirmBtn.className = "btn btn-soft-danger";
      } else {
        titleEl.innerHTML = '<span class="material-symbols-outlined">lock_open</span><span>Mở khóa tài khoản Thủ thư</span>';
        descEl.innerHTML = `Xác nhận <strong>mở khóa</strong> tài khoản thủ thư <strong>${escapeHtml(lib.full_name)}</strong> (<code>${escapeHtml(lib.email)}</code>)?<br>Thủ thư sẽ có thể đăng nhập và làm việc trở lại ngay lập tức.`;
        confirmBtn.textContent = "Xác nhận Mở khóa";
        confirmBtn.className = "btn btn-primary";
      }
      modalToggle.hidden = false;
    }
  });

  document.getElementById("edit-lib-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-lib-id").value;
    const newPassword = document.getElementById("edit-lib-password").value;
    const btn = document.getElementById("btn-submit-edit-lib");

    const payload = {
      full_name: document.getElementById("edit-lib-name").value.trim(),
      email: document.getElementById("edit-lib-email").value.trim(),
      phone: document.getElementById("edit-lib-phone").value.trim() || null,
    };
    if (newPassword) {
      payload.password = newPassword;
    }

    try {
      btn.disabled = true;
      const updated = await api.put(`/admin/librarians/${id}`, payload);
      showToast(`Đã cập nhật thông tin thủ thư "${updated.full_name}"!`);
      modalEdit.hidden = true;
      await loadLibrarians();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- 6. KHOÁ / MỞ KHOÁ TÀI KHOẢN THỦ THƯ ----------
  document.getElementById("btn-confirm-toggle-lib")?.addEventListener("click", async () => {
    const id = document.getElementById("toggle-lib-id").value;
    const action = document.getElementById("toggle-lib-action").value;
    const btn = document.getElementById("btn-confirm-toggle-lib");

    try {
      btn.disabled = true;
      const endpoint = action === "LOCK" ? `/admin/librarians/${id}/lock` : `/admin/librarians/${id}/unlock`;
      const updated = await api.post(endpoint, {});
      showToast(
        action === "LOCK"
          ? `Đã khóa tài khoản thủ thư "${updated.full_name}"!`
          : `Đã mở khóa tài khoản thủ thư "${updated.full_name}"!`
      );
      modalToggle.hidden = true;
      await loadLibrarians();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- 7. BỘ LỌC TÌM KIẾM & LÀM MỚI (RELOAD) ----------
  document.getElementById("librarians-filter-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    loadLibrarians();
  });

  // Tự động tìm kiếm tức thì khi gõ từ khóa (debounce 300ms)
  let searchDebounceTimer = null;
  searchInput?.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      loadLibrarians();
    }, 300);
  });

  // Sự kiện khi bấm nút 'x' xóa nội dung ô tìm kiếm trình duyệt
  searchInput?.addEventListener("search", () => {
    loadLibrarians();
  });

  // Lọc ngay khi thay đổi trạng thái
  statusSelect?.addEventListener("change", () => loadLibrarians());

  // Nút mũi tên xoay tròn: tải lại dữ liệu & đặt lại bộ lọc tìm kiếm
  const btnResetFilter = document.getElementById("btn-reset-lib-filter");
  btnResetFilter?.addEventListener("click", async () => {
    btnResetFilter.classList.add("is-spinning");
    if (searchInput) searchInput.value = "";
    if (statusSelect) statusSelect.value = "";
    try {
      await loadLibrarians();
      showToast("Đã tải lại danh sách thủ thư!");
    } catch (err) {
      showToast("Không thể tải lại dữ liệu: " + err.message, "error");
    } finally {
      setTimeout(() => {
        btnResetFilter.classList.remove("is-spinning");
      }, 700);
    }
  });

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.getAttribute("data-close")).hidden = true;
    });
  });

  loadLibrarians();
});
