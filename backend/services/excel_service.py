"""
Excel service — high-level business logic for each Excel table.

Handles dynamic stock calculations from raw transactions, transaction ID generation,
validations, and orchestrates Microsoft Graph API / Excel operations.
NO hardcoded stock data: Excel is the SINGLE SOURCE OF TRUTH.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone, date, timedelta
from typing import Any, Optional

from config import settings
from services.graph_client import graph_client, GraphClientError

logger = logging.getLogger("excel_service")


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _parse_date(d: str) -> Optional[date]:
    """Parse various date formats reliably."""
    if not d:
        return None
    cleaned = str(d).strip().split("T")[0]
    for fmt in ("%Y-%m-%d", "%d-%b-%Y", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def _to_float(val: Any) -> float:
    try:
        if val is None or str(val).strip() == "":
            return 0.0
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def _compute_status(current: float, minimum: float, critical: float) -> str:
    if current <= critical:
        return "CRITICAL"
    if current <= minimum:
        return "LOW STOCK"
    return "IN STOCK"


# ═══════════════════════════════════════════════════════════════════════
# ITEMS
# ═══════════════════════════════════════════════════════════════════════

ITEM_COLUMNS = [
    "Item_ID", "Item_No", "Item_Name", "SKU", "Unit",
    "Opening_Qty", "Langar_Qty", "Minimum_Stock", "Critical_Stock",
    "Current_Stock", "Status", "Created_Date", "Updated_Date",
]


async def get_all_items() -> list[dict]:
    """Fetch all active items with current stock calculated dynamically from transactions."""
    items_rows = await graph_client.get_table_data(settings.TABLE_ITEMS)
    inward_rows = await graph_client.get_table_data(settings.TABLE_STOCK_INWARD)
    outward_rows = await graph_client.get_table_data(settings.TABLE_STOCK_OUTWARD)

    inward_map: dict[str, float] = {}
    for r in inward_rows:
        ino = str(r.get("Item_No", "")).strip()
        inward_map[ino] = inward_map.get(ino, 0.0) + _to_float(r.get("Quantity", 0))

    outward_map: dict[str, float] = {}
    for r in outward_rows:
        ino = str(r.get("Item_No", "")).strip()
        outward_map[ino] = outward_map.get(ino, 0.0) + _to_float(r.get("Quantity", 0))

    items = []
    for r in items_rows:
        if str(r.get("Status", "")).lower() != "inactive":
            item = dict(r)
            ino = str(r.get("Item_No", "")).strip()
            opening = _to_float(r.get("Opening_Qty", 0))
            tot_in = inward_map.get(ino, 0.0)
            tot_out = outward_map.get(ino, 0.0)
            current = opening + tot_in - tot_out

            item["Total_Inward"] = tot_in
            item["Total_Outward"] = tot_out
            item["Current_Stock"] = round(current, 4)
            item["Stock_Status"] = _compute_status(
                current,
                _to_float(r.get("Minimum_Stock", 0)),
                _to_float(r.get("Critical_Stock", 0)),
            )
            items.append(item)
    return items


async def get_all_items_including_inactive() -> list[dict]:
    items_rows = await graph_client.get_table_data(settings.TABLE_ITEMS)
    inward_rows = await graph_client.get_table_data(settings.TABLE_STOCK_INWARD)
    outward_rows = await graph_client.get_table_data(settings.TABLE_STOCK_OUTWARD)

    inward_map: dict[str, float] = {}
    for r in inward_rows:
        ino = str(r.get("Item_No", "")).strip()
        inward_map[ino] = inward_map.get(ino, 0.0) + _to_float(r.get("Quantity", 0))

    outward_map: dict[str, float] = {}
    for r in outward_rows:
        ino = str(r.get("Item_No", "")).strip()
        outward_map[ino] = outward_map.get(ino, 0.0) + _to_float(r.get("Quantity", 0))

    items = []
    for r in items_rows:
        item = dict(r)
        ino = str(r.get("Item_No", "")).strip()
        opening = _to_float(r.get("Opening_Qty", 0))
        tot_in = inward_map.get(ino, 0.0)
        tot_out = outward_map.get(ino, 0.0)
        current = opening + tot_in - tot_out

        item["Total_Inward"] = tot_in
        item["Total_Outward"] = tot_out
        item["Current_Stock"] = round(current, 4)
        item["Stock_Status"] = _compute_status(
            current,
            _to_float(r.get("Minimum_Stock", 0)),
            _to_float(r.get("Critical_Stock", 0)),
        )
        items.append(item)
    return items


async def get_item_by_no(item_no: str) -> Optional[dict]:
    items = await get_all_items_including_inactive()
    for item in items:
        if str(item.get("Item_No", "")).strip() == str(item_no).strip():
            return item
    return None


async def calculate_current_stock(item_no: str) -> float:
    """Current Stock = Opening Qty + Total Inward - Total Outward."""
    item = await get_item_by_no(item_no)
    if not item:
        return 0.0
    return _to_float(item.get("Current_Stock", 0))


async def create_item(data: dict) -> dict:
    now = _now_str()
    item_no = str(data.get("Item_No", "")).strip()
    item_id = item_no
    sku_val = str(data.get("Langar_Requirement", data.get("SKU", ""))).strip()
    values = [
        item_id,
        item_no,
        data.get("Item_Name", "").strip(),
        sku_val,
        data.get("Unit", "KG").strip(),
        _to_float(data.get("Opening_Qty", 0)),
        _to_float(data.get("Langar_Qty", 0)),
        _to_float(data.get("Minimum_Stock", 0)),
        _to_float(data.get("Critical_Stock", 0)),
        _to_float(data.get("Opening_Qty", 0)), # Initial stock is opening
        data.get("Status", "Active"),
        now,
        now,
    ]
    await graph_client.add_table_row(settings.TABLE_ITEMS, values)
    return {"Item_ID": item_id, "Item_No": item_no}


async def update_item(item_no: str, data: dict) -> dict:
    row_idx = await graph_client.find_row_index(settings.TABLE_ITEMS, "Item_No", item_no)
    if row_idx is None:
        raise GraphClientError(f"Item {item_no} not found", 404)

    existing = await get_item_by_no(item_no)
    if not existing:
        raise GraphClientError(f"Item {item_no} not found", 404)

    now = _now_str()
    sku_val = str(data.get("Langar_Requirement", data.get("SKU", existing.get("SKU", "")))).strip()
    values = [
        existing.get("Item_ID", item_no),
        item_no,
        data.get("Item_Name", existing.get("Item_Name", "")),
        sku_val,
        data.get("Unit", existing.get("Unit", "KG")),
        _to_float(data.get("Opening_Qty", existing.get("Opening_Qty", 0))),
        _to_float(data.get("Langar_Qty", existing.get("Langar_Qty", 0))),
        _to_float(data.get("Minimum_Stock", existing.get("Minimum_Stock", 0))),
        _to_float(data.get("Critical_Stock", existing.get("Critical_Stock", 0))),
        0,
        data.get("Status", existing.get("Status", "Active")),
        existing.get("Created_Date", now),
        now,
    ]
    await graph_client.update_table_row(settings.TABLE_ITEMS, row_idx, values)
    return {"Item_No": item_no, "updated": True}


async def delete_item(item_no: str) -> dict:
    row_idx = await graph_client.find_row_index(settings.TABLE_ITEMS, "Item_No", item_no)
    if row_idx is None:
        raise GraphClientError(f"Item {item_no} not found", 404)

    await graph_client.delete_table_row(
        settings.TABLE_ITEMS,
        row_index=row_idx,
        key_col="Item_No",
        key_val=item_no,
    )
    return {"Item_No": item_no, "deleted": True}


# ═══════════════════════════════════════════════════════════════════════

# STOCK INWARD
# ═══════════════════════════════════════════════════════════════════════

async def _generate_inward_id(dt: str) -> str:
    parsed = _parse_date(dt) or date.today()
    date_part = parsed.strftime("%Y%m%d")
    rows = await graph_client.get_table_data(settings.TABLE_STOCK_INWARD)
    prefix = f"IN-{date_part}-"
    max_seq = 0
    for r in rows:
        tid = str(r.get("Transaction_ID", "")).strip()
        if tid.startswith(prefix):
            suffix = tid[len(prefix):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
    seq = max_seq + 1
    return f"IN-{date_part}-{seq:04d}"


async def create_stock_inward(data: dict, username: str) -> dict:
    item_no = str(data.get("Item_No", "")).strip()
    if not item_no:
        raise GraphClientError("Item No is required", 400)

    quantity = _to_float(data.get("Quantity", 0))
    if quantity <= 0:
        raise GraphClientError("Quantity must be greater than 0", 400)

    item = await get_item_by_no(item_no)
    item_name = data.get("Item_Name", "").strip() or (item.get("Item_Name", "") if item else f"Item {item_no}")
    sku = data.get("SKU", "").strip() or (item.get("SKU", "") if item else item_no)
    item_unit = data.get("Unit", "").strip() or (item.get("Unit", "KG") if item else "KG")

    # If item does not exist in ITEMS table yet, auto-create it
    if not item:
        await create_item({
            "Item_No": item_no,
            "Item_Name": item_name,
            "SKU": sku,
            "Unit": item_unit,
            "Opening_Qty": 0,
            "Langar_Qty": 0,
            "Minimum_Stock": 10,
            "Critical_Stock": 2,
            "Status": "Active",
        })

    inward_date = data.get("Inward_Date", _today_str())
    txn_id = await _generate_inward_id(inward_date)
    now = _now_str()

    values = [
        txn_id,
        inward_date,
        item_no,
        item_name,
        sku,
        item_unit,
        quantity,
        data.get("Supplier", ""),
        data.get("Invoice_No", ""),
        data.get("Storage_Location", ""),
        data.get("Remarks", ""),
        username,
        now,
    ]
    await graph_client.add_table_row(settings.TABLE_STOCK_INWARD, values)
    return {
        "Transaction_ID": txn_id,
        "Item_No": item_no,
        "Item_Name": item_name,
        "Quantity": quantity,
        "Unit": item_unit,
    }


async def get_all_inward() -> list[dict]:
    return await graph_client.get_table_data(settings.TABLE_STOCK_INWARD)


# ═══════════════════════════════════════════════════════════════════════
# BARTAN INWARD
# ═══════════════════════════════════════════════════════════════════════

BARTAN_INWARD_COLUMNS = [
    "Record_ID", "Inward_Date", "Coming_Center", "Item_Name",
    "Item_Qty", "Missing_Items_Qty", "Item_Requirement",
    "Remarks", "Created_By", "Created_At",
]


async def _generate_bartan_inward_id(dt: str) -> str:
    parsed = _parse_date(dt) or date.today()
    date_part = parsed.strftime("%Y%m%d")
    rows = await graph_client.get_table_data(settings.TABLE_BARTAN_INWARD)
    prefix = f"BI-{date_part}-"
    max_seq = 0
    for r in rows:
        rid = str(r.get("Record_ID", "")).strip()
        if rid.startswith(prefix):
            suffix = rid[len(prefix):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
    seq = max_seq + 1
    return f"BI-{date_part}-{seq:04d}"


async def create_bartan_inward(data: dict, username: str) -> dict:
    coming_center = str(data.get("Coming_Center", "")).strip()
    if not coming_center:
        raise GraphClientError("Coming Center is required", 400)

    item_name = str(data.get("Item_Name", "")).strip()
    if not item_name:
        raise GraphClientError("Item Name is required", 400)

    item_qty = _to_float(data.get("Item_Qty", 0))
    if item_qty <= 0:
        raise GraphClientError("Item Qty must be greater than 0", 400)

    inward_date = data.get("Inward_Date", _today_str())
    record_id = await _generate_bartan_inward_id(inward_date)
    now = _now_str()

    values = [
        record_id,
        inward_date,
        coming_center,
        item_name,
        item_qty,
        _to_float(data.get("Missing_Items_Qty", 0)),
        data.get("Item_Requirement", ""),
        data.get("Remarks", ""),
        username,
        now,
    ]
    await graph_client.add_table_row(settings.TABLE_BARTAN_INWARD, values)
    return {
        "Record_ID": record_id,
        "Inward_Date": inward_date,
        "Coming_Center": coming_center,
        "Item_Name": item_name,
        "Item_Qty": item_qty,
    }


async def get_all_bartan_inward() -> list[dict]:
    return await graph_client.get_table_data(settings.TABLE_BARTAN_INWARD)


# ═══════════════════════════════════════════════════════════════════════
# STOCK OUTWARD
# ═══════════════════════════════════════════════════════════════════════

async def _generate_outward_id(dt: str) -> str:
    parsed = _parse_date(dt) or date.today()
    date_part = parsed.strftime("%Y%m%d")
    rows = await graph_client.get_table_data(settings.TABLE_STOCK_OUTWARD)
    prefix = f"OUT-{date_part}-"
    max_seq = 0
    for r in rows:
        tid = str(r.get("Transaction_ID", "")).strip()
        if tid.startswith(prefix):
            suffix = tid[len(prefix):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
    seq = max_seq + 1
    return f"OUT-{date_part}-{seq:04d}"


async def create_stock_outward(data: dict, username: str) -> dict:
    item_no = str(data.get("Item_No", "")).strip()
    if not item_no:
        raise GraphClientError("Item No is required", 400)

    quantity = _to_float(data.get("Quantity", 0))
    if quantity <= 0:
        raise GraphClientError("Quantity must be greater than 0", 400)

    # Validate department (strictly Canteen or Langar)
    raw_dept = data.get("Department", "Langar")
    if hasattr(raw_dept, "value"):
        dept_str = str(raw_dept.value).strip()
    elif hasattr(raw_dept, "name"):
        dept_str = str(raw_dept.name).strip()
    else:
        dept_str = str(raw_dept).strip()

    if "DepartmentName." in dept_str:
        dept_str = dept_str.split("DepartmentName.")[-1].strip()
    if ":" in dept_str and ("<" in dept_str or ">" in dept_str):
        dept_str = dept_str.replace("<", "").replace(">", "").split(":")[-1].replace("'", "").replace('"', '').strip()

    dept_clean = dept_str.lower()
    if dept_clean in ("canteen", "can"):
        department = "Canteen"
    elif dept_clean in ("langar", "lng"):
        department = "Langar"
    else:
        matched = next((d for d in settings.VALID_DEPARTMENTS if d.lower() == dept_clean), None)
        if matched:
            department = matched
        else:
            raise GraphClientError(
                f"Invalid department '{raw_dept}'. Department must ONLY be Canteen or Langar.",
                400,
            )

    item = await get_item_by_no(item_no)
    item_name = data.get("Item_Name", "").strip() or (item.get("Item_Name", "") if item else f"Item {item_no}")
    sku = data.get("SKU", "").strip() or (item.get("SKU", "") if item else item_no)
    item_unit = data.get("Unit", "").strip() or (item.get("Unit", "KG") if item else "KG")

    # Validate real-time available stock
    current = await calculate_current_stock(item_no)
    if quantity > current:
        raise GraphClientError(
            f"INSUFFICIENT STOCK: Cannot issue {quantity} {item_unit}. Only {current} {item_unit} is currently available in stock.",
            400,
        )

    outward_date = data.get("Outward_Date", _today_str())
    txn_id = await _generate_outward_id(outward_date)
    now = _now_str()

    values = [
        txn_id,
        outward_date,
        item_no,
        item_name,
        sku,
        item_unit,
        quantity,
        department,
        data.get("Issued_To", ""),
        data.get("Receiver_Name", ""),
        data.get("Purpose", ""),
        data.get("Remarks", ""),
        username,
        now,
    ]
    await graph_client.add_table_row(settings.TABLE_STOCK_OUTWARD, values)
    return {
        "Transaction_ID": txn_id,
        "Item_No": item_no,
        "Item_Name": item_name,
        "Quantity": quantity,
        "Unit": item_unit,
        "Department": department,
    }



async def get_all_outward() -> list[dict]:
    return await graph_client.get_table_data(settings.TABLE_STOCK_OUTWARD)


async def update_stock_outward(txn_id: str, data: dict, username: str) -> dict:
    row_idx = await graph_client.find_row_index(settings.TABLE_STOCK_OUTWARD, "Transaction_ID", txn_id)
    if row_idx is None:
        raise GraphClientError(f"Transaction '{txn_id}' not found", 404)

    existing_rows = await graph_client.find_rows(settings.TABLE_STOCK_OUTWARD, "Transaction_ID", txn_id)
    if not existing_rows:
        raise GraphClientError(f"Transaction '{txn_id}' not found", 404)
    existing = existing_rows[0]

    item_no = str(data.get("Item_No", existing.get("Item_No", ""))).strip()
    quantity = _to_float(data.get("Quantity", existing.get("Quantity", 0)))
    if quantity <= 0:
        raise GraphClientError("Quantity must be greater than 0", 400)

    # Department validation
    raw_dept = data.get("Department", existing.get("Department", "Langar"))
    if hasattr(raw_dept, "value"):
        dept_str = str(raw_dept.value).strip()
    elif hasattr(raw_dept, "name"):
        dept_str = str(raw_dept.name).strip()
    else:
        dept_str = str(raw_dept).strip()

    if "DepartmentName." in dept_str:
        dept_str = dept_str.split("DepartmentName.")[-1].strip()
    dept_clean = dept_str.lower()
    if dept_clean in ("canteen", "can"):
        department = "Canteen"
    elif dept_clean in ("langar", "lng"):
        department = "Langar"
    else:
        department = "Langar"

    item = await get_item_by_no(item_no)
    item_name = str(data.get("Item_Name", existing.get("Item_Name", ""))).strip() or (item.get("Item_Name", "") if item else f"Item {item_no}")
    sku = str(data.get("SKU", existing.get("SKU", ""))).strip() or (item.get("SKU", "") if item else item_no)
    item_unit = str(data.get("Unit", existing.get("Unit", "KG"))).strip() or (item.get("Unit", "KG") if item else "KG")

    outward_date = data.get("Outward_Date", existing.get("Outward_Date", _today_str()))
    now = _now_str()

    values = [
        txn_id,
        outward_date,
        item_no,
        item_name,
        sku,
        item_unit,
        quantity,
        department,
        data.get("Issued_To", existing.get("Issued_To", "")),
        data.get("Receiver_Name", existing.get("Receiver_Name", "")),
        data.get("Purpose", existing.get("Purpose", "")),
        data.get("Remarks", existing.get("Remarks", "")),
        existing.get("Created_By", username),
        existing.get("Created_At", now),
    ]
    await graph_client.update_table_row(settings.TABLE_STOCK_OUTWARD, row_idx, values)
    return {
        "Transaction_ID": txn_id,
        "Item_No": item_no,
        "Item_Name": item_name,
        "Quantity": quantity,
        "Unit": item_unit,
        "Department": department,
        "updated": True,
    }


async def delete_stock_outward(txn_id: str) -> dict:
    row_idx = await graph_client.find_row_index(settings.TABLE_STOCK_OUTWARD, "Transaction_ID", txn_id)
    if row_idx is None:
        raise GraphClientError(f"Transaction '{txn_id}' not found", 404)

    await graph_client.delete_table_row(
        settings.TABLE_STOCK_OUTWARD,
        row_index=row_idx,
        key_col="Transaction_ID",
        key_val=txn_id,
    )
    return {"Transaction_ID": txn_id, "deleted": True}


# ═══════════════════════════════════════════════════════════════════════
# DEPARTMENTS
# ═══════════════════════════════════════════════════════════════════════

async def get_departments() -> list[dict]:
    return await graph_client.get_table_data(settings.TABLE_DEPARTMENTS)


async def update_department(dept_id: str, data: dict) -> dict:
    row_idx = await graph_client.find_row_index(settings.TABLE_DEPARTMENTS, "Department_ID", dept_id)
    if row_idx is None:
        raise GraphClientError(f"Department {dept_id} not found", 404)
    existing_rows = await graph_client.find_rows(settings.TABLE_DEPARTMENTS, "Department_ID", dept_id)
    if not existing_rows:
        raise GraphClientError(f"Department {dept_id} not found", 404)
    existing = existing_rows[0]
    now = _now_str()
    values = [
        dept_id,
        data.get("Department_Name", existing.get("Department_Name", "")),
        data.get("Short_Code", existing.get("Short_Code", "")),
        data.get("Description", existing.get("Description", "")),
        data.get("Status", existing.get("Status", "Active")),
        existing.get("Created_Date", now),
        now,
    ]
    await graph_client.update_table_row(settings.TABLE_DEPARTMENTS, row_idx, values)
    return {"Department_ID": dept_id, "updated": True}


# ═══════════════════════════════════════════════════════════════════════
# USERS
# ═══════════════════════════════════════════════════════════════════════

async def get_all_users() -> list[dict]:
    rows = await graph_client.get_table_data(settings.TABLE_USERS)
    for r in rows:
        r.pop("Password_Hash", None)
    return rows


async def get_user_by_username(username: str) -> Optional[dict]:
    rows = await graph_client.find_rows(settings.TABLE_USERS, "Username", username)
    return rows[0] if rows else None


async def create_user(data: dict) -> dict:
    existing = await get_user_by_username(data["Username"])
    if existing:
        raise GraphClientError(f"Username '{data['Username']}' already exists", 409)
    now = _now_str()
    all_users_raw = await graph_client.get_table_data(settings.TABLE_USERS)
    max_seq = 0
    for u in all_users_raw:
        uid = str(u.get("User_ID", "")).strip()
        if uid.startswith("USR-"):
            suffix = uid[4:]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
    user_id = f"USR-{max_seq + 1:04d}"
    values = [
        user_id,
        data["Username"],
        data.get("Password_Hash", ""),
        data.get("Full_Name", ""),
        data.get("Email", ""),
        data.get("Role", "STAFF"),
        data.get("Status", "Active"),
        now,
        now,
        "",
    ]
    await graph_client.add_table_row(settings.TABLE_USERS, values)
    return {"User_ID": user_id, "Username": data["Username"]}


async def update_user(username: str, data: dict) -> dict:
    row_idx = await graph_client.find_row_index(settings.TABLE_USERS, "Username", username)
    if row_idx is None:
        raise GraphClientError(f"User '{username}' not found", 404)
    existing = await get_user_by_username(username)
    if not existing:
        raise GraphClientError(f"User '{username}' not found", 404)
    now = _now_str()
    values = [
        existing.get("User_ID", ""),
        username,
        data.get("Password_Hash", existing.get("Password_Hash", "")),
        data.get("Full_Name", existing.get("Full_Name", "")),
        data.get("Email", existing.get("Email", "")),
        data.get("Role", existing.get("Role", "STAFF")),
        data.get("Status", existing.get("Status", "Active")),
        existing.get("Created_Date", now),
        now,
        data.get("Last_Login", existing.get("Last_Login", "")),
    ]
    await graph_client.update_table_row(settings.TABLE_USERS, row_idx, values)
    return {"Username": username, "updated": True}


# ═══════════════════════════════════════════════════════════════════════
# AUDIT LOGS
# ═══════════════════════════════════════════════════════════════════════

async def create_audit_log(data: dict) -> dict:
    now = _now_str()
    all_logs = await graph_client.get_table_data(settings.TABLE_AUDIT_LOGS)
    max_seq = 0
    for l in all_logs:
        lid = str(l.get("Log_ID", "")).strip()
        if lid.startswith("LOG-"):
            suffix = lid[4:]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
    log_id = f"LOG-{max_seq + 1:06d}"
    values = [
        log_id,
        now,
        data.get("User", "System"),
        data.get("Action", ""),
        data.get("Module", ""),
        data.get("Transaction_ID", ""),
        data.get("Item_No", ""),
        data.get("Details", ""),
        data.get("IP_Address", ""),
        data.get("Status", "Success"),
    ]
    await graph_client.add_table_row(settings.TABLE_AUDIT_LOGS, values)
    return {"Log_ID": log_id}


async def get_audit_logs() -> list[dict]:
    return await graph_client.get_table_data(settings.TABLE_AUDIT_LOGS)


# ═══════════════════════════════════════════════════════════════════════
# SETTINGS
# ═══════════════════════════════════════════════════════════════════════

async def get_all_settings() -> list[dict]:
    return await graph_client.get_table_data(settings.TABLE_SETTINGS)


async def update_setting(key: str, value: str, username: str) -> dict:
    row_idx = await graph_client.find_row_index(settings.TABLE_SETTINGS, "Setting_Key", key)
    if row_idx is None:
        raise GraphClientError(f"Setting '{key}' not found", 404)
    existing_rows = await graph_client.find_rows(settings.TABLE_SETTINGS, "Setting_Key", key)
    if not existing_rows:
        raise GraphClientError(f"Setting '{key}' not found", 404)
    existing = existing_rows[0]
    now = _now_str()
    values = [
        key,
        value,
        existing.get("Category", "General"),
        existing.get("Description", ""),
        username,
        now,
    ]
    await graph_client.update_table_row(settings.TABLE_SETTINGS, row_idx, values)
    return {"Setting_Key": key, "updated": True}


# ═══════════════════════════════════════════════════════════════════════
# DYNAMIC DASHBOARD AGGREGATION (NO HARDCODED MOCKS)
# ═══════════════════════════════════════════════════════════════════════

async def get_dashboard_stats() -> dict:
    """Aggregate dashboard statistics dynamically from Excel."""
    items = await get_all_items()
    today_dt = date.today()

    inward = await get_all_inward()
    outward = await get_all_outward()

    # Today's totals
    todays_in = [
        r for r in inward
        if _parse_date(str(r.get("Inward_Date", ""))) == today_dt
    ]
    todays_out = [
        r for r in outward
        if _parse_date(str(r.get("Outward_Date", ""))) == today_dt
    ]

    low_stock = [i for i in items if i.get("Stock_Status") == "LOW STOCK"]
    critical_stock = [i for i in items if i.get("Stock_Status") == "CRITICAL"]

    # Recent transactions (last 10)
    all_txn = []
    for r in inward:
        all_txn.append({**r, "Type": "INWARD"})
    for r in outward:
        all_txn.append({**r, "Type": "OUTWARD"})
    all_txn.sort(key=lambda x: str(x.get("Created_At", "")), reverse=True)

    # Department usage (strictly Canteen vs Langar)
    canteen_total = sum(_to_float(r.get("Quantity", 0)) for r in outward if r.get("Department") == "Canteen")
    langar_total = sum(_to_float(r.get("Quantity", 0)) for r in outward if r.get("Department") == "Langar")

    # Daily outward history (last 14 days)
    start_history = today_dt - timedelta(days=13)
    daily_history = []
    for day_offset in range(14):
        curr_d = start_history + timedelta(days=day_offset)
        curr_str = curr_d.strftime("%Y-%m-%d")
        curr_display = curr_d.strftime("%d %b")

        l_val = sum(
            _to_float(r.get("Quantity", 0))
            for r in outward
            if _parse_date(str(r.get("Outward_Date", ""))) == curr_d and r.get("Department") == "Langar"
        )
        c_val = sum(
            _to_float(r.get("Quantity", 0))
            for r in outward
            if _parse_date(str(r.get("Outward_Date", ""))) == curr_d and r.get("Department") == "Canteen"
        )
        daily_history.append({
            "day": curr_display,
            "date": curr_str,
            "Langar": round(l_val, 2),
            "Canteen": round(c_val, 2),
        })

    conn = await graph_client.check_connection()

    return {
        "total_items": len(items),
        "todays_inward": sum(_to_float(r.get("Quantity", 0)) for r in todays_in),
        "todays_outward": sum(_to_float(r.get("Quantity", 0)) for r in todays_out),
        "total_current_stock": sum(_to_float(i.get("Current_Stock", 0)) for i in items),
        "low_stock_items": len(low_stock) + len(critical_stock),
        "critical_stock_items": len(critical_stock),
        "low_stock_list": (critical_stock + low_stock)[:10],
        "critical_stock_list": critical_stock[:10],
        "recent_transactions": all_txn[:10],
        "daily_outward_chart": daily_history,
        "department_usage": [
            {"name": "Langar", "value": round(langar_total, 2)},
            {"name": "Canteen", "value": round(canteen_total, 2)},
        ],
        "excel_connected": conn.get("connected", False),
        "last_synced": conn.get("last_synced", ""),
    }


async def get_all_records(filters: dict) -> dict:
    """Retrieve all transactions with filtering and pagination."""
    inward = await get_all_inward()
    outward = await get_all_outward()

    all_records = []
    for r in inward:
        all_records.append({
            "Date_Time": r.get("Created_At", r.get("Inward_Date", "")),
            "Type": "INWARD",
            "Transaction_ID": r.get("Transaction_ID", ""),
            "Item_No": r.get("Item_No", ""),
            "Item_Name": r.get("Item_Name", ""),
            "SKU": r.get("SKU", ""),
            "Unit": r.get("Unit", ""),
            "Quantity": _to_float(r.get("Quantity", 0)),
            "Department": "-",
            "Issued_To_Received_From": r.get("Supplier", ""),
            "User": r.get("Created_By", ""),
            "Remarks": r.get("Remarks", ""),
        })
    for r in outward:
        all_records.append({
            "Date_Time": r.get("Created_At", r.get("Outward_Date", "")),
            "Type": "OUTWARD",
            "Transaction_ID": r.get("Transaction_ID", ""),
            "Item_No": r.get("Item_No", ""),
            "Item_Name": r.get("Item_Name", ""),
            "SKU": r.get("SKU", ""),
            "Unit": r.get("Unit", ""),
            "Quantity": _to_float(r.get("Quantity", 0)),
            "Department": r.get("Department", ""),
            "Issued_To_Received_From": r.get("Issued_To", ""),
            "User": r.get("Created_By", ""),
            "Remarks": r.get("Remarks", ""),
        })

    # Filter logic
    if filters.get("transaction_type") and filters["transaction_type"] != "All":
        all_records = [r for r in all_records if r["Type"] == filters["transaction_type"]]
    if filters.get("item_no") and filters["item_no"] != "All":
        all_records = [r for r in all_records if str(r["Item_No"]).strip() == str(filters["item_no"]).strip()]
    if filters.get("department") and filters["department"] != "All":
        all_records = [r for r in all_records if r["Department"] == filters["department"]]
    if filters.get("sku") and filters["sku"] != "All":
        all_records = [r for r in all_records if r["SKU"] == filters["sku"]]
    if filters.get("unit") and filters["unit"] != "All":
        all_records = [r for r in all_records if r["Unit"] == filters["unit"]]
    if filters.get("user") and filters["user"] != "All":
        all_records = [r for r in all_records if r["User"] == filters["user"]]
    if filters.get("search"):
        q = filters["search"].lower()
        all_records = [
            r for r in all_records
            if q in str(r.get("Item_Name", "")).lower()
            or q in str(r.get("Item_No", "")).lower()
            or q in str(r.get("Transaction_ID", "")).lower()
            or q in str(r.get("Remarks", "")).lower()
        ]
    if filters.get("from_date"):
        fd = _parse_date(filters["from_date"])
        if fd:
            all_records = [r for r in all_records if _parse_date(str(r.get("Date_Time", ""))) and _parse_date(str(r.get("Date_Time", ""))) >= fd]
    if filters.get("to_date"):
        td = _parse_date(filters["to_date"])
        if td:
            all_records = [r for r in all_records if _parse_date(str(r.get("Date_Time", ""))) and _parse_date(str(r.get("Date_Time", ""))) <= td]

    all_records.sort(key=lambda x: str(x.get("Date_Time", "")), reverse=True)

    total = len(all_records)
    page = int(filters.get("page", 1))
    page_size = int(filters.get("page_size", 10))
    start = (page - 1) * page_size
    end = start + page_size

    return {
        "data": all_records[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


async def get_monthly_report(from_date: str, to_date: str, item_no: str = None, department: str = None) -> list[dict]:
    """Generate the dynamic date-wise register report."""
    items = await get_all_items()
    inward = await graph_client.get_table_data(settings.TABLE_STOCK_INWARD)
    outward = await graph_client.get_table_data(settings.TABLE_STOCK_OUTWARD)

    fd = _parse_date(from_date) or date.today()
    td = _parse_date(to_date) or date.today()

    dates = []
    current = fd
    while current <= td:
        dates.append(current)
        current += timedelta(days=1)

    if item_no and item_no != "All":
        items = [i for i in items if str(i.get("Item_No", "")).strip() == str(item_no).strip()]

    report = []
    for item in items:
        ino = str(item.get("Item_No", "")).strip()
        row = {
            "Item_No": ino,
            "Item_Name": item.get("Item_Name", ""),
            "SKU": item.get("SKU", ""),
            "Unit": item.get("Unit", ""),
            "Opening_Qty": _to_float(item.get("Opening_Qty", 0)),
            "Langar_Qty": _to_float(item.get("Langar_Qty", 0)),
            "Inward_Qty": 0,
            "dates": {},
            "Total_Outward": 0,
            "Closing_Stock": _to_float(item.get("Current_Stock", 0)),
            "Status": item.get("Stock_Status", "IN STOCK"),
        }

        # Calculate inward in date range
        item_inwards = [r for r in inward if str(r.get("Item_No", "")).strip() == ino]
        for r in item_inwards:
            rd = _parse_date(str(r.get("Inward_Date", "")))
            if rd and fd <= rd <= td:
                row["Inward_Qty"] += _to_float(r.get("Quantity", 0))

        # Calculate outward per date
        item_outward = [r for r in outward if str(r.get("Item_No", "")).strip() == ino]
        if department and department != "All":
            item_outward = [r for r in item_outward if r.get("Department") == department]

        total_out = 0
        for d in dates:
            date_str = d.strftime("%Y-%m-%d")
            day_qty = sum(
                _to_float(r.get("Quantity", 0))
                for r in item_outward
                if _parse_date(str(r.get("Outward_Date", ""))) == d
            )
            row["dates"][date_str] = round(day_qty, 4)
            total_out += day_qty

        row["Total_Outward"] = round(total_out, 4)
        report.append(row)

    return report


async def get_department_report(from_date: str, to_date: str) -> dict:
    """Department-wise usage report strictly for Canteen and Langar."""
    outward = await get_all_outward()
    fd = _parse_date(from_date) or date.today()
    td = _parse_date(to_date) or date.today()

    result: dict[str, dict[str, dict[str, Any]]] = {"Canteen": {}, "Langar": {}}
    for r in outward:
        rd = _parse_date(str(r.get("Outward_Date", "")))
        if not rd or rd < fd or rd > td:
            continue
        dept = str(r.get("Department", "")).strip()
        if dept in result:
            item_name = r.get("Item_Name", "Unknown")
            unit = r.get("Unit", "")
            key = f"{item_name}"
            if key not in result[dept]:
                result[dept][key] = {"quantity": 0.0, "unit": unit}
            result[dept][key]["quantity"] += _to_float(r.get("Quantity", 0))

    return result


async def get_daily_outward(from_date: str, to_date: str) -> list[dict]:
    """Daily outward totals for charts."""
    outward = await get_all_outward()
    fd = _parse_date(from_date) or date.today()
    td = _parse_date(to_date) or date.today()

    daily = {}
    current = fd
    while current <= td:
        daily[current.strftime("%Y-%m-%d")] = 0.0
        current += timedelta(days=1)

    for r in outward:
        rd = _parse_date(str(r.get("Outward_Date", "")))
        if rd and fd <= rd <= td:
            ds = rd.strftime("%Y-%m-%d")
            if ds in daily:
                daily[ds] += _to_float(r.get("Quantity", 0))

    return [{"date": k, "total": round(v, 4)} for k, v in sorted(daily.items())]
