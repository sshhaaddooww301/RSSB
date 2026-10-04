"""
Authentication routes — login, logout, me, token refresh.
"""

from fastapi import APIRouter, HTTPException, Request, Response, Depends

from config import settings

from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    hash_password,
)
from models import UserLogin, TokenResponse, ApiResponse
from services import excel_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, response: Response):
    try:
        user = await authenticate_user(credentials.Username, credentials.Password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        token = create_access_token({"sub": user["Username"], "role": user.get("Role", "STAFF")})

        # Update last login (non-critical)
        try:
            await excel_service.update_user(user["Username"], {
                "Last_Login": excel_service._now_str(),
                "Password_Hash": user.get("Password_Hash", ""),
            })
        except Exception as e:
            pass

        # Audit log (non-critical)
        try:
            await excel_service.create_audit_log({
                "User": user["Username"],
                "Action": "Login",
                "Module": "Auth",
                "Details": f"User {user['Username']} logged in",
                "IP_Address": request.client.host if request.client else "",
            })
        except Exception as e:
            pass

        # Set HTTP-only cookie
        try:
            response.set_cookie(
                key="access_token",
                value=token,
                httponly=True,
                secure=settings.is_production,
                samesite="none" if settings.is_production else "lax",
                max_age=3600 * 8,
            )
        except Exception:
            pass

        return TokenResponse(
            access_token=token,
            user={
                "username": user["Username"],
                "full_name": user.get("Full_Name", ""),
                "role": user.get("Role", "STAFF"),
                "email": user.get("Email", ""),
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Login error: {str(exc)}")


@router.post("/logout")
async def logout(request: Request, response: Response, user: dict = Depends(get_current_user)):
    await excel_service.create_audit_log({
        "User": user.get("Username", ""),
        "Action": "Logout",
        "Module": "Auth",
        "Details": f"User {user.get('Username', '')} logged out",
        "IP_Address": request.client.host if request.client else "",
    })
    response.delete_cookie("access_token")
    return ApiResponse(message="Logged out successfully")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    user.pop("Password_Hash", None)
    return ApiResponse(data=user)


@router.post("/setup-admin")
async def setup_admin(request: Request):
    """One-time admin setup — creates default admin if no users exist."""
    users = await excel_service.get_all_users()
    if len(users) > 0:
        raise HTTPException(status_code=400, detail="Admin already exists")

    pw_hash = hash_password("admin123")
    await excel_service.create_user({
        "Username": "admin",
        "Password_Hash": pw_hash,
        "Full_Name": "System Administrator",
        "Email": "admin@kitchen.local",
        "Role": "ADMIN",
        "Status": "Active",
    })

    await excel_service.create_audit_log({
        "User": "System",
        "Action": "Setup Admin",
        "Module": "Auth",
        "Details": "Default admin account created",
        "IP_Address": request.client.host if request.client else "",
    })

    return ApiResponse(message="Admin account created successfully. Change the default password immediately.")
