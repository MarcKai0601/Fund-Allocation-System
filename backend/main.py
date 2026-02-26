from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, SessionLocal
from app.core.database import Base

# Import models so they get registered with Base
from app.models import account, fund_ledger, stock_master, transaction, position, fifo_lot  # noqa

from app.api import funds, trades, portfolio, stocks
from app.tasks.stock_sync import sync_stock_master, should_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist (use init.sql for production)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")

    # Run stock master sync if needed
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
    description="代操投資資金與台股績效管理系統",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(funds.router)
app.include_router(trades.router)
app.include_router(portfolio.router)
app.include_router(stocks.router)


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "service": "Fund Allocation System"}
