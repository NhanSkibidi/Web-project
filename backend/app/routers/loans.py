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
    RenewalRequest,
    RenewalResponse,
    LoanRenewalResponse,
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
    renew_loan_item,
    renew_loan,
)

router = APIRouter(prefix="/loans", tags=["Loans"])
readers_router = APIRouter(prefix="/readers", tags=["Readers"])
copies_router = APIRouter(prefix="/copies", tags=["Copies"])

@readers_router.get("/by-card/{card_code}", response_model=ReaderLookupResponse)
def lookup_reader_by_card(card_code: str, db: Session = Depends(get_db)):
    """Tra cứu độc giả theo mã thẻ thư viện (nhập hoặc quét mã)."""
    return get_reader_by_card(db, card_code)


@router.get("/readers/by-card/{card_code}", response_model=ReaderLookupResponse)
def lookup_reader_by_card_alias(card_code: str, db: Session = Depends(get_db)):
    return get_reader_by_card(db, card_code)

@copies_router.get("/by-barcode/{barcode}", response_model=CopyLookupResponse)
def lookup_copy_by_barcode(barcode: str, db: Session = Depends(get_db)):
    return get_copy_by_barcode(db, barcode)


@router.get("/copies/by-barcode/{barcode}", response_model=CopyLookupResponse)
def lookup_copy_by_barcode_alias(barcode: str, db: Session = Depends(get_db)):
    return get_copy_by_barcode(db, barcode)

@router.post("/counter/validate", response_model=CounterBorrowValidateResponse)
def validate_counter(
    data: CounterBorrowValidateRequest,
    db: Session = Depends(get_db),
):
    return validate_counter_borrow(db, data.card_code, data.barcodes)


@router.post("/counter", response_model=CounterBorrowReceiptResponse, status_code=201)
def create_counter(
    data: CounterBorrowCreateRequest,
    db: Session = Depends(get_db),
):
    return create_counter_loan(
        db,
        card_code=data.card_code,
        barcodes=data.barcodes,
        librarian_id=data.librarian_id,
    )

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

@router.patch("/items/{loan_item_id}/renew", response_model=RenewalResponse)
def renew_item(
    loan_item_id: int,
    data: RenewalRequest,
    db: Session = Depends(get_db),
):
    return renew_loan_item(
        db,
        loan_item_id=loan_item_id,
        user_id=data.user_id,
        librarian_id=data.librarian_id,
    )


@router.patch("/{loan_id}/renew", response_model=LoanRenewalResponse)
def renew_entire_loan(
    loan_id: int,
    data: RenewalRequest,
    db: Session = Depends(get_db),
):
    return renew_loan(
        db,
        loan_id=loan_id,
        user_id=data.user_id,
        librarian_id=data.librarian_id,
    )

