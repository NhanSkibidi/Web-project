"""CRUD & Nghiệp vụ quản lý Hồ sơ cá nhân, Đổi mật khẩu và Quản trị tài khoản Thủ thư (Admin)."""
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.crud.library_card import sync_card_expiration
from app.models.library_card import LibraryCard
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import (
    ChangePasswordRequest,
    LibrarianCreateRequest,
    LibrarianUpdateRequest,
    ProfileUpdateRequest,
)


def _clean_optional_phone(phone: str | None) -> str | None:
    if phone is None:
        return None
    stripped = phone.strip()
    return stripped or None


# ==============================================================================
# 1. HỒ SƠ CÁ NHÂN & ĐỔI MẬT KHẨU (ĐỘC GIẢ / THỦ THƯ / ADMIN)
# ==============================================================================
def get_user_profile(db: Session, current_user: User) -> dict:
    """Xem hồ sơ người dùng hiện tại (kèm thẻ thư viện nếu là Độc giả)."""
    card = None
    if current_user.role == UserRole.READER:
        card = (
            db.query(LibraryCard)
            .filter(LibraryCard.reader_id == current_user.id)
            .order_by(LibraryCard.id.desc())
            .first()
        )
        if card:
            sync_card_expiration(db, card, commit=True)

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
        "library_card": card,
    }


def update_user_profile(
    db: Session,
    current_user: User,
    payload: ProfileUpdateRequest,
) -> dict:
    """Độc giả / Thủ thư tự cập nhật họ tên, số điện thoại, email cá nhân."""
    data = payload.model_dump(exclude_unset=True)

    if "full_name" in data:
        cleaned_name = (data["full_name"] or "").strip()
        if not cleaned_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Họ và tên không được để trống",
            )
        current_user.full_name = cleaned_name

    if "phone" in data:
        current_user.phone = _clean_optional_phone(data["phone"])

    if "email" in data and data["email"] is not None:
        new_email = str(data["email"]).strip().lower()
        if new_email != current_user.email.lower():
            duplicate = db.scalar(
                select(User.id).where(User.email == new_email, User.id != current_user.id)
            )
            if duplicate is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Địa chỉ email này đã được sử dụng bởi tài khoản khác",
                )
            current_user.email = new_email

    try:
        db.commit()
        db.refresh(current_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Địa chỉ email này đã được sử dụng",
        ) from None

    return get_user_profile(db, current_user)


def change_user_password(
    db: Session,
    current_user: User,
    payload: ChangePasswordRequest,
) -> dict:
    """
    Đổi mật khẩu cho người dùng đang đăng nhập:
    1. Kiểm tra mật khẩu cũ bằng bcrypt (verify_password).
    2. Kiểm tra confirm_password (nếu có gửi lên).
    3. Không cho đặt mật khẩu mới trùng mật khẩu cũ.
    4. Băm mật khẩu mới và lưu DB.
    """
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu cũ không chính xác",
        )

    if payload.confirm_password is not None and payload.confirm_password != payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu xác nhận không khớp với mật khẩu mới",
        )

    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải khác với mật khẩu hiện tại",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    db.refresh(current_user)

    return {"message": "Đổi mật khẩu thành công"}


# ==============================================================================
# 2. ADMIN QUẢN LÝ TÀI KHOẢN THỦ THƯ (TẠO / SỬA / KHOÁ / MỞ KHOÁ)
# ==============================================================================
def _get_librarian_or_404(db: Session, librarian_id: int) -> User:
    user = db.get(User, librarian_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tài khoản thủ thư id={librarian_id}",
        )
    if user.role != UserRole.LIBRARIAN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tài khoản id={librarian_id} không phải là Thủ thư (Role hiện tại: {user.role.value})",
        )
    return user


def list_librarians(
    db: Session,
    keyword: str | None = None,
    status_filter: str | None = None,
) -> dict:
    """Admin xem danh sách và tìm kiếm/lọc tài khoản Thủ thư."""
    all_librarians = (
        db.query(User)
        .filter(User.role == UserRole.LIBRARIAN)
        .order_by(User.id.asc())
        .all()
    )

    active_count = sum(1 for u in all_librarians if u.status == UserStatus.ACTIVE)
    locked_count = sum(1 for u in all_librarians if u.status == UserStatus.LOCKED)

    query = db.query(User).filter(User.role == UserRole.LIBRARIAN)

    if keyword and keyword.strip():
        kw = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(kw),
                User.email.ilike(kw),
                User.phone.ilike(kw),
            )
        )

    if status_filter and status_filter.strip():
        st = status_filter.strip().upper()
        try:
            query = query.filter(User.status == UserStatus(st))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trạng thái lọc không hợp lệ (chỉ chấp nhận ACTIVE hoặc LOCKED)",
            ) from None

    items = query.order_by(User.id.asc()).all()

    return {
        "items": items,
        "total": len(items),
        "active_count": active_count,
        "locked_count": locked_count,
    }


def get_librarian_detail(db: Session, librarian_id: int) -> User:
    return _get_librarian_or_404(db, librarian_id)


def create_librarian(db: Session, payload: LibrarianCreateRequest) -> User:
    """Admin tạo tài khoản Thủ thư mới (mặc định role=LIBRARIAN, status=ACTIVE)."""
    email = str(payload.email).strip().lower()
    cleaned_name = payload.full_name.strip()
    if not cleaned_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Họ và tên thủ thư không được để trống",
        )

    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email này đã được sử dụng trong hệ thống",
        )

    librarian = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=cleaned_name,
        phone=_clean_optional_phone(payload.phone),
        role=UserRole.LIBRARIAN,
        status=UserStatus.ACTIVE,
    )
    db.add(librarian)
    try:
        db.commit()
        db.refresh(librarian)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email này đã được sử dụng trong hệ thống",
        ) from None

    return librarian


def update_librarian(
    db: Session,
    librarian_id: int,
    payload: LibrarianUpdateRequest,
) -> User:
    """Admin cập nhật thông tin tài khoản Thủ thư (họ tên, email, SĐT, đặt lại mật khẩu, trạng thái)."""
    librarian = _get_librarian_or_404(db, librarian_id)
    data = payload.model_dump(exclude_unset=True)

    if "full_name" in data:
        cleaned_name = (data["full_name"] or "").strip()
        if not cleaned_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Họ và tên thủ thư không được để trống",
            )
        librarian.full_name = cleaned_name

    if "phone" in data:
        librarian.phone = _clean_optional_phone(data["phone"])

    if "email" in data and data["email"] is not None:
        new_email = str(data["email"]).strip().lower()
        if new_email != librarian.email.lower():
            duplicate = db.scalar(
                select(User.id).where(User.email == new_email, User.id != librarian.id)
            )
            if duplicate is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email này đã được sử dụng bởi tài khoản khác",
                )
            librarian.email = new_email

    if "password" in data and data["password"] is not None:
        librarian.password_hash = hash_password(data["password"])

    if "status" in data and data["status"] is not None:
        librarian.status = data["status"]

    try:
        db.commit()
        db.refresh(librarian)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email này đã được sử dụng trong hệ thống",
        ) from None

    return librarian


def lock_or_unlock_librarian(
    db: Session,
    librarian_id: int,
    target_status: UserStatus,
) -> User:
    """Admin khoá (LOCKED) hoặc mở khoá (ACTIVE) tài khoản Thủ thư."""
    librarian = _get_librarian_or_404(db, librarian_id)

    if target_status == UserStatus.LOCKED and librarian.status == UserStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản thủ thư này đã bị khóa trước đó",
        )

    if target_status == UserStatus.ACTIVE and librarian.status == UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản thủ thư này hiện đang hoạt động",
        )

    librarian.status = target_status
    db.commit()
    db.refresh(librarian)
    return librarian
