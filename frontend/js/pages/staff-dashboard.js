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

  // Khởi chạy
  loadBooksAndStats();
  loadCopiesStats();
  loadFines();
});
