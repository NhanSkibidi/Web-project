"""Pydantic schemas cho module Thống kê thư viện (Task T3CFF62)."""
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_books: int
    total_copies: int
    available_copies: int
    borrowed_copies: int
    damaged_or_lost_copies: int
    active_loans: int
    loans_in_period: int
    overdue_books_count: int
    overdue_loans_count: int
    active_readers: int
    collected_fines_amount: float
    collected_fines_count: int
    unpaid_fines_amount: float
    unpaid_fines_count: int


class BorrowingTrendPoint(BaseModel):
    date_key: str
    label: str
    borrow_count: int
    return_count: int
    fine_collected: float = 0.0


class TopBorrowedBookItem(BaseModel):
    rank: int
    isbn: str
    title: str
    category_name: str
    borrow_count: int
    available_copies: int
    total_copies: int


class PopularCategoryItem(BaseModel):
    category_id: int
    category_name: str
    book_count: int
    borrow_count: int
    percentage: float


class DashboardStatisticsResponse(BaseModel):
    period: str
    group_by: str
    start_date: str
    end_date: str
    summary: DashboardSummary
    borrowing_trend: list[BorrowingTrendPoint]
    top_borrowed_books: list[TopBorrowedBookItem]
    popular_categories: list[PopularCategoryItem]
