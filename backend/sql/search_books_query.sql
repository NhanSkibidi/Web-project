-- ==============================================================================
-- Mã task: T3CFBEF
-- Người thực hiện: Nguyễn Nhật Anh
-- Mô tả: Câu truy vấn tìm sách (JOIN tác giả, thể loại, đếm bản sao AVAILABLE)
-- ==============================================================================

SELECT
    b.isbn,
    b.title,
    b.publish_year,
    b.price,
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
    b.publish_year,
    b.price,
    c.name
ORDER BY b.title ASC;
