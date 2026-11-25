/**
 * ============================================================================
 * UNILIB LIBRARY SYSTEM - LOAN BASKET JAVASCRIPT (DỮ LIỆU THỰC TỪ DATABASE API)
 * - Đọc danh sách ISBN trong giỏ từ localStorage ("library_basket")
 * - Nạp thông tin chi tiết & tồn kho từ GET /api/books/{isbn}
 * - Gửi yêu cầu mượn trực tuyến thật qua POST /api/loans/online
 * ============================================================================
 */

let cartBooks = [];

// DOM Elements
const bookListContainer = document.getElementById('bookListContainer');
const emptyState = document.getElementById('emptyState');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectAllText = document.getElementById('selectAllText');
const cartBadge = document.getElementById('cartBadge');
const capacityText = document.getElementById('capacityText');
const summaryCount = document.getElementById('summaryCount');
const submitBtn = document.getElementById('submitBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');
const userProfileBtn = document.getElementById('userProfileBtn');
const userDropdownMenu = document.getElementById('userDropdownMenu');
const logoutMenuBtn = document.getElementById('logoutMenuBtn');
const borrowNote = document.getElementById('borrowNote');

// Custom Dropdown Elements
const customSelectContainer = document.getElementById('customSelectContainer');
const customSelectBtn = document.getElementById('customSelectBtn');
const customSelectDropdown = document.getElementById('customSelectDropdown');
const pickupLocationInput = document.getElementById('pickupLocationInput');
const selectedOptionText = document.getElementById('selectedOptionText');
const locationFormGroup = document.getElementById('locationFormGroup');

// Modals
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

const deleteAllModal = document.getElementById('deleteAllModal');
const cancelDeleteAllBtn = document.getElementById('cancelDeleteAllBtn');
const confirmDeleteAllBtn = document.getElementById('confirmDeleteAllBtn');

const submitModal = document.getElementById('submitModal');
const cancelSubmitBtn = document.getElementById('cancelSubmitBtn');
const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');

const logoutModal = document.getElementById('logoutModal');
const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

const toastContainer = document.getElementById('toastContainer');

let bookIsbnToDelete = null;
let isSubmittingLoan = false;

// ============================================================================
// 1. INITIALIZATION & NAVIGATION ACTIVE STATE
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    setupEventListeners();
    setupCustomDropdown();
    loadCartFromDatabase();
});

function setActiveNav() {
    const currentPage = document.body.dataset.page;
    const navLinks = document.querySelectorAll('.nav-link, .cart-icon-link');

    navLinks.forEach(link => {
        const pageAttr = link.getAttribute('data-page');
        if (pageAttr === currentPage) {
            link.classList.add('is-active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('is-active');
            link.removeAttribute('aria-current');
        }
    });
}

function readStoredBasket() {
    if (typeof getLibraryBasket === 'function') {
        return getLibraryBasket();
    }
    try {
        const raw = JSON.parse(localStorage.getItem('library_basket') || '[]');
        return Array.isArray(raw) ? raw.filter(item => item && item.isbn && item.isbn !== '000') : [];
    } catch {
        return [];
    }
}

function persistBasketState() {
    const payload = cartBooks.map(b => ({
        isbn: b.isbn,
        title: b.title,
        copy_code: b.copy_code || '',
        selected: Boolean(b.selected),
        added_at: b.added_at || new Date().toISOString(),
    }));
    if (typeof saveLibraryBasket === 'function') {
        saveLibraryBasket(payload);
    } else {
        try {
            localStorage.setItem('library_basket', JSON.stringify(payload));
        } catch {
            /* ignore */
        }
        updateCartBadge();
    }
}

function formatCoverUrl(url) {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed) return null;
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('blob:')
    ) {
        return trimmed;
    }
    const baseOrigin =
        typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL
            ? CONFIG.API_BASE_URL.replace(/\/api\/?$/, '')
            : '';
    return `${baseOrigin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

async function loadCartFromDatabase() {
    const storedItems = readStoredBasket();
    updateCartBadge();

    if (storedItems.length === 0) {
        cartBooks = [];
        renderBooks();
        return;
    }

    if (bookListContainer) {
        bookListContainer.style.display = 'flex';
        bookListContainer.innerHTML = `
            <div class="book-card" style="justify-content: center; padding: 36px 20px; color: var(--color-muted); text-align: center;">
                Đang đồng bộ thông tin ${storedItems.length} đầu sách từ cơ sở dữ liệu...
            </div>
        `;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    const results = await Promise.allSettled(
        storedItems.map(item => api.get(`/books/${encodeURIComponent(item.isbn)}`))
    );

    cartBooks = storedItems.map((item, idx) => {
        const res = results[idx];
        if (res.status === 'fulfilled' && res.value) {
            const data = res.value;
            const available = Number(data.available_copies || 0);
            const total = Number(data.total_copies || 0);
            const authorsText =
                Array.isArray(data.authors) && data.authors.length > 0
                    ? data.authors.map(a => a.name).filter(Boolean).join(', ')
                    : 'Chưa rõ tác giả';
            const publisherText = data.publisher?.name || 'Thư viện UniLib';
            const categoryText = data.category?.name || 'Tài liệu thư viện';
            const shelfText = data.shelf_location ? `Kệ: ${data.shelf_location}` : 'Kho thư viện chính';
            const status = available > 0 ? 'ready' : 'out';

            return {
                isbn: String(data.isbn || item.isbn),
                code: `ISBN: ${data.isbn || item.isbn}`,
                type: categoryText,
                title: data.title || item.title || item.isbn,
                author: authorsText,
                publisher: publisherText,
                location: shelfText,
                availableCopies: available,
                totalCopies: total,
                status,
                cover: formatCoverUrl(data.cover_image),
                copy_code: item.copy_code || '',
                selected: status === 'ready' ? item.selected !== false : false,
                added_at: item.added_at,
            };
        }

        const errStatus = res.status === 'rejected' ? res.reason?.status : 0;
        const isNotFound = errStatus === 404;
        return {
            isbn: String(item.isbn),
            code: `ISBN: ${item.isbn}`,
            type: isNotFound ? 'Không tìm thấy' : 'Chưa đồng bộ',
            title: item.title || `Đầu sách (${item.isbn})`,
            author: isNotFound ? 'Sách không còn tồn tại trong kho' : 'Không kết nối được tới máy chủ',
            publisher: 'Thư viện UniLib',
            location: '—',
            availableCopies: 0,
            totalCopies: 0,
            status: isNotFound ? 'missing' : 'error',
            cover: null,
            copy_code: item.copy_code || '',
            selected: false,
            added_at: item.added_at,
        };
    });

    renderBooks();
    updateCartBadge();
}

// ============================================================================
// 2. RENDERING & DOM UPDATES
// ============================================================================
function renderBooks() {
    if (!bookListContainer) return;

    if (cartBooks.length === 0) {
        bookListContainer.style.display = 'none';
        bookListContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        if (submitBtn) submitBtn.disabled = true;
        updateToolbarState();
        updateSummary();
        return;
    }

    bookListContainer.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;

    bookListContainer.innerHTML = cartBooks.map(book => {
        const statusClass = book.status === 'ready' ? 'ready' : (book.status === 'error' ? 'borrowed' : 'out');
        let statusText = 'Hết bản sẵn sàng';
        if (book.status === 'ready') {
            statusText = `Sẵn sàng (còn ${book.availableCopies}${book.totalCopies > 0 ? '/' + book.totalCopies : ''} bản)`;
        } else if (book.status === 'missing') {
            statusText = 'Không còn trong kho';
        } else if (book.status === 'error') {
            statusText = 'Lỗi tải dữ liệu';
        }

        const initials = getInitials(book.title);
        const safeIsbn = escapeHtml(book.isbn);
        const detailHref = `book_detail.html?isbn=${encodeURIComponent(book.isbn)}`;
        const coverHtml = book.cover
            ? `<img src="${escapeHtml(book.cover)}" alt="Bìa sách ${escapeHtml(book.title)}" class="book-cover" data-initials="${escapeHtml(initials)}" onerror="this.onerror=null; this.replaceWith(createCardCoverFallback(this.dataset.initials || 'BK'))">`
            : `<div class="cover-fallback">${escapeHtml(initials)}</div>`;

        return `
            <div class="book-card ${book.selected ? 'selected' : 'unselected'}" data-isbn="${safeIsbn}">
                <div class="book-card-left">
                    <label class="checkbox-label" aria-label="Chọn sách ${escapeHtml(book.title)}">
                        <input type="checkbox" class="book-checkbox" data-isbn="${safeIsbn}" ${book.selected ? 'checked' : ''} ${book.status !== 'ready' ? 'disabled' : ''}>
                        <span class="custom-checkbox"></span>
                    </label>
                </div>
                <a href="${detailHref}" class="book-cover-wrapper" style="text-decoration: none;">
                    ${coverHtml}
                </a>
                <div class="book-card-body">
                    <div>
                        <div class="book-meta-top">
                            <span class="book-code-tag">${escapeHtml(book.code)}</span>
                            <span class="book-type-tag">${escapeHtml(book.type)}</span>
                        </div>
                        <h3 class="book-title">
                            <a href="${detailHref}" style="color: inherit; text-decoration: none;">${escapeHtml(book.title)}</a>
                        </h3>
                        <p class="book-authors">${escapeHtml(book.author)} • ${escapeHtml(book.publisher)}</p>
                    </div>
                    <div>
                        <div class="book-divider"></div>
                        <div class="book-meta-bottom">
                            <div class="book-location">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <span class="location-shelf">${escapeHtml(book.location)}</span>
                            </div>
                            <div class="status-pill ${statusClass}">
                                <span class="status-dot"></span>
                                <span>${escapeHtml(statusText)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button type="button" class="trash-btn bounce-hover" data-isbn="${safeIsbn}" aria-label="Xóa ${escapeHtml(book.title)} khỏi giỏ">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    updateToolbarState();
    updateSummary();
    bindBookItemEvents();
}

function createCardCoverFallback(initials) {
    const div = document.createElement('div');
    div.className = 'cover-fallback';
    div.textContent = initials;
    return div;
}
window.createCardCoverFallback = createCardCoverFallback;

function getInitials(title) {
    return String(title || 'BK')
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'BK';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================================
// 3. CUSTOM DROPDOWN LOGIC
// ============================================================================
function setupCustomDropdown() {
    if (!customSelectContainer) return;

    customSelectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = customSelectContainer.classList.toggle('open');
        customSelectBtn.setAttribute('aria-expanded', isOpen);
        if (isOpen) {
            customSelectDropdown.focus();
        }
    });

    const options = customSelectDropdown.querySelectorAll('.custom-select-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            const val = option.getAttribute('data-value');
            const text = option.querySelector('span').textContent;

            pickupLocationInput.value = val;
            selectedOptionText.textContent = text;
            locationFormGroup.classList.remove('has-error');

            options.forEach(opt => {
                opt.classList.remove('selected');
                opt.setAttribute('aria-selected', 'false');
            });
            option.classList.add('selected');
            option.setAttribute('aria-selected', 'true');

            closeCustomDropdown();
        });
    });

    document.addEventListener('click', (e) => {
        if (!customSelectContainer.contains(e.target)) {
            closeCustomDropdown();
        }
    });

    customSelectDropdown.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCustomDropdown();
            customSelectBtn.focus();
        }
    });
}

function closeCustomDropdown() {
    if (customSelectContainer) customSelectContainer.classList.remove('open');
    if (customSelectBtn) customSelectBtn.setAttribute('aria-expanded', 'false');
}

// ============================================================================
// 4. EVENT LISTENERS & INTERACTION LOGIC
// ============================================================================
function setupEventListeners() {
    // Mobile menu toggle
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('show');
            const isShow = navMenu.classList.contains('show');
            mobileMenuToggle.setAttribute('aria-expanded', isShow ? 'true' : 'false');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#navMenu') && !e.target.closest('#mobileMenuToggle')) {
                navMenu.classList.remove('show');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('show')) {
                navMenu.classList.remove('show');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // User dropdown toggle
    if (userProfileBtn && userDropdownMenu) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('show');
            userProfileBtn.setAttribute('aria-expanded', userDropdownMenu.classList.contains('show'));
        });

        document.addEventListener('click', () => {
            userDropdownMenu.classList.remove('show');
            userProfileBtn.setAttribute('aria-expanded', 'false');
        });
    }

    if (logoutMenuBtn) {
        logoutMenuBtn.addEventListener('click', () => {
            if (userDropdownMenu) userDropdownMenu.classList.remove('show');
            if (userProfileBtn) userProfileBtn.setAttribute('aria-expanded', 'false');
            showConfirm({
                title: 'Xác nhận đăng xuất?',
                message: 'Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại không?',
                type: 'red',
                confirmText: 'Đăng xuất',
                cancelText: 'Hủy',
                onConfirm: () => {
                    if (typeof auth !== 'undefined' && typeof auth.clearSession === 'function') {
                        auth.clearSession();
                    } else {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('token');
                        localStorage.removeItem('user_info');
                        localStorage.removeItem('library_card');
                        sessionStorage.removeItem('access_token');
                        sessionStorage.removeItem('user_info');
                    }
                    showToast('Phiên làm việc đã kết thúc. Đang chuyển hướng...', 'Hẹn gặp lại bạn lần sau.', 'info');
                    setTimeout(() => {
                        window.location.href = 'login.html#login';
                    }, 500);
                }
            });
        });
    }

    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    const btnConfirmProceed = document.getElementById('btn-confirm-proceed');
    const confirmModalEl = document.getElementById('confirm-modal');

    if (btnConfirmCancel) btnConfirmCancel.addEventListener('click', closeConfirmModal);
    if (btnConfirmProceed) {
        btnConfirmProceed.addEventListener('click', () => {
            const cb = activeConfirmCallback;
            closeConfirmModal();
            if (typeof cb === 'function') cb();
        });
    }
    if (confirmModalEl) {
        confirmModalEl.addEventListener('click', (e) => {
            if (e.target === confirmModalEl) closeConfirmModal();
        });
    }

    // Select all checkbox
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            cartBooks.forEach(b => {
                if (b.status === 'ready') b.selected = isChecked;
            });
            persistBasketState();
            renderBooks();
        });
    }

    // Delete all button
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            if (cartBooks.length === 0) return;
            openDeleteAllModal();
        });
    }

    // Modal Delete 1
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (bookIsbnToDelete !== null) {
                const book = cartBooks.find(b => b.isbn === bookIsbnToDelete);
                cartBooks = cartBooks.filter(b => b.isbn !== bookIsbnToDelete);
                persistBasketState();
                showToast('Đã xóa khỏi giỏ mượn', `Cuốn «${book ? book.title : 'sách'}» đã được xóa khỏi giỏ.`, 'success');
            }
            closeDeleteModal();
            renderBooks();
            updateCartBadge();
        });
    }

    // Modal Delete All
    if (cancelDeleteAllBtn) {
        cancelDeleteAllBtn.addEventListener('click', closeDeleteAllModal);
    }
    if (confirmDeleteAllBtn) {
        confirmDeleteAllBtn.addEventListener('click', () => {
            cartBooks = [];
            persistBasketState();
            showToast('Đã xóa toàn bộ giỏ mượn', 'Giỏ mượn hiện đang trống.', 'success');
            closeDeleteAllModal();
            renderBooks();
            updateCartBadge();
        });
    }

    // Modal Logout
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', closeLogoutModal);
    }
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', () => {
            closeLogoutModal();
            if (typeof auth !== 'undefined' && typeof auth.clearSession === 'function') {
                auth.clearSession();
            }
            showToast('Đăng xuất thành công', 'Hẹn gặp lại bạn lần sau.', 'success');
            setTimeout(() => { location.href = 'login.html#login'; }, 700);
        });
    }

    // Modal click outside to close
    [deleteModal, deleteAllModal, submitModal, logoutModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });

    if (cancelSubmitBtn) {
        cancelSubmitBtn.addEventListener('click', closeSubmitModal);
    }

    // Submit Request Button & Validation
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (isSubmittingLoan) return;

            const token = typeof auth !== 'undefined' && auth.getToken ? auth.getToken() : null;
            const currentUser = typeof auth !== 'undefined' && auth.getUser ? auth.getUser() : null;
            if (!token || !currentUser) {
                showToast('Cần đăng nhập', 'Vui lòng đăng nhập tài khoản để gửi yêu cầu mượn sách.', 'error');
                sessionStorage.setItem('redirect_after_login', window.location.href);
                setTimeout(() => { window.location.href = 'login.html#login'; }, 900);
                return;
            }

            const selectedBooks = cartBooks.filter(b => b.selected);
            const locationVal = pickupLocationInput ? pickupLocationInput.value : '';

            if (selectedBooks.length === 0) {
                showToast('Không thể gửi yêu cầu', 'Vui lòng chọn ít nhất 1 cuốn sách sẵn sàng.', 'error');
                return;
            }

            if (!locationVal) {
                if (locationFormGroup) locationFormGroup.classList.add('has-error');
                showToast('Không thể gửi yêu cầu', 'Vui lòng chọn địa điểm nhận sách.', 'error');
                return;
            }
            if (locationFormGroup) locationFormGroup.classList.remove('has-error');

            if (selectedBooks.length > 5) {
                showToast('Không thể gửi yêu cầu', 'Bạn chỉ được mượn tối đa 5 đầu sách cùng lúc.', 'error');
                return;
            }

            const unreadyBook = selectedBooks.find(b => b.status !== 'ready');
            if (unreadyBook) {
                showToast('Không thể gửi yêu cầu', `Cuốn «${unreadyBook.title}» hiện không sẵn sàng mượn.`, 'error');
                return;
            }

            openSubmitModal(selectedBooks);
        });
    }

    if (confirmSubmitBtn) {
        confirmSubmitBtn.addEventListener('click', executeBorrowSubmission);
    }

    // Sync across browser tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'library_basket') {
            loadCartFromDatabase();
        }
    });

    // ESC key closes modals & dropdown
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDeleteModal();
            closeDeleteAllModal();
            closeSubmitModal();
            closeConfirmModal();
            closeLogoutModal();
            closeCustomDropdown();
            if (userDropdownMenu) userDropdownMenu.classList.remove('show');
        }
    });
}

function bindBookItemEvents() {
    document.querySelectorAll('.book-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const isbn = e.target.dataset.isbn;
            const book = cartBooks.find(b => b.isbn === isbn);
            if (book) {
                book.selected = e.target.checked;
                persistBasketState();
                updateToolbarState();
                updateSummary();
                const card = e.target.closest('.book-card');
                if (card) {
                    card.classList.toggle('selected', book.selected);
                    card.classList.toggle('unselected', !book.selected);
                }
            }
        });
    });

    document.querySelectorAll('.trash-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const isbn = e.currentTarget.dataset.isbn;
            const book = cartBooks.find(b => b.isbn === isbn);
            bookIsbnToDelete = isbn;
            openDeleteModal(book ? book.title : 'sách này');
        });
    });
}

function updateToolbarState() {
    if (!selectAllCheckbox) return;
    const total = cartBooks.length;
    const readyBooks = cartBooks.filter(b => b.status === 'ready');
    const selectedCount = readyBooks.filter(b => b.selected).length;

    if (total === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.disabled = true;
        if (selectAllText) selectAllText.textContent = 'Chọn tất cả (0 ấn phẩm)';
        if (deleteAllBtn) deleteAllBtn.disabled = true;
        return;
    }

    selectAllCheckbox.disabled = readyBooks.length === 0;
    if (deleteAllBtn) deleteAllBtn.disabled = false;
    if (selectAllText) selectAllText.textContent = `Chọn tất cả (${total} ấn phẩm)`;

    if (readyBooks.length === 0 || selectedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === readyBooks.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

function updateSummary() {
    const totalCartCount = cartBooks.length;
    const selectedCount = cartBooks.filter(b => b.selected && b.status === 'ready').length;

    if (capacityText) {
        capacityText.textContent = `${totalCartCount} / 5 cuốn được phép mượn`;
    }

    if (summaryCount) {
        summaryCount.textContent = `${selectedCount} cuốn sách`;
    }
}

function updateCartBadge() {
    if (typeof syncCartBadges === 'function') {
        syncCartBadges();
        return;
    }
    if (!cartBadge) return;
    const count = cartBooks.length;
    cartBadge.textContent = count > 9 ? '9+' : count;
    cartBadge.setAttribute('aria-label', `Giỏ mượn có ${count} cuốn sách`);
    cartBadge.style.display = count === 0 ? 'none' : 'flex';
}

// ============================================================================
// 5. MODAL CONTROLS & REAL DATABASE SUBMISSION (POST /api/loans/online)
// ============================================================================
function openDeleteModal(bookTitle) {
    const desc = document.getElementById('deleteModalDesc');
    if (desc) desc.textContent = `Bạn có chắc muốn xóa «${bookTitle}» khỏi giỏ mượn?`;
    if (deleteModal) deleteModal.style.display = 'flex';
}

function closeDeleteModal() {
    if (deleteModal) deleteModal.style.display = 'none';
    bookIsbnToDelete = null;
}

function openDeleteAllModal() {
    if (deleteAllModal) deleteAllModal.style.display = 'flex';
}

function closeDeleteAllModal() {
    if (deleteAllModal) deleteAllModal.style.display = 'none';
}

function closeSubmitModal() {
    if (submitModal) submitModal.style.display = 'none';
}

let activeConfirmCallback = null;

function showConfirm(options) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const iconBox = document.getElementById('confirm-icon-box');
    const iconEl = document.getElementById('confirm-icon');
    const btnProceed = document.getElementById('btn-confirm-proceed');
    const btnCancel = document.getElementById('btn-confirm-cancel');

    if (!modal) return;

    if (titleEl) titleEl.textContent = options.title || 'Xác nhận';
    if (msgEl) msgEl.textContent = options.message || 'Bạn có chắc chắn muốn thực hiện thao tác này?';

    if (iconBox) iconBox.className = 'confirm-icon-circle';
    if (btnProceed) btnProceed.className = 'btn-confirm-proceed';

    if (options.type === 'red') {
        if (iconBox) iconBox.classList.add('icon-red');
        if (btnProceed) btnProceed.classList.add('btn-danger');
        if (iconEl) iconEl.textContent = 'warning';
    } else if (options.type === 'green') {
        if (iconBox) iconBox.classList.add('icon-green');
        if (iconEl) iconEl.textContent = 'check_circle';
    } else {
        if (iconBox) iconBox.classList.add('icon-blue');
        if (iconEl) iconEl.textContent = 'help_outline';
    }

    if (btnProceed) btnProceed.textContent = options.confirmText || 'Xác nhận';
    if (btnCancel) btnCancel.textContent = options.cancelText || 'Hủy';

    activeConfirmCallback = options.onConfirm || null;
    modal.classList.add('active');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.remove('active');
    activeConfirmCallback = null;
}

function closeLogoutModal() {
    closeConfirmModal();
}

function openSubmitModal(selectedBooks) {
    document.getElementById('reviewBookCount').textContent = `${selectedBooks.length} cuốn`;
    if (selectedOptionText) {
        document.getElementById('reviewLocation').textContent = selectedOptionText.textContent;
    }

    const noteVal = borrowNote ? borrowNote.value.trim() : '';
    const noteRow = document.getElementById('reviewNoteRow');
    if (noteRow) {
        if (noteVal) {
            document.getElementById('reviewNoteText').textContent = noteVal;
            noteRow.style.display = 'flex';
        } else {
            noteRow.style.display = 'none';
        }
    }

    if (submitModal) submitModal.style.display = 'flex';
}

async function executeBorrowSubmission() {
    if (isSubmittingLoan) return;
    closeSubmitModal();

    const selectedBooks = cartBooks.filter(b => b.selected && b.status === 'ready');
    if (selectedBooks.length === 0) {
        showToast('Không thể gửi yêu cầu', 'Vui lòng chọn ít nhất 1 cuốn sách sẵn sàng.', 'error');
        return;
    }

    isSubmittingLoan = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Đang gửi yêu cầu...</span>';
    }

    const selectedIsbns = selectedBooks.map(b => b.isbn);

    try {
        const createdLoan = await api.post('/loans/online', { book_isbns: selectedIsbns });
        const loanCode = createdLoan && (createdLoan.code || `#${createdLoan.id}`);

        showToast(
            `Gửi yêu cầu thành công!${loanCode ? ` (${loanCode})` : ''}`,
            'Phiếu mượn đang ở trạng thái Chờ duyệt tại mục Phiếu mượn của tôi.',
            'success'
        );

        cartBooks = cartBooks.filter(b => !selectedIsbns.includes(b.isbn));
        persistBasketState();
        if (borrowNote) borrowNote.value = '';
        renderBooks();
        updateCartBadge();
    } catch (err) {
        const msg = (err && err.message) ? err.message : 'Gửi yêu cầu thất bại, vui lòng thử lại.';
        showToast('Không thể gửi yêu cầu', msg, 'error');
        if (msg.includes('không còn bản sao') || msg.includes('Không tìm thấy sách')) {
            loadCartFromDatabase();
        }
    } finally {
        isSubmittingLoan = false;
        if (submitBtn) {
            submitBtn.disabled = cartBooks.length === 0;
            submitBtn.innerHTML = `
                <span>Gửi Yêu Cầu Mượn Ngay</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            `;
        }
    }
}

// ============================================================================
// 6. TOAST NOTIFICATION MANAGER
// ============================================================================
function showToast(title, description, type = 'success') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if (type === 'error') {
        toast.setAttribute('role', 'alert');
    } else {
        toast.setAttribute('role', 'status');
    }

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
        iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else {
        iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
        <div class="toast-icon-circle">${iconSvg}</div>
        <div class="toast-content">
            <span class="toast-title">${escapeHtml(title)}</span>
            <span class="toast-desc">${escapeHtml(description)}</span>
        </div>
        <button class="toast-close-btn" aria-label="Đóng thông báo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="toast-progress">
            <div class="toast-progress-bar"></div>
        </div>
    `;

    toastContainer.appendChild(toast);

    let timer = setTimeout(() => {
        removeToast(toast);
    }, 3500);

    toast.addEventListener('mouseenter', () => {
        clearTimeout(timer);
        const bar = toast.querySelector('.toast-progress-bar');
        if (bar) bar.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
        const bar = toast.querySelector('.toast-progress-bar');
        if (bar) bar.style.animationPlayState = 'running';
        timer = setTimeout(() => {
            removeToast(toast);
        }, 2000);
    });

    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('click', () => {
        clearTimeout(timer);
        removeToast(toast);
    });
}

function removeToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 250);
}
