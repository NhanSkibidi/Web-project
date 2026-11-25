"""API Hồ sơ cá nhân, Đổi mật khẩu (Độc giả/Thủ thư/Admin) và Quản trị tài khoản Thủ thư (Admin)."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.crud.user import (
    change_user_password,
    create_librarian,
    get_librarian_detail,
    get_user_profile,
    list_librarians,
    lock_or_unlock_librarian,
    update_librarian,
    update_user_profile,
)
from app.db.session import get_db
from app.models.user import User, UserStatus
from app.schemas.user import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    LibrarianCreateRequest,
    LibrarianListResponse,
    LibrarianUpdateRequest,
    ProfileOut,
    ProfileUpdateRequest,
    UserOut,
)

router = APIRouter(prefix="/users", tags=["User Profile"])
admin_librarians_router = APIRouter(prefix="/admin/librarians", tags=["Admin - Librarians"])


# ==============================================================================
# 1. HỒ SƠ CÁ NHÂN & ĐỔI MẬT KHẨU (MỌI TÀI KHOẢN ĐÃ ĐĂNG NHẬP)
# ==============================================================================
@router.get("/me", response_model=ProfileOut)
def read_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Độc giả / Thủ thư / Admin xem hồ sơ cá nhân (kèm thẻ thư viện nếu là Độc giả)."""
    return get_user_profile(db=db, current_user=current_user)


@router.put("/me", response_model=ProfileOut)
@router.patch("/me", response_model=ProfileOut)
def edit_my_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Độc giả / Thủ thư tự cập nhật họ tên, số điện thoại, email cá nhân."""
    return update_user_profile(db=db, current_user=current_user, payload=payload)


@router.post("/me/change-password", response_model=ChangePasswordResponse)
def change_my_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Độc giả / Thủ thư đổi mật khẩu (bắt buộc kiểm tra đúng mật khẩu cũ)."""
    return change_user_password(db=db, current_user=current_user, payload=payload)


# ==============================================================================
# 2. ADMIN QUẢN LÝ TÀI KHOẢN THỦ THƯ (CHỈ QUYỀN ADMIN)
# ==============================================================================
@admin_librarians_router.get("", response_model=LibrarianListResponse)
def admin_list_librarians(
    q: str | None = Query(None, description="Tìm theo họ tên, email hoặc số điện thoại"),
    status_filter: str | None = Query(
        None,
        alias="status",
        description="Lọc theo trạng thái tài khoản: ACTIVE hoặc LOCKED",
    ),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin xem danh sách, tìm kiếm và lọc tài khoản Thủ thư."""
    return list_librarians(db=db, keyword=q, status_filter=status_filter)


@admin_librarians_router.get("/{librarian_id}", response_model=UserOut)
def admin_get_librarian(
    librarian_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin xem chi tiết 1 tài khoản Thủ thư."""
    return get_librarian_detail(db=db, librarian_id=librarian_id)


@admin_librarians_router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def admin_create_librarian(
    payload: LibrarianCreateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin tạo mới tài khoản Thủ thư."""
    return create_librarian(db=db, payload=payload)


@admin_librarians_router.put("/{librarian_id}", response_model=UserOut)
@admin_librarians_router.patch("/{librarian_id}", response_model=UserOut)
def admin_update_librarian(
    librarian_id: int,
    payload: LibrarianUpdateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin chỉnh sửa thông tin (và đặt lại mật khẩu nếu cần) của tài khoản Thủ thư."""
    return update_librarian(db=db, librarian_id=librarian_id, payload=payload)


@admin_librarians_router.post("/{librarian_id}/lock", response_model=UserOut)
@admin_librarians_router.patch("/{librarian_id}/lock", response_model=UserOut)
def admin_lock_librarian(
    librarian_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin khóa tài khoản Thủ thư (chặn đăng nhập và vô hiệu hóa phiên truy cập ngay lập tức)."""
    return lock_or_unlock_librarian(db=db, librarian_id=librarian_id, target_status=UserStatus.LOCKED)


@admin_librarians_router.post("/{librarian_id}/unlock", response_model=UserOut)
@admin_librarians_router.patch("/{librarian_id}/unlock", response_model=UserOut)
def admin_unlock_librarian(
    librarian_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin mở khóa tài khoản Thủ thư (chuyển về ACTIVE)."""
    return lock_or_unlock_librarian(db=db, librarian_id=librarian_id, target_status=UserStatus.ACTIVE)
