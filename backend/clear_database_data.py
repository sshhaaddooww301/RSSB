"""
Script to clear all transactional and item data from the database
(Supabase / PostgreSQL and Local Excel), leaving schema, users, departments, and settings intact.
"""

import sys
from pathlib import Path
import sqlalchemy as sa
import openpyxl

sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from services.postgres_client import postgres_client
from services.excel_local import DB_PATH, initialize_local_excel_if_needed, TABLE_SCHEMAS

def clear_all_data():
    print("[*] Clearing items and transaction data from database...")

    # 1. Supabase / PostgreSQL
    if postgres_client.is_configured():
        print("[*] Connecting to Supabase / PostgreSQL...")
        try:
            postgres_client.initialize_schema_if_needed()
            engine = postgres_client._get_engine()
            with engine.connect() as conn:
                conn.execute(sa.text("DELETE FROM stock_outward;"))
                conn.execute(sa.text("DELETE FROM stock_inward;"))
                conn.execute(sa.text("DELETE FROM bartan_inward;"))
                conn.execute(sa.text("DELETE FROM items;"))
                conn.execute(sa.text("DELETE FROM audit_logs;"))
                conn.commit()
            print("[+] Successfully cleared items, stock_inward, stock_outward, bartan_inward from Supabase / PostgreSQL!")
        except Exception as e:
            print(f"[-] Error clearing Supabase: {e}")

    # 2. Local Excel
    initialize_local_excel_if_needed()
    wb = openpyxl.load_workbook(DB_PATH)
    tables_to_clear = ["ITEMS", "STOCK_INWARD", "STOCK_OUTWARD", "BARTAN_INWARD", "AUDIT_LOGS"]
    for tbl in tables_to_clear:
        if tbl in wb.sheetnames:
            ws = wb[tbl]
            while ws.max_row > 1:
                ws.delete_rows(2, 1)
    wb.save(DB_PATH)
    print("[+] Successfully cleared local Excel database sheets!")


if __name__ == "__main__":
    clear_all_data()
