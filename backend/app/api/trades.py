from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.services import trade_service
from app.schemas.schemas import TradeRequest, TransactionOut

router = APIRouter(prefix="/api/trades", tags=["Trades"])


@router.post("", response_model=TransactionOut, summary="新增交易紀錄（買入/賣出）")
def create_trade(req: TradeRequest, db: Session = Depends(get_db)):
    return trade_service.create_trade(db, req)


@router.get("", response_model=list[TransactionOut], summary="取得交易歷史")
def get_trades(
    symbol: Optional[str] = Query(None, description="過濾股票代號"),
    db: Session = Depends(get_db),
):
    return trade_service.get_trades(db, symbol=symbol)
