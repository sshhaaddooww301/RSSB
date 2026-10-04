"""
Items / Inventory routes — CRUD for the ITEMS Excel table.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_roles
from models import ItemCreate, ItemUpdate, ApiResponse
from services import excel_service
from services.graph_client import GraphClientError
from config import settings

router = APIRouter(prefix="/api/items", tags=["Items"])


@router.get("")
async def list_items(user: dict = Depends(get_current_user)):
    items = await excel_service.get_all_items()
    return ApiResponse(data=items)


@router.get("/all")
async def list_all_items(user: dict = Depends(get_current_user)):
    items = await excel_service.get_all_items_including_inactive()
    return ApiResponse(data=items)


@router.get("/{item_no}")
async def get_item(item_no: str, user: dict = Depends(get_current_user)):
    item = await excel_service.get_item_by_no(item_no)
    if not item:
        raise HTTPException(status_code=404, detail=f"Item {item_no} not found")
    return ApiResponse(data=item)


@router.post("")
async def create_item(body: ItemCreate, request: Request, user: dict = Depends(require_roles("ADMIN", "MANAGER"))):
    unit_val = str(getattr(body.Unit, "value", body.Unit)).strip().upper()
    if unit_val not in settings.VALID_UNITS:
        raise HTTPException(status_code=400, detail=f"Invalid unit. Must be one of: {', '.join(settings.VALID_UNITS)}")

    # Check for duplicates
    existing = await excel_service.get_item_by_no(body.Item_No)
    if existing:
        raise HTTPException(status_code=409, detail=f"Item {body.Item_No} already exists")

    try:
        dump = body.model_dump()
        dump["Unit"] = unit_val
        result = await excel_service.create_item(dump)
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Create Item",
            "Module": "Items",
            "Item_No": body.Item_No,
            "Details": f"Created item {body.Item_Name} ({unit_val})",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Item created successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/{item_no}")
async def update_item(item_no: str, body: ItemUpdate, request: Request, user: dict = Depends(require_roles("ADMIN", "MANAGER"))):
    try:
        update_data = body.model_dump(exclude_none=True)
        if "Unit" in update_data:
            update_data["Unit"] = str(getattr(update_data["Unit"], "value", update_data["Unit"])).strip().upper()
        result = await excel_service.update_item(item_no, update_data)
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Update Item",
            "Module": "Items",
            "Item_No": item_no,
            "Details": f"Updated item {item_no}: {', '.join(update_data.keys())}",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Item updated successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)



@router.delete("/{item_no}")
async def delete_item(item_no: str, request: Request, user: dict = Depends(require_roles("ADMIN", "MANAGER"))):
    existing = await excel_service.get_item_by_no(item_no)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Item {item_no} not found")
    try:
        result = await excel_service.delete_item(item_no)
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Delete Item",
            "Module": "Items",
            "Item_No": item_no,
            "Details": f"Deleted item {item_no} ({existing.get('Item_Name', '')})",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Item deleted successfully", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

