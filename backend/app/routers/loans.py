from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.loan import (
    LoanCreate,
    LoanResponse,
    LoanReject,
    LoanHandover,
    CounterBorrowValidateRequest,
    CounterBorrowValidateResponse,
    CounterBorrowCreateRequest,
    CounterBorrowReceiptResponse,
    ReaderLookupResponse,
    CopyLookupResponse,
)
from app.crud.loan_service import (
    create_online_loan,
    cancel_online_loan,
    approve_loan,
    reject_loan,
    handover_loan,
    get_reader_by_card,
    get_copy_by_barcode,
    validate_counter_borrow,
    create_counter_loan,
)

router = APIRouter(prefix="/loans", tags=["Loans"])
readers_router = APIRouter(prefix="/readers", tags=["Readers"])
copies_router = APIRouter(prefix="/copies", tags=["Copies"])


# ── API TRA CỨU ĐỘC GIẢ (READERS) ──────────────────────────────

@readers_router.get("/by-card/{card_code}", response_model=ReaderLookupResponse)
def lookup_reader_by_card(card_code: str, db: Session = Depends(get_db)):
    """Tra cứu độc giả theo mã thẻ thư viện (nhập hoặc quét mã)."""
    return get_reader_by_card(db, card_code)


@router.get("/readers/by-card/{card_code}", response_model=ReaderLookupResponse)
def lookup_reader_by_card_alias(card_code: str, db: Session = Depends(get_db)):
    """Alias cho tra cứu độc giả."""
    return get_reader_by_card(db, card_code)


# ── API TRA CỨU BẢN SAO SÁCH (COPIES) ──────────────────────────

@copies_router.get("/by-barcode/{barcode}", response_model=CopyLookupResponse)
def lookup_copy_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """Tra cứu bản sao sách theo mã vạch / copy_code."""
    return get_copy_by_barcode(db, barcode)


@router.get("/copies/by-barcode/{barcode}", response_model=CopyLookupResponse)
def lookup_copy_by_barcode_alias(barcode: str, db: Session = Depends(get_db)):
    """Alias cho tra cứu bản sao sách."""
    return get_copy_by_barcode(db, barcode)


# ── API MƯỢN SÁCH TẠI QUẦY (COUNTER BORROWING) ─────────────────

@router.post("/counter/validate", response_model=CounterBorrowValidateResponse)
def validate_counter(
    data: CounterBorrowValidateRequest,
    db: Session = Depends(get_db),
):
    """
    Kiểm tra 7 điều kiện mượn sách tại quầy (realtime checklist):
    - CARD_VALID, READER_ALLOWED, LIMIT_NOT_EXCEEDED (<=3),
    - BOOK_EXISTS, COPY_AVAILABLE, NO_RESTRICTION, HAS_BOOKS.
    """
    return validate_counter_borrow(db, data.card_code, data.barcodes)


@router.post("/counter", response_model=CounterBorrowReceiptResponse, status_code=201)
def create_counter(
    data: CounterBorrowCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Tạo phiếu mượn sách trực tiếp tại quầy trong 1 transaction an toàn:
    - Trạng thái phiếu: BORROWED ngay lập tức (không qua PENDING).
    - Hạn trả: +14 ngày.
    - Cập nhật bản sao sang BORROWED và tăng số sách độc giả đang giữ.
    - Chống mượn trùng đồng thời (409 COPY_NOT_AVAILABLE).
    - Trả về payload đầy đủ để in biên lai mượn sách.
    """
    return create_counter_loan(
        db,
        card_code=data.card_code,
        barcodes=data.barcodes,
        librarian_id=data.librarian_id,
    )


# ── API QUY TRÌNH MƯỢN ONLINE HIỆN CÓ ──────────────────────────

@router.post("/online", response_model=LoanResponse, status_code=201)
def create_loan(
    data: LoanCreate,
    user_id: int,
    db: Session = Depends(get_db),
):
    return create_online_loan(db, user_id, data.book_isbns)


@router.patch("/{loan_id}/cancel", response_model=LoanResponse)
def cancel_loan(
    loan_id: int,
    user_id: int,
    db: Session = Depends(get_db),
):
    return cancel_online_loan(db, loan_id, user_id)


@router.patch("/{loan_id}/approve", response_model=LoanResponse)
def approve(
    loan_id: int,
    librarian_id: int,
    db: Session = Depends(get_db),
):
    return approve_loan(db, loan_id, librarian_id)


@router.patch("/{loan_id}/reject", response_model=LoanResponse)
def reject(
    loan_id: int,
    librarian_id: int,
    data: LoanReject,
    db: Session = Depends(get_db),
):
    return reject_loan(db, loan_id, librarian_id, data.reject_reason)


@router.post("/{loan_id}/handover", response_model=LoanResponse)
def handover(
    loan_id: int,
    librarian_id: int,
    data: LoanHandover,
    db: Session = Depends(get_db),
):
    copies_data = [item.model_dump() for item in data.copies]
    return handover_loan(db, loan_id, librarian_id, copies_data)
