from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin, require_librarian
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.fine import (
    FineDetailResponse,
    FinePayRequest,
    FineReceiptResponse,
    FineResponse,
    FineStatisticsResponse,
    FineWaiveRequest,
    MyFinesResponse,
    ReportIssueRequest,
)
from app.crud.fine import (
    generate_fine_receipt,
    get_fine_detail,
    get_fine_statistics,
    get_my_fines,
    list_fines_detailed,
    pay_fine,
    report_damage_or_lost,
    waive_fine,
)

router = APIRouter(prefix="/fines", tags=["Fines"])


@router.get("", response_model=list[FineDetailResponse])
def get_all_fines(
    user_id: int | None = None,
    status: str | None = None,
    fine_type: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
    _staff: User = Depends(require_librarian),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách các khoản phạt chi tiết kèm thông tin độc giả, sách, ấn phẩm.
    Chỉ Thủ thư và Admin mới được truy cập danh sách toàn hệ thống.
    """
    return list_fines_detailed(
        db,
        user_id=user_id,
        status=status,
        fine_type=fine_type,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.get("/statistics", response_model=FineStatisticsResponse)
def get_fines_kpi_statistics(
    _staff: User = Depends(require_librarian),
    db: Session = Depends(get_db),
):
    """Lấy thống kê số liệu tổng quan về các khoản phạt (phục vụ KPI dashboard)."""
    return get_fine_statistics(db)


@router.get("/my-fines", response_model=MyFinesResponse)
def get_reader_my_fines(
    user_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Độc giả xem danh sách các khoản phạt cá nhân của mình.
    Độc giả chỉ được xem khoản phạt của chính mình; Thủ thư/Admin có thể truyền `user_id`.
    """
    if current_user.role == UserRole.READER:
        if user_id is not None and user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Độc giả chỉ được xem khoản phạt của chính mình",
            )
        target_user_id = current_user.id
    else:
        target_user_id = user_id or current_user.id

    return get_my_fines(db, user_id=target_user_id)


@router.get("/{fine_id}", response_model=FineDetailResponse)
def get_fine_by_id(
    fine_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy chi tiết một khoản phạt theo ID."""
    detail = get_fine_detail(db, fine_id=fine_id)
    if current_user.role == UserRole.READER and detail["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem khoản phạt của độc giả khác",
        )
    return detail


@router.get("/{fine_id}/receipt", response_model=FineReceiptResponse)
def get_fine_receipt_data(
    fine_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy toàn bộ dữ liệu chuẩn hóa của biên lai thu tiền phạt để phục vụ in ấn."""
    detail = get_fine_detail(db, fine_id=fine_id)
    if current_user.role == UserRole.READER and detail["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem biên lai của độc giả khác",
        )
    return generate_fine_receipt(db, fine_id=fine_id)


@router.post("/report-issue")
def report_damaged_or_lost_book(
    payload: ReportIssueRequest,
    _staff: User = Depends(require_librarian),
    db: Session = Depends(get_db),
):
    """Thủ thư báo sách hỏng hoặc báo mất sách: tự động tính phạt theo giá bìa và quá hạn nếu có."""
    return report_damage_or_lost(
        db,
        issue_type=payload.issue_type,
        book_copy_id=payload.book_copy_id,
        copy_code=payload.copy_code,
        note=payload.note,
    )


@router.post("/{fine_id}/pay", response_model=FineDetailResponse)
def pay_user_fine(
    fine_id: int,
    payload: FinePayRequest | None = None,
    current_user: User = Depends(require_librarian),
    db: Session = Depends(get_db),
):
    """
    Thủ thư / Admin thu tiền phạt của độc giả: chuyển trạng thái sang PAID.
    Ghi nhận phương thức thanh toán, thời gian thu và người thực hiện từ JWT.
    """
    payment_method = payload.payment_method if payload else "TIỀN MẶT"
    note = payload.note if payload else None

    pay_fine(
        db,
        fine_id=fine_id,
        collected_by=current_user.id,
        payment_method=payment_method,
        note=note,
    )
    return get_fine_detail(db, fine_id=fine_id)


@router.post("/{fine_id}/waive", response_model=FineDetailResponse)
def waive_user_fine(
    fine_id: int,
    payload: FineWaiveRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Admin miễn giảm khoản phạt kèm lý do bắt buộc: chuyển trạng thái sang WAIVED.
    Yêu cầu bắt buộc vai trò ADMIN.
    """
    waive_fine(
        db,
        fine_id=fine_id,
        waive_reason=payload.waive_reason,
        waived_by=current_user.id,
    )
    return get_fine_detail(db, fine_id=fine_id)
