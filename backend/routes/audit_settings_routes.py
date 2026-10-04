"""
Audit logs and Settings routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_roles
from models import ApiResponse, SettingUpdate
from services import excel_service
from services.graph_client import GraphClientError

router = APIRouter(prefix="/api", tags=["Audit & Settings"])


# ── Audit Logs ─────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def list_audit_logs(user: dict = Depends(get_current_user)):
    logs = await excel_service.get_audit_logs()
    # Sort newest first
    logs.sort(key=lambda x: str(x.get("Date_Time", "")), reverse=True)
    return ApiResponse(data=logs)


# ── Settings ───────────────────────────────────────────────────────────

@router.get("/settings")
async def list_settings(user: dict = Depends(get_current_user)):
    s = await excel_service.get_all_settings()
    return ApiResponse(data=s)


@router.put("/settings/{key}")
async def update_setting(
    key: str,
    body: SettingUpdate,
    request: Request,
    user: dict = Depends(require_roles("ADMIN")),
):
    try:
        result = await excel_service.update_setting(key, body.Setting_Value, user.get("Username", ""))
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Update Setting",
            "Module": "Settings",
            "Details": f"Updated setting {key} = {body.Setting_Value}",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Setting updated", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
