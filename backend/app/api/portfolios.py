from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import require_fas_access, get_valid_portfolio, RequireRole, UserSession
from app.models.portfolio import Portfolio
from app.services import fund_service, trade_service
from app.services.quote_service import get_portfolio_overview
from app.schemas.schemas import (
    PortfolioCreateRequest, PortfolioOut, PortfolioOverviewOut,
    FundInitRequest, FundDepositRequest, FundLedgerOut,
    TradeRequest, TransactionOut,
)

router = APIRouter(prefix="/api/portfolios", tags=["Portfolios"])


@router.post("", response_model=PortfolioOut, summary="Create portfolio")
def create_portfolio(
    req: PortfolioCreateRequest,
    user_id: int = Depends(require_fas_access),
    db: Session = Depends(get_db),
):
    p = Portfolio(owner_user_id=str(user_id), name=req.name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("", response_model=list[PortfolioOut], summary="List my portfolios")
def list_portfolios(
    user_id: int = Depends(require_fas_access),
    db: Session = Depends(get_db),
):
    return (
        db.query(Portfolio)
        .filter(Portfolio.owner_user_id == str(user_id))
        .order_by(Portfolio.id)
        .all()
    )


@router.get("/all", response_model=list[PortfolioOut], summary="[ADMIN] List all portfolios")
def list_all_portfolios(
    admin: UserSession = Depends(RequireRole("ADMIN")),
    db: Session = Depends(get_db),
):
    """管理員專用：取得系統所有 Portfolios（跨使用者）。需要 ADMIN 角色。"""
    return db.query(Portfolio).order_by(Portfolio.id).all()


@router.get("/{pid}/overview", response_model=PortfolioOverviewOut, summary="Portfolio overview")
def portfolio_overview(
    portfolio: Portfolio = Depends(get_valid_portfolio),
    db: Session = Depends(get_db),
):
    return get_portfolio_overview(db, portfolio.id)


@router.post("/{pid}/funds/init", response_model=PortfolioOut, summary="Init fund")
def init_fund(
    req: FundInitRequest,
    portfolio: Portfolio = Depends(get_valid_portfolio),
    db: Session = Depends(get_db),
):
    return fund_service.init_fund(db, portfolio.id, req)


@router.post("/{pid}/funds/deposit", response_model=PortfolioOut, summary="Deposit fund")
def deposit_fund(
    req: FundDepositRequest,
    portfolio: Portfolio = Depends(get_valid_portfolio),
    db: Session = Depends(get_db),
):
    return fund_service.deposit_fund(db, portfolio.id, req)


@router.get("/{pid}/funds/ledger", response_model=list[FundLedgerOut], summary="Fund ledger")
def get_ledger(
    portfolio: Portfolio = Depends(get_valid_portfolio),
    db: Session = Depends(get_db),
):
    return fund_service.get_ledger(db, portfolio.id)


@router.post("/{pid}/trades", response_model=TransactionOut, summary="Create trade")
def create_trade(
    req: TradeRequest,
    portfolio: Portfolio = Depends(get_valid_portfolio),
    db: Session = Depends(get_db),
):
    return trade_service.create_trade(db, portfolio.id, req)


@router.get("/{pid}/trades", response_model=list[TransactionOut], summary="List trades")
def get_trades(
    symbol: Optional[str] = Query(None),
    portfolio: Portfolio = Depends(get_valid_portfolio),
    db: Session = Depends(get_db),
):
    return trade_service.get_trades(db, portfolio.id, symbol=symbol)
