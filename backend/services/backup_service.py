"""
Backup Service — Automated everyday backups and full-database export for RSSB Langar JSR.

Features:
- Multi-sheet Excel workbook export (.xlsx) with styled headers for all tables:
  ITEMS, STOCK_INWARD, STOCK_OUTWARD, BARTAN_INWARD, DEPARTMENTS, USERS, AUDIT_LOGS, SETTINGS.
- Complete JSON dump export (.json).
- Automated daily backup execution (scheduled daily at midnight / hourly health check).
- Retention policy: Keeps last 45 daily backup snapshots.
"""

from __future__ import annotations
import os
import io
import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from config import settings
from services.graph_client import graph_client

logger = logging.getLogger("backup_service")

BACKUPS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)


async def fetch_all_database_data() -> dict[str, list[dict]]:
    """Fetch all tables from the active data source (Excel/Supabase/Postgres)."""
    tables = {
        "ITEMS": settings.TABLE_ITEMS,
        "STOCK_INWARD": settings.TABLE_STOCK_INWARD,
        "STOCK_OUTWARD": settings.TABLE_STOCK_OUTWARD,
        "BARTAN_INWARD": getattr(settings, "TABLE_BARTAN_INWARD", "BARTAN_INWARD"),
        "DEPARTMENTS": settings.TABLE_DEPARTMENTS,
        "USERS": settings.TABLE_USERS,
        "AUDIT_LOGS": settings.TABLE_AUDIT_LOGS,
        "SETTINGS": settings.TABLE_SETTINGS,
    }

    results: dict[str, list[dict]] = {}
    for key, table_name in tables.items():
        try:
            data = await graph_client.get_table_data(table_name)
            results[key] = data if isinstance(data, list) else []
        except Exception as e:
            logger.warning("Could not fetch table %s for backup: %s", table_name, e)
            results[key] = []

    return results


def generate_excel_backup_bytes(data_dict: dict[str, list[dict]]) -> bytes:
    """Generate a formatted multi-sheet Excel (.xlsx) file as bytes."""
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill_red = PatternFill(start_color="991B1B", end_color="991B1B", fill_type="solid")  # Red 800
    header_fill_dark = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid") # Slate 800
    title_font = Font(name="Calibri", size=14, bold=True, color="991B1B")
    bold_font = Font(name="Calibri", size=10, bold=True)
    regular_font = Font(name="Calibri", size=10)
    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    # 1. SUMMARY SHEET
    ws_summary = wb.create_sheet(title="Backup Summary")
    ws_summary.views.sheetView[0].showGridLines = True
    ws_summary["A1"] = "RSSB LANGAR JAMSHEDPUR — DATABASE BACKUP ARCHIVE"
    ws_summary["A1"].font = title_font

    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + timedelta(hours=5, minutes=30)
    
    ws_summary["A3"] = "Backup Generated (IST):"
    ws_summary["B3"] = now_ist.strftime("%Y-%m-%d %I:%M:%S %p")
    ws_summary["A4"] = "Backup Generated (UTC):"
    ws_summary["B4"] = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    ws_summary["A5"] = "Environment:"
    ws_summary["B5"] = settings.APP_ENV.upper()

    ws_summary["A7"] = "Table / Module"
    ws_summary["B7"] = "Total Records Count"
    ws_summary["A7"].font = header_font
    ws_summary["A7"].fill = header_fill_dark
    ws_summary["B7"].font = header_font
    ws_summary["B7"].fill = header_fill_dark

    row_num = 8
    for tbl_name, rows in data_dict.items():
        ws_summary[f"A{row_num}"] = tbl_name
        ws_summary[f"B{row_num}"] = len(rows)
        ws_summary[f"A{row_num}"].font = regular_font
        ws_summary[f"B{row_num}"].font = bold_font
        ws_summary[f"B{row_num}"].alignment = Alignment(horizontal="right")
        row_num += 1

    ws_summary.column_dimensions["A"].width = 30
    ws_summary.column_dimensions["B"].width = 25

    # 2. INDIVIDUAL TABLE SHEETS
    sheet_names = {
        "ITEMS": "Stock Items",
        "STOCK_INWARD": "Stock Inward",
        "STOCK_OUTWARD": "Stock Outward",
        "BARTAN_INWARD": "Bartan Inward",
        "DEPARTMENTS": "Departments",
        "USERS": "Users",
        "AUDIT_LOGS": "Audit Logs",
        "SETTINGS": "Settings",
    }

    for key, raw_rows in data_dict.items():
        title = sheet_names.get(key, key)
        ws = wb.create_sheet(title=title)
        ws.views.sheetView[0].showGridLines = True

        if not raw_rows:
            ws["A1"] = f"No records found for {key}"
            continue

        # Extract headers from first item or union of all keys
        headers: list[str] = []
        for r in raw_rows:
            for k in r.keys():
                if k not in headers and not k.startswith("_"):
                    headers.append(k)

        # Write header row
        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill_red if "STOCK" in key or key == "ITEMS" else header_fill_dark
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

        # Write data rows
        for r_idx, row_data in enumerate(raw_rows, 2):
            for c_idx, h in enumerate(headers, 1):
                val = row_data.get(h, "")
                if key == "USERS" and h.lower() in ("password", "hashed_password", "salt"):
                    val = "******"  # mask sensitive password hashes in backup
                cell = ws.cell(row=r_idx, column=c_idx, value=str(val) if val is not None else "")
                cell.font = regular_font
                cell.border = thin_border
                if isinstance(val, (int, float)):
                    cell.alignment = Alignment(horizontal="right")

        # Auto-adjust column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def save_daily_backup_snapshot() -> str:
    """Take a full snapshot and save it to the server's backup directory with rotation."""
    data = await fetch_all_database_data()
    excel_bytes = generate_excel_backup_bytes(data)

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"RSSB_Daily_Backup_{today_str}_{timestamp_str}.xlsx"
    filepath = os.path.join(BACKUPS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(excel_bytes)

    logger.info("✅ Daily backup saved successfully: %s (%d bytes)", filepath, len(excel_bytes))

    # Also save JSON snapshot
    json_filename = f"RSSB_Daily_Backup_{today_str}_{timestamp_str}.json"
    json_filepath = os.path.join(BACKUPS_DIR, json_filename)
    # Sanitize users for JSON
    sanitized_data = {
        "metadata": {
            "backup_date_utc": datetime.now(timezone.utc).isoformat(),
            "total_tables": len(data),
            "records_count": {k: len(v) for k, v in data.items()},
        },
        "data": {
            k: [
                {col: ("******" if col.lower() in ("password", "hashed_password") else val) for col, val in row.items()}
                for row in v
            ]
            for k, v in data.items()
        }
    }
    with open(json_filepath, "w", encoding="utf-8") as jf:
        json.dump(sanitized_data, jf, indent=2, ensure_ascii=False)

    # Cleanup old backups (keep latest 45 days)
    await cleanup_old_backups(max_days=45)
    return filename


async def cleanup_old_backups(max_days: int = 45):
    """Remove backup files older than max_days."""
    try:
        now = datetime.now()
        for fname in os.listdir(BACKUPS_DIR):
            fpath = os.path.join(BACKUPS_DIR, fname)
            if os.path.isfile(fpath) and (fname.startswith("RSSB_Daily_Backup_") or fname.startswith("backup_")):
                file_mtime = datetime.fromtimestamp(os.path.getmtime(fpath))
                if (now - file_mtime).days > max_days:
                    os.remove(fpath)
                    logger.info("Cleaned up old backup file: %s", fname)
    except Exception as e:
        logger.warning("Error during backup cleanup: %s", e)


def list_available_backups() -> list[dict]:
    """List all stored backup files on server sorted newest first."""
    backups: list[dict] = []
    if not os.path.exists(BACKUPS_DIR):
        return backups

    for fname in os.listdir(BACKUPS_DIR):
        fpath = os.path.join(BACKUPS_DIR, fname)
        if os.path.isfile(fpath) and (fname.endswith(".xlsx") or fname.endswith(".json")):
            stat = os.stat(fpath)
            backups.append({
                "filename": fname,
                "file_type": "Excel Workbook" if fname.endswith(".xlsx") else "JSON Export",
                "size_bytes": stat.st_size,
                "size_display": f"{stat.st_size / 1024:.1f} KB",
                "created_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            })

    backups.sort(key=lambda x: x["created_at"], reverse=True)
    return backups


async def daily_backup_background_task():
    """Continuous background worker running once per hour checking if daily backup is needed."""
    logger.info("🛡️ Automated Daily Backup Worker initialized.")
    while True:
        try:
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            existing = [f for f in os.listdir(BACKUPS_DIR) if today_str in f and f.endswith(".xlsx")]
            if not existing:
                logger.info("Executing scheduled daily database backup for %s...", today_str)
                await save_daily_backup_snapshot()
        except Exception as e:
            logger.error("Automated backup background error: %s", e)
        # Sleep for 1 hour before next verification
        await asyncio.sleep(3600)
