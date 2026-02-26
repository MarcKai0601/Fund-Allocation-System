from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.stock_master import StockMaster
from app.schemas.schemas import StockMasterOut
from app.core.redis_client import get_stock_list_cache

router = APIRouter(prefix="/api/stocks", tags=["Stocks"])


@router.get("/search", response_model=list[StockMasterOut], summary="搜尋台股（autocomplete）")
def search_stocks(
    q: Optional[str] = Query(None, min_length=1, description="股票代號或名稱關鍵字"),
    db: Session = Depends(get_db),
):
    if not q:
        # Return top 50 from cache or DB
        cached = get_stock_list_cache()
        if cached:
            return [StockMasterOut(**s) for s in cached[:50]]
        stocks = db.query(StockMaster).filter(StockMaster.is_active == 1).limit(50).all()
        return stocks

    q_like = f"%{q}%"
    stocks = (
        db.query(StockMaster)
        .filter(
            StockMaster.is_active == 1,
            (StockMaster.symbol.like(q_like)) | (StockMaster.name.like(q_like)),
        )
        .limit(20)
        .all()
    )
    return stocks
