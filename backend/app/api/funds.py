from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import fund_service
from app.schemas.schemas import FundInitRequest, FundDepositRequest, AccountOut, FundLedgerOut

router = APIRouter(prefix="/api/funds", tags=["Funds"])


@router.post("/init", response_model=AccountOut, summary="初始化代操資金（只能執行一次）")
def init_fund(req: FundInitRequest, db: Session = Depends(get_db)):
    return fund_service.init_fund(db, req)


@router.post("/deposit", response_model=AccountOut, summary="新增後續資金（增資）")
def deposit_fund(req: FundDepositRequest, db: Session = Depends(get_db)):
    return fund_service.deposit_fund(db, req)


@router.get("/ledger", response_model=list[FundLedgerOut], summary="取得資金異動明細")
def get_ledger(db: Session = Depends(get_db)):
    return fund_service.get_ledger(db)


@router.get("/account", response_model=AccountOut, summary="取得帳戶狀態")
def get_account(db: Session = Depends(get_db)):
    from app.models.account import Account
    acct = db.query(Account).filter(Account.id == 1).first()
    return acct
