# 🍳 RSSB LANGAR JSR

A production-ready web-based RSSB Langar JSR Stock & Inventory Management System designed to replace manual paper/Excel stock registers.

---

## 🏛 Architecture

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: FastAPI (Python 3.10+), Pydantic v2, Jose JWT, openpyxl, MSAL.
- **Database**: **Microsoft Excel Online** (`Kitchen_Stock_Database.xlsx`) on OneDrive / SharePoint accessed via **Microsoft Graph API**.
  > *Note: For local testing without Microsoft Azure tenant setup, a seamless local Excel engine operates directly on `Kitchen_Stock_Database.xlsx` with the exact same table schemas.*

---

## 📋 Excel Database Tables

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| **`ITEMS`** | Inventory Master catalog | `Item_ID`, `Item_No`, `Item_Name`, `SKU`, `Unit`, `Opening_Qty`, `Langar_Qty`, `Minimum_Stock`, `Critical_Stock`, `Current_Stock`, `Status` |
| **`STOCK_INWARD`** | Inward Goods Received | `Transaction_ID`, `Inward_Date`, `Item_No`, `Item_Name`, `SKU`, `Unit`, `Quantity`, `Supplier`, `Invoice_No`, `Storage_Location`, `Remarks`, `Created_By` |
| **`STOCK_OUTWARD`** | Outward Department Issues | `Transaction_ID`, `Outward_Date`, `Item_No`, `Item_Name`, `SKU`, `Unit`, `Quantity`, `Department`, `Issued_To`, `Receiver_Name`, `Purpose`, `Remarks`, `Created_By` |
| **`DEPARTMENTS`** | Operational Departments | `Department_ID`, `Department_Name` (*Canteen*, *Langar*), `Short_Code`, `Status` |
| **`USERS`** | User Accounts & Roles | `User_ID`, `Username`, `Password_Hash`, `Full_Name`, `Email`, `Role` (*ADMIN*, *MANAGER*, *STAFF*, *VIEWER*), `Status` |
| **`AUDIT_LOGS`** | Audit trail of all actions | `Log_ID`, `Date_Time`, `User`, `Action`, `Module`, `Transaction_ID`, `Item_No`, `Details`, `IP_Address`, `Status` |
| **`SETTINGS`** | Application configuration | `Setting_Key`, `Setting_Value`, `Category`, `Description`, `Updated_By` |

---

## ⚖️ Supported Units & Validation
- **Units**: `KG`, `QTL`, `LITRE`, `PACKET`, `PIECE`
- Each item has **one base unit** configured in `ITEMS`.
- When an item is selected in Inward or Outward forms, its unit is automatically locked and displayed.
- Units are never mixed or altered during transactions.

---

## 🏢 Department Rules
- Strictly **two departments**: `Canteen` and `Langar`.
- Outward quantity is validated against real-time available stock before saving:
  $$\text{Available Stock} = \text{Opening Qty} + \sum \text{Inward} - \sum \text{Outward}$$

---

## 🚀 Running the Project Locally

### 1. Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
> Backend runs at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
> Frontend runs at `http://localhost:3000`.

---

## 🔑 Default Login Credentials
| Username | Password | Role |
| :--- | :--- | :--- |
| `admin` | `admin123` | **ADMIN** (Full access) |
| `rahul` | `admin123` | **MANAGER** (Inventory, Reports, Records) |
| `amit` | `admin123` | **STAFF** (Inward & Outward) |
| `suresh` | `admin123` | **STAFF** (Inward & Outward) |

---

## ☁️ Microsoft Graph API Configuration (Production)
In `backend/.env`, set:
```env
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-client-secret
MICROSOFT_TENANT_ID=your-azure-tenant-id
EXCEL_FILE_ID=your-onedrive-file-id
EXCEL_DRIVE_ID=your-onedrive-drive-id
```
When configured, all reads and writes will automatically synchronize with your cloud Excel workbook via Microsoft Graph API.
