(() => {
  'use strict';

  const IMG = '../assets/images/';
  const PAGE_SIZE = 5;
  const MAX_BOOKS = 5;
  const DAY = 864e5;

  let loans = [];
  let filter = 'all';
  let query = '';
  let page = 1;
  let isLoading = false;
  let loadError = null;

  const $ = (s, r = document) => r.querySelector(s);
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = t => {
    if (!t) return '—';
    const d = new Date(t);
    if (isNaN(d.getTime())) return '—';
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const fmtTime = t => {
    if (!t) return '—';
    const d = new Date(t);
    if (isNaN(d.getTime())) return '—';
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = () => window.lucide && window.lucide.createIcons();

  function parseTimeMs(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  function startOfDayMs(ts) {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function daysLeft(l) {
    if (!l.dueAt) return 0;
    return Math.round((startOfDayMs(l.dueAt) - startOfDayMs(Date.now())) / DAY);
  }

  function isOverdue(l) {
    return l.status === 'borrowing' && Boolean(l.dueAt) && daysLeft(l) < 0;
  }

  const countBooks = ls => ls.reduce((n, l) => n + (Array.isArray(l.books) ? l.books.length : 0), 0);

  function formatCoverUrl(url) {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }
    const baseOrigin = typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL
      ? CONFIG.API_BASE_URL.replace(/\/api\/?$/, '')
      : '';
    return `${baseOrigin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }

  function getSession() {
    let user = null;
    let token = null;
    if (typeof auth !== 'undefined') {
      token = typeof auth.getToken === 'function' ? auth.getToken() : null;
      user = typeof auth.getUser === 'function' ? auth.getUser() : null;
    } else {
      token =
        localStorage.getItem('access_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('access_token') ||
        null;
      try {
        const raw = localStorage.getItem('user_info') || sessionStorage.getItem('user_info');
        if (raw) user = JSON.parse(raw);
      } catch {
        user = null;
      }
    }
    return { user, token, isLoggedIn: Boolean(token && user) };
  }

  function buildLoanCode(id, createdAt) {
    const d = createdAt ? new Date(createdAt) : new Date();
    const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    return `PM-${year}-${String(id).padStart(4, '0')}`;
  }

  function mapLoanFromApi(raw) {
    const apiStatus = String(raw.status || '').toUpperCase();
    const statusMap = {
      BORROWED: 'borrowing',
      PENDING: 'pending',
      APPROVED: 'approved',
      RETURNED: 'returned',
      REJECTED: 'rejected',
      CANCELLED: 'cancelled',
    };
    const status = statusMap[apiStatus] || 'pending';
    const items = Array.isArray(raw.loan_items) ? raw.loan_items : [];
    const activeItems = items.filter(it => !it.return_date);

    const dueCandidates = activeItems
      .map(it => parseTimeMs(it.due_date))
      .filter(Boolean);
    const dueAt = dueCandidates.length > 0
      ? Math.min(...dueCandidates)
      : parseTimeMs(raw.due_date);

    const returnCandidates = items
      .map(it => parseTimeMs(it.return_date))
      .filter(Boolean);
    const returnedAt = returnCandidates.length > 0
      ? Math.max(...returnCandidates)
      : (parseTimeMs(raw.due_date) || parseTimeMs(raw.created_at));

    const renewed = activeItems.length > 0
      ? activeItems.some(it => Number(it.renewal_count || 0) >= 1)
      : items.some(it => Number(it.renewal_count || 0) >= 1);
    const hasWaitingReservation = activeItems.some(it => Boolean(it.has_waiting_reservation));

    const maxOverdueDays = items.reduce((mx, it) => Math.max(mx, Number(it.overdue_days || 0)), 0);
    const totalEstimatedFine = items.reduce((sum, it) => sum + Number(it.estimated_fine || 0), 0);
    const onTime = !items.some(it => Boolean(it.is_overdue));

    const borrowType = String(raw.borrow_type || 'ONLINE').toUpperCase();
    const place = borrowType === 'WALK_IN'
      ? 'Quầy Thủ thư (Mượn trực tiếp)'
      : 'Đăng ký trực tuyến (OPAC)';

    return {
      dbId: raw.id,
      id: raw.code || buildLoanCode(raw.id, raw.created_at),
      apiStatus,
      status,
      borrowType,
      place,
      submittedAt: parseTimeMs(raw.created_at) || Date.now(),
      borrowedAt: parseTimeMs(raw.borrowed_at) || parseTimeMs(raw.created_at),
      dueAt,
      returnedAt,
      renewed,
      hasWaitingReservation,
      rejectReason: raw.reject_reason || '',
      overdueDaysFromApi: maxOverdueDays,
      estimatedFineFromApi: totalEstimatedFine,
      onTime,
      books: items.map(it => ({
        itemId: it.id,
        isbn: it.book_isbn,
        title: it.book_title || it.book_isbn,
        author: it.author_name || 'Chưa rõ tác giả',
        code: it.copy_code || it.book_isbn,
        shelf: it.shelf_location ? `Kệ: ${it.shelf_location}` : 'Kho thư viện',
        img: formatCoverUrl(it.cover_image),
        renewalCount: Number(it.renewal_count || 0),
        dueAt: parseTimeMs(it.due_date) || dueAt,
        hasWaitingReservation: Boolean(it.has_waiting_reservation),
        isOverdue: Boolean(it.is_overdue),
        overdueDays: Number(it.overdue_days || 0),
        estimatedFine: Number(it.estimated_fine || 0),
        returned: Boolean(it.return_date),
      })),
    };
  }

  async function loadLoansFromDatabase() {
    const { user, isLoggedIn } = getSession();
    const statsEl = $('#stats');
    const toolbarEl = $('.toolbar');
    const footBarEl = $('.foot-bar');

    if (!isLoggedIn) {
      loans = [];
      isLoading = false;
      loadError = null;
      if (statsEl) statsEl.style.display = 'none';
      if (toolbarEl) toolbarEl.style.display = 'none';
      if (footBarEl) footBarEl.style.display = 'none';
      $('#slips').innerHTML = `
        <div class="empty">
          <strong>Vui lòng đăng nhập để xem phiếu mượn</strong>
          <p style="margin: 8px 0 18px;">Bạn cần đăng nhập tài khoản độc giả KS25 để theo dõi danh sách phiếu mượn từ hệ thống.</p>
          <a href="login.html#login" class="btn btn--solid" id="loanSlipLoginBtn" style="display: inline-flex; text-decoration: none;">
            Đăng nhập ngay →
          </a>
        </div>
      `;
      const loginBtn = $('#loanSlipLoginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          try {
            sessionStorage.setItem('redirect_after_login', window.location.href);
          } catch { /* ignore */ }
        });
      }
      icons();
      return;
    }

    if (statsEl) statsEl.style.display = '';
    if (toolbarEl) toolbarEl.style.display = '';
    if (footBarEl) footBarEl.style.display = '';

    isLoading = true;
    loadError = null;
    render();

    try {
      let activeUser = user;
      if (!activeUser?.id && typeof auth !== 'undefined' && typeof auth.syncSession === 'function') {
        activeUser = await auth.syncSession();
      }
      if (!activeUser?.id) {
        throw new Error('Không xác định được thông tin tài khoản độc giả.');
      }

      const rawLoans = await api.get('/loans', { user_id: activeUser.id, limit: 200 });
      loans = Array.isArray(rawLoans) ? rawLoans.map(mapLoanFromApi) : [];
    } catch (err) {
      console.error('[loan_slip] Lỗi tải phiếu mượn từ database:', err);
      loadError = err?.message || 'Không thể tải danh sách phiếu mượn từ máy chủ.';
      loans = [];
    } finally {
      isLoading = false;
      render();
    }
  }
  window.reloadLoans = loadLoansFromDatabase;

  function dueBadge(l) {
    if (!l.dueAt) return '';
    const d = daysLeft(l);
    if (d < 0) return `<span class="badge badge--danger">Quá hạn ${-d} ngày</span>`;
    if (d === 0) return '<span class="badge badge--warn">Hết hạn hôm nay</span>';
    return `<span class="badge ${d > 3 ? 'badge--ok' : 'badge--warn'}">Còn ${d} ngày</span>`;
  }

  /* ---------- Render ---------- */
  function filtered() {
    const q = norm(query.trim());
    return loans.filter(l => {
      if (filter === 'overdue') {
        if (!isOverdue(l)) return false;
      } else if (filter === 'due_soon') {
        const d = daysLeft(l);
        if (!(l.status === 'borrowing' && l.dueAt && d >= 0 && d <= 2)) return false;
      } else if (filter === 'pending') {
        if (l.status !== 'pending' && l.status !== 'approved') return false;
      } else if (filter !== 'all' && l.status !== filter) {
        return false;
      }

      if (!q) return true;
      return (
        norm(l.id).includes(q) ||
        String(l.dbId) === q ||
        l.books.some(b => norm(b.title).includes(q) || norm(b.isbn).includes(q) || norm(b.code).includes(q))
      );
    });
  }

  function renderStats() {
    const borrowing = loans.filter(l => l.status === 'borrowing');
    const pending = loans.filter(l => l.status === 'pending' || l.status === 'approved');
    const overdue = countBooks(borrowing.filter(isOverdue));
    const card = (img, label, num, unit, badge, filterKey) => `
      <article class="stat" style="cursor: pointer;" onclick="window.setSlipFilter && window.setSlipFilter('${filterKey}')">
        <div class="stat__icon"><img src="${IMG}${img}" alt="" width="28" height="28"></div>
        <div class="stat__body"><span class="stat__label">${label}</span><div class="stat__num">${num} <small>${unit}</small></div></div>${badge}
      </article>`;
    $('#stats').innerHTML =
      card('đang_muon.png', 'Đang mượn', countBooks(borrowing), 'cuốn', `<span class="badge badge--ok badge--dot">${borrowing.length} phiếu</span>`, 'borrowing') +
      card('cho_duyet.png', 'Chờ duyệt', pending.length, 'phiếu', '<span class="badge badge--warn badge--dot">Đang xử lý</span>', 'pending') +
      card('qua_han.png', 'Quá hạn', overdue, 'cuốn', overdue ? '<span class="badge badge--danger">Cần xử lý</span>' : '<span class="badge badge--ok">An toàn</span>', 'overdue');
  }

  function renderTabs() {
    const c = s => {
      if (s === 'all') return loans.length;
      if (s === 'overdue') return loans.filter(isOverdue).length;
      if (s === 'due_soon') return loans.filter(l => l.status === 'borrowing' && l.dueAt && daysLeft(l) >= 0 && daysLeft(l) <= 2).length;
      if (s === 'pending') return loans.filter(l => l.status === 'pending' || l.status === 'approved').length;
      return loans.filter(l => l.status === s).length;
    };
    const tabs = [
      ['all', 'Tất cả'],
      ['borrowing', 'Đang mượn'],
      ['overdue', 'Quá hạn'],
      ['due_soon', 'Sắp đến hạn (2 ngày)'],
      ['pending', 'Chờ duyệt'],
      ['returned', 'Đã trả']
    ];
    $('#tabs').innerHTML = tabs.map(([k, t]) =>
      `<button class="tab ${filter === k ? 'is-active' : ''}" role="tab" aria-selected="${filter === k}" data-filter="${k}">${t} (${c(k)})</button>`).join('');
  }

  const FALLBACK_COVER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='110' viewBox='0 0 80 110'%3E%3Crect width='80' height='110' rx='6' fill='%231b4332'/%3E%3Crect x='8' y='8' width='64' height='94' rx='4' fill='none' stroke='rgba(255,255,255,0.22)' stroke-width='1.5'/%3E%3Ctext x='40' y='60' text-anchor='middle' font-size='24'%3E%F0%9F%93%96%3C/text%3E%3C/svg%3E";

  const bookHTML = (b, l) => {
    const imgSrc = b.img || FALLBACK_COVER_SVG;
    const detailHref = `book_detail.html?isbn=${encodeURIComponent(b.isbn || '')}`;
    const itemDue = b.dueAt || l?.dueAt;
    const itemDaysLeft = itemDue ? Math.round((startOfDayMs(itemDue) - startOfDayMs(Date.now())) / DAY) : 0;
    const itemOverdue = Boolean(b.isOverdue) || itemDaysLeft < 0;

    let itemActionHtml = '';
    if (l && l.status === 'borrowing') {
      if (b.returned) {
        itemActionHtml = `<div style="margin-top:6px;"><span class="badge badge--gray">Đã trả</span></div>`;
      } else {
        const dueText = itemDue ? ` &bull; Hạn: <b class="mono">${fmtDate(itemDue)}</b>` : '';
        let actionPart = '';
        if (b.renewalCount >= 1) {
          actionPart = `<span class="badge badge--ok" style="margin-left:6px;">Đã gia hạn 1/1</span>`;
        } else if (b.hasWaitingReservation) {
          actionPart = `<span class="badge badge--warn" style="margin-left:6px;" title="Đầu sách đang có người đặt trước">Có người đặt trước</span>`;
        } else if (!itemOverdue && b.itemId) {
          actionPart = `<div style="margin-top:8px;"><button type="button" class="btn btn--outline" style="padding:4px 10px; font-size:12.5px;" data-act="renew-item" data-item-id="${b.itemId}"><i data-lucide="refresh-cw" style="width:13px;height:13px;"></i>Gia hạn cuốn này (+7 ngày)</button></div>`;
        }
        itemActionHtml = `<p class="book__code" style="margin-top:4px;">Gia hạn: <b>${b.renewalCount}/1</b>${dueText}${b.renewalCount >= 1 || b.hasWaitingReservation ? actionPart : ''}</p>${b.renewalCount < 1 && !b.hasWaitingReservation ? actionPart : ''}`;
      }
    }

    return `
      <div class="book">
        <a href="${detailHref}" style="display:block;flex-shrink:0;">
          <img class="book__cover" src="${esc(imgSrc)}" alt="Bìa sách ${esc(b.title)}" width="80" height="110"
            onerror="this.onerror=null;this.src='${FALLBACK_COVER_SVG}'">
        </a>
        <div>
          <h3 class="book__title"><a href="${detailHref}">${esc(b.title)}</a></h3>
          <p class="book__author">${esc(b.author)}</p>
          <p class="book__code">Mã: <b>${esc(b.code)}</b> &bull; ${esc(b.shelf)}</p>
          ${itemActionHtml}
        </div>
      </div>`;
  };

  function slipHTML(l) {
    const books = l.books.map(b => bookHTML(b, l)).join('');
    let badge, right, note = '', foot;

    if (l.status === 'borrowing') {
      const d = daysLeft(l);
      if (d < 0) {
        badge = '<span class="badge badge--danger badge--dot">Quá hạn</span>';
        const overdueDays = Math.max(-d, l.overdueDaysFromApi || 0);
        const fineEst = (l.estimatedFineFromApi > 0 ? l.estimatedFineFromApi : overdueDays * 2000).toLocaleString('vi-VN');
        note = `<div class="note" style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:12px 16px; border-radius:10px; margin-bottom:14px; display:flex; gap:12px; align-items:center;">
          <span class="material-symbols-outlined" style="color:#dc2626; font-size:24px; flex-shrink:0;">error</span>
          <div>
            <div style="font-weight:700; font-size:14px; color:#b91c1c;">CẢNH BÁO QUÁ HẠN (${overdueDays} NGÀY)</div>
            <p style="margin:2px 0 0; font-size:13px; color:#7f1d1d;">Phiếu mượn đã quá hạn quy định. Tiền phạt tạm tính: <strong style="color:#dc2626; font-size:14px;">${fineEst} đ</strong> (2.000 đ/ngày). Vui lòng mang sách tới quầy Thư viện KS25 để hoàn trả sớm nhất.</p>
          </div>
        </div>`;
      } else if (d <= 2) {
        badge = '<span class="badge badge--warn badge--dot">Sắp đến hạn</span>';
        const statusTxt = d === 0 ? 'hôm nay' : `trong ${d} ngày tới`;
        note = `<div class="note" style="background:#fffbeb; border:1px solid #fde68a; color:#92400e; padding:12px 16px; border-radius:10px; margin-bottom:14px; display:flex; gap:12px; align-items:center;">
          <span class="material-symbols-outlined" style="color:#d97706; font-size:24px; flex-shrink:0;">alarm</span>
          <div>
            <div style="font-weight:700; font-size:14px; color:#b45309;">NHẮC NHỞ HẠN TRẢ (${d === 0 ? 'HÔM NAY' : 'CÒN ' + d + ' NGÀY'})</div>
            <p style="margin:2px 0 0; font-size:13px; color:#78350f;">Phiếu mượn sẽ hết hạn <strong>${statusTxt}</strong>. Bạn có thể bấm nút "Gia hạn thêm (+7 ngày)" bên dưới nếu chưa từng gia hạn, hoặc chuẩn bị trả sách tại quầy.</p>
          </div>
        </div>`;
      } else {
        badge = '<span class="badge badge--ok badge--dot">Đang mượn</span>';
      }

      right = `<i data-lucide="calendar"></i><span>Hạn trả:</span><span class="mono">${fmtDate(l.dueAt)}</span>${dueBadge(l)}`;
      const wholeSlipRenewDisabled = l.renewed || d < 0 || l.hasWaitingReservation;
      const wholeSlipRenewTitle = d < 0
        ? 'Sách đã quá hạn, không thể gia hạn online'
        : l.hasWaitingReservation
          ? 'Có sách trong phiếu đang được người khác đặt trước (hãy gia hạn lẻ từng cuốn đủ điều kiện)'
          : l.renewed
            ? 'Có sách trong phiếu đã đạt giới hạn gia hạn 1/1'
            : '';
      foot = `<span class="meta-text"><i data-lucide="clock"></i><span>Mượn ngày <b class="mono">${fmtDate(l.borrowedAt)}</b> tại ${esc(l.place)}</span></span>
        <div class="actions">
          <button class="btn btn--outline" data-act="renew" ${wholeSlipRenewDisabled ? 'disabled title="' + esc(wholeSlipRenewTitle) + '"' : ''}><i data-lucide="refresh-cw"></i>Gia hạn cả phiếu (+7 ngày)</button>
          <button class="btn btn--icon" data-act="print" aria-label="In phiếu" title="In phiếu"><i data-lucide="printer"></i></button></div>`;
    } else if (l.status === 'pending') {
      badge = '<span class="badge badge--warn badge--dot">Chờ duyệt</span>';
      const today = new Date(l.submittedAt).toDateString() === new Date().toDateString();
      right = `<i data-lucide="clock"></i><span>Gửi lúc:</span><span class="mono">${fmtTime(l.submittedAt)} ${today ? 'hôm nay' : fmtDate(l.submittedAt)}</span>`;
      note = `<div class="note"><i data-lucide="clock"></i><div><h3>Đang chờ thủ thư duyệt yêu cầu</h3><p>Bạn sẽ nhận được thông báo khi thủ thư xác nhận và chuẩn bị sách tại quầy mượn Tầng 1.</p></div></div>`;
      foot = `<span class="meta-text"><i data-lucide="info"></i><span>${esc(l.place)}</span></span>
        <div class="actions"><button class="btn btn--danger" data-act="cancel"><i data-lucide="x"></i>Hủy yêu cầu</button></div>`;
    } else if (l.status === 'approved') {
      badge = '<span class="badge badge--ok badge--dot">Đã duyệt · Chờ nhận</span>';
      right = `<i data-lucide="clock"></i><span>Tạo lúc:</span><span class="mono">${fmtTime(l.submittedAt)} ${fmtDate(l.submittedAt)}</span>`;
      note = `<div class="note note--done"><i data-lucide="check-circle-2"></i><div><h3>Phiếu mượn đã được thủ thư duyệt</h3><p>Vui lòng mang Thẻ sinh viên / Thẻ thư viện đến quầy thủ thư để nhận sách.</p></div></div>`;
      foot = `<span class="meta-text"><i data-lucide="info"></i><span>${esc(l.place)}</span></span>
        <div class="actions"><button class="btn btn--icon" data-act="print" aria-label="In phiếu" title="In phiếu"><i data-lucide="printer"></i></button></div>`;
    } else if (l.status === 'rejected') {
      badge = '<span class="badge badge--danger badge--dot">Từ chối</span>';
      right = `<i data-lucide="calendar"></i><span>Ngày gửi:</span><span class="mono">${fmtDate(l.submittedAt)}</span>`;
      note = `<div class="note" style="background:#fef2f2; border-color:#fecaca; color:#991b1b;"><i data-lucide="alert-circle"></i><div><h3>Yêu cầu mượn không được duyệt</h3><p>${esc(l.rejectReason || 'Vui lòng liên hệ quầy thủ thư để biết thêm chi tiết.')}</p></div></div>`;
      foot = `<span class="meta-text"><i data-lucide="info"></i><span>${esc(l.place)}</span></span>
        <div class="actions"><button class="btn btn--solid" data-act="rebook"><i data-lucide="book-open"></i>Mượn lại</button></div>`;
    } else if (l.status === 'cancelled') {
      badge = '<span class="badge badge--gray badge--dot">Đã hủy</span>';
      right = `<i data-lucide="calendar"></i><span>Ngày tạo:</span><span class="mono">${fmtDate(l.submittedAt)}</span>`;
      note = `<div class="note" style="background:#f5f3f0; border-color:#e6e2d8;"><i data-lucide="x-circle"></i><div><h3>Yêu cầu mượn đã được hủy</h3><p>Các bản sao giữ chỗ đã được mở lại cho bạn đọc khác.</p></div></div>`;
      foot = `<span class="meta-text"><i data-lucide="info"></i><span>${esc(l.place)}</span></span>
        <div class="actions"><button class="btn btn--solid" data-act="rebook"><i data-lucide="book-open"></i>Mượn lại</button></div>`;
    } else {
      badge = '<span class="badge badge--gray badge--dot">Đã trả</span>';
      const returnBadge = l.onTime
        ? '<span class="badge badge--ok">Đúng hạn</span>'
        : `<span class="badge badge--danger">Trễ ${l.overdueDaysFromApi || ''} ngày</span>`;
      right = `<i data-lucide="check"></i><span>Ngày trả:</span><span class="mono">${fmtDate(l.returnedAt)}</span>${returnBadge}`;
      note = `<div class="note note--done"><i data-lucide="check-circle-2"></i><div><h3>Đã hoàn tất trả sách</h3><p>${l.onTime ? 'Ghi nhận hoàn trả đúng hạn tại hệ thống thư viện KS25.' : `Hoàn trả trễ ${l.overdueDaysFromApi || 0} ngày.`}</p></div></div>`;
      foot = `<span class="meta-text"><i data-lucide="file-text"></i><span>Mã phiếu: <b class="mono">${esc(l.id)}</b> &bull; ${esc(l.place)}</span></span>
        <div class="actions"><button class="btn btn--solid" data-act="rebook"><i data-lucide="book-open"></i>Mượn lại</button></div>`;
    }

    return `<article class="slip" data-id="${esc(l.id)}">
      <header class="slip__head"><div class="slip__id"><span class="mono">#${esc(l.id)}</span>${badge}</div><div class="slip__meta">${right}</div></header>
      <div class="slip__body">${books}${note}</div><footer class="slip__foot">${foot}</footer></article>`;
  }

  function renderList() {
    if (isLoading) {
      $('#slips').innerHTML = `
        <div class="empty">
          <strong>Đang tải danh sách phiếu mượn...</strong>
          Đang đồng bộ dữ liệu trực tiếp từ cơ sở dữ liệu thư viện.
        </div>`;
      $('#pager').innerHTML = '';
      return;
    }

    if (loadError) {
      $('#slips').innerHTML = `
        <div class="empty">
          <strong>Không thể tải dữ liệu phiếu mượn</strong>
          <p style="margin: 6px 0 16px;">${esc(loadError)}</p>
          <button type="button" class="btn btn--solid" onclick="window.reloadLoans && window.reloadLoans()">Thử tải lại</button>
        </div>`;
      $('#pager').innerHTML = '';
      return;
    }

    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    page = Math.min(page, pages);
    const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    $('#slips').innerHTML = slice.length ? slice.map(slipHTML).join('')
      : '<div class="empty"><strong>Không tìm thấy phiếu mượn phù hợp</strong>Thử đổi từ khóa, chọn tab khác hoặc tạo phiếu mượn mới từ giỏ sách.</div>';
    $('#pager').innerHTML = `<button data-page="-1" aria-label="Trang trước" ${page <= 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>
      <span>${page} / ${pages}</span><button data-page="1" aria-label="Trang sau" ${page >= pages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>`;
  }

  function render() {
    if (!getSession().isLoggedIn) return;
    renderStats();
    renderTabs();
    renderList();
    icons();
  }

  /* ---------- Toast ---------- */
  const ICON = { success: 'check', error: 'alert-circle', info: 'info' };
  function toast(type, title, msg) {
    const el = document.createElement('div');
    el.className = `toast t-${type}`;
    el.innerHTML = `<span class="toast__icon"><i data-lucide="${ICON[type] || 'info'}"></i></span>
      <div class="toast__msg"><strong>${esc(title)}</strong><span>${esc(msg || '')}</span></div>
      <button class="toast__close" aria-label="Đóng"><i data-lucide="x"></i></button>`;
    $('#toasts').appendChild(el); icons();
    const close = () => { el.classList.add('is-out'); setTimeout(() => el.remove(), 200); };
    el.querySelector('.toast__close').onclick = close;
    setTimeout(close, 4000);
  }

  /* ---------- Dialog (trả về Promise<boolean>) ---------- */
  function dialog({ type = 'info', title, msg, ok = 'Xác nhận', cancel = 'Hủy', alertOnly = false }) {
    return new Promise(resolve => {
      const prev = document.activeElement;
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `<div class="dialog t-${type}" role="dialog" aria-modal="true" aria-labelledby="dlgT">
        <div class="dialog__icon"><i data-lucide="${type === 'success' ? 'check' : type === 'error' ? 'alert-circle' : 'info'}"></i></div>
        <h2 id="dlgT">${esc(title)}</h2><p>${esc(msg)}</p>
        <div class="dialog__actions">${alertOnly ? '' : `<button class="btn" data-r="0">${cancel}</button>`}<button class="btn btn--confirm" data-r="1">${alertOnly ? 'Đã hiểu' : ok}</button></div></div>`;
      document.body.appendChild(ov); icons();
      const btns = [...ov.querySelectorAll('button')];
      btns[btns.length - 1].focus();
      const done = v => { document.removeEventListener('keydown', key); ov.remove(); prev && prev.focus(); resolve(v); };
      const key = e => {
        if (e.key === 'Escape') done(false);
        if (e.key === 'Tab') {
          const f = btns[0], l = btns[btns.length - 1];
          if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
          else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
        }
      };
      document.addEventListener('keydown', key);
      ov.addEventListener('click', e => { if (e.target === ov) done(false); const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); });
    });
  }

  /* ---------- Hành động nối API thật ---------- */
  async function renew(l) {
    if (!l || l.renewed) return;
    const { user } = getSession();
    if (!user?.id) return;
    if (!await dialog({ type: 'info', title: 'Gia hạn thêm 7 ngày?', msg: `Phiếu #${l.id} sẽ được gia hạn đến ${fmtDate(l.dueAt + 7 * DAY)}. Mỗi phiếu chỉ được gia hạn 1 lần.`, ok: 'Gia hạn' })) return;

    try {
      const res = await api.patch(`/loans/${l.dbId}/renew`, { user_id: user.id });
      toast('success', 'Gia hạn thành công', res?.message || `Đã gia hạn phiếu #${l.id} thêm 7 ngày.`);
      await loadLoansFromDatabase();
    } catch (err) {
      toast('error', 'Không thể gia hạn', err?.message || 'Có lỗi xảy ra khi gia hạn phiếu mượn.');
    }
  }

  async function renewItem(l, btnEl) {
    const itemId = Number(btnEl?.dataset?.itemId || 0);
    if (!l || !itemId) return;
    const book = l.books.find(b => Number(b.itemId) === itemId);
    if (!book || book.returned || book.renewalCount >= 1) return;

    const { user } = getSession();
    if (!user?.id) return;
    const baseDue = book.dueAt || l.dueAt || Date.now();
    if (!await dialog({
      type: 'info',
      title: 'Gia hạn cuốn sách này (+7 ngày)?',
      msg: `Cuốn "${book.title}" trong phiếu #${l.id} sẽ được gia hạn đến ${fmtDate(baseDue + 7 * DAY)}. Mỗi cuốn chỉ được gia hạn tối đa 1 lần.`,
      ok: 'Gia hạn cuốn này'
    })) return;

    try {
      const res = await api.patch(`/loans/items/${itemId}/renew`, { user_id: user.id });
      toast('success', 'Gia hạn thành công', res?.message || `Đã gia hạn "${book.title}" thêm 7 ngày.`);
      await loadLoansFromDatabase();
    } catch (err) {
      toast('error', 'Không thể gia hạn cuốn sách', err?.message || 'Có lỗi xảy ra khi gia hạn cuốn sách này.');
    }
  }

  async function cancelReq(l) {
    if (!l) return;
    if (!await dialog({ type: 'error', title: 'Hủy yêu cầu mượn?', msg: `Phiếu #${l.id} sẽ được hủy và giải phóng sách giữ chỗ.`, ok: 'Hủy yêu cầu', cancel: 'Giữ lại' })) return;

    try {
      await api.patch(`/loans/${l.dbId}/cancel`);
      toast('success', 'Đã hủy yêu cầu', `Phiếu #${l.id} đã được hủy.`);
      await loadLoansFromDatabase();
    } catch (err) {
      toast('error', 'Không thể hủy yêu cầu', err?.message || 'Có lỗi xảy ra khi hủy phiếu mượn.');
    }
  }

  async function rebook(l) {
    if (!l) return;
    const held = countBooks(loans.filter(x => x.status === 'borrowing' || x.status === 'pending' || x.status === 'approved'));
    const isbns = [...new Set(l.books.map(b => b.isbn).filter(Boolean))];
    if (isbns.length === 0) {
      toast('error', 'Không thể mượn lại', 'Không tìm thấy mã ISBN sách trong phiếu.');
      return;
    }
    if (held + isbns.length > MAX_BOOKS) {
      return dialog({ type: 'error', title: 'Vượt giới hạn mượn', msg: `Bạn đang giữ ${held} cuốn. Mỗi độc giả chỉ được mượn tối đa ${MAX_BOOKS} cuốn cùng lúc.`, alertOnly: true });
    }
    if (!await dialog({ type: 'info', title: 'Mượn lại ấn phẩm này?', msg: 'Hệ thống sẽ gửi yêu cầu mượn trực tuyến mới ở trạng thái Chờ duyệt.', ok: 'Mượn lại' })) return;

    try {
      const created = await api.post('/loans/online', { book_isbns: isbns });
      const newCode = created?.code || buildLoanCode(created?.id || '', created?.created_at);
      filter = 'all';
      page = 1;
      toast('success', 'Đã gửi yêu cầu mượn', `Phiếu #${newCode} đang chờ thủ thư duyệt.`);
      await loadLoansFromDatabase();
    } catch (err) {
      toast('error', 'Không thể mượn lại', err?.message || 'Không thể tạo yêu cầu mượn mới.');
    }
  }

  function print(id) {
    const el = document.querySelector(`.slip[data-id="${id}"]`);
    if (!el) return;
    el.classList.add('is-printing');
    document.body.classList.add('print-one');
    const clean = () => {
      el.classList.remove('is-printing');
      document.body.classList.remove('print-one');
      window.removeEventListener('afterprint', clean);
    };
    window.addEventListener('afterprint', clean);
    window.print();
  }

  /* ---------- Sự kiện ---------- */
  $('#slips').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const slipEl = b.closest('.slip');
    if (!slipEl) return;
    const id = slipEl.dataset.id;
    const l = loans.find(x => x.id === id);
    if (!l) return;
    const actionMap = {
      renew,
      'renew-item': (loan) => renewItem(loan, b),
      cancel: cancelReq,
      rebook,
      print: () => print(id)
    };
    if (actionMap[b.dataset.act]) actionMap[b.dataset.act](l);
  });
  $('#tabs').addEventListener('click', e => { const t = e.target.closest('[data-filter]'); if (t) { filter = t.dataset.filter; page = 1; render(); } });
  $('#pager').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { page += +b.dataset.page; renderList(); icons(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });

  let timer;
  $('#searchInput').addEventListener('input', e => { clearTimeout(timer); timer = setTimeout(() => { query = e.target.value; page = 1; renderList(); icons(); }, 200); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#searchInput').focus(); } });

  // Hộp thoại xác nhận chung (Confirm dialog - Đồng bộ toàn hệ thống)
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
  }

  function closeConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    if (modal) modal.classList.remove("active");
    activeConfirmCallback = null;
  }

  // Menu tài khoản dropdown & Đăng xuất (đồng bộ hoàn toàn với home.js)
  const userProfileBtn = document.getElementById("userProfileBtn");
  const userAvatarEl = document.getElementById("userAvatar");
  const userNameEl = document.getElementById("userName");
  const userRoleEl = document.getElementById("userRole");
  const userDropdownMenu = document.getElementById("userDropdownMenu");
  const notifContainer = document.getElementById("notifDropdownContainer");
  const loanBasketBtn = document.getElementById("loanBasketBtn");

  try {
    const { user: currentUser, isLoggedIn } = getSession();

    if (notifContainer) notifContainer.style.display = isLoggedIn ? "" : "none";
    if (loanBasketBtn) loanBasketBtn.style.display = isLoggedIn ? "" : "none";

    if (isLoggedIn && currentUser) {
      const displayName = currentUser.full_name || currentUser.name || currentUser.email || "Độc giả";
      const initialChar = (displayName.trim().charAt(0) || "U").toUpperCase();
      const role = String(currentUser.role || "").toUpperCase();
      const displayRole = role === "ADMIN" ? "Quản trị viên" : role === "LIBRARIAN" ? "Thủ thư" : "Độc giả";

      if (userAvatarEl) userAvatarEl.textContent = initialChar;
      if (userNameEl) userNameEl.textContent = displayName;
      if (userRoleEl) userRoleEl.textContent = displayRole;

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
      if (userAvatarEl) userAvatarEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">person</span>';
      if (userNameEl) userNameEl.textContent = "Tài khoản";
      if (userRoleEl) userRoleEl.textContent = "Chưa đăng nhập";

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
  } catch (e) { /* ignore */ }

  if (userProfileBtn && userDropdownMenu) {
    userProfileBtn.addEventListener("click", e => {
      e.stopPropagation();
      userDropdownMenu.classList.toggle("show");
      const isShown = userDropdownMenu.classList.contains("show");
      userProfileBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
    });
  }

  document.addEventListener("click", e => {
    const logoutBtn = e.target.closest("#logoutMenuBtn");
    if (logoutBtn) {
      e.preventDefault();
      e.stopPropagation();
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
          toast("info", "Phiên làm việc đã kết thúc. Đang chuyển hướng...");
          setTimeout(() => {
            window.location.href = "login.html#login";
          }, 500);
        }
      });
    }
  });

  // Sự kiện nút Cancel/Proceed của confirm-modal
  const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
  const btnConfirmProceed = document.getElementById("btn-confirm-proceed");
  const confirmModalEl = document.getElementById("confirm-modal");

  if (btnConfirmCancel) btnConfirmCancel.addEventListener("click", closeConfirmModal);
  if (btnConfirmProceed) {
    btnConfirmProceed.addEventListener("click", () => {
      const cb = activeConfirmCallback;
      closeConfirmModal();
      if (typeof cb === "function") cb();
    });
  }
  if (confirmModalEl) {
    confirmModalEl.addEventListener("click", e => {
      if (e.target === confirmModalEl) closeConfirmModal();
    });
  }

  // Đóng dropdown khi click ngoài
  document.addEventListener("click", (e) => {
    if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
      if (!e.target.closest("#userDropdownContainer")) {
        userDropdownMenu.classList.remove("show");
        if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
      }
    }
  });

  // Mobile menu toggle
  const mobileToggle = $('#mobileMenuToggle'), navMenu = $('#navMenu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', e => {
      e.stopPropagation();
      navMenu.classList.toggle('show');
      const isShow = navMenu.classList.contains('show');
      mobileToggle.setAttribute('aria-expanded', isShow ? 'true' : 'false');
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#navMenu') && !e.target.closest('#mobileMenuToggle')) {
        navMenu.classList.remove('show');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (navMenu && navMenu.classList.contains('show')) {
          navMenu.classList.remove('show');
          mobileToggle.setAttribute('aria-expanded', 'false');
        }
        closeConfirmModal();
        if (userDropdownMenu && userDropdownMenu.classList.contains("show")) {
          userDropdownMenu.classList.remove("show");
          if (userProfileBtn) userProfileBtn.setAttribute("aria-expanded", "false");
        }
      }
    });
  }

  // Hỗ trợ chọn nhanh filter hoặc tra cứu phiếu qua URL
  window.setSlipFilter = (newFilter) => {
    filter = newFilter;
    page = 1;
    render();
  };

  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('filter')) filter = urlParams.get('filter');
    if (urlParams.get('loan_id')) query = urlParams.get('loan_id');
    if (urlParams.get('q')) query = urlParams.get('q');
    const searchInputEl = $('#searchInput');
    if (searchInputEl && query) searchInputEl.value = query;
  } catch (e) { /* ignore */ }

  // Cập nhật "Còn X ngày" mỗi phút
  setInterval(render, 60 * 1000);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLoansFromDatabase);
  } else {
    loadLoansFromDatabase();
  }
})();
