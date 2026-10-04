"""
Microsoft Graph API client for Excel Online operations.

This is the core data layer — ALL reads and writes go through this module.
Uses MSAL for authentication and httpx for HTTP requests.
Includes high-performance in-memory cache with instant write invalidation for zero lag.
"""

from __future__ import annotations
import time
import logging
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
import msal

from config import settings

logger = logging.getLogger("graph_client")


class GraphClientError(Exception):
    """Raised when a Graph API call fails."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class GraphClient:
    """
    Manages authentication with Azure AD via MSAL and provides
    helper methods for reading/writing Excel tables through Graph API.
    Includes smart TTL in-memory caching to eliminate lag and network overhead.
    """

    CACHE_TTL_SECONDS: float = 6.0

    def __init__(self):
        self._app: Optional[msal.ConfidentialClientApplication] = None
        self._token_cache: dict[str, Any] = {}
        self._last_sync: Optional[str] = None
        # In-memory table data cache: table_name -> (timestamp, data)
        self._table_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}

    def clear_cache(self, table_name: Optional[str] = None):
        """Clear cache for a specific table or all tables."""
        if table_name:
            self._table_cache.pop(table_name, None)
        else:
            self._table_cache.clear()

    # ── Auth ───────────────────────────────────────────────────────────

    def _get_msal_app(self) -> msal.ConfidentialClientApplication:
        if self._app is None:
            self._app = msal.ConfidentialClientApplication(
                client_id=settings.MICROSOFT_CLIENT_ID,
                client_credential=settings.MICROSOFT_CLIENT_SECRET,
                authority=f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}",
            )
        return self._app

    async def _get_access_token(self) -> str:
        app = self._get_msal_app()
        result = app.acquire_token_for_client(scopes=[settings.GRAPH_SCOPE])
        if "access_token" in result:
            self._token_cache = result
            return result["access_token"]
        error_desc = result.get("error_description", "Unknown auth error")
        raise GraphClientError(f"Failed to acquire token: {error_desc}", 401)

    async def _headers(self) -> dict[str, str]:
        token = await self._get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    # ── URL builders ───────────────────────────────────────────────────

    def _workbook_url(self) -> str:
        base = settings.GRAPH_BASE_URL
        drive = settings.EXCEL_DRIVE_ID
        file_id = settings.EXCEL_FILE_ID
        if drive:
            return f"{base}/drives/{drive}/items/{file_id}/workbook"
        return f"{base}/me/drive/items/{file_id}/workbook"

    def _table_url(self, table_name: str) -> str:
        return f"{self._workbook_url()}/tables/{table_name}"

    def _table_rows_url(self, table_name: str) -> str:
        return f"{self._table_url(table_name)}/rows"

    # ── Low-level HTTP ─────────────────────────────────────────────────

    async def _request(
        self,
        method: str,
        url: str,
        json_body: Any = None,
        params: dict | None = None,
        timeout: float = 30.0,
    ) -> dict:
        headers = await self._headers()
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=json_body,
                params=params,
            )
        if resp.status_code >= 400:
            detail = resp.text[:500]
            logger.error("Graph API %s %s → %s: %s", method, url, resp.status_code, detail)
            raise GraphClientError(
                f"Graph API error ({resp.status_code}): {detail}",
                resp.status_code,
            )
        if resp.status_code == 204:
            return {}
        return resp.json()

    async def _get(self, url: str, params: dict | None = None) -> dict:
        return await self._request("GET", url, params=params)

    async def _post(self, url: str, body: Any) -> dict:
        return await self._request("POST", url, json_body=body)

    async def _patch(self, url: str, body: Any) -> dict:
        return await self._request("PATCH", url, json_body=body)

    async def _delete(self, url: str) -> dict:
        return await self._request("DELETE", url)

    async def upload_file_to_drive(self, folder_path: str, filename: str, content_bytes: bytes) -> Optional[dict]:
        """Upload a file (e.g. backup .xlsx) to OneDrive/SharePoint via Graph API."""
        if not self._is_configured():
            return None
        try:
            token = await self._get_access_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }
            clean_folder = folder_path.strip("/")
            drive_id = settings.EXCEL_DRIVE_ID
            if drive_id:
                url = f"{settings.GRAPH_BASE_URL}/drives/{drive_id}/root:/{clean_folder}/{filename}:/content"
            else:
                url = f"{settings.GRAPH_BASE_URL}/me/drive/root:/{clean_folder}/{filename}:/content"

            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.put(url, headers=headers, content=content_bytes)
            if resp.status_code in (200, 201):
                logger.info("✅ Successfully uploaded backup to OneDrive: /%s/%s", clean_folder, filename)
                return resp.json()
            else:
                logger.warning("OneDrive backup upload returned %s: %s", resp.status_code, resp.text[:300])
                return None
        except Exception as e:
            logger.warning("Failed to upload backup to OneDrive: %s", e)
            return None

    def _is_configured(self) -> bool:
        return bool(
            settings.MICROSOFT_CLIENT_ID
            and settings.MICROSOFT_CLIENT_SECRET
            and settings.MICROSOFT_TENANT_ID
            and settings.EXCEL_FILE_ID
            and settings.MICROSOFT_CLIENT_ID != "your-client-id-here"
        )

    def _is_postgres(self) -> bool:
        from services.postgres_client import postgres_client
        return postgres_client.is_configured()

    # ── Table operations ───────────────────────────────────────────────

    async def check_connection(self) -> dict:
        """Verify storage connection is reachable."""
        if self._is_postgres():
            from services.postgres_client import postgres_client
            res = postgres_client.check_connection()
            self._last_sync = res.get("last_synced", "")
            return res

        if not self._is_configured():
            # Local Excel mode
            from services.excel_local import initialize_local_excel_if_needed, DB_PATH
            initialize_local_excel_if_needed()
            self._last_sync = datetime.now(timezone.utc).isoformat()
            return {"connected": True, "mode": "Excel (Direct/Local Database File)", "file": str(DB_PATH), "last_synced": self._last_sync}

        try:
            url = self._workbook_url()
            await self._get(url)
            self._last_sync = datetime.now(timezone.utc).isoformat()
            return {"connected": True, "mode": "Microsoft Graph API (OneDrive/SharePoint)", "last_synced": self._last_sync}
        except Exception as exc:
            logger.error("Excel connection check failed: %s", exc)
            return {"connected": False, "error": str(exc), "last_synced": self._last_sync}

    @property
    def last_synced(self) -> Optional[str]:
        return self._last_sync

    def mark_synced(self):
        self._last_sync = datetime.now(timezone.utc).isoformat()

    async def get_table_rows(self, table_name: str) -> list[list[Any]]:
        """Return all rows from a table as a list of value-lists."""
        if self._is_postgres():
            from services.postgres_client import postgres_client
            from services.excel_local import TABLE_SCHEMAS
            data = postgres_client.read_table(table_name)
            cols = TABLE_SCHEMAS.get(table_name, [])
            rows = []
            for item in data:
                rows.append([item.get(c, "") for c in cols])
            self.mark_synced()
            return rows

        if not self._is_configured():
            from services.excel_local import read_table, TABLE_SCHEMAS
            data = read_table(table_name)
            cols = TABLE_SCHEMAS.get(table_name, [])
            rows = []
            for item in data:
                rows.append([item.get(c, "") for c in cols])
            self.mark_synced()
            return rows

        url = self._table_rows_url(table_name)
        data = await self._get(url)
        rows = []
        for item in data.get("value", []):
            rows.append(item.get("values", [[]])[0])
        self.mark_synced()
        return rows

    async def get_table_columns(self, table_name: str) -> list[str]:
        """Return column headers for a table."""
        if self._is_postgres() or not self._is_configured():
            from services.excel_local import TABLE_SCHEMAS
            return TABLE_SCHEMAS.get(table_name, [])

        url = f"{self._table_url(table_name)}/columns"
        data = await self._get(url)
        return [col.get("name", "") for col in data.get("value", [])]

    async def get_table_data(self, table_name: str) -> list[dict[str, Any]]:
        """Return rows as list of dicts keyed by column name with ultra-fast caching."""
        now = time.time()
        if table_name in self._table_cache:
            ts, cached_data = self._table_cache[table_name]
            if now - ts < self.CACHE_TTL_SECONDS:
                return [dict(r) for r in cached_data]

        if self._is_postgres():
            from services.postgres_client import postgres_client
            data = postgres_client.read_table(table_name)
            self._table_cache[table_name] = (now, data)
            self.mark_synced()
            return [dict(r) for r in data]

        if not self._is_configured():
            from services.excel_local import read_table
            data = read_table(table_name)
            self._table_cache[table_name] = (now, data)
            self.mark_synced()
            return [dict(r) for r in data]

        columns = await self.get_table_columns(table_name)
        rows = await self.get_table_rows(table_name)
        result = []
        for row_values in rows:
            record: dict[str, Any] = {}
            for i, col in enumerate(columns):
                record[col] = row_values[i] if i < len(row_values) else ""
            result.append(record)

        self._table_cache[table_name] = (now, result)
        return result

    async def add_table_row(self, table_name: str, values: list[Any]) -> dict:
        """Append a single row to a table and invalidate cache."""
        self.clear_cache(table_name)
        if self._is_postgres():
            from services.postgres_client import postgres_client
            postgres_client.write_row(table_name, values)
            self.mark_synced()
            return {"success": True}

        if not self._is_configured():
            from services.excel_local import write_row
            write_row(table_name, values)
            self.mark_synced()
            return {"success": True}

        url = f"{self._table_rows_url(table_name)}/add"
        body = {"values": [values]}
        result = await self._post(url, body)
        self.mark_synced()
        return result

    async def add_table_rows(self, table_name: str, rows: list[list[Any]]) -> dict:
        """Append multiple rows to a table and invalidate cache."""
        self.clear_cache(table_name)
        if self._is_postgres():
            from services.postgres_client import postgres_client
            for r in rows:
                postgres_client.write_row(table_name, r)
            self.mark_synced()
            return {"success": True}

        if not self._is_configured():
            from services.excel_local import write_row
            for r in rows:
                write_row(table_name, r)
            self.mark_synced()
            return {"success": True}

        url = f"{self._table_rows_url(table_name)}/add"
        body = {"values": rows}
        result = await self._post(url, body)
        self.mark_synced()
        return result

    async def update_table_row(
        self, table_name: str, row_index: int, values: list[Any]
    ) -> dict:
        """Update a specific row by index and invalidate cache."""
        self.clear_cache(table_name)
        if self._is_postgres():
            from services.postgres_client import postgres_client
            from services.excel_local import TABLE_SCHEMAS
            cols = TABLE_SCHEMAS.get(table_name, [])
            primary_col = cols[0] if cols else "id"
            current_data = postgres_client.read_table(table_name)
            if row_index < len(current_data):
                key_val = current_data[row_index].get(primary_col)
                postgres_client.update_row_by_key(table_name, primary_col, key_val, values)
            self.mark_synced()
            return {"success": True}

        if not self._is_configured():
            from services.excel_local import update_row
            update_row(table_name, row_index, values)
            self.mark_synced()
            return {"success": True}

        url = f"{self._table_rows_url(table_name)}/itemAt(index={row_index})"
        body = {"values": [values]}
        result = await self._patch(url, body)
        self.mark_synced()
        return result

    async def delete_table_row(
        self, table_name: str, row_index: int, key_col: Optional[str] = None, key_val: Optional[Any] = None
    ) -> dict:
        """Delete a specific row by index/key and invalidate cache."""
        self.clear_cache(table_name)
        if self._is_postgres():
            from services.postgres_client import postgres_client
            from services.excel_local import TABLE_SCHEMAS
            if not key_col:
                cols = TABLE_SCHEMAS.get(table_name, [])
                key_col = cols[0] if cols else "id"
                current_data = postgres_client.read_table(table_name)
                if row_index < len(current_data):
                    key_val = current_data[row_index].get(key_col)
            if key_col and key_val is not None:
                postgres_client.delete_row_by_key(table_name, key_col, key_val)
            self.mark_synced()
            return {"success": True}

        if not self._is_configured():
            from services.excel_local import delete_row
            delete_row(table_name, row_index)
            self.mark_synced()
            return {"success": True}

        url = f"{self._table_rows_url(table_name)}/itemAt(index={row_index})"
        result = await self._delete(url)
        self.mark_synced()
        return result if result else {"success": True}

    async def get_row_count(self, table_name: str) -> int:
        """Return the count of data rows in a table."""
        if self._is_postgres():
            from services.postgres_client import postgres_client
            return len(postgres_client.read_table(table_name))

        if not self._is_configured():
            from services.excel_local import read_table
            return len(read_table(table_name))

        url = f"{self._table_url(table_name)}/range"
        data = await self._get(url)
        row_count = data.get("rowCount", 1) - 1  # subtract header
        return max(row_count, 0)

    # ── Filtered queries (client-side, Graph doesn't support OData on table rows) ──

    async def find_rows(
        self,
        table_name: str,
        column_name: str,
        value: Any,
    ) -> list[dict[str, Any]]:
        """Return rows where column_name == value."""
        all_rows = await self.get_table_data(table_name)
        return [r for r in all_rows if str(r.get(column_name, "")) == str(value)]

    async def find_row_index(
        self,
        table_name: str,
        column_name: str,
        value: Any,
    ) -> Optional[int]:
        """Return the 0-based row index where column_name == value, or None."""
        columns = await self.get_table_columns(table_name)
        if column_name not in columns:
            return None
        col_idx = columns.index(column_name)
        rows = await self.get_table_rows(table_name)
        for i, row_values in enumerate(rows):
            if col_idx < len(row_values) and str(row_values[col_idx]) == str(value):
                return i
        return None

    # ── Session management for batch ops ───────────────────────────────

    async def create_session(self, persist: bool = False) -> str:
        """Create a workbook session for batch operations."""
        if not self._is_configured():
            return "local-session"
        url = f"{self._workbook_url()}/createSession"
        body = {"persistChanges": persist}
        result = await self._post(url, body)
        return result.get("id", "")

    async def close_session(self, session_id: str):
        """Close a workbook session."""
        if not self._is_configured():
            return
        url = f"{self._workbook_url()}/closeSession"
        headers = await self._headers()
        headers["workbook-session-id"] = session_id
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(url, headers=headers, json={})


# Singleton
graph_client = GraphClient()
