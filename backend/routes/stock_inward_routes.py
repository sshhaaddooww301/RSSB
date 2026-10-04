"""
Stock Inward routes — record goods received.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_roles
from models import StockInwardCreate, ApiResponse
from services import excel_service
from services.graph_client import GraphClientError

router = APIRouter(prefix="/api/stock-inward", tags=["Stock Inward"])


@router.get("")
async def list_inward(user: dict = Depends(get_current_user)):
    rows = await excel_service.get_all_inward()
    return ApiResponse(data=rows)


@router.post("")
async def create_inward(
    body: StockInwardCreate,
    request: Request,
    user: dict = Depends(require_roles("ADMIN", "MANAGER", "STAFF")),
):
    try:
        result = await excel_service.create_stock_inward(
            body.model_dump(), username=user.get("Username", "")
        )
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Stock Inward",
            "Module": "Stock Inward",
            "Transaction_ID": result.get("Transaction_ID", ""),
            "Item_No": body.Item_No,
            "Details": f"Inward {result['Quantity']} {result['Unit']} of item {body.Item_No}",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Stock inward recorded successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inward recording failed: {str(e)}")
