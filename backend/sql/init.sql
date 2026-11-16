-- ==============================================================================
-- Khởi tạo cơ sở dữ liệu app_db cho Hệ thống Quản lý Thư viện (KS25 Library)
-- Cách chạy bằng MySQL Workbench:
--   File > Open SQL Script... > chọn file này > bấm nút tia sét (Execute) > Refresh SCHEMAS.
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS app_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE app_db;

-- 1. Bảng items (CRUD mẫu)
CREATE TABLE IF NOT EXISTS items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng users (Tài khoản người dùng)
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(20) NULL,
  role          ENUM('ADMIN', 'LIBRARIAN', 'READER') NOT NULL DEFAULT 'READER',
  status        ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng library_cards (Thẻ thư viện)
CREATE TABLE IF NOT EXISTS library_cards (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  card_code        VARCHAR(20) NOT NULL UNIQUE,
  reader_id        INT NOT NULL,
  card_type        ENUM('STANDARD', 'STUDENT', 'VIP') NOT NULL DEFAULT 'STANDARD',
  issue_date       DATE NOT NULL,
  expiry_date      DATE NOT NULL,
  max_borrow_books INT NOT NULL DEFAULT 5,
  status           ENUM('ACTIVE', 'EXPIRED', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_library_cards_reader_id (reader_id),
  CONSTRAINT fk_library_cards_reader FOREIGN KEY (reader_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng categories (Thể loại sách)
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng publishers (Nhà xuất bản)
CREATE TABLE IF NOT EXISTS publishers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  address     VARCHAR(255) NULL,
  phone       VARCHAR(20) NULL,
  email       VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng authors (Tác giả)
CREATE TABLE IF NOT EXISTS authors (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  bio         TEXT NULL,
  nationality VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng books (Đầu sách)
CREATE TABLE IF NOT EXISTS books (
  isbn         VARCHAR(20) PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  category_id  INT NULL,
  publisher_id INT NULL,
  publish_year INT NULL,
  page_count   INT NULL,
  language     VARCHAR(50) DEFAULT 'Tiếng Việt',
  description  TEXT NULL,
  cover_image  VARCHAR(500) NULL,
  price        DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_books_category (category_id),
  INDEX idx_books_publisher (publisher_id),
  CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_books_publisher FOREIGN KEY (publisher_id) REFERENCES publishers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng book_authors (Liên kết Sách - Tác giả)
CREATE TABLE IF NOT EXISTS book_authors (
  book_isbn VARCHAR(20) NOT NULL,
  author_id INT NOT NULL,
  PRIMARY KEY (book_isbn, author_id),
  CONSTRAINT fk_ba_book FOREIGN KEY (book_isbn) REFERENCES books (isbn) ON DELETE CASCADE,
  CONSTRAINT fk_ba_author FOREIGN KEY (author_id) REFERENCES authors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng book_copies (Bản sao cuốn sách)
CREATE TABLE IF NOT EXISTS book_copies (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  book_isbn      VARCHAR(20) NOT NULL,
  copy_code      VARCHAR(50) NOT NULL UNIQUE,
  shelf_location VARCHAR(100) NOT NULL,
  imported_at    DATE NOT NULL,
  `condition`    VARCHAR(20) NOT NULL DEFAULT 'MỚI',
  status         ENUM('AVAILABLE', 'BORROWED', 'RESERVED', 'LOST', 'DAMAGED', 'DISPOSED') NOT NULL DEFAULT 'AVAILABLE',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_copies_isbn (book_isbn),
  CONSTRAINT fk_copies_book FOREIGN KEY (book_isbn) REFERENCES books (isbn) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bảng copy_status_logs (Lịch sử chuyển trạng thái bản sao)
CREATE TABLE IF NOT EXISTS copy_status_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  book_copy_id INT NOT NULL,
  old_status   VARCHAR(20) NULL,
  new_status   ENUM('AVAILABLE', 'BORROWED', 'RESERVED', 'LOST', 'DAMAGED', 'DISPOSED') NOT NULL,
  changed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_csl_copy FOREIGN KEY (book_copy_id) REFERENCES book_copies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Bảng loans (Phiếu mượn sách)
CREATE TABLE IF NOT EXISTS loans (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  processed_by  INT NULL,
  borrow_type   ENUM('ONLINE', 'WALK_IN') NOT NULL DEFAULT 'ONLINE',
  status        ENUM('PENDING', 'APPROVED', 'BORROWED', 'RETURNED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  reject_reason TEXT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  borrowed_at   DATETIME NULL,
  due_date      DATETIME NULL,
  INDEX idx_loans_user (user_id),
  CONSTRAINT fk_loans_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_loans_librarian FOREIGN KEY (processed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Bảng loan_items (Chi tiết phiếu mượn)
CREATE TABLE IF NOT EXISTS loan_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  loan_id       INT NOT NULL,
  book_isbn     VARCHAR(20) NOT NULL,
  copy_id       INT NULL,
  due_date      DATETIME NULL,
  renewal_count INT NOT NULL DEFAULT 0,
  return_date   DATETIME NULL,
  INDEX idx_loan_items_loan (loan_id),
  INDEX idx_loan_items_copy (copy_id),
  CONSTRAINT fk_li_loan FOREIGN KEY (loan_id) REFERENCES loans (id) ON DELETE CASCADE,
  CONSTRAINT fk_li_book FOREIGN KEY (book_isbn) REFERENCES books (isbn),
  CONSTRAINT fk_li_copy FOREIGN KEY (copy_id) REFERENCES book_copies (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Bảng reservations (Đặt trước sách)
CREATE TABLE IF NOT EXISTS reservations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  book_isbn       VARCHAR(20) NOT NULL,
  reserved_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status          ENUM('WAITING', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'WAITING',
  pickup_deadline DATETIME NULL,
  copy_id         INT NULL,
  INDEX idx_res_user (user_id),
  INDEX idx_res_isbn (book_isbn),
  CONSTRAINT fk_res_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_res_book FOREIGN KEY (book_isbn) REFERENCES books (isbn),
  CONSTRAINT fk_res_copy FOREIGN KEY (copy_id) REFERENCES book_copies (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Bảng fines (Xử lý phạt vi phạm)
CREATE TABLE IF NOT EXISTS fines (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  loan_id      INT NOT NULL,
  book_copy_id INT NOT NULL,
  fine_type    VARCHAR(50) NOT NULL,
  amount       FLOAT NOT NULL DEFAULT 0.0,
  status       VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
  collected_by INT NULL,
  collected_at DATETIME NULL,
  waive_reason VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fines_user (user_id),
  INDEX idx_fines_status (status),
  CONSTRAINT fk_fines_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_fines_loan FOREIGN KEY (loan_id) REFERENCES loans (id),
  CONSTRAINT fk_fines_copy FOREIGN KEY (book_copy_id) REFERENCES book_copies (id),
  CONSTRAINT fk_fines_collector FOREIGN KEY (collected_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- Dữ liệu mẫu ban đầu
-- ==============================================================================
INSERT IGNORE INTO items (id, name, description, price) VALUES
  (1, 'Cơm rang dưa bò', 'Món mẫu để kiểm tra API', 45000),
  (2, 'Trà đá', 'Dữ liệu mẫu số 2', 5000);

-- ==============================================================================
-- Câu truy vấn kiểm tra tìm sách (JOIN tác giả, thể loại, đếm bản sao AVAILABLE)
-- ==============================================================================
SELECT
    b.isbn,
    b.title,
    c.name AS category_name,
    GROUP_CONCAT(DISTINCT a.name ORDER BY a.name ASC SEPARATOR ', ') AS authors,
    COUNT(DISTINCT bc.id) AS available_copies
FROM books b
LEFT JOIN categories c
    ON b.category_id = c.id
LEFT JOIN book_authors ba
    ON b.isbn = ba.book_isbn
LEFT JOIN authors a
    ON ba.author_id = a.id
LEFT JOIN book_copies bc
    ON b.isbn = bc.book_isbn
    AND bc.status = 'AVAILABLE'
WHERE b.is_deleted = FALSE
GROUP BY
    b.isbn,
    b.title,
    c.name
ORDER BY b.title ASC;
