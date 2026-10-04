"""
Authentication and authorization utilities.
JWT-based auth with role-based access control.
"""

from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt

from config import settings
from services import excel_service

logger = logging.getLogger("auth")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.APP_SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.APP_SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Extract and validate the current user from JWT token."""
    token = None

    # Try Bearer token first
    if credentials:
        token = credentials.credentials
    # Fallback to cookie
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await excel_service.get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if str(user.get("Status", "")).lower() != "active":
        raise HTTPException(status_code=403, detail="User account is inactive")

    return user


def require_roles(*roles: str):
    """Dependency that checks if current user has one of the required roles."""
    async def _check(user: dict = Depends(get_current_user)):
        user_role = str(user.get("Role", "")).upper()
        if user_role not in [r.upper() for r in roles]:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role(s): {', '.join(roles)}",
            )
        return user
    return _check


async def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Verify username/password against Excel USERS table."""
    user = await excel_service.get_user_by_username(username)
    if not user:
        return None
    pw_hash = user.get("Password_Hash", "")
    if not pw_hash or not verify_password(password, pw_hash):
        return None
    return user
