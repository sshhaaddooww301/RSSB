"""
Backup Routes — Download and manage full system database backups.
"""

from __future__ import annotations
import os
import io
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import Response, FileResponse

from auth import get_current_user, require_roles
from models import ApiResponse
from services import backup_service
from services import excel_service

router = APIRouter(prefix="/api/backup", tags=["Database Backup"])


@router.get("/download-excel")
async def download_full_excel_backup(user: dict = Depends(require_roles("ADMIN", "MANAGER"))):
    """Generate and immediately download a multi-sheet .xlsx backup file."""
    try:
        data = await backup_service.fetch_all_database_data()
        excel_bytes = backup_service.generate_excel_backup_bytes(data)

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        filename = f"RSSB_Full_Database_Backup_{today_str}.xlsx"

        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel backup: {str(e)}")


@router.get("/download-json")
async def download_full_json_backup(user: dict = Depends(require_roles("ADMIN", "MANAGER"))):
    """Generate and download a full JSON dump of all database tables."""
    try:
        data = await backup_service.fetch_all_database_data()
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        filename = f"RSSB_Full_Database_Backup_{today_str}.json"

        # Sanitize sensitive fields
        sanitized_data = {
            "metadata": {
                "generated_by": user.get("Username", "System"),
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "total_tables": len(data),
                "record_counts": {k: len(v) for k, v in data.items()},
            },
            "tables": {
                k: [
                    {col: ("******" if col.lower() in ("password", "hashed_password") else val) for col, val in row.items()}
                    for row in v
                ]
                for k, v in data.items()
            }
        }

        json_bytes = json.dumps(sanitized_data, indent=2, ensure_ascii=False).encode("utf-8")
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate JSON backup: {str(e)}")


@router.post("/trigger-now")
async def trigger_manual_backup(
    request: Request,
    user: dict = Depends(require_roles("ADMIN")),
):
    """Manually trigger and save a snapshot to the server backup archive."""
    try:
        filename = await backup_service.save_daily_backup_snapshot()
        await excel_service.create_audit_log({
            "User": user.get("Username", ""),
            "Action": "Manual Backup",
            "Module": "Database Backup",
            "Details": f"Manual system snapshot created: {filename}",
            "IP_Address": request.client.host if request.client else "",
        })
        return ApiResponse(
            message=f"Backup successfully created and saved to server archive: {filename}",
            data={"filename": filename},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manual backup creation failed: {str(e)}")


@router.get("/list")
async def list_server_backups(user: dict = Depends(require_roles("ADMIN", "MANAGER"))):
    """List available automated daily backups on the server."""
    try:
        backups = backup_service.list_available_backups()
        return ApiResponse(data=backups)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list server backups: {str(e)}")


@router.get("/download-file/{filename}")
async def download_historic_backup_file(
    filename: str,
    user: dict = Depends(require_roles("ADMIN", "MANAGER")),
):
    """Download a specific historical backup file by name."""
    # Prevent path traversal
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(backup_service.BACKUPS_DIR, safe_filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Requested backup file does not exist.")

    media_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if safe_filename.endswith(".xlsx")
        else "application/json"
    )
    return FileResponse(filepath, media_type=media_type, filename=safe_filename)
