"""
Dashboard, Reports, Records, and Departments routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional

from auth import get_current_user, require_roles
from models import ApiResponse, DepartmentUpdate
from services import excel_service
from services.graph_client import graph_client, GraphClientError

router = APIRouter(prefix="/api", tags=["Dashboard & Reports"])


# ── Dashboard ──────────────────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    stats = await excel_service.get_dashboard_stats()
    return ApiResponse(data=stats)


@router.get("/dashboard/sync")
async def sync_status(user: dict = Depends(get_current_user)):
    result = await graph_client.check_connection()
    return ApiResponse(data=result)


@router.post("/dashboard/sync")
async def force_sync(user: dict = Depends(get_current_user)):
    result = await graph_client.check_connection()
    return ApiResponse(
        message="Sync completed" if result.get("connected") else "Sync failed",
        data=result,
    )


# ── Records ────────────────────────────────────────────────────────────

@router.get("/records")
async def all_records(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    transaction_type: Optional[str] = None,
    item_no: Optional[str] = None,
    department: Optional[str] = None,
    sku: Optional[str] = None,
    unit: Optional[str] = None,
    user_filter: Optional[str] = Query(None, alias="user"),
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    user: dict = Depends(get_current_user),
):
    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "transaction_type": transaction_type,
        "item_no": item_no,
        "department": department,
        "sku": sku,
        "unit": unit,
        "user": user_filter,
        "search": search,
        "page": page,
        "page_size": page_size,
    }
    result = await excel_service.get_all_records(filters)
    return result


# ── Reports ────────────────────────────────────────────────────────────

@router.get("/reports/monthly")
async def monthly_report(
    from_date: str,
    to_date: str,
    item_no: Optional[str] = None,
    department: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    try:
        report = await excel_service.get_monthly_report(from_date, to_date, item_no, department)
        return ApiResponse(data=report)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/reports/department")
async def department_report(
    from_date: str,
    to_date: str,
    user: dict = Depends(get_current_user),
):
    report = await excel_service.get_department_report(from_date, to_date)
    return ApiResponse(data=report)


@router.get("/reports/daily-outward")
async def daily_outward(
    from_date: str,
    to_date: str,
    user: dict = Depends(get_current_user),
):
    data = await excel_service.get_daily_outward(from_date, to_date)
    return ApiResponse(data=data)


# ── Departments ────────────────────────────────────────────────────────

@router.get("/departments")
async def list_departments(user: dict = Depends(get_current_user)):
    depts = await excel_service.get_departments()
    return ApiResponse(data=depts)


@router.put("/departments/{dept_id}")
async def update_department(
    dept_id: str,
    body: DepartmentUpdate,
    request: Request,
    user: dict = Depends(require_roles("ADMIN")),
):
    try:
        result = await excel_service.update_department(dept_id, body.model_dump(exclude_none=True))
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Update Department",
            "Module": "Departments",
            "Details": f"Updated department {dept_id}",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(message="Department updated", data=result)
    except GraphClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# ── Low Stock Alerts ───────────────────────────────────────────────────

@router.get("/low-stock")
async def low_stock_alerts(user: dict = Depends(get_current_user)):
    items = await excel_service.get_all_items()
    low = [i for i in items if i.get("Stock_Status") in ("LOW STOCK", "CRITICAL")]
    return ApiResponse(data=low)
