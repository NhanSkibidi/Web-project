"""Dependencies xác thực, phân quyền và kiểm tra nghiệp vụ cho API."""
from datetime import date
from typing import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.library_card import CardStatus, LibraryCard
from app.models.user import User, UserRole, UserStatus

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Xác thực JWT Bearer Token:
    - 401: Token không có, không hợp lệ hoặc đã hết hạn
    - 403: Tài khoản đã bị khóa (status != ACTIVE)
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Thông tin xác thực không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    try:
        user_id = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError:
        raise unauthorized from None

    user = db.get(User, user_id)
    if user is None:
        raise unauthorized

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa",
        )

    return user


def require_roles(*allowed_roles: UserRole) -> Callable[[User], User]:
    """
    Dependency factory phân quyền theo vai trò người dùng (Admin, Thủ thư, Độc giả).
    Trả về 403 nếu vai trò không nằm trong danh sách được phép.

    Cách dùng:
        @router.get("/admin-only")
        def admin_endpoint(user: User = Depends(require_roles(UserRole.ADMIN))):
            ...

        @router.post("/manage-books")
        def manage_books(user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LIBRARIAN))):
            ...
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            role_names = ", ".join(r.value for r in allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền thực hiện chức năng này. Yêu cầu vai trò: {role_names}",
            )
        return current_user

    return role_checker


# Shortcuts tiện lợi cho các nhóm dùng trực tiếp
require_admin = require_roles(UserRole.ADMIN)
require_librarian = require_roles(UserRole.LIBRARIAN, UserRole.ADMIN)
require_reader = require_roles(UserRole.READER)


def check_card_can_borrow(db: Session, user_id: int) -> LibraryCard:
    """
    Kiểm tra độc giả có thẻ thư viện hợp lệ để mượn sách hay không.
    Dùng cho module Mượn (Loans / Reservations):
    - Độc giả phải có thẻ thư viện
    - Thẻ không bị khóa (LOCKED)
    - Thẻ ở trạng thái ACTIVE
    - Thẻ còn hạn sử dụng (expiry_date >= hôm nay)

    Trả về:
        LibraryCard hợp lệ
    Ngoại lệ:
        HTTPException 400 hoặc 403 nếu không đủ điều kiện mượn
    """
    card = (
        db.query(LibraryCard)
        .filter(LibraryCard.reader_id == user_id)
        .order_by(LibraryCard.id.desc())
        .first()
    )

    if not card:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Độc giả chưa có thẻ thư viện",
        )

    if card.status == CardStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Thẻ thư viện đã bị khóa, vui lòng liên hệ thủ thư",
        )

    if card.status != CardStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Thẻ thư viện không ở trạng thái hoạt động (Trạng thái: {card.status})",
        )

    today = date.today()
    if card.expiry_date is None or card.expiry_date < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thẻ thư viện đã hết hạn sử dụng",
        )

    return card
