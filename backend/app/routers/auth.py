"""Registration and bearer-token authentication endpoints."""
import secrets
from datetime import date

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import (
    check_card_can_borrow,
    get_current_user,
    require_admin,
    require_librarian,
    require_reader,
    require_roles,
)
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.library_card import CardStatus, CardType, LibraryCard
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import LoginRequest, RegisterRequest, RegisterResponse, TokenResponse
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _one_year_from(day: date) -> date:
    try:
        return day.replace(year=day.year + 1)
    except ValueError:
        return day.replace(year=day.year + 1, day=28)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = str(data.email)
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email đã được sử dụng")

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.READER,
        status=UserStatus.ACTIVE,
    )
    db.add(user)

    try:
        db.flush()
        issue_date = date.today()
        base_code = f"LC-{user.id:04d}"
        card_code = base_code
        if db.scalar(select(LibraryCard.id).where(LibraryCard.card_code == card_code)) is not None:
            card_code = f"{base_code}-{secrets.token_hex(2).upper()}"

        card = LibraryCard(
            card_code=card_code,
            reader_id=user.id,
            card_type=CardType.STANDARD,
            issue_date=issue_date,
            expiry_date=_one_year_from(issue_date),
            max_borrow_books=5,
            status=CardStatus.ACTIVE,
        )
        db.add(card)
        db.commit()
        db.refresh(user)
        db.refresh(card)
    except IntegrityError:
        db.rollback()
        if db.scalar(select(User.id).where(User.email == email)) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng",
            ) from None
        raise

    return RegisterResponse(user=user, library_card=card)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(data.email)))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khóa")

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user
