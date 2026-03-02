from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.stock_master import StockMaster
from app.schemas.schemas import StockMasterOut
from app.core.redis_client import get_stock_list_cache

router = APIRouter(prefix="/api/stocks", tags=["Stocks"])


@router.post("/sync", summary="手動觸發台股資料同步")
def trigger_sync():
    """強制重新從 TWSE/TPEx 公開 API 同步股票清單（不受 24h 限制）。"""
    from app.tasks.stock_sync import sync_stock_master
    count = sync_stock_master()
    return {"status": "ok", "synced": count}


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


@router.get("/quote/{symbol}", summary="取得單一股票即時報價（強制更新）")
def get_quote(symbol: str, db: Session = Depends(get_db)):
    """
    回傳指定股票的**最新**即時報價，**強制跳過 Redis cache** 直接呼叫 Fugle API。
    優先使用 FUGLE_API_KEY_QUOTE（第二組 token），避免與定時刷新的 token 產生頻率限制衝突。
    用於新增交易時選股後自動帶入當日成交價。
    """
    from app.services.quote_service import fetch_quote_fresh
    data = fetch_quote_fresh(symbol.upper())
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f"無法取得 {symbol} 即時報價，請確認 FUGLE_API_KEY / FUGLE_API_KEY_QUOTE 是否設定。"
        )
    return {
        "symbol": symbol.upper(),
        "price": data["price"],
        "change_pct": data.get("change_pct"),
        "name": data.get("name"),
    }
