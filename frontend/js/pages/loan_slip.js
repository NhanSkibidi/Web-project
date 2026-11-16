(() => {
  'use strict';

  const IMG = '../assets/images/';
  const KEY = 'unilib_loan_slips_v1';
  const PAGE_SIZE = 5, MAX_BOOKS = 5, DAY = 864e5;

  const seed = () => {
    const now = Date.now();
    return [
      { id: 'PM-8841', status: 'borrowing', borrowedAt: now - 10 * DAY, dueAt: now + 4 * DAY, renewed: false,
        place: 'Quầy Thủ thư Tầng 2',
        books: [
          { title: 'Clean Architecture', author: 'Robert C. Martin', code: 'ARC-0092-B', shelf: 'Kệ: A3-14', img: 'Overlay+Border+Shadow (1).png' },
          { title: 'System Design Interview', author: 'Alex Xu', code: 'SYS-4410-X', shelf: 'Kệ: B2-01', img: 'Overlay+Border+Shadow (2).png' }] },
      { id: 'PM-8902', status: 'pending', submittedAt: now - 60 * 1000,
        books: [{ title: 'Trí tuệ Nhân tạo', author: 'Stuart Russell, Peter Norvig', code: 'AI-1082-VN', shelf: 'Kệ: C1-05', img: 'Overlay+Border+Shadow.png' }] },
      { id: 'PM-8610', status: 'returned', returnedAt: now - 13 * DAY, onTime: true, txn: 'RTN-99420',
        books: [{ title: 'Nguyên lý Tiếp thị Căn bản', author: 'Philip Kotler, Gary Armstrong', code: 'MKT-5821-VN', shelf: 'Kho sách Kinh tế', img: 'Overlay.png' }] }
    ];
  };

  let loans = load();
  let filter = 'all', query = '', page = 1;

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(s)) return s; } catch (e) { /* bỏ qua */ }
    return seed();
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(loans)); } catch (e) { /* bỏ qua */ } };
  window.resetDemo = () => { loans = seed(); save(); filter = 'all'; query = ''; page = 1; render(); };

  const $ = (s, r = document) => r.querySelector(s);
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const fmtTime = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = () => window.lucide && window.lucide.createIcons();
  const daysLeft = l => Math.ceil((l.dueAt - Date.now()) / DAY);
  const isOverdue = l => l.status === 'borrowing' && l.dueAt < Date.now();
  const countBooks = ls => ls.reduce((n, l) => n + l.books.length, 0);

  function dueBadge(l) {
    const d = daysLeft(l);
    if (d < 0) return `<span class="badge badge--danger">Quá hạn ${-d} ngày</span>`;
    if (d === 0) return '<span class="badge badge--warn">Hết hạn hôm nay</span>';
    return `<span class="badge ${d > 3 ? 'badge--ok' : 'badge--warn'}">Còn ${d} ngày</span>`;
  }

  /* ---------- Render ---------- */
  function filtered() {
    const q = norm(query.trim());
    return loans.filter(l => (filter === 'all' || l.status === filter) &&
      (!q || norm(l.id).includes(q) || l.books.some(b => norm(b.title).includes(q))));
  }

  function renderStats() {
    const borrowing = loans.filter(l => l.status === 'borrowing');
    const pending = loans.filter(l => l.status === 'pending');
    const overdue = countBooks(borrowing.filter(isOverdue));
    const card = (img, label, num, unit, badge) => `
      <article class="stat"><div class="stat__icon"><img src="${IMG}${img}" alt="" width="28" height="28"></div>
        <div class="stat__body"><span class="stat__label">${label}</span><div class="stat__num">${num} <small>${unit}</small></div></div>${badge}</article>`;
    $('#stats').innerHTML =
      card('đang_muon.png', 'Đang mượn', countBooks(borrowing), 'cuốn', `<span class="badge badge--ok badge--dot">${borrowing.length} phiếu</span>`) +
      card('cho_duyet.png', 'Chờ duyệt', pending.length, 'phiếu', '<span class="badge badge--warn badge--dot">Đang xử lý</span>') +
      card('qua_han.png', 'Quá hạn', overdue, 'cuốn', overdue ? '<span class="badge badge--danger">Cần xử lý</span>' : '<span class="badge badge--ok">An toàn</span>');
  }

  function renderTabs() {
    const c = s => (s === 'all' ? loans.length : loans.filter(l => l.status === s).length);
    const tabs = [['all', 'Tất cả'], ['borrowing', 'Đang mượn'], ['pending', 'Chờ duyệt'], ['returned', 'Đã trả']];
    $('#tabs').innerHTML = tabs.map(([k, t]) =>
      `<button class="tab ${filter === k ? 'is-active' : ''}" role="tab" aria-selected="${filter === k}" data-filter="${k}">${t} (${c(k)})</button>`).join('');
  }

  const bookHTML = b => `
    <div class="book"><img class="book__cover" src="${IMG}${encodeURI(b.img)}" alt="Bìa sách ${esc(b.title)}" width="80" height="110"
      onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2780%27 height=%27110%27%3E%3Crect width=%2780%27 height=%27110%27 fill=%27%23e6e2d8%27/%3E%3C/svg%3E'">
      <div><h3 class="book__title">${esc(b.title)}</h3><p class="book__author">${esc(b.author)}</p>
      <p class="book__code">Mã: <b>${esc(b.code)}</b> &bull; ${esc(b.shelf)}</p></div></div>`;

  function slipHTML(l) {
    const books = l.books.map(bookHTML).join('');
    let badge, right, note = '', foot;
    if (l.status === 'borrowing') {
      badge = '<span class="badge badge--ok badge--dot">Đang mượn</span>';
      right = `<i data-lucide="calendar"></i><span>Hạn trả:</span><span class="mono">${fmtDate(l.dueAt)}</span>${dueBadge(l)}`;
      foot = `<span class="meta-text"><i data-lucide="clock"></i><span>Mượn ngày <b class="mono">${fmtDate(l.borrowedAt)}</b> tại ${esc(l.place)}</span></span>
        <div class="actions">
          <button class="btn btn--outline" data-act="renew" ${l.renewed ? 'disabled title="Phiếu này đã được gia hạn 1 lần"' : ''}><i data-lucide="refresh-cw"></i>Gia hạn thêm (+7 ngày)</button>
          <button class="btn btn--icon" data-act="print" aria-label="In phiếu" title="In phiếu"><i data-lucide="printer"></i></button></div>`;
    } else if (l.status === 'pending') {
      badge = '<span class="badge badge--warn badge--dot">Chờ duyệt</span>';
      const today = new Date(l.submittedAt).toDateString() === new Date().toDateString();
      right = `<i data-lucide="clock"></i><span>Gửi lúc:</span><span class="mono">${fmtTime(l.submittedAt)} ${today ? 'hôm nay' : fmtDate(l.submittedAt)}</span>`;
      note = `<div class="note"><i data-lucide="clock"></i><div><h3>Đang chờ thủ thư chuẩn bị ấn phẩm</h3><p>Bạn sẽ nhận được thông báo qua email trường khi sách sẵn sàng để lấy tại quầy mượn Tầng 1.</p></div></div>`;
      foot = `<span class="meta-text"><i data-lucide="info"></i><span>Yêu cầu đặt trước qua cổng OPAC trực tuyến</span></span>
        <div class="actions"><button class="btn btn--danger" data-act="cancel"><i data-lucide="x"></i>Hủy yêu cầu</button></div>`;
    } else {
      badge = '<span class="badge badge--gray badge--dot">Đã trả</span>';
      right = `<i data-lucide="check"></i><span>Ngày trả:</span><span class="mono">${fmtDate(l.returnedAt)}</span><span class="badge badge--ok">Đúng hạn</span>`;
      note = `<div class="note note--done"><i data-lucide="check-circle-2"></i><div><h3>Ghi nhận hoàn tất không hư hại</h3><p>Đã hoàn tất hoàn trả qua máy mượn trả tự động Self-Check Station #02.</p></div></div>`;
      foot = `<span class="meta-text"><i data-lucide="file-text"></i><span>Mã giao dịch trả: <b class="mono">${esc(l.txn)}</b></span></span>
        <div class="actions"><button class="btn btn--solid" data-act="rebook"><i data-lucide="book-open"></i>Mượn lại</button></div>`;
    }
    return `<article class="slip" data-id="${l.id}">
      <header class="slip__head"><div class="slip__id"><span class="mono">#${l.id}</span>${badge}</div><div class="slip__meta">${right}</div></header>
      <div class="slip__body">${books}${note}</div><footer class="slip__foot">${foot}</footer></article>`;
  }

  function renderList() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    page = Math.min(page, pages);
    const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    $('#slips').innerHTML = slice.length ? slice.map(slipHTML).join('')
      : '<div class="empty"><strong>Không tìm thấy phiếu mượn phù hợp</strong>Thử đổi từ khóa hoặc chọn tab khác.</div>';
    $('#pager').innerHTML = `<button data-page="-1" aria-label="Trang trước" ${page <= 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>
      <span>${page} / ${pages}</span><button data-page="1" aria-label="Trang sau" ${page >= pages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>`;
  }

  function render() { renderStats(); renderTabs(); renderList(); icons(); }

  /* ---------- Toast ---------- */
  const ICON = { success: 'check', error: 'alert-circle', info: 'info' };
  function toast(type, title, msg) {
    const el = document.createElement('div');
    el.className = `toast t-${type}`;
    el.innerHTML = `<span class="toast__icon"><i data-lucide="${ICON[type]}"></i></span>
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
        if (e.key === 'Tab') { // focus trap
          const f = btns[0], l = btns[btns.length - 1];
          if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
          else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
        }
      };
      document.addEventListener('keydown', key);
      ov.addEventListener('click', e => { if (e.target === ov) done(false); const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); });
    });
  }

  /* ---------- Hành động ---------- */
  async function renew(l) {
    if (l.renewed) return;
    if (!await dialog({ type: 'info', title: 'Gia hạn thêm 7 ngày?', msg: `Phiếu #${l.id} sẽ được gia hạn đến ${fmtDate(l.dueAt + 7 * DAY)}. Mỗi phiếu chỉ được gia hạn 1 lần.`, ok: 'Gia hạn' })) return;
    l.dueAt += 7 * DAY; l.renewed = true; save(); render();
    toast('success', 'Gia hạn thành công', `Hạn trả mới của #${l.id}: ${fmtDate(l.dueAt)}.`);
  }
  async function cancelReq(l) {
    if (!await dialog({ type: 'error', title: 'Hủy yêu cầu mượn?', msg: `Phiếu #${l.id} sẽ bị xóa khỏi danh sách và không thể khôi phục.`, ok: 'Hủy yêu cầu', cancel: 'Giữ lại' })) return;
    loans = loans.filter(x => x.id !== l.id); save(); render();
    toast('success', 'Đã hủy yêu cầu', `Phiếu #${l.id} đã được hủy.`);
  }
  async function rebook(l) {
    const held = countBooks(loans.filter(x => x.status === 'borrowing' || x.status === 'pending'));
    if (held + l.books.length > MAX_BOOKS) {
      return dialog({ type: 'error', title: 'Vượt giới hạn mượn', msg: `Bạn đang giữ ${held} cuốn. Mỗi độc giả chỉ được mượn tối đa ${MAX_BOOKS} cuốn cùng lúc.`, alertOnly: true });
    }
    if (!await dialog({ type: 'info', title: 'Mượn lại ấn phẩm này?', msg: 'Hệ thống sẽ tạo một phiếu mới ở trạng thái Chờ duyệt.', ok: 'Mượn lại' })) return;
    const n = Math.max(...loans.map(x => parseInt(x.id.split('-')[1], 10)), 8900) + 1;
    loans.unshift({ id: `PM-${n}`, status: 'pending', submittedAt: Date.now(), books: l.books.map(b => ({ ...b })) });
    save(); filter = 'all'; page = 1; render();
    toast('success', 'Đã gửi yêu cầu mượn', `Phiếu #PM-${n} đang chờ thủ thư duyệt.`);
  }
  function print(id) {
    const el = document.querySelector(`.slip[data-id="${id}"]`);
    el.classList.add('is-printing'); document.body.classList.add('print-one');
    const clean = () => { el.classList.remove('is-printing'); document.body.classList.remove('print-one'); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean);
    window.print();
  }

  /* ---------- Sự kiện ---------- */
  $('#slips').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const id = b.closest('.slip').dataset.id, l = loans.find(x => x.id === id);
    ({ renew, cancel: cancelReq, rebook, print: () => print(id) })[b.dataset.act](l);
  });
  $('#tabs').addEventListener('click', e => { const t = e.target.closest('[data-filter]'); if (t) { filter = t.dataset.filter; page = 1; render(); } });
  $('#pager').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { page += +b.dataset.page; renderList(); icons(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });

  let timer;
  $('#searchInput').addEventListener('input', e => { clearTimeout(timer); timer = setTimeout(() => { query = e.target.value; page = 1; renderList(); icons(); }, 200); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#searchInput').focus(); } });

  // Menu tài khoản
  const btn = $('#accountBtn'), menu = $('#accountMenu');
  const setMenu = o => { menu.hidden = !o; btn.setAttribute('aria-expanded', o); };
  btn.addEventListener('click', e => { e.stopPropagation(); setMenu(menu.hidden); });
  document.addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', async e => {
    if (!e.target.closest('[data-act="logout"]')) return;
    setMenu(false);
    if (await dialog({ type: 'info', title: 'Đăng xuất?', msg: 'Bạn sẽ thoát khỏi phiên làm việc hiện tại.', ok: 'Đăng xuất' })) window.location.href = 'login.html';
  });

  // Cập nhật "Còn X ngày" mỗi phút
  setInterval(render, 60 * 1000);
  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();
})();