"""
Stock Outward routes — record goods issued to departments.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_roles
from models import StockOutwardCreate, ApiResponse
from services import excel_service
from services.graph_client import GraphClientError

router = APIRouter(prefix="/api/stock-outward", tags=["Stock Outward"])


@router.get("")
async def list_outward(user: dict = Depends(get_current_user)):
    rows = await excel_service.get_all_outward()
    return ApiResponse(data=rows)


@router.post("")
async def create_outward(
    body: StockOutwardCreate,
    request: Request,
    user: dict = Depends(require_roles("ADMIN", "MANAGER", "STAFF")),
):
    try:
        data_dict = body.model_dump(mode="json")
        result = await excel_service.create_stock_outward(
            data_dict, username=user.get("Username", "")
        )
        dept_str = body.Department.value if hasattr(body.Department, 'value') else str(body.Department)
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Stock Outward",
            "Module": "Stock Outward",
            "Transaction_ID": result.get("Transaction_ID", ""),
            "Item_No": body.Item_No,
            "Details": (
                f"Outward {result['Quantity']} {result['Unit']} of item {body.Item_No} "
                f"to {dept_str}"
            ),
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Stock outward recorded successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
