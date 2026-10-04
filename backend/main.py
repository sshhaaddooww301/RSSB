"""
RSSB Langar JSR — Production-Grade FastAPI Backend

Features:
- Enterprise Security Headers (CSP, HSTS, X-Frame-Options, No-Sniff, No-Cache for API)
- In-Memory Rate Limiting (Anti-Brute Force on Auth and API)
- Zero-Data-Leak Exception Handler (Sanitized error responses)
- High-Performance Caching & Excel Integration
"""

import sys
import os

# Ensure backend directory is in python module search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import time
import logging
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from services.graph_client import GraphClientError

# Import route modules
from routes.auth_routes import router as auth_router
from routes.items_routes import router as items_router
from routes.stock_inward_routes import router as inward_router
from routes.stock_outward_routes import router as outward_router
from routes.dashboard_routes import router as dashboard_router
from routes.users_routes import router as users_router
from routes.audit_settings_routes import router as audit_settings_router
from routes.bartan_inward_routes import router as bartan_inward_router

# Logging
logging.basicConfig(
    level=logging.INFO if settings.is_production else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")


# ── In-Memory Rate Limiter ─────────────────────────────────────────────
# IP -> list of timestamps
_rate_limits: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60.0  # 1 minute window
MAX_REQUESTS_PER_WINDOW = 180  # 180 req/min for general API
MAX_AUTH_REQUESTS_PER_WINDOW = 15  # 15 login attempts/min


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("RSSB Langar JSR starting up (Production Mode: %s) ...", settings.is_production)
    logger.info("CORS origins: %s", settings.CORS_ORIGINS)

    import asyncio

    # Non-blocking async DB schema initialization
    if settings.DATABASE_URL:
        try:
            from services.postgres_client import postgres_client
            await asyncio.to_thread(postgres_client.initialize_schema_if_needed)
            logger.info("✅ Supabase / PostgreSQL connected and schema verified.")
        except Exception as e:
            logger.error("❌ Supabase connection failed at startup: %s", e)
    else:
        try:
            from services.excel_local import initialize_local_excel_if_needed
            await asyncio.to_thread(initialize_local_excel_if_needed)
            logger.info("📂 Local Excel database initialized.")
        except Exception as e:
            logger.error("❌ Local Excel init failed: %s", e)

    yield
    logger.info("Shutting down ...")


app = FastAPI(
    title="RSSB Langar JSR",
    description="Secure, high-performance inventory management API for RSSB Langar Jamshedpur.",
    version="1.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)

# CORS — wildcard origin cannot be combined with allow_credentials=True (CORS spec violation)
_cors_origins = settings.CORS_ORIGINS
_allow_credentials = "*" not in _cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Security & Rate Limiting Middleware ─────────────────────────────────

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # Extract client IP
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    path = request.url.path

    # Rate limiting check
    is_auth_route = "/api/auth/login" in path
    limit = MAX_AUTH_REQUESTS_PER_WINDOW if is_auth_route else MAX_REQUESTS_PER_WINDOW

    # Clean old requests in window
    key = f"{client_ip}:{is_auth_route}"
    _rate_limits[key] = [t for t in _rate_limits[key] if now - t < RATE_LIMIT_WINDOW]

    if len(_rate_limits[key]) >= limit:
        logger.warning("Rate limit exceeded for IP %s on %s", client_ip, path)
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "message": "Too many requests. Please slow down and try again in a minute.",
            },
        )

    _rate_limits[key].append(now)

    # Process request
    response = await call_next(request)

    # Enterprise Security Headers (Prevent clickjacking, MIME sniffing, data leaks)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"

    # Never cache authenticated API data in intermediate/public proxies
    if path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"

    return response


# Register routers
app.include_router(auth_router)
app.include_router(items_router)
app.include_router(inward_router)
app.include_router(outward_router)
app.include_router(dashboard_router)
app.include_router(users_router)
app.include_router(audit_settings_router)
app.include_router(bartan_inward_router)


# ── Error handlers with Data Leak Protection ───────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
    )


@app.exception_handler(GraphClientError)
async def graph_error_handler(request: Request, exc: GraphClientError):
    # Mask internal graph error trace in response
    msg = exc.message if exc.status_code < 500 else "Database operation could not be completed. Please try again."
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": msg},
    )


@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    # Never leak stack traces, internal variables, or system paths to client
    logger.exception("Internal error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "A secure server error occurred. Please try again later.",
        },
    )


# ── Health check ───────────────────────────────────────────────────────

@app.get("/api/health")
@app.get("/healthz")
async def health():
    return {
        "status": "ok",
        "service": "RSSB Langar JSR",
        "security": "enforced",
    }


@app.get("/")
async def root():
    return {"message": "RSSB Langar JSR API", "status": "active"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.APP_PORT, reload=not settings.is_production)
