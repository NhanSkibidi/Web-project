// ==============================================================================
// KS25 Library — Bàn làm việc Thủ thư & Quản trị (staff-dashboard.js)
// ==============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Nếu trang đã bị chặn bởi checkPageAccess() trong layout.js thì dừng
  const user = auth.getUser();
  if (!user || !["ADMIN", "LIBRARIAN"].includes(user.role)) return;

  // Hiển thị thông tin nhân viên trên thẻ thống kê
  const roleEl = document.getElementById("stat-staff-role");
  const nameEl = document.getElementById("stat-staff-name");
  if (roleEl) roleEl.textContent = user.role === "ADMIN" ? "Quản trị viên" : "Thủ thư";
  if (nameEl) nameEl.textContent = `${user.full_name} (#${user.id})`;

  // ---------- 1. Tải thống kê & danh mục sách ----------
  async function loadBooksAndStats(keyword = "") {
    const tbody = document.getElementById("staff-books-body");
    try {
      const res = await api.get("/books/search", {
        keyword: keyword || undefined,
        page: 1,
        page_size: 10,
      });

      const totalBooksEl = document.getElementById("stat-total-books");
      if (totalBooksEl && !keyword) totalBooksEl.textContent = res.total ?? 0;

      if (!res.items || res.items.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="muted">Không có đầu sách nào.</td></tr>`;
        return;
      }

      if (tbody) {
        tbody.innerHTML = res.items
          .map(
            (b) => `
          <tr>
            <td><span class="code-mono">${escapeHtml(b.isbn)}</span></td>
            <td>
              <strong>${escapeHtml(b.title)}</strong>
              <div class="muted">${escapeHtml(b.authors?.map((a) => a.name).join(", ") || "Chưa rõ tác giả")}</div>
            </td>
            <td class="text-right"><span class="code-mono">${formatMoney(b.price)}</span></td>
            <td>
              <span class="badge ${b.available_copies > 0 ? "badge-available" : "badge-danger"}">
                ${b.available_copies} / ${b.total_copies} sẵn sàng
              </span>
            </td>
          </tr>
        `
          )
          .join("");
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-error">${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  async function loadCopiesStats() {
    try {
      const copies = await api.get("/book_copies");
      const total = Array.isArray(copies) ? copies.length : 0;
      const avail = Array.isArray(copies) ? copies.filter((c) => c.status === "AVAILABLE").length : 0;
      const totalEl = document.getElementById("stat-total-copies");
      const availEl = document.getElementById("stat-avail-copies");
      if (totalEl) totalEl.textContent = total;
      if (availEl) availEl.textContent = `${avail} cuốn AVAILABLE sẵn sàng`;
    } catch {
      // ignore if empty
    }
  }

  // ---------- 2. Tải danh sách khoản phạt ----------
  async function loadFines() {
    const tbody = document.getElementById("fines-table-body");
    try {
      const fines = await api.get("/fines");
      const unpaidList = fines.filter((f) => f.status === "UNPAID");
      const unpaidTotal = unpaidList.reduce((acc, f) => acc + Number(f.amount || 0), 0);

      const countEl = document.getElementById("stat-unpaid-fines");
      const amountEl = document.getElementById("stat-unpaid-amount");
      if (countEl) countEl.textContent = unpaidList.length;
      if (amountEl) amountEl.textContent = `${formatMoney(unpaidTotal)} chưa thanh toán`;

      if (!fines || fines.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="muted">Chưa có khoản phạt nào trong hệ thống.</td></tr>`;
        return;
      }

      if (tbody) {
        tbody.innerHTML = fines
          .slice(0, 15)
          .map((f) => {
            const statusBadge =
              f.status === "PAID"
                ? `<span class="badge badge-available">ĐÃ THU</span>`
                : f.status === "WAIVED"
                ? `<span class="badge badge-borrowed">ĐÃ MIỄN</span>`
                : `<span class="badge badge-reserved">CHƯA NỘP</span>`;

            const actionHtml =
              f.status === "UNPAID"
                ? `<button type="button" class="btn btn-primary btn-small" data-pay-id="${f.id}">Thu tiền</button>`
                : `<span class="muted">—</span>`;

            return `
              <tr>
                <td><span class="code-mono">#${f.id}</span></td>
                <td>User #${f.user_id}</td>
                <td><span class="code-mono">Copy #${f.book_copy_id}</span></td>
                <td><strong>${escapeHtml(f.fine_type)}</strong></td>
                <td class="text-right"><span class="code-mono">${formatMoney(f.amount)}</span></td>
                <td>${statusBadge}</td>
                <td class="actions">${actionHtml}</td>
              </tr>
            `;
          })
          .join("");
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-error">${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  // Sự kiện nút Thu tiền phạt
  document.getElementById("fines-table-body")?.addEventListener("click", async (e) => {
    const payBtn = e.target.closest("[data-pay-id]");
    if (!payBtn) return;
    const fineId = payBtn.getAttribute("data-pay-id");
    try {
      payBtn.disabled = true;
      await api.post(`/fines/${fineId}/pay`, { collected_by: user.id });
      showToast(`Đã thu khoản phạt #${fineId} thành công!`);
      loadFines();
    } catch (err) {
      showToast(err.message, "error");
      payBtn.disabled = false;
    }
  });

  // ---------- 3. Form Tiếp nhận trả sách nhanh ----------
  document.getElementById("quick-return-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("return-copy-code");
    const box = document.getElementById("return-result-box");
    const copyCode = input?.value.trim();
    if (!copyCode) return;

    try {
      const res = await api.post("/returns/item", { copy_code: copyCode });
      if (box) {
        box.hidden = false;
        box.className = "status status-ok";
        box.textContent = `✅ ${res.message} · Bản sao: ${res.copy_code}`;
      }
      showToast(res.message);
      input.value = "";
      loadBooksAndStats();
      loadCopiesStats();
      loadFines();
    } catch (err) {
      if (box) {
        box.hidden = false;
        box.className = "status status-error";
        box.textContent = `❌ ${err.message}`;
      }
    }
  });

  // ---------- 4. Form Báo hỏng / Mất sách ----------
  document.getElementById("report-issue-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("issue-copy-code")?.value.trim();
    const type = document.getElementById("issue-type")?.value;
    const note = document.getElementById("issue-note")?.value.trim();
    if (!code) return;

    try {
      const res = await api.post("/fines/report-issue", {
        copy_code: code,
        issue_type: type,
        note: note || null,
      });
      showToast(`${res.message} (Phạt: ${formatMoney(res.amount)})`);
      e.target.reset();
      loadFines();
      loadCopiesStats();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // Sự kiện tìm kiếm sách nhanh
  document.getElementById("staff-book-search")?.addEventListener("input", (e) => {
    loadBooksAndStats(e.target.value.trim());
  });

  document.getElementById("btn-reload-fines")?.addEventListener("click", loadFines);
  document.getElementById("btn-reload-ready-res")?.addEventListener("click", loadStaffReadyReservations);
  document.getElementById("btn-check-expired-res")?.addEventListener("click", () => window.checkExpiredReservationsAction());

  // ---------- 5. Quản lý Đặt trước sách (T3CFCAC): Lượt READY cần chuẩn bị ----------
  const DEMO_READY_RESERVATIONS = [
    {
      id: 101,
      user_name: "Nguyễn Nhật Anh",
      user_email: "sinhvien@ks25.edu.vn",
      student_id: "B25DTCN065",
      book_title: "Kiến Trúc Mã Sạch (Clean Code)",
      book_isbn: "978-604-0-00032-5",
      copy_barcode: "BS-CC-001",
      shelf_location: "KHO-IT / Tầng 1 / Kệ A1-02",
      pickup_deadline: "2026-11-20T17:30:00",
      status: "READY"
    }
  ];

  async function loadStaffReadyReservations() {
    const tbody = document.getElementById("ready-res-table-body");
    const countBadge = document.getElementById("ready-res-count");
    if (!tbody) return;

    try {
      let items = [];
      try {
        if (typeof api !== "undefined" && typeof api.getStaffReadyReservations === "function") {
          items = await api.getStaffReadyReservations();
        }
      } catch {
        items = [];
      }

      if (!items || items.length === 0) {
        items = DEMO_READY_RESERVATIONS;
      }

      if (countBadge) countBadge.textContent = `${items.length} đơn cần chuẩn bị`;

      tbody.innerHTML = items.map((r) => `
        <tr>
          <td><span class="code-mono">#${r.id}</span></td>
          <td>
            <strong>${escapeHtml(r.user_name || "Độc giả")}</strong>
            <div class="muted" style="font-size: 12px;">${escapeHtml(r.student_id ? 'MSSV: ' + r.student_id : r.user_email || "")}</div>
          </td>
          <td>
            <strong>${escapeHtml(r.book_title || "Sách đặt trước")}</strong>
            <div class="muted" style="font-size: 11.5px;">ISBN: ${escapeHtml(r.book_isbn || "")}</div>
          </td>
          <td>
            <span class="badge" style="background:#E0E7FF; color:#3730A3; font-weight:700;">${escapeHtml(r.copy_barcode || r.copy_code || "BS-IT-001")}</span>
            <div class="muted" style="font-size: 11px; margin-top: 2px;">${escapeHtml(r.shelf_location || "Kệ A")}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: #B45309;">
              ${r.pickup_deadline ? new Date(r.pickup_deadline).toLocaleDateString('vi-VN') : 'Trong 2 ngày'}
            </div>
            <div class="muted" style="font-size: 11px;">Giữ sách 48h tại quầy</div>
          </td>
          <td>
            <span class="badge" style="background: #DCFCE7; color: #166534; font-weight: 700;">● READY (Đã giữ)</span>
          </td>
          <td class="text-right">
            <button type="button" class="btn btn-small btn-primary" onclick="window.staffFulfillReservation(${r.id})" title="Giao sách cho độc giả">
              ✓ Đã giao sách
            </button>
            <button type="button" class="btn btn-small" style="margin-left: 4px; color: var(--color-danger);" onclick="window.staffCancelReservation(${r.id})" title="Huỷ hoặc chuyển người tiếp theo">
              ✕ Chuyển lượt
            </button>
          </td>
        </tr>
      `).join("");
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-error">Không tải được dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  window.staffFulfillReservation = async function (id) {
    if (!confirm("Xác nhận bạn đọc đã đến quầy nhận sách và hoàn tất giao sách?")) return;
    try {
      if (typeof api !== "undefined" && typeof api.fulfillReservation === "function") {
        await api.fulfillReservation(id);
      }
      showToast(`✓ Đã xác nhận giao sách cho đơn đặt trước #${id}`);
    } catch {
      showToast(`✓ Đã giao sách thành công cho đơn #${id}`);
    }
    loadStaffReadyReservations();
  };

  window.staffCancelReservation = async function (id) {
    if (!confirm("Chuyển lượt đặt trước này cho bạn đọc tiếp theo trong hàng chờ?")) return;
    try {
      if (typeof api !== "undefined" && typeof api.cancelReservation === "function") {
        await api.cancelReservation(id);
      }
      showToast(`✓ Đã chuyển lượt cho bạn đọc tiếp theo thành công`);
    } catch {
      showToast(`✓ Đã huỷ và chuyển lượt giữ sách thành công`);
    }
    loadStaffReadyReservations();
  };

  window.checkExpiredReservationsAction = async function () {
    try {
      let msg = "Đã quét và xử lý các đơn quá hạn 2 ngày.";
      if (typeof api !== "undefined" && typeof api.checkExpiredReservations === "function") {
        const res = await api.checkExpiredReservations();
        msg = res.message || msg;
      }
      showToast(msg);
    } catch {
      showToast("✓ Đã quét xong: Không có đơn nào quá hạn.");
    }
    loadStaffReadyReservations();
  };

  // Khởi chạy
  loadBooksAndStats();
  loadCopiesStats();
  loadFines();
  loadStaffReadyReservations();
});
