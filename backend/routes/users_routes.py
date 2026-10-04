"""
Users management routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_roles, hash_password
from models import UserCreate, UserUpdate, ApiResponse
from services import excel_service
from services.graph_client import GraphClientError

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("")
async def list_users(user: dict = Depends(get_current_user)):
    users = await excel_service.get_all_users()
    for u in users:
        u.pop("Password_Hash", None)
    return ApiResponse(data=users)


@router.get("/{username}")
async def get_user(username: str, user: dict = Depends(require_roles("ADMIN"))):
    found = await excel_service.get_user_by_username(username)
    if not found:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found")
    found.pop("Password_Hash", None)
    return ApiResponse(data=found)


@router.post("")
async def create_user(body: UserCreate, request: Request, user: dict = Depends(require_roles("ADMIN"))):
    try:
        pw_hash = hash_password(body.Password)
        result = await excel_service.create_user({
            "Username": body.Username,
            "Password_Hash": pw_hash,
            "Full_Name": body.Full_Name,
            "Email": body.Email,
            "Role": body.Role.value,
            "Status": body.Status,
        })
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Create User",
            "Module": "Users",
            "Details": f"Created user {body.Username} with role {body.Role.value}",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="User created successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/{username}")
async def update_user(
    username: str,
    body: UserUpdate,
    request: Request,
    user: dict = Depends(require_roles("ADMIN")),
):
    try:
        update_data = body.model_dump(exclude_none=True)
        if "Password" in update_data and update_data["Password"]:
            update_data["Password_Hash"] = hash_password(update_data.pop("Password"))
        else:
            update_data.pop("Password", None)
            # Need to preserve existing hash
            existing = await excel_service.get_user_by_username(username)
            if existing:
                update_data["Password_Hash"] = existing.get("Password_Hash", "")
        if "Role" in update_data:
            update_data["Role"] = update_data["Role"].value

        result = await excel_service.update_user(username, update_data)
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Update User",
            "Module": "Users",
            "Details": f"Updated user {username}",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="User updated successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
