-- Tạo database app_db + bảng items + dữ liệu mẫu.
-- Cách chạy bằng MySQL Workbench:
--   File > Open SQL Script... > chọn file này > bấm nút tia sét (Execute) > Refresh ô SCHEMAS.
-- Chạy lại nhiều lần không lỗi (đã có thì bỏ qua), chỉ là dữ liệu mẫu sẽ bị thêm lặp.

SET NAMES utf8mb4; -- để tiếng Việt không bị lỗi font

CREATE DATABASE IF NOT EXISTS app_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE app_db;

CREATE TABLE IF NOT EXISTS items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO items (name, description, price) VALUES
  ('Cơm rang dưa bò', 'Món mẫu để kiểm tra API', 45000),
  ('Trà đá', 'Dữ liệu mẫu số 2', 5000);


CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,               -- email không được trùng
  password_hash VARCHAR(255) NOT NULL,                      -- mật khẩu đã băm bcrypt
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(20) NULL,
  role          ENUM('ADMIN', 'LIBRARIAN', 'READER') NOT NULL DEFAULT 'READER',
  status        ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS library_cards (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  card_code        VARCHAR(20) NOT NULL UNIQUE,             -- mã thẻ, vd LC-0001
  reader_id        INT NOT NULL,                            -- thẻ của độc giả nào
  card_type        ENUM('STANDARD', 'STUDENT', 'VIP') NOT NULL DEFAULT 'STANDARD',
  issue_date       DATE NOT NULL,                           -- ngày cấp
  expiry_date      DATE NOT NULL,                           -- ngày hết hạn
  max_borrow_books INT NOT NULL DEFAULT 5,                  -- số sách được mượn tối đa
  status           ENUM('ACTIVE', 'EXPIRED', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_library_cards_reader_id (reader_id),
  -- Khoá ngoại: reader_id phải là 1 id có thật trong bảng users
  CONSTRAINT fk_library_cards_reader FOREIGN KEY (reader_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- Task T3CFBEF: Câu truy vấn tìm sách (JOIN tác giả, thể loại, đếm bản sao AVAILABLE)
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
GROUP BY
    b.isbn,
    b.title,
    c.name
ORDER BY b.title ASC;

