"""Logic thống kê thư viện cho Dashboard (Task T3CFF62).

Hỗ trợ lọc theo khoảng thời gian (start_date, end_date hoặc preset period)
và gom nhóm theo ngày (day) hoặc theo tháng (month).
Tương thích 100% cả MySQL 8 và SQLite (không phụ thuộc hàm ngày đặc thù dialect).
"""
from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.Book import Book
from app.models.BookCopy import BookCopy
from app.models.Category import Category
from app.models.fine import Fine
from app.models.library_card import CardStatus, LibraryCard
from app.models.loan import Loan, LoanStatus
from app.models.loan_item import LoanItem


def resolve_date_range(
    period: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[date, date, str]:
    """Chuẩn hóa khoảng thời gian lọc [start_d, end_d] và tên period."""
    today = date.today()

    if start_date and end_date:
        if start_date > end_date:
            raise HTTPException(
                status_code=400,
                detail="Ngày bắt đầu (start_date) không được lớn hơn ngày kết thúc (end_date)",
            )
        return start_date, end_date, period or "custom"

    p = (period or "month").lower().strip()
    if p == "today":
        return today, today, "today"
    if p == "week":
        return today - timedelta(days=6), today, "week"
    if p == "year":
        return date(today.year, 1, 1), today, "year"
    # Mặc định 30 ngày gần nhất (month)
    return today - timedelta(days=29), today, "month"


def _month_keys_between(start_d: date, end_d: date) -> list[tuple[str, str]]:
    """Sinh danh sách (YYYY-MM, MM/YYYY) liên tục giữa start_d và end_d."""
    keys = []
    y, m = start_d.year, start_d.month
    while (y, m) <= (end_d.year, end_d.month):
        keys.append((f"{y:04d}-{m:02d}", f"T{m:02d}/{y}"))
        if m == 12:
            y += 1
            m = 1
        else:
            m += 1
    return keys


def _day_keys_between(start_d: date, end_d: date) -> list[tuple[str, str]]:
    """Sinh danh sách (YYYY-MM-DD, DD/MM) liên tục giữa start_d và end_d."""
    keys = []
    cur = start_d
    # Giới hạn tối đa 366 ngày nếu chọn theo ngày để tránh payload quá lớn
    max_days = 366
    count = 0
    while cur <= end_d and count < max_days:
        keys.append((cur.strftime("%Y-%m-%d"), cur.strftime("%d/%m")))
        cur += timedelta(days=1)
        count += 1
    return keys


def get_borrowing_trend(
    db: Session,
    start_d: date,
    end_d: date,
    group_by: str = "day",
) -> list[dict]:
    """Thống kê lượt mượn, lượt trả và tiền phạt đã thu theo ngày hoặc theo tháng."""
    start_dt = datetime(start_d.year, start_d.month, start_d.day, 0, 0, 0)
    end_dt = datetime(end_d.year, end_d.month, end_d.day, 23, 59, 59)

    mode = "month" if (group_by or "").lower() == "month" else "day"
    if mode == "day" and (end_d - start_d).days > 90:
        # Tự động gom theo tháng nếu khoảng thời gian > 90 ngày mà người dùng không ép
        mode = "month"

    buckets_list = _month_keys_between(start_d, end_d) if mode == "month" else _day_keys_between(start_d, end_d)
    key_fmt = "%Y-%m" if mode == "month" else "%Y-%m-%d"

    borrow_map: dict[str, int] = defaultdict(int)
    return_map: dict[str, int] = defaultdict(int)
    fine_map: dict[str, float] = defaultdict(float)

    # 1. Lượt mượn (đếm Loan theo borrowed_at hoặc created_at nếu chưa có borrowed_at)
    loans = (
        db.query(Loan)
        .filter(
            Loan.status.in_([LoanStatus.BORROWED, LoanStatus.RETURNED, LoanStatus.APPROVED]),
            func.coalesce(Loan.borrowed_at, Loan.created_at) >= start_dt,
            func.coalesce(Loan.borrowed_at, Loan.created_at) <= end_dt,
        )
        .all()
    )
    for loan in loans:
        dt = loan.borrowed_at or loan.created_at
        if dt:
            borrow_map[dt.strftime(key_fmt)] += 1

    # 2. Lượt trả (đếm LoanItem theo return_date)
    returned_items = (
        db.query(LoanItem)
        .filter(
            LoanItem.return_date.is_not(None),
            LoanItem.return_date >= start_dt,
            LoanItem.return_date <= end_dt,
        )
        .all()
    )
    for item in returned_items:
        if item.return_date:
            return_map[item.return_date.strftime(key_fmt)] += 1

    # 3. Tiền phạt đã thu theo ngày/tháng (Fine status == PAID)
    paid_fines = (
        db.query(Fine)
        .filter(
            Fine.status == "PAID",
            func.coalesce(Fine.collected_at, Fine.created_at) >= start_dt,
            func.coalesce(Fine.collected_at, Fine.created_at) <= end_dt,
        )
        .all()
    )
    for fine in paid_fines:
        dt = fine.collected_at or fine.created_at
        if dt:
            fine_map[dt.strftime(key_fmt)] += float(fine.amount or 0.0)

    return [
        {
            "date_key": date_key,
            "label": label,
            "borrow_count": borrow_map.get(date_key, 0),
            "return_count": return_map.get(date_key, 0),
            "fine_collected": round(fine_map.get(date_key, 0.0), 2),
        }
        for date_key, label in buckets_list
    ]


def get_top_borrowed_books(
    db: Session,
    start_d: date,
    end_d: date,
    limit: int = 8,
) -> list[dict]:
    """Top đầu sách được mượn nhiều nhất trong khoảng thời gian."""
    start_dt = datetime(start_d.year, start_d.month, start_d.day, 0, 0, 0)
    end_dt = datetime(end_d.year, end_d.month, end_d.day, 23, 59, 59)

    rows = (
        db.query(
            Book.isbn,
            Book.title,
            Category.name.label("category_name"),
            func.count(LoanItem.id).label("borrow_count"),
        )
        .join(LoanItem, LoanItem.book_isbn == Book.isbn)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .outerjoin(Category, Book.category_id == Category.id)
        .filter(
            Loan.status.in_([LoanStatus.BORROWED, LoanStatus.RETURNED, LoanStatus.APPROVED]),
            func.coalesce(Loan.borrowed_at, Loan.created_at) >= start_dt,
            func.coalesce(Loan.borrowed_at, Loan.created_at) <= end_dt,
        )
        .group_by(Book.isbn, Book.title, Category.name)
        .order_by(func.count(LoanItem.id).desc())
        .limit(limit)
        .all()
    )

    result = []
    for idx, row in enumerate(rows, start=1):
        total_copies = (
            db.query(func.count(BookCopy.id))
            .filter(BookCopy.book_isbn == row.isbn)
            .scalar()
            or 0
        )
        avail_copies = (
            db.query(func.count(BookCopy.id))
            .filter(BookCopy.book_isbn == row.isbn, BookCopy.status == "AVAILABLE")
            .scalar()
            or 0
        )
        result.append({
            "rank": idx,
            "isbn": row.isbn,
            "title": row.title,
            "category_name": row.category_name or "Chưa phân loại",
            "borrow_count": int(row.borrow_count or 0),
            "available_copies": int(avail_copies),
            "total_copies": int(total_copies),
        })
    return result


def get_popular_categories(
    db: Session,
    start_d: date,
    end_d: date,
    limit: int = 6,
) -> list[dict]:
    """Thể loại phổ biến nhất (số đầu sách, tỷ lệ % và lượt mượn trong kỳ)."""
    start_dt = datetime(start_d.year, start_d.month, start_d.day, 0, 0, 0)
    end_dt = datetime(end_d.year, end_d.month, end_d.day, 23, 59, 59)

    categories = db.query(Category).all()
    total_books = (
        db.query(func.count(Book.isbn))
        .filter(Book.is_deleted.is_(False))
        .scalar()
        or 0
    )

    # Đếm số đầu sách theo từng thể loại
    book_counts = dict(
        db.query(Book.category_id, func.count(Book.isbn))
        .filter(Book.is_deleted.is_(False))
        .group_by(Book.category_id)
        .all()
    )

    # Đếm lượt mượn theo thể loại trong khoảng thời gian
    borrow_counts = dict(
        db.query(Book.category_id, func.count(LoanItem.id))
        .join(LoanItem, LoanItem.book_isbn == Book.isbn)
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.status.in_([LoanStatus.BORROWED, LoanStatus.RETURNED, LoanStatus.APPROVED]),
            func.coalesce(Loan.borrowed_at, Loan.created_at) >= start_dt,
            func.coalesce(Loan.borrowed_at, Loan.created_at) <= end_dt,
        )
        .group_by(Book.category_id)
        .all()
    )

    items = []
    for cat in categories:
        b_cnt = int(book_counts.get(cat.id, 0))
        l_cnt = int(borrow_counts.get(cat.id, 0))
        pct = round((b_cnt / total_books * 100.0), 1) if total_books > 0 else 0.0
        items.append({
            "category_id": cat.id,
            "category_name": cat.name,
            "book_count": b_cnt,
            "borrow_count": l_cnt,
            "percentage": pct,
        })

    # Sắp xếp ưu tiên lượt mượn nhiều nhất, sau đó đến số đầu sách
    items.sort(key=lambda x: (x["borrow_count"], x["book_count"]), reverse=True)
    return items[:limit]


def get_fines_summary_by_range(
    db: Session,
    start_d: date,
    end_d: date,
) -> dict:
    """Thống kê tiền phạt đã thu trong khoảng thời gian và tổng chưa thu."""
    start_dt = datetime(start_d.year, start_d.month, start_d.day, 0, 0, 0)
    end_dt = datetime(end_d.year, end_d.month, end_d.day, 23, 59, 59)

    paid_fines = (
        db.query(Fine)
        .filter(
            Fine.status == "PAID",
            func.coalesce(Fine.collected_at, Fine.created_at) >= start_dt,
            func.coalesce(Fine.collected_at, Fine.created_at) <= end_dt,
        )
        .all()
    )
    collected_amount = round(sum(float(f.amount or 0.0) for f in paid_fines), 2)
    collected_count = len(paid_fines)

    by_type: dict[str, float] = defaultdict(float)
    for f in paid_fines:
        by_type[f.fine_type or "KHÁC"] += float(f.amount or 0.0)

    unpaid_fines = db.query(Fine).filter(Fine.status == "UNPAID").all()
    unpaid_amount = round(sum(float(f.amount or 0.0) for f in unpaid_fines), 2)
    unpaid_count = len(unpaid_fines)

    waived_count = (
        db.query(func.count(Fine.id))
        .filter(Fine.status == "WAIVED")
        .scalar()
        or 0
    )

    return {
        "start_date": start_d.isoformat(),
        "end_date": end_d.isoformat(),
        "collected_amount": collected_amount,
        "collected_count": collected_count,
        "unpaid_amount": unpaid_amount,
        "unpaid_count": unpaid_count,
        "waived_count": int(waived_count),
        "by_type": {k: round(v, 2) for k, v in by_type.items()},
    }


def get_dashboard_statistics(
    db: Session,
    period: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    group_by: str = "day",
) -> dict:
    """Tổng hợp toàn bộ số liệu cho Dashboard thống kê thư viện (Task T3CFF62)."""
    start_d, end_d, resolved_period = resolve_date_range(period, start_date, end_date)
    start_dt = datetime(start_d.year, start_d.month, start_d.day, 0, 0, 0)
    end_dt = datetime(end_d.year, end_d.month, end_d.day, 23, 59, 59)
    now = datetime.now()

    total_books = (
        db.query(func.count(Book.isbn))
        .filter(Book.is_deleted.is_(False))
        .scalar()
        or 0
    )
    total_copies = db.query(func.count(BookCopy.id)).scalar() or 0
    available_copies = (
        db.query(func.count(BookCopy.id))
        .filter(BookCopy.status == "AVAILABLE")
        .scalar()
        or 0
    )
    borrowed_copies = (
        db.query(func.count(BookCopy.id))
        .filter(BookCopy.status == "BORROWED")
        .scalar()
        or 0
    )
    damaged_or_lost_copies = (
        db.query(func.count(BookCopy.id))
        .filter(BookCopy.status.in_(["LOST", "DAMAGED", "DISPOSED"]))
        .scalar()
        or 0
    )

    active_loans = (
        db.query(func.count(Loan.id))
        .filter(Loan.status == LoanStatus.BORROWED)
        .scalar()
        or 0
    )
    loans_in_period = (
        db.query(func.count(Loan.id))
        .filter(
            Loan.status.in_([LoanStatus.BORROWED, LoanStatus.RETURNED, LoanStatus.APPROVED]),
            func.coalesce(Loan.borrowed_at, Loan.created_at) >= start_dt,
            func.coalesce(Loan.borrowed_at, Loan.created_at) <= end_dt,
        )
        .scalar()
        or 0
    )

    overdue_books_count = (
        db.query(func.count(LoanItem.id))
        .join(Loan, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date < now,
        )
        .scalar()
        or 0
    )
    overdue_loans_count = (
        db.query(func.count(func.distinct(Loan.id)))
        .join(LoanItem, LoanItem.loan_id == Loan.id)
        .filter(
            Loan.status == LoanStatus.BORROWED,
            LoanItem.return_date.is_(None),
            LoanItem.due_date < now,
        )
        .scalar()
        or 0
    )

    active_readers = (
        db.query(func.count(func.distinct(LibraryCard.reader_id)))
        .filter(LibraryCard.status == CardStatus.ACTIVE)
        .scalar()
        or 0
    )

    fines_info = get_fines_summary_by_range(db, start_d, end_d)
    trend = get_borrowing_trend(db, start_d, end_d, group_by=group_by)
    top_books = get_top_borrowed_books(db, start_d, end_d, limit=8)
    popular_cats = get_popular_categories(db, start_d, end_d, limit=6)

    resolved_group = "month" if (group_by == "month" or (end_d - start_d).days > 90) else "day"

    return {
        "period": resolved_period,
        "group_by": resolved_group,
        "start_date": start_d.isoformat(),
        "end_date": end_d.isoformat(),
        "summary": {
            "total_books": int(total_books),
            "total_copies": int(total_copies),
            "available_copies": int(available_copies),
            "borrowed_copies": int(borrowed_copies),
            "damaged_or_lost_copies": int(damaged_or_lost_copies),
            "active_loans": int(active_loans),
            "loans_in_period": int(loans_in_period),
            "overdue_books_count": int(overdue_books_count),
            "overdue_loans_count": int(overdue_loans_count),
            "active_readers": int(active_readers),
            "collected_fines_amount": fines_info["collected_amount"],
            "collected_fines_count": fines_info["collected_count"],
            "unpaid_fines_amount": fines_info["unpaid_amount"],
            "unpaid_fines_count": fines_info["unpaid_count"],
        },
        "borrowing_trend": trend,
        "top_borrowed_books": top_books,
        "popular_categories": popular_cats,
    }
