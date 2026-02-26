from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.account import Account
from app.models.fund_ledger import FundLedger, LedgerType
from app.schemas.schemas import FundInitRequest, FundDepositRequest


def _get_account(db: Session) -> Account:
    acct = db.query(Account).filter(Account.id == 1).first()
    if not acct:
        raise HTTPException(status_code=500, detail="Account row missing, re-run init.sql")
    return acct


def init_fund(db: Session, req: FundInitRequest) -> Account:
    acct = _get_account(db)
    if acct.is_initialized:
        raise HTTPException(
            status_code=400,
            detail="初始資金已設定，無法重複初始化。如需增資請使用 /api/funds/deposit"
        )

    ledger = FundLedger(
        type=LedgerType.INIT,
        amount=req.amount,
        note=req.note,
        trade_date=req.trade_date,
    )
    db.add(ledger)

    acct.total_deposited = req.amount
    acct.available_funds = req.amount
    acct.is_initialized = 1
    db.commit()
    db.refresh(acct)
    return acct


def deposit_fund(db: Session, req: FundDepositRequest) -> Account:
    acct = _get_account(db)
    if not acct.is_initialized:
        raise HTTPException(status_code=400, detail="請先初始化資金 /api/funds/init")

    ledger = FundLedger(
        type=LedgerType.DEPOSIT,
        amount=req.amount,
        note=req.note,
        trade_date=req.trade_date,
    )
    db.add(ledger)

    acct.total_deposited = Decimal(str(acct.total_deposited)) + req.amount
    acct.available_funds = Decimal(str(acct.available_funds)) + req.amount
    db.commit()
    db.refresh(acct)
    return acct


def get_ledger(db: Session) -> list[FundLedger]:
    return db.query(FundLedger).order_by(FundLedger.id.desc()).all()
