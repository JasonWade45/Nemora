from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError

from app.core.config import settings
from app.core.security import decode_token, verify_password, get_password_hash, create_token_pair
from app.db.session import get_db
from app.models.user import User, UserRole


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Check token type
    if payload.get("type") != "access":
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure user is active"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


def require_roles(*allowed_roles: UserRole):
    """Dependency to require specific roles"""
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user
    return role_checker


# Role-specific dependencies
require_admin = require_roles(UserRole.ADMIN)
require_manager = require_roles(UserRole.ADMIN, UserRole.MANAGER)
require_rep = require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEDICAL_REP)


async def get_organization_id(
    current_user: User = Depends(get_current_active_user),
) -> str:
    """Get current user's organization ID for tenant isolation"""
    return current_user.organization_id


async def get_current_manager(
    current_user: User = Depends(require_manager),
) -> User:
    """Get current user as manager (admin or manager)"""
    return current_user


async def get_current_rep(
    current_user: User = Depends(require_rep),
) -> User:
    """Get current user as medical rep (any role)"""
    return current_user