"""
Stock Inward routes — record goods received.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_roles
from models import StockInwardCreate, StockInwardUpdate, ApiResponse
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


@router.put("/{transaction_id}")
async def update_inward(
    transaction_id: str,
    body: StockInwardUpdate,
    request: Request,
    user: dict = Depends(require_roles("ADMIN", "MANAGER", "STAFF")),
):
    try:
        update_data = body.model_dump(exclude_none=True)
        result = await excel_service.update_stock_inward(
            transaction_id, update_data, username=user.get("Username", "")
        )
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Update Stock Inward",
            "Module": "Stock Inward",
            "Transaction_ID": transaction_id,
            "Item_No": update_data.get("Item_No", ""),
            "Details": f"Updated inward txn {transaction_id}: {', '.join(update_data.keys())}",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Stock inward updated successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inward update failed: {str(e)}")


@router.delete("/{transaction_id}")
async def delete_inward(
    transaction_id: str,
    request: Request,
    user: dict = Depends(require_roles("ADMIN")),
):
    try:
        result = await excel_service.delete_stock_inward(transaction_id)
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Delete Stock Inward",
            "Module": "Stock Inward",
            "Transaction_ID": transaction_id,
            "Details": f"Deleted inward txn {transaction_id}",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Stock inward deleted successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inward deletion failed: {str(e)}")

