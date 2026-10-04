"""
PostgreSQL / Supabase Database Client for RSSB LANGAR JSR.

Provides high-performance, persistent cloud database storage on Supabase/PostgreSQL.
Auto-creates tables, seeds default data (admin, departments, settings),
and provides seamless CRUD operations compatible with graph_client/excel_service.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Any, Optional
import sqlalchemy as sa
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings
from services.excel_local import DEFAULT_DEPARTMENTS, DEFAULT_USERS, DEFAULT_SETTINGS, TABLE_SCHEMAS

logger = logging.getLogger("postgres_client")
Base = declarative_base()


def _get_clean_db_url(url: str) -> str:
    """Ensure standard postgresql+psycopg2:// URL prefix and IPv4 pooler for Supabase."""
    if not url:
        return ""
    clean = url.strip()
    if "db.srupwyzkuckchlipvhap.supabase.co" in clean:
        clean = clean.replace("db.srupwyzkuckchlipvhap.supabase.co:5432", "aws-0-ap-northeast-1.pooler.supabase.com:6543")
        clean = clean.replace("db.srupwyzkuckchlipvhap.supabase.co", "aws-0-ap-northeast-1.pooler.supabase.com:6543")
        if "postgres.srupwyzkuckchlipvhap" not in clean:
            clean = clean.replace("postgres:", "postgres.srupwyzkuckchlipvhap:")
    if clean.startswith("postgres://"):
        clean = "postgresql+psycopg2://" + clean[len("postgres://"):]
    elif clean.startswith("postgresql://") and not clean.startswith("postgresql+"):
        clean = "postgresql+psycopg2://" + clean[len("postgresql://"):]
    return clean


class PostgresClient:
    """
    Manages direct connection to Supabase / PostgreSQL.
    Creates schema automatically and handles table rows identically to Excel tables.
    """

    def __init__(self):
        self._engine: Optional[sa.engine.Engine] = None
        self._SessionLocal: Optional[sessionmaker] = None
        self._initialized: bool = False
        self._last_sync: Optional[str] = None

    def is_configured(self) -> bool:
        return bool(settings.DATABASE_URL and len(settings.DATABASE_URL.strip()) > 10)

    def _get_engine(self) -> sa.engine.Engine:
        if self._engine is None:
            db_url = _get_clean_db_url(settings.DATABASE_URL)
            self._engine = sa.create_engine(
                db_url,
                pool_pre_ping=True,
                pool_recycle=300,
                pool_size=5,
                max_overflow=10,
                connect_args={"connect_timeout": 5},
            )
            self._SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self._engine)
        return self._engine

    def initialize_schema_if_needed(self):
        """Create all tables in Supabase / PostgreSQL if they do not exist."""
        if not self.is_configured() or self._initialized:
            return

        engine = self._get_engine()
        with engine.connect() as conn:
            # 1. ITEMS
            conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS items (
                    "Item_ID" VARCHAR(64) PRIMARY KEY,
                    "Item_No" VARCHAR(64) UNIQUE,
                    "Item_Name" VARCHAR(255),
                    "SKU" VARCHAR(255),
                    "Unit" VARCHAR(32),
                    "Opening_Qty" NUMERIC DEFAULT 0,
                    "Langar_Qty" NUMERIC DEFAULT 0,
                    "Minimum_Stock" NUMERIC DEFAULT 0,
                    "Critical_Stock" NUMERIC DEFAULT 0,
                    "Current_Stock" NUMERIC DEFAULT 0,
                    "Status" VARCHAR(32) DEFAULT 'Active',
                    "Created_Date" VARCHAR(64),
                    "Updated_Date" VARCHAR(64)
                );
            """))

            # 2. STOCK_INWARD
            conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS stock_inward (
                    "Transaction_ID" VARCHAR(64) PRIMARY KEY,
                    "Inward_Date" VARCHAR(64),
                    "Item_No" VARCHAR(64),
                    "Item_Name" VARCHAR(255),
                    "SKU" VARCHAR(255),
                    "Unit" VARCHAR(32),
                    "Quantity" NUMERIC DEFAULT 0,
                    "Supplier" VARCHAR(255),
                    "Invoice_No" VARCHAR(128),
                    "Storage_Location" VARCHAR(128),
                    "Remarks" TEXT,
                    "Created_By" VARCHAR(128),
                    "Created_At" VARCHAR(64)
                );
            """))

            # 3. STOCK_OUTWARD
            conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS stock_outward (
                    "Transaction_ID" VARCHAR(64) PRIMARY KEY,
                    "Outward_Date" VARCHAR(64),
                    "Item_No" VARCHAR(64),
                    "Item_Name" VARCHAR(255),
                    "SKU" VARCHAR(255),
                    "Unit" VARCHAR(32),
                    "Quantity" NUMERIC DEFAULT 0,
                    "Department" VARCHAR(64),
                    "Issued_To" VARCHAR(128),
                    "Receiver_Name" VARCHAR(128),
                    "Purpose" VARCHAR(255),
                    "Remarks" TEXT,
                    "Created_By" VARCHAR(128),
                    "Created_At" VARCHAR(64)
                );
            """))

            # 4. BARTAN_INWARD
            conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS bartan_inward (
                    "Record_ID" VARCHAR(64) PRIMARY KEY,
                    "Inward_Date" VARCHAR(64),
                    "Coming_Center" VARCHAR(128),
                    "Item_Name" VARCHAR(255),
                    "Item_Qty" NUMERIC DEFAULT 0,
                    "Missing_Items_Qty" NUMERIC DEFAULT 0,
                    "Item_Requirement" TEXT,
                    "Remarks" TEXT,
                    "Created_By" VARCHAR(128),
                    "Created_At" VARCHAR(64)
                );
            """))

            # 5. DEPARTMENTS
            conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS departments (
                    "Department_ID" VARCHAR(64) PRIMARY KEY,
                    "Department_Name" VARCHAR(128) UNIQUE,
                    "Short_Code" VARCHAR(32),
                    "Description" TEXT,
                    "Status" VARCHAR(32) DEFAULT 'Active',
                    "Created_Date" VARCHAR(64),
                    "Updated_Date" VARCHAR(64)
                );
            """))

            # 6. USERS
            conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS users (
                    "User_ID" VARCHAR(64) PRIMARY KEY,
                    "Username" VARCHAR(64) UNIQUE,
                    "Password_Hash" VARCHAR(255),
                    "Full_Name" VARCHAR(128),
                    "Email" VARCHAR(128),
                    "Role" VARCHAR(32) DEFAULT 'STAFF',
                    "Status" VARCHAR(32) DEFAULT 'Active',
                    "Created_Date" VARCHAR(64),
                    "Updated_Date" VARCHAR(64),
                    "Last_Login" VARCHAR(64)
                );
            """))

            # 7. AUDIT_LOGS
            conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    "Log_ID" VARCHAR(64) PRIMARY KEY,
                    "Date_Time" VARCHAR(64),
                    "User" VARCHAR(128),
                    "Action" VARCHAR(128),
                    "Module" VARCHAR(128),
                    "Transaction_ID" VARCHAR(64),
                    "Item_No" VARCHAR(64),
                    "Details" TEXT,
                    "IP_Address" VARCHAR(64),
                    "Status" VARCHAR(32) DEFAULT 'Success'
                );
            """))

            # 8. SETTINGS
            conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS settings (
                    "Setting_Key" VARCHAR(64) PRIMARY KEY,
                    "Setting_Value" TEXT,
                    "Category" VARCHAR(64),
                    "Description" TEXT,
                    "Updated_By" VARCHAR(128),
                    "Updated_At" VARCHAR(64)
                );
            """))

            # Seed default data if tables are empty
            # Departments
            r_dept = conn.execute(sa.text("SELECT COUNT(*) FROM departments;")).scalar()
            if r_dept == 0:
                for d in DEFAULT_DEPARTMENTS:
                    conn.execute(sa.text("""
                        INSERT INTO departments ("Department_ID", "Department_Name", "Short_Code", "Description", "Status", "Created_Date", "Updated_Date")
                        VALUES (:d0, :d1, :d2, :d3, :d4, :d5, :d6);
                    """), {"d0": d[0], "d1": d[1], "d2": d[2], "d3": d[3], "d4": d[4], "d5": d[5], "d6": d[6]})

            # Admin User
            r_user = conn.execute(sa.text("SELECT COUNT(*) FROM users;")).scalar()
            if r_user == 0:
                for u in DEFAULT_USERS:
                    conn.execute(sa.text("""
                        INSERT INTO users ("User_ID", "Username", "Password_Hash", "Full_Name", "Email", "Role", "Status", "Created_Date", "Updated_Date", "Last_Login")
                        VALUES (:u0, :u1, :u2, :u3, :u4, :u5, :u6, :u7, :u8, :u9);
                    """), {"u0": u[0], "u1": u[1], "u2": u[2], "u3": u[3], "u4": u[4], "u5": u[5], "u6": u[6], "u7": u[7], "u8": u[8], "u9": u[9]})

            # Settings
            r_set = conn.execute(sa.text("SELECT COUNT(*) FROM settings;")).scalar()
            if r_set == 0:
                for s in DEFAULT_SETTINGS:
                    conn.execute(sa.text("""
                        INSERT INTO settings ("Setting_Key", "Setting_Value", "Category", "Description", "Updated_By", "Updated_At")
                        VALUES (:s0, :s1, :s2, :s3, :s4, :s5);
                    """), {"s0": s[0], "s1": s[1], "s2": s[2], "s3": s[3], "s4": s[4], "s5": s[5]})

            conn.commit()

        self._initialized = True
        logger.info("Supabase / PostgreSQL schema initialized and verified successfully.")

    def check_connection(self) -> dict:
        try:
            self.initialize_schema_if_needed()
            engine = self._get_engine()
            with engine.connect() as conn:
                conn.execute(sa.text("SELECT 1;"))
            self._last_sync = datetime.now(timezone.utc).isoformat()
            return {
                "connected": True,
                "mode": "Supabase / PostgreSQL Cloud Database",
                "last_synced": self._last_sync,
            }
        except Exception as exc:
            logger.error("Supabase connection check failed: %s", exc)
            return {"connected": False, "error": str(exc), "last_synced": self._last_sync}

    def _table_db_name(self, table_name: str) -> str:
        return table_name.lower()

    def read_table(self, table_name: str) -> list[dict[str, Any]]:
        self.initialize_schema_if_needed()
        tbl = self._table_db_name(table_name)
        cols = TABLE_SCHEMAS.get(table_name, [])
        quoted_cols = ", ".join([f'"{c}"' for c in cols])
        engine = self._get_engine()
        with engine.connect() as conn:
            stmt = sa.text(f"SELECT {quoted_cols} FROM {tbl};")
            result = conn.execute(stmt)
            data = []
            for row in result.fetchall():
                row_dict = {}
                for idx, c in enumerate(cols):
                    val = row[idx]
                    if val is None:
                        val = ""
                    elif isinstance(val, (int, float)):
                        val = val
                    else:
                        val = str(val)
                    row_dict[c] = val
                data.append(row_dict)
            self._last_sync = datetime.now(timezone.utc).isoformat()
            return data

    def write_row(self, table_name: str, values: list[Any]) -> None:
        self.initialize_schema_if_needed()
        tbl = self._table_db_name(table_name)
        cols = TABLE_SCHEMAS.get(table_name, [])
        quoted_cols = ", ".join([f'"{c}"' for c in cols[:len(values)]])
        param_placeholders = ", ".join([f":v{i}" for i in range(len(values))])
        params = {f"v{i}": values[i] for i in range(len(values))}

        engine = self._get_engine()
        with engine.connect() as conn:
            stmt = sa.text(f"INSERT INTO {tbl} ({quoted_cols}) VALUES ({param_placeholders});")
            conn.execute(stmt, params)
            conn.commit()
        self._last_sync = datetime.now(timezone.utc).isoformat()

    def update_row_by_key(self, table_name: str, key_col: str, key_val: Any, values: list[Any]) -> None:
        self.initialize_schema_if_needed()
        tbl = self._table_db_name(table_name)
        cols = TABLE_SCHEMAS.get(table_name, [])
        set_clauses = [f'"{cols[i]}" = :v{i}' for i in range(len(values))]
        params = {f"v{i}": values[i] for i in range(len(values))}
        params["key_val"] = key_val

        engine = self._get_engine()
        with engine.connect() as conn:
            stmt = sa.text(f"UPDATE {tbl} SET {', '.join(set_clauses)} WHERE \"{key_col}\" = :key_val;")
            conn.execute(stmt, params)
            conn.commit()
        self._last_sync = datetime.now(timezone.utc).isoformat()

    def delete_row_by_key(self, table_name: str, key_col: str, key_val: Any) -> None:
        self.initialize_schema_if_needed()
        tbl = self._table_db_name(table_name)
        engine = self._get_engine()
        with engine.connect() as conn:
            stmt = sa.text(f"DELETE FROM {tbl} WHERE \"{key_col}\" = :key_val;")
            conn.execute(stmt, {"key_val": key_val})
            conn.commit()
        self._last_sync = datetime.now(timezone.utc).isoformat()


postgres_client = PostgresClient()

