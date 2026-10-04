"""
Bartan Inward routes — record incoming utensils.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_roles
from models import BartanInwardCreate, ApiResponse
from services import excel_service
from services.graph_client import GraphClientError

router = APIRouter(prefix="/api/bartan-inward", tags=["Bartan Inward"])


@router.get("")
async def list_bartan_inward(user: dict = Depends(get_current_user)):
    rows = await excel_service.get_all_bartan_inward()
    return ApiResponse(data=rows)


@router.post("")
async def create_bartan_inward(
    body: BartanInwardCreate,
    request: Request,
    user: dict = Depends(require_roles("ADMIN", "MANAGER", "STAFF")),
):
    try:
        result = await excel_service.create_bartan_inward(
            body.model_dump(), username=user.get("Username", "")
        )
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Bartan Inward",
            "Module": "Bartan Inward",
            "Transaction_ID": result.get("Record_ID", ""),
            "Item_No": "",
            "Details": (
                f"Bartan inward recorded: {result.get('Item_Name', '')} "
                f"Qty={result.get('Item_Qty', '')} from {result.get('Coming_Center', '')}"
            ),
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Bartan inward recorded successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
