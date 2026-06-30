import asyncio
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, SessionLocal
from app.core.database import Base
from app.core.middleware import RequestLoggingMiddleware

from app.models import portfolio, fund_ledger, stock_master, transaction, position, fifo_lot  # noqa
from app.models import fas_role, fas_user_role  # noqa — ensure RBAC tables are created

from app.api import portfolios, stocks, auth, rbac
from app.tasks.stock_sync import sync_stock_master, should_sync
from app.services.rbac_service import seed_roles, ensure_system_admin
from app.core.config import settings
from app.core.version import get_full_version, RELEASE_DATE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")

    # RBAC 初始化
    db = SessionLocal()
    try:
        seed_roles(db)
        if settings.INITIAL_ADMIN_USER_IDS:
            for uid in settings.INITIAL_ADMIN_USER_IDS.split(","):
                uid = uid.strip()
                if uid:
                    ensure_system_admin(uid, db)
                    logger.info("Ensured SYSTEM_ADMIN for user_id=%s", uid)
    finally:
        db.close()

    # 1. 快速判斷是否需要同步 (不阻擋)
    db = SessionLocal()
    need_sync = False
    try:
        need_sync = should_sync(db)
    finally:
        db.close()

    # 2. 將耗時的同步任務丟入「背景執行緒」執行，讓 FastAPI 瞬間啟動！
    if need_sync:
        logger.info("Starting stock master sync in background...")
        # 🌟 關鍵修改：使用 to_thread 防止同步函數卡死非同步的事件迴圈
        asyncio.create_task(asyncio.to_thread(sync_stock_master))

    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Fund Allocation System API",
    description="Multi-portfolio fund management",
    version=get_full_version(),
    lifespan=lifespan,
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(portfolios.router)
app.include_router(stocks.router)
app.include_router(rbac.router)

if settings.DEV_MODE_ENABLED:
    logger.warning("⚠️  DEV MODE ENABLED — /api/dev/* 路由已掛載，請勿在正式環境使用！")
    from app.api.dev import router as dev_router
    app.include_router(dev_router)


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "service": "Fund Allocation System", "version": get_full_version()}


@app.get("/api/system/version", tags=["System"])
def get_version():
    """Return backend system version."""
    return {"version": get_full_version(), "release_date": RELEASE_DATE}
