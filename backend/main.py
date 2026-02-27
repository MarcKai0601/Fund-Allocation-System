from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, SessionLocal
from app.core.database import Base
from app.core.middleware import RequestLoggingMiddleware

from app.models import portfolio, fund_ledger, stock_master, transaction, position, fifo_lot  # noqa

from app.api import portfolios, stocks, dev_auth
from app.tasks.stock_sync import sync_stock_master, should_sync
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")
    db = SessionLocal()
    try:
        if should_sync(db):
            logger.info("Starting stock master sync...")
            count = sync_stock_master()
            logger.info(f"Stock master sync complete: {count} records")
    finally:
        db.close()
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Fund Allocation System API",
    description="Multi-portfolio fund management",
    version="4.0.0",
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

app.include_router(portfolios.router)
app.include_router(stocks.router)
app.include_router(dev_auth.router)  # DEV ONLY — 生產環境移除


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "service": "Fund Allocation System", "version": "4.0.0"}
