from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.fine import (
    FineDetailResponse,
    FinePayRequest,
    FineReceiptResponse,
    FineResponse,
    FineStatisticsResponse,
    FineWaiveRequest,
    MyFinesResponse,
    ReportIssueRequest,
    UnpaidCheckResponse,
)
from app.crud.fine import (
    generate_fine_receipt,
    get_fine_detail,
    get_fine_statistics,
    get_my_fines,
    get_unpaid_fines_summary,
    list_fines_detailed,
    pay_fine,
    report_damage_or_lost,
    waive_fine,
)

router = APIRouter(prefix="/fines", tags=["Fines"])
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Lấy thông tin người dùng nếu có Bearer token, nếu không có trả về None mà không chặn."""
    if credentials is None:
        return None
    try:
        user_id = decode_access_token(credentials.credentials)
    except Exception:
        return None

    user = db.get(User, user_id)
    if user and user.status == UserStatus.ACTIVE:
        return user
    return None


@router.get("", response_model=list[FineDetailResponse])
def get_all_fines(
    user_id: int | None = None,
    status: str | None = None,
    fine_type: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách các khoản phạt chi tiết kèm thông tin độc giả, sách, ấn phẩm.
    Hỗ trợ tìm kiếm từ khóa đa năng và các bộ lọc nghiệp vụ.
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
def get_fines_kpi_statistics(db: Session = Depends(get_db)):
    """Lấy thống kê số liệu tổng quan về các khoản phạt (phục vụ KPI dashboard)."""
    return get_fine_statistics(db)


@router.get("/my-fines", response_model=MyFinesResponse)
def get_reader_my_fines(
    user_id: int | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Độc giả xem danh sách các khoản phạt cá nhân của mình.
    Ưu tiên lấy `user_id` từ token JWT đã đăng nhập, hoặc qua query param `user_id`.
    """
    target_user_id = current_user.id if current_user else user_id
    if not target_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vui lòng đăng nhập hoặc cung cấp mã độc giả user_id",
        )
    return get_my_fines(db, user_id=target_user_id)


@router.get("/unpaid-check/{user_id}", response_model=UnpaidCheckResponse)
def check_user_unpaid_fines(user_id: int, db: Session = Depends(get_db)):
    """Kiểm tra độc giả có khoản phạt chưa thanh toán (dùng cho phân hệ Mượn sách)."""
    return get_unpaid_fines_summary(db, user_id=user_id)


@router.get("/{fine_id}", response_model=FineDetailResponse)
def get_fine_by_id(fine_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết một khoản phạt theo ID."""
    return get_fine_detail(db, fine_id=fine_id)


@router.get("/{fine_id}/receipt", response_model=FineReceiptResponse)
def get_fine_receipt_data(fine_id: int, db: Session = Depends(get_db)):
    """Lấy toàn bộ dữ liệu chuẩn hóa của biên lai thu tiền phạt để phục vụ in ấn."""
    return generate_fine_receipt(db, fine_id=fine_id)


@router.post("/report-issue")
def report_damaged_or_lost_book(
    payload: ReportIssueRequest,
    db: Session = Depends(get_db),
):
    """Báo sách hỏng hoặc báo mất sách: tự động tính phạt theo giá bìa của sách."""
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
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Thủ thư thu tiền phạt của độc giả: chuyển trạng thái sang PAID.
    Ghi nhận phương thức thanh toán, thời gian thu và thủ thư thực hiện.
    """
    collected_by = None
    if current_user:
        collected_by = current_user.id
    elif payload and payload.collected_by:
        collected_by = payload.collected_by

    payment_method = payload.payment_method if payload else "TIỀN MẶT"
    note = payload.note if payload else None

    pay_fine(
        db,
        fine_id=fine_id,
        collected_by=collected_by,
        payment_method=payment_method,
        note=note,
    )
    return get_fine_detail(db, fine_id=fine_id)


@router.post("/{fine_id}/waive", response_model=FineDetailResponse)
def waive_user_fine(
    fine_id: int,
    payload: FineWaiveRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Admin miễn giảm khoản phạt kèm lý do bắt buộc: chuyển trạng thái sang WAIVED.
    Nếu có token xác thực, yêu cầu vai trò ADMIN.
    """
    if current_user and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên (ADMIN) mới có quyền miễn giảm tiền phạt",
        )

    waived_by = current_user.id if current_user else payload.waived_by

    waive_fine(
        db,
        fine_id=fine_id,
        waive_reason=payload.waive_reason,
        waived_by=waived_by,
    )
    return get_fine_detail(db, fine_id=fine_id)
