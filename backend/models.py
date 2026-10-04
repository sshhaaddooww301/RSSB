"""
Pydantic models for RSSB LANGAR JSR.
Covers items, stock transactions, departments, users, audit logs, settings.
"""

from __future__ import annotations
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, field_validator


# ── Enums ──────────────────────────────────────────────────────────────

class UnitType(str, Enum):
    KG = "KG"
    QTL = "QTL"
    LITRE = "LITRE"
    PKT = "PKT"
    PACKET = "PACKET"
    TIN = "TIN"
    PIECE = "PIECE"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_upper = value.strip().upper()
            if val_upper in ("PKTS", "PACKETS", "PKT", "PACKET"):
                return cls.PKT
            if val_upper in ("TINS", "TIN"):
                return cls.TIN
            if val_upper in ("LTR", "LITRES", "LITER", "LITERS", "LITRE"):
                return cls.LITRE
            if val_upper in ("QUINTAL", "QUINTALS", "QTL"):
                return cls.QTL
            if val_upper in ("KGS", "KILOGRAM", "KG"):
                return cls.KG
            for member in cls:
                if member.value.upper() == val_upper:
                    return member
        return None


class StockStatus(str, Enum):

    IN_STOCK = "IN STOCK"
    LOW_STOCK = "LOW STOCK"
    CRITICAL = "CRITICAL"



class UserRole(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    STAFF = "STAFF"
    VIEWER = "VIEWER"


class DepartmentName(str, Enum):
    CANTEEN = "Canteen"
    LANGAR = "Langar"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_str = value.strip()
            if "DepartmentName." in val_str:
                val_str = val_str.split("DepartmentName.")[-1].strip()
            for member in cls:
                if member.value.lower() == val_str.lower() or member.name.lower() == val_str.lower():
                    return member
        return None


class ItemStatusType(str, Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"


# ── Items ──────────────────────────────────────────────────────────────

class ItemBase(BaseModel):
    Item_No: str
    Item_Name: str
    SKU: Optional[str] = ""
    Langar_Requirement: Optional[str] = ""
    Unit: UnitType
    Opening_Qty: float = 0
    Langar_Qty: float = 0
    Minimum_Stock: float = 0
    Critical_Stock: float = 0
    Status: ItemStatusType = ItemStatusType.ACTIVE


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    Item_Name: Optional[str] = None
    SKU: Optional[str] = None
    Langar_Requirement: Optional[str] = None
    Unit: Optional[UnitType] = None
    Opening_Qty: Optional[float] = None
    Langar_Qty: Optional[float] = None
    Minimum_Stock: Optional[float] = None
    Critical_Stock: Optional[float] = None
    Status: Optional[ItemStatusType] = None


class Item(ItemBase):
    Item_ID: str = ""
    Current_Stock: float = 0
    Stock_Status: StockStatus = StockStatus.IN_STOCK
    Total_Inward: float = 0
    Total_Outward: float = 0
    Created_Date: str = ""
    Updated_Date: str = ""


# ── Stock Inward ───────────────────────────────────────────────────────

class StockInwardCreate(BaseModel):
    Item_No: str
    Item_Name: Optional[str] = ""
    SKU: Optional[str] = ""
    Unit: Optional[str] = "KG"
    Inward_Date: str  # DD-MMM-YYYY or YYYY-MM-DD
    Quantity: float
    Supplier: str = ""
    Invoice_No: str = ""
    Storage_Location: str = ""
    Remarks: str = ""

    @field_validator("Quantity")
    @classmethod
    def qty_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class StockInward(BaseModel):
    Transaction_ID: str = ""
    Inward_Date: str = ""
    Item_No: str = ""
    Item_Name: str = ""
    SKU: str = ""
    Unit: str = ""
    Quantity: float = 0
    Supplier: str = ""
    Invoice_No: str = ""
    Storage_Location: str = ""
    Remarks: str = ""
    Created_By: str = ""
    Created_At: str = ""


# ── Bartan Inward ──────────────────────────────────────────────────────

class BartanInwardCreate(BaseModel):
    Inward_Date: str                  # DD-MMM-YYYY or YYYY-MM-DD
    Coming_Center: str
    Item_Name: str
    Item_Qty: float
    Missing_Items_Qty: float = 0
    Item_Requirement: str = ""
    Remarks: str = ""

    @field_validator("Item_Qty")
    @classmethod
    def qty_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Item Qty must be greater than 0")
        return v


class BartanInward(BaseModel):
    Record_ID: str = ""
    Inward_Date: str = ""
    Coming_Center: str = ""
    Item_Name: str = ""
    Item_Qty: float = 0
    Missing_Items_Qty: float = 0
    Item_Requirement: str = ""
    Remarks: str = ""
    Created_By: str = ""
    Created_At: str = ""




# ── Stock Outward ──────────────────────────────────────────────────────

class StockOutwardCreate(BaseModel):
    Item_No: str
    Item_Name: Optional[str] = ""
    SKU: Optional[str] = ""
    Unit: Optional[str] = "KG"
    Outward_Date: str
    Quantity: float
    Department: DepartmentName
    Issued_To: str = ""
    Receiver_Name: str = ""
    Purpose: str = ""
    Remarks: str = ""

    @field_validator("Department", mode="before")
    @classmethod
    def validate_department(cls, v: object) -> DepartmentName:
        if isinstance(v, DepartmentName):
            return v
        if hasattr(v, "value"):
            v = getattr(v, "value")
        s = str(v).strip()
        if "DepartmentName." in s:
            s = s.split("DepartmentName.")[-1].strip()
        if s.lower() in ("canteen", "can"):
            return DepartmentName.CANTEEN
        elif s.lower() in ("langar", "lng"):
            return DepartmentName.LANGAR
        try:
            return DepartmentName(s)
        except Exception:
            pass
        try:
            return DepartmentName[s.upper()]
        except Exception:
            pass
        raise ValueError("Department must ONLY be Canteen or Langar")

    @field_validator("Quantity")
    @classmethod
    def qty_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v



class StockOutward(BaseModel):
    Transaction_ID: str = ""
    Outward_Date: str = ""
    Item_No: str = ""
    Item_Name: str = ""
    SKU: str = ""
    Unit: str = ""
    Quantity: float = 0
    Department: str = ""
    Issued_To: str = ""
    Receiver_Name: str = ""
    Purpose: str = ""
    Remarks: str = ""
    Created_By: str = ""
    Created_At: str = ""


# ── Departments ────────────────────────────────────────────────────────

class Department(BaseModel):
    Department_ID: str = ""
    Department_Name: str = ""
    Short_Code: str = ""
    Description: str = ""
    Status: str = "Active"
    Created_Date: str = ""
    Updated_Date: str = ""


class DepartmentUpdate(BaseModel):
    Department_Name: Optional[str] = None
    Short_Code: Optional[str] = None
    Description: Optional[str] = None
    Status: Optional[str] = None


# ── Users ──────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    Username: str
    Full_Name: str
    Email: str = ""
    Role: UserRole = UserRole.STAFF
    Status: str = "Active"


class UserCreate(UserBase):
    Password: str


class UserUpdate(BaseModel):
    Full_Name: Optional[str] = None
    Email: Optional[str] = None
    Role: Optional[UserRole] = None
    Status: Optional[str] = None
    Password: Optional[str] = None


class User(UserBase):
    User_ID: str = ""
    Created_Date: str = ""
    Updated_Date: str = ""
    Last_Login: str = ""


class UserLogin(BaseModel):
    Username: str
    Password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict = {}


# ── Audit Logs ─────────────────────────────────────────────────────────

class AuditLog(BaseModel):
    Log_ID: str = ""
    Date_Time: str = ""
    User: str = ""
    Action: str = ""
    Module: str = ""
    Transaction_ID: str = ""
    Item_No: str = ""
    Details: str = ""
    IP_Address: str = ""
    Status: str = ""


class AuditLogCreate(BaseModel):
    User: str
    Action: str
    Module: str
    Transaction_ID: str = ""
    Item_No: str = ""
    Details: str = ""
    IP_Address: str = ""
    Status: str = "Success"


# ── Settings ───────────────────────────────────────────────────────────

class SettingItem(BaseModel):
    Setting_Key: str
    Setting_Value: str
    Category: str = "General"
    Description: str = ""
    Updated_By: str = ""
    Updated_At: str = ""


class SettingUpdate(BaseModel):
    Setting_Value: str


# ── Dashboard ──────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_items: int = 0
    todays_inward: float = 0
    todays_outward: float = 0
    total_current_stock: float = 0
    low_stock_items: int = 0
    critical_stock_items: int = 0
    low_stock_list: list[dict] = []
    critical_stock_list: list[dict] = []
    recent_transactions: list[dict] = []
    daily_outward: list[dict] = []
    department_usage: list[dict] = []
    excel_connected: bool = False
    last_synced: str = ""


# ── Reports ────────────────────────────────────────────────────────────

class MonthlyReportRequest(BaseModel):
    from_date: str
    to_date: str
    item_no: Optional[str] = None
    department: Optional[str] = None


class RecordFilter(BaseModel):
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    transaction_type: Optional[str] = None
    item_no: Optional[str] = None
    department: Optional[str] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    user: Optional[str] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 10


# ── Generic response ──────────────────────────────────────────────────

class ApiResponse(BaseModel):
    success: bool = True
    message: str = ""
    data: Optional[dict | list] = None


class PaginatedResponse(BaseModel):
    success: bool = True
    data: list = []
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 0
