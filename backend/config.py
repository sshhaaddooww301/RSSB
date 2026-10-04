"""
Configuration module — loads environment variables for the application.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    """Application settings loaded from environment variables."""

    # Microsoft Graph API
    MICROSOFT_CLIENT_ID: str = os.getenv("MICROSOFT_CLIENT_ID", "")
    MICROSOFT_CLIENT_SECRET: str = os.getenv("MICROSOFT_CLIENT_SECRET", "")
    MICROSOFT_TENANT_ID: str = os.getenv("MICROSOFT_TENANT_ID", "")

    # Excel file on OneDrive / SharePoint
    EXCEL_FILE_ID: str = os.getenv("EXCEL_FILE_ID", "")
    EXCEL_DRIVE_ID: str = os.getenv("EXCEL_DRIVE_ID", "")
    SHAREPOINT_SITE_ID: str = os.getenv("SHAREPOINT_SITE_ID", "")

    # Database (Supabase / PostgreSQL / SQLite)
    DATABASE_URL: str = os.getenv("DATABASE_URL", os.getenv("SUPABASE_DB_URL", ""))

    # App
    APP_SECRET_KEY: str = os.getenv("APP_SECRET_KEY", "dev-secret-change-in-production")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_PORT: int = int(os.getenv("PORT", os.getenv("APP_PORT", "8008")))
    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")
        if o.strip()
    ]

    # Token
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    ALGORITHM: str = "HS256"

    # Backup & Notification Email
    BACKUP_EMAIL: str = os.getenv("BACKUP_EMAIL", "vyash2110@gmail.com")
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", os.getenv("EMAIL_USER", ""))
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", os.getenv("EMAIL_PASSWORD", ""))
    SMTP_FROM: str = os.getenv("SMTP_FROM", "RSSB Langar Backup <noreply@rssb-langar.org>")

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    def validate(self):
        """Warn if critical settings are insecure in production (does not raise)."""
        import logging as _logging
        _log = _logging.getLogger("config")
        if self.is_production and self.APP_SECRET_KEY == "dev-secret-change-in-production":
            _log.warning(
                "SECURITY WARNING: APP_SECRET_KEY is using the default dev value in production! "
                "Please set a strong random secret via environment variables."
            )

    # Graph API base
    GRAPH_BASE_URL: str = "https://graph.microsoft.com/v1.0"
    GRAPH_SCOPE: str = "https://graph.microsoft.com/.default"

    # Excel table names
    TABLE_ITEMS: str = "ITEMS"
    TABLE_STOCK_INWARD: str = "STOCK_INWARD"
    TABLE_STOCK_OUTWARD: str = "STOCK_OUTWARD"
    TABLE_DEPARTMENTS: str = "DEPARTMENTS"
    TABLE_USERS: str = "USERS"
    TABLE_AUDIT_LOGS: str = "AUDIT_LOGS"
    TABLE_SETTINGS: str = "SETTINGS"
    TABLE_BARTAN_INWARD: str = "BARTAN_INWARD"

    # Valid units
    VALID_UNITS: list[str] = ["KG", "QTL", "LITRE", "PKT", "PACKET", "TIN", "PIECE", "LTR", "LITRES", "TINS", "PKTS"]


    # Valid departments
    VALID_DEPARTMENTS: list[str] = ["Canteen", "Langar"]

    # User roles
    VALID_ROLES: list[str] = ["ADMIN", "MANAGER", "STAFF", "VIEWER"]


settings = Settings()
settings.validate()
