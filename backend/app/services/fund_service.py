from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.portfolio import Portfolio
from app.models.fund_ledger import FundLedger, LedgerType
from app.schemas.schemas import FundInitRequest, FundDepositRequest


def _get_portfolio(db: Session, portfolio_id: int) -> Portfolio:
    p = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return p


def init_fund(db: Session, portfolio_id: int, req: FundInitRequest) -> Portfolio:
    p = _get_portfolio(db, portfolio_id)
    if p.is_initialized:
        raise HTTPException(
            status_code=400,
            detail="初始資金已設定，無法重複初始化。如需增資請使用增資 API"
        )

    ledger = FundLedger(
        portfolio_id=portfolio_id,
        type=LedgerType.INIT,
        amount=req.amount,
        note=req.note,
        trade_date=req.trade_date,
    )
    db.add(ledger)

    p.total_deposited = req.amount
    p.available_funds = req.amount
    p.is_initialized = 1
    db.commit()
    db.refresh(p)
    return p


def deposit_fund(db: Session, portfolio_id: int, req: FundDepositRequest) -> Portfolio:
    p = _get_portfolio(db, portfolio_id)
    if not p.is_initialized:
        raise HTTPException(status_code=400, detail="請先初始化資金")

    ledger = FundLedger(
        portfolio_id=portfolio_id,
        type=LedgerType.DEPOSIT,
        amount=req.amount,
        note=req.note,
        trade_date=req.trade_date,
    )
    db.add(ledger)

    p.total_deposited = Decimal(str(p.total_deposited)) + req.amount
    p.available_funds = Decimal(str(p.available_funds)) + req.amount
    db.commit()
    db.refresh(p)
    return p


def get_ledger(db: Session, portfolio_id: int) -> list[FundLedger]:
    return (
        db.query(FundLedger)
        .filter(FundLedger.portfolio_id == portfolio_id)
        .order_by(FundLedger.id.desc())
        .all()
    )
