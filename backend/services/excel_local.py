"""
Local Excel Workbook Manager (openpyxl).
Provides local database implementation using the exact table structure
in 'Kitchen_Stock_Database.xlsx'. All data is read from and written to the Excel file.
"""

from __future__ import annotations
import logging
from pathlib import Path
from typing import Any
import openpyxl
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.utils import get_column_letter

logger = logging.getLogger("excel_local")

DB_PATH = Path(__file__).parent.parent / "Kitchen_Stock_Database.xlsx"


def _sanitize_cell_val(val: Any) -> Any:
    """Neutralize formula injection prefixes in strings."""
    if isinstance(val, str) and len(val) > 0:
        first = val[0]
        if first in ("=", "+", "@", "\t", "\r"):
            return "'" + val
        # Only sanitize "-" if it's NOT a negative number (e.g. "-5" is safe)
        if first == "-" and (len(val) < 2 or not val[1].isdigit()):
            return "'" + val
    return val


def _desanitize_cell_val(val: Any) -> Any:
    """Restore sanitized formula prefix for application logic."""
    if isinstance(val, str) and val.startswith("'") and len(val) > 1 and val[1] in ("=", "+", "@", "\t", "\r"):
        return val[1:]
    # Also restore sanitized "-" that was NOT a negative number
    if isinstance(val, str) and val.startswith("'-") and (len(val) < 3 or not val[2].isdigit()):
        return val[1:]
    return val

TABLE_SCHEMAS = {
    "ITEMS": [
        "Item_ID", "Item_No", "Item_Name", "SKU", "Unit",
        "Opening_Qty", "Langar_Qty", "Minimum_Stock", "Critical_Stock",
        "Current_Stock", "Status", "Created_Date", "Updated_Date"
    ],
    "STOCK_INWARD": [
        "Transaction_ID", "Inward_Date", "Item_No", "Item_Name", "SKU",
        "Unit", "Quantity", "Supplier", "Invoice_No", "Storage_Location",
        "Remarks", "Created_By", "Created_At"
    ],
    "STOCK_OUTWARD": [
        "Transaction_ID", "Outward_Date", "Item_No", "Item_Name", "SKU",
        "Unit", "Quantity", "Department", "Issued_To", "Receiver_Name",
        "Purpose", "Remarks", "Created_By", "Created_At"
    ],
    "DEPARTMENTS": [
        "Department_ID", "Department_Name", "Short_Code", "Description",
        "Status", "Created_Date", "Updated_Date"
    ],
    "USERS": [
        "User_ID", "Username", "Password_Hash", "Full_Name", "Email",
        "Role", "Status", "Created_Date", "Updated_Date", "Last_Login"
    ],
    "AUDIT_LOGS": [
        "Log_ID", "Date_Time", "User", "Action", "Module",
        "Transaction_ID", "Item_No", "Details", "IP_Address", "Status"
    ],
    "SETTINGS": [
        "Setting_Key", "Setting_Value", "Category", "Description",
        "Updated_By", "Updated_At"
    ],
    "BARTAN_INWARD": [
        "Record_ID", "Inward_Date", "Coming_Center", "Item_Name",
        "Item_Qty", "Missing_Items_Qty", "Item_Requirement",
        "Remarks", "Created_By", "Created_At"
    ],
}

# Strictly 2 default departments as specified in Section 10
DEFAULT_DEPARTMENTS = [
    ["1", "Canteen", "CAN", "Canteen Department", "Active", "2026-10-01T08:00:00Z", "2026-10-01T08:00:00Z"],
    ["2", "Langar", "LNG", "Langar Department", "Active", "2026-10-01T08:00:00Z", "2026-10-01T08:00:00Z"],
]

# Initial admin account (bcrypt hash of "admin123")
DEFAULT_USERS = [
    ["USR-0001", "admin", "$2b$12$N2eIjtjbEryVHitn5gnu8e08yYBa0ZVZnXp/h7dll8pH0VlC0i3b6", "System Administrator", "admin@kitchen.local", "ADMIN", "Active", "2026-10-01T08:00:00Z", "2026-10-01T08:00:00Z", ""],
]

DEFAULT_SETTINGS = [
    ["DEFAULT_UNIT", "KG", "Stock Settings", "Default unit for new items", "Admin", "2026-10-01T08:00:00Z"],
    ["DEFAULT_MIN_STOCK", "20", "Alert Settings", "Default minimum stock threshold", "Admin", "2026-10-01T08:00:00Z"],
    ["DEFAULT_CRITICAL_STOCK", "5", "Alert Settings", "Default critical stock threshold", "Admin", "2026-10-01T08:00:00Z"],
    ["ALLOW_NEGATIVE_STOCK", "FALSE", "Stock Settings", "Whether stock can fall below zero", "Admin", "2026-10-01T08:00:00Z"],
    ["OUTWARD_APPROVAL_REQUIRED", "FALSE", "Stock Settings", "Require supervisor approval for outward", "Admin", "2026-10-01T08:00:00Z"],
    ["APP_NAME", "RSSB Langar JSR", "General Settings", "Display application name", "Admin", "2026-10-01T08:00:00Z"],
]


def initialize_local_excel_if_needed():
    """Create Kitchen_Stock_Database.xlsx with all 7 tables and proper headers."""
    if DB_PATH.exists():
        return

    logger.info("Initializing clean Excel Database at %s", DB_PATH)
    wb = openpyxl.Workbook()
    default_sheet = wb.active

    for table_name, columns in TABLE_SCHEMAS.items():
        ws = wb.create_sheet(title=table_name)
        # Write header
        ws.append(columns)

        # Write initial seed configurations (only departments, admin user, settings)
        if table_name == "DEPARTMENTS":
            for row in DEFAULT_DEPARTMENTS:
                ws.append(row)
        elif table_name == "USERS":
            for row in DEFAULT_USERS:
                ws.append(row)
        elif table_name == "SETTINGS":
            for row in DEFAULT_SETTINGS:
                ws.append(row)

        max_row = max(ws.max_row, 2)
        max_col = len(columns)
        ref = f"A1:{get_column_letter(max_col)}{max_row}"
        tab = Table(displayName=table_name, ref=ref)
        style = TableStyleInfo(
            name="TableStyleLight1",
            showFirstColumn=False,
            showLastColumn=False,
            showRowStripes=True,
            showColumnStripes=False,
        )
        tab.tableStyleInfo = style
        ws.add_table(tab)

    if default_sheet in wb.worksheets:
        wb.remove(default_sheet)

    wb.save(DB_PATH)
    logger.info("Successfully created clean Kitchen_Stock_Database.xlsx")


def read_table(table_name: str) -> list[dict[str, Any]]:
    initialize_local_excel_if_needed()
    wb = openpyxl.load_workbook(DB_PATH, data_only=True)
    if table_name not in wb.sheetnames:
        return []
    ws = wb[table_name]
    rows = list(ws.iter_rows(values_only=True))
    if not rows or len(rows) < 1:
        return []
    headers = [str(h) for h in rows[0]]
    data = []
    for r in rows[1:]:
        if not any(r):
            continue
        record = {}
        for i, col in enumerate(headers):
            val = r[i] if i < len(r) and r[i] is not None else ""
            record[col] = _desanitize_cell_val(val)
        data.append(record)
    return data


def write_row(table_name: str, values: list[Any]) -> None:
    initialize_local_excel_if_needed()
    wb = openpyxl.load_workbook(DB_PATH)
    if table_name not in wb.sheetnames:
        ws = wb.create_sheet(title=table_name)
        ws.append(TABLE_SCHEMAS.get(table_name, []))
    else:
        ws = wb[table_name]
    sanitized_values = [_sanitize_cell_val(v) for v in values]
    ws.append(sanitized_values)
    wb.save(DB_PATH)


def update_row(table_name: str, row_index: int, values: list[Any]) -> None:
    initialize_local_excel_if_needed()
    wb = openpyxl.load_workbook(DB_PATH)
    if table_name not in wb.sheetnames:
        return
    ws = wb[table_name]
    excel_row = row_index + 2  # 1-based, plus 1 header
    for col_idx, val in enumerate(values, start=1):
        ws.cell(row=excel_row, column=col_idx, value=_sanitize_cell_val(val))
    wb.save(DB_PATH)
