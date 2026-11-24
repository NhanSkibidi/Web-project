/**
 * ============================================================================
 * UNILIB LIBRARY SYSTEM - LOAN BASKET JAVASCRIPT
 * ============================================================================
 */

// Initial cart books dataset
let cartBooks = [
    {
        id: 1,
        code: "QA 76.9.D3",
        type: "Bản in chính",
        title: "Designing Data-Intensive Applications",
        author: "Martin Kleppmann",
        publisher: "NXB O'Reilly",
        location: "Kho Kỹ thuật — Kệ B2",
        status: "ready", // ready, borrowed, out
        cover: "../assets/images/Overlay+Border+Shadow (1).png",
        selected: true
    },
    {
        id: 2,
        code: "QA 76.76.C6",
        type: "Bản in chính",
        title: "Clean Architecture",
        author: "Robert C. Martin",
        publisher: "Prentice Hall",
        location: "Kho Kỹ thuật — Kệ A1",
        status: "ready",
        cover: "../assets/images/Overlay+Border+Shadow (2).png",
        selected: true
    },
    {
        id: 3,
        code: "HB 172.M3",
        type: "Tài liệu tham khảo",
        title: "Kinh Tế Vi Mô",
        author: "N. Gregory Mankiw",
        publisher: "NXB Cengage Learning",
        location: "Kho Kinh tế — Kệ E3",
        status: "ready",
        cover: "../assets/images/Overlay+Border+Shadow.png",
        selected: true
    }
];

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

let bookIdToDelete = null;

// ============================================================================
// 1. INITIALIZATION & NAVIGATION ACTIVE STATE
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    renderBooks();
    updateCartBadge();
    setupEventListeners();
    setupCustomDropdown();
});

/**
 * Sets active state in navigation header based on body[data-page]
 * Instruction guideline: change data-page on body (home, search, my-loans, admin, cart)
 */
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

// ============================================================================
// 2. RENDERING & DOM UPDATES
// ============================================================================
function renderBooks() {
    if (!bookListContainer) return;

    if (cartBooks.length === 0) {
        bookListContainer.style.display = 'none';
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
        const statusClass = book.status === 'ready' ? 'ready' : (book.status === 'borrowed' ? 'borrowed' : 'out');
        const statusText = book.status === 'ready' ? 'Sẵn sàng mượn' : (book.status === 'borrowed' ? 'Đang được mượn' : 'Hết bản');
        const initials = getInitials(book.title);

        return `
            <div class="book-card ${book.selected ? 'selected' : 'unselected'}" data-id="${book.id}">
                <div class="book-card-left">
                    <label class="checkbox-label" aria-label="Chọn sách ${escapeHtml(book.title)}">
                        <input type="checkbox" class="book-checkbox" data-id="${book.id}" ${book.selected ? 'checked' : ''}>
                        <span class="custom-checkbox"></span>
                    </label>
                </div>
                <div class="book-cover-wrapper">
                    <img src="${escapeHtml(encodeURI(book.cover))}" alt="Bìa sách ${escapeHtml(book.title)}" class="book-cover" onerror="this.onerror=null; this.replaceWith(createCardCoverFallback('${escapeHtml(initials)}'))">
                </div>
                <div class="book-card-body">
                    <div>
                        <div class="book-meta-top">
                            <span class="book-code-tag">${escapeHtml(book.code)}</span>
                            <span class="book-type-tag">${escapeHtml(book.type)}</span>
                        </div>
                        <h3 class="book-title">${escapeHtml(book.title)}</h3>
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
                                <span>Kho Kỹ thuật — <span class="location-shelf">${escapeHtml(book.location.split('—').pop().trim())}</span></span>
                            </div>
                            <div class="status-pill ${statusClass}">
                                <span class="status-dot"></span>
                                <span>${statusText}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button class="trash-btn bounce-hover" data-id="${book.id}" aria-label="Xóa ${escapeHtml(book.title)} khỏi giỏ">
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

function createAvatarFallback(name) {
    const div = document.createElement('div');
    div.className = 'avatar-fallback';
    div.textContent = name.charAt(0).toUpperCase();
    return div;
}

function getInitials(title) {
    return title.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
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
    customSelectContainer.classList.remove('open');
    customSelectBtn.setAttribute('aria-expanded', 'false');
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
            openLogoutModal();
        });
    }

    // Select all checkbox
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            cartBooks.forEach(b => b.selected = isChecked);
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
            if (bookIdToDelete !== null) {
                const book = cartBooks.find(b => b.id === bookIdToDelete);
                cartBooks = cartBooks.filter(b => b.id !== bookIdToDelete);
                showToast("Đã xóa khỏi giỏ mượn", `Cuốn «${book ? book.title : 'sách'}» đã được xóa khỏi giỏ.`, "success");
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
            showToast("Đã xóa toàn bộ giỏ mượn", "Giỏ mượn hiện đang trống.", "success");
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
            showToast("Đăng xuất thành công", "Hẹn gặp lại bạn lần sau.", "success");
            setTimeout(() => { location.href = "login.html#login"; }, 700);
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
        cancelSubmitBtn.addEventListener('click', () => {
            submitModal.style.display = 'none';
        });
    }

    // Submit Request Button & Validation
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const selectedBooks = cartBooks.filter(b => b.selected);
            const locationVal = pickupLocationInput.value;

            // Validation checks
            if (selectedBooks.length === 0) {
                showToast("Không thể gửi yêu cầu", "Vui lòng chọn ít nhất 1 cuốn sách.", "error");
                return;
            }

            if (!locationVal) {
                locationFormGroup.classList.add('has-error');
                showToast("Không thể gửi yêu cầu", "Vui lòng chọn địa điểm nhận sách.", "error");
                return;
            } else {
                locationFormGroup.classList.remove('has-error');
            }

            if (selectedBooks.length > 5) {
                showToast("Không thể gửi yêu cầu", "Bạn chỉ được mượn tối đa 5 đầu sách.", "error");
                return;
            }

            const unreadyBook = selectedBooks.find(b => b.status !== 'ready');
            if (unreadyBook) {
                showToast("Không thể gửi yêu cầu", `Cuốn «${unreadyBook.title}» hiện không sẵn sàng mượn.`, "error");
                return;
            }

            // Open confirmation summary modal
            openSubmitModal(selectedBooks);
        });
    }

    if (confirmSubmitBtn) {
        confirmSubmitBtn.addEventListener('click', executeBorrowSubmission);
    }

    // ESC key closes modals & dropdown
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDeleteModal();
            closeDeleteAllModal();
            closeSubmitModal();
            closeLogoutModal();
            closeCustomDropdown();
            if (userDropdownMenu) userDropdownMenu.classList.remove('show');
        }
    });
}

function bindBookItemEvents() {
    document.querySelectorAll('.book-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const book = cartBooks.find(b => b.id === id);
            if (book) {
                book.selected = e.target.checked;
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
            const id = parseInt(e.currentTarget.dataset.id);
            const book = cartBooks.find(b => b.id === id);
            bookIdToDelete = id;
            openDeleteModal(book ? book.title : 'sách này');
        });
    });
}

function updateToolbarState() {
    if (!selectAllCheckbox) return;
    const total = cartBooks.length;
    const selectedCount = cartBooks.filter(b => b.selected).length;

    if (total === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        if (selectAllText) selectAllText.textContent = `Chọn tất cả (0 ấn phẩm)`;
        if (deleteAllBtn) deleteAllBtn.disabled = true;
        return;
    }

    if (deleteAllBtn) deleteAllBtn.disabled = false;
    if (selectAllText) selectAllText.textContent = `Chọn tất cả (${total} ấn phẩm)`;

    if (selectedCount === total) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

function updateSummary() {
    const totalCartCount = cartBooks.length;
    const selectedCount = cartBooks.filter(b => b.selected).length;

    if (capacityText) {
        capacityText.textContent = `${totalCartCount} / 5 cuốn được phép mượn`;
    }

    if (summaryCount) {
        summaryCount.textContent = `${selectedCount} cuốn sách`;
    }
}

function updateCartBadge() {
    if (!cartBadge) return;
    const count = cartBooks.length;
    cartBadge.textContent = count > 9 ? "9+" : count;
    cartBadge.setAttribute('aria-label', `Giỏ mượn có ${count} cuốn sách`);

    if (count === 0) {
        cartBadge.style.display = 'none';
    } else {
        cartBadge.style.display = 'flex';
        cartBadge.style.transform = 'scale(1.3)';
        setTimeout(() => {
            cartBadge.style.transform = 'scale(1)';
        }, 200);
    }
}

// ============================================================================
// 5. MODAL CONTROLS & SUBMISSION API SIMULATION
// ============================================================================
function openDeleteModal(bookTitle) {
    const desc = document.getElementById('deleteModalDesc');
    if (desc) desc.textContent = `Bạn có chắc muốn xóa «${bookTitle}» khỏi giỏ mượn?`;
    if (deleteModal) deleteModal.style.display = 'flex';
}

function closeDeleteModal() {
    if (deleteModal) deleteModal.style.display = 'none';
    bookIdToDelete = null;
}

function openDeleteAllModal() {
    if (deleteAllModal) deleteAllModal.style.display = 'flex';
}

function closeDeleteAllModal() {
    if (deleteAllModal) deleteAllModal.style.display = 'none';
}

function openLogoutModal() {
    if (logoutModal) logoutModal.style.display = 'flex';
}

function closeLogoutModal() {
    if (logoutModal) logoutModal.style.display = 'none';
}

function openSubmitModal(selectedBooks) {
    document.getElementById('reviewBookCount').textContent = `${selectedBooks.length} cuốn`;
    document.getElementById('reviewLocation').textContent = selectedOptionText.textContent;

    const noteVal = borrowNote.value.trim();
    const noteRow = document.getElementById('reviewNoteRow');
    if (noteVal) {
        document.getElementById('reviewNoteText').textContent = noteVal;
        noteRow.style.display = 'flex';
    } else {
        noteRow.style.display = 'none';
    }

    if (submitModal) submitModal.style.display = 'flex';
}

function executeBorrowSubmission() {
    submitModal.style.display = 'none';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Đang gửi yêu cầu...</span>`;
    }

    const selectedIds = cartBooks.filter(b => b.selected).map(b => b.id);
    const payload = {
        bookIds: selectedIds,
        location: pickupLocationInput.value,
        note: borrowNote.value.trim(),
        timestamp: new Date().toISOString()
    };

    // TODO: thay bằng fetch() gọi Backend API thực tế
    submitBorrowRequest(payload)
        .then(response => {
            if (response.success) {
                showToast("Gửi yêu cầu thành công!", "Bạn có thể theo dõi tại mục Phiếu mượn của tôi.", "success");
                cartBooks = cartBooks.filter(b => !selectedIds.includes(b.id));
                if (borrowNote) borrowNote.value = '';
                renderBooks();
                updateCartBadge();
            } else {
                throw new Error(response.message || "Lỗi hệ thống");
            }
        })
        .catch(err => {
            showToast("Không thể gửi yêu cầu", "Gửi yêu cầu thất bại, vui lòng thử lại.", "error");
        })
        .finally(() => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <span>Gửi Yêu Cầu Mượn Ngay</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                `;
            }
        });
}

function submitBorrowRequest(payload) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true, data: payload });
        }, 1000);
    });
}

// ============================================================================
// 6. SOPHISTICATED TOAST NOTIFICATION MANAGER
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
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
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

    // Pause on hover
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